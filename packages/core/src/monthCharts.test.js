import { describe, expect, it } from 'vitest';
import { getAssetAllocation, getRecentMonthTrend } from './index.js';

describe('月份明細圖表資料', () => {
    it('getRecentMonthTrend：跨年取最近 6 個月，沒紀錄的月份淨資產為 null', () => {
        const data = {
            records: {
                '2025-11-30': [{ name: '銀行', amount: 1000 }],
                '2026-01-31': [{ name: '銀行', amount: 1500 }]
            },
            incomes: { '2026-01': { totalAmount: 300, items: [] } },
            expenses: { '2025-12': [{ date: '2025/12/05', amount: 80 }] },
            debts: {}
        };
        const rows = getRecentMonthTrend(data, '2026-01', 6);
        expect(rows.map((r) => r.monthKey)).toEqual(['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01']);
        expect(rows.map((r) => r.assets)).toEqual([null, null, null, 1000, null, 1500]);
        expect(rows[5].income).toBe(300);
        expect(rows[4].cost).toBe(80);
    });

    it('getAssetAllocation：前 4 名各一份，其餘併成「其他」，比例加總為 1', () => {
        const assets = [
            { name: 'A', amount: 500 }, { name: 'B', amount: 300 }, { name: 'C', amount: 100 },
            { name: 'D', amount: 50 }, { name: 'E', amount: 30 }, { name: 'F', amount: 20 },
            { name: 'A', amount: 100 }, { name: '負數', amount: -10 }
        ];
        const { total, slices } = getAssetAllocation(assets, 4);
        expect(total).toBe(1100);
        expect(slices.map((s) => s.name)).toEqual(['A', 'B', 'C', 'D', '其他']);
        expect(slices[0].amount).toBe(600);
        expect(slices[4]).toMatchObject({ amount: 50, isOther: true });
        expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
    });

    it('getAssetAllocation：沒有資產時回傳空', () => {
        expect(getAssetAllocation([], 4)).toEqual({ total: 0, slices: [] });
    });
});
