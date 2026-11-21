import { describe, expect, it } from 'vitest';
import {
    addDebtEventToData,
    addDebtToData,
    cleanPledgeStockRows,
    createDebtEntry,
    createDebtEvent,
    getDebtAccountOptions,
    getDebtEventDefaultDate,
    getDebtEventInputError,
    getDebtEventTargets,
    getDebtInputError,
    parseCollateralText,
} from './index.js';

describe('新增負債', () => {
    it('機構選項：同月或之前最近一次資產紀錄的帳戶、既有負債機構', () => {
        const records = {
            '2026-01-31': [{ name: '台新', bank: '台新銀行' }, { name: '現金' }],
            '2026-03-31': [{ name: '元大', broker: '元大證券' }],
        };
        const debts = { '2026-01-10': [{ name: '信貸', lender: '國泰' }] };
        expect(getDebtAccountOptions(records, debts, '2026-02-15', ['自訂'])).toEqual(['台新銀行', '現金', '國泰', '自訂']);
        expect(getDebtAccountOptions(records, debts, '2026-03-31')).toEqual(['元大證券', '國泰']);
    });

    it('欄位檢查與建立', () => {
        expect(getDebtInputError({ date: '', name: 'a', amount: 1 })).toBe('請選擇日期');
        expect(getDebtInputError({ date: '2026-01-01', name: ' ', amount: 1 })).toBe('請輸入負債名稱');
        expect(getDebtInputError({ date: '2026-01-01', name: 'a', amount: 0 })).toBe('請輸入有效金額');
        expect(getDebtInputError({ date: '2026-01-01', name: '股票質押', amount: 1, category: 'stock_pledge', pledgeStocks: [{ symbol: ' ' }] })).toBe('請至少輸入一筆質押股票');
        expect(getDebtInputError({ date: '2026-01-01', name: 'a', amount: '100' })).toBeNull();

        expect(cleanPledgeStockRows([{ symbol: ' 2330 ', shares: '1000.7', rate: '2.5' }, { symbol: '' }])).toEqual([{ symbol: '2330', shares: 1000, rate: 2.5 }]);
        expect(createDebtEntry({ id: 1, category: 'credit_loan', name: ' 信貸 ', lender: ' 國泰 ', amount: '500000', pledgeStocks: [{ symbol: 'x' }], memo: ' m ' }))
            .toEqual({ id: 1, category: 'credit_loan', name: '信貸', lender: '國泰', amount: 500000, pledgeStocks: [], memo: 'm' });
    });

    it('先合併雲端最新負債再新增，不會蓋掉其他裝置剛新增的負債', () => {
        const local = { records: { a: 1 }, debts: { '2026-01-10': [{ id: 'local', name: '信貸', amount: 100 }] } };
        const cloud = { records: { b: 2 }, debts: { '2026-01-10': [{ id: 'cloud', name: '房貸', amount: 900 }] } };
        const next = addDebtToData(local, cloud, '2026-02-01', { id: 'new', name: '車貸', amount: 50 });
        const names = next.debts['2026-02-01'].map((d) => d.name).sort();
        expect(names).toEqual(['信貸', '房貸', '車貸'].sort()); // 延續前期負債 + 新增
        expect(next.debts['2026-01-10'].map((d) => d.id).sort()).toEqual(['cloud', 'local']);
        expect(next.records).toEqual({ b: 2 }); // 其他資料以雲端為準
        expect(addDebtToData(local, null, '2026-02-01', { id: 'n', name: 'x', amount: 1 }).records).toEqual({ a: 1 });
    });
});

describe('新增負債異動', () => {
    it('預設日期：今天在該月就用今天，否則月底', () => {
        expect(getDebtEventDefaultDate('2026-11', '2026-11-21')).toBe('2026-11-21');
        expect(getDebtEventDefaultDate('2024-02', '2026-11-21')).toBe('2024-02-29');
    });

    it('擔保品文字解析', () => {
        expect(parseCollateralText('2330:1000, 0050 500, 2317x2000')).toEqual([
            { symbol: '2330', shares: 1000 }, { symbol: '0050', shares: 500 }, { symbol: '2317', shares: 2000 },
        ]);
    });

    it('欄位檢查', () => {
        const base = { monthKey: '2026-03', date: '2026-03-10', type: 'borrow', name: '股票質押借款', amount: 1000 };
        expect(getDebtEventInputError({ ...base, date: '2026-04-01' })).toBe('日期需在目前月份內');
        expect(getDebtEventInputError({ ...base, amount: 0 })).toBe('請輸入有效金額');
        expect(getDebtEventInputError({ ...base, type: 'collateral', amount: 0 })).toBeNull();
        expect(getDebtEventInputError({ ...base, type: 'rate_change', target: null })).toBe('請先選擇要調整利率的股票質押');
        expect(getDebtEventInputError({ ...base, type: 'rate_change', target: { targetKey: 'k' }, rateRows: [{ symbol: '2330', rate: 0 }] })).toBe('請至少輸入一筆新的利率資料');
        expect(getDebtEventInputError(base)).toBeNull();
    });

    it('建立一般異動與利率調整', () => {
        expect(createDebtEvent({ id: 1, date: '2026-03-10', type: 'collateral', name: ' 質押 ', amount: 99, collateralText: '2330:1000' }))
            .toEqual({ id: 1, date: '2026-03-10', type: 'collateral', name: '質押', lender: '', amount: 0, collateral: [{ symbol: '2330', shares: 1000 }], memo: '' });

        const [target] = getDebtEventTargets([{ id: 'd1', category: 'stock_pledge', name: '股票質押', lender: '元大', amount: 1 }, { category: 'mortgage' }]);
        expect(target.targetKey).toBe('id:d1');
        const event = createDebtEvent({ id: 2, date: '2026-03-15', type: 'rate_change', target, rateRows: [{ symbol: '2330', shares: '1000', rate: '2.8' }, { symbol: '0050', rate: 0 }] });
        expect(event).toMatchObject({ type: 'rate_change', name: '股票質押', lender: '元大', targetDebtId: 'd1', targetDebtKey: 'id:d1', amount: 0, pledgeStocks: [{ symbol: '2330', shares: 1000, rate: 2.8 }] });

        const next = addDebtEventToData({ debtEvents: { '2026-03': [{ id: 0 }] } }, '2026-03', event);
        expect(next.debtEvents['2026-03'].map((e) => e.id)).toEqual([0, 2]);
    });
});
