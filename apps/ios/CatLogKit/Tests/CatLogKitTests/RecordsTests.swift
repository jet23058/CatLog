import XCTest
@testable import CatLogKit

final class RecordsTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: """
        {
          "records": {
            "2026-01-31": [
              { "name": "台新", "type": "fixed", "amount": 100000, "currency": "TWD" },
              { "name": "嘉信", "type": "floating", "amount": 325000, "currency": "USD", "originalAmount": 10000, "exchangeRate": 32.5, "note": "保留欄位" }
            ]
          },
          "incomes": { "2026-03": { "totalAmount": 100000, "sources": [{ "company": "A", "amount": 100000 }] } }
        }
        """)
    }

    func testAssetHelpers() throws {
        XCTAssertTrue(core.supportedCurrencies.contains("USD"))
        XCTAssertEqual(core.convertToTWD(originalAmount: "100.5", exchangeRate: "32.25", currency: "USD"), 3241)
        XCTAssertEqual(try core.assetNameOptions().map(\.name), ["台新", "嘉信"])
        XCTAssertEqual(try core.latestAsset(named: "嘉信")?.exchangeRate, 32.5)
        XCTAssertNil(try core.latestAsset(named: "不存在"))
        XCTAssertEqual(try core.previousAssetSnapshot(date: "2026-02-28").date, "2026-01-31")
        XCTAssertTrue(try core.isDuplicateAsset(date: "2026-01-31", pending: [], name: "台新", currency: "TWD"))
        XCTAssertFalse(try core.isDuplicateAsset(date: "2026-01-31", pending: [], name: "台新", currency: "JPY"))
    }

    func testAddAssetsKeepsImportedFields() throws {
        let imported = try core.importablePreviousAssets(date: "2026-02-28", pending: [], idPrefix: "imp")
        XCTAssertEqual(imported.map(\.name), ["台新", "嘉信"])
        let manual = try core.createAssetEntry(id: "m1", type: "fixed", name: "現金", originalAmount: "5000", currency: "TWD", exchangeRate: "1", date: "2026-02-28")
        XCTAssertEqual(manual.amount, 5000)

        let json = try core.addingAssets(imported + [manual], to: "2026-02-28")
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        let day = try XCTUnwrap((object["records"] as? [String: Any])?["2026-02-28"] as? [[String: Any]])
        XCTAssertEqual(day.count, 3)
        XCTAssertEqual(day[1]["note"] as? String, "保留欄位") // 帶入的舊資產保留 iOS 不認得的欄位
        XCTAssertNil(day[2]["date"])                          // 資產本身不存 date
    }

    func testAddIncome() throws {
        let entry = try core.createIncomeSource(date: "2026-03-05", company: "公司", bank: "台新", currency: "USD", originalAmount: "1000", exchangeRate: "32", memo: " 獎金 ")
        XCTAssertEqual(entry.amount, 32_000)
        XCTAssertEqual(entry.memo, "獎金")
        let json = try core.addingIncome(entry, to: "2026-03-05")
        try core.load(dataJSON: json)
        XCTAssertEqual(try core.monthDetail("2026-03").summary.monthlyIncome, 132_000)
    }
}
