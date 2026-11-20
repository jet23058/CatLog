import { getLatestSnapshotItems } from './snapshots.js';

export const getDebtIdentity = (debt = {}) => debt.id || [
    debt.name,
    debt.lender,
    debt.amount,
    debt.category,
    debt.memo,
    JSON.stringify(debt.pledgeStocks || [])
].join('|');
export const getDebtTargetKey = (debt = {}) => debt.id ? `id:${debt.id}` : `fallback:${[
    debt.category,
    debt.name,
    debt.lender
].join('|')}`;

export const mergeDebtMaps = (...debtMaps) => {
    const merged = {};
    debtMaps.forEach((debtMap = {}) => {
        Object.entries(debtMap || {}).forEach(([date, debts]) => {
            if (!merged[date]) merged[date] = [];
            const seen = new Set(merged[date].map(getDebtIdentity));
            (Array.isArray(debts) ? debts : []).forEach((debt) => {
                const identity = getDebtIdentity(debt);
                if (seen.has(identity)) return;
                seen.add(identity);
                merged[date].push(debt);
            });
        });
    });
    return merged;
};

export const addDebtToSnapshot = (snapshot = [], debt) => {
    const seen = new Set((Array.isArray(snapshot) ? snapshot : []).map(getDebtIdentity));
    const identity = getDebtIdentity(debt);
    if (seen.has(identity)) return Array.isArray(snapshot) ? snapshot : [];
    return [...(Array.isArray(snapshot) ? snapshot : []), debt];
};

export const addDebtAndCarryForward = (debtMap = {}, dateKey, newDebt) => {
    const nextDebts = { ...debtMap };
    const exactDateDebts = nextDebts?.[dateKey];
    const existingDebts = exactDateDebts || getLatestSnapshotItems(nextDebts, dateKey);

    nextDebts[dateKey] = addDebtToSnapshot(existingDebts, newDebt);

    Object.keys(nextDebts)
        .filter((date) => date > dateKey)
        .sort()
        .forEach((date) => {
            nextDebts[date] = addDebtToSnapshot(nextDebts[date], newDebt);
        });

    return nextDebts;
};

// --- 工具函數 ---
export const getDebtTotal = (debts = []) => debts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
export const getMonthEndDateKey = (monthKey) => {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return '';
    const [year, month] = monthKey.split('-').map(Number);
    const endDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
};
export const inferPledgeStockMarket = (value = '') => {
    const text = String(value || '').trim().toUpperCase();
    if (!text) return null;
    if (/[\u4e00-\u9fff]/.test(text)) return 'TW';
    if (/^\d{4,6}[A-Z]*$/.test(text)) return 'TW';
    if (/^[A-Z.\-]+$/.test(text)) return 'US';
    return null;
};
export const getDebtMarketAllocation = (debt = {}) => {
    if (debt.category !== 'stock_pledge') return {};
    const pledgeStocks = Array.isArray(debt.pledgeStocks) ? debt.pledgeStocks : [];
    const weights = {};

    pledgeStocks.forEach((stock) => {
        const market = inferPledgeStockMarket(stock.symbol || stock.name || '');
        if (!market) return;
        const rawWeight = Number(stock.shares);
        const weight = rawWeight > 0 ? rawWeight : 1;
        weights[market] = (weights[market] || 0) + weight;
    });

    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (totalWeight <= 0) return {};

    return Object.fromEntries(Object.entries(weights).map(([market, weight]) => [market, weight / totalWeight]));
};
export const getPledgeAverageRate = (debt = {}) => {
    const pledgeStocks = Array.isArray(debt.pledgeStocks) ? debt.pledgeStocks : [];
    const weighted = pledgeStocks.reduce((acc, stock) => {
        const rate = Number(stock.rate) || 0;
        if (rate <= 0) return acc;
        const rawWeight = Number(stock.shares);
        const weight = rawWeight > 0 ? rawWeight : 1;
        acc.totalWeight += weight;
        acc.totalRate += rate * weight;
        return acc;
    }, { totalWeight: 0, totalRate: 0 });
    if (weighted.totalWeight <= 0) return 0;
    return weighted.totalRate / weighted.totalWeight;
};
export const getDebtEstimatedAnnualInterest = (debt = {}) => {
    const amount = Number(debt.amount) || 0;
    const rate = getPledgeAverageRate(debt);
    if (debt.category !== 'stock_pledge' || amount <= 0 || rate <= 0) return 0;
    return amount * (rate / 100);
};
export const getDebtEstimatedMonthlyInterest = (debt = {}) => getDebtEstimatedAnnualInterest(debt) / 12;
export const DEBT_CATEGORIES = [
    { value: 'stock_pledge', label: '股票質押' },
    { value: 'personal_loan', label: '信用貸款' },
    { value: 'mortgage', label: '房貸' },
    { value: 'car_loan', label: '車貸' },
    { value: 'credit_card', label: '信用卡' },
    { value: 'installment', label: '分期付款' },
    { value: 'family_loan', label: '親友借款' },
    { value: 'other', label: '其他' }
];
export const getDebtCategoryLabel = (value) => DEBT_CATEGORIES.find((item) => item.value === value)?.label || value || '未分類';
export const getDebtEventImpact = (event) => {
    if (event.type === 'borrow') return Number(event.amount) || 0;
    if (event.type === 'repay') return -(Number(event.amount) || 0);
    return 0;
};
export const getDebtEventLabel = (type) => ({
    borrow: '借款',
    repay: '還本金',
    interest: '利息',
    fee: '手續費',
    collateral: '擔保品',
    rate_change: '利率調整'
}[type] || '異動');
export const mergePledgeRateRows = (baseRows = [], eventRows = []) => {
    const rowMap = new Map((Array.isArray(baseRows) ? baseRows : []).map((row) => [String(row.symbol || '').trim(), { ...row }]));

    (Array.isArray(eventRows) ? eventRows : []).forEach((row) => {
        const symbol = String(row.symbol || '').trim();
        if (!symbol) return;
        const current = rowMap.get(symbol) || { symbol, shares: 0, rate: 0 };
        rowMap.set(symbol, {
            ...current,
            ...row,
            symbol,
            shares: Number(row.shares) > 0 ? Math.trunc(Number(row.shares)) : current.shares,
            rate: Number(row.rate) || 0
        });
    });

    return Array.from(rowMap.values());
};
export const getRateChangeEventsForDebt = (debt = {}, debtEvents = {}, targetDateStr = '') => {
    const targetDate = new Date(targetDateStr || '9999-12-31');
    const targetKey = getDebtTargetKey(debt);
    return Object.values(debtEvents || {})
        .flatMap((items) => items || [])
        .filter((event) => {
            if (event.type !== 'rate_change') return false;
            if (!event.date || new Date(event.date) > targetDate) return false;
            return event.targetDebtKey === targetKey
                || (event.targetDebtId && debt.id && event.targetDebtId === debt.id)
                || (!event.targetDebtKey && event.name === debt.name && event.lender === debt.lender && (event.category || debt.category) === debt.category);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
};
export const getEffectiveDebtAtDate = (debt = {}, debtEvents = {}, targetDateStr = '') => {
    if (debt.category !== 'stock_pledge') return debt;
    const effectiveDebt = { ...debt, pledgeStocks: Array.isArray(debt.pledgeStocks) ? debt.pledgeStocks.map((row) => ({ ...row })) : [] };
    getRateChangeEventsForDebt(debt, debtEvents, targetDateStr).forEach((event) => {
        effectiveDebt.pledgeStocks = mergePledgeRateRows(effectiveDebt.pledgeStocks, event.pledgeStocks);
    });
    return effectiveDebt;
};
export const getEffectiveDebtSnapshotAtDate = (debts = {}, debtEvents = {}, targetDateStr = '') => (
    getLatestSnapshotItems(debts, targetDateStr).map((debt) => getEffectiveDebtAtDate(debt, debtEvents, targetDateStr))
);
export const getDebtEffectiveDate = (debt = {}, debts = {}) => {
    const debtKey = getDebtTargetKey(debt);
    const matchedDate = Object.entries(debts || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .find(([, items]) => (items || []).some((item) => getDebtTargetKey(item) === debtKey));
    return matchedDate?.[0] || '';
};
export const getMonthlyDebtInterestEstimate = (debt = {}, monthKey = '', debtEvents = {}, debts = {}) => {
    if (debt.category !== 'stock_pledge' || !monthKey) return 0;
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return 0;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const debtStartDateText = getDebtEffectiveDate(debt, debts);
    const debtStartDate = debtStartDateText ? new Date(debtStartDateText) : monthStart;
    let segmentStart = debtStartDate > monthStart ? new Date(debtStartDate) : new Date(monthStart);
    if (segmentStart > monthEnd) return 0;

    let runningDebt = getEffectiveDebtAtDate(debt, debtEvents, new Date(segmentStart.getTime() - 86400000).toISOString().slice(0, 10));
    let totalInterest = 0;

    const monthEvents = getRateChangeEventsForDebt(debt, debtEvents, monthEnd.toISOString().slice(0, 10))
        .filter((event) => new Date(event.date) >= segmentStart);

    monthEvents.forEach((event) => {
        const eventDate = new Date(event.date);
        const segmentEnd = new Date(eventDate.getTime() - 86400000);
        if (segmentEnd >= segmentStart) {
            const dayCount = Math.floor((segmentEnd - segmentStart) / 86400000) + 1;
            totalInterest += getDebtEstimatedAnnualInterest(runningDebt) * (dayCount / 365);
        }
        runningDebt = { ...runningDebt, pledgeStocks: mergePledgeRateRows(runningDebt.pledgeStocks, event.pledgeStocks) };
        segmentStart = eventDate;
    });

    if (segmentStart <= monthEnd) {
        const dayCount = Math.floor((monthEnd - segmentStart) / 86400000) + 1;
        totalInterest += getDebtEstimatedAnnualInterest(runningDebt) * (dayCount / 365);
    }

    return totalInterest;
};
