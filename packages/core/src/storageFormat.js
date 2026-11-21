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

// ── 雲端歷史版本 ───────────────────────────────────────────────
// 每次存檔的資料塊不再立刻刪除，而是記一筆 users/{uid}/history/{generation}，之後可以預覽、匯出或還原。
// 保留規則（使用者 2026-11-21 決定）：
// - 自動：每天保留最後一份，保留 HISTORY_KEEP_DAYS 天；更早的每個月保留最後一份，保留 HISTORY_KEEP_MONTHS 個月。
// - 手動還原點（pinned）：一直保留，直到使用者取消。
// - 目前使用中的版本永遠保留。
// 其他版本連同資料塊一起刪除。

// 保留方式（使用者可在「雲端歷史版本」切換，存在資料的 historySettings.mode，跨裝置同步）：
// - auto：自動每天一份＋手動還原點（預設）
// - manual：只保留手動還原點（與目前版本）
export const HISTORY_MODES = [
    { value: 'auto', label: '自動每天一份＋手動還原點' },
    { value: 'manual', label: '只保留手動還原點' }
];
export const getHistoryMode = (data) => (data?.historySettings?.mode === 'manual' ? 'manual' : 'auto');
export const setHistoryMode = (data, mode) => {
    if (!HISTORY_MODES.some((item) => item.value === mode)) throw new Error('不支援的保留方式');
    return { ...data, historySettings: { ...(data?.historySettings || {}), mode } };
};

export const HISTORY_KEEP_DAYS = 30;
export const HISTORY_KEEP_MONTHS = 12;
export const RESTORE_POINT_LABEL_MAX = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 由指標文件（meta/storage）產生一筆歷史紀錄；沒有 generation（舊格式）時回傳 null。
 * 不含 pinned / label：寫入時用 merge，才不會把已經設成還原點的紀錄改回一般版本。
 */
export const createHistoryEntry = (meta) => {
    if (!meta?.generation) return null;
    return {
        generation: String(meta.generation),
        revision: Number(meta.revision) || 0,
        chunkCount: Number(meta.chunkCount) || 0,
        checksum: String(meta.checksum || ''),
        length: Number(meta.length) || 0,
        savedAt: Number(meta.updatedAt) || 0,
        deviceId: String(meta.deviceId || ''),
        schemaVersion: Number(meta.schemaVersion) || 0
    };
};

/** 歷史紀錄新到舊排序（同時間依 revision），並略過格式不對的資料。 */
export const sortHistoryEntries = (entries = []) => (entries || [])
    .filter((entry) => entry && typeof entry.generation === 'string' && entry.generation)
    .sort((a, b) => (b.savedAt - a.savedAt) || (b.revision - a.revision));

const localDayKey = (ms) => {
    const date = new Date(ms);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};
const localMonthIndex = (ms) => {
    const date = new Date(ms);
    return date.getFullYear() * 12 + date.getMonth();
};

/** 依保留規則回傳要刪除的 generation。 */
export const selectHistoryToPrune = (entries = [], {
    now,
    currentGeneration = '',
    mode = 'auto',
    keepDays = HISTORY_KEEP_DAYS,
    keepMonths = HISTORY_KEEP_MONTHS
} = {}) => {
    const keptDays = new Set();
    const keptMonths = new Set();
    const nowMonth = localMonthIndex(now);
    const prune = [];
    // 新到舊：每天 / 每月遇到的第一份就是那天 / 那個月最後一份。
    sortHistoryEntries(entries).forEach((entry) => {
        const day = localDayKey(entry.savedAt);
        const month = localMonthIndex(entry.savedAt);
        if (entry.generation === currentGeneration || entry.pinned === true) {
            keptDays.add(day);
            keptMonths.add(month);
            return;
        }
        if (mode === 'manual') {
            prune.push(entry.generation);
            return;
        }
        if (now - entry.savedAt <= keepDays * DAY_MS && !keptDays.has(day)) {
            keptDays.add(day);
            keptMonths.add(month);
            return;
        }
        if (nowMonth - month < keepMonths && !keptMonths.has(month)) {
            keptMonths.add(month);
            return;
        }
        prune.push(entry.generation);
    });
    return prune;
};

/** 還原點的說明：去掉前後空白並限制長度。 */
export const normalizeRestorePointLabel = (label = '') => String(label || '').trim().slice(0, RESTORE_POINT_LABEL_MAX);

/** 把某個歷史版本的資料塊組回 JSON 並驗證；不完整時丟錯。 */
export const assembleHistoryVersion = (entry, chunks = []) => {
    const sorted = [...chunks].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    if (sorted.length !== entry.chunkCount) {
        throw new Error(`這個版本的資料塊不完整（預期 ${entry.chunkCount}，實際 ${sorted.length}）`);
    }
    const json = sorted.map((chunk) => chunk.content || '').join('');
    if (json.length !== entry.length || hashString(json) !== entry.checksum) {
        throw new Error('這個版本的 checksum 驗證失敗，無法還原');
    }
    return json;
};
