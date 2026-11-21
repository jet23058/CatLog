import Foundation

// 對帳單、FIRE 提領率、雲端診斷與用備份修復。規則在 core（rangeStats.js、dashboard.js、storageFormat.js），與 web 相同。

// MARK: - 對帳單

public struct StatementItem: Decodable, Equatable, Sendable, Identifiable {
    public let key: String
    public let title: String
    public let date: String
    public let category: String
    @LenientNumber public var amount: Double
    public var id: String { key }
}

/// core: getStatementView
public struct StatementView: Decodable, Equatable, Sendable {
    public let accounts: [String]
    public let account: String
    public let items: [StatementItem]
    @LenientNumber public var total: Double
}

// MARK: - 雲端診斷

/// core: summarizeDataCounts
public struct DataCounts: Decodable, Equatable, Sendable {
    public let recordsDates: Int
    public let recordsItems: Int
    public let debtDates: Int
    public let debtItems: Int
    public let incomeMonths: Int
    public let incomeSources: Int
    public let expenseMonths: Int
    public let expenseItems: Int
    public let memoDates: Int
    public let debtEventMonths: Int
    public let debtEventItems: Int
    public let stockTransactions: Int
    public let stockSnapshotMonths: Int
    public let stockSnapshotVersions: Int
}

/// 只讀不寫的雲端狀態檢查：指標、資料塊數量、長度與 checksum、能不能解析。
public struct CloudDiagnostics: Sendable {
    public let meta: CloudMeta?
    /// 依指標讀到的資料塊數（舊格式時為舊資料塊數）。
    public let chunkCount: Int
    public let characterCount: Int
    /// nil 表示沒有指標可比對（舊格式或沒有資料）。
    public let checksumMatches: Bool?
    public let parseError: String?
    public let counts: DataCounts?
}

extension CatLogCore {
    public func statementDefaultRange(today: String) throws -> DateRange {
        try bridge.call("getStatementDefaultRange", [.string(today)])
    }

    /// 指定帳戶與區間的花費；account 空白或不存在時用第一個帳戶。
    public func statementView(account: String, startDate: String, endDate: String) throws -> StatementView {
        try bridge.call("getStatementView", [.dataField("expenses"), .string(account), .string(startDate), .string(endDate)])
    }

    /// 回傳設定 FIRE 提領率後的完整資料 JSON；不合法時丟出 core 的錯誤訊息。
    public func settingFireWithdrawalRate(_ rate: String) throws -> String {
        try bridge.callJSON("setFireWithdrawalRate", [.data, .string(rate)])
    }

    /// 解析備份檔並整理成可寫入的完整資料（修復用；不需要先載入雲端資料）。
    public func repairDataJSON(fromBackup text: String) throws -> String {
        let backup = try bridge.callJSON("parseBackupText", [.string(text)])
        return try bridge.callJSON("normalizeAppData", [.json(backup)])
    }

    func dataCounts(json: String) throws -> DataCounts {
        try bridge.call("summarizeDataCounts", [.json(json)])
    }
}

extension CloudRepository {
    /// 讀取雲端資料但不驗證、不寫入，回報哪裡出問題（與 web 的本機診斷相同用途）。
    public func diagnose(core: CatLogCore) async throws -> CloudDiagnostics {
        let meta = try await store.readMeta()
        let chunks: [StoredChunk]
        if let generation = meta?.generation {
            chunks = try await store.readChunks(generation: generation).sorted { $0.index < $1.index }
        } else {
            chunks = try await store.readAllChunksOrderedByIndex().filter { $0.generation == nil }
        }
        let json = chunks.map(\.content).joined()
        var checksumMatches: Bool?
        if meta?.generation != nil {
            let checksum = try? core.bridge.callString("hashString", [.string(json)])
            checksumMatches = chunks.count == meta?.chunkCount && json.utf16.count == meta?.length && checksum == meta?.checksum
        }
        var parseError: String?
        var counts: DataCounts?
        if !json.isEmpty {
            do {
                _ = try JSONSerialization.jsonObject(with: Data(json.utf8))
                counts = try core.dataCounts(json: json)
            } catch {
                parseError = "資料塊串接後不是合法 JSON：\(error.localizedDescription)"
            }
        }
        return CloudDiagnostics(meta: meta, chunkCount: chunks.count, characterCount: json.utf16.count,
                                checksumMatches: checksumMatches, parseError: parseError, counts: counts)
    }
}
