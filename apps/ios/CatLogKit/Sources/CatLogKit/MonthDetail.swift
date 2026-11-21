import Foundation

/// 金額欄位：舊資料可能存成數字或字串（web 一律用 Number(x) 轉換），缺少時為 0。
@propertyWrapper
public struct LenientNumber: Decodable, Equatable, Sendable {
    public var wrappedValue: Double

    public init(wrappedValue: Double) { self.wrappedValue = wrappedValue }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let number = try? container.decode(Double.self) {
            wrappedValue = number.isFinite ? number : 0
        } else if let text = try? container.decode(String.self) {
            wrappedValue = Double(text.replacingOccurrences(of: ",", with: "")) ?? 0
        } else {
            wrappedValue = 0
        }
    }
}

extension KeyedDecodingContainer {
    func decode(_ type: LenientNumber.Type, forKey key: Key) throws -> LenientNumber {
        try decodeIfPresent(type, forKey: key) ?? LenientNumber(wrappedValue: 0)
    }
}

public struct AssetItem: Decodable, Equatable, Sendable, Identifiable {
    public let name: String?
    public let type: String?
    @LenientNumber public var amount: Double
    public let currency: String?
    public var id: String { "\(type ?? "")-\(name ?? "")" }
    public var isFloating: Bool { type == "floating" }
}

public struct IncomeSource: Decodable, Equatable, Sendable {
    public let company: String?
    public let bank: String?
    public let date: String?
    public let memo: String?
    @LenientNumber public var amount: Double
}

public struct DebtItem: Decodable, Equatable, Sendable {
    public let name: String?
    public let category: String?
    public let lender: String?
    public let memo: String?
    @LenientNumber public var amount: Double
}

public struct DebtEvent: Decodable, Equatable, Sendable {
    public let date: String?
    public let type: String?
    public let name: String?
    public let memo: String?
    @LenientNumber public var amount: Double
}

public struct ExpenseItem: Decodable, Equatable, Sendable {
    public let date: String?
    public let name: String?
    public let category: String?
    public let subCategory: String?
    public let account: String?
    @LenientNumber public var amount: Double
}

public struct ExpenseCategory: Decodable, Equatable, Sendable, Identifiable {
    public let name: String
    @LenientNumber public var value: Double
    public var id: String { name }
}

public struct DebtEventStats: Decodable, Equatable, Sendable {
    @LenientNumber public var principal: Double
    @LenientNumber public var interest: Double
    @LenientNumber public var fees: Double
    public let rateChanges: Int
}

public struct MonthSummary: Decodable, Equatable, Sendable {
    public let totalAssets: Double
    public let totalDebts: Double
    public let netAssets: Double
    public let investmentRate: Double
    public let monthlyIncome: Double
    public let monthlyCost: Double
    public let incomeDiff: Double
    public let assetDiff: Double
    public let compositeScore: Double
}

/// `getMonthDetail(data, monthKey)`：月份明細頁（唯讀）。
public struct MonthDetail: Decodable, Equatable, Sendable {
    public let monthKey: String
    public let assetDate: String?
    public let effectiveDebtSnapshotDate: String?
    public let isDebtCarriedForward: Bool
    public let assets: [AssetItem]
    public let memo: String
    public let incomes: [IncomeSource]
    public let debts: [DebtItem]
    public let debtEvents: [DebtEvent]
    public let debtEventStats: DebtEventStats
    public let estimatedMonthlyDebtInterest: Double
    public let expenses: [ExpenseItem]
    public let expenseCategories: [ExpenseCategory]
    public let prevMonth: String?
    public let nextMonth: String?
    public let prevMonthAssetsMap: [String: LenientNumber]
    public let summary: MonthSummary

    /// 與上個月相同資產的差額（web 的「較上月」）；上個月沒有這項資產時為 nil。
    public func changeFromPreviousMonth(_ asset: AssetItem) -> Double? {
        guard let previous = prevMonthAssetsMap["\(asset.type ?? "undefined")-\(asset.name ?? "undefined")"] else { return nil }
        return asset.amount - previous.wrappedValue
    }
}
