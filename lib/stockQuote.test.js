import { afterEach, describe, expect, test, vi } from 'vitest';
import { getStockQuote } from './stockQuote.js';

const mockJsonResponse = (payload, ok = true, status = 200) => ({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload)
});

describe('getStockQuote', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('resolves TPEX stock quote by Chinese name', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
            const requestUrl = String(url);
            if (requestUrl.includes('STOCK_DAY_AVG_ALL')) return mockJsonResponse([]);
            if (requestUrl.includes('tpex_mainboard_quotes')) {
                return mockJsonResponse([
                    { SecuritiesCompanyCode: '6217', CompanyName: '中探針', Close: '266.00' }
                ]);
            }
            if (requestUrl.includes('query1.finance.yahoo.com')) return mockJsonResponse({}, false, 404);
            return mockJsonResponse({}, false, 404);
        });

        const quote = await getStockQuote({ market: 'TW', symbol: '中探針' });

        expect(quote).toMatchObject({
            symbol: '6217.TWO',
            displaySymbol: '6217',
            name: '中探針',
            price: 266,
            source: 'TPEX'
        });
        expect(fetchMock).toHaveBeenCalledWith('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', expect.any(Object));
    });

    test('falls back to Yahoo TWO symbol for numeric OTC stocks', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
            const requestUrl = String(url);
            if (requestUrl.includes('STOCK_DAY_AVG_ALL')) return mockJsonResponse([]);
            if (requestUrl.includes('tpex_mainboard_quotes')) return mockJsonResponse([], false, 500);
            if (requestUrl.includes('6217.TWO')) {
                return mockJsonResponse({
                    chart: {
                        result: [{
                            meta: {
                                symbol: '6217.TWO',
                                shortName: '中探針',
                                regularMarketPrice: 266,
                                currency: 'TWD'
                            }
                        }]
                    }
                });
            }
            if (requestUrl.includes('6217.TW')) return mockJsonResponse({}, false, 404);
            return mockJsonResponse({}, false, 404);
        });

        const quote = await getStockQuote({ market: 'TW', symbol: '6217' });

        expect(quote).toMatchObject({
            symbol: '6217.TWO',
            displaySymbol: '6217.TWO',
            name: '中探針',
            price: 266,
            source: 'Yahoo Finance'
        });
    });
});
