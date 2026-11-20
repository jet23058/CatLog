import Foundation

// core 函式回傳結果對應的 Swift 型別。欄位名稱與 packages/core 相同；
// 只宣告 iOS 畫面用到的欄位，其他欄位解碼時會被忽略（資料本身仍以 JSON 原樣保存）。

/// `getYearStats(data, year)`
public struct YearStats: Decodable, Equatable, Sendable {
    public let totalIncome: Double
    public let lastYearIncome: Double
    public let avgIncome: Double
    public let assetGrowthRate: Double
    public let incomeGrowthRate: Double
    public let thisYearAssets: Double
    public let lastYearAssets: Double
    public let assetGrowthStartDate: String?
    public let assetGrowthEndDate: String?
    public let thisYearDebt: Double
    public let realAssetGrowthAmount: Double
    public let realAssetGrowthPercentage: Double
    public let assetGrowthRatio: Double
}

/// `getFireStats(data)`
public struct FireStats: Decodable, Equatable, Sendable {
    public let avgExpense: Double
    public let fireTarget: Double
    public let currentAssets: Double
    public let progress: Double
    public let rate: Double
}

/// `getMonthlyStats(data, year)` 的每一個月。
public struct MonthlyStat: Decodable, Equatable, Sendable, Identifiable {
    public let month: Int
    public let assets: Double
    public let grossAssets: Double
    public let debts: Double
    public let income: Double
    public let cost: Double
    public let balance: Double
    public let hasRecord: Bool
    public let latestDate: String?

    public var id: Int { month }
}

/// `checkCompatibility({ appVersion, data, meta })`
public struct Compatibility: Decodable, Equatable, Sendable {
    public let canWrite: Bool
    public let reason: String?
    public let requiredVersion: String?
    public let schemaVersion: Int?

    public static let writable = Compatibility(canWrite: true, reason: nil, requiredVersion: nil, schemaVersion: nil)
}
