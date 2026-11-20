import { migrateData } from './schema.js';

// --- 全域匯率設定 (僅供花費匯入與參考使用) ---
export const DEFAULT_EXCHANGE_RATES = {
    'TWD': 1,
    'USD': 32.5,
    'JPY': 0.21,
    'EUR': 35.2,
    'CNY': 4.5,
    'USDT': 32.5
};

// 預設模擬數據
export const INITIAL_DATA = {
    "records": {},
    "memos": {},
    "incomes": {},
    "expenses": {},
    "debts": {},
    "debtEvents": {},
    "stockTransactions": [],
    "stockHoldingSnapshots": {},
    "fireSettings": { "withdrawalRate": 4.0 }
};

// 補齊預設欄位並升級到目前的 schemaVersion；不認得的欄位一律保留（見 docs/DATA_FORMAT.md）。
export const normalizeAppData = (input = {}) => {
    const source = migrateData(input);
    return {
        ...INITIAL_DATA,
        ...source,
        debts: source.debts || {},
        debtEvents: source.debtEvents || {},
        stockTransactions: source.stockTransactions || [],
        stockHoldingSnapshots: source.stockHoldingSnapshots || {}
    };
};

export const BACKUP_FORMAT = 'meow-assets-backup';
export const BACKUP_VERSION = 2;
export const createBackupFile = (data) => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: normalizeAppData(data)
});
export const extractBackupData = (source = {}) => {
    if (source?.format === BACKUP_FORMAT) {
        if (!source.data || typeof source.data !== 'object') throw new Error('備份檔缺少 data 欄位');
        return source.data;
    }
    return source;
};
