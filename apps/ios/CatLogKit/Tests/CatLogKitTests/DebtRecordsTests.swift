import XCTest
@testable import CatLogKit

final class DebtRecordsTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: """
        {
          "records": { "2026-01-31": [{ "name": "台新", "bank": "台新銀行", "amount": 1 }] },
          "debts": { "2026-01-10": [{ "id": "p1", "category": "stock_pledge", "name": "股票質押", "lender": "元大", "amount": 400000,
                                       "pledgeStocks": [{ "symbol": "2330", "shares": 1000, "rate": 2.5 }] }] }
        }
        """)
    }

    func testDebtInputAndInterestPreview() throws {
        XCTAssertTrue(core.debtCategories.contains { $0.value == "stock_pledge" })
        XCTAssertEqual(try core.debtAccountOptions(date: "2026-02-01"), ["台新銀行", "元大"])

        var input = DebtInput(date: "2026-02-01", category: "stock_pledge", name: "股票質押", amount: "120000",
                              pledgeStocks: [PledgeRowInput(symbol: "", shares: "", rate: "")])
        XCTAssertEqual(try core.debtInputError(input), "請至少輸入一筆質押股票")
        input.pledgeStocks = [PledgeRowInput(symbol: "0050", shares: "1000", rate: "3")]
        XCTAssertNil(try core.debtInputError(input))
        XCTAssertEqual(core.estimatedMonthlyPledgeInterest(input), 300, accuracy: 0.001) // 120000 × 3% ÷ 12
    }

    func testAddDebtMergesCloudAndCarriesForward() throws {
        let input = DebtInput(date: "2026-02-01", category: "credit_loan", name: "信貸", lender: "國泰", amount: "50000")
        let cloud = #"{"debts":{"2026-01-15":[{"id":"cloud","name":"房貸","amount":900}]}}"#
        let json = try core.addingDebt(input, id: "new", cloudDataJSON: cloud, dateKey: "2026-02-01")
        try core.load(dataJSON: json)
        // 每個日期是一份完整的負債快照：新增時延續「最近一次快照」（雲端 1/15 那份），再加上新的一筆。
        let names = try core.monthDetail("2026-02").debts.compactMap(\.name).sorted()
        XCTAssertEqual(names, ["信貸", "房貸"].sorted())
        // 本機 1/10 的快照在合併後仍然保留
        XCTAssertEqual(try core.monthDetail("2026-01").monthKey, "2026-01")
        XCTAssertTrue(json.contains("\"2026-01-10\""))
    }

    func testDebtEventsAndRateChange() throws {
        XCTAssertEqual(try core.debtEventDefaultDate(monthKey: "2024-02", today: "2026-11-21"), "2024-02-29")
        let targets = try core.debtEventTargets(monthKey: "2026-03")
        XCTAssertEqual(targets.map(\.targetKey), ["id:p1"])
        XCTAssertEqual(targets.first?.pledgeStocks.first?.rate, "2.5")

        var event = DebtEventInput(monthKey: "2026-03", date: "2026-03-10", type: "rate_change", target: nil)
        XCTAssertEqual(try core.debtEventInputError(event), "請先選擇要調整利率的股票質押")
        event.target = targets.first
        event.rateRows = [PledgeRowInput(symbol: "2330", shares: "1000", rate: "2.8")]
        XCTAssertNil(try core.debtEventInputError(event))
        try core.load(dataJSON: try core.addingDebtEvent(event, id: "e1"))
        let detail = try core.monthDetail("2026-03")
        XCTAssertEqual(detail.debtEvents.map(\.type), ["rate_change"])
        XCTAssertEqual(detail.debtEventStats.rateChanges, 1)

        let repay = DebtEventInput(monthKey: "2026-03", date: "2026-03-20", type: "repay", name: "股票質押", lender: "元大", amount: "100000")
        XCTAssertNil(try core.debtEventInputError(repay))
        try core.load(dataJSON: try core.addingDebtEvent(repay, id: "e2"))
        XCTAssertEqual(try core.monthDetail("2026-03").debtEvents.count, 2)
    }
}
