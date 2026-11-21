// 新增資產 / 收入的共用規則（web 與 iOS 相同）。
// 從 App.jsx 的 AddAssetModal、AddIncomeModal、handleSaveNewAsset、handleSaveNewIncome 搬出，邏輯保持原樣。
import { DEFAULT_EXCHANGE_RATES } from './data.js';
import { addDebtAndCarryForward, getDebtTargetKey, mergeDebtMaps } from './debts.js';

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

// 存檔前的最後檢查：這些資產全部寫到 dateKey 時，有沒有和當天既有資產、或彼此之間「名稱 + 幣別」重複。
// 回傳第一個重複的「名稱 (幣別)」，沒有重複時回傳 null。待新增清單裡的日期可能已經過時（使用者改過日期），所以不看 entry.date。
export const findDuplicateAsset = (records = {}, dateKey, entries = []) => {
    const seen = new Set((records?.[dateKey] || []).map((asset) => `${asset.name}-${asset.currency || 'TWD'}`));
    for (const entry of entries) {
        const key = `${(entry.name || '').trim()}-${entry.currency || 'TWD'}`;
        if (seen.has(key)) return `${(entry.name || '').trim()} (${entry.currency || 'TWD'})`;
        seen.add(key);
    }
    return null;
};

// ---------------------------------------------------------------------------
// 新增負債 / 負債異動（從 AddDebtModal、AddDebtEventModal、handleSaveNewDebt、ADD_DEBT_EVENT 搬出）
// ---------------------------------------------------------------------------

// 新增負債時可選的「機構 / 帳戶」：同月或之前最近一次資產紀錄的帳戶、既有負債的機構，以及額外選項。
export const getDebtAccountOptions = (records = {}, debts = {}, date, extraOptions = []) => {
    const options = [];
    const seen = new Set();
    const addOption = (value) => {
        const cleanValue = String(value || '').trim();
        if (!cleanValue || seen.has(cleanValue)) return;
        seen.add(cleanValue);
        options.push(cleanValue);
    };
    const addAssetOptions = (assets = []) => {
        (assets || []).forEach((asset) => {
            addOption(asset.account);
            addOption(asset.broker);
            addOption(asset.bank);
            addOption(asset.lender);
            if (!asset.account && !asset.broker && !asset.bank && !asset.lender) addOption(asset.name);
        });
    };
    const targetDate = new Date(date);
    const recordEntries = Object.entries(records || {})
        .filter(([dateStr]) => new Date(dateStr) <= targetDate)
        .sort(([a], [b]) => new Date(b) - new Date(a));
    const sameMonthEntry = recordEntries.find(([dateStr]) => dateStr.substring(0, 7) === String(date).substring(0, 7));
    if (sameMonthEntry) addAssetOptions(sameMonthEntry[1]);
    if (recordEntries[0] && recordEntries[0] !== sameMonthEntry) addAssetOptions(recordEntries[0][1]);
    Object.values(debts || {}).forEach((items) => (items || []).forEach((debt) => addOption(debt.lender)));
    extraOptions.forEach(addOption);
    return options;
};

// 質押股票列：代號去空白、股數取整數、利率轉數字，沒有代號的列略過。
export const cleanPledgeStockRows = (rows = []) => rows
    .map((row) => ({ symbol: String(row.symbol || '').trim(), shares: Math.trunc(Number(row.shares)) || 0, rate: Number(row.rate) || 0 }))
    .filter((row) => row.symbol);

// 新增負債的欄位檢查；沒問題時回傳 null。
export const getDebtInputError = ({ date, name, amount, category, pledgeStocks = [] }) => {
    if (!date) return '請選擇日期';
    if (!String(name || '').trim()) return '請輸入負債名稱';
    if (!amount || Number(amount) <= 0) return '請輸入有效金額';
    if (category === 'stock_pledge' && cleanPledgeStockRows(pledgeStocks).length === 0) return '請至少輸入一筆質押股票';
    return null;
};

export const createDebtEntry = ({ id, category = 'other', name, lender = '', amount, pledgeStocks = [], memo = '' }) => ({
    id,
    category,
    name: String(name || '').trim(),
    lender: String(lender || '').trim(),
    amount: Number(amount),
    pledgeStocks: category === 'stock_pledge' ? cleanPledgeStockRows(pledgeStocks) : [],
    memo: String(memo || '').trim()
});

/**
 * 新增負債並延續到之後的快照。cloudData 是存檔前重新讀取的雲端資料（沒有時傳 null）：
 * 先把雲端與本機的負債合併，避免蓋掉其他裝置剛新增的負債（與 web 的 handleSaveNewDebt 相同）。
 */
export const addDebtToData = (localData = {}, cloudData = null, dateKey, newDebt) => {
    const mergedDebts = mergeDebtMaps(cloudData?.debts, localData.debts);
    const baseData = cloudData ? { ...localData, ...cloudData, debts: mergedDebts } : { ...localData, debts: mergedDebts };
    return { ...baseData, debts: addDebtAndCarryForward(mergedDebts, dateKey, newDebt) };
};

const pad2 = (n) => String(n).padStart(2, '0');

// 負債異動的預設日期：今天在這個月份內就用今天，否則用該月最後一天。today 為本地日期 YYYY-MM-DD。
export const getDebtEventDefaultDate = (monthKey, today) => {
    if (String(today).startsWith(monthKey)) return today;
    const [year, month] = monthKey.split('-').map(Number);
    return `${monthKey}-${pad2(new Date(year, month, 0).getDate())}`;
};

// 擔保品文字「2330:1000, 0050 500」→ [{ symbol, shares }]。
export const parseCollateralText = (text = '') => String(text)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
        const [symbol, shares] = part.split(/[:xX* ]+/).filter(Boolean);
        return { symbol: symbol || part, shares: Number(shares) || 0 };
    });

// 利率調整可以選的對象：目前有效的股票質押。
export const getDebtEventTargets = (debts = []) => (debts || [])
    .filter((item) => item.category === 'stock_pledge')
    .map((item) => ({ ...item, targetKey: getDebtTargetKey(item) }));

// 負債異動的欄位檢查；沒問題時回傳 null。target 為利率調整的對象。
export const getDebtEventInputError = ({ monthKey, date, type, name, amount, rateRows = [], target = null }) => {
    if (!date || !String(date).startsWith(monthKey)) return '日期需在目前月份內';
    if (!String(name || '').trim() && type !== 'rate_change') return '請輸入負債名稱';
    if (type === 'rate_change') {
        if (!target) return '請先選擇要調整利率的股票質押';
        if (cleanPledgeStockRows(rateRows).filter((row) => row.rate > 0).length === 0) return '請至少輸入一筆新的利率資料';
        return null;
    }
    if (type !== 'collateral' && (!amount || Number(amount) <= 0)) return '請輸入有效金額';
    return null;
};

export const createDebtEvent = ({ id, date, type, name = '', lender = '', amount, collateralText = '', rateRows = [], target = null, memo = '' }) => {
    if (type === 'rate_change') {
        return {
            id,
            date,
            type,
            name: target?.name || String(name).trim(),
            lender: target?.lender || String(lender).trim(),
            category: target?.category || 'stock_pledge',
            targetDebtId: target?.id || '',
            targetDebtKey: target?.targetKey,
            amount: 0,
            collateral: [],
            pledgeStocks: cleanPledgeStockRows(rateRows).filter((row) => row.rate > 0),
            memo: String(memo).trim()
        };
    }
    return {
        id,
        date,
        type,
        name: String(name).trim(),
        lender: String(lender).trim(),
        amount: type === 'collateral' ? 0 : Number(amount),
        collateral: parseCollateralText(collateralText),
        memo: String(memo).trim()
    };
};

export const addDebtEventToData = (data = {}, month, event) => ({
    ...data,
    debtEvents: {
        ...(data.debtEvents || {}),
        [month]: [...(data.debtEvents?.[month] || []), event]
    }
});

// ---------------------------------------------------------------------------
// 月份明細的編輯與刪除（從 DetailView 與 handleDetailUpdate 搬出）
// ---------------------------------------------------------------------------

// 輸入框的值可能是文字；存檔前轉成數字（空字串或無效值為 0）。
const toNumber = (value) => Number(value) || 0;

// 編輯收入的一個欄位：改到原幣金額、匯率或幣別時重算台幣金額（與 web 的 handleIncomeChange 相同）。
export const updateIncomeSourceField = (source = {}, field, value) => {
    const updated = { ...source, [field]: value };
    if (field === 'originalAmount' || field === 'exchangeRate' || field === 'currency') {
        if (field === 'currency' && value === 'TWD') {
            updated.exchangeRate = 1;
            updated.amount = toNumber(updated.originalAmount);
        } else {
            const rate = field === 'exchangeRate' ? value : updated.exchangeRate;
            const orig = field === 'originalAmount' ? value : updated.originalAmount;
            updated.amount = Number((Number(orig) * Number(rate)).toFixed(0)) || 0;
        }
    }
    return updated;
};

/**
 * 儲存月份明細的編輯：當月的資產、備忘錄、負債快照與收入一起寫回。
 * assetDate / debtDate / memoDate 為要寫入的日期（當月沒有紀錄時用 getMonthDetail 的 writeDate）。
 * 金額欄位一律轉成數字；暫存用的 _tempId 不寫入。
 */
export const updateMonthDetails = (data = {}, { month, assetDate, debtDate, memoDate, assets = [], memo = '', incomes = [], debts = [] }) => {
    const cleanAssets = assets.map(({ _tempId, ...asset }) => ({ ...asset, amount: toNumber(asset.amount) }));
    const cleanIncomes = incomes.map(({ _tempId, ...source }) => ({
        ...source,
        amount: toNumber(source.amount),
        ...(source.originalAmount !== undefined ? { originalAmount: toNumber(source.originalAmount) } : {}),
        ...(source.exchangeRate !== undefined ? { exchangeRate: toNumber(source.exchangeRate) } : {})
    }));
    const cleanDebts = debts.map(({ _tempId, ...debt }) => ({ ...debt, amount: toNumber(debt.amount) }));
    const newTotal = cleanIncomes.reduce((sum, item) => sum + item.amount, 0);
    const existingIncomeMonth = data.incomes?.[month] || {};
    return {
        ...data,
        records: { ...(data.records || {}), [assetDate]: cleanAssets },
        memos: { ...(data.memos || {}), [memoDate]: memo },
        debts: { ...(data.debts || {}), [debtDate]: cleanDebts },
        incomes: {
            ...(data.incomes || {}),
            [month]: { ...existingIncomeMonth, totalAmount: newTotal, sources: cleanIncomes }
        }
    };
};

// 刪除整個月的資產、負債快照、備忘錄與負債異動；收入與花費保留（與 web 相同）。不改動傳入的資料。
export const deleteMonthData = (data = {}, monthKey) => {
    const withoutMonth = (map = {}) => Object.fromEntries(Object.entries(map || {}).filter(([date]) => !date.startsWith(monthKey)));
    const debtEvents = { ...(data.debtEvents || {}) };
    delete debtEvents[monthKey];
    return {
        ...data,
        records: withoutMonth(data.records),
        memos: withoutMonth(data.memos),
        debts: withoutMonth(data.debts),
        ...(data.debtEvents ? { debtEvents } : {})
    };
};

export const deleteDebtEventFromData = (data = {}, month, id) => ({
    ...data,
    debtEvents: {
        ...(data.debtEvents || {}),
        [month]: (data.debtEvents?.[month] || []).filter((item) => item.id !== id)
    }
});
