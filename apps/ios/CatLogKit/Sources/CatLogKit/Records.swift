import Foundation

// 新增資產 / 收入。規則都在 core 的 records.js（與 web 相同），這裡只是型別與呼叫。

/// 一筆待新增的資產（core: createAssetEntry 或 getImportablePreviousAssets）。
/// `rawJSON` 保留 core 回傳的完整物件：「帶入上次資產」複製的舊資產可能有 iOS 不認得的欄位，寫入時要原樣保留。
public struct AssetEntry: Equatable, Sendable, Identifiable {
    public let id: String
    public let type: String
    public let name: String
    public let amount: Double
    public let currency: String
    public let originalAmount: Double
    public let exchangeRate: Double
    public let date: String
    public let rawJSON: String

    public var isFloating: Bool { type == "floating" }

    private struct Fields: Decodable {
        let id: String?
        let type: String?
        let name: String?
        @LenientNumber var amount: Double
        let currency: String?
        @LenientNumber var originalAmount: Double
        @LenientNumber var exchangeRate: Double
        let date: String?
    }

    /// 從 core 回傳的 JSON 物件陣列建立。
    static func list(fromJSONArray text: String) throws -> [AssetEntry] {
        guard let array = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [Any] else { return [] }
        return try array.map { element in
            let data = try JSONSerialization.data(withJSONObject: element)
            let fields = try JSONDecoder().decode(Fields.self, from: data)
            return AssetEntry(
                id: fields.id ?? UUID().uuidString,
                type: fields.type ?? "fixed",
                name: fields.name ?? "",
                amount: fields.amount,
                currency: fields.currency ?? "TWD",
                originalAmount: fields.originalAmount,
                exchangeRate: fields.exchangeRate,
                date: fields.date ?? "",
                rawJSON: String(decoding: data, as: UTF8.self)
            )
        }
    }

    static func jsonArray(_ entries: [AssetEntry]) -> String {
        "[" + entries.map(\.rawJSON).joined(separator: ",") + "]"
    }
}

/// 一筆收入來源（core: createIncomeSource）。amount 是台幣金額。
public struct IncomeEntry: Codable, Equatable, Sendable {
    public let date: String
    public let company: String
    public let bank: String
    public let currency: String
    public let originalAmount: Double
    public let exchangeRate: Double
    public let amount: Double
    public let memo: String
}

public struct AssetNameOption: Decodable, Equatable, Sendable, Hashable {
    public let name: String
    public let type: String?
}

public struct PreviousAssetSnapshot: Decodable, Equatable, Sendable {
    public let date: String?
    public let assets: [AssetItem]
}

public struct LatestAsset: Decodable, Equatable, Sendable {
    public let type: String?
    public let currency: String?
    @LenientNumber public var exchangeRate: Double
}

extension CatLogCore {
    public var supportedCurrencies: [String] {
        (try? bridge.constant("SUPPORTED_CURRENCIES", as: [String].self)) ?? ["TWD", "USD", "JPY", "EUR", "CNY", "USDT"]
    }

    /// 預設匯率（無法連線時的備用值）。
    public func defaultExchangeRate(_ currency: String) -> Double? {
        (try? bridge.constant("DEFAULT_EXCHANGE_RATES", as: [String: Double].self))?[currency]
    }

    /// 原幣換算台幣（外幣四捨五入到整數，與 web 相同）。
    public func convertToTWD(originalAmount: String, exchangeRate: String, currency: String) -> Double {
        (try? bridge.call("convertToTWD", [.string(originalAmount), .string(exchangeRate), .string(currency)], as: Double.self)) ?? 0
    }

    public func assetNameOptions() throws -> [AssetNameOption] {
        try bridge.call("getAssetNameOptions", [.dataField("records")])
    }

    public func latestAsset(named name: String) throws -> LatestAsset? {
        try bridge.call("getLatestAssetByName", [.dataField("records"), .string(name)])
    }

    public func previousAssetSnapshot(date: String) throws -> PreviousAssetSnapshot {
        try bridge.call("getPreviousAssetSnapshot", [.dataField("records"), .string(date)])
    }

    public func isDuplicateAsset(date: String, pending: [AssetEntry], name: String, currency: String) throws -> Bool {
        try bridge.call("isDuplicateAsset", [
            .dataField("records"), .string(date), .json(AssetEntry.jsonArray(pending)), .string(name), .string(currency),
        ])
    }

    public func createAssetEntry(id: String, type: String, name: String, originalAmount: String, currency: String, exchangeRate: String, date: String) throws -> AssetEntry {
        let text = try bridge.callJSON("createAssetEntry", [.object([
            "id": .string(id), "type": .string(type), "name": .string(name),
            "originalAmount": .string(originalAmount), "currency": .string(currency),
            "exchangeRate": .string(exchangeRate), "date": .string(date),
        ])])
        guard let entry = try AssetEntry.list(fromJSONArray: "[\(text)]").first else { throw CoreBridgeError.unexpectedResult(function: "createAssetEntry") }
        return entry
    }

    /// 「帶入上次資產」：略過當天或清單中已有的「名稱 + 幣別」。
    public func importablePreviousAssets(date: String, pending: [AssetEntry], idPrefix: String) throws -> [AssetEntry] {
        let text = try bridge.callJSON("getImportablePreviousAssets", [
            .dataField("records"), .string(date), .json(AssetEntry.jsonArray(pending)), .string(idPrefix),
        ])
        return try AssetEntry.list(fromJSONArray: text)
    }

    /// 這些資產全部寫到 dateKey 時，第一個重複的「名稱 (幣別)」；沒有重複時為 nil。
    /// 清單裡的日期可能已經過時（使用者改過日期），所以只看實際要存的日期。
    public func findDuplicateAsset(dateKey: String, entries: [AssetEntry]) throws -> String? {
        try bridge.call("findDuplicateAsset", [.dataField("records"), .string(dateKey), .json(AssetEntry.jsonArray(entries))])
    }

    /// 回傳加入資產後的完整資料 JSON（尚未寫入雲端）。
    public func addingAssets(_ entries: [AssetEntry], to dateKey: String) throws -> String {
        try bridge.callJSON("addAssetsToData", [.data, .string(dateKey), .json(AssetEntry.jsonArray(entries))])
    }

    public func createIncomeSource(date: String, company: String, bank: String, currency: String, originalAmount: String, exchangeRate: String, memo: String) throws -> IncomeEntry {
        try bridge.call("createIncomeSource", [.object([
            "date": .string(date), "company": .string(company), "bank": .string(bank), "currency": .string(currency),
            "originalAmount": .string(originalAmount), "exchangeRate": .string(exchangeRate), "memo": .string(memo),
        ])])
    }

    /// 回傳加入收入後的完整資料 JSON（尚未寫入雲端）。
    public func addingIncome(_ entry: IncomeEntry, to dateKey: String) throws -> String {
        let entryJSON = String(decoding: try JSONEncoder().encode(entry), as: UTF8.self)
        return try bridge.callJSON("addIncomeToData", [.data, .string(dateKey), .json(entryJSON)])
    }
}
