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
            return {
                delete: (ref) => deletes.push(ref.path),
                commit: async () => deletes.forEach((path) => store.docs.delete(path))
            };
        }
    };
});

import {
    CHUNK_SIZE,
    CloudConflictError,
    CloudIntegrityError,
    hashString,
    readCloudData,
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
        // Old generation chunks are cleaned up after the pointer switch.
        expect(chunkKeys()).toHaveLength(1);
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
        expect(await readCloudData(db, uid)).toEqual({ data: null, revision: 0, chunkIds: [] });
    });
});
