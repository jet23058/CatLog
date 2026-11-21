// 個股績效的資料寫入：匯入交易、清空市場交易、新增 / 刪除持倉快照版本。
// 從 App.jsx 的 StockAnalysisView 與相關 handler 搬出，web 與 iOS 共用；時間與 id 由呼叫端傳入。
import { parseAmount } from './csv.js';
import { processStockCSVText } from './stocks.js';
import { getHoldingSnapshots } from './stockAnalysis.js';

const marketOf = (item) => item?.market || 'TW';
const TRADE_TYPES = ['buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal', 'fee'];

/** 解析股票交易檔案或貼上的內容。沒有任何交易時丟出錯誤（與 web 相同）。 */
export const parseStockImport = (text, options = {}) => {
    const result = processStockCSVText(text, options);
    if (result.transactions.length === 0) throw new Error('沒有找到可匯入的股票交易。');
    return result;
};

/** 匯入預覽的摘要：各類型筆數、略過的列、是否為封存 v1 格式。 */
export const summarizeStockImport = (result = {}) => {
    const transactions = result.transactions || [];
    const counts = Object.fromEntries(TRADE_TYPES.map((type) => [type, transactions.filter((trade) => trade.type === type).length]));
    return {
        market: result.market || 'TW',
        total: transactions.length,
        counts,
        isArchived: Boolean(result.isArchived),
        skippedRows: (result.skippedRows || []).map((row) => ({
            row: row.row,
            item: [row.type, row.item].filter(Boolean).join(' / '),
            reason: row.reason || '',
        })),
    };
};

/** 交易匯入一律 append，不覆蓋既有資料。 */
export const addStockTransactionsToData = (data, transactions = []) => ({
    ...data,
    stockTransactions: [...(data.stockTransactions || []), ...transactions],
});

/** 只清空指定市場的交易，其他市場與資料不動。 */
export const clearStockTransactionsFromData = (data, market = 'TW') => ({
    ...data,
    stockTransactions: (data.stockTransactions || []).filter((trade) => marketOf(trade) !== (market || 'TW')),
});

/** 指定市場最近一次的持倉快照（依匯入時間，再依版本）。 */
export const getLatestHoldingSnapshotForMarket = (stockHoldingSnapshots = {}, market = 'TW') => (
    getHoldingSnapshots(stockHoldingSnapshots)
        .filter((snapshot) => snapshot.holdings.some((holding) => marketOf(holding) === market))
        .sort((a, b) => {
            const timeA = new Date(a.importedAt || `${a.month}-01`).getTime() || 0;
            const timeB = new Date(b.importedAt || `${b.month}-01`).getTime() || 0;
            if (timeB !== timeA) return timeB - timeA;
            return (Number(b.version) || 0) - (Number(a.version) || 0);
        })[0] || null
);

/** 「帶入上次持倉」：上次同市場快照轉成可編輯的輸入列（文字）。 */
export const getPreviousHoldingRows = (stockHoldingSnapshots = {}, market = 'TW') => {
    const snapshot = getLatestHoldingSnapshotForMarket(stockHoldingSnapshots, market);
    if (!snapshot) return [];
    return snapshot.holdings
        .filter((holding) => marketOf(holding) === market)
        .map((holding) => ({
            market,
            name: holding.name || holding.symbol || '',
            price: holding.marketPrice ? String(holding.marketPrice) : '',
            shares: holding.shares ? String(holding.shares) : '',
        }));
};

/**
 * 手動輸入的持倉列 → 快照預覽。rows: [{ market, name, price, shares }]（文字或數字）。
 * 名稱、現價、股數有缺的列會略過；全部無效時丟出錯誤。idPrefix 讓 id 不重複。
 */
export const buildHoldingSnapshotPreview = ({ month, note = '', rows = [], idPrefix = 'holding' }) => {
    const activeRows = rows.filter((row) => String(row.name || '').trim() || row.price || row.shares);
    if (activeRows.length === 0) throw new Error('請至少輸入一筆持倉資料。');

    const skippedRows = [];
    const holdings = activeRows.flatMap((row, index) => {
        const name = String(row.name || '').trim();
        const marketPrice = parseAmount(row.price);
        const shares = parseAmount(row.shares);
        if (!name || marketPrice <= 0 || shares <= 0) {
            skippedRows.push({ row: index + 1, item: name || '空白', reason: '請確認股票名稱、現價與股數都有填寫' });
            return [];
        }
        return [{
            id: `${idPrefix}-${index}`,
            month,
            market: row.market || 'TW',
            symbol: '',
            name,
            shares,
            averageCost: 0,
            costAmount: 0,
            marketPrice,
            marketValue: marketPrice * shares,
            account: '',
        }];
    });

    if (holdings.length === 0) throw new Error('沒有找到可匯入的持倉快照。請確認至少一列資料完整。');
    return { month, note: String(note).trim(), holdings, skippedRows };
};

/** 新增一個持倉快照版本（版本號 = 該月最大版本 + 1）。nowISO / nowMs 由呼叫端傳入。 */
export const addHoldingSnapshotToData = (data, preview, { nowISO, nowMs }) => {
    const { month } = preview;
    const existingVersions = data.stockHoldingSnapshots?.[month] || [];
    const nextVersion = existingVersions.reduce((max, item) => Math.max(max, Number(item.version) || 0), 0) + 1;
    const snapshot = {
        id: `holding-snapshot-${month}-v${nextVersion}-${nowMs}`,
        version: nextVersion,
        importedAt: nowISO,
        note: preview.note || '',
        holdings: preview.holdings,
    };
    return {
        ...data,
        stockHoldingSnapshots: { ...(data.stockHoldingSnapshots || {}), [month]: [...existingVersions, snapshot] },
    };
};

/** 刪除一個持倉快照版本；該月沒有版本時移除整個月份。 */
export const deleteHoldingSnapshotFromData = (data, month, snapshotId) => {
    const remaining = (data.stockHoldingSnapshots?.[month] || []).filter((snapshot) => snapshot.id !== snapshotId);
    const nextSnapshots = { ...(data.stockHoldingSnapshots || {}) };
    if (remaining.length > 0) nextSnapshots[month] = remaining;
    else delete nextSnapshots[month];
    return { ...data, stockHoldingSnapshots: nextSnapshots };
};
