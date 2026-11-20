// 首頁儀表板：年度統計、每月資產趨勢、FIRE。
// 從 App.jsx 的 MainApp 搬出，邏輯保持原樣；「今天 / 今年」一律由呼叫端傳入。
import { getDebtTotal } from './debts.js';
import { getLatestSnapshotTotal } from './snapshots.js';

const sumAmounts = (items) => (items || []).reduce((sum, item) => sum + (item.amount || 0), 0);

// 有任何資料（資產、收入、備忘錄、花費、負債、負債異動）的年份，新到舊，不含未來年份。
export const getAvailableYears = (data, thisYear) => {
    const years = new Set();
    Object.keys(data.records || {}).forEach(d => years.add(new Date(d).getFullYear()));
    Object.keys(data.incomes || {}).forEach(d => years.add(parseInt(d.split('-')[0])));
    Object.keys(data.memos || {}).forEach(d => years.add(new Date(d).getFullYear()));
    Object.keys(data.expenses || {}).forEach(d => years.add(parseInt(d.split('-')[0])));
    Object.keys(data.debts || {}).forEach(d => years.add(new Date(d).getFullYear()));
    Object.keys(data.debtEvents || {}).forEach(d => years.add(parseInt(d.split('-')[0])));

    return Array.from(years).filter(y => y <= thisYear).sort((a, b) => b - a);
};

export const getYearEndAssets = (year, data) => (
    getLatestSnapshotTotal(data.records, `${year}-12-31`, (assets) => sumAmounts(assets))
);

export const getYearEndDebt = (year, data) => (
    getLatestSnapshotTotal(data.debts, `${year}-12-31`, (debts) => getDebtTotal(debts))
);

export const getAssetRecordDatesInYear = (year, data) => (
    Object.entries(data.records || {})
        .filter(([dateStr, assets]) => new Date(dateStr).getFullYear() === year && Array.isArray(assets) && assets.length > 0)
        .map(([dateStr]) => dateStr)
        .sort()
);

export const getNetAssetsAtDate = (dateStr, data) => {
    const grossAssets = (data.records?.[dateStr] || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const debts = getLatestSnapshotTotal(data.debts, dateStr, (items) => getDebtTotal(items));
    return grossAssets - debts;
};

// 年度資產增長：本年度第一筆與最後一筆實際資產紀錄的淨值差。
export const getYearAssetGrowthRange = (year, data) => {
    const dates = getAssetRecordDatesInYear(year, data);
    if (dates.length === 0) {
        return { startDate: null, endDate: null, startAssets: 0, endAssets: 0, amount: 0, percentage: 0, ratio: 0 };
    }

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const startAssets = getNetAssetsAtDate(startDate, data);
    const endAssets = getNetAssetsAtDate(endDate, data);
    const amount = endAssets - startAssets;
    const percentage = startAssets > 0 ? amount / startAssets : 0;
    const ratio = startAssets > 0 ? endAssets / startAssets : 0;

    return { startDate, endDate, startAssets, endAssets, amount, percentage, ratio };
};

export const getYearTotalIncome = (year, data) => {
    let total = 0;
    Object.entries(data.incomes || {}).forEach(([dateStr, incomeData]) => {
        const y = parseInt(dateStr.split('-')[0]);
        if (y === year) total += (incomeData.totalAmount || 0);
    });
    return total;
};

// 年份選單用：每年年底淨資產、收入年增率、收入佔總收入比例。舊到新。
export const getYearlyTrendData = (data, availableYears) => {
    const totalAllTimeIncome = Object.values(data.incomes || {}).reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    return availableYears.map(year => {
        const income = getYearTotalIncome(year, data);
        const lastYearIncome = getYearTotalIncome(year - 1, data);
        const incomeGrowthRate = lastYearIncome > 0 ? income / lastYearIncome : 0;
        const incomeShare = totalAllTimeIncome > 0 ? income / totalAllTimeIncome : 0;
        return {
            year,
            assets: getYearEndAssets(year, data) - getYearEndDebt(year, data),
            incomeGrowthRate,
            incomeShare
        };
    }).sort((a, b) => a.year - b.year);
};

// 指定年度 12 個月的資產、負債、收入、花費、結餘與分析指標。
export const getMonthlyStats = (data, year) => {
    const monthlyStats = Array(12).fill(0).map((_, i) => ({ month: i + 1, assets: 0, grossAssets: 0, debts: 0, income: 0, cost: 0, balance: 0, memo: null, hasRecord: false, latestDate: null, allRecords: [], analysis: { incomeDiff: 0, assetDiff: 0, compositeScore: 0 } }));
    const monthRecordsMap = new Map();
    const monthDebtMap = new Map();

    Object.entries(data.records || {}).forEach(([dateStr, assets]) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year) {
            const totalAssets = assets.reduce((sum, item) => sum + (item.amount || 0), 0);
            if (!Array.isArray(assets) || assets.length === 0 || totalAssets <= 0) return;
            const monthIdx = date.getMonth();
            if (!monthRecordsMap.has(monthIdx)) monthRecordsMap.set(monthIdx, []);
            monthRecordsMap.get(monthIdx).push({ dateStr, assets: totalAssets });
        }
    });

    Object.entries(data.debts || {}).forEach(([dateStr, debts]) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year) {
            const monthIdx = date.getMonth();
            if (!monthDebtMap.has(monthIdx)) monthDebtMap.set(monthIdx, []);
            monthDebtMap.get(monthIdx).push({ dateStr, debt: getDebtTotal(debts) });
        }
    });

    monthRecordsMap.forEach((records, monthIdx) => {
        records.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
        const latest = records[records.length - 1];
        monthlyStats[monthIdx].hasRecord = true;
        monthlyStats[monthIdx].grossAssets = latest.assets;
        monthlyStats[monthIdx].latestDate = latest.dateStr;
        monthlyStats[monthIdx].allRecords = records;
    });

    monthDebtMap.forEach((records, monthIdx) => {
        records.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
        const latest = records[records.length - 1];
        monthlyStats[monthIdx].debts = latest.debt;
        if (!monthlyStats[monthIdx].latestDate) monthlyStats[monthIdx].latestDate = latest.dateStr;
    });

    for (let i = 0; i < 12; i++) {
        if (!monthlyStats[i].hasRecord) {
            monthlyStats[i].grossAssets = 0;
            monthlyStats[i].debts = 0;
            monthlyStats[i].assets = 0;
            continue;
        }

        const monthEndDay = new Date(year, i + 1, 0).getDate();
        const monthEndKey = `${year}-${String(i + 1).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;
        monthlyStats[i].debts = getLatestSnapshotTotal(data.debts, monthEndKey, (debts) => getDebtTotal(debts));
        monthlyStats[i].assets = monthlyStats[i].grossAssets - monthlyStats[i].debts;
        monthlyStats[i].allRecords = monthlyStats[i].allRecords.map((record) => ({
            ...record,
            assets: record.assets - getLatestSnapshotTotal(data.debts, record.dateStr, (debts) => getDebtTotal(debts))
        }));
    }

    Object.entries(data.incomes || {}).forEach(([dateStr, incomeData]) => {
        const [yearStr, monthStr] = dateStr.split('-');
        if (parseInt(yearStr) === year) {
            const monthIdx = parseInt(monthStr) - 1;
            monthlyStats[monthIdx].income = incomeData.totalAmount || 0;
            if (!monthlyStats[monthIdx].latestDate) monthlyStats[monthIdx].latestDate = `${dateStr}-01`;
        }
    });

    Object.keys(data.expenses || {}).forEach(monthStr => {
        const [yStr, mStr] = monthStr.split('-');
        if (parseInt(yStr) === year) {
            const mIdx = parseInt(mStr) - 1;
            const cost = data.expenses[monthStr].reduce((acc, curr) => acc + curr.amount, 0);
            monthlyStats[mIdx].cost = cost;
            if (!monthlyStats[mIdx].latestDate) monthlyStats[mIdx].latestDate = `${monthStr}-01`;
        }
    });

    Object.entries(data.memos || {}).forEach(([dateStr, content]) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year) {
            const monthIdx = date.getMonth();
            monthlyStats[monthIdx].memo = content;
            if (!monthlyStats[monthIdx].latestDate) monthlyStats[monthIdx].latestDate = dateStr;
        }
    });

    // 取得去年12月的收入作為初始比較基準 (若無則為0)
    const prevYearDecKey = `${year - 1}-12`;
    let prevIncome = (data.incomes || {})[prevYearDecKey]?.totalAmount || 0;
    let prevAsset = getYearEndAssets(year - 1, data) - getYearEndDebt(year - 1, data);

    for (let i = 0; i < 12; i++) {
        const currentAsset = monthlyStats[i].assets;
        const currentIncome = monthlyStats[i].income;
        const cost = monthlyStats[i].cost || 0;
        const hasAssetRecord = monthlyStats[i].hasRecord;

        monthlyStats[i].balance = hasAssetRecord ? (currentAsset - prevAsset) - cost : -cost;

        const incomeDiff = currentIncome - prevIncome;
        const assetDiff = hasAssetRecord ? currentAsset - prevAsset : 0;
        const compositeScore = incomeDiff + assetDiff;
        monthlyStats[i].analysis = { incomeDiff, assetDiff, compositeScore };

        if (hasAssetRecord) prevAsset = currentAsset;
        prevIncome = currentIncome;
    }

    return monthlyStats;
};

// 年度最高 / 最低淨資產（只看有實際紀錄的點）。
export const getAssetExtremes = (monthlyStats) => {
    let allPoints = [];
    monthlyStats.forEach(m => {
        if (m.hasRecord) allPoints = [...allPoints, ...m.allRecords.map(r => ({ val: r.assets, month: m.month }))];
    });
    if (allPoints.length === 0) return { max: { val: 0, month: 0 }, min: { val: 0, month: 0 } };
    const max = allPoints.reduce((prev, current) => (prev.val > current.val) ? prev : current);
    const min = allPoints.reduce((prev, current) => (prev.val < current.val) ? prev : current);
    return { max, min };
};

// 年度統計卡片。
export const getYearStats = (data, year) => {
    const thisYearIncome = getYearTotalIncome(year, data);
    const lastYearIncome = getYearTotalIncome(year - 1, data);
    const avgIncome = thisYearIncome / 12;

    // 「資產年增長」卡片沿用此欄位名稱，實際是今年收入 / 去年收入。
    const assetGrowthRate = lastYearIncome > 0 ? (thisYearIncome / lastYearIncome) : 0;

    // 「總所得%數」：今年收入 / 累積總收入。
    const totalAccumulatedIncome = Object.values(data.incomes || {}).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const incomeGrowthRate = totalAccumulatedIncome > 0 ? (thisYearIncome / totalAccumulatedIncome) : 0;

    const growthRange = getYearAssetGrowthRange(year, data);

    return {
        totalIncome: thisYearIncome,
        lastYearIncome,
        avgIncome,
        assetGrowthRate,
        incomeGrowthRate,
        totalAccumulatedIncome,
        thisYearAssets: growthRange.endAssets,
        lastYearAssets: growthRange.startAssets,
        assetGrowthStartDate: growthRange.startDate,
        assetGrowthEndDate: growthRange.endDate,
        thisYearDebt: getYearEndDebt(year, data),
        realAssetGrowthAmount: growthRange.amount,
        realAssetGrowthPercentage: growthRange.percentage,
        assetGrowthRatio: growthRange.ratio
    };
};

// FIRE：平均月支出、目標金額（年支出 / 提領率）、目前淨資產與達成率。
export const getFireStats = (data) => {
    const rate = data.fireSettings?.withdrawalRate || 4.0;
    const expenseMonths = Object.keys(data.expenses || {});
    let avgExpense = 0;

    if (expenseMonths.length > 0) {
        const totalExpense = Object.values(data.expenses).flat().reduce((sum, item) => sum + (item.amount || 0), 0);
        avgExpense = totalExpense / expenseMonths.length;
    }

    const annualExpense = avgExpense * 12;
    const fireTarget = rate > 0 ? annualExpense / (rate / 100) : 0;

    let currentAssets = 0;
    const sortedDates = Object.keys(data.records || {}).sort((a, b) => new Date(b) - new Date(a));
    if (sortedDates.length > 0) {
        currentAssets = sumAmounts(data.records[sortedDates[0]]) - getLatestSnapshotTotal(data.debts, sortedDates[0], (debts) => getDebtTotal(debts));
    }

    return { avgExpense, fireTarget, currentAssets, progress: fireTarget > 0 ? currentAssets / fireTarget : 0, rate };
};

// FIRE 視窗的每年花費統計：平均、最高、最低月份。新到舊。
export const getFireYearlyStats = (expenses = {}) => {
    const stats = {};
    Object.entries(expenses || {}).forEach(([monthStr, items]) => {
        const year = parseInt(monthStr.split('-')[0]);
        const month = parseInt(monthStr.split('-')[1]);
        const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

        if (!stats[year]) stats[year] = { total: 0, months: 0, records: [] };
        stats[year].total += total;
        stats[year].months += 1;
        stats[year].records.push({ month, val: total });
    });

    return Object.entries(stats)
        .sort((a, b) => b[0] - a[0])
        .map(([year, d]) => {
            const max = d.records.reduce((prev, curr) => (prev.val > curr.val) ? prev : curr, { val: 0, month: 0 });
            const min = d.records.reduce((prev, curr) => (prev.val < curr.val) ? prev : curr, { val: Infinity, month: 0 });
            return {
                year,
                avg: d.total / d.months,
                max,
                min: min.val === Infinity ? { val: 0, month: 0 } : min
            };
        });
};
