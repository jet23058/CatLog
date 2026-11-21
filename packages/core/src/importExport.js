// 備份匯出 / 匯入與 MOZE 花費 CSV 匯入（web 與 iOS 共用）。
import { createBackupFile, extractBackupData } from './data.js';
import { getExpenseImportSummary, processExpenseCSVText } from './expenses.js';
import { getJsonImportSummary } from './diff.js';

// 備份檔名：meow-assets-backup-YYYYMMDD.json。today 為本地日期 YYYY-MM-DD
//（web 原本用 toISOString，台灣早上 8 點前會變成前一天）。
export const getBackupFileName = (today) => `meow-assets-backup-${String(today).replace(/-/g, '')}.json`;

// 完整備份的 JSON 文字（含格式名稱、版本與匯出時間）。
export const createBackupText = (data) => JSON.stringify(createBackupFile(data), null, 2);

// 解析備份檔：支援新版（含格式名稱）與舊版平面 JSON；缺少 records 時丟錯。
export const parseBackupText = (text) => {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('檔案不是有效的 JSON');
    }
    const backupData = extractBackupData(parsed);
    if (!backupData || !backupData.records) throw new Error('缺少 records 欄位，這不是極簡貓資產的備份檔');
    return backupData;
};

// MOZE 花費 CSV → 依月份分組的花費（同步版本；錯誤時丟錯）。
export const parseExpenseCSV = (text) => {
    let result = null;
    let error = null;
    processExpenseCSVText(text, (expensesByMonth) => { result = expensesByMonth; }, (message) => { error = message; });
    if (error) throw new Error(error);
    if (!result) throw new Error('CSV 沒有可匯入的花費');
    return result;
};

// 花費匯入：只覆蓋 CSV 裡出現的月份，其他月份保留（與 web 相同）。
export const mergeExpenseImport = (data = {}, expensesByMonth = {}) => ({
    ...data,
    expenses: { ...(data.expenses || {}), ...expensesByMonth }
});

const SECTION_LABELS = {
    records: '資產紀錄',
    incomes: '收入',
    expenses: '花費',
    memos: '備忘錄',
    debts: '負債',
    debtEvents: '負債異動',
    stockTransactions: '股票交易',
    stockHoldingSnapshots: '持倉快照'
};

// JSON 備份匯入前的摘要（iOS 預覽用）：每個區塊的筆數變化與新增 / 刪除 / 修改數。
export const summarizeBackupImport = (currentData = {}, backupData = {}) => {
    const summary = getJsonImportSummary(currentData, backupData);
    return {
        hasChanges: summary.hasChanges,
        sections: Object.entries(summary.sections).map(([key, section]) => ({
            key,
            label: SECTION_LABELS[key] || key,
            currentCount: section.currentCount,
            nextCount: section.nextCount,
            changed: section.changed,
            added: section.diff?.added?.length || 0,
            removed: section.diff?.removed?.length || 0,
            modified: section.diff?.modified?.length || 0
        }))
    };
};

// 花費 CSV 匯入前的摘要（iOS 預覽用）：涉及的月份、總筆數與每月新增 / 刪除 / 修改數。
export const summarizeExpenseImport = (currentExpenses = {}, expensesByMonth = {}) => {
    const summary = getExpenseImportSummary(currentExpenses, expensesByMonth);
    const changedMonths = summary.changedMonths.map((month) => ({
        month: month.month,
        added: month.diff?.added?.length || 0,
        removed: month.diff?.removed?.length || 0,
        modified: month.diff?.modified?.length || 0
    }));
    return {
        months: summary.months,
        totalRecords: summary.totalRecords,
        changedMonths,
        hasChanges: changedMonths.some((m) => m.added || m.removed || m.modified)
    };
};
