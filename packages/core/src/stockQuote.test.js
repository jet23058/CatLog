import { describe, expect, it } from 'vitest';
import { getStockQuote, getStockQuoteEstimate, matchTpexListing, matchTwseListing, parseYahooChart, validateQuoteParams } from './index.js';

const NOW = '2026-11-21T00:00:00.000Z';
const yahoo = (symbol, price) => ({ chart: { result: [{ meta: { symbol, regularMarketPrice: price, currency: 'TWD', shortName: symbol } }] } });

// 模擬上游：依網址回傳資料，沒有設定的網址丟錯（等同 HTTP 404）。
const fakeRequest = (routes) => async (url) => {
    const hit = Object.entries(routes).find(([key]) => url.includes(key));
    if (!hit) throw new Error('HTTP 404');
    return hit[1];
};

describe('最新股價', () => {
    it('參數檢查與清單比對', () => {
        expect(validateQuoteParams({ market: 'tw', symbol: ' 2330 ' })).toEqual({ market: 'TW', symbol: '2330' });
        expect(() => validateQuoteParams({ market: 'US', symbol: '../../etc' })).toThrow('格式不正確');
        expect(matchTwseListing([{ Code: '2330', Name: '台積電' }], '台積').Code).toBe('2330');
        expect(() => matchTwseListing([], '2330')).toThrow('找不到 2330 的台股股價');
        expect(matchTpexListing([{ SecuritiesCompanyCode: '6217', CompanyName: '中探針' }], '6217.TWO').CompanyName).toBe('中探針');
        expect(() => parseYahooChart({}, 'US', 'AAPL', NOW)).toThrow('找不到 AAPL 的最新股價');
    });

    it('上市：Yahoo 成功時用即時價並帶入中文名稱；失敗時用收盤價', async () => {
        const twse = [{ Code: '2330', Name: '台積電', ClosingPrice: '1,000.00' }];
        const live = await getStockQuote({ market: 'TW', symbol: '台積電' }, {
            requestJson: fakeRequest({ STOCK_DAY_AVG_ALL: twse, '2330.TW': yahoo('2330.TW', 1050) }), now: () => NOW,
        });
        expect(live).toMatchObject({ price: 1050, displaySymbol: '2330', name: '台積電', source: 'Yahoo Finance' });

        const close = await getStockQuote({ market: 'TW', symbol: '2330' }, { requestJson: fakeRequest({ STOCK_DAY_AVG_ALL: twse }), now: () => NOW });
        expect(close).toMatchObject({ price: 1000, source: 'TWSE', priceType: 'close', fetchedAt: NOW });
    });

    it('上櫃與純數字代號的 .TWO 備援', async () => {
        const tpex = await getStockQuote({ market: 'TW', symbol: '中探針' }, {
            requestJson: fakeRequest({ STOCK_DAY_AVG_ALL: [], tpex_mainboard_quotes: [{ SecuritiesCompanyCode: '6217', CompanyName: '中探針', Close: '266.00' }] }),
            now: () => NOW,
        });
        expect(tpex).toMatchObject({ symbol: '6217.TWO', price: 266, source: 'TPEX' });

        const fallback = await getStockQuote({ market: 'TW', symbol: '6217' }, {
            requestJson: fakeRequest({ STOCK_DAY_AVG_ALL: [], '6217.TWO': yahoo('6217.TWO', 270) }), now: () => NOW,
        });
        expect(fallback).toMatchObject({ symbol: '6217.TWO', price: 270 });
    });

    it('美股只查 Yahoo', async () => {
        const quote = await getStockQuote({ market: 'US', symbol: 'aapl' }, {
            requestJson: fakeRequest({ '/AAPL': { chart: { result: [{ meta: { symbol: 'AAPL', regularMarketPrice: 230.5, currency: 'USD' } }] } } }), now: () => NOW,
        });
        expect(quote).toMatchObject({ symbol: 'AAPL', price: 230.5, currency: 'USD' });
    });
});

describe('最新估值', () => {
    it('用最新價試算市值與若未賣出損益，不改快照', () => {
        const data = {
            stockTransactions: [{ id: 't', market: 'TW', type: 'buy', symbol: '台積電', amount: 90000, date: '2026-10-01' }],
            stockHoldingSnapshots: { '2026-10': [{ id: 's', version: 1, importedAt: '2026-10-31T00:00:00Z', holdings: [{ id: 'h1', market: 'TW', name: '台積電', shares: 100, marketPrice: 1000, marketValue: 100000 }] }] },
        };
        const estimate = getStockQuoteEstimate(data, { market: 'TW', today: '2026-11-21' }, { h1: { price: 1100 } });
        expect(estimate).toMatchObject({ hasEstimate: true, latestMarketValue: 110000, marketValueDiff: 10000, estimatedTotalPnl: 20000 });
        expect(estimate.holdings[0]).toMatchObject({ id: 'h1', latestPrice: 1100, latestValue: 110000, diff: 10000, diffRate: 0.1 });
        expect(getStockQuoteEstimate(data, { market: 'TW', today: '2026-11-21' }, {}).holdings[0].latestPrice).toBeNull();
        expect(data.stockHoldingSnapshots['2026-10'][0].holdings[0].marketValue).toBe(100000);
    });
});
