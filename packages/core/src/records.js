// 新增資產 / 收入的共用規則（web 與 iOS 相同）。
// 從 App.jsx 的 AddAssetModal、AddIncomeModal、handleSaveNewAsset、handleSaveNewIncome 搬出，邏輯保持原樣。
import { DEFAULT_EXCHANGE_RATES } from './data.js';

// 可選幣別（與預設匯率表相同）。
export const SUPPORTED_CURRENCIES = Object.keys(DEFAULT_EXCHANGE_RATES);

// 原幣金額換算成台幣：台幣直接使用；外幣乘上匯率後四捨五入到整數（與 web 的 toFixed(0) 相同）。
export const convertToTWD = (originalAmount, exchangeRate, currency = 'TWD') => {
    if (currency === 'TWD') return Number(originalAmount) || 0;
    const value = parseFloat(originalAmount) * parseFloat(exchangeRate);
    return Number.isFinite(value) ? Number(value.toFixed(0)) : 0;
};

// 歷史資產名稱與類型（同名以最新日期的類型為準），新增時用來挑選。
export const getAssetNameOptions = (records = {}) => {
    const map = new Map();
    Object.keys(records || {}).sort().forEach((date) => {
        (records[date] || []).forEach((r) => map.set(r.name, r.type));
    });
    return Array.from(map.entries()).map(([name, type]) => ({ name, type }));
};

// 最近一次出現的同名資產（選名稱時帶入幣別與匯率）。
export const getLatestAssetByName = (records = {}, name) => {
    const dates = Object.keys(records || {}).sort().reverse();
    for (const d of dates) {
        const record = (records[d] || []).find((r) => r.name === name);
        if (record) return record;
    }
    return null;
};

// 選擇日期之前、最近一次有資產的紀錄（「帶入上次資產」用）。
export const getPreviousAssetSnapshot = (records = {}, date) => {
    if (!date) return { date: null, assets: [] };
    const currentTimestamp = new Date(date).getTime();
    const dates = Object.keys(records || {})
        .filter((d) => new Date(d).getTime() < currentTimestamp && (records[d] || []).length > 0)
        .sort((a, b) => new Date(b) - new Date(a));
    if (dates.length === 0) return { date: null, assets: [] };
    return { date: dates[0], assets: records[dates[0]] || [] };
};

// 同一天「同名稱 + 同幣別」視為重複；同名不同幣別（例如台新 TWD 與台新 JPY）可以並存。
export const isDuplicateAsset = (records = {}, date, pending = [], name, currency) => {
    const cleanName = (name || '').trim();
    const assetsInDate = records?.[date] || [];
    const pendingInDate = pending.filter((asset) => asset.date === date);
    return [...assetsInDate, ...pendingInDate].some((asset) => asset.name === cleanName && asset.currency === currency);
};

// 建立一筆待新增資產。amount 為台幣金額（外幣依匯率換算）。
export const createAssetEntry = ({ id, type = 'fixed', name, originalAmount, currency = 'TWD', exchangeRate = 1, date }) => {
    const amount = convertToTWD(originalAmount, exchangeRate, currency);
    return {
        id,
        type,
        name: (name || '').trim(),
        amount,
        currency,
        originalAmount: Number(originalAmount) || amount,
        exchangeRate: Number(exchangeRate),
        date
    };
};

// 「帶入上次資產」：從上次紀錄複製，略過當天或待新增清單裡已經有的「名稱 + 幣別」。
export const getImportablePreviousAssets = (records = {}, date, pending = [], idPrefix = 'asset-import') => {
    const snapshot = getPreviousAssetSnapshot(records, date);
    const assetsInDate = records?.[date] || [];
    const existingKeys = new Set([...assetsInDate, ...pending].map((asset) => `${asset.name}-${asset.currency || 'TWD'}`));
    return snapshot.assets
        .filter((asset) => !existingKeys.has(`${asset.name}-${asset.currency || 'TWD'}`))
        .map((asset, index) => ({
            ...asset,
            id: `${idPrefix}-${index}`,
            date,
            amount: Number(asset.amount) || 0,
            originalAmount: Number(asset.originalAmount) || Number(asset.amount) || 0,
            exchangeRate: Number(asset.exchangeRate) || 1
        }));
};

// 把資產加到指定日期（附加在既有紀錄後面）；資產本身不保存 date 欄位。
export const addAssetsToData = (data = {}, dateKey, newAssets) => {
    const assetsToAdd = (Array.isArray(newAssets) ? newAssets : [newAssets]).map(({ date, ...asset }) => asset);
    const existing = data.records?.[dateKey] || [];
    return {
        ...data,
        records: { ...(data.records || {}), [dateKey]: [...existing, ...assetsToAdd] }
    };
};

// 建立一筆收入來源。amount 為台幣金額（外幣依匯率換算）。
export const createIncomeSource = ({ date, company, bank = '', currency = 'TWD', originalAmount, exchangeRate = 1, memo = '' }) => {
    const amount = convertToTWD(originalAmount, exchangeRate, currency);
    return {
        date,
        company,
        bank,
        currency,
        originalAmount: Number(originalAmount) || amount,
        exchangeRate: Number(exchangeRate),
        amount,
        memo: (memo || '').trim()
    };
};

// 把收入加到該月份：累加 totalAmount，來源附加在後面。
export const addIncomeToData = (data = {}, dateKey, newIncomeSource) => {
    const monthKey = dateKey.substring(0, 7);
    const existingMonthData = data.incomes?.[monthKey] || { totalAmount: 0, sources: [] };
    const existingSources = existingMonthData.sources || [];
    const newTotal = (existingMonthData.totalAmount || 0) + newIncomeSource.amount;
    return {
        ...data,
        incomes: {
            ...(data.incomes || {}),
            [monthKey]: { ...existingMonthData, totalAmount: newTotal, sources: [...existingSources, newIncomeSource] }
        }
    };
};
