import XCTest
@testable import CatLogKit

final class StockQuoteTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: #"""
        {"records":{},"stockTransactions":[{"id":"t","market":"TW","type":"buy","symbol":"台積電","amount":90000,"date":"2026-10-01"}],
         "stockHoldingSnapshots":{"2026-10":[{"id":"s","version":1,"importedAt":"2026-10-31T00:00:00Z","holdings":[{"id":"h1","market":"TW","name":"台積電","shares":100,"marketPrice":1000,"marketValue":100000}]}]}}
        """#)
    }

    /// 依網址回傳假資料；沒設定的網址視為 HTTP 404。
    private func service(_ routes: [String: String]) -> StockQuoteService {
        StockQuoteService(core: core) { url in
            guard let hit = routes.first(where: { url.absoluteString.contains($0.key) }) else { throw CoreBridgeError.jsException("HTTP 404") }
            return Data(hit.value.utf8)
        }
    }

    private func yahoo(_ symbol: String, _ price: Double) -> String {
        #"{"chart":{"result":[{"meta":{"symbol":"\#(symbol)","regularMarketPrice":\#(price),"currency":"TWD"}}]}}"#
    }

    func testTWSEWithYahooAndCloseFallback() async throws {
        let twse = #"[{"Code":"2330","Name":"台積電","ClosingPrice":"1,000.00"}]"#
        let live = try await service(["STOCK_DAY_AVG_ALL": twse, "2330.TW": yahoo("2330.TW", 1050)]).quote(market: "TW", symbol: "台積電")
        XCTAssertEqual(live.price, 1050)
        XCTAssertEqual(live.name, "台積電")
        XCTAssertEqual(live.displaySymbol, "2330")

        let close = try await service(["STOCK_DAY_AVG_ALL": twse]).quote(market: "TW", symbol: "2330")
        XCTAssertEqual(close.price, 1000)
        XCTAssertEqual(close.source, "TWSE")
    }

    func testTPEXAndNumericFallback() async throws {
        let tpex = try await service(["STOCK_DAY_AVG_ALL": "[]", "tpex_mainboard_quotes": #"[{"SecuritiesCompanyCode":"6217","CompanyName":"中探針","Close":"266.00"}]"#])
            .quote(market: "TW", symbol: "中探針")
        XCTAssertEqual(tpex.symbol, "6217.TWO")
        XCTAssertEqual(tpex.price, 266)

        let numeric = try await service(["STOCK_DAY_AVG_ALL": "[]", "6217.TWO": yahoo("6217.TWO", 270)]).quote(market: "TW", symbol: "6217")
        XCTAssertEqual(numeric.price, 270)

        do {
            _ = try await service(["STOCK_DAY_AVG_ALL": "[]"]).quote(market: "TW", symbol: "不存在")
            XCTFail("應該找不到")
        } catch {
            XCTAssertTrue(error.localizedDescription.contains("找不到 不存在 的台股股價"))
        }
    }

    func testUSAndValidation() async throws {
        let quote = try await service(["/AAPL": #"{"chart":{"result":[{"meta":{"symbol":"AAPL","regularMarketPrice":230.5,"currency":"USD"}}]}}"#])
            .quote(market: "US", symbol: "aapl")
        XCTAssertEqual(quote.price, 230.5)
        do {
            _ = try await service([:]).quote(market: "US", symbol: "../../etc")
            XCTFail("應該被擋下")
        } catch {
            XCTAssertTrue(error.localizedDescription.contains("格式不正確"))
        }
    }

    func testEstimate() throws {
        let estimate = try core.stockQuoteEstimate(market: "TW", snapshotId: nil, today: "2026-11-21", quotes: ["h1": 1100])
        XCTAssertTrue(estimate.hasEstimate)
        XCTAssertEqual(estimate.latestMarketValue, 110_000)
        XCTAssertEqual(estimate.estimatedTotalPnl, 20_000)
        XCTAssertEqual(estimate.holdings.first?.diffRate, 0.1)
        XCTAssertNil(try core.stockQuoteEstimate(market: "TW", snapshotId: nil, today: "2026-11-21", quotes: [:]).holdings.first?.latestPrice)

        XCTAssertEqual(core.stockPnlLabel(100, market: "US", usdToTwdRate: 32, currency: "TWD"), "NT$+3,200")
        XCTAssertTrue(core.stockPnlLabel(100, market: "US", usdToTwdRate: 32, currency: "USD").hasPrefix("(USD) +"))
    }
}
