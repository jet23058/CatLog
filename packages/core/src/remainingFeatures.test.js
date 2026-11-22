import { describe, expect, it } from 'vitest';
import { getStatementDefaultRange, getStatementView, setFireWithdrawalRate, summarizeDataCounts } from './index.js';

describe('對帳單', () => {
    it('預設區間：上個月 15 日到這個月 16 日，跨年與 31 日都正確', () => {
        expect(getStatementDefaultRange('2026-11-21')).toEqual({ startDate: '2026-10-15', endDate: '2026-11-16' });
        expect(getStatementDefaultRange('2026-01-05')).toEqual({ startDate: '2025-12-15', endDate: '2026-01-16' });
        expect(getStatementDefaultRange('2026-03-31')).toEqual({ startDate: '2026-02-15', endDate: '2026-03-16' });
    });

    it('帳戶、區間篩選、標題與 key', () => {
        const expenses = {
            '2026-10': [
                { id: 1, date: '2026/10/20', account: '信用卡', name: '晚餐', category: '飲食', amount: 200 },
                { date: '2026/10/21', account: '信用卡', subCategory: '交通', category: '行', amount: 50 },
                { date: '2026/10/21', account: '現金', category: '雜支', amount: 10 },
                { id: 9, date: '2026/09/01', account: '信用卡', category: '舊', amount: 999 },
            ],
        };
        const view = getStatementView(expenses, '', '2026-10-15', '2026-11-16');
        expect(view.accounts).toEqual(['信用卡', '現金']);
        expect(view.account).toBe('信用卡');
        expect(view.items.map((item) => [item.key, item.title])).toEqual([['信用卡|2026/10/21#0', '交通'], ['1', '晚餐']]);
        expect(view.total).toBe(250);
        expect(getStatementView(expenses, '現金', '2026-10-15', '2026-11-16').total).toBe(10);
        expect(getStatementView({}, '', '2026-10-15', '2026-11-16')).toEqual({ accounts: [], account: '', items: [], total: 0 });
    });
});

describe('FIRE 提領率', () => {
    it('只接受大於 0 的數字，其他設定保留', () => {
        expect(setFireWithdrawalRate({ fireSettings: { withdrawalRate: 4, other: 1 } }, '3.5').fireSettings).toEqual({ withdrawalRate: 3.5, other: 1 });
        expect(() => setFireWithdrawalRate({}, '0')).toThrow('提領率必須大於 0');
        expect(() => setFireWithdrawalRate({}, 'abc')).toThrow('提領率必須大於 0');
    });
});

describe('雲端診斷', () => {
    it('各區塊筆數', () => {
        const counts = summarizeDataCounts({
            records: { a: [1, 2] }, incomes: { '2026-01': { sources: [1, 2, 3] } },
            stockHoldingSnapshots: { '2026-01': [{}, {}] }, stockTransactions: [1],
        });
        expect(counts).toMatchObject({ recordsDates: 1, recordsItems: 2, incomeSources: 3, stockSnapshotVersions: 2, stockTransactions: 1, debtItems: 0 });
        expect(summarizeDataCounts(null).recordsItems).toBe(0);
    });
});
