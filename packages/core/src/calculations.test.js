import { describe, expect, it } from 'vitest';
import {
    buildHoldingMap,
    buildStockRows,
    filterTransactionsByRange,
    formatStockPnlLabel,
    getAvailableYears,
    getExpenseAccounts,
    getFireStats,
    getFireYearlyStats,
    getLatestSnapshotEstimate,
    getMonthlyStats,
    getRangeAssetStats,
    getRangeExpenseStats,
    getRangeFinanceStats,
    getRangeIncomeStats,
    getStatementExpenses,
    getStockChartRows,
    getStockDebtStats,
    getStockStats,
    getStockStatsTargetDate,
    getYearStats,
} from './index.js';

// 手算過的範例資料：2025 年底淨資產 900 萬，2026 年 1、3 月有資產紀錄，3 月有 100 萬負債。
const data = {
    records: {
        '2025-12-31': [{ name: '銀行', type: 'fixed', amount: 9_000_000 }],
        '2026-01-31': [{ name: '銀行', type: 'fixed', amount: 6_000_000 }, { name: '股票', type: 'floating', amount: 4_000_000 }],
        '2026-03-31': [{ name: '銀行', type: 'fixed', amount: 6_500_000 }, { name: '股票', type: 'floating', amount: 5_500_000 }],
    },
    debts: {
        '2026-03-15': [{ name: '信貸', amount: 1_000_000 }],
    },
    debtEvents: {},
    incomes: {
        '2025-12': { totalAmount: 100_000 },
        '2026-01': { totalAmount: 120_000, sources: [{ company: 'A', amount: 120_000 }] },
        '2026-03': { totalAmount: 150_000, sources: [{ company: 'A', amount: 150_000 }] },
    },
    expenses: {
        '2026-01': [
            { date: '2026/01/05', amount: 30_000, category: '飲食', account: '信用卡' },
            { date: '2026/01/20', amount: 10_000, category: '交通', account: '現金' },
        ],
        '2026-03': [
            { date: '2026-03-10', amount: 50_000, category: '飲食', account: '信用卡' },
        ],
    },
    memos: { '2026-03-31': '加薪' },
    fireSettings: { withdrawalRate: 4 },
};

describe('儀表板', () => {
    it('getAvailableYears 新到舊，不含未來年份', () => {
        expect(getAvailableYears({ ...data, memos: { '2030-01-01': 'x' } }, 2026)).toEqual([2026, 2025]);
    });

    it('getMonthlyStats 扣除月底有效負債，並以去年底為基準計算結餘', () => {
        const months = getMonthlyStats(data, 2026);
        expect(months[0]).toMatchObject({ hasRecord: true, grossAssets: 10_000_000, debts: 0, assets: 10_000_000, income: 120_000, cost: 40_000 });
        // 1 月：資產 +1,000,000（相對去年底 9,000,000），減去花費 40,000
        expect(months[0].balance).toBe(960_000);
        expect(months[0].analysis).toEqual({ incomeDiff: 20_000, assetDiff: 1_000_000, compositeScore: 1_020_000 });
        // 2 月沒有資產紀錄：資產顯示 0，結餘只扣花費
        expect(months[1]).toMatchObject({ hasRecord: false, assets: 0 });
        expect(months[1].balance === 0).toBe(true); // 原邏輯為 -cost，無花費時是 -0
        // 3 月：毛資產 12,000,000 − 負債 1,000,000，相對 1 月 +1,000,000，減去花費 50,000
        expect(months[2]).toMatchObject({ grossAssets: 12_000_000, debts: 1_000_000, assets: 11_000_000, memo: '加薪' });
        expect(months[2].balance).toBe(950_000);
    });

    it('getYearStats 用年度第一筆與最後一筆實際資產紀錄計算增長', () => {
        const stats = getYearStats(data, 2026);
        expect(stats).toMatchObject({
            totalIncome: 270_000,
            lastYearIncome: 100_000,
            assetGrowthRate: 2.7,
            assetGrowthStartDate: '2026-01-31',
            assetGrowthEndDate: '2026-03-31',
            lastYearAssets: 10_000_000,
            thisYearAssets: 11_000_000,
            realAssetGrowthAmount: 1_000_000,
            thisYearDebt: 1_000_000,
        });
        expect(stats.realAssetGrowthPercentage).toBeCloseTo(0.1);
    });

    it('getFireStats：平均月支出 × 12 ÷ 提領率', () => {
        const fire = getFireStats(data);
        expect(fire.avgExpense).toBe(45_000);
        expect(fire.fireTarget).toBe(13_500_000);
        expect(fire.currentAssets).toBe(11_000_000);
        expect(fire.progress).toBeCloseTo(11 / 13.5);
    });

    it('getFireYearlyStats 列出每年平均、最高、最低月份', () => {
        expect(getFireYearlyStats(data.expenses)).toEqual([
            { year: '2026', avg: 45_000, max: { month: 3, val: 50_000 }, min: { month: 1, val: 40_000 } },
        ]);
    });
});

describe('區間統計與對帳單', () => {
    it('收入、資產、花費與財務推估', () => {
        const incomeStats = getRangeIncomeStats(data.incomes, '2026-01-01', '2026-03-31');
        expect(incomeStats).toMatchObject({ total: 270_000, count: 2 });

        const assetStats = getRangeAssetStats(data.records, '2026-01-31', '2026-03-31');
        expect(assetStats).toMatchObject({ startAssets: 10_000_000, endAssets: 12_000_000, change: 2_000_000 });
        expect(assetStats.floating.changes).toEqual([{ name: '股票', startAmt: 4_000_000, endAmt: 5_500_000, change: 1_500_000 }]);

        const expenseStats = getRangeExpenseStats(data.expenses, '2026-01-01', '2026-03-31');
        expect(expenseStats).toEqual({ total: 90_000, count: 3, topCategories: [['飲食', 80_000], ['交通', 10_000]] });

        const finance = getRangeFinanceStats({
            incomeStats,
            assetStats,
            debtStats: { startDebts: 0, endDebts: 1_000_000 },
            expenseStats,
        });
        expect(finance).toEqual({
            cashFlow: 180_000,
            startNetWorth: 10_000_000,
            endNetWorth: 11_000_000,
            netWorthChange: 1_000_000,
            totalCreated: 1_090_000,
            nonIncomeChange: 820_000,
        });
    });

    it('對帳單依帳戶與日期篩選，新到舊', () => {
        expect(getExpenseAccounts(data.expenses)).toEqual(['信用卡', '現金']);
        const items = getStatementExpenses(data.expenses, '信用卡', '2026-01-01', '2026-03-10');
        expect(items.map((item) => item.amount)).toEqual([50_000, 30_000]);
        expect(getStatementExpenses(data.expenses, '', '2026-01-01', '2026-03-31')).toEqual([]);
    });
});

describe('個股績效', () => {
    const trades = [
        { date: '2026-01-10', market: 'TW', symbol: '2330', name: '台積電', type: 'buy', amount: 600_000 },
        { date: '2026-02-10', market: 'TW', symbol: '2330', name: '台積電', type: 'sell', amount: 350_000 },
        { date: '2026-03-10', market: 'TW', symbol: '2330', name: '台積電', type: 'dividend', amount: 5_000 },
        { date: '2026-03-10', market: 'TW', symbol: '2330', name: '台積電', type: 'fee', amount: 1_000 },
        { date: '2026-03-20', market: 'TW', type: 'dividend', amount: 2_000, unassigned: true },
        { date: '2026-01-05', market: 'TW', type: 'deposit', amount: 1_000_000 },
    ];
    const snapshot = { id: 's1', month: '2026-03', holdings: [{ id: 'h1', market: 'TW', symbol: '2330', name: '台積電', shares: 300, marketValue: 330_000 }] };

    it('個股損益 = 快照市值 + 賣出 + 股息 − 買入 − 費用', () => {
        const holdingMap = buildHoldingMap(snapshot, snapshot.holdings);
        const rows = buildStockRows(trades, holdingMap, snapshot);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ key: 'TW:2330', marketValue: 330_000, totalPnl: 84_000, snapshotDate: '2026-03', tradeCount: 4 });
        expect(rows[0].roi).toBeCloseTo(0.14);

        const stats = getStockStats(rows, trades);
        expect(stats).toMatchObject({ totalBuy: 600_000, totalMarketValue: 330_000, totalDividends: 7_000, totalDeposits: 1_000_000, totalPnl: 86_000 });
    });

    it('日期區間只保留區間內交易', () => {
        expect(filterTransactionsByRange(trades, '2026-02-01', '2026-03-15')).toHaveLength(3);
        expect(filterTransactionsByRange(trades)).toHaveLength(trades.length);
    });

    it('質押負債依市場分攤，並扣除後得到淨損益', () => {
        const debts = {
            '2026-03-01': [{
                name: '股票質押', category: 'stock_pledge', amount: 400_000,
                pledgeStocks: [{ symbol: '2330', shares: 1000, rate: 3 }],
            }],
        };
        const result = getStockDebtStats({ debts, debtEvents: {}, market: 'TW', targetDate: '2026-03-31', totalPnl: 86_000 });
        expect(result).toMatchObject({ debtSnapshotDate: '2026-03-01', marketPledgeDebt: 400_000, totalPledgeDebt: 400_000, netPnlAfterDebt: -314_000 });
        expect(result.marketEstimatedAnnualInterest).toBeCloseTo(12_000);
    });

    it('基準日：無區間用快照月底，有區間用結束日，否則用今天', () => {
        expect(getStockStatsTargetDate({ hasRange: false, selectedSnapshot: snapshot, today: '2026-11-20' })).toBe('2026-03-31');
        expect(getStockStatsTargetDate({ hasRange: true, selectedSnapshot: snapshot, rangeEnd: '2026-02-28', today: '2026-11-20' })).toBe('2026-02-28');
        expect(getStockStatsTargetDate({ hasRange: true, transactions: [], today: '2026-11-20' })).toBe('2026-11-20');
    });

    it('最新股價試算市值差異', () => {
        const rows = buildStockRows(trades, buildHoldingMap(snapshot, snapshot.holdings), snapshot);
        const estimate = getLatestSnapshotEstimate({ rows, holdings: snapshot.holdings, quotes: { h1: { price: 1200 } }, totalPnl: 86_000, marketPledgeDebt: 400_000 });
        expect(estimate).toMatchObject({ hasEstimate: true, quotedCount: 1, latestMarketValue: 360_000, marketValueDiff: 30_000, estimatedTotalPnl: 116_000, estimatedNetPnlAfterDebt: -284_000 });
    });

    it('損益標籤與長條圖', () => {
        expect(formatStockPnlLabel(1234, { market: 'TW' })).toBe('+1,234');
        expect(formatStockPnlLabel(-10.5, { market: 'US', usdToTwdRate: 32, currency: 'USD' })).toMatch(/^\(USD\) -?10\.5/);
        expect(formatStockPnlLabel(10, { market: 'US', usdToTwdRate: 32, currency: 'TWD' })).toBe('NT$+320');
        const chart = getStockChartRows([{ totalPnl: 100 }, { totalPnl: -50 }, { totalPnl: 1 }]);
        expect(chart.map((row) => row.barWidth)).toEqual([100, 50, 6]);
    });
});
