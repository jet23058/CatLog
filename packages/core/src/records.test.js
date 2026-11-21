import { describe, expect, it } from 'vitest';
import {
    SUPPORTED_CURRENCIES,
    addAssetsToData,
    addIncomeToData,
    convertToTWD,
    createAssetEntry,
    createIncomeSource,
    getAssetNameOptions,
    getImportablePreviousAssets,
    getLatestAssetByName,
    getPreviousAssetSnapshot,
    isDuplicateAsset,
} from './index.js';

const records = {
    '2026-01-31': [
        { name: '台新', type: 'fixed', amount: 100_000, currency: 'TWD' },
        { name: '嘉信', type: 'floating', amount: 325_000, currency: 'USD', originalAmount: 10_000, exchangeRate: 32.5 },
    ],
    '2026-02-28': [{ name: '台新', type: 'fixed', amount: 120_000, currency: 'TWD' }],
};

describe('新增資產', () => {
    it('幣別與換算', () => {
        expect(SUPPORTED_CURRENCIES).toContain('USD');
        expect(convertToTWD('1000', '1', 'TWD')).toBe(1000);
        expect(convertToTWD('100.5', '32.25', 'USD')).toBe(3241); // 3241.125 → 3241
        expect(convertToTWD('', '32', 'USD')).toBe(0);
    });

    it('名稱選項、最近一次同名資產、上次資產快照', () => {
        expect(getAssetNameOptions(records)).toEqual([{ name: '台新', type: 'fixed' }, { name: '嘉信', type: 'floating' }]);
        expect(getLatestAssetByName(records, '台新').amount).toBe(120_000);
        expect(getPreviousAssetSnapshot(records, '2026-03-15').date).toBe('2026-02-28');
        expect(getPreviousAssetSnapshot(records, '2026-02-28').date).toBe('2026-01-31');
        expect(getPreviousAssetSnapshot(records, '2026-01-01')).toEqual({ date: null, assets: [] });
    });

    it('同名稱 + 同幣別重複，同名不同幣別可以', () => {
        expect(isDuplicateAsset(records, '2026-02-28', [], ' 台新 ', 'TWD')).toBe(true);
        expect(isDuplicateAsset(records, '2026-02-28', [], '台新', 'JPY')).toBe(false);
        expect(isDuplicateAsset(records, '2026-03-01', [{ name: 'A', currency: 'TWD', date: '2026-03-01' }], 'A', 'TWD')).toBe(true);
    });

    it('帶入上次資產時略過已存在的項目', () => {
        const pending = [{ name: '台新', currency: 'TWD', date: '2026-03-31' }];
        const imported = getImportablePreviousAssets(records, '2026-03-31', pending, 'x');
        expect(imported).toEqual([]); // 上次（2/28）只有台新，已在待新增清單
        const fromJan = getImportablePreviousAssets(records, '2026-02-15', [], 'x');
        expect(fromJan.map((a) => [a.id, a.name, a.date, a.exchangeRate])).toEqual([['x-0', '台新', '2026-02-15', 1], ['x-1', '嘉信', '2026-02-15', 32.5]]);
    });

    it('建立資產並加到指定日期（不保存 date 欄位）', () => {
        const entry = createAssetEntry({ id: 'a1', type: 'floating', name: ' 嘉信 ', originalAmount: '200', currency: 'USD', exchangeRate: '32', date: '2026-02-28' });
        expect(entry).toEqual({ id: 'a1', type: 'floating', name: '嘉信', amount: 6400, currency: 'USD', originalAmount: 200, exchangeRate: 32, date: '2026-02-28' });
        const next = addAssetsToData({ records }, '2026-02-28', [entry]);
        expect(next.records['2026-02-28']).toHaveLength(2);
        expect(next.records['2026-02-28'][1]).not.toHaveProperty('date');
        expect(records['2026-02-28']).toHaveLength(1); // 不改動原資料
    });
});

describe('新增收入', () => {
    it('累加到該月份並附加來源', () => {
        const source = createIncomeSource({ date: '2026-03-05', company: '公司', bank: '台新', currency: 'TWD', originalAmount: '50000', exchangeRate: 1, memo: ' 獎金 ' });
        expect(source).toEqual({ date: '2026-03-05', company: '公司', bank: '台新', currency: 'TWD', originalAmount: 50_000, exchangeRate: 1, amount: 50_000, memo: '獎金' });
        const data = { incomes: { '2026-03': { totalAmount: 100_000, sources: [{ company: 'A', amount: 100_000 }] } } };
        const next = addIncomeToData(data, '2026-03-05', source);
        expect(next.incomes['2026-03'].totalAmount).toBe(150_000);
        expect(next.incomes['2026-03'].sources).toHaveLength(2);
        expect(addIncomeToData({}, '2026-04-01', source).incomes['2026-04']).toEqual({ totalAmount: 50_000, sources: [source] });
    });
});
