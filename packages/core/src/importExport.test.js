import { describe, expect, it } from 'vitest';
import {
    normalizeAppData,
    createBackupText,
    getBackupFileName,
    mergeExpenseImport,
    parseBackupText,
    parseExpenseCSV,
    summarizeBackupImport,
    summarizeExpenseImport,
} from './index.js';

const data = {
    records: { '2026-01-31': [{ name: '銀行', type: 'fixed', amount: 100 }] },
    expenses: { '2026-01': [{ date: '2026/01/02', amount: 50, category: '飲食', account: '現金', name: '午餐' }], '2025-12': [{ date: '2025/12/01', amount: 1 }] },
};

describe('備份', () => {
    it('檔名用本地日期', () => {
        expect(getBackupFileName('2026-11-21')).toBe('meow-assets-backup-20261121.json');
    });

    it('匯出後可以再匯入（新版格式），舊版平面 JSON 也可以', () => {
        const text = createBackupText(data);
        expect(JSON.parse(text).format).toBe('meow-assets-backup');
        expect(parseBackupText(text).records).toEqual(data.records);
        expect(parseBackupText(JSON.stringify(data)).records).toEqual(data.records);
    });

    it('格式錯誤時給清楚的訊息', () => {
        expect(() => parseBackupText('{not json')).toThrow('不是有效的 JSON');
        expect(() => parseBackupText('{"foo":1}')).toThrow('缺少 records 欄位');
    });

    it('匯入摘要列出每個區塊的變化', () => {
        const next = { ...data, records: { ...data.records, '2026-02-28': [{ name: '銀行', type: 'fixed', amount: 120 }] } };
        const summary = summarizeBackupImport(data, next);
        expect(summary.hasChanges).toBe(true);
        expect(summary.sections.find((s) => s.key === 'records')).toMatchObject({ label: '資產紀錄', currentCount: 1, nextCount: 2, added: 1 });
        expect(summary.sections.find((s) => s.key === 'expenses')).toMatchObject({ changed: false });
    });
});

describe('MOZE 花費 CSV', () => {
    const csv = '日期,帳戶,名稱,金額,主類別,子類別,類型,幣種\n2026/01/05,現金,晚餐,-200,飲食,晚餐,支出,TWD\n2026/02/03,信用卡,車票,-100,交通,,支出,TWD';

    it('依月份分組，只覆蓋 CSV 裡的月份', () => {
        const byMonth = parseExpenseCSV(csv);
        expect(Object.keys(byMonth).sort()).toEqual(['2026-01', '2026-02']);
        const merged = mergeExpenseImport(data, byMonth);
        expect(merged.expenses['2025-12']).toEqual(data.expenses['2025-12']);
        expect(merged.expenses['2026-01']).toEqual(byMonth['2026-01']);
    });

    it('格式錯誤時丟出原本的錯誤訊息', () => {
        expect(() => parseExpenseCSV('')).toThrow('CSV 檔案是空的');
        expect(() => parseExpenseCSV('a,b\n1,2')).toThrow('找不到日期或金額欄位');
    });

    it('匯入摘要列出每月的新增 / 刪除', () => {
        const summary = summarizeExpenseImport(data.expenses, parseExpenseCSV(csv));
        expect(summary.months).toEqual(['2026-01', '2026-02']);
        expect(summary.hasChanges).toBe(true);
        expect(summary.changedMonths.find((m) => m.month === '2026-01')).toMatchObject({ removed: 1 });
    });
});

describe('備份完整性', () => {
    // 一份涵蓋所有區塊、舊資料寫法與 App 不認得的欄位的資料；匯出再匯入後必須完全相同。
    const fullData = {
        schemaVersion: 1,
        records: { '2026-10-31': [{ id: 1, name: '台新 🐱', type: 'fixed', amount: '1234.5', currency: 'USD', originalAmount: 38, exchangeRate: 32.486, bank: '台新銀行' }] },
        memos: { '2026-10-31': '換行\n與 "引號"' },
        incomes: { '2026-10': { sources: [{ company: 'A', amount: 100000, currency: 'TWD', memo: '' }] } },
        expenses: { '2026-10': [{ id: 'e1', date: '2026/10/20', account: '信用卡', name: '晚餐', category: '飲食', amount: 200.75 }] },
        debts: { '2026-10-31': [{ id: 'd1', category: 'stock_pledge', name: '股票質押', amount: 500000, pledgeStocks: [{ symbol: '2330', shares: 1000, rate: 2.5 }] }] },
        debtEvents: { '2026-10': [{ id: 1730000000000, type: 'rate_change', targetDebtKey: 'id:d1', pledgeStocks: [{ symbol: '2330', rate: 2.8 }] }] },
        stockTransactions: [{ id: 's1', market: 'US', type: 'buy', symbol: 'TSM', shares: 5.1051, price: 195.8825, amount: -1000, date: '2025-06-03' }],
        stockHoldingSnapshots: { '2026-10': [{ id: 'h', version: 2, importedAt: '2026-10-31T10:00:00.000Z', note: '', holdings: [{ id: 'x', name: '台積電', shares: 100, marketPrice: 1050, marketValue: 105000 }] }] },
        fireSettings: { withdrawalRate: 3.5, futureSetting: true },
        // 未來版本才有的區塊：舊 App 不認得，也必須原樣保留。
        budgets: { '2026-11': { food: 8000 } },
    };

    it('匯出 → 匯入後每個欄位都一模一樣', () => {
        const restored = normalizeAppData(parseBackupText(createBackupText(fullData)));
        expect(restored).toEqual(normalizeAppData(fullData));
        expect(restored).toEqual(fullData); // 已是最新格式的資料不會被改動
        expect(restored.budgets).toEqual({ '2026-11': { food: 8000 } });
        expect(restored.records['2026-10-31'][0].amount).toBe('1234.5'); // 舊資料的文字金額不被轉型
    });

    it('匯出檔包含格式識別、版本與匯出時間', () => {
        const file = JSON.parse(createBackupText(fullData));
        expect(file).toMatchObject({ format: 'meow-assets-backup', version: 2, data: fullData });
        expect(Number.isNaN(Date.parse(file.exportedAt))).toBe(false);
    });

    it('舊版平面備份（沒有封裝）也能還原', () => {
        const { schemaVersion, ...legacy } = fullData;
        const restored = normalizeAppData(parseBackupText(JSON.stringify(legacy)));
        expect(restored).toEqual({ ...legacy, schemaVersion: 1 });
    });
});
