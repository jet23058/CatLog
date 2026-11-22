import Foundation

// 個股績效的資料寫入：匯入交易、清空市場交易、新增 / 刪除持倉快照版本。
// 規則在 core 的 stockImport.js（與 web 相同），這裡只是型別與呼叫。

public struct StockImportSkippedRow: Decodable, Equatable, Sendable {
    public let row: Int
    public let item: String
    public let reason: String
}

/// 股票交易匯入前的預覽。`transactionsJSON` 是解析出的交易，確認後 append 寫入。
public struct StockImportPreview: Sendable {
    public let transactionsJSON: String
    public let market: String
    public let total: Int
    public let counts: [String: Int]
    public let isArchived: Bool
    public let skippedRows: [StockImportSkippedRow]
    /// 預覽列表只顯示前 30 筆（與 web 相同）。
    public let sampleTrades: [StockTrade]

    public func count(_ type: String) -> Int { counts[type] ?? 0 }
}

/// 美股日期格式：自動判斷、月/日/年、年/月/日。
public enum USDateFormat: String, CaseIterable, Sendable, Identifiable {
    case auto, mdy, ymd
    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .auto: return "自動判斷"
        case .mdy: return "月/日/年（06/03/2025）"
        case .ymd: return "年/月/日（2025/06/03）"
        }
    }
}

/// 手動輸入的一列持倉（文字，交給 core 轉換）。
public struct HoldingRowInput: Equatable, Sendable, Identifiable {
    public let id: UUID
    public var market: String
    public var name: String
    public var price: String
    public var shares: String

    public init(id: UUID = UUID(), market: String = "TW", name: String = "", price: String = "", shares: String = "") {
        self.id = id
        self.market = market
        self.name = name
        self.price = price
        self.shares = shares
    }

    var argument: CoreBridge.Argument {
        .object(["market": .string(market), "name": .string(name), "price": .string(price), "shares": .string(shares)])
    }
}

public struct HoldingPreviewItem: Decodable, Equatable, Sendable {
    public let name: String
    public let market: String
    @LenientNumber public var shares: Double
    @LenientNumber public var marketValue: Double
}

/// 持倉快照匯入前的預覽。`previewJSON` 原樣交回 core 寫入。
public struct HoldingSnapshotPreview: Sendable {
    public let previewJSON: String
    public let month: String
    public let holdings: [HoldingPreviewItem]
    public let skippedCount: Int
    public var totalMarketValue: Double { holdings.reduce(0) { $0 + $1.marketValue } }
    /// 依市場分開加總（台股 TWD、美股 USD 不能直接相加）。
    public var totalsByMarket: [(market: String, value: Double)] {
        Dictionary(grouping: holdings, by: \.market)
            .map { (market: $0.key, value: $0.value.reduce(0) { $0 + $1.marketValue }) }
            .sorted { $0.market > $1.market } // TW 在 US 前
    }
}

private struct StockImportSummary: Decodable {
    let market: String
    let total: Int
    let counts: [String: Int]
    let isArchived: Bool
    let skippedRows: [StockImportSkippedRow]
}

private struct HoldingPreviewFields: Decodable {
    struct Skipped: Decodable { let row: Int }
    let month: String
    let holdings: [HoldingPreviewItem]
    let skippedRows: [Skipped]
}

private struct HoldingRowFields: Decodable {
    let market: String
    let name: String
    let price: String
    let shares: String
}

extension CatLogCore {
    /// 解析股票交易檔案或貼上的內容；格式錯誤或沒有交易時丟出 core 的錯誤訊息。
    public func previewStockImport(text: String, usDateFormat: USDateFormat = .auto, allowArchived: Bool = false) throws -> StockImportPreview {
        let options: CoreBridge.Argument = .object(["usDateFormat": .string(usDateFormat.rawValue), "allowArchivedUSRealized": .bool(allowArchived)])
        let resultJSON = try bridge.callJSON("parseStockImport", [.string(text), options])
        let summary: StockImportSummary = try bridge.call("summarizeStockImport", [.json(resultJSON)])
        let result = try JSONSerialization.jsonObject(with: Data(resultJSON.utf8)) as? [String: Any]
        let transactions = result?["transactions"] as? [Any] ?? []
        let transactionsJSON = String(decoding: try JSONSerialization.data(withJSONObject: transactions), as: UTF8.self)
        let sampleJSON = String(decoding: try JSONSerialization.data(withJSONObject: Array(transactions.prefix(30))), as: UTF8.self)
        return StockImportPreview(
            transactionsJSON: transactionsJSON,
            market: summary.market,
            total: summary.total,
            counts: summary.counts,
            isArchived: summary.isArchived,
            skippedRows: summary.skippedRows,
            sampleTrades: try bridge.call("describeStockTrades", [.json(sampleJSON)])
        )
    }

    /// 回傳 append 交易後的完整資料 JSON（尚未寫入雲端）。
    public func addingStockTransactions(_ preview: StockImportPreview) throws -> String {
        try bridge.callJSON("addStockTransactionsToData", [.data, .json(preview.transactionsJSON)])
    }

    /// 回傳清空指定市場交易後的完整資料 JSON。
    public func clearingStockTransactions(market: String) throws -> String {
        try bridge.callJSON("clearStockTransactionsFromData", [.data, .string(market)])
    }

    /// 「帶入上次持倉」：上次同市場快照的持股；沒有快照時為空陣列。
    public func previousHoldingRows(market: String) throws -> [HoldingRowInput] {
        let rows: [HoldingRowFields] = try bridge.call("getPreviousHoldingRows", [.dataField("stockHoldingSnapshots"), .string(market)])
        return rows.map { HoldingRowInput(market: $0.market, name: $0.name, price: $0.price, shares: $0.shares) }
    }

    /// 手動輸入的持倉 → 快照預覽；資料不完整時丟出 core 的錯誤訊息。
    public func holdingSnapshotPreview(month: String, note: String, rows: [HoldingRowInput]) throws -> HoldingSnapshotPreview {
        let idPrefix = "holding-\(Int(Date().timeIntervalSince1970 * 1000))-\(UUID().uuidString.prefix(6).lowercased())"
        let previewJSON = try bridge.callJSON("buildHoldingSnapshotPreview", [.object([
            "month": .string(month), "note": .string(note), "rows": .array(rows.map(\.argument)), "idPrefix": .string(idPrefix),
        ])])
        let fields = try JSONDecoder().decode(HoldingPreviewFields.self, from: Data(previewJSON.utf8))
        return HoldingSnapshotPreview(previewJSON: previewJSON, month: fields.month, holdings: fields.holdings, skippedCount: fields.skippedRows.count)
    }

    /// 回傳新增持倉快照版本後的完整資料 JSON。
    public func addingHoldingSnapshot(_ preview: HoldingSnapshotPreview, now: Date = Date()) throws -> String {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return try bridge.callJSON("addHoldingSnapshotToData", [.data, .json(preview.previewJSON), .object([
            "nowISO": .string(iso.string(from: now)), "nowMs": .number((now.timeIntervalSince1970 * 1000).rounded()),
        ])])
    }

    /// 回傳刪除一個持倉快照版本後的完整資料 JSON。
    public func deletingHoldingSnapshot(month: String, id: String) throws -> String {
        try bridge.callJSON("deleteHoldingSnapshotFromData", [.data, .string(month), .string(id)])
    }
}
