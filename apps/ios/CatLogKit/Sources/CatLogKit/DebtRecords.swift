import Foundation

// 新增負債 / 負債異動。規則在 core 的 records.js（與 web 相同），這裡只是型別與呼叫。

/// 負債類別（core: DEBT_CATEGORIES）。
public struct DebtCategory: Decodable, Equatable, Sendable, Hashable {
    public let value: String
    public let label: String
}

/// 畫面上輸入中的一列質押股票 / 新利率（都是文字，交給 core 轉換）。
public struct PledgeRowInput: Equatable, Sendable, Identifiable {
    public let id: UUID
    public var symbol: String
    public var shares: String
    public var rate: String

    public init(id: UUID = UUID(), symbol: String = "", shares: String = "", rate: String = "") {
        self.id = id
        self.symbol = symbol
        self.shares = shares
        self.rate = rate
    }

    var argument: CoreBridge.Argument {
        .object(["symbol": .string(symbol), "shares": .string(shares), "rate": .string(rate)])
    }
}

/// 新增負債的輸入。
public struct DebtInput: Equatable, Sendable {
    public var date: String
    public var category: String
    public var name: String
    public var lender: String
    public var amount: String
    public var pledgeStocks: [PledgeRowInput]
    public var memo: String

    public init(date: String, category: String = "other", name: String = "", lender: String = "", amount: String = "", pledgeStocks: [PledgeRowInput] = [PledgeRowInput()], memo: String = "") {
        self.date = date
        self.category = category
        self.name = name
        self.lender = lender
        self.amount = amount
        self.pledgeStocks = pledgeStocks
        self.memo = memo
    }

    func argument(id: String? = nil) -> CoreBridge.Argument {
        var fields: [String: CoreBridge.Argument] = [
            "date": .string(date), "category": .string(category), "name": .string(name),
            "lender": .string(lender), "amount": .string(amount), "memo": .string(memo),
            "pledgeStocks": .array(pledgeStocks.map(\.argument)),
        ]
        if let id { fields["id"] = .string(id) }
        return .object(fields)
    }
}

/// 可以做利率調整的股票質押（core: getDebtEventTargets）。`rawJSON` 原樣傳回 core 建立異動。
public struct DebtEventTarget: Equatable, Sendable, Identifiable, Hashable {
    public let targetKey: String
    public let name: String
    public let lender: String
    public let pledgeStocks: [PledgeRowInput]
    public let rawJSON: String
    public var id: String { targetKey }
    public var title: String { lender.isEmpty ? name : "\(name)・\(lender)" }

    public static func == (lhs: Self, rhs: Self) -> Bool { lhs.targetKey == rhs.targetKey }
    public func hash(into hasher: inout Hasher) { hasher.combine(targetKey) }
}

/// 負債異動的輸入。type：borrow / repay / interest / fee / collateral / rate_change。
public struct DebtEventInput: Equatable, Sendable {
    public var monthKey: String
    public var date: String
    public var type: String
    public var name: String
    public var lender: String
    public var amount: String
    public var collateralText: String
    public var rateRows: [PledgeRowInput]
    public var target: DebtEventTarget?
    public var memo: String

    public init(monthKey: String, date: String, type: String = "borrow", name: String = "股票質押借款", lender: String = "", amount: String = "", collateralText: String = "", rateRows: [PledgeRowInput] = [PledgeRowInput()], target: DebtEventTarget? = nil, memo: String = "") {
        self.monthKey = monthKey
        self.date = date
        self.type = type
        self.name = name
        self.lender = lender
        self.amount = amount
        self.collateralText = collateralText
        self.rateRows = rateRows
        self.target = target
        self.memo = memo
    }

    func argument(id: String? = nil) -> CoreBridge.Argument {
        var fields: [String: CoreBridge.Argument] = [
            "monthKey": .string(monthKey), "date": .string(date), "type": .string(type),
            "name": .string(name), "lender": .string(lender), "amount": .string(amount),
            "collateralText": .string(collateralText), "memo": .string(memo),
            "rateRows": .array(rateRows.map(\.argument)),
            "target": target.map { .json($0.rawJSON) } ?? .null,
        ]
        if let id { fields["id"] = .string(id) }
        return .object(fields)
    }
}

private struct TargetFields: Decodable {
    struct Row: Decodable {
        let symbol: String?
        @LenientNumber var shares: Double
        @LenientNumber var rate: Double
    }
    let targetKey: String
    let name: String?
    let lender: String?
    let pledgeStocks: [Row]?
}

extension CatLogCore {
    public var debtCategories: [DebtCategory] {
        (try? bridge.constant("DEBT_CATEGORIES", as: [DebtCategory].self)) ?? [DebtCategory(value: "other", label: "其他")]
    }

    /// 新增負債時可選的機構 / 帳戶。
    public func debtAccountOptions(date: String) throws -> [String] {
        try bridge.call("getDebtAccountOptions", [.dataField("records"), .dataField("debts"), .string(date), .json("[]")])
    }

    /// 欄位有問題時回傳錯誤訊息，沒問題時為 nil。
    public func debtInputError(_ input: DebtInput) throws -> String? {
        try bridge.call("getDebtInputError", [input.argument()])
    }

    /// 股票質押的預估月息（輸入中即時試算）。
    public func estimatedMonthlyPledgeInterest(_ input: DebtInput) -> Double {
        guard let entry = try? bridge.callJSON("createDebtEntry", [input.argument(id: "preview")]) else { return 0 }
        return (try? bridge.call("getDebtEstimatedMonthlyInterest", [.json(entry)], as: Double.self)) ?? 0
    }

    /// 回傳加入負債後的完整資料 JSON（尚未寫入雲端）。cloudDataJSON 是存檔前重新讀取的雲端資料。
    public func addingDebt(_ input: DebtInput, id: String, cloudDataJSON: String?, dateKey: String) throws -> String {
        let entry = try bridge.callJSON("createDebtEntry", [input.argument(id: id)])
        return try bridge.callJSON("addDebtToData", [.data, cloudDataJSON.map { .json($0) } ?? .null, .string(dateKey), .json(entry)])
    }

    // MARK: - 負債異動

    public func debtEventDefaultDate(monthKey: String, today: String) throws -> String {
        try bridge.callString("getDebtEventDefaultDate", [.string(monthKey), .string(today)])
    }

    public func debtEventTargets(monthKey: String) throws -> [DebtEventTarget] {
        let text = try bridge.callJSON("getMonthDebtEventTargets", [.data, .string(monthKey)])
        guard let array = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [Any] else { return [] }
        return try array.map { element in
            let data = try JSONSerialization.data(withJSONObject: element)
            let fields = try JSONDecoder().decode(TargetFields.self, from: data)
            return DebtEventTarget(
                targetKey: fields.targetKey,
                name: fields.name ?? "股票質押",
                lender: fields.lender ?? "",
                pledgeStocks: (fields.pledgeStocks ?? []).map {
                    PledgeRowInput(symbol: $0.symbol ?? "", shares: $0.shares > 0 ? Self.plain($0.shares) : "", rate: $0.rate > 0 ? Self.plain($0.rate) : "")
                },
                rawJSON: String(decoding: data, as: UTF8.self)
            )
        }
    }

    public func debtEventInputError(_ input: DebtEventInput) throws -> String? {
        try bridge.call("getDebtEventInputError", [input.argument()])
    }

    /// 回傳加入負債異動後的完整資料 JSON（尚未寫入雲端）。
    public func addingDebtEvent(_ input: DebtEventInput, id: String) throws -> String {
        let event = try bridge.callJSON("createDebtEvent", [input.argument(id: id)])
        return try bridge.callJSON("addDebtEventToData", [.data, .string(input.monthKey), .json(event)])
    }

    /// 2.5 → "2.5"、1000 → "1000"
    static func plain(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(value)
    }
}
