import XCTest
@testable import CatLogKit

final class CoreBridgeTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
    }

    // 與 packages/core/src/calculations.test.js 相同的手算範例，確認 iOS 跑出一樣的數字。
    private let sample = """
    {
      "records": {
        "2025-12-31": [{ "name": "銀行", "type": "fixed", "amount": 9000000 }],
        "2026-01-31": [{ "name": "銀行", "type": "fixed", "amount": 6000000 }, { "name": "股票", "type": "floating", "amount": 4000000 }],
        "2026-03-31": [{ "name": "銀行", "type": "fixed", "amount": 6500000 }, { "name": "股票", "type": "floating", "amount": 5500000 }]
      },
      "debts": { "2026-03-15": [{ "name": "信貸", "amount": 1000000 }] },
      "incomes": {
        "2025-12": { "totalAmount": 100000 },
        "2026-01": { "totalAmount": 120000, "sources": [] },
        "2026-03": { "totalAmount": 150000, "sources": [] }
      },
      "expenses": {
        "2026-01": [{ "date": "2026/01/05", "amount": 30000, "category": "飲食" }, { "date": "2026/01/20", "amount": 10000, "category": "交通" }],
        "2026-03": [{ "date": "2026-03-10", "amount": 50000, "category": "飲食" }]
      },
      "memos": { "2026-03-31": "加薪 🎉" },
      "fireSettings": { "withdrawalRate": 4 },
      "futureField": { "keep": true }
    }
    """

    func testLoadNormalizesAndKeepsUnknownFields() throws {
        let normalized = try core.load(dataJSON: sample)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(normalized.utf8)) as? [String: Any])
        XCTAssertEqual(object["schemaVersion"] as? Int, core.currentSchemaVersion)
        XCTAssertEqual((object["futureField"] as? [String: Any])?["keep"] as? Bool, true)
        XCTAssertEqual(object["memos"].flatMap { ($0 as? [String: String])?["2026-03-31"] }, "加薪 🎉")
        XCTAssertNotNil(object["stockTransactions"])
    }

    func testDashboardNumbersMatchWeb() throws {
        try core.load(dataJSON: sample)

        XCTAssertEqual(try core.availableYears(thisYear: 2026), [2026, 2025])

        let year = try core.yearStats(year: 2026)
        XCTAssertEqual(year.totalIncome, 270_000)
        XCTAssertEqual(year.lastYearAssets, 10_000_000)
        XCTAssertEqual(year.thisYearAssets, 11_000_000)
        XCTAssertEqual(year.realAssetGrowthAmount, 1_000_000)
        XCTAssertEqual(year.thisYearDebt, 1_000_000)
        XCTAssertEqual(year.assetGrowthStartDate, "2026-01-31")

        let months = try core.monthlyStats(year: 2026)
        XCTAssertEqual(months.count, 12)
        XCTAssertEqual(months[0].balance, 960_000)
        XCTAssertEqual(months[2].assets, 11_000_000)
        XCTAssertFalse(months[1].hasRecord)

        let fire = try core.fireStats()
        XCTAssertEqual(fire.avgExpense, 45_000)
        XCTAssertEqual(fire.fireTarget, 13_500_000)
        XCTAssertEqual(fire.currentAssets, 11_000_000)
    }

    func testCompatibility() throws {
        try core.load(dataJSON: sample)
        XCTAssertTrue(try core.compatibility(appVersion: "4.0.0", metaJSON: nil).canWrite)

        let tooOld = try core.compatibility(appVersion: "3.0.0", metaJSON: #"{"schemaVersion":1,"minClientVersion":"4.1.0"}"#)
        XCTAssertEqual(tooOld, Compatibility(canWrite: false, reason: "minClientVersion", requiredVersion: "4.1.0", schemaVersion: 1))
        XCTAssertTrue(try core.describe(tooOld).contains("4.1.0 以上"))

        try core.load(dataJSON: #"{"schemaVersion":99}"#)
        let newer = try core.compatibility(appVersion: "9.9.9", metaJSON: nil)
        XCTAssertFalse(newer.canWrite)
        XCTAssertEqual(newer.reason, "schema")
    }

    func testJavaScriptErrorsBecomeSwiftErrors() throws {
        XCTAssertThrowsError(try core.bridge.callJSON("doesNotExist")) { error in
            XCTAssertEqual(error as? CoreBridgeError, .functionNotFound("doesNotExist"))
        }
        XCTAssertThrowsError(try core.bridge.callJSON("normalizeAppData", [.json("{not json")]))
        XCTAssertThrowsError(try core.bridge.callJSON("getFireStats", [.data])) // 尚未載入資料
    }
}
