import Foundation

/// iOS 畫面用的 core 函式包裝。所有計算都在 JavaScriptCore 裡執行 packages/core，與 web 相同。
public final class CatLogCore: @unchecked Sendable {
    public let bridge: CoreBridge

    public init(bridge: CoreBridge) {
        self.bridge = bridge
    }

    public static func bundled() throws -> CatLogCore {
        CatLogCore(bridge: try .bundled())
    }

    public var currentSchemaVersion: Int {
        (try? bridge.constant("CURRENT_SCHEMA_VERSION", as: Int.self)) ?? 0
    }

    /// 載入雲端讀到的資料：先經過 `normalizeAppData`（補預設欄位、遷移 schema、保留未知欄位）。
    /// 回傳正規化後的 JSON 文字。
    @discardableResult
    public func load(dataJSON: String) throws -> String {
        let normalized = try bridge.callJSON("normalizeAppData", [.json(dataJSON)])
        try bridge.loadData(json: normalized)
        return normalized
    }

    public func availableYears(thisYear: Int) throws -> [Int] {
        try bridge.call("getAvailableYears", [.data, .int(thisYear)])
    }

    public func yearStats(year: Int) throws -> YearStats {
        try bridge.call("getYearStats", [.data, .int(year)])
    }

    public func monthlyStats(year: Int) throws -> [MonthlyStat] {
        try bridge.call("getMonthlyStats", [.data, .int(year)])
    }

    public func fireStats() throws -> FireStats {
        try bridge.call("getFireStats", [.data])
    }

    /// 某個月（YYYY-MM）的明細。
    public func monthDetail(_ monthKey: String) throws -> MonthDetail {
        try bridge.call("getMonthDetail", [.data, .string(monthKey)])
    }

    /// 有資料的月份（舊到新）。
    public func dataMonths() throws -> [String] {
        try bridge.call("getDataMonths", [.data])
    }

    public func debtCategoryLabel(_ value: String?) -> String {
        (try? bridge.callString("getDebtCategoryLabel", [value.map { .string($0) } ?? .null])) ?? (value ?? "未分類")
    }

    public func debtEventLabel(_ type: String?) -> String {
        (try? bridge.callString("getDebtEventLabel", [.string(type ?? "")])) ?? "異動"
    }

    // MARK: - 格式化（與 web 相同的 Intl 規則）

    public func formatMoney(_ value: Double) -> String {
        (try? bridge.callString("formatMoney", [.number(value)])) ?? String(Int(value))
    }

    /// 一萬以上顯示「123.5 萬」。
    public func formatWan(_ value: Double) -> String {
        (try? bridge.callString("formatWan", [.number(value)])) ?? String(Int(value))
    }

    /// 判斷這個 App 版本能不能寫入。`metaJSON` 為 meta/storage 文件的 JSON（沒有時傳 nil）。
    public func compatibility(appVersion: String, metaJSON: String?) throws -> Compatibility {
        let data: CoreBridge.Argument = bridge.hasLoadedData ? .data : .null
        return try bridge.call("checkCompatibility", [.object([
            "appVersion": .string(appVersion),
            "data": data,
            "meta": metaJSON.map { .json($0) } ?? .null,
        ])])
    }

    /// 給使用者看的「需要更新」說明（與 web 相同文字）。
    public func describe(_ compatibility: Compatibility) throws -> String {
        try bridge.callString("describeIncompatibility", [.object([
            "canWrite": .bool(compatibility.canWrite),
            "reason": compatibility.reason.map { .string($0) } ?? .null,
            "requiredVersion": compatibility.requiredVersion.map { .string($0) } ?? .null,
            "schemaVersion": compatibility.schemaVersion.map { .int($0) } ?? .null,
        ])])
    }
}
