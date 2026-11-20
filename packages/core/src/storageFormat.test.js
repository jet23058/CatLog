import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, hashString, parseLegacyChunks, splitIntoChunks } from './index.js';

describe('雲端儲存格式', () => {
    it('依 CHUNK_SIZE 切塊，串回來與原字串相同', () => {
        const text = 'x'.repeat(CHUNK_SIZE * 2 + 5);
        const chunks = splitIntoChunks(text);
        expect(chunks.map((c) => c.length)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 5]);
        expect(chunks.join('')).toBe(text);
        expect(splitIntoChunks('')).toEqual(['']);
    });

    it('不會把 emoji 的 surrogate pair 切開', () => {
        const text = 'ab😀cd';
        // size 3 原本會切在 😀 的兩半之間
        const chunks = splitIntoChunks(text, 3);
        expect(chunks.join('')).toBe(text);
        chunks.forEach((chunk) => {
            expect(chunk).toBe(Buffer.from(chunk, 'utf8').toString('utf8')); // 每塊都能無損轉成 UTF-8
        });
    });

    it('hashString 是穩定的 cyrb53，iOS 也用同一份實作', () => {
        expect(hashString('abc')).toBe(hashString('abc'));
        expect(hashString('abc')).not.toBe(hashString('abd'));
        expect(hashString('{"records":{}}')).toBe(hashString('{"records":{}}'));
    });

    it('舊格式：尾端殘留資料塊會被裁掉', () => {
        expect(parseLegacyChunks(['{"a":', '1}', 'garbage'])).toEqual({ a: 1 });
    });
});
