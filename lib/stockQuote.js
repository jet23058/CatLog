const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const TWSE_AVG_PRICE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL';

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

const findTwseQuote = async (rawSymbol) => {
    const keyword = String(rawSymbol || '').trim();
    if (!keyword) throw new Error('請先輸入股票代號');

    const rows = await requestJson(TWSE_AVG_PRICE_URL);
    const normalizedKeyword = keyword.replace(/\.TW$/i, '');
    const list = rows || [];
    const matched = (
        list.find((row) => row.Code === normalizedKeyword) ||
        list.find((row) => row.Name === normalizedKeyword) ||
        list.find((row) => row.Code?.replace(/\.TW$/i, '') === normalizedKeyword) ||
        list.find((row) => row.Name?.includes(normalizedKeyword))
    );

    if (!matched) throw new Error(`找不到 ${keyword} 的台股股價`);
    const price = parseNumber(matched.ClosingPrice);
    if (!price) throw new Error(`${matched.Name || keyword} 目前沒有可用收盤價`);

    return {
        symbol: `${matched.Code}.TW`,
        displaySymbol: matched.Code,
        name: matched.Name,
        price,
        currency: 'TWD',
        source: 'TWSE',
        fetchedAt: new Date().toISOString()
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
    const price = Number(result?.meta?.regularMarketPrice);
    if (!price || !Number.isFinite(price)) throw new Error(`找不到 ${rawSymbol} 的最新股價`);

    return {
        symbol: result?.meta?.symbol || symbol,
        displaySymbol: result?.meta?.symbol || symbol,
        name: result?.meta?.longName || result?.meta?.shortName || result?.meta?.symbol || symbol,
        price,
        currency: result?.meta?.currency || (market === 'US' ? 'USD' : 'TWD'),
        source: 'Yahoo Finance',
        fetchedAt: new Date().toISOString()
    };
};

export const getStockQuote = async ({ market = 'TW', symbol = '' } = {}) => {
    const normalizedMarket = market === 'US' ? 'US' : 'TW';
    if (normalizedMarket === 'TW') {
        try {
            return await findTwseQuote(symbol);
        } catch (error) {
            if (/^\d{4,6}(\.TW)?$/i.test(String(symbol || '').trim())) {
                return findYahooQuote(normalizedMarket, symbol);
            }
            throw error;
        }
    }
    return findYahooQuote(normalizedMarket, symbol);
};
