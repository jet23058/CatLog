// 月份明細頁：某個月的資產、負債、收入、花費、備忘錄與前後月比較。
// 從 App.jsx 的 DetailView 搬出，邏輯保持原樣；web 與 iOS 共用。
import { getMonthlyStats } from './dashboard.js';
import { getDebtEventImpact, getDebtTotal, getEffectiveDebtSnapshotAtDate, getMonthEndDateKey, getMonthlyDebtInterestEstimate } from './debts.js';
import { getLatestSnapshotDate } from './snapshots.js';
import { getDebtEventTargets } from './records.js';

const sumAmounts = (items = []) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

// 某個月（YYYY-MM）內最新的日期 key。
export const getLatestDateInMonth = (records = {}, month) => (
    Object.keys(records || {})
        .filter((date) => date.startsWith(month))
        .sort()
        .pop() || null
);

// 有任何資料（資產、備忘錄、負債、負債異動、收入、花費）的月份，舊到新。用於上一月 / 下一月與 iOS 月份列表。
export const getDataMonths = (data = {}) => {
    const months = new Set();
    Object.keys(data.records || {}).forEach((d) => months.add(d.substring(0, 7)));
    Object.keys(data.memos || {}).forEach((d) => months.add(d.substring(0, 7)));
    Object.keys(data.debts || {}).forEach((d) => months.add(d.substring(0, 7)));
    Object.keys(data.debtEvents || {}).forEach((m) => months.add(m));
    Object.keys(data.incomes || {}).forEach((m) => months.add(m));
    Object.keys(data.expenses || {}).forEach((m) => months.add(m));
    return Array.from(months).sort();
};

// 花費依類別彙總（圓餅圖用），金額大到小。
export const getExpenseCategories = (expenses = []) => {
    const categoryMap = {};
    expenses.forEach((ex) => {
        const cat = ex.category || '其他';
        if (!categoryMap[cat]) categoryMap[cat] = { name: cat, value: 0, items: [] };
        categoryMap[cat].value += ex.amount;
        categoryMap[cat].items.push(ex);
    });
    return Object.values(categoryMap).sort((a, b) => b.value - a.value);
};

// 月份摘要數字。web 編輯中會用畫面上的暫存資料重算，所以獨立成函式。
export const getMonthSummary = ({ assets = [], debts = [], incomes = [], expenses = [], prevTotalAssets = 0, prevTotalDebts = 0, prevMonthIncome = 0 }) => {
    const totalAssets = sumAmounts(assets);
    const totalDebts = getDebtTotal(debts);
    const netAssets = totalAssets - totalDebts;
    const floatingAssets = sumAmounts(assets.filter((item) => item.type === 'floating'));
    const investmentRate = totalAssets > 0 ? floatingAssets / totalAssets : 0;
    const monthlyIncome = sumAmounts(incomes);
    const monthlyCost = sumAmounts(expenses);

    const incomeDiff = monthlyIncome - prevMonthIncome;
    const assetDiff = netAssets - (prevTotalAssets - prevTotalDebts);
    const compositeScore = incomeDiff + assetDiff;

    return { totalAssets, totalDebts, netAssets, investmentRate, monthlyIncome, monthlyCost, incomeDiff, assetDiff, compositeScore };
};

/**
 * 某個月的完整明細（唯讀）。
 * - assets：當月最後一筆資產紀錄
 * - debts：當月月底有效的負債（含前期延續與本月異動；本月有晚於快照的異動時，以異動日為準）
 * - debtEvents：本月負債異動（依日期排序）與統計
 * - prev*：上一個有資料的月份，用來比較
 */
export const getMonthDetail = (data = {}, monthKey) => {
    const monthEndDate = getMonthEndDateKey(monthKey);
    const assetDate = getLatestDateInMonth(data.records, monthKey);
    const debtDate = getLatestDateInMonth(data.debts, monthKey);
    const memoDate = getLatestDateInMonth(data.memos, monthKey);
    const effectiveDebtSnapshotDate = monthEndDate ? getLatestSnapshotDate(data.debts, monthEndDate) : null;
    const isDebtCarriedForward = Boolean(effectiveDebtSnapshotDate && effectiveDebtSnapshotDate.substring(0, 7) !== monthKey);

    const monthlyDebtSnapshots = Object.entries(data.debts || {})
        .filter(([date]) => date.startsWith(monthKey))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, debts]) => ({ date, debts: Array.isArray(debts) ? debts : [], total: getDebtTotal(debts) }));

    const debtEvents = [...(data.debtEvents?.[monthKey] || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestDebtEventDate = debtEvents.map((item) => item.date).filter(Boolean).sort().pop() || '';
    const effectiveDebtDate = effectiveDebtSnapshotDate && latestDebtEventDate && latestDebtEventDate > effectiveDebtSnapshotDate
        ? latestDebtEventDate
        : effectiveDebtSnapshotDate;
    const debts = effectiveDebtDate ? getEffectiveDebtSnapshotAtDate(data.debts, data.debtEvents, effectiveDebtDate) : [];
    const baseDebtSnapshotItems = effectiveDebtSnapshotDate ? (data.debts?.[effectiveDebtSnapshotDate] || []) : [];

    const debtEventStats = debtEvents.reduce((acc, item) => {
        acc.principal += getDebtEventImpact(item);
        if (item.type === 'interest') acc.interest += Number(item.amount) || 0;
        if (item.type === 'fee') acc.fees += Number(item.amount) || 0;
        if (item.type === 'rate_change') acc.rateChanges += 1;
        return acc;
    }, { principal: 0, interest: 0, fees: 0, rateChanges: 0 });
    const estimatedMonthlyDebtInterest = baseDebtSnapshotItems
        .reduce((sum, debt) => sum + getMonthlyDebtInterestEstimate(debt, monthKey, data.debtEvents, data.debts), 0);

    const months = getDataMonths(data);
    const currentIndex = months.indexOf(monthKey);
    const prevMonth = currentIndex > 0 ? months[currentIndex - 1] : null;
    // 與原本相同：月份不在清單中（indexOf 為 -1）時，下一月是最早有資料的月份。
    const nextMonth = currentIndex < months.length - 1 ? months[currentIndex + 1] : null;
    const prevAssetDate = prevMonth ? getLatestDateInMonth(data.records, prevMonth) : null;
    const prevDebtDate = prevMonth ? getLatestSnapshotDate(data.debts, getMonthEndDateKey(prevMonth)) : null;
    const prevAssets = prevAssetDate ? (data.records[prevAssetDate] || []) : [];
    const prevMonthAssetsMap = prevAssets.reduce((acc, item) => {
        acc[`${item.type}-${item.name}`] = item.amount;
        return acc;
    }, {});
    const prevTotalAssets = sumAmounts(prevAssets);
    const prevTotalDebts = prevDebtDate ? getDebtTotal(getEffectiveDebtSnapshotAtDate(data.debts, data.debtEvents, prevDebtDate)) : 0;
    const prevMonthIncome = prevMonth ? (data.incomes?.[prevMonth]?.totalAmount || 0) : 0;

    const assets = assetDate ? (data.records[assetDate] || []) : [];
    const incomes = data.incomes?.[monthKey]?.sources || [];
    const expenses = data.expenses?.[monthKey] || [];

    return {
        monthKey,
        monthEndDate,
        assetDate,
        debtDate,
        memoDate,
        writeDate: assetDate || debtDate || memoDate || `${monthKey}-01`,
        effectiveDebtSnapshotDate,
        isDebtCarriedForward,
        latestDebtEventDate,
        assets,
        memo: memoDate ? (data.memos?.[memoDate] || '') : '',
        incomes,
        debts,
        baseDebtSnapshotItems,
        monthlyDebtSnapshots,
        debtEvents,
        debtEventStats,
        estimatedMonthlyDebtInterest,
        expenses,
        expenseAccounts: Array.from(new Set(expenses.map((ex) => ex.account))).sort(),
        expenseCategories: getExpenseCategories(expenses),
        prevMonth,
        nextMonth,
        prevAssetDate,
        prevDebtDate,
        prevMonthAssetsMap,
        prevTotalAssets,
        prevTotalDebts,
        prevMonthIncome,
        summary: getMonthSummary({ assets, debts, incomes, expenses, prevTotalAssets, prevTotalDebts, prevMonthIncome }),
    };
};

// 某個月可以做「利率調整」的對象：該月月底有效的股票質押（web 用編輯中的負債清單算，iOS 用這個）。
export const getMonthDebtEventTargets = (data = {}, monthKey) => getDebtEventTargets(getMonthDetail(data, monthKey).debts);

// --- 月份明細的圖表資料（web 與 iOS 共用） ---

// 到這個月為止最近 count 個月（可跨年）：淨資產、收入、支出。沒有資產紀錄的月份 assets 為 null。
export const getRecentMonthTrend = (data, monthKey, count = 6) => {
    const [year, month] = String(monthKey).split('-').map(Number);
    if (!year || !month) return [];
    const rows = [year - 1, year].flatMap((y) => getMonthlyStats(data, y).map((row) => ({ ...row, year: y })))
        .filter((row) => row.year < year || row.month <= month);
    return rows.slice(-count).map((row) => ({
        monthKey: `${row.year}-${String(row.month).padStart(2, '0')}`,
        year: row.year,
        month: row.month,
        assets: row.hasRecord ? row.assets : null,
        income: row.income,
        cost: row.cost
    }));
};

// 資產配置：依名稱加總，金額大的前 topN 筆各一份，其餘合併成「其他」。只算正數金額。
export const getAssetAllocation = (assets = [], topN = 4) => {
    const byName = new Map();
    (assets || []).forEach((item) => {
        const amount = Number(item?.amount) || 0;
        if (amount <= 0) return;
        const name = item?.name || '未命名';
        byName.set(name, (byName.get(name) || 0) + amount);
    });
    const sorted = [...byName.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((sum, item) => sum + item.amount, 0);
    const top = sorted.slice(0, topN);
    const restAmount = sorted.slice(topN).reduce((sum, item) => sum + item.amount, 0);
    const slices = restAmount > 0 ? [...top, { name: '其他', amount: restAmount, isOther: true }] : top;
    return {
        total,
        slices: slices.map((item) => ({ ...item, isOther: !!item.isOther, share: total > 0 ? item.amount / total : 0 }))
    };
};
