import Foundation

// 月份明細的編輯與刪除。規則在 core 的 records.js（updateMonthDetails、updateIncomeSourceField、
// deleteMonthData、deleteDebtEventFromData），與 web 相同。

/// 一筆可編輯的資料（資產、收入或負債）。保留原始 JSON 物件，只改畫面上動到的欄位，
/// 所以 iOS 不認得的欄位（質押股票、幣別資訊等）寫回時都會原樣保留。
public struct EditableRecord: Identifiable {
    public let id = UUID()
    public var raw: [String: Any]

    public init(raw: [String: Any]) { self.raw = raw }

    /// 以文字讀寫欄位（數字會轉成文字顯示；寫回時由 core 轉成數字）。
    public subscript(text key: String) -> String {
        get {
            if let text = raw[key] as? String { return text }
            if let number = raw[key] as? NSNumber, !(raw[key] is Bool) { return CatLogCore.plain(number.doubleValue) }
            return ""
        }
        set { raw[key] = newValue }
    }
}

/// 編輯中的一個月份。
public struct MonthEditDraft {
    public let month: String
    public let assetDate: String
    public let debtDate: String
    public let memoDate: String
    public var assets: [EditableRecord]
    public var incomes: [EditableRecord]
    public var debts: [EditableRecord]
    public var memo: String
}

/// 負債異動的 id 在舊資料裡可能是數字（web 用 Date.now()）或文字；刪除時原樣傳回 core 比對。
public enum RecordID: Decodable, Equatable, Hashable, Sendable {
    case number(Double)
    case text(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let number = try? container.decode(Double.self) { self = .number(number) }
        else { self = .text(try container.decode(String.self)) }
    }

    var jsonText: String {
        switch self {
        case .number(let value): return CatLogCore.plain(value)
        case .text(let value): return String(decoding: (try? JSONEncoder().encode(value)) ?? Data("\"\"".utf8), as: UTF8.self)
        }
    }
}

extension CatLogCore {
    private func records(_ value: Any?) -> [EditableRecord] {
        ((value as? [Any]) ?? []).compactMap { ($0 as? [String: Any]).map(EditableRecord.init(raw:)) }
    }

    private func jsonText(_ object: Any) throws -> String {
        String(decoding: try JSONSerialization.data(withJSONObject: object), as: UTF8.self)
    }

    /// 編輯的起始內容：當月的資產、收入、有效負債與備忘錄；沒有紀錄的日期用 writeDate（與 web 相同）。
    public func monthEditDraft(_ monthKey: String) throws -> MonthEditDraft {
        let text = try bridge.callJSON("getMonthDetail", [.data, .string(monthKey)])
        guard let detail = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any] else {
            throw CoreBridgeError.unexpectedResult(function: "getMonthDetail")
        }
        let writeDate = detail["writeDate"] as? String ?? "\(monthKey)-01"
        return MonthEditDraft(
            month: monthKey,
            assetDate: detail["assetDate"] as? String ?? writeDate,
            debtDate: detail["debtDate"] as? String ?? writeDate,
            memoDate: detail["memoDate"] as? String ?? writeDate,
            assets: records(detail["assets"]),
            incomes: records(detail["incomes"]),
            debts: records(detail["debts"]),
            memo: detail["memo"] as? String ?? ""
        )
    }

    /// 改收入的一個欄位；原幣金額、匯率、幣別會重算台幣金額。
    public func updatingIncome(_ record: EditableRecord, field: String, value: String) throws -> EditableRecord {
        let text = try bridge.callJSON("updateIncomeSourceField", [.json(try jsonText(record.raw)), .string(field), .string(value)])
        guard let raw = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any] else { return record }
        var updated = record
        updated.raw = raw
        return updated
    }

    /// 回傳寫回編輯後的完整資料 JSON（尚未寫入雲端）。
    public func updatingMonth(_ draft: MonthEditDraft) throws -> String {
        let payload: [String: Any] = [
            "month": draft.month, "assetDate": draft.assetDate, "debtDate": draft.debtDate, "memoDate": draft.memoDate,
            "assets": draft.assets.map(\.raw), "incomes": draft.incomes.map(\.raw), "debts": draft.debts.map(\.raw),
            "memo": draft.memo,
        ]
        return try bridge.callJSON("updateMonthDetails", [.data, .json(try jsonText(payload))])
    }

    /// 刪除整個月的資產、負債、備忘錄與負債異動（收入與花費保留）。
    public func deletingMonth(_ monthKey: String) throws -> String {
        try bridge.callJSON("deleteMonthData", [.data, .string(monthKey)])
    }

    public func deletingDebtEvent(month: String, id: RecordID) throws -> String {
        try bridge.callJSON("deleteDebtEventFromData", [.data, .string(month), .json(id.jsonText)])
    }
}
