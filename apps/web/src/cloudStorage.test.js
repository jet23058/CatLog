import { beforeEach, describe, expect, test, vi } from 'vitest';

// Minimal in-memory Firestore covering the calls cloudStorage.js makes.
const store = vi.hoisted(() => ({ docs: new Map(), failTransaction: null }));

vi.mock('firebase/firestore', () => {
    const pathOf = (...segments) => segments.filter((s) => typeof s === 'string').join('/');
    const makeSnapshot = (path) => ({
        id: path.split('/').pop(),
        exists: () => store.docs.has(path),
        data: () => store.docs.get(path)
    });
    return {
        collection: (_db, ...segments) => ({ path: pathOf(...segments) }),
        doc: (parent, ...segments) => ({
            path: parent?.path ? pathOf(parent.path, ...segments) : pathOf(...segments)
        }),
        getDoc: async (ref) => makeSnapshot(ref.path),
        setDoc: async (ref, value) => { store.docs.set(ref.path, value); },
        where: (field, op, value) => ({ field, op, value }),
        orderBy: (field) => ({ orderBy: field }),
        query: (ref, ...constraints) => ({ path: ref.path, constraints }),
        getDocs: async (q) => {
            const prefix = `${q.path}/`;
            let docs = [...store.docs.keys()]
                .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
                .map(makeSnapshot);
            q.constraints.forEach((c) => {
                if (c.op === '==') docs = docs.filter((d) => d.data()[c.field] === c.value);
                if (c.orderBy) docs.sort((a, b) => a.data()[c.orderBy] - b.data()[c.orderBy]);
            });
            return { docs, empty: docs.length === 0 };
        },
        runTransaction: async (_db, fn) => {
            if (store.failTransaction) throw store.failTransaction;
            const writes = [];
            const result = await fn({
                get: async (ref) => makeSnapshot(ref.path),
                set: (ref, value) => writes.push([ref.path, value])
            });
            writes.forEach(([path, value]) => store.docs.set(path, value));
            return result;
        },
        writeBatch: () => {
            const deletes = [];
            const sets = [];
            return {
                set: (ref, value) => sets.push([ref.path, value]),
                delete: (ref) => deletes.push(ref.path),
                commit: async () => {
                    if (sets.length && store.failBatchSet) throw new Error('permission-denied');
                    sets.forEach(([path, value]) => store.docs.set(path, value));
                    deletes.forEach((path) => store.docs.delete(path));
                }
            };
        }
    };
});

import {
    CHUNK_SIZE,
    CloudConflictError,
    CloudIntegrityError,
    hashString,
    listHistory,
    readCloudData,
    readHistoryVersion,
    splitIntoChunks,
    writeCloudData
} from './cloudStorage';

const db = {};
const uid = 'user-1';
const chunkKeys = () => [...store.docs.keys()].filter((key) => key.startsWith(`users/${uid}/chunks/`));

describe('cloudStorage', () => {
    beforeEach(() => {
        store.docs.clear();
        store.failTransaction = null;
        store.failBatchSet = false;
    });

    test('splits large payloads and hashes deterministically', () => {
        const text = 'x'.repeat(CHUNK_SIZE * 2 + 5);
        expect(splitIntoChunks(text).map((c) => c.length)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 5]);
        expect(hashString('abc')).toBe(hashString('abc'));
        expect(hashString('abc')).not.toBe(hashString('abd'));
    });

    test('round-trips data and bumps revision', async () => {
        const first = await writeCloudData(db, uid, { records: { a: 1 } }, { expectedRevision: 0 });
        expect(first.revision).toBe(1);

        const loaded = await readCloudData(db, uid);
        expect(loaded).toMatchObject({ data: { records: { a: 1 } }, revision: 1 });

        const second = await writeCloudData(db, uid, { records: { a: 2 } }, {
            expectedRevision: 1,
            previousChunkIds: loaded.chunkIds
        });
        expect(second.revision).toBe(2);
        expect((await readCloudData(db, uid)).data).toEqual({ records: { a: 2 } });
        // 上一份保留成歷史版本：兩個 generation 的資料塊都在，各有一筆歷史紀錄。
        expect(chunkKeys()).toHaveLength(2);
        const history = await listHistory(db, uid);
        expect(history.map((e) => e.revision)).toEqual([2, 1]);
        expect(await readHistoryVersion(db, uid, history[1])).toEqual({ records: { a: 1 } });
    });

    test('falls back to deleting the previous chunks when history cannot be written', async () => {
        const first = await writeCloudData(db, uid, { v: 1 }, { expectedRevision: 0 });
        store.failBatchSet = true; // 模擬 Firestore 規則還沒允許 history
        await writeCloudData(db, uid, { v: 2 }, { expectedRevision: 1, previousChunkIds: first.chunkIds });
        store.failBatchSet = false;
        expect(chunkKeys()).toHaveLength(1);
        expect((await readCloudData(db, uid)).data).toEqual({ v: 2 });
    });

    test('prunes history beyond the retention rules but never the current version', async () => {
        const nowSpy = vi.spyOn(Date, 'now');
        let revision = 0;
        let chunkIds = [];
        // 同一天存 25 次：最近 20 份保留，其餘刪除（資料塊一起刪）。
        for (let i = 0; i < 25; i++) {
            nowSpy.mockReturnValue(1767225600000 + i * 60000);
            const result = await writeCloudData(db, uid, { records: { i } }, { expectedRevision: revision, previousChunkIds: chunkIds });
            revision = result.revision;
            chunkIds = result.chunkIds;
        }
        nowSpy.mockRestore();
        const history = await listHistory(db, uid);
        expect(history).toHaveLength(20);
        expect(history[0].revision).toBe(25);
        expect(chunkKeys()).toHaveLength(20);
        expect((await readCloudData(db, uid)).data).toEqual({ records: { i: 24 } });
    });

    test('rejects stale writes from another device', async () => {
        await writeCloudData(db, uid, { v: 'device-a' }, { expectedRevision: 0 });
        await expect(writeCloudData(db, uid, { v: 'device-b' }, { expectedRevision: 0 }))
            .rejects.toBeInstanceOf(CloudConflictError);
        expect((await readCloudData(db, uid)).data).toEqual({ v: 'device-a' });
    });

    test('force overwrites regardless of revision', async () => {
        await writeCloudData(db, uid, { v: 'a' }, { expectedRevision: 0 });
        const result = await writeCloudData(db, uid, { v: 'b' }, { expectedRevision: 0, force: true });
        expect(result.revision).toBe(2);
        expect((await readCloudData(db, uid)).data).toEqual({ v: 'b' });
    });

    test('an interrupted save leaves the previous version readable', async () => {
        await writeCloudData(db, uid, { v: 'stable' }, { expectedRevision: 0 });
        store.failTransaction = new Error('network lost');
        await expect(writeCloudData(db, uid, { v: 'partial' }, { expectedRevision: 1 })).rejects.toThrow('network lost');
        expect((await readCloudData(db, uid)).data).toEqual({ v: 'stable' });
    });

    test('detects tampered or missing chunks with the checksum', async () => {
        const { chunkIds } = await writeCloudData(db, uid, { v: 'ok' }, { expectedRevision: 0 });
        const key = `users/${uid}/chunks/${chunkIds[0]}`;
        store.docs.set(key, { ...store.docs.get(key), content: '{"v":"no"}' });
        await expect(readCloudData(db, uid)).rejects.toBeInstanceOf(CloudIntegrityError);
    });

    test('reads legacy chunks and migrates them on first save', async () => {
        const legacyJson = JSON.stringify({ records: { legacy: true } });
        store.docs.set(`users/${uid}/chunks/0`, { index: 0, content: legacyJson.slice(0, 10) });
        store.docs.set(`users/${uid}/chunks/1`, { index: 1, content: legacyJson.slice(10) });

        const legacy = await readCloudData(db, uid);
        expect(legacy).toMatchObject({ data: { records: { legacy: true } }, revision: 0, chunkIds: ['0', '1'] });

        await writeCloudData(db, uid, legacy.data, { expectedRevision: 0, previousChunkIds: legacy.chunkIds });
        expect(store.docs.has(`users/${uid}/chunks/0`)).toBe(false);
        expect((await readCloudData(db, uid)).data).toEqual({ records: { legacy: true } });
    });

    test('returns empty state when nothing is stored', async () => {
        expect(await readCloudData(db, uid)).toEqual({ data: null, revision: 0, chunkIds: [], meta: null });
    });

    test('writes schemaVersion and minClientVersion to meta and returns meta on read', async () => {
        await writeCloudData(db, uid, { v: 1 }, { expectedRevision: 0 });
        const { meta } = await readCloudData(db, uid);
        expect(meta).toMatchObject({ revision: 1, schemaVersion: 1, minClientVersion: '3.0.0' });
    });

    test('keeps a manually raised minClientVersion on later saves', async () => {
        await writeCloudData(db, uid, { v: 1 }, { expectedRevision: 0 });
        const metaKey = `users/${uid}/meta/storage`;
        store.docs.set(metaKey, { ...store.docs.get(metaKey), minClientVersion: '4.2.0' });
        await writeCloudData(db, uid, { v: 2 }, { expectedRevision: 1 });
        expect(store.docs.get(metaKey)).toMatchObject({ revision: 2, minClientVersion: '4.2.0' });
    });
});
