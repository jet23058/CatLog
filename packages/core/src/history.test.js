import { describe, expect, it } from 'vitest';
import { assembleHistoryVersion, createHistoryEntry, hashString, normalizeRestorePointLabel, selectHistoryToPrune, sortHistoryEntries } from './index.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 10, 21, 21, 0).getTime();
const entry = (generation, savedAt, extra = {}) => ({ generation, savedAt, revision: 1, chunkCount: 1, checksum: '', length: 0, deviceId: '', schemaVersion: 1, ...extra });
const kept = (entries, options) => {
    const prune = selectHistoryToPrune(entries, { now: NOW, ...options });
    return entries.map((e) => e.generation).filter((g) => !prune.includes(g));
};

describe('雲端歷史版本', () => {
    it('由指標文件建立紀錄（不含 pinned / label）；舊格式沒有 generation 時為 null', () => {
        expect(createHistoryEntry({ generation: 'g1', revision: 3, chunkCount: 2, checksum: 'c', length: 10, updatedAt: 5, deviceId: 'ios-1', schemaVersion: 1, minClientVersion: '3.0.0' }))
            .toEqual({ generation: 'g1', revision: 3, chunkCount: 2, checksum: 'c', length: 10, savedAt: 5, deviceId: 'ios-1', schemaVersion: 1 });
        expect(createHistoryEntry({ revision: 1 })).toBeNull();
        expect(createHistoryEntry(null)).toBeNull();
    });

    it('排序並略過格式不對的資料', () => {
        expect(sortHistoryEntries([entry('a', 1), { content: 'chunk' }, entry('b', 2)]).map((e) => e.generation)).toEqual(['b', 'a']);
    });

    it('同一天只留最後一份，目前版本永遠保留', () => {
        // 月底整理：今天存了 12 次
        const today = Array.from({ length: 12 }, (_, i) => entry(`t${i}`, NOW - i * 10 * 60 * 1000));
        expect(kept(today, { currentGeneration: 't0' })).toEqual(['t0']);
        // 目前版本不是當天最新時（例如剛還原），目前版本和當天最新都保留
        expect(kept(today, { currentGeneration: 't5' })).toEqual(['t0', 't5']);
    });

    it('30 天內每天一份，更早的每月一份保留 12 個月', () => {
        const daily = Array.from({ length: 400 }, (_, d) => [
            entry(`d${d}-late`, NOW - d * DAY - HOUR),
            entry(`d${d}-early`, NOW - d * DAY - 8 * HOUR),
        ]).flat();
        const result = kept(daily, { currentGeneration: 'd0-late' });
        expect(result).toContain('d29-late');
        expect(result).not.toContain('d29-early');
        expect(result.filter((g) => g.endsWith('-early'))).toEqual([]);
        // 30 天以前：每個月只剩一份，最多回到 12 個月內
        const older = result.filter((g) => Number(g.slice(1).split('-')[0]) > 30);
        const months = older.map((g) => { const d = new Date(NOW - Number(g.slice(1).split('-')[0]) * DAY - HOUR); return `${d.getFullYear()}-${d.getMonth()}`; });
        expect(new Set(months).size).toBe(months.length);
        expect(older.length).toBeLessThanOrEqual(12);
        expect(result).not.toContain('d399-late');
    });

    it('手動還原點不會被清掉', () => {
        const entries = [entry('now', NOW), entry('pin', NOW - HOUR, { pinned: true, label: '匯入前' }), entry('same-day', NOW - 2 * HOUR), entry('ancient', NOW - 900 * DAY, { pinned: true })];
        expect(kept(entries, { currentGeneration: 'now' })).toEqual(['now', 'pin', 'ancient']);
        expect(normalizeRestorePointLabel('  匯入 MOZE 前  ')).toBe('匯入 MOZE 前');
        expect(normalizeRestorePointLabel('x'.repeat(100))).toHaveLength(60);
    });

    it('組回某個版本並驗證 checksum', () => {
        const json = '{"records":{}}';
        const meta = { chunkCount: 2, length: json.length, checksum: hashString(json) };
        const chunks = [{ index: 1, content: json.slice(7) }, { index: 0, content: json.slice(0, 7) }];
        expect(assembleHistoryVersion(meta, chunks)).toBe(json);
        expect(() => assembleHistoryVersion(meta, chunks.slice(0, 1))).toThrow('資料塊不完整');
        expect(() => assembleHistoryVersion({ ...meta, checksum: 'x' }, chunks)).toThrow('checksum');
    });
});
