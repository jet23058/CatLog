import { describe, expect, it } from 'vitest';
import { assembleHistoryVersion, createHistoryEntry, hashString, selectHistoryToPrune, sortHistoryEntries } from './index.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 10, 21, 21, 0).getTime();
const entry = (generation, savedAt, revision = 1) => ({ generation, savedAt, revision, chunkCount: 1, checksum: '', length: 0, deviceId: '', schemaVersion: 1 });

describe('雲端歷史版本', () => {
    it('由指標文件建立紀錄；舊格式沒有 generation 時為 null', () => {
        expect(createHistoryEntry({ generation: 'g1', revision: 3, chunkCount: 2, checksum: 'c', length: 10, updatedAt: 5, deviceId: 'ios-1', schemaVersion: 1, minClientVersion: '3.0.0' }))
            .toEqual({ generation: 'g1', revision: 3, chunkCount: 2, checksum: 'c', length: 10, savedAt: 5, deviceId: 'ios-1', schemaVersion: 1 });
        expect(createHistoryEntry({ revision: 1 })).toBeNull();
        expect(createHistoryEntry(null)).toBeNull();
    });

    it('排序並略過格式不對的資料', () => {
        expect(sortHistoryEntries([entry('a', 1), { content: 'chunk' }, entry('b', 2)]).map((e) => e.generation)).toEqual(['b', 'a']);
    });

    it('最近 20 份全部保留，更早的 30 天內每天留最後一份，目前版本永遠保留', () => {
        // 今天存了 25 次（每 10 分鐘），前 40 天每天各存 2 次
        const today = Array.from({ length: 25 }, (_, i) => entry(`t${i}`, NOW - i * 10 * 60 * 1000));
        const past = Array.from({ length: 40 }, (_, d) => [
            entry(`d${d + 1}-late`, NOW - (d + 1) * DAY + HOUR),
            entry(`d${d + 1}-early`, NOW - (d + 1) * DAY - 5 * HOUR),
        ]).flat();
        const prune = selectHistoryToPrune([...today, ...past], { now: NOW, currentGeneration: 't0' });
        const kept = [...today, ...past].map((e) => e.generation).filter((g) => !prune.includes(g));

        expect(kept.filter((g) => g.startsWith('t'))).toHaveLength(20); // 今天：最近 20 份（今天已有保留，不再多留）
        expect(kept).toContain('d1-late');
        expect(kept).not.toContain('d1-early'); // 同一天只留最後一份
        expect(kept).toContain('d29-late');
        expect(kept).not.toContain('d35-late'); // 超過 30 天
        expect(prune).not.toContain('t0');
        expect(selectHistoryToPrune([entry('old', NOW - 100 * DAY)], { now: NOW, currentGeneration: 'old' })).toEqual([]);
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
