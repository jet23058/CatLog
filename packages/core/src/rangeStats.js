// 區間統計與對帳單核對。
// 從 App.jsx 的 RangeStatsModal、StatementModal 搬出，邏輯保持原樣。
// startDate / endDate 為 YYYY-MM-DD；結束日包含當天。
import { getDebtTotal, getEffectiveDebtSnapshotAtDate } from './debts.js';
import { getLatestSnapshotDate } from './snapshots.js';

const toInclusiveRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// 花費日期可能是 YYYY/MM/DD 或 YYYY-MM-DD。
const parseExpenseDate = (value) => new Date(value.replace(/\//g, '-'));

// 區間收入（以月份比對）。
export const getRangeIncomeStats = (incomes = {}, startDate, endDate) => {
    const startMonth = startDate.substring(0, 7);
    const endMonth = endDate.substring(0, 7);
    let total = 0;
    const sources = [];

    Object.entries(incomes || {}).forEach(([monthStr, incomeData]) => {
        if (monthStr >= startMonth && monthStr <= endMonth) {
            total += incomeData.totalAmount || 0;
            (incomeData.sources || []).forEach(src => {
                sources.push({ ...src, month: monthStr });
            });
        }
    });

    return { total, sources, count: sources.length };
};

// 區間資產變化：取起訖日（含）當天或之前最近一次資產紀錄，分固定 / 浮動比較。
export const getRangeAssetStats = (records = {}, startDate, endDate) => {
    const { start, end } = toInclusiveRange(startDate, endDate);
    const sortedDates = Object.keys(records || {}).sort((a, b) => new Date(a) - new Date(b));

    let startAssetDate = null;
    let endAssetDate = null;

    for (const d of sortedDates) {
        const dateObj = new Date(d);
        if (dateObj <= start) startAssetDate = d;
        if (dateObj <= end) endAssetDate = d;
    }

    const startRecords = records[startAssetDate] || [];
    const endRecords = records[endAssetDate] || [];

    const calcByType = (items) => {
        let fixed = 0, floating = 0;
        const floatingItems = [];
        items.forEach(item => {
            if (item.type === 'floating') {
                floating += item.amount || 0;
                floatingItems.push({ name: item.name, amount: item.amount || 0 });
            } else {
                fixed += item.amount || 0;
            }
        });
        return { fixed, floating, floatingItems, total: fixed + floating };
    };

    const startStats = calcByType(startRecords);
    const endStats = calcByType(endRecords);

    const floatingChanges = [];
    const startFloatingMap = new Map(startStats.floatingItems.map(i => [i.name, i.amount]));
    const endFloatingMap = new Map(endStats.floatingItems.map(i => [i.name, i.amount]));
    const allFloatingNames = new Set([...startFloatingMap.keys(), ...endFloatingMap.keys()]);
    allFloatingNames.forEach(name => {
        const startAmt = startFloatingMap.get(name) || 0;
        const endAmt = endFloatingMap.get(name) || 0;
        const change = endAmt - startAmt;
        if (change !== 0) floatingChanges.push({ name, startAmt, endAmt, change });
    });
    floatingChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return {
        startDate: startAssetDate,
        endDate: endAssetDate,
        startAssets: startStats.total,
        endAssets: endStats.total,
        change: endStats.total - startStats.total,
        fixed: {
            start: startStats.fixed,
            end: endStats.fixed,
            change: endStats.fixed - startStats.fixed
        },
        floating: {
            start: startStats.floating,
            end: endStats.floating,
            change: endStats.floating - startStats.floating,
            changes: floatingChanges
        }
    };
};

// 區間期初 / 期末有效負債。
export const getRangeDebtStats = (debts = {}, debtEvents = {}, startDate, endDate) => {
    const startDebtDate = getLatestSnapshotDate(debts, startDate);
    const endDebtDate = getLatestSnapshotDate(debts, endDate);
    const startDebts = startDebtDate ? getEffectiveDebtSnapshotAtDate(debts, debtEvents, startDate) : [];
    const endDebts = endDebtDate ? getEffectiveDebtSnapshotAtDate(debts, debtEvents, endDate) : [];
    const startTotal = getDebtTotal(startDebts);
    const endTotal = getDebtTotal(endDebts);

    return {
        startDate: startDebtDate,
        endDate: endDebtDate,
        startDebts: startTotal,
        endDebts: endTotal,
        change: endTotal - startTotal
    };
};

// 區間花費總額、筆數與前 5 大類別。
export const getRangeExpenseStats = (expenses = {}, startDate, endDate) => {
    const { start, end } = toInclusiveRange(startDate, endDate);
    let total = 0;
    const categories = {};
    let count = 0;

    Object.values(expenses || {}).forEach((list) => {
        list.forEach(item => {
            const d = parseExpenseDate(item.date);
            if (d >= start && d <= end) {
                total += item.amount || 0;
                count++;
                const cat = item.category || '未分類';
                categories[cat] = (categories[cat] || 0) + (item.amount || 0);
            }
        });
    });

    const topCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return { total, count, topCategories };
};

// 區間財務推估：現金流、淨值變化、總創造價值、非收入變化。
export const getRangeFinanceStats = ({ incomeStats, assetStats, debtStats, expenseStats }) => {
    const cashFlow = incomeStats.total - expenseStats.total;
    const startNetWorth = assetStats.startAssets - debtStats.startDebts;
    const endNetWorth = assetStats.endAssets - debtStats.endDebts;
    const netWorthChange = endNetWorth - startNetWorth;
    const totalCreated = netWorthChange + expenseStats.total;
    const nonIncomeChange = totalCreated - incomeStats.total;

    return { cashFlow, startNetWorth, endNetWorth, netWorthChange, totalCreated, nonIncomeChange };
};

// 花費紀錄中出現過的帳戶（排序）。
export const getExpenseAccounts = (expenses = {}) => {
    const accs = new Set();
    Object.values(expenses || {}).forEach(list => {
        list.forEach(item => {
            if (item.account) accs.add(item.account);
        });
    });
    return Array.from(accs).sort();
};

// 對帳單：指定帳戶在區間內的花費，新到舊。
export const getStatementExpenses = (expenses = {}, account, startDate, endDate) => {
    if (!account) return [];
    const { start, end } = toInclusiveRange(startDate, endDate);

    const result = [];
    Object.values(expenses || {}).forEach((list) => {
        list.forEach(item => {
            const d = parseExpenseDate(item.date);
            if (item.account === account && d >= start && d <= end) result.push(item);
        });
    });
    return result.sort((a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date));
};

const pad2 = (n) => String(n).padStart(2, '0');

// 「近 N 個月」快捷區間：從 (本月 - N + 1) 的 1 號到本月最後一天（與 web 相同）。today 為 YYYY-MM-DD。
export const getRecentMonthsRange = (months, today) => {
    const [year, month] = today.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const start = new Date(year, month - 1 - months + 1, 1);
    return {
        startDate: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`,
        endDate: `${year}-${pad2(month)}-${pad2(lastDay)}`
    };
};

// 區間統計的完整資料：收入、資產、負債、花費與財務推估。
export const getRangeStats = (data = {}, startDate, endDate) => {
    const incomeStats = getRangeIncomeStats(data.incomes, startDate, endDate);
    const assetStats = getRangeAssetStats(data.records, startDate, endDate);
    const debtStats = getRangeDebtStats(data.debts, data.debtEvents, startDate, endDate);
    const expenseStats = getRangeExpenseStats(data.expenses, startDate, endDate);
    return {
        startDate,
        endDate,
        incomeStats,
        assetStats,
        debtStats,
        expenseStats,
        financeStats: getRangeFinanceStats({ incomeStats, assetStats, debtStats, expenseStats })
    };
};

// 對帳單預設區間：上個月 15 日到這個月 16 日（today 為 YYYY-MM-DD，本地日期）。
// web 原本用 Date.setMonth + toISOString：在 31 日會跳月、台灣早上 8 點前會差一天，這裡改用純日期計算。
export const getStatementDefaultRange = (today) => {
    const [year, month] = today.split('-').map(Number);
    const previous = new Date(year, month - 2, 1);
    return {
        startDate: `${previous.getFullYear()}-${pad2(previous.getMonth() + 1)}-15`,
        endDate: `${year}-${pad2(month)}-16`
    };
};

// 對帳單畫面資料：帳戶清單、區間內的花費（新到舊，附顯示標題與穩定 key）與總金額。
// key 用原始 id，沒有 id 的舊資料用帳戶、日期與序號，換帳戶時勾選不會互相影響。
export const getStatementView = (expenses = {}, account, startDate, endDate) => {
    const accounts = getExpenseAccounts(expenses);
    const selected = account && accounts.includes(account) ? account : (accounts[0] || '');
    const items = getStatementExpenses(expenses, selected, startDate, endDate).map((item, index) => ({
        key: item.id != null ? String(item.id) : `${selected}|${item.date}#${index}`,
        title: item.name || item.subCategory || item.category || '',
        date: item.date || '',
        category: item.category || '',
        amount: Number(item.amount) || 0
    }));
    return { accounts, account: selected, items, total: items.reduce((sum, item) => sum + item.amount, 0) };
};
