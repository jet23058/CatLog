const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const TWSE_AVG_PRICE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL';
const TPEX_QUOTES_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes';

const LISTING_CACHE_TTL_MS = 5 * 60 * 1000;
const QUOTE_CACHE_TTL_MS = 60 * 1000;
const MAX_QUOTE_CACHE_ENTRIES = 500;
const listingCache = new Map();
const quoteCache = new Map();

export const clearStockQuoteCache = () => {
    listingCache.clear();
    quoteCache.clear();
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

// 上市 / 上櫃整份清單很大，同一個執行個體 5 分鐘內共用。
const requestListing = async (url) => {
    const cached = listingCache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await requestJson(url);
    listingCache.set(url, { value, expiresAt: Date.now() + LISTING_CACHE_TTL_MS });
    return value;
};

const requestJson = async (url) => {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json,text/plain,*/*'
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
};

const parseNumber = (value) => {
    const parsed = Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const findTwseListing = async (rawSymbol) => {
    const keyword = String(rawSymbol || '').trim();
    if (!keyword) throw new Error('請先輸入股票代號');

    const rows = await requestListing(TWSE_AVG_PRICE_URL);
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

const findTpexListing = async (rawSymbol) => {
    const keyword = String(rawSymbol || '').trim();
    if (!keyword) throw new Error('請先輸入股票代號');

    const rows = await requestListing(TPEX_QUOTES_URL);
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

const buildTwseQuoteFromListing = (matched, rawSymbol) => {
    const price = parseNumber(matched?.ClosingPrice);
    if (!price) throw new Error(`${matched?.Name || rawSymbol} 目前沒有可用收盤價`);

    return {
        symbol: `${matched?.Code}.TW`,
        displaySymbol: matched?.Code,
        name: matched?.Name,
        price,
        currency: 'TWD',
        source: 'TWSE',
        fetchedAt: new Date().toISOString(),
        priceType: 'close'
    };
};

const buildTpexQuoteFromListing = (matched, rawSymbol) => {
    const price = parseNumber(matched?.Close);
    if (!price) throw new Error(`${matched?.CompanyName || rawSymbol} 目前沒有可用收盤價`);

    return {
        symbol: `${matched?.SecuritiesCompanyCode}.TWO`,
        displaySymbol: matched?.SecuritiesCompanyCode,
        name: matched?.CompanyName,
        price,
        currency: 'TWD',
        source: 'TPEX',
        fetchedAt: new Date().toISOString(),
        priceType: 'close'
    };
};

const normalizeYahooSymbol = (market, rawSymbol) => {
    const symbol = String(rawSymbol || '').trim();
    if (!symbol) return '';
    if (market === 'TW') {
        if (/^\d{4,6}$/.test(symbol)) return `${symbol}.TW`;
        return symbol;
    }
    return symbol.toUpperCase();
};

const findYahooQuote = async (market, rawSymbol) => {
    const symbol = normalizeYahooSymbol(market, rawSymbol);
    if (!symbol) throw new Error('請先輸入股票代號');

    const payload = await requestJson(`${YAHOO_CHART_URL}${encodeURIComponent(symbol)}`);
    const result = payload?.chart?.result?.[0];
    const meta = result?.meta || {};
    const price = Number(meta.regularMarketPrice);
    if (!price || !Number.isFinite(price)) throw new Error(`找不到 ${rawSymbol} 的最新股價`);

    return {
        symbol: meta.symbol || symbol,
        displaySymbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || meta.symbol || symbol,
        price,
        currency: meta.currency || (market === 'US' ? 'USD' : 'TWD'),
        source: 'Yahoo Finance',
        fetchedAt: new Date().toISOString(),
        marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : '',
        priceType: meta.currentTradingPeriod?.post ? 'market' : 'market'
    };
};

export const getStockQuote = async ({ market = 'TW', symbol = '' } = {}) => {
    const normalizedMarket = market === 'US' ? 'US' : 'TW';
    if (normalizedMarket === 'TW') {
        try {
            const listing = await findTwseListing(symbol);
            try {
                const yahooQuote = await findYahooQuote(normalizedMarket, listing.Code || symbol);
                return {
                    ...yahooQuote,
                    displaySymbol: listing.Code || yahooQuote.displaySymbol,
                    name: listing.Name || yahooQuote.name
                };
            } catch (error) {
                return buildTwseQuoteFromListing(listing, symbol);
            }
        } catch (error) {
            try {
                const listing = await findTpexListing(symbol);
                try {
                    const yahooQuote = await findYahooQuote(normalizedMarket, `${listing.SecuritiesCompanyCode}.TWO`);
                    return {
                        ...yahooQuote,
                        displaySymbol: listing.SecuritiesCompanyCode || yahooQuote.displaySymbol,
                        name: listing.CompanyName || yahooQuote.name
                    };
                } catch (quoteError) {
                    return buildTpexQuoteFromListing(listing, symbol);
                }
            } catch (tpexError) {
                if (/^\d{4,6}(\.TW)?$/i.test(String(symbol || '').trim())) {
                    try {
                        return await findYahooQuote(normalizedMarket, symbol);
                    } catch (quoteError) {
                        return findYahooQuote(normalizedMarket, `${String(symbol || '').trim().replace(/\.TW$/i, '')}.TWO`);
                    }
                }
                throw error;
            }
        }
    }
    return findYahooQuote(normalizedMarket, symbol);
};

// API 入口：驗證參數並快取 60 秒，降低上游負擔與被濫用時的成本。
export const getCachedStockQuote = async (params) => {
    const { market, symbol } = validateQuoteParams(params);
    const key = `${market}:${symbol.toUpperCase()}`;
    const cached = quoteCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await getStockQuote({ market, symbol });
    if (quoteCache.size >= MAX_QUOTE_CACHE_ENTRIES) quoteCache.delete(quoteCache.keys().next().value);
    quoteCache.set(key, { value, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
    return value;
};
