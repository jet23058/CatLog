import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as core from './index.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const sourceFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));

// core 會在 iOS 的 JavaScriptCore 裡執行：那裡沒有 DOM、React、Firebase，也沒有 fetch / localStorage。
describe('core 純度檢查', () => {
    const forbidden = [
        [/from ['"](react|react-dom|firebase|recharts|lucide-react)/, '不可 import UI 或 Firebase 套件'],
        [/\b(window|document|localStorage|sessionStorage|FileReader|navigator)\b/, '不可使用瀏覽器 API'],
        [/\bfetch\s*\(/, '不可直接發網路請求'],
        [/import\.meta\.env/, '不可讀取 Vite 環境變數'],
    ];

    for (const file of sourceFiles) {
        it(`${file} 不依賴平台 API`, () => {
            const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
            for (const [pattern, reason] of forbidden) {
                expect(pattern.test(text), `${file}: ${reason}`).toBe(false);
            }
        });
    }
});

describe('資料格式', () => {
    it('normalizeAppData 補齊預設欄位，且保留不認得的欄位', () => {
        const data = core.normalizeAppData({ records: { '2026-01-31': [] }, futureField: { keep: true } });
        expect(data.stockTransactions).toEqual([]);
        expect(data.debts).toEqual({});
        expect(data.fireSettings).toEqual({ withdrawalRate: 4.0 });
        expect(data.futureField).toEqual({ keep: true });
    });
});

describe('CSV 解析', () => {
    it('parseCSV 處理引號內的逗號與全形逗號', () => {
        expect(core.parseCSV('名稱,金額\n"A,B",100\nC，200')).toEqual([
            ['名稱', '金額'],
            ['A,B', '100'],
            ['C', '200'],
        ]);
    });

    it('parseAmount 去除千分位與幣別符號', () => {
        expect(core.parseAmount('NT$1,234.5')).toBe(1234.5);
        expect(core.parseAmount('-2,000')).toBe(-2000);
        expect(core.parseAmount(undefined)).toBe(0);
    });

    it('normalizeDate 統一成 YYYY-MM-DD', () => {
        expect(core.normalizeDate('2026/1/5')).toBe('2026-01-05');
    });
});

describe('負債與質押利息', () => {
    it('股票質押依股數加權平均利率計算年息與月息', () => {
        const debt = {
            category: 'stock_pledge',
            amount: 1_200_000,
            pledgeStocks: [
                { symbol: '2330', shares: 1000, rate: 2.5 },
                { symbol: '0050', shares: 3000, rate: 3.0 },
            ],
        };
        expect(core.getPledgeAverageRate(debt)).toBeCloseTo(2.875);
        expect(core.getDebtEstimatedAnnualInterest(debt)).toBeCloseTo(34_500);
        expect(core.getDebtEstimatedMonthlyInterest(debt)).toBeCloseTo(2_875);
    });

    it('非股票質押不估算利息', () => {
        expect(core.getDebtEstimatedAnnualInterest({ category: 'mortgage', amount: 1000, pledgeStocks: [{ rate: 2 }] })).toBe(0);
    });
});
