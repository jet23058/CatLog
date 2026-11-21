// 個股績效：持倉快照、個股損益彙總、市場統計、質押分攤、最新估值。
// 從 App.jsx 的 StockAnalysisView 搬出，邏輯保持原樣；「今天」由呼叫端傳入。
import { getDebtEstimatedAnnualInterest, getDebtMarketAllocation, getEffectiveDebtSnapshotAtDate, getMonthEndDateKey } from './debts.js';
import { formatMoney, formatMoneyByMarket } from './format.js';
import { getStockTradeDescription, getStockTradeLabel, getStockTradeTitle, normalizeSnapshotVersions } from './stocks.js';

const marketOf = (item) => item.market || 'TW';
const sumTradeAmounts = (trades, type) => trades
    .filter((trade) => trade.type === type)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

// 所有持倉快照版本攤平，依匯入時間新到舊。
export const getHoldingSnapshots = (stockHoldingSnapshots = {}) => Object.entries(stockHoldingSnapshots || {}).flatMap(([month, versions]) =>
    normalizeSnapshotVersions(versions).map((snapshot) => ({ ...snapshot, month, holdings: Array.isArray(snapshot.holdings) ? snapshot.holdings : [] }))
).sort((a, b) => new Date(b.importedAt || `${b.month}-01`).getTime() - new Date(a.importedAt || `${a.month}-01`).getTime());

// 各市場出現過的股票數（交易 + 持倉）。
export const getStockMarketCounts = (stockTransactions = [], holdingSnapshots = []) => {
    const sets = { TW: new Set(), US: new Set() };
    const addKey = (market, symbol) => {
        if (!symbol) return;
        const normalizedMarket = market || 'TW';
        const key = `${normalizedMarket}:${symbol}`;
        if (!sets[normalizedMarket]) sets[normalizedMarket] = new Set();
        sets[normalizedMarket].add(key);
    };

    (stockTransactions || []).forEach((trade) => {
        if (!trade.symbol || trade.type === 'deposit' || trade.unassigned) return;
        addKey(marketOf(trade), trade.symbol);
    });
    holdingSnapshots.forEach((snapshot) => {
        (snapshot.holdings || []).forEach((holding) => addKey(marketOf(holding), holding.symbol || holding.name));
    });

    return Object.fromEntries(Object.entries(sets).map(([market, values]) => [market, values.size]));
};

// 快照持股依「市場:代號」與「市場:名稱」建索引並加總。
export const buildHoldingMap = (snapshot, holdings = []) => {
    const map = {};
    holdings.forEach((holding) => {
        const keys = [holding.symbol, holding.name].filter(Boolean);
        keys.forEach((key) => {
            const mapKey = `${marketOf(holding)}:${key}`;
            map[mapKey] = {
                value: (map[mapKey]?.value || 0) + (Number(holding.marketValue) || 0),
                costAmount: (map[mapKey]?.costAmount || 0) + (Number(holding.costAmount) || 0),
                shares: (map[mapKey]?.shares || 0) + (Number(holding.shares) || 0),
                date: snapshot.month,
                holding
            };
        });
    });
    return map;
};

// 依日期區間篩選交易；兩端都空時回傳全部。
export const filterTransactionsByRange = (stockTransactions = [], rangeStart = '', rangeEnd = '') => {
    const hasRange = Boolean(rangeStart || rangeEnd);
    return (stockTransactions || []).filter((trade) => {
        if (!hasRange) return true;
        const date = trade.date || '';
        if (!date) return false;
        if (rangeStart && date < rangeStart) return false;
        if (rangeEnd && date > rangeEnd) return false;
        return true;
    });
};

// 個股損益列：買賣金額、股息、費用、快照市值、總損益與報酬率。依總損益高到低。
export const buildStockRows = (transactions = [], holdingMap = {}, selectedSnapshot = null) => {
    const bySymbol = {};
    transactions.forEach((trade) => {
        if (!trade.symbol || trade.type === 'deposit' || trade.unassigned) return;
        const symbol = trade.symbol;
        const market = marketOf(trade);
        const rowKey = `${market}:${symbol}`;
        if (!bySymbol[rowKey]) {
            bySymbol[rowKey] = { key: rowKey, symbol, name: trade.name || symbol, market, currency: trade.currency || (market === 'US' ? 'USD' : 'TWD'), buyAmount: 0, sellAmount: 0, dividends: 0, fees: 0, tradeCount: 0, latestTradeDate: trade.date, realizedOnly: false };
        }
        const row = bySymbol[rowKey];
        row.tradeCount += 1;
        if (trade.source === 'csv-us-realized') row.realizedOnly = true;
        if (!row.latestTradeDate || new Date(trade.date) > new Date(row.latestTradeDate)) row.latestTradeDate = trade.date;
        if (trade.type === 'buy') row.buyAmount += Number(trade.amount) || 0;
        if (trade.type === 'sell') row.sellAmount += Number(trade.amount) || 0;
        if (trade.type === 'dividend') row.dividends += Number(trade.amount) || 0;
        if (trade.type === 'fee') row.fees += Number(trade.amount) || 0;
    });

    Object.values(holdingMap).forEach((snapshot) => {
        const holding = snapshot.holding;
        const symbol = holding.symbol || holding.name;
        const market = marketOf(holding);
        const rowKey = `${market}:${symbol}`;
        if (!symbol || bySymbol[rowKey]) return;
        bySymbol[rowKey] = { key: rowKey, symbol, name: holding.name || symbol, market, currency: market === 'US' ? 'USD' : 'TWD', buyAmount: 0, sellAmount: 0, dividends: 0, fees: 0, tradeCount: 0, latestTradeDate: selectedSnapshot?.month || '', realizedOnly: false };
    });

    return Object.values(bySymbol).map((row) => {
        const snapshot = holdingMap[`${row.market}:${row.symbol}`] || holdingMap[`${row.market}:${row.name}`];
        const marketValue = snapshot?.value || 0;
        const pnlMarketValue = row.realizedOnly ? 0 : marketValue;
        const totalPnl = pnlMarketValue + row.sellAmount + row.dividends - row.buyAmount - row.fees;
        return { ...row, marketValue, snapshotDate: snapshot?.date || null, totalPnl, roi: row.buyAmount > 0 ? totalPnl / row.buyAmount : 0, hasSnapshot: Boolean(snapshot) };
    }).sort((a, b) => b.totalPnl - a.totalPnl);
};

// 單一市場的總計：買入、市值、股息、利息、入金、出金、總損益（含未歸屬股息）。
export const getStockStats = (rows = [], transactions = []) => ({
    totalBuy: rows.reduce((sum, item) => sum + item.buyAmount, 0),
    totalMarketValue: rows.reduce((sum, item) => sum + item.marketValue, 0),
    totalDividends: sumTradeAmounts(transactions, 'dividend'),
    totalInterest: sumTradeAmounts(transactions, 'interest'),
    totalDeposits: sumTradeAmounts(transactions, 'deposit'),
    totalWithdrawals: sumTradeAmounts(transactions, 'withdrawal'),
    totalPnl: rows.reduce((sum, item) => sum + item.totalPnl, 0) + transactions
        .filter((trade) => trade.type === 'dividend' && trade.unassigned)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
});

// 計算質押負債要用的基準日：無區間時用快照月底，有區間時用結束日，否則用最新交易日，再不然用今天。
export const getStockStatsTargetDate = ({ hasRange, selectedSnapshot, rangeEnd, transactions = [], today }) => {
    if (!hasRange && selectedSnapshot?.month) return getMonthEndDateKey(selectedSnapshot.month);
    if (rangeEnd) return rangeEnd;
    const latestTradeDate = [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date;
    return latestTradeDate || today;
};

// 股票質押依市場分攤後的負債、估算利息，以及扣除質押後淨損益。
export const getStockDebtStats = ({ debts = {}, debtEvents = {}, market, targetDate, totalPnl }) => {
    const latestDebtItems = getEffectiveDebtSnapshotAtDate(debts, debtEvents, targetDate);
    const debtSnapshotDate = Object.keys(debts || {})
        .filter((date) => date <= targetDate)
        .sort()
        .at(-1) || null;
    let marketPledgeDebt = 0;
    let totalPledgeDebt = 0;
    let unallocatedPledgeDebt = 0;
    let marketEstimatedAnnualInterest = 0;

    latestDebtItems.forEach((debt) => {
        if (debt.category !== 'stock_pledge') return;
        const amount = Number(debt.amount) || 0;
        if (amount <= 0) return;
        totalPledgeDebt += amount;
        const estimatedAnnualInterest = getDebtEstimatedAnnualInterest(debt);
        const allocation = getDebtMarketAllocation(debt);
        const marketShare = allocation[market] || 0;
        if (Object.keys(allocation).length === 0) {
            unallocatedPledgeDebt += amount;
            return;
        }
        marketPledgeDebt += amount * marketShare;
        marketEstimatedAnnualInterest += estimatedAnnualInterest * marketShare;
    });

    return {
        debtSnapshotDate,
        marketPledgeDebt,
        totalPledgeDebt,
        unallocatedPledgeDebt,
        marketEstimatedAnnualInterest,
        marketEstimatedMonthlyInterest: marketEstimatedAnnualInterest / 12,
        netPnlAfterDebt: totalPnl - marketPledgeDebt
    };
};

// 用最新股價試算快照市值差異與估計總損益；不改寫快照。quotes 以 holding.id 為 key。
export const getLatestSnapshotEstimate = ({ rows = [], holdings = [], quotes = {}, totalPnl, marketPledgeDebt }) => {
    const rowMap = new Map();
    rows.forEach((row) => {
        rowMap.set(`${row.market}:${row.symbol}`, row);
        rowMap.set(`${row.market}:${row.name}`, row);
    });

    let quotedCount = 0;
    let eligibleQuoteCount = 0;
    let marketValueDiff = 0;
    let latestMarketValue = 0;

    holdings.forEach((holding) => {
        const market = marketOf(holding);
        const quote = quotes[holding.id];
        const shares = Number(holding.shares) || 0;
        const snapshotValue = Number(holding.marketValue) || 0;
        const latestValue = quote ? (Number(quote.price) || 0) * shares : snapshotValue;
        latestMarketValue += latestValue;

        if (!quote) return;
        quotedCount += 1;

        const row = rowMap.get(`${market}:${holding.symbol}`) || rowMap.get(`${market}:${holding.name}`);
        if (row?.realizedOnly) return;

        eligibleQuoteCount += 1;
        marketValueDiff += latestValue - snapshotValue;
    });

    const estimatedTotalPnl = totalPnl + marketValueDiff;
    return {
        hasEstimate: quotedCount > 0,
        quotedCount,
        eligibleQuoteCount,
        holdingCount: holdings.length,
        latestMarketValue,
        marketValueDiff,
        estimatedTotalPnl,
        estimatedNetPnlAfterDebt: estimatedTotalPnl - marketPledgeDebt
    };
};

// 損益金額標籤：台股顯示整數；美股預設 (USD)，currency 為 'TWD' 時依匯率換算台幣。
export const formatStockPnlLabel = (amount, { market, usdToTwdRate, currency }) => {
    const sign = amount >= 0 ? '+' : '';
    if (market !== 'US') return `${sign}${formatMoney(amount)}`;
    if (currency === 'TWD') return `NT$${sign}${formatMoney(amount * usdToTwdRate)}`;
    return `(USD) ${sign}${formatMoneyByMarket(amount, 'US')}`;
};

// 損益長條圖：取影響最大的 8 檔，長條寬度最小 6%。
export const getStockChartRows = (rows = []) => {
    const top = [...rows]
        .sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl))
        .slice(0, 8);
    const maxAbs = Math.max(...top.map((item) => Math.abs(item.totalPnl)), 1);
    return top.map((item) => ({ ...item, barWidth: Math.max(6, Math.round((Math.abs(item.totalPnl) / maxAbs) * 100)) }));
};

// 依市場篩選出有持股的快照版本，並選出目前要用的那一版（找不到指定 id 時用最新一版）。
export const getMarketSnapshots = (holdingSnapshots = [], market = 'TW', snapshotId = '') => {
    const visible = holdingSnapshots.filter((snapshot) => (snapshot.holdings || []).some((holding) => marketOf(holding) === market));
    const selected = visible.find((snapshot) => snapshot.id === snapshotId) || visible[0] || null;
    const holdings = selected ? (selected.holdings || []).filter((holding) => marketOf(holding) === market) : [];
    return { visible, selected, holdings };
};

// 賺最多 / 虧最多：rows 已依總損益由高到低排序。
export const getStockLeaders = (rows = [], limit = 5) => ({
    winners: rows.filter((item) => item.totalPnl > 0).slice(0, limit),
    losers: [...rows].filter((item) => item.totalPnl < 0).sort((a, b) => a.totalPnl - b.totalPnl).slice(0, limit)
});

/**
 * 個股績效頁的完整資料（唯讀），web 的 StockAnalysisView 與 iOS 共用同一套計算。
 * options：market（'TW' | 'US'）、snapshotId、rangeStart / rangeEnd（YYYY-MM-DD，可空）、today（YYYY-MM-DD）。
 * 有日期區間時只計算區間內交易，不納入持倉快照市值（與 web 相同）。
 */
export const getStockOverview = (data = {}, { market = 'TW', snapshotId = '', rangeStart = '', rangeEnd = '', today } = {}) => {
    const holdingSnapshots = getHoldingSnapshots(data.stockHoldingSnapshots);
    const { visible, selected, holdings } = getMarketSnapshots(holdingSnapshots, market, snapshotId);
    const hasRange = Boolean(rangeStart || rangeEnd);
    const holdingMap = selected ? buildHoldingMap(selected, holdings) : {};
    const activeTransactions = filterTransactionsByRange(data.stockTransactions, rangeStart, rangeEnd);
    const rows = buildStockRows(activeTransactions, hasRange ? {} : holdingMap, selected).filter((row) => row.market === market);
    const marketTransactions = activeTransactions.filter((trade) => marketOf(trade) === market);
    const stats = getStockStats(rows, marketTransactions);
    const targetDate = getStockStatsTargetDate({ hasRange, selectedSnapshot: selected, rangeEnd, transactions: marketTransactions, today });
    const debtStats = getStockDebtStats({ debts: data.debts, debtEvents: data.debtEvents, market, targetDate, totalPnl: stats.totalPnl });

    return {
        market,
        hasRange,
        marketCounts: getStockMarketCounts(data.stockTransactions, holdingSnapshots),
        snapshots: visible.map(({ id, month, version, note, importedAt, holdings: items }) => ({
            id, month, version, note: note || '', importedAt: importedAt || '',
            holdingCount: (items || []).filter((holding) => marketOf(holding) === market).length
        })),
        selectedSnapshotId: selected?.id || null,
        holdings,
        rows,
        stats,
        targetDate,
        debtStats,
        ...getStockLeaders(rows),
        // 排行榜「查看全部」與損益長條圖（與 web 相同的規則）。
        allWinners: getStockLeaders(rows, Infinity).winners,
        allLosers: getStockLeaders(rows, Infinity).losers,
        chartRows: getStockChartRows(rows),
        transactionCount: marketTransactions.length
    };
};

// 單一股票的交易明細（新到舊），套用同樣的日期區間。
export const getStockTrades = (data = {}, { market = 'TW', symbol, rangeStart = '', rangeEnd = '' } = {}) => (
    filterTransactionsByRange(data.stockTransactions, rangeStart, rangeEnd)
        .filter((trade) => marketOf(trade) === market && trade.symbol === symbol)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
);

// 交易明細加上顯示用文字（類別、標題、說明），讓 iOS 與 web 顯示一致。
export const describeStockTrades = (trades = []) => trades.map((trade) => ({
    ...trade,
    label: getStockTradeLabel(trade.type),
    title: getStockTradeTitle(trade),
    description: getStockTradeDescription(trade)
}));

// 「最新估值」：用抓到的最新價試算目前快照的市值與「若未賣出」損益，不改寫快照。
// quotes：{ [holding.id]: { price } }。holdings 每檔附上最新價、最新估值與差異，web 與 iOS 顯示相同。
export const getStockQuoteEstimate = (data = {}, options = {}, quotes = {}) => {
    const overview = getStockOverview(data, options);
    const estimate = getLatestSnapshotEstimate({
        rows: overview.rows,
        holdings: overview.holdings,
        quotes,
        totalPnl: overview.stats.totalPnl,
        marketPledgeDebt: overview.debtStats.marketPledgeDebt
    });
    const holdings = overview.holdings.map((holding) => {
        const quote = quotes[holding.id];
        const shares = Number(holding.shares) || 0;
        const snapshotValue = Number(holding.marketValue) || 0;
        const latestPrice = quote ? Number(quote.price) || 0 : null;
        const latestValue = quote ? latestPrice * shares : null;
        const diff = quote ? latestValue - snapshotValue : null;
        return {
            id: holding.id || '',
            market: marketOf(holding),
            symbol: holding.symbol || '',
            name: holding.name || holding.symbol || '',
            shares,
            snapshotPrice: Number(holding.marketPrice) || 0,
            snapshotValue,
            latestPrice,
            latestValue,
            diff,
            diffRate: quote && snapshotValue ? diff / snapshotValue : null
        };
    });
    return { ...estimate, holdings };
};
