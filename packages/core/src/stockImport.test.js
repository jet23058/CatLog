import { describe, expect, it } from 'vitest';
import {
    addHoldingSnapshotToData,
    addStockTransactionsToData,
    buildHoldingSnapshotPreview,
    clearStockTransactionsFromData,
    deleteHoldingSnapshotFromData,
    getLatestHoldingSnapshotForMarket,
    getPreviousHoldingRows,
    parseStockImport,
    summarizeStockImport,
} from './index.js';

describe('股票交易匯入', () => {
    it('台股貼上內容：解析、摘要與 append', () => {
        const text = '\t2026/04/01\t台積電\t89,576\t\t479,138\n\t2026/04/09\t現金股息-台積電\t\t2,251\t275,126';
        const result = parseStockImport(text);
        const summary = summarizeStockImport(result);
        expect(summary).toMatchObject({ market: 'TW', total: 2, isArchived: false });
        expect(summary.counts).toMatchObject({ buy: 1, dividend: 1, sell: 0 });

        const data = { stockTransactions: [{ id: 'old', market: 'TW' }] };
        const next = addStockTransactionsToData(data, result.transactions);
        expect(next.stockTransactions).toHaveLength(3);
        expect(data.stockTransactions).toHaveLength(1);
    });

    it('沒有交易或封存格式時給明確錯誤', () => {
        expect(() => parseStockImport('日期,項目\n')).toThrow('沒有找到可匯入的股票交易。');
        expect(() => parseStockImport('')).toThrow();
    });

    it('清空只影響指定市場', () => {
        const data = { stockTransactions: [{ id: 1 }, { id: 2, market: 'US' }, { id: 3, market: 'TW' }], records: { a: 1 } };
        expect(clearStockTransactionsFromData(data, 'TW').stockTransactions.map((t) => t.id)).toEqual([2]);
        expect(clearStockTransactionsFromData(data, 'US').stockTransactions.map((t) => t.id)).toEqual([1, 3]);
        expect(clearStockTransactionsFromData(data, 'US').records).toEqual({ a: 1 });
    });
});

describe('持倉快照', () => {
    const snapshots = {
        '2026-09': [{ id: 's1', version: 1, importedAt: '2026-09-30T10:00:00Z', holdings: [{ market: 'TW', name: '台積電', marketPrice: 1000, shares: 100 }] }],
        '2026-10': [
            { id: 's2', version: 1, importedAt: '2026-10-31T10:00:00Z', holdings: [{ market: 'US', name: 'AAPL', marketPrice: 230.5, shares: 3 }] },
        ],
    };

    it('帶入上次同市場持倉', () => {
        expect(getLatestHoldingSnapshotForMarket(snapshots, 'TW').id).toBe('s1');
        expect(getPreviousHoldingRows(snapshots, 'US')).toEqual([{ market: 'US', name: 'AAPL', price: '230.5', shares: '3' }]);
        expect(getPreviousHoldingRows({}, 'TW')).toEqual([]);
    });

    it('手動輸入列：略過不完整的列，全部無效時丟錯', () => {
        const preview = buildHoldingSnapshotPreview({
            month: '2026-11', note: ' 月底 ', idPrefix: 'h',
            rows: [{ market: 'TW', name: '台積電', price: '1,050', shares: '100' }, { name: '缺價', price: '', shares: '1' }, { name: '', price: '', shares: '' }],
        });
        expect(preview.note).toBe('月底');
        expect(preview.holdings).toEqual([expect.objectContaining({ id: 'h-0', name: '台積電', marketPrice: 1050, shares: 100, marketValue: 105000, month: '2026-11' })]);
        expect(preview.skippedRows).toEqual([{ row: 2, item: '缺價', reason: '請確認股票名稱、現價與股數都有填寫' }]);
        expect(() => buildHoldingSnapshotPreview({ month: '2026-11', rows: [{ name: '' }] })).toThrow('請至少輸入一筆持倉資料。');
        expect(() => buildHoldingSnapshotPreview({ month: '2026-11', rows: [{ name: 'x', price: '0', shares: '1' }] })).toThrow('沒有找到可匯入的持倉快照');
    });

    it('新增版本號遞增，刪除最後一個版本時移除月份', () => {
        const data = { stockHoldingSnapshots: snapshots };
        const preview = { month: '2026-10', note: '', holdings: [] };
        const next = addHoldingSnapshotToData(data, preview, { nowISO: '2026-11-01T00:00:00.000Z', nowMs: 42 });
        expect(next.stockHoldingSnapshots['2026-10'].map((s) => s.version)).toEqual([1, 2]);
        expect(next.stockHoldingSnapshots['2026-10'][1]).toMatchObject({ id: 'holding-snapshot-2026-10-v2-42', importedAt: '2026-11-01T00:00:00.000Z' });

        const removed = deleteHoldingSnapshotFromData(next, '2026-09', 's1');
        expect(removed.stockHoldingSnapshots['2026-09']).toBeUndefined();
        expect(deleteHoldingSnapshotFromData(next, '2026-10', 's2').stockHoldingSnapshots['2026-10']).toHaveLength(1);
    });
});
