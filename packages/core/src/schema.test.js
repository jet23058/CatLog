import { describe, expect, it } from 'vitest';
import {
    CURRENT_SCHEMA_VERSION,
    buildMetaVersionFields,
    checkCompatibility,
    compareVersions,
    describeIncompatibility,
    getSchemaVersion,
    maxVersion,
    migrateData,
    normalizeAppData,
} from './index.js';

describe('schemaVersion 與遷移', () => {
    it('沒有 schemaVersion 的舊資料視為 0，遷移後補上目前版本並保留所有欄位', () => {
        const old = { records: { a: 1 }, unknownField: 'keep' };
        expect(getSchemaVersion(old)).toBe(0);
        expect(migrateData(old)).toEqual({ records: { a: 1 }, unknownField: 'keep', schemaVersion: CURRENT_SCHEMA_VERSION });
    });

    it('比目前新的資料原樣回傳，不降版', () => {
        const future = { schemaVersion: CURRENT_SCHEMA_VERSION + 5, newThing: true };
        expect(migrateData(future)).toBe(future);
        expect(normalizeAppData(future).schemaVersion).toBe(CURRENT_SCHEMA_VERSION + 5);
    });

    it('normalizeAppData 會一併遷移', () => {
        expect(normalizeAppData({}).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
});

describe('版本比較', () => {
    it('依 MAJOR.MINOR.PATCH 數字比較，忽略 v 前綴', () => {
        expect(compareVersions('3.10.0', '3.9.9')).toBeGreaterThan(0);
        expect(compareVersions('v4.0.0', '4.0.0')).toBe(0);
        expect(compareVersions('3.0', '3.0.1')).toBeLessThan(0);
        expect(maxVersion(null, '3.0.0', '4.1.0', '4.0.9')).toBe('4.1.0');
    });
});

describe('相容性檢查', () => {
    it('一般情況可以寫入', () => {
        expect(checkCompatibility({ appVersion: '3.0.0', data: { schemaVersion: 1 }, meta: { schemaVersion: 1, minClientVersion: '3.0.0' } }))
            .toEqual({ canWrite: true });
        expect(checkCompatibility({ appVersion: '3.0.0', data: null, meta: null })).toEqual({ canWrite: true });
    });

    it('資料或 meta 的 schemaVersion 比 App 新時不能寫', () => {
        const fromData = checkCompatibility({ appVersion: '9.9.9', data: { schemaVersion: CURRENT_SCHEMA_VERSION + 1 } });
        expect(fromData).toMatchObject({ canWrite: false, reason: 'schema' });
        const fromMeta = checkCompatibility({ appVersion: '9.9.9', meta: { schemaVersion: CURRENT_SCHEMA_VERSION + 1, minClientVersion: '5.0.0' } });
        expect(fromMeta).toMatchObject({ canWrite: false, reason: 'schema', requiredVersion: '5.0.0' });
        expect(describeIncompatibility(fromMeta)).toContain('5.0.0 以上');
    });

    it('App 版本低於 minClientVersion 時不能寫', () => {
        const result = checkCompatibility({ appVersion: '3.0.0', meta: { schemaVersion: 1, minClientVersion: '3.1.0' } });
        expect(result).toMatchObject({ canWrite: false, reason: 'minClientVersion', requiredVersion: '3.1.0' });
        expect(describeIncompatibility(result)).toContain('3.1.0 以上');
    });

    it('meta 的 minClientVersion 只升不降', () => {
        expect(buildMetaVersionFields(null)).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, minClientVersion: '3.0.0' });
        expect(buildMetaVersionFields({ minClientVersion: '4.2.0' }).minClientVersion).toBe('4.2.0');
        expect(buildMetaVersionFields({ minClientVersion: '2.0.0' }).minClientVersion).toBe('3.0.0');
    });
});
