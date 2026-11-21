// 最新股價的純函式：參數檢查、上市 / 上櫃清單比對、報價組成、Yahoo 回應解析。
// 不發網路請求：web 的 /api/stock-quote 與 iOS 各自抓資料，再交給這裡比對與解析，規則只有一份。
// 抓取順序（getStockQuote）：台股先找上市清單 → Yahoo 即時價（失敗用收盤價）；找不到再找上櫃清單；
// 都找不到且是純數字代號時，直接試 Yahoo 的 .TW，再試 .TWO。美股只查 Yahoo。

export const STOCK_QUOTE_SOURCES = {
    yahooChart: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    twseListing: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL',
    tpexListing: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes',
};

// 台股名稱可含中文；其餘只允許代號常見字元，避免把任意字串轉送到上游。
const SYMBOL_PATTERN = /^[\p{Script=Han}A-Za-z0-9.\-^=&*()（）]{1,24}$/u;

export const validateQuoteParams = ({ market, symbol } = {}) => {
    const normalizedMarket = String(market || 'TW').toUpperCase();
    if (!['TW', 'US'].includes(normalizedMarket)) throw new Error('市場參數只支援 TW 或 US');
    const normalizedSymbol = String(symbol || '').trim();
    if (!normalizedSymbol) throw new Error('請先輸入股票代號');
    if (!SYMBOL_PATTERN.test(normalizedSymbol)) throw new Error('股票代號格式不正確');
    return { market: normalizedMarket, symbol: normalizedSymbol };
};

const parseNumber = (value) => {
    const parsed = Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

/** 在上市清單（TWSE STOCK_DAY_AVG_ALL）找股票；找不到時丟錯。 */
export const matchTwseListing = (rows, rawSymbol) => {
    const keyword = String(rawSymbol || '').trim();
    if (!keyword) throw new Error('請先輸入股票代號');
    const normalizedKeyword = keyword.replace(/\.TW$/i, '');
    const list = rows || [];
    const matched = (
        list.find((row) => row.Code === normalizedKeyword) ||
        list.find((row) => row.Name === normalizedKeyword) ||
        list.find((row) => row.Code?.replace(/\.TW$/i, '') === normalizedKeyword) ||
        list.find((row) => row.Name?.includes(normalizedKeyword))
    );
    if (!matched) throw new Error(`找不到 ${keyword} 的台股股價`);
    return matched;
};

/** 在上櫃清單（TPEX mainboard quotes）找股票；找不到時丟錯。 */
export const matchTpexListing = (rows, rawSymbol) => {
    const keyword = String(rawSymbol || '').trim();
    if (!keyword) throw new Error('請先輸入股票代號');
    const normalizedKeyword = keyword.replace(/\.(TW|TWO)$/i, '');
    const list = rows || [];
    const matched = (
        list.find((row) => row.SecuritiesCompanyCode === normalizedKeyword) ||
        list.find((row) => row.CompanyName === normalizedKeyword) ||
        list.find((row) => row.CompanyName?.includes(normalizedKeyword))
    );
    if (!matched) throw new Error(`找不到 ${keyword} 的上櫃股價`);
    return matched;
};

export const buildTwseQuoteFromListing = (matched, rawSymbol, fetchedAt) => {
    const price = parseNumber(matched?.ClosingPrice);
    if (!price) throw new Error(`${matched?.Name || rawSymbol} 目前沒有可用收盤價`);
    return {
        symbol: `${matched?.Code}.TW`, displaySymbol: matched?.Code, name: matched?.Name, price,
        currency: 'TWD', source: 'TWSE', fetchedAt, priceType: 'close',
    };
};

export const buildTpexQuoteFromListing = (matched, rawSymbol, fetchedAt) => {
    const price = parseNumber(matched?.Close);
    if (!price) throw new Error(`${matched?.CompanyName || rawSymbol} 目前沒有可用收盤價`);
    return {
        symbol: `${matched?.SecuritiesCompanyCode}.TWO`, displaySymbol: matched?.SecuritiesCompanyCode, name: matched?.CompanyName, price,
        currency: 'TWD', source: 'TPEX', fetchedAt, priceType: 'close',
    };
};

export const normalizeYahooSymbol = (market, rawSymbol) => {
    const symbol = String(rawSymbol || '').trim();
    if (!symbol) return '';
    if (market === 'TW') {
        if (/^\d{4,6}$/.test(symbol)) return `${symbol}.TW`;
        return symbol;
    }
    return symbol.toUpperCase();
};

export const getYahooChartUrl = (market, rawSymbol) => {
    const symbol = normalizeYahooSymbol(market, rawSymbol);
    if (!symbol) throw new Error('請先輸入股票代號');
    return `${STOCK_QUOTE_SOURCES.yahooChart}${encodeURIComponent(symbol)}`;
};

/** 解析 Yahoo chart 回應；沒有價格時丟錯。 */
export const parseYahooChart = (payload, market, rawSymbol, fetchedAt) => {
    const symbol = normalizeYahooSymbol(market, rawSymbol);
    const meta = payload?.chart?.result?.[0]?.meta || {};
    const price = Number(meta.regularMarketPrice);
    if (!price || !Number.isFinite(price)) throw new Error(`找不到 ${rawSymbol} 的最新股價`);
    return {
        symbol: meta.symbol || symbol,
        displaySymbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || meta.symbol || symbol,
        price,
        currency: meta.currency || (market === 'US' ? 'USD' : 'TWD'),
        source: 'Yahoo Finance',
        fetchedAt,
        marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : '',
        priceType: 'market',
    };
};

/** 用上市 / 上櫃清單的名稱與代號蓋掉 Yahoo 的顯示名稱。 */
export const mergeListingIntoQuote = (quote, displaySymbol, name) => ({
    ...quote,
    displaySymbol: displaySymbol || quote.displaySymbol,
    name: name || quote.name,
});

/** 純數字台股代號（找不到上市 / 上櫃清單時，直接試 Yahoo 的 .TW 與 .TWO）。 */
export const isNumericTWSymbol = (symbol) => /^\d{4,6}(\.TW)?$/i.test(String(symbol || '').trim());

/**
 * 依上面的順序抓最新股價。requestJson(url) 由呼叫端提供（web 用 fetch，iOS 用 URLSession），
 * 回傳解析後的 JSON；now() 回傳 ISO 時間。
 */
export const getStockQuote = async ({ market = 'TW', symbol = '' } = {}, { requestJson, requestListing = requestJson, now }) => {
    const normalizedMarket = market === 'US' ? 'US' : 'TW';
    const yahoo = async (sym) => parseYahooChart(await requestJson(getYahooChartUrl(normalizedMarket, sym)), normalizedMarket, sym, now());
    if (normalizedMarket !== 'TW') return yahoo(symbol);

    try {
        const listing = matchTwseListing(await requestListing(STOCK_QUOTE_SOURCES.twseListing), symbol);
        try {
            return mergeListingIntoQuote(await yahoo(listing.Code || symbol), listing.Code, listing.Name);
        } catch {
            return buildTwseQuoteFromListing(listing, symbol, now());
        }
    } catch (error) {
        try {
            const listing = matchTpexListing(await requestListing(STOCK_QUOTE_SOURCES.tpexListing), symbol);
            try {
                return mergeListingIntoQuote(await yahoo(`${listing.SecuritiesCompanyCode}.TWO`), listing.SecuritiesCompanyCode, listing.CompanyName);
            } catch {
                return buildTpexQuoteFromListing(listing, symbol, now());
            }
        } catch {
            if (isNumericTWSymbol(symbol)) {
                try {
                    return await yahoo(symbol);
                } catch {
                    return yahoo(`${String(symbol).trim().replace(/\.TW$/i, '')}.TWO`);
                }
            }
            throw error;
        }
    }
};
