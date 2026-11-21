import { describe, expect, it } from 'vitest';
import { getRangeStats, getRecentMonthsRange, getStockOverview, getStockTrades } from './index.js';

describe('區間統計快捷與彙總', () => {
    it('近 N 個月：從 N-1 個月前的 1 號到本月最後一天', () => {
        expect(getRecentMonthsRange(3, '2026-11-21')).toEqual({ startDate: '2026-09-01', endDate: '2026-11-30' });
        expect(getRecentMonthsRange(12, '2026-02-10')).toEqual({ startDate: '2025-03-01', endDate: '2026-02-28' });
        expect(getRecentMonthsRange(6, '2024-02-29')).toEqual({ startDate: '2023-09-01', endDate: '2024-02-29' });
    });

    it('getRangeStats 組合收入、資產、負債、花費與推估', () => {
        const data = {
            incomes: { '2026-01': { totalAmount: 100, sources: [{ amount: 100 }] } },
            records: { '2026-01-01': [{ name: 'a', amount: 1000 }], '2026-01-31': [{ name: 'a', amount: 1200 }] },
            debts: {}, debtEvents: {},
            expenses: { '2026-01': [{ date: '2026/01/10', amount: 30, category: '飲食' }] },
        };
        const stats = getRangeStats(data, '2026-01-01', '2026-01-31');
        expect(stats.incomeStats.total).toBe(100);
        expect(stats.assetStats.change).toBe(200);
        expect(stats.expenseStats.total).toBe(30);
        expect(stats.financeStats).toMatchObject({ cashFlow: 70, netWorthChange: 200, totalCreated: 230 });
    });
});

describe('個股績效總覽', () => {
    const data = {
        stockTransactions: [
            { date: '2026-01-10', market: 'TW', symbol: '2330', name: '台積電', type: 'buy', amount: 600_000 },
            { date: '2026-02-10', market: 'TW', symbol: '2330', name: '台積電', type: 'sell', amount: 350_000 },
            { date: '2026-02-11', market: 'TW', symbol: '2317', name: '鴻海', type: 'buy', amount: 100_000 },
            { date: '2026-03-01', market: 'US', symbol: 'AAPL', name: 'Apple', type: 'buy', amount: 1_000, currency: 'USD' },
        ],
        stockHoldingSnapshots: {
            '2026-03': [
                { id: 'v1', version: 1, importedAt: '2026-03-31T00:00:00Z', holdings: [{ market: 'TW', symbol: '2330', name: '台積電', shares: 300, marketValue: 330_000 }, { market: 'TW', symbol: '2317', name: '鴻海', shares: 500, marketValue: 80_000 }] },
            ],
        },
        debts: {}, debtEvents: {},
    };

    it('依市場計算損益、快照、贏家與輸家', () => {
        const tw = getStockOverview(data, { market: 'TW', today: '2026-11-21' });
        expect(tw.selectedSnapshotId).toBe('v1');
        expect(tw.snapshots).toEqual([{ id: 'v1', month: '2026-03', version: 1, note: '', importedAt: '2026-03-31T00:00:00Z', holdingCount: 2 }]);
        expect(tw.rows.map((r) => [r.symbol, r.totalPnl])).toEqual([['2330', 80_000], ['2317', -20_000]]);
        expect(tw.stats.totalPnl).toBe(60_000);
        expect(tw.winners.map((r) => r.symbol)).toEqual(['2330']);
        expect(tw.losers.map((r) => r.symbol)).toEqual(['2317']);
        expect(tw.marketCounts).toEqual({ TW: 2, US: 1 });
        expect(tw.targetDate).toBe('2026-03-31');
        expect(tw.allWinners.map((r) => r.symbol)).toEqual(['2330']);
        expect(tw.allLosers.map((r) => r.symbol)).toEqual(['2317']);
        expect(tw.chartRows.map((r) => [r.symbol, r.barWidth])).toEqual([['2330', 100], ['2317', 25]]);

        const us = getStockOverview(data, { market: 'US', today: '2026-11-21' });
        expect(us.selectedSnapshotId).toBeNull();
        expect(us.rows.map((r) => r.symbol)).toEqual(['AAPL']);
        expect(us.targetDate).toBe('2026-03-01');
    });

    it('有日期區間時只算區間內交易，不納入快照市值', () => {
        const ranged = getStockOverview(data, { market: 'TW', rangeStart: '2026-02-01', rangeEnd: '2026-02-28', today: '2026-11-21' });
        expect(ranged.hasRange).toBe(true);
        expect(ranged.rows.map((r) => [r.symbol, r.totalPnl, r.marketValue])).toEqual([['2330', 350_000, 0], ['2317', -100_000, 0]]);
        expect(getStockTrades(data, { market: 'TW', symbol: '2330' }).map((t) => t.type)).toEqual(['sell', 'buy']);
    });
});
