import XCTest
@testable import CatLogKit

final class StockImportTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: #"{"records":{},"stockTransactions":[{"id":"us","market":"US","type":"buy","symbol":"AAPL","amount":100,"date":"2026-01-02"}]}"#)
    }

    func testImportTWPastedTransactions() throws {
        let text = "\t2026/04/01\t台積電\t89,576\t\t479,138\n\t2026/04/09\t現金股息-台積電\t\t2,251\t275,126"
        let preview = try core.previewStockImport(text: text)
        XCTAssertEqual(preview.market, "TW")
        XCTAssertEqual(preview.total, 2)
        XCTAssertEqual(preview.count("buy"), 1)
        XCTAssertEqual(preview.count("dividend"), 1)
        XCTAssertEqual(preview.sampleTrades.count, 2)
        XCTAssertFalse(preview.sampleTrades[0].label.isEmpty)

        try core.load(dataJSON: try core.addingStockTransactions(preview))
        XCTAssertEqual(try core.stockOverview(market: "TW", today: "2026-11-21").transactionCount, 2)

        // 清空台股不影響美股
        try core.load(dataJSON: try core.clearingStockTransactions(market: "TW"))
        XCTAssertEqual(try core.stockOverview(market: "TW", today: "2026-11-21").transactionCount, 0)
        XCTAssertEqual(try core.stockOverview(market: "US", today: "2026-11-21").transactionCount, 1)
    }

    func testImportErrors() {
        XCTAssertThrowsError(try core.previewStockImport(text: "")) { error in
            XCTAssertTrue(error.localizedDescription.contains("CSV 檔案是空的"))
        }
    }

    func testHoldingSnapshotLifecycle() throws {
        XCTAssertEqual(try core.previousHoldingRows(market: "TW"), [])
        let rows = [HoldingRowInput(name: "台積電", price: "1,050", shares: "100"), HoldingRowInput(name: "缺價", shares: "1")]
        let preview = try core.holdingSnapshotPreview(month: "2026-11", note: " 月底 ", rows: rows)
        XCTAssertEqual(preview.holdings.count, 1)
        XCTAssertEqual(preview.skippedCount, 1)
        XCTAssertEqual(preview.totalMarketValue, 105_000)

        try core.load(dataJSON: try core.addingHoldingSnapshot(preview))
        let previous = try core.previousHoldingRows(market: "TW")
        XCTAssertEqual(previous.map(\.name), ["台積電"])
        XCTAssertEqual(previous.first?.price, "1050")

        let snapshot = try XCTUnwrap(try core.stockOverview(market: "TW", today: "2026-11-21").snapshots.first)
        XCTAssertEqual(snapshot.version, 1)
        try core.load(dataJSON: try core.deletingHoldingSnapshot(month: snapshot.month, id: snapshot.id))
        XCTAssertTrue(try core.stockOverview(market: "TW", today: "2026-11-21").snapshots.isEmpty)

        XCTAssertThrowsError(try core.holdingSnapshotPreview(month: "2026-11", note: "", rows: [HoldingRowInput()])) { error in
            XCTAssertTrue(error.localizedDescription.contains("請至少輸入一筆持倉資料"))
        }
    }
}
