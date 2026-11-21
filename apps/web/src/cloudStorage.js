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
import {
    CHUNK_SIZE,
    assembleHistoryVersion,
    buildMetaVersionFields,
    createHistoryEntry,
    hashString,
    normalizeRestorePointLabel,
    parseLegacyChunks,
    selectHistoryToPrune,
    sortHistoryEntries,
    splitIntoChunks
} from '@catlog/core';

// 切塊、checksum 等純函式放在 core，web 與 iOS 共用同一份實作。
export { CHUNK_SIZE, hashString, parseLegacyChunks, splitIntoChunks };

const MAX_BATCH_DELETES = 400;

/**
 * 雲端儲存格式（v3）
 *
 * users/{uid}/meta/storage           指標文件：revision、generation、chunkCount、checksum、length、
 *                                     schemaVersion、minClientVersion（相容性，見 docs/DATA_FORMAT.md）
 * users/{uid}/chunks/{generation}_{i} 資料塊：{ index, content, generation }
 * users/{uid}/history/{generation}   歷史版本：每次存檔一筆，資料塊保留到被保留規則清掉為止（core: selectHistoryToPrune）
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

export const createGenerationId = () =>
    `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const metaRefFor = (db, uid) => doc(db, 'users', uid, 'meta', 'storage');
const chunksRefFor = (db, uid) => collection(db, 'users', uid, 'chunks');
const historyRefFor = (db, uid) => collection(db, 'users', uid, 'history');

const snapshotExists = (snapshot) => {
    if (!snapshot) return false;
    if (typeof snapshot.exists === 'function') return snapshot.exists();
    return Boolean(snapshot.exists);
};

export const readMeta = async (db, uid) => {
    const snapshot = await getDoc(metaRefFor(db, uid));
    return snapshotExists(snapshot) ? snapshot.data() : null;
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
 * chunkSize：每塊字元數，只有測試會改。
 */
export const writeCloudData = async (db, uid, data, {
    expectedRevision = 0,
    force = false,
    previousChunkIds = [],
    deviceId = '',
    onProgress,
    chunkSize = CHUNK_SIZE
} = {}) => {
    const jsonString = JSON.stringify(data);
    const chunks = splitIntoChunks(jsonString, chunkSize);
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
    let previousMeta = null;
    let nextMeta = null;
    try {
        revision = await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(metaRef);
            const meta = snapshotExists(snapshot) ? snapshot.data() : null;
            previousMeta = meta;
            const remoteRevision = meta?.revision || 0;
            if (!force && remoteRevision !== expectedRevision) {
                throw new CloudConflictError(remoteRevision, expectedRevision);
            }
            const nextRevision = remoteRevision + 1;
            nextMeta = {
                schema: 3,
                revision: nextRevision,
                generation,
                chunkCount: chunks.length,
                checksum,
                length: jsonString.length,
                updatedAt: Date.now(),
                deviceId,
                ...buildMetaVersionFields(meta)
            };
            transaction.set(metaRef, nextMeta);
            return nextRevision;
        });
    } catch (error) {
        // 指標沒有切換，新寫入的資料塊不會被讀到；盡量清除避免累積。
        await deleteDocIds(db, uid, newChunkIds).catch(() => {});
        throw error;
    }

    // 上一份保留成歷史版本。舊格式資料塊（沒有 generation）無法列入歷史，或歷史紀錄寫不進去
    // （例如 Firestore 規則還沒部署）時，照舊刪除上一份，避免資料塊無限累積。
    let keepPrevious = Boolean(previousMeta?.generation);
    if (keepPrevious) {
        keepPrevious = await recordHistory(db, uid, [nextMeta, previousMeta], generation)
            .then(() => true)
            .catch((error) => {
                console.warn('Failed to record history', error);
                return false;
            });
    }
    if (!previousMeta?.generation) {
        await recordHistory(db, uid, [nextMeta], generation).catch((error) => console.warn('Failed to record history', error));
    }
    if (!keepPrevious) {
        const staleIds = previousChunkIds.filter((id) => !newChunkIds.includes(id));
        await deleteDocIds(db, uid, staleIds).catch((error) => {
            console.warn('Failed to clean up old chunks', error);
        });
    }

    return { revision: revision ?? expectedRevision + 1, chunkIds: newChunkIds };
};

/** 雲端歷史版本，新到舊。 */
export const listHistory = async (db, uid) => {
    const snapshot = await getDocs(query(historyRefFor(db, uid)));
    return sortHistoryEntries(docsOf(snapshot).map((d) => d.data()));
};

/** 讀出某個歷史版本的資料（驗證 checksum）。 */
export const readHistoryVersion = async (db, uid, entry) => {
    const snapshot = await getDocs(query(chunksRefFor(db, uid), where('generation', '==', entry.generation)));
    const chunks = docsOf(snapshot).map((d) => d.data());
    return JSON.parse(assembleHistoryVersion(entry, chunks));
};

const deleteGeneration = async (db, uid, generation) => {
    const snapshot = await getDocs(query(chunksRefFor(db, uid), where('generation', '==', generation)));
    await deleteDocIds(db, uid, docsOf(snapshot).map((d) => d.id));
    const batch = writeBatch(db);
    batch.delete(doc(historyRefFor(db, uid), generation));
    await batch.commit();
};

/** 記錄新版本（並補記上一份），再依保留規則刪除太舊的版本。失敗不影響這次存檔。 */
const recordHistory = async (db, uid, metas, currentGeneration) => {
    const batch = writeBatch(db);
    // merge：已經設成還原點的紀錄（pinned、label）不會被蓋掉。
    metas.map(createHistoryEntry).filter(Boolean).forEach((entry) => batch.set(doc(historyRefFor(db, uid), entry.generation), entry, { merge: true }));
    await batch.commit();
    const prune = selectHistoryToPrune(await listHistory(db, uid), { now: Date.now(), currentGeneration });
    for (const generation of prune) {
        await deleteGeneration(db, uid, generation);
    }
};

/** 把目前的雲端版本設成手動還原點（不會被自動清掉）。 */
export const createRestorePoint = async (db, uid, label = '') => {
    const entry = createHistoryEntry(await readMeta(db, uid));
    if (!entry) throw new Error('雲端還沒有可以設成還原點的版本，請先存檔一次。');
    const batch = writeBatch(db);
    batch.set(doc(historyRefFor(db, uid), entry.generation), { ...entry, pinned: true, label: normalizeRestorePointLabel(label) }, { merge: true });
    await batch.commit();
    return entry.generation;
};

/** 取消還原點：之後依一般的保留規則處理。 */
export const clearRestorePoint = async (db, uid, generation) => {
    const batch = writeBatch(db);
    batch.set(doc(historyRefFor(db, uid), generation), { pinned: false, label: '' }, { merge: true });
    await batch.commit();
};

export const getMetaRef = metaRefFor;
