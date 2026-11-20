import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    runTransaction,
    setDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { buildMetaVersionFields } from '@catlog/core';

// Firestore 單一文件上限 1MB；中文字在 UTF-8 最多 3 bytes，因此每塊保留在 250k 字元。
export const CHUNK_SIZE = 250000;
const MAX_BATCH_DELETES = 400;

/**
 * 雲端儲存格式（v3）
 *
 * users/{uid}/meta/storage           指標文件：revision、generation、chunkCount、checksum、length、
 *                                     schemaVersion、minClientVersion（相容性，見 docs/DATA_FORMAT.md）
 * users/{uid}/chunks/{generation}_{i} 資料塊：{ index, content, generation }
 *
 * 寫入流程：先寫完新 generation 的所有資料塊，再用 transaction 檢查 revision 並切換指標。
 * 寫到一半中斷時指標仍指向舊 generation，所以雲端資料永遠是完整的一份。
 * 舊格式（沒有 meta、資料塊沒有 generation）仍可讀取，第一次儲存時會自動遷移。
 */

export class CloudConflictError extends Error {
    constructor(remoteRevision, expectedRevision) {
        super(`雲端資料已被其他裝置更新（雲端版本 ${remoteRevision}，本機版本 ${expectedRevision}）`);
        this.name = 'CloudConflictError';
        this.remoteRevision = remoteRevision;
        this.expectedRevision = expectedRevision;
    }
}

export class CloudIntegrityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CloudIntegrityError';
    }
}

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

export const splitIntoChunks = (str, size = CHUNK_SIZE) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
    if (chunks.length === 0) chunks.push('');
    return chunks;
};

export const createGenerationId = () =>
    `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const metaRefFor = (db, uid) => doc(db, 'users', uid, 'meta', 'storage');
const chunksRefFor = (db, uid) => collection(db, 'users', uid, 'chunks');

const snapshotExists = (snapshot) => {
    if (!snapshot) return false;
    if (typeof snapshot.exists === 'function') return snapshot.exists();
    return Boolean(snapshot.exists);
};

export const readMeta = async (db, uid) => {
    const snapshot = await getDoc(metaRefFor(db, uid));
    return snapshotExists(snapshot) ? snapshot.data() : null;
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

const docsOf = (snapshot) => (snapshot?.docs || []);

/**
 * 讀取雲端資料。
 * 回傳 { data, revision, chunkIds, meta }；雲端沒有資料時 data 為 null。
 * chunkIds 是目前這份資料使用的文件 ID，下次儲存成功後會被清除。
 */
export const readCloudData = async (db, uid) => {
    const meta = await readMeta(db, uid);
    const chunksRef = chunksRefFor(db, uid);

    if (meta?.generation) {
        const snapshot = await getDocs(query(chunksRef, where('generation', '==', meta.generation)));
        const docs = docsOf(snapshot)
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

        if (docs.length !== meta.chunkCount) {
            throw new CloudIntegrityError(`雲端資料塊數量不符（預期 ${meta.chunkCount}，實際 ${docs.length}）`);
        }
        const jsonString = docs.map((d) => d.content || '').join('');
        if (jsonString.length !== meta.length || hashString(jsonString) !== meta.checksum) {
            throw new CloudIntegrityError('雲端資料 checksum 驗證失敗，資料可能不完整');
        }
        return {
            data: JSON.parse(jsonString),
            revision: meta.revision || 0,
            chunkIds: docs.map((d) => d.id),
            meta
        };
    }

    const snapshot = await getDocs(query(chunksRef, orderBy('index')));
    // 舊格式資料塊沒有 generation 欄位；有 generation 但沒有指標的是中斷寫入留下的孤兒資料塊。
    const legacyDocs = docsOf(snapshot).filter((d) => !d.data()?.generation);
    if (legacyDocs.length === 0) {
        return { data: null, revision: meta?.revision || 0, chunkIds: [], meta };
    }
    return {
        data: parseLegacyChunks(legacyDocs.map((d) => d.data().content || '')),
        revision: meta?.revision || 0,
        chunkIds: legacyDocs.map((d) => d.id).filter(Boolean),
        meta
    };
};

const deleteDocIds = async (db, uid, ids) => {
    const validIds = (ids || []).filter(Boolean);
    const chunksRef = chunksRefFor(db, uid);
    for (let i = 0; i < validIds.length; i += MAX_BATCH_DELETES) {
        const batch = writeBatch(db);
        validIds.slice(i, i + MAX_BATCH_DELETES).forEach((id) => batch.delete(doc(chunksRef, id)));
        await batch.commit();
    }
};

/**
 * 寫入雲端資料。
 * expectedRevision：本機最後一次讀到或寫入的版本；雲端版本不同時丟出 CloudConflictError。
 * force：略過版本檢查（用於使用者明確選擇「以本機覆蓋」或從備份修復）。
 * previousChunkIds：舊資料塊 ID，切換指標成功後刪除。
 */
export const writeCloudData = async (db, uid, data, {
    expectedRevision = 0,
    force = false,
    previousChunkIds = [],
    deviceId = '',
    onProgress
} = {}) => {
    const jsonString = JSON.stringify(data);
    const chunks = splitIntoChunks(jsonString);
    const checksum = hashString(jsonString);
    const generation = createGenerationId();
    const metaRef = metaRefFor(db, uid);
    const chunksRef = chunksRefFor(db, uid);

    if (!force) {
        const meta = await readMeta(db, uid);
        const remoteRevision = meta?.revision || 0;
        if (remoteRevision !== expectedRevision) {
            throw new CloudConflictError(remoteRevision, expectedRevision);
        }
    }

    const newChunkIds = chunks.map((_, i) => `${generation}_${i}`);
    for (let i = 0; i < chunks.length; i++) {
        await setDoc(doc(chunksRef, newChunkIds[i]), { index: i, content: chunks[i], generation });
        onProgress?.(Math.round(((i + 1) / chunks.length) * 100));
    }

    let revision;
    try {
        revision = await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(metaRef);
            const meta = snapshotExists(snapshot) ? snapshot.data() : null;
            const remoteRevision = meta?.revision || 0;
            if (!force && remoteRevision !== expectedRevision) {
                throw new CloudConflictError(remoteRevision, expectedRevision);
            }
            const nextRevision = remoteRevision + 1;
            transaction.set(metaRef, {
                schema: 3,
                revision: nextRevision,
                generation,
                chunkCount: chunks.length,
                checksum,
                length: jsonString.length,
                updatedAt: Date.now(),
                deviceId,
                ...buildMetaVersionFields(meta)
            });
            return nextRevision;
        });
    } catch (error) {
        // 指標沒有切換，新寫入的資料塊不會被讀到；盡量清除避免累積。
        await deleteDocIds(db, uid, newChunkIds).catch(() => {});
        throw error;
    }

    const staleIds = previousChunkIds.filter((id) => !newChunkIds.includes(id));
    await deleteDocIds(db, uid, staleIds).catch((error) => {
        console.warn('Failed to clean up old chunks', error);
    });

    return { revision: revision ?? expectedRevision + 1, chunkIds: newChunkIds };
};

export const getMetaRef = metaRefFor;
