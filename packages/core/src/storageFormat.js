// 雲端儲存格式 v3 的純函式：切塊、checksum、舊格式解析。
// web（apps/web/src/cloudStorage.js）與 iOS（CatLogKit）都呼叫這裡，確保兩邊算出的 checksum 一致。
// 字串長度與切塊都以 JavaScript 的 UTF-16 code unit 計算。

// Firestore 單一文件上限 1MB；中文字在 UTF-8 最多 3 bytes，因此每塊保留在 250k 字元。
export const CHUNK_SIZE = 250000;

// cyrb53：快速、非加密用途的 53-bit 雜湊，用於偵測資料塊遺失或錯置。
export const hashString = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

// 依 size 切塊，但不把 emoji 等 surrogate pair 切成兩半：
// 單獨的半個字元無法存成 UTF-8，Firestore 會把它換成 U+FFFD，之後 checksum 就對不上。
export const splitIntoChunks = (str, size = CHUNK_SIZE) => {
    const chunks = [];
    let start = 0;
    while (start < str.length) {
        let end = Math.min(start + size, str.length);
        if (end < str.length && size > 1) {
            const lastCode = str.charCodeAt(end - 1);
            if (lastCode >= 0xD800 && lastCode <= 0xDBFF) end -= 1;
        }
        chunks.push(str.slice(start, end));
        start = end;
    }
    if (chunks.length === 0) chunks.push('');
    return chunks;
};

// 舊格式：所有資料塊依 index 串接；若有殘留的尾端資料塊，逐一裁掉直到可解析。
export const parseLegacyChunks = (chunks) => {
    const fullString = chunks.join('');
    try {
        return JSON.parse(fullString);
    } catch (error) {
        let currentString = fullString;
        for (let i = chunks.length - 1; i > 0; i--) {
            currentString = currentString.slice(0, -chunks[i].length);
            try {
                return JSON.parse(currentString);
            } catch {
                continue;
            }
        }
        throw error;
    }
};

// 雲端診斷：各區塊的日期 / 月份數與筆數（web 本機診斷與 iOS 共用）。
export const summarizeDataCounts = (data) => {
    const countItems = (obj = {}) => Object.values(obj || {}).reduce((sum, items) => sum + ((items || []).length || 0), 0);
    const countIncomeSources = (obj = {}) => Object.values(obj || {}).reduce((sum, item) => sum + ((item?.sources || []).length), 0);
    return {
        recordsDates: Object.keys(data?.records || {}).length,
        recordsItems: countItems(data?.records),
        debtDates: Object.keys(data?.debts || {}).length,
        debtItems: countItems(data?.debts),
        incomeMonths: Object.keys(data?.incomes || {}).length,
        incomeSources: countIncomeSources(data?.incomes),
        expenseMonths: Object.keys(data?.expenses || {}).length,
        expenseItems: countItems(data?.expenses),
        memoDates: Object.keys(data?.memos || {}).length,
        debtEventMonths: Object.keys(data?.debtEvents || {}).length,
        debtEventItems: countItems(data?.debtEvents),
        stockTransactions: (data?.stockTransactions || []).length,
        stockSnapshotMonths: Object.keys(data?.stockHoldingSnapshots || {}).length,
        stockSnapshotVersions: countItems(data?.stockHoldingSnapshots)
    };
};
