import Foundation

// MARK: - 個股績效（core: getStockOverview / getStockTrades）

public struct StockRow: Decodable, Equatable, Sendable, Identifiable {
    public let key: String
    public let symbol: String
    public let name: String?
    public let market: String
    public let currency: String?
    @LenientNumber public var buyAmount: Double
    @LenientNumber public var sellAmount: Double
    @LenientNumber public var dividends: Double
    @LenientNumber public var fees: Double
    @LenientNumber public var marketValue: Double
    @LenientNumber public var totalPnl: Double
    @LenientNumber public var roi: Double
    public let tradeCount: Int
    public let latestTradeDate: String?
    public let snapshotDate: String?
    public let realizedOnly: Bool
    public let hasSnapshot: Bool
    public var id: String { key }
    public var displayName: String { name ?? symbol }
}

public struct StockChartRow: Decodable, Equatable, Sendable, Identifiable {
    public let key: String
    public let symbol: String
    public let market: String
    @LenientNumber public var totalPnl: Double
    public let barWidth: Double
    public var id: String { key }
}

public struct StockStats: Decodable, Equatable, Sendable {
    @LenientNumber public var totalBuy: Double
    @LenientNumber public var totalMarketValue: Double
    @LenientNumber public var totalDividends: Double
    @LenientNumber public var totalInterest: Double
    @LenientNumber public var totalDeposits: Double
    @LenientNumber public var totalWithdrawals: Double
    @LenientNumber public var totalPnl: Double
}

public struct StockDebtStats: Decodable, Equatable, Sendable {
    public let debtSnapshotDate: String?
    @LenientNumber public var marketPledgeDebt: Double
    @LenientNumber public var totalPledgeDebt: Double
    @LenientNumber public var unallocatedPledgeDebt: Double
    @LenientNumber public var marketEstimatedMonthlyInterest: Double
    @LenientNumber public var netPnlAfterDebt: Double
}

public struct HoldingSnapshotSummary: Decodable, Equatable, Sendable, Identifiable {
    public let id: String
    public let month: String
    public let version: Int?
    public let note: String
    public let holdingCount: Int

    public var title: String { "\(month)\(version.map { " v\($0)" } ?? "")" }
}

public struct Holding: Decodable, Equatable, Sendable {
    public let symbol: String?
    public let name: String?
    @LenientNumber public var shares: Double
    @LenientNumber public var marketValue: Double
    @LenientNumber public var price: Double
    public var displayName: String { name ?? symbol ?? "—" }
}

public struct StockOverview: Decodable, Equatable, Sendable {
    public let market: String
    public let hasRange: Bool
    public let marketCounts: [String: Int]
    public let snapshots: [HoldingSnapshotSummary]
    public let selectedSnapshotId: String?
    public let holdings: [Holding]
    public let rows: [StockRow]
    public let stats: StockStats
    public let targetDate: String?
    public let debtStats: StockDebtStats
    public let winners: [StockRow]
    public let losers: [StockRow]
    /// 排行榜「查看全部」。
    public let allWinners: [StockRow]
    public let allLosers: [StockRow]
    /// 損益長條圖：影響最大的 8 檔，barWidth 為 6–100。
    public let chartRows: [StockChartRow]
    public let transactionCount: Int
}

public struct StockTrade: Decodable, Equatable, Sendable {
    public let date: String?
    public let type: String?
    public let label: String
    public let title: String
    public let description: String
    @LenientNumber public var amount: Double
    @LenientNumber public var shares: Double
    @LenientNumber public var price: Double
}

// MARK: - 區間統計（core: getRangeStats）

public struct RangeIncomeStats: Decodable, Equatable, Sendable {
    @LenientNumber public var total: Double
    public let count: Int
}

public struct RangeAssetSide: Decodable, Equatable, Sendable {
    @LenientNumber public var start: Double
    @LenientNumber public var end: Double
    @LenientNumber public var change: Double
}

public struct FloatingChange: Decodable, Equatable, Sendable {
    public let name: String?
    @LenientNumber public var startAmt: Double
    @LenientNumber public var endAmt: Double
    @LenientNumber public var change: Double
}

public struct RangeFloatingSide: Decodable, Equatable, Sendable {
    @LenientNumber public var start: Double
    @LenientNumber public var end: Double
    @LenientNumber public var change: Double
    public let changes: [FloatingChange]
}

public struct RangeAssetStats: Decodable, Equatable, Sendable {
    public let startDate: String?
    public let endDate: String?
    @LenientNumber public var startAssets: Double
    @LenientNumber public var endAssets: Double
    @LenientNumber public var change: Double
    public let fixed: RangeAssetSide
    public let floating: RangeFloatingSide
}

public struct RangeDebtStats: Decodable, Equatable, Sendable {
    public let startDate: String?
    public let endDate: String?
    @LenientNumber public var startDebts: Double
    @LenientNumber public var endDebts: Double
    @LenientNumber public var change: Double
}

/// `topCategories` 在 JS 是 [類別, 金額] 陣列。
public struct CategoryAmount: Decodable, Equatable, Sendable, Identifiable {
    public let name: String
    public let amount: Double
    public var id: String { name }

    public init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        name = try container.decode(String.self)
        amount = (try? container.decode(Double.self)) ?? 0
    }
}

public struct RangeExpenseStats: Decodable, Equatable, Sendable {
    @LenientNumber public var total: Double
    public let count: Int
    public let topCategories: [CategoryAmount]
}

public struct RangeFinanceStats: Decodable, Equatable, Sendable {
    public let cashFlow: Double
    public let startNetWorth: Double
    public let endNetWorth: Double
    public let netWorthChange: Double
    public let totalCreated: Double
    public let nonIncomeChange: Double
}

public struct RangeStats: Decodable, Equatable, Sendable {
    public let startDate: String
    public let endDate: String
    public let incomeStats: RangeIncomeStats
    public let assetStats: RangeAssetStats
    public let debtStats: RangeDebtStats
    public let expenseStats: RangeExpenseStats
    public let financeStats: RangeFinanceStats
}

public struct DateRange: Decodable, Equatable, Sendable {
    public let startDate: String
    public let endDate: String
}

// MARK: - CatLogCore

extension CatLogCore {
    public func stockOverview(market: String, snapshotId: String? = nil, rangeStart: String = "", rangeEnd: String = "", today: String) throws -> StockOverview {
        try bridge.call("getStockOverview", [.data, .object([
            "market": .string(market),
            "snapshotId": .string(snapshotId ?? ""),
            "rangeStart": .string(rangeStart),
            "rangeEnd": .string(rangeEnd),
            "today": .string(today),
        ])])
    }

    public func stockTrades(market: String, symbol: String, rangeStart: String = "", rangeEnd: String = "") throws -> [StockTrade] {
        let trades = try bridge.callJSON("getStockTrades", [.data, .object([
            "market": .string(market),
            "symbol": .string(symbol),
            "rangeStart": .string(rangeStart),
            "rangeEnd": .string(rangeEnd),
        ])])
        return try bridge.call("describeStockTrades", [.json(trades)])
    }

    public func rangeStats(startDate: String, endDate: String) throws -> RangeStats {
        try bridge.call("getRangeStats", [.data, .string(startDate), .string(endDate)])
    }

    public func recentMonthsRange(_ months: Int, today: String) throws -> DateRange {
        try bridge.call("getRecentMonthsRange", [.int(months), .string(today)])
    }

    /// 依市場格式化（美股保留兩位小數）。
    public func formatMoney(_ value: Double, market: String) -> String {
        (try? bridge.callString("formatMoneyByMarket", [.number(value), .string(market)])) ?? formatMoney(value)
    }

    /// 今天（裝置時區）的 YYYY-MM-DD。
    public static func todayKey(_ date: Date = Date()) -> String {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 1970, parts.month ?? 1, parts.day ?? 1)
    }
}
