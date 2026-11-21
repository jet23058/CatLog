import XCTest
@testable import CatLogKit

final class MonthEditTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: """
        {
          "records": { "2026-03-31": [{ "id": "a1", "name": "嘉信", "type": "floating", "amount": 3200, "currency": "USD", "originalAmount": 100, "exchangeRate": 32 }] },
          "incomes": { "2026-03": { "totalAmount": 3200, "sources": [{ "company": "A", "currency": "USD", "originalAmount": 100, "exchangeRate": 32, "amount": 3200 }] } },
          "debts": { "2026-03-15": [{ "id": "p1", "category": "stock_pledge", "name": "股票質押", "amount": 1000, "pledgeStocks": [{ "symbol": "2330", "shares": 1, "rate": 2 }] }] },
          "debtEvents": { "2026-03": [{ "id": 1767225600000, "date": "2026-03-20", "type": "repay", "amount": 100 }, { "id": "e2", "date": "2026-03-21", "type": "fee", "amount": 5 }] },
          "memos": { "2026-03-31": "舊備註" },
          "expenses": { "2026-03": [{ "date": "2026/03/02", "amount": 50 }] }
        }
        """)
    }

    func testEditKeepsUnknownFieldsAndConvertsNumbers() throws {
        var draft = try core.monthEditDraft("2026-03")
        XCTAssertEqual(draft.assetDate, "2026-03-31")
        XCTAssertEqual(draft.debtDate, "2026-03-15")
        XCTAssertEqual(draft.assets.first?[text: "amount"], "3200")

        draft.assets[0][text: "amount"] = "4000"
        draft.incomes[0] = try core.updatingIncome(draft.incomes[0], field: "exchangeRate", value: "31")
        XCTAssertEqual(draft.incomes[0][text: "amount"], "3100")
        draft.debts[0][text: "amount"] = "800"
        draft.memo = "新備註"

        try core.load(dataJSON: try core.updatingMonth(draft))
        let detail = try core.monthDetail("2026-03")
        XCTAssertEqual(detail.assets.first?.amount, 4000)
        XCTAssertEqual(detail.assets.first?.currency, "USD")              // 未編輯的欄位保留
        XCTAssertEqual(detail.summary.monthlyIncome, 3100)
        XCTAssertEqual(detail.debts.first?.amount, 800)
        XCTAssertEqual(detail.memo, "新備註")
        // 質押明細等 iOS 沒有編輯的欄位要原樣保留
        let json = try XCTUnwrap(core.bridge.dataJSON())
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        let debt = try XCTUnwrap(((object["debts"] as? [String: Any])?["2026-03-15"] as? [[String: Any]])?.first)
        XCTAssertEqual((debt["pledgeStocks"] as? [[String: Any]])?.first?["symbol"] as? String, "2330")
        XCTAssertEqual(debt["category"] as? String, "stock_pledge")
    }

    func testEditCanRemoveDebtEvents() throws {
        var draft = try core.monthEditDraft("2026-03")
        XCTAssertEqual(draft.debtEvents.count, 2)
        draft.debtEvents.removeFirst()
        try core.load(dataJSON: try core.updatingMonth(draft))
        XCTAssertEqual(try core.monthDetail("2026-03").debtEvents.map(\.id), [.text("e2")])
    }

    func testDeleteDebtEventByNumericOrTextId() throws {
        let events = try core.monthDetail("2026-03").debtEvents
        XCTAssertEqual(events.map(\.id), [.number(1767225600000), .text("e2")])
        try core.load(dataJSON: try core.deletingDebtEvent(month: "2026-03", id: .number(1767225600000)))
        XCTAssertEqual(try core.monthDetail("2026-03").debtEvents.map(\.id), [.text("e2")])
        try core.load(dataJSON: try core.deletingDebtEvent(month: "2026-03", id: .text("e2")))
        XCTAssertTrue(try core.monthDetail("2026-03").debtEvents.isEmpty)
    }

    func testDeleteMonthKeepsIncomeAndExpenses() throws {
        try core.load(dataJSON: try core.deletingMonth("2026-03"))
        let detail = try core.monthDetail("2026-03")
        XCTAssertTrue(detail.assets.isEmpty)
        XCTAssertTrue(detail.debtEvents.isEmpty)
        XCTAssertEqual(detail.memo, "")
        XCTAssertEqual(detail.summary.monthlyIncome, 3200)
        XCTAssertEqual(detail.summary.monthlyCost, 50)
    }
}
