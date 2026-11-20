import { getExpenseImportSummary } from './expenses.js';

export const getSortedValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(getSortedValue);
    }

    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
                result[key] = getSortedValue(value[key]);
                return result;
            }, {});
    }

    return value;
};

export const areDataStructuresEqual = (a, b) => JSON.stringify(getSortedValue(a)) === JSON.stringify(getSortedValue(b));

export const buildCollectionDiff = (oldItems = [], newItems = [], getIdentityKey, getFullKey) => {
    const oldFullCount = new Map();
    const newFullCount = new Map();

    oldItems.forEach((item) => {
        const key = getFullKey(item);
        oldFullCount.set(key, (oldFullCount.get(key) || 0) + 1);
    });

    newItems.forEach((item) => {
        const key = getFullKey(item);
        newFullCount.set(key, (newFullCount.get(key) || 0) + 1);
    });

    const unchangedByFullKey = new Map();
    const allFullKeys = new Set([...oldFullCount.keys(), ...newFullCount.keys()]);
    allFullKeys.forEach((key) => {
        unchangedByFullKey.set(key, Math.min(oldFullCount.get(key) || 0, newFullCount.get(key) || 0));
    });

    const consumeUnchanged = (items, pool) => {
        const remaining = [];
        items.forEach((item) => {
            const key = getFullKey(item);
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

    const oldByIdentity = new Map();
    const newByIdentity = new Map();

    remainingOld.forEach((item) => {
        const key = getIdentityKey(item);
        if (!oldByIdentity.has(key)) oldByIdentity.set(key, []);
        oldByIdentity.get(key).push(item);
    });

    remainingNew.forEach((item) => {
        const key = getIdentityKey(item);
        if (!newByIdentity.has(key)) newByIdentity.set(key, []);
        newByIdentity.get(key).push(item);
    });

    const modified = [];
    const added = [];
    const removed = [];

    const allIdentityKeys = new Set([...oldByIdentity.keys(), ...newByIdentity.keys()]);
    allIdentityKeys.forEach((key) => {
        const oldGroup = oldByIdentity.get(key) || [];
        const newGroup = newByIdentity.get(key) || [];
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

export const flattenRecords = (records = {}) => Object.entries(records).flatMap(([date, items]) =>
    (items || []).map((item) => ({ ...item, date }))
);

export const flattenIncomeSources = (incomes = {}) => Object.entries(incomes).flatMap(([month, value]) =>
    (value?.sources || []).map((source) => ({ ...source, month, date: source.date || month }))
);

export const flattenMemos = (memos = {}) => Object.entries(memos).map(([date, content]) => ({ date, content: content || '' }));
export const flattenDebts = (debts = {}) => Object.entries(debts).flatMap(([date, items]) =>
    (items || []).map((item) => ({ ...item, date }))
);
export const flattenDebtEvents = (debtEvents = {}) => Object.entries(debtEvents).flatMap(([month, items]) =>
    (items || []).map((item) => ({ ...item, month }))
);
export const flattenStockHoldingSnapshots = (snapshots = {}) => Object.entries(snapshots).flatMap(([month, versions]) =>
    (versions || []).map((snapshot) => ({ ...snapshot, month }))
);

export const getRecordIdentityKey = (item) => [item.date || '', item.type || '', item.name || '', item.currency || 'TWD'].join('|');
export const getRecordFullKey = (item) => [getRecordIdentityKey(item), Number(item.amount) || 0, Number(item.originalAmount) || 0, Number(item.exchangeRate) || 0].join('|');

export const getIncomeIdentityKey = (item) => [item.month || '', item.company || '', item.bank || '', item.currency || 'TWD', item.memo || ''].join('|');
export const getIncomeFullKey = (item) => [getIncomeIdentityKey(item), item.date || '', Number(item.amount) || 0, Number(item.originalAmount) || 0, Number(item.exchangeRate) || 0].join('|');

export const getMemoIdentityKey = (item) => item.date || '';
export const getMemoFullKey = (item) => [item.date || '', item.content || ''].join('|');
export const getDebtIdentityKey = (item) => [item.date || '', item.name || '', item.lender || ''].join('|');
export const getDebtFullKey = (item) => [getDebtIdentityKey(item), Number(item.amount) || 0, item.memo || ''].join('|');
export const getDebtEventIdentityKey = (item) => [item.month || '', item.date || '', item.type || '', item.name || '', item.lender || '', item.memo || ''].join('|');
export const getDebtEventFullKey = (item) => [getDebtEventIdentityKey(item), Number(item.amount) || 0, JSON.stringify(getSortedValue(item.collateral || []))].join('|');
export const getStockTransactionIdentityKey = (item) => item.id || [item.market || 'TW', item.date || '', item.type || '', item.symbol || '', item.name || ''].join('|');
export const getStockTransactionFullKey = (item) => [getStockTransactionIdentityKey(item), JSON.stringify(getSortedValue(item))].join('|');
export const getStockSnapshotIdentityKey = (item) => item.id || [item.month || '', Number(item.version) || 0, item.importedAt || ''].join('|');
export const getStockSnapshotFullKey = (item) => [getStockSnapshotIdentityKey(item), JSON.stringify(getSortedValue(item))].join('|');

export const getJsonImportSummary = (currentData = {}, parsedData = {}) => {
    const currentRecords = currentData.records || {};
    const currentIncomes = currentData.incomes || {};
    const currentExpenses = currentData.expenses || {};
    const currentMemos = currentData.memos || {};
    const currentDebts = currentData.debts || {};
    const currentDebtEvents = currentData.debtEvents || {};
    const currentStockTransactions = currentData.stockTransactions || [];
    const currentStockSnapshots = currentData.stockHoldingSnapshots || {};

    const nextRecords = parsedData.records || {};
    const nextIncomes = parsedData.incomes || {};
    const nextExpenses = parsedData.expenses || {};
    const nextMemos = parsedData.memos || {};
    const nextDebts = parsedData.debts || {};
    const nextDebtEvents = parsedData.debtEvents || {};
    const nextStockTransactions = parsedData.stockTransactions || [];
    const nextStockSnapshots = parsedData.stockHoldingSnapshots || {};

    const recordDiff = buildCollectionDiff(flattenRecords(currentRecords), flattenRecords(nextRecords), getRecordIdentityKey, getRecordFullKey);
    const incomeDiff = buildCollectionDiff(flattenIncomeSources(currentIncomes), flattenIncomeSources(nextIncomes), getIncomeIdentityKey, getIncomeFullKey);
    const memoDiff = buildCollectionDiff(flattenMemos(currentMemos), flattenMemos(nextMemos), getMemoIdentityKey, getMemoFullKey);
    const debtDiff = buildCollectionDiff(flattenDebts(currentDebts), flattenDebts(nextDebts), getDebtIdentityKey, getDebtFullKey);
    const debtEventDiff = buildCollectionDiff(flattenDebtEvents(currentDebtEvents), flattenDebtEvents(nextDebtEvents), getDebtEventIdentityKey, getDebtEventFullKey);
    const stockTransactionDiff = buildCollectionDiff(currentStockTransactions, nextStockTransactions, getStockTransactionIdentityKey, getStockTransactionFullKey);
    const stockSnapshotDiff = buildCollectionDiff(flattenStockHoldingSnapshots(currentStockSnapshots), flattenStockHoldingSnapshots(nextStockSnapshots), getStockSnapshotIdentityKey, getStockSnapshotFullKey);
    const expenseSummary = getExpenseImportSummary(currentExpenses, nextExpenses);

    const sections = {
        records: {
            currentCount: Object.values(currentRecords).flat().length,
            nextCount: Object.values(nextRecords).flat().length,
            changed: recordDiff.hasChanges,
            diff: recordDiff
        },
        incomes: {
            currentCount: Object.values(currentIncomes).reduce((acc, curr) => acc + (curr.sources?.length || 0), 0),
            nextCount: Object.values(nextIncomes).reduce((acc, curr) => acc + (curr.sources?.length || 0), 0),
            changed: incomeDiff.hasChanges,
            diff: incomeDiff
        },
        expenses: {
            currentCount: Object.keys(currentExpenses).length,
            nextCount: Object.keys(nextExpenses).length,
            changed: expenseSummary.monthsCount > 0,
            diff: expenseSummary
        },
        memos: {
            currentCount: Object.keys(currentMemos).length,
            nextCount: Object.keys(nextMemos).length,
            changed: memoDiff.hasChanges,
            diff: memoDiff
        },
        debts: {
            currentCount: Object.values(currentDebts).flat().length,
            nextCount: Object.values(nextDebts).flat().length,
            changed: debtDiff.hasChanges,
            diff: debtDiff
        },
        debtEvents: {
            currentCount: Object.values(currentDebtEvents).flat().length,
            nextCount: Object.values(nextDebtEvents).flat().length,
            changed: debtEventDiff.hasChanges,
            diff: debtEventDiff
        },
        stockTransactions: {
            currentCount: currentStockTransactions.length,
            nextCount: nextStockTransactions.length,
            changed: stockTransactionDiff.hasChanges,
            diff: stockTransactionDiff
        },
        stockHoldingSnapshots: {
            currentCount: flattenStockHoldingSnapshots(currentStockSnapshots).length,
            nextCount: flattenStockHoldingSnapshots(nextStockSnapshots).length,
            changed: stockSnapshotDiff.hasChanges,
            diff: stockSnapshotDiff
        }
    };

    return {
        records: sections.records.nextCount,
        incomes: sections.incomes.nextCount,
        expenses: sections.expenses.nextCount,
        memos: sections.memos.nextCount,
        debts: sections.debts.nextCount,
        debtEvents: sections.debtEvents.nextCount,
        stockTransactions: sections.stockTransactions.nextCount,
        stockHoldingSnapshots: sections.stockHoldingSnapshots.nextCount,
        sections,
        hasChanges: Object.values(sections).some((section) => section.changed)
    };
};
