import { getStockQuote as getStockQuoteFromCore, validateQuoteParams } from '@catlog/core';

export { validateQuoteParams };

const LISTING_CACHE_TTL_MS = 5 * 60 * 1000;
const QUOTE_CACHE_TTL_MS = 60 * 1000;
const MAX_QUOTE_CACHE_ENTRIES = 500;
const listingCache = new Map();
const quoteCache = new Map();

export const clearStockQuoteCache = () => {
    listingCache.clear();
    quoteCache.clear();
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

// 比對與解析規則在 core（iOS 共用）；這裡只負責抓資料與快取。
export const getStockQuote = (params = {}) => getStockQuoteFromCore(params, {
    requestJson,
    requestListing,
    now: () => new Date().toISOString()
});

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
