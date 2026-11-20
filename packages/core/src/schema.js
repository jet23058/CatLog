// 資料結構版本與 App 相容性。規則見 docs/DATA_FORMAT.md。
//
// - schemaVersion 存在資料 JSON 內（舊版 normalizeAppData 會保留不認得的欄位，所以舊 App 存檔也不會弄丟）。
// - meta/storage 另外記錄 schemaVersion 與 minClientVersion，讓 App 讀資料前就能判斷要不要更新。
// - App 遇到比自己新的 schemaVersion，或自己的版本低於 minClientVersion，就只能讀、不能寫。

export const CURRENT_SCHEMA_VERSION = 1;

// 每個 schemaVersion 需要的最低 App 版本（第一個能正確讀寫該結構的版本）。
// schema 1 只是補上版本欄位、結構與 3.0.0 相同，所以 3.0.0 起都相容。
export const SCHEMA_MIN_CLIENT_VERSION = {
    1: '3.0.0',
};

// 第 n 個函式把 schema n 的資料升級成 n + 1。只新增、不刪除未知欄位。
const MIGRATIONS = [
    // 0 → 1：沒有結構變動，只補上 schemaVersion。
    (data) => data,
];

export const getSchemaVersion = (data) => (
    Number.isInteger(data?.schemaVersion) && data.schemaVersion > 0 ? data.schemaVersion : 0
);

// 把舊資料升級到 CURRENT_SCHEMA_VERSION。比目前新的資料原樣回傳，交給相容性檢查處理。
export const migrateData = (data = {}) => {
    const source = data || {};
    let version = getSchemaVersion(source);
    if (version > CURRENT_SCHEMA_VERSION) return source;
    let result = source;
    while (version < CURRENT_SCHEMA_VERSION) {
        result = MIGRATIONS[version](result);
        version += 1;
    }
    return { ...result, schemaVersion: CURRENT_SCHEMA_VERSION };
};

const parseVersion = (value) => String(value || '0.0.0')
    .replace(/^v/, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => parseInt(part, 10) || 0);

// 比較 MAJOR.MINOR.PATCH：a < b 回傳負數，相等回傳 0，a > b 回傳正數。
export const compareVersions = (a, b) => {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

export const maxVersion = (...versions) => versions
    .filter(Boolean)
    .reduce((max, v) => (max === null || compareVersions(v, max) > 0 ? v : max), null);

/**
 * 判斷這個 App 版本能不能寫入雲端資料。
 * 回傳 { canWrite: true } 或 { canWrite: false, reason, requiredVersion, schemaVersion }。
 * reason：'schema'（資料結構比 App 新）或 'minClientVersion'（App 版本太舊）。
 */
export const checkCompatibility = ({ appVersion, data = null, meta = null }) => {
    const schemaVersion = Math.max(getSchemaVersion(data), getSchemaVersion(meta));
    const requiredVersion = maxVersion(meta?.minClientVersion, SCHEMA_MIN_CLIENT_VERSION[schemaVersion]);

    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
        return { canWrite: false, reason: 'schema', requiredVersion, schemaVersion };
    }
    if (requiredVersion && appVersion && compareVersions(appVersion, requiredVersion) < 0) {
        return { canWrite: false, reason: 'minClientVersion', requiredVersion, schemaVersion };
    }
    return { canWrite: true };
};

// 存檔時寫進 meta/storage 的版本欄位：minClientVersion 只升不降，保留管理者手動調高的值。
export const buildMetaVersionFields = (previousMeta = null) => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    minClientVersion: maxVersion(previousMeta?.minClientVersion, SCHEMA_MIN_CLIENT_VERSION[CURRENT_SCHEMA_VERSION]),
});

// 給使用者看的說明。
export const describeIncompatibility = (result) => {
    if (!result || result.canWrite) return '';
    const target = result.requiredVersion ? ` ${result.requiredVersion} 以上` : '最新';
    if (result.reason === 'schema') {
        return `雲端資料是用較新版的 App 存的（資料格式 v${result.schemaVersion}），這個版本無法安全寫入。請更新到${target}版本。`;
    }
    return `雲端資料需要${target}版本的 App 才能編輯，請更新後再試。`;
};
