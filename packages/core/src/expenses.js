import { DEFAULT_EXCHANGE_RATES } from './data.js';
import { parseCSV } from './csv.js';

export const processExpenseCSVText = (csvText, onSuccess, onError) => {
    try {
        const rows = parseCSV(csvText);

        if (rows.length === 0) throw new Error("CSV 檔案是空的");

        const headers = rows[0];
        const idxDate = headers.indexOf('日期');
        const idxAccount = headers.indexOf('帳戶');
        const idxName = headers.indexOf('名稱');
        const idxAmount = headers.indexOf('金額');
        const idxMainCat = headers.indexOf('主類別');
        const idxSubCat = headers.indexOf('子類別');
        const idxType = headers.indexOf('類型');
        const idxCurrency = headers.indexOf('幣種');

        if (idxDate === -1 || idxAmount === -1) throw new Error("CSV 格式不符，找不到日期或金額欄位");

        const expensesByMonth = {};

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < headers.length) continue;
            // Removed strict type filtering to allow refunds/other types
            // if (idxType !== -1 && row[idxType] !== '支出') continue;

            const dateStr = row[idxDate];
            const dateParts = dateStr.split('/');
            if (dateParts.length !== 3) continue;

            const y = dateParts[0];
            const m = dateParts[1].padStart(2, '0');
            const d = dateParts[2].padStart(2, '0');
            const isoDate = `${y}-${m}-${d}`;
            const monthKey = `${y}-${m}`;

            let amountStr = row[idxAmount];
            amountStr = amountStr.replace(/,/g, '');
            let rawAmount = parseFloat(amountStr);

            if (isNaN(rawAmount)) continue;

            // Handle sign based on type if available
            if (idxType !== -1) {
                if (row[idxType] === '支出') {
                    rawAmount = Math.abs(rawAmount);
                } else {
                    // Treat other types (refunds, income, etc.) as negative expenses (credits)
                    rawAmount = -Math.abs(rawAmount);
                }
            } else {
                // Legacy behavior: treat as expense (positive) if no type specified
                rawAmount = Math.abs(rawAmount);
            }

            const currencyCode = idxCurrency !== -1 ? row[idxCurrency] : 'TWD';
            const rate = DEFAULT_EXCHANGE_RATES[currencyCode] || 1;
            const twdAmount = Math.round(rawAmount * rate);

            if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = [];

            expensesByMonth[monthKey].push({
                date: isoDate,
                account: idxAccount !== -1 ? row[idxAccount] : 'Unknown',
                category: idxMainCat !== -1 ? row[idxMainCat] : '',
                subCategory: idxSubCat !== -1 ? row[idxSubCat] : '',
                name: idxName !== -1 ? row[idxName] : '',
                amount: twdAmount,
                originalAmount: rawAmount,
                currency: currencyCode,
                id: `csv-${i}-${Date.now()}`
            });
        }
        onSuccess(expensesByMonth);
    } catch (err) {
        console.error(err);
        onError(err.message);
    }
};

export const getExpenseIdentityKey = (item) => [
    item.date || '',
    item.account || '',
    item.category || '',
    item.subCategory || '',
    item.name || '',
    item.currency || 'TWD'
].join('|');

export const getExpenseFullKey = (item) => [
    getExpenseIdentityKey(item),
    Number(item.amount) || 0
].join('|');

export const buildExpenseDiff = (oldItems = [], newItems = []) => {
    const oldFullCount = new Map();
    const newFullCount = new Map();
    const oldIdentityMap = new Map();
    const newIdentityMap = new Map();

    oldItems.forEach((item) => {
        const fullKey = getExpenseFullKey(item);
        oldFullCount.set(fullKey, (oldFullCount.get(fullKey) || 0) + 1);

        const identityKey = getExpenseIdentityKey(item);
        if (!oldIdentityMap.has(identityKey)) oldIdentityMap.set(identityKey, []);
        oldIdentityMap.get(identityKey).push(item);
    });

    newItems.forEach((item) => {
        const fullKey = getExpenseFullKey(item);
        newFullCount.set(fullKey, (newFullCount.get(fullKey) || 0) + 1);

        const identityKey = getExpenseIdentityKey(item);
        if (!newIdentityMap.has(identityKey)) newIdentityMap.set(identityKey, []);
        newIdentityMap.get(identityKey).push(item);
    });

    const unchangedByFullKey = new Map();
    const allFullKeys = new Set([...oldFullCount.keys(), ...newFullCount.keys()]);
    allFullKeys.forEach((key) => {
        unchangedByFullKey.set(key, Math.min(oldFullCount.get(key) || 0, newFullCount.get(key) || 0));
    });

    const consumeUnchanged = (items, pool) => {
        const remaining = [];
        items.forEach((item) => {
            const key = getExpenseFullKey(item);
            const count = pool.get(key) || 0;
            if (count > 0) {
                pool.set(key, count - 1);
            } else {
                remaining.push(item);
            }
        });
        return remaining;
    };

    const remainingOld = consumeUnchanged(oldItems, new Map(unchangedByFullKey));
    const remainingNew = consumeUnchanged(newItems, new Map(unchangedByFullKey));

    const removedByIdentity = new Map();
    const addedByIdentity = new Map();

    remainingOld.forEach((item) => {
        const key = getExpenseIdentityKey(item);
        if (!removedByIdentity.has(key)) removedByIdentity.set(key, []);
        removedByIdentity.get(key).push(item);
    });

    remainingNew.forEach((item) => {
        const key = getExpenseIdentityKey(item);
        if (!addedByIdentity.has(key)) addedByIdentity.set(key, []);
        addedByIdentity.get(key).push(item);
    });

    const modified = [];
    const added = [];
    const removed = [];

    const allIdentityKeys = new Set([...removedByIdentity.keys(), ...addedByIdentity.keys()]);
    allIdentityKeys.forEach((key) => {
        const oldGroup = removedByIdentity.get(key) || [];
        const newGroup = addedByIdentity.get(key) || [];
        const pairCount = Math.min(oldGroup.length, newGroup.length);

        for (let i = 0; i < pairCount; i++) {
            modified.push({ before: oldGroup[i], after: newGroup[i] });
        }

        oldGroup.slice(pairCount).forEach((item) => removed.push(item));
        newGroup.slice(pairCount).forEach((item) => added.push(item));
    });

    return {
        hasChanges: modified.length > 0 || added.length > 0 || removed.length > 0,
        added,
        removed,
        modified
    };
};

export const getExpenseImportSummary = (currentExpenses = {}, pendingExpenses = {}) => {
    const months = Object.keys(pendingExpenses).sort();
    const changedMonths = months
        .map((month) => {
            const oldItems = currentExpenses?.[month] || [];
            const newItems = pendingExpenses?.[month] || [];
            const diff = buildExpenseDiff(oldItems, newItems);

            return diff.hasChanges ? {
                month,
                oldItems,
                newItems,
                diff
            } : null;
        })
        .filter(Boolean);

    return {
        monthsCount: changedMonths.length,
        totalRecords: Object.values(pendingExpenses).flat().length,
        months: changedMonths.map((entry) => entry.month),
        changedMonths
    };
};
