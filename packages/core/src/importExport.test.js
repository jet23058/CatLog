import { describe, expect, it } from 'vitest';
import {
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
