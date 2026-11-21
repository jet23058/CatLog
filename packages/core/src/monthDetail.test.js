import { describe, expect, it } from 'vitest';
import { getDataMonths, getExpenseCategories, getLatestDateInMonth, getMonthDetail } from './index.js';

const data = {
    records: {
        '2026-01-31': [{ name: '銀行', type: 'fixed', amount: 6_000_000 }, { name: '股票', type: 'floating', amount: 4_000_000 }],
        '2026-03-15': [{ name: '銀行', type: 'fixed', amount: 6_100_000 }],
        '2026-03-31': [{ name: '銀行', type: 'fixed', amount: 6_500_000 }, { name: '股票', type: 'floating', amount: 5_500_000 }],
    },
    debts: {
        '2026-01-10': [{ name: '信貸', category: 'credit_loan', amount: 1_000_000 }],
    },
    debtEvents: {
        '2026-03': [
            { date: '2026-03-20', type: 'repay', target: '信貸', amount: 200_000 },
            { date: '2026-03-25', type: 'interest', amount: 3_000 },
        ],
    },
    incomes: {
        '2026-01': { totalAmount: 120_000, sources: [{ company: 'A', amount: 120_000 }] },
        '2026-03': { totalAmount: 150_000, sources: [{ company: 'A', amount: 150_000 }] },
    },
    expenses: {
        '2026-03': [
            { date: '2026/03/02', amount: 500, category: '飲食', account: '現金' },
            { date: '2026/03/05', amount: 30_000, category: '房租', account: '銀行' },
            { date: '2026/03/09', amount: 700, account: '現金' },
        ],
    },
    memos: { '2026-03-31': '加薪' },
};

describe('月份明細', () => {
    it('基本工具函式', () => {
        expect(getLatestDateInMonth(data.records, '2026-03')).toBe('2026-03-31');
        expect(getLatestDateInMonth(data.records, '2026-02')).toBeNull();
        expect(getDataMonths(data)).toEqual(['2026-01', '2026-03']);
        expect(getExpenseCategories(data.expenses['2026-03']).map((c) => [c.name, c.value])).toEqual([['房租', 30_000], ['其他', 700], ['飲食', 500]]);
    });

    it('取當月最後一筆資產、前後月份與前月比較基準', () => {
        const detail = getMonthDetail(data, '2026-03');
        expect(detail.assetDate).toBe('2026-03-31');
        expect(detail.assets.map((a) => a.amount)).toEqual([6_500_000, 5_500_000]);
        expect(detail.memo).toBe('加薪');
        expect(detail.prevMonth).toBe('2026-01');
        expect(detail.nextMonth).toBeNull();
        expect(detail.prevTotalAssets).toBe(10_000_000);
        expect(detail.prevTotalDebts).toBe(1_000_000);
        expect(detail.prevMonthIncome).toBe(120_000);
        expect(detail.prevMonthAssetsMap).toEqual({ 'fixed-銀行': 6_000_000, 'floating-股票': 4_000_000 });
    });

    it('負債延續自前期快照，並標示來源', () => {
        const detail = getMonthDetail(data, '2026-03');
        expect(detail.effectiveDebtSnapshotDate).toBe('2026-01-10');
        expect(detail.isDebtCarriedForward).toBe(true);
        expect(detail.monthlyDebtSnapshots).toEqual([]);
        expect(detail.debtEvents.map((e) => e.date)).toEqual(['2026-03-20', '2026-03-25']);
        expect(detail.debtEventStats.interest).toBe(3_000);
    });

    it('摘要：淨資產、投資比例、收支與綜合指標', () => {
        const { summary } = getMonthDetail(data, '2026-03');
        expect(summary.totalAssets).toBe(12_000_000);
        expect(summary.investmentRate).toBeCloseTo(5.5 / 12);
        expect(summary.monthlyIncome).toBe(150_000);
        expect(summary.monthlyCost).toBe(31_200);
        expect(summary.incomeDiff).toBe(30_000);
        expect(summary.assetDiff).toBe(summary.netAssets - 9_000_000);
        expect(summary.compositeScore).toBe(summary.incomeDiff + summary.assetDiff);
    });
});
