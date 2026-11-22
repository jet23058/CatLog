import XCTest
@testable import CatLogKit

final class MonthChartsTests: XCTestCase {
    func testRecentTrendAndAllocation() throws {
        let core = try CatLogCore.bundled()
        try core.load(dataJSON: #"""
        {"records":{"2025-11-30":[{"name":"銀行","type":"fixed","amount":1000}],
                    "2026-01-31":[{"name":"銀行","type":"fixed","amount":1500},{"name":"0050","type":"floating","amount":500}]},
         "incomes":{"2026-01":{"totalAmount":300,"items":[]}},
         "expenses":{"2025-12":[{"date":"2025/12/05","amount":80}]},"debts":{}}
        """#)
        let trend = try core.recentMonthTrend("2026-01", count: 6)
        XCTAssertEqual(trend.map(\.monthKey), ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"])
        XCTAssertEqual(trend.map(\.assets), [nil, nil, nil, 1000, nil, 2000])
        XCTAssertEqual(trend.last?.income, 300)
        XCTAssertEqual(trend[4].cost, 80)

        let detail = try core.monthDetail("2026-01")
        let allocation = try core.assetAllocation(detail.assets, topN: 4)
        XCTAssertEqual(allocation.total, 2000)
        XCTAssertEqual(allocation.slices.map(\.name), ["銀行", "0050"])
        XCTAssertEqual(allocation.slices.first?.share ?? 0, 0.75, accuracy: 0.0001)
        XCTAssertFalse(allocation.slices.contains(where: \.isOther))
    }
}
