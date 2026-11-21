import XCTest
@testable import CatLogKit

final class ImportExportTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: #"{"records":{"2026-01-31":[{"name":"銀行","type":"fixed","amount":100}]},"expenses":{"2025-12":[{"date":"2025/12/01","amount":1}]}}"#)
    }

    func testBackupRoundTrip() throws {
        XCTAssertEqual(try core.backupFileName(today: "2026-11-21"), "meow-assets-backup-20261121.json")
        let text = try core.backupText()
        let preview = try core.previewBackupImport(text: text)
        XCTAssertFalse(preview.hasChanges)
        XCTAssertEqual(preview.sections.first { $0.key == "records" }?.nextCount, 1)

        XCTAssertThrowsError(try core.previewBackupImport(text: "{\"foo\":1}")) { error in
            XCTAssertTrue(error.localizedDescription.contains("缺少 records 欄位"))
        }
    }

    func testExpenseCSVImport() throws {
        let csv = "日期,帳戶,名稱,金額,主類別,子類別,類型,幣種\n2026/01/05,現金,晚餐,-200,飲食,晚餐,支出,TWD"
        let preview = try core.previewExpenseImport(csv: csv)
        XCTAssertEqual(preview.months, ["2026-01"])
        XCTAssertTrue(preview.hasChanges)
        try core.load(dataJSON: try core.mergingExpenses(preview))
        XCTAssertGreaterThan(try core.monthDetail("2026-01").summary.monthlyCost, 0)
        XCTAssertEqual(try core.monthDetail("2025-12").summary.monthlyCost, 1) // 其他月份保留

        XCTAssertThrowsError(try core.previewExpenseImport(csv: "a,b\n1,2"))
    }
}
