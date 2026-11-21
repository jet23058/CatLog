import { describe, expect, it } from 'vitest';
import { deleteDebtEventFromData, deleteMonthData, updateIncomeSourceField, updateMonthDetails } from './index.js';

describe('編輯月份明細', () => {
    it('收入改原幣、匯率或幣別時重算台幣', () => {
        const usd = { currency: 'USD', originalAmount: 100, exchangeRate: 32, amount: 3200 };
        expect(updateIncomeSourceField(usd, 'originalAmount', '150').amount).toBe(4800);
        expect(updateIncomeSourceField(usd, 'exchangeRate', '31.5').amount).toBe(3150);
        expect(updateIncomeSourceField(usd, 'currency', 'TWD')).toMatchObject({ exchangeRate: 1, amount: 100 });
        expect(updateIncomeSourceField(usd, 'company', 'X')).toMatchObject({ company: 'X', amount: 3200 });
    });

    it('一起寫回資產、備忘錄、負債與收入，金額轉成數字', () => {
        const data = { records: { '2026-03-31': [{ name: '舊' }] }, incomes: { '2026-03': { totalAmount: 1, sources: [], note: '保留' } }, memos: {}, debts: {} };
        const next = updateMonthDetails(data, {
            month: '2026-03', assetDate: '2026-03-31', debtDate: '2026-03-31', memoDate: '2026-03-31',
            assets: [{ id: 'a', name: '銀行', amount: '1234', currency: 'TWD' }],
            memo: '備註',
            incomes: [{ _tempId: 0, company: 'A', amount: '500', originalAmount: '500', exchangeRate: '1' }, { company: 'B', amount: 300 }],
            debts: [{ _tempId: 1, name: '信貸', amount: '1000', pledgeStocks: [] }],
        });
        expect(next.records['2026-03-31']).toEqual([{ id: 'a', name: '銀行', amount: 1234, currency: 'TWD' }]);
        expect(next.memos['2026-03-31']).toBe('備註');
        expect(next.incomes['2026-03']).toEqual({ note: '保留', totalAmount: 800, sources: [{ company: 'A', amount: 500, originalAmount: 500, exchangeRate: 1 }, { company: 'B', amount: 300 }] });
        expect(next.debts['2026-03-31']).toEqual([{ name: '信貸', amount: 1000, pledgeStocks: [] }]);
        expect(data.records['2026-03-31']).toEqual([{ name: '舊' }]); // 不改動原資料
    });
});

describe('刪除', () => {
    const data = {
        records: { '2026-03-01': [1], '2026-03-31': [2], '2026-04-01': [3] },
        memos: { '2026-03-31': 'm', '2026-04-01': 'n' },
        debts: { '2026-03-15': [4] },
        debtEvents: { '2026-03': [{ id: 'e1' }, { id: 'e2' }], '2026-04': [{ id: 'e3' }] },
        incomes: { '2026-03': { totalAmount: 1 } },
        expenses: { '2026-03': [{ amount: 1 }] },
    };

    it('刪除整月：資產、負債、備忘錄、負債異動；收入與花費保留，不改動原資料', () => {
        const next = deleteMonthData(data, '2026-03');
        expect(Object.keys(next.records)).toEqual(['2026-04-01']);
        expect(next.memos).toEqual({ '2026-04-01': 'n' });
        expect(next.debts).toEqual({});
        expect(next.debtEvents).toEqual({ '2026-04': [{ id: 'e3' }] });
        expect(next.incomes).toBe(data.incomes);
        expect(next.expenses).toBe(data.expenses);
        expect(Object.keys(data.records)).toHaveLength(3);
        expect(data.debtEvents['2026-03']).toHaveLength(2);
    });

    it('刪除單筆負債異動', () => {
        expect(deleteDebtEventFromData(data, '2026-03', 'e1').debtEvents['2026-03']).toEqual([{ id: 'e2' }]);
    });
});
