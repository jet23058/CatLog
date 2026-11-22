import Foundation

/// `getRecentMonthTrend(data, monthKey, count)`：到這個月為止最近幾個月的淨資產、收入、支出。
/// 沒有資產紀錄的月份 `assets` 為 nil。
public struct MonthTrendPoint: Decodable, Equatable, Sendable, Identifiable {
    public let monthKey: String
    public let year: Int
    public let month: Int
    public let assets: Double?
    @LenientNumber public var income: Double
    @LenientNumber public var cost: Double
    public var id: String { monthKey }
}

/// `getAssetAllocation(assets, topN)`：依名稱加總，前 topN 筆＋「其他」。
public struct AssetAllocation: Decodable, Equatable, Sendable {
    public let total: Double
    public let slices: [AllocationSlice]
}

public struct AllocationSlice: Decodable, Equatable, Sendable, Identifiable {
    public let name: String
    public let amount: Double
    public let share: Double
    public let isOther: Bool
    public var id: String { name }
}

extension CatLogCore {
    /// 月份明細的走勢圖與收支圖資料（與 web 相同）。
    public func recentMonthTrend(_ monthKey: String, count: Int = 6) throws -> [MonthTrendPoint] {
        try bridge.call("getRecentMonthTrend", [.data, .string(monthKey), .int(count)])
    }

    /// 月份明細的資產配置（與 web 相同）。
    public func assetAllocation(_ assets: [AssetItem], topN: Int = 4) throws -> AssetAllocation {
        let items: [CoreBridge.Argument] = assets.map { asset in
            .object(["name": asset.name.map { .string($0) } ?? .null, "amount": .number(asset.amount)])
        }
        return try bridge.call("getAssetAllocation", [.array(items), .int(topN)])
    }
}
