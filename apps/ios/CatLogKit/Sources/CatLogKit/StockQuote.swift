import Foundation

// 最新股價與「最新估值」。比對、解析與抓取順序的規則在 core 的 stockQuote.js；
// 這裡只負責用 URLSession 抓上游資料（原生 App 沒有 CORS 限制，不需要經過 web 的 /api/stock-quote）。

public struct StockQuote: Decodable, Equatable, Sendable {
    public let symbol: String
    public let displaySymbol: String?
    public let name: String?
    @LenientNumber public var price: Double
    public let currency: String?
    public let source: String?
    public let fetchedAt: String?
    public let priceType: String?
}

/// 快照中一檔持股的最新估值（沒抓到價時 latest* 為 nil）。
public struct QuotedHolding: Decodable, Equatable, Sendable, Identifiable {
    public let id: String
    public let market: String
    public let symbol: String
    public let name: String
    @LenientNumber public var shares: Double
    @LenientNumber public var snapshotPrice: Double
    @LenientNumber public var snapshotValue: Double
    public let latestPrice: Double?
    public let latestValue: Double?
    public let diff: Double?
    public let diffRate: Double?
    /// 抓價時用的代號：沒有代號時用名稱（與 web 相同）。
    public var querySymbol: String { symbol.isEmpty ? name : symbol }
}

/// core: getStockQuoteEstimate
public struct StockQuoteEstimate: Decodable, Equatable, Sendable {
    public let hasEstimate: Bool
    public let quotedCount: Int
    public let holdingCount: Int
    @LenientNumber public var latestMarketValue: Double
    @LenientNumber public var marketValueDiff: Double
    @LenientNumber public var estimatedTotalPnl: Double
    @LenientNumber public var estimatedNetPnlAfterDebt: Double
    public let holdings: [QuotedHolding]
}

private struct QuoteSources: Decodable {
    let yahooChart: String
    let twseListing: String
    let tpexListing: String
}

extension CatLogCore {
    /// 用最新價試算目前快照（不改寫快照）。quotes 以持股 id 為 key。
    public func stockQuoteEstimate(market: String, snapshotId: String?, today: String, quotes: [String: Double]) throws -> StockQuoteEstimate {
        try bridge.call("getStockQuoteEstimate", [
            .data,
            .object(["market": .string(market), "snapshotId": .string(snapshotId ?? ""), "today": .string(today)]),
            .object(quotes.mapValues { .object(["price": .number($0)]) }),
        ])
    }

    /// 損益標籤：台股整數；美股預設 (USD)，currency 為 "TWD" 時依匯率換算台幣（core: formatStockPnlLabel）。
    public func stockPnlLabel(_ amount: Double, market: String, usdToTwdRate: Double, currency: String) -> String {
        (try? bridge.callString("formatStockPnlLabel", [.number(amount), .object([
            "market": .string(market), "usdToTwdRate": .number(usdToTwdRate), "currency": .string(currency),
        ])])) ?? CatLogCore.plain(amount)
    }

    public func formatExchangeRate(_ rate: Double) -> String {
        (try? bridge.callString("formatExchangeRate", [.number(rate)])) ?? CatLogCore.plain(rate)
    }

    public func formatPrice(_ price: Double) -> String {
        (try? bridge.callString("formatPriceUpToTwo", [.number(price)])) ?? CatLogCore.plain(price)
    }

    public func formatRate(_ rate: Double) -> String {
        (try? bridge.callString("formatRate", [.number(rate)])) ?? ""
    }
}

/// 抓最新股價。順序與 core 的 getStockQuote 相同：
/// 台股先找上市清單 → Yahoo 即時價（失敗用收盤價）；找不到再找上櫃清單；都找不到且是純數字代號時試 Yahoo 的 .TW、.TWO。
/// 上市 / 上櫃整份清單 5 分鐘內共用。
public final class StockQuoteService: @unchecked Sendable {
    public typealias Fetch = @Sendable (URL) async throws -> Data

    private let core: CatLogCore
    private let fetch: Fetch
    private let lock = NSLock()
    private var listingCache: [String: (text: String, expiresAt: Date)] = [:]
    private static let listingTTL: TimeInterval = 5 * 60

    public init(core: CatLogCore, fetch: @escaping Fetch = StockQuoteService.urlSessionFetch) {
        self.core = core
        self.fetch = fetch
    }

    public static let urlSessionFetch: Fetch = { url in
        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        request.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json,text/plain,*/*", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw CoreBridgeError.jsException("HTTP \(http.statusCode)")
        }
        return data
    }

    public func quote(market rawMarket: String, symbol rawSymbol: String) async throws -> StockQuote {
        let bridge = core.bridge
        struct Params: Decodable { let market: String; let symbol: String }
        let params: Params = try bridge.call("validateQuoteParams", [.object(["market": .string(rawMarket), "symbol": .string(rawSymbol)])])
        let market = params.market, symbol = params.symbol
        let sources = try bridge.constant("STOCK_QUOTE_SOURCES", as: QuoteSources.self)

        if market != "TW" { return try await yahoo(market, symbol) }

        do {
            let listing = try bridge.callJSON("matchTwseListing", [.json(try await listingText(sources.twseListing)), .string(symbol)])
            let fields = try Self.fields(listing, "Code", "Name")
            do {
                return try merge(try await yahoo(market, fields.0 ?? symbol), fields)
            } catch {
                return try bridge.call("buildTwseQuoteFromListing", [.json(listing), .string(symbol), .string(Self.now())])
            }
        } catch let twseError {
            do {
                let listing = try bridge.callJSON("matchTpexListing", [.json(try await listingText(sources.tpexListing)), .string(symbol)])
                let fields = try Self.fields(listing, "SecuritiesCompanyCode", "CompanyName")
                do {
                    return try merge(try await yahoo(market, "\(fields.0 ?? symbol).TWO"), fields)
                } catch {
                    return try bridge.call("buildTpexQuoteFromListing", [.json(listing), .string(symbol), .string(Self.now())])
                }
            } catch {
                let numeric: Bool = (try? bridge.call("isNumericTWSymbol", [.string(symbol)])) ?? false
                guard numeric else { throw twseError }
                do {
                    return try await yahoo(market, symbol)
                } catch {
                    let base = symbol.replacingOccurrences(of: ".TW", with: "", options: [.caseInsensitive, .anchored, .backwards])
                    return try await yahoo(market, "\(base).TWO")
                }
            }
        }
    }

    // MARK: - Helpers

    private func yahoo(_ market: String, _ symbol: String) async throws -> StockQuote {
        let urlText = try core.bridge.callString("getYahooChartUrl", [.string(market), .string(symbol)])
        guard let url = URL(string: urlText) else { throw CoreBridgeError.jsException("網址錯誤") }
        let text = String(decoding: try await fetch(url), as: UTF8.self)
        return try core.bridge.call("parseYahooChart", [.json(text), .string(market), .string(symbol), .string(Self.now())])
    }

    private func merge(_ quote: StockQuote, _ fields: (String?, String?)) throws -> StockQuote {
        let text = String(decoding: try JSONEncoder().encode(EncodableQuote(quote)), as: UTF8.self)
        return try core.bridge.call("mergeListingIntoQuote", [.json(text), fields.0.map { .string($0) } ?? .null, fields.1.map { .string($0) } ?? .null])
    }

    private func listingText(_ urlText: String) async throws -> String {
        lock.lock()
        if let cached = listingCache[urlText], cached.expiresAt > Date() { lock.unlock(); return cached.text }
        lock.unlock()
        guard let url = URL(string: urlText) else { throw CoreBridgeError.jsException("網址錯誤") }
        let text = String(decoding: try await fetch(url), as: UTF8.self)
        lock.lock()
        listingCache[urlText] = (text, Date().addingTimeInterval(Self.listingTTL))
        lock.unlock()
        return text
    }

    private static func fields(_ json: String, _ codeKey: String, _ nameKey: String) throws -> (String?, String?) {
        let object = try JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any]
        return (object?[codeKey] as? String, object?[nameKey] as? String)
    }

    private static func now() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }
}

/// StockQuote 轉回 JSON（交給 core 合併名稱）。
private struct EncodableQuote: Encodable {
    let symbol: String, displaySymbol: String?, name: String?, price: Double
    let currency: String?, source: String?, fetchedAt: String?, priceType: String?
    init(_ quote: StockQuote) {
        symbol = quote.symbol; displaySymbol = quote.displaySymbol; name = quote.name; price = quote.price
        currency = quote.currency; source = quote.source; fetchedAt = quote.fetchedAt; priceType = quote.priceType
    }
}
