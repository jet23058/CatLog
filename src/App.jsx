import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Cat, ChevronLeft, ChevronRight, Plus, Upload, Wallet, TrendingUp, DollarSign, Calendar, X, Save, FileJson, ArrowUpRight, ArrowDownRight, ArrowLeft, ArrowRight, Edit2, Trash2, Info, Check, TrendingDown, RefreshCw, FileText, Mountain, ArrowDown, AlertCircle, AlertTriangle, Building2, Lock, PieChart as PieChartIcon, Download, StickyNote, ShoppingBag, Filter, ChevronDown, PiggyBank, Activity, Sparkles, LogOut, Coins, ClipboardCheck, LayoutGrid, Package, Box, Footprints, Eye, EyeOff, ScanFace, ShieldCheck, ShieldAlert, Search } from 'lucide-react';

// --- CSS 樣式與 Tailwind 設定模擬 ---
// 原本 index.css 的內容與 tailwind.config.js 的動畫設定整合於此
const GlobalStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

    body {
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      font-family: 'Inter', sans-serif;
    }

    .font-serif-tc { font-family: 'Noto Serif TC', serif; }
    .font-inter { font-family: 'Inter', sans-serif; }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Tailwind Config 動畫模擬 */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    .animate-shake { animation: shake 0.3s ease-in-out; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    
    .animate-\[fadeIn_0\.2s\] { animation: fadeIn 0.2s ease-out; }
    .animate-\[slideUp_0\.3s_ease-out\] { animation: slideUp 0.3s ease-out; }
    .animate-\[slideIn_0\.3s_ease-out\] { animation: slideIn 0.3s ease-out; }
  `}</style>
);

// --- 全域匯率設定 (僅供花費匯入與參考使用) ---
const DEFAULT_EXCHANGE_RATES = {
    'TWD': 1,
    'USD': 32.5,
    'JPY': 0.21,
    'EUR': 35.2,
    'CNY': 4.5,
    'USDT': 32.5
};

// 預設模擬數據
const INITIAL_DATA = {
    "records": {},
    "memos": {},
    "incomes": {},
    "expenses": {},
    "debts": {},
    "debtEvents": {},
    "stockTransactions": [],
    "stockHoldingSnapshots": {},
    "fireSettings": { "withdrawalRate": 4.0 }
};

const normalizeAppData = (source = {}) => ({
    ...INITIAL_DATA,
    ...source,
    debts: source.debts || {},
    debtEvents: source.debtEvents || {},
    stockTransactions: source.stockTransactions || [],
    stockHoldingSnapshots: source.stockHoldingSnapshots || {}
});

const getDebtIdentity = (debt = {}) => debt.id || [
    debt.name,
    debt.lender,
    debt.amount,
    debt.category,
    debt.memo,
    JSON.stringify(debt.pledgeStocks || [])
].join('|');

const mergeDebtMaps = (...debtMaps) => {
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

const addDebtToSnapshot = (snapshot = [], debt) => {
    const seen = new Set((Array.isArray(snapshot) ? snapshot : []).map(getDebtIdentity));
    const identity = getDebtIdentity(debt);
    if (seen.has(identity)) return Array.isArray(snapshot) ? snapshot : [];
    return [...(Array.isArray(snapshot) ? snapshot : []), debt];
};

const addDebtAndCarryForward = (debtMap = {}, dateKey, newDebt) => {
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
const formatMoney = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(val);
const formatMoneyByMarket = (val, market = 'TW') => new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: market === 'US' ? 2 : 0,
    maximumFractionDigits: market === 'US' ? 2 : 0
}).format(val);
const formatExchangeRate = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 3 }).format(val);
const formatWan = (val) => {
    if (Math.abs(val) < 10000) return formatMoney(val);
    const wan = val / 10000;
    return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(wan)} 萬`;
};
const formatRate = (val) => `${(val * 100).toFixed(1)}%`;
const formatPercent = (value) => !isFinite(value) ? "0.0%" : `${Math.abs(value).toFixed(1)}%`;
const getDebtTotal = (debts = []) => debts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
const DEBT_CATEGORIES = [
    { value: 'stock_pledge', label: '股票質押' },
    { value: 'personal_loan', label: '信用貸款' },
    { value: 'mortgage', label: '房貸' },
    { value: 'car_loan', label: '車貸' },
    { value: 'credit_card', label: '信用卡' },
    { value: 'installment', label: '分期付款' },
    { value: 'family_loan', label: '親友借款' },
    { value: 'other', label: '其他' }
];
const getDebtCategoryLabel = (value) => DEBT_CATEGORIES.find((item) => item.value === value)?.label || value || '未分類';
const getDebtEventImpact = (event) => {
    if (event.type === 'borrow') return Number(event.amount) || 0;
    if (event.type === 'repay') return -(Number(event.amount) || 0);
    return 0;
};
const getDebtEventLabel = (type) => ({
    borrow: '借款',
    repay: '還本金',
    interest: '利息',
    fee: '手續費',
    collateral: '擔保品'
}[type] || '異動');
const getLatestSnapshotTotal = (records = {}, targetDateStr, calculator) => {
    const targetDate = new Date(targetDateStr);
    let latestDate = null;
    let total = 0;

    Object.entries(records || {}).forEach(([dateStr, items]) => {
        const date = new Date(dateStr);
        if (date <= targetDate && (!latestDate || date > latestDate)) {
            latestDate = date;
            total = calculator(items);
        }
    });

    return total;
};

const getLatestSnapshotItems = (records = {}, targetDateStr) => {
    const targetDate = new Date(targetDateStr);
    let latestDate = null;
    let latestItems = [];

    Object.entries(records || {}).forEach(([dateStr, items]) => {
        const date = new Date(dateStr);
        if (date <= targetDate && (!latestDate || date > latestDate)) {
            latestDate = date;
            latestItems = Array.isArray(items) ? items : [];
        }
    });

    return latestItems;
};

const parseCSV = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/，/g, ',');

    for (let i = 0; i < normalizedText.length; i++) {
        const char = normalizedText[i];
        const nextChar = normalizedText[i + 1];
        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === ',' && !insideQuote) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if (char === '\n' && !insideQuote) {
            currentRow.push(currentCell.trim());
            if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
};

const parseAmount = (value) => {
    if (value === undefined || value === null) return 0;
    const normalized = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
    return Number(normalized) || 0;
};

const normalizeDate = (value) => {
    if (!value) return '';
    const parts = String(value).trim().replace(/\//g, '-').split('-');
    if (parts.length !== 3) return String(value).trim();
    const [year, month, day] = parts;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const normalizeUSDate = (value) => {
    if (!value) return '';
    const parts = String(value).trim().replace(/\//g, '-').split('-');
    if (parts.length !== 3) return String(value).trim();
    const [month, day, year] = parts;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const getStockSymbolFromItem = (item = '') => {
    const normalized = item.trim();
    if (!normalized) return '';
    const dividendMatch = normalized.match(/(?:現金股息|股息)[-－](.+)$/);
    if (dividendMatch?.[1]) return dividendMatch[1].trim();
    return normalized;
};

const getStockTradeLabel = (type) => ({
    buy: '買入',
    sell: '賣出',
    dividend: '股息',
    deposit: '入金',
    fee: '費用'
}[type] || '其他');

const STOCK_MARKETS = [
    { value: 'TW', label: '台股' },
    { value: 'US', label: '美股' }
];

const getStockMarketLabel = (market) => STOCK_MARKETS.find((item) => item.value === market)?.label || market || '其他';

const processUSStockCSVRows = (rows, headers) => {
    const idxSymbol = headers.indexOf('代號');
    const idxName = headers.indexOf('詳細資訊');
    const idxQuantity = headers.indexOf('數量');
    const idxOpenDate = headers.indexOf('開倉日期');
    const idxCloseDate = headers.indexOf('平倉日期');
    const idxProceeds = headers.indexOf('賣出收入');
    const idxCost = headers.indexOf('調整後成本');
    const idxWashSaleLoss = headers.indexOf('WS Loss Disallowed');

    if ([idxSymbol, idxOpenDate, idxCloseDate, idxProceeds, idxCost].some((idx) => idx === -1)) {
        throw new Error("美股 CSV 格式不符，找不到代號、開倉/平倉日期、賣出收入或調整後成本欄位");
    }

    const transactions = [];
    const skippedRows = [];

    rows.slice(1).forEach((row, index) => {
        const symbol = row[idxSymbol]?.trim() || '';
        const name = idxName >= 0 ? row[idxName]?.trim() || symbol : symbol;
        const quantity = idxQuantity >= 0 ? parseAmount(row[idxQuantity]) : 0;
        const openDate = normalizeUSDate(row[idxOpenDate]);
        const closeDate = normalizeUSDate(row[idxCloseDate]);
        const proceeds = parseAmount(row[idxProceeds]);
        const cost = parseAmount(row[idxCost]);
        const washSaleLoss = idxWashSaleLoss >= 0 ? parseAmount(row[idxWashSaleLoss]) : 0;
        const sellAmount = proceeds + washSaleLoss;
        const csvRow = index + 2;

        if (!symbol || !openDate || !closeDate) {
            skippedRows.push({ row: csvRow, type: '美股', item: symbol || name || '空白', reason: '缺少代號或日期' });
            return;
        }

        if (cost <= 0 && sellAmount <= 0) {
            skippedRows.push({ row: csvRow, type: '美股', item: symbol, reason: '成本與賣出收入皆為 0' });
            return;
        }

        if (cost > 0) {
            transactions.push({
                id: `stock-us-buy-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                source: 'csv-us-realized',
                market: 'US',
                currency: 'USD',
                date: openDate,
                type: 'buy',
                symbol,
                name,
                rawItem: symbol,
                amount: cost,
                shares: quantity,
                balance: 0,
                memo: '美股平倉損益匯入：調整後成本'
            });
        }

        if (sellAmount > 0) {
            transactions.push({
                id: `stock-us-sell-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                source: 'csv-us-realized',
                market: 'US',
                currency: 'USD',
                date: closeDate,
                type: 'sell',
                symbol,
                name,
                rawItem: symbol,
                amount: sellAmount,
                shares: quantity,
                balance: 0,
                memo: washSaleLoss ? '美股平倉損益匯入：賣出收入 + WS Loss Disallowed' : '美股平倉損益匯入：賣出收入'
            });
        }
    });

    return { market: 'US', transactions, skippedRows };
};

const processStockCSVText = (csvText) => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) throw new Error("CSV 檔案是空的");

    const headers = rows[0].map((header) => header.trim());
    if (headers.includes('代號') && headers.includes('調整後成本') && headers.includes('賣出收入')) {
        return processUSStockCSVRows(rows, headers);
    }

    const idxType = headers.indexOf('類型');
    const idxDate = headers.indexOf('日期');
    const idxItem = headers.indexOf('項目');
    const idxBuy = headers.indexOf('股票買入');
    const idxDeposit = headers.indexOf('存入戶頭');
    const idxBalance = headers.indexOf('帳面餘額');

    if (idxDate === -1 || idxItem === -1) throw new Error("CSV 格式不符，找不到日期或項目欄位");

    const transactions = [];
    const skippedRows = [];

    rows.slice(1).forEach((row, index) => {
        const typeText = idxType >= 0 ? row[idxType]?.trim() : '';
        const date = normalizeDate(row[idxDate]);
        const item = row[idxItem]?.trim() || '';
        const buyAmount = idxBuy >= 0 ? parseAmount(row[idxBuy]) : 0;
        const depositAmount = idxDeposit >= 0 ? parseAmount(row[idxDeposit]) : 0;
        const balance = idxBalance >= 0 ? parseAmount(row[idxBalance]) : 0;

        if (!date || !item) {
            skippedRows.push({ row: index + 2, type: typeText || '空白', item: item || '空白', reason: '缺少日期或項目' });
            return;
        }

        let tradeType = 'other';
        let amount = 0;
        let symbol = getStockSymbolFromItem(item);
        const isDividendRow = typeText.includes('股息') || /^現金股息/.test(item) || /^股息[-－]/.test(item);

        if (typeText.includes('匯款')) {
            tradeType = 'deposit';
            amount = depositAmount || buyAmount;
            symbol = '';
        } else if (isDividendRow) {
            tradeType = 'dividend';
            amount = depositAmount;
            symbol = getStockSymbolFromItem(item);
            if (symbol === '現金股息' || symbol === '股息') symbol = '';
        } else if (buyAmount > 0) {
            tradeType = 'buy';
            amount = buyAmount;
        } else if (depositAmount > 0) {
            tradeType = 'sell';
            amount = depositAmount;
        }

        if (!amount && tradeType !== 'other') {
            skippedRows.push({ row: index + 2, type: typeText || '空白', item, reason: '金額為 0' });
            return;
        }

        if (tradeType === 'other') {
            skippedRows.push({ row: index + 2, type: typeText || '空白', item, reason: '尚未支援的交易類型' });
            return;
        }

        transactions.push({
            id: `stock-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            source: 'csv',
            market: 'TW',
            currency: 'TWD',
            date,
            type: tradeType,
            symbol,
            name: symbol || item,
            rawItem: item,
            amount,
            balance,
            unassigned: !symbol && tradeType === 'dividend',
            memo: !symbol && tradeType === 'dividend' ? '未指定股票的現金股息' : (typeText || '')
        });
    });

    return { market: 'TW', transactions, skippedRows };
};

const getHeaderIndex = (headers, candidates) => candidates.map((name) => headers.indexOf(name)).find((idx) => idx >= 0) ?? -1;

const processStockHoldingCSVText = (csvText, fallbackMonth, note = '') => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) throw new Error("CSV 檔案是空的");

    const headers = rows[0].map((header) => header.trim());
    const hasHeader = headers.some((header) => ['股票名稱', '名稱', '項目', '現價', '股數', '目前市值'].includes(header));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const idxMonth = getHeaderIndex(headers, ['月份', '年月', 'month']);
    const idxMarket = getHeaderIndex(headers, ['市場', 'market']);
    const idxSymbol = getHeaderIndex(headers, ['股票代號', '代號', 'symbol']);
    const idxName = hasHeader ? getHeaderIndex(headers, ['股票名稱', '名稱', '項目', 'name']) : 0;
    const idxShares = hasHeader ? getHeaderIndex(headers, ['股數', '庫存股數', '張數', 'shares']) : 2;
    const idxAvgCost = getHeaderIndex(headers, ['平均成本', 'avgCost', 'averageCost']);
    const idxCostAmount = getHeaderIndex(headers, ['成本總額', '持有成本', '成本', 'costAmount']);
    const idxMarketPrice = hasHeader ? getHeaderIndex(headers, ['現價', '目前股價', '市價', 'marketPrice']) : 1;
    const idxMarketValue = getHeaderIndex(headers, ['目前市值', '市值', 'marketValue']);
    const idxAccount = getHeaderIndex(headers, ['帳戶', '券商', 'account']);

    if (idxName === -1 && idxSymbol === -1) throw new Error("CSV 格式不符，找不到股票名稱或股票代號欄位");
    if (idxMarketPrice === -1 && idxMarketValue === -1) throw new Error("CSV 格式不符，請提供現價或目前市值欄位");
    if (idxShares === -1 && idxMarketValue === -1) throw new Error("CSV 格式不符，請提供股數欄位，或直接提供目前市值");
    if (!fallbackMonth && idxMonth === -1) throw new Error("請選擇月份");

    const holdings = [];
    const skippedRows = [];
    let snapshotMonth = idxMonth >= 0 && hasHeader ? '' : (fallbackMonth || '');

    dataRows.forEach((row, index) => {
        const csvRowNumber = index + (hasHeader ? 2 : 1);
        const rowMonth = idxMonth >= 0 && hasHeader ? normalizeDate(`${row[idxMonth]}-01`).substring(0, 7) : fallbackMonth;
        const market = idxMarket >= 0 ? row[idxMarket]?.trim() || 'TW' : 'TW';
        const symbol = idxSymbol >= 0 ? row[idxSymbol]?.trim() || '' : '';
        const name = idxName >= 0 ? row[idxName]?.trim() || symbol : symbol;
        const shares = idxShares >= 0 ? parseAmount(row[idxShares]) : 0;
        const averageCost = idxAvgCost >= 0 ? parseAmount(row[idxAvgCost]) : 0;
        const costAmount = idxCostAmount >= 0 ? parseAmount(row[idxCostAmount]) : (shares && averageCost ? shares * averageCost : 0);
        const marketPrice = idxMarketPrice >= 0 ? parseAmount(row[idxMarketPrice]) : 0;
        const marketValue = idxMarketValue >= 0 ? parseAmount(row[idxMarketValue]) : (shares && marketPrice ? shares * marketPrice : 0);
        const account = idxAccount >= 0 ? row[idxAccount]?.trim() || '' : '';

        if (!rowMonth || (!name && !symbol)) {
            skippedRows.push({ row: csvRowNumber, item: name || symbol || '空白', reason: '缺少月份或股票名稱' });
            return;
        }
        if (marketValue <= 0) {
            skippedRows.push({ row: csvRowNumber, item: name || symbol, reason: '目前市值為 0，請確認現價與股數' });
            return;
        }

        snapshotMonth = snapshotMonth || rowMonth;
        holdings.push({
            id: `holding-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            month: rowMonth,
            market,
            symbol,
            name,
            shares,
            averageCost,
            costAmount,
            marketPrice,
            marketValue,
            account
        });
    });

    return { month: snapshotMonth, note: note.trim(), holdings, skippedRows };
};

// --- 組件 ---
const AmountWithTooltip = ({ amount, className = "", iconColor = "text-slate-300", align = "center", prefix = "", masked = false }) => (
    <div className={`flex items-center gap-1 w-fit ${className}`}>
        <span className={masked ? "font-mono tracking-widest" : ""}>{masked ? '****' : `${prefix}${formatWan(amount)}`}</span>
        {/* 將 Tooltip 結構與 hover 效果移至 icon 的包覆層，而非最外層 */}
        {!masked && (
            <div className="group relative">
                <Info size={14} className={`${iconColor} opacity-70 group-hover:opacity-100 transition-opacity cursor-help`} />
                <div className={`absolute bottom-full mb-2 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-nowrap ${align === 'center' ? 'left-1/2 -translate-x-1/2' : ''} ${align === 'left' ? 'left-0' : ''} ${align === 'right' ? 'right-0' : ''}`}>
                    完整金額: {formatMoney(amount)} TWD
                    <div className={`absolute top-full w-2 h-2 bg-slate-800 rotate-45 ${align === 'center' ? 'left-1/2 -translate-x-1/2' : ''} ${align === 'left' ? 'left-2' : ''} ${align === 'right' ? 'right-2' : ''}`}></div>
                </div>
            </div>
        )}
    </div>
);

// 新增：綜合損益分析 Tooltip 組件，支援 align 屬性控制左右對齊
const AnalysisTooltip = ({ incomeDiff, assetDiff, compositeScore, align = "center", masked = false }) => {
    // 根據 align 屬性決定 Tooltip 與箭頭的位置
    const tooltipPosition = align === "right" ? "right-0 translate-x-0" : "left-1/2 -translate-x-1/2";
    const arrowPosition = align === "right" ? "right-3 translate-x-1/2" : "left-1/2 -translate-x-1/2";

    if (masked) return null;

    return (
        <div className={`absolute bottom-full mb-2 w-[220px] rounded-xl bg-slate-800 p-4 text-[11px] text-white opacity-0 shadow-2xl transition-all group-hover/tooltip:opacity-100 pointer-events-none z-50 scale-95 group-hover/tooltip:scale-100 origin-bottom ${tooltipPosition}`}>
            <div className="font-bold mb-2 pb-2 border-b border-slate-600 text-amber-300 text-center flex items-center justify-center gap-2">
                <TrendingUp size={12} /> 損益變動分析
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">1. 收入成長</span>
                    <span className={`font-mono font-bold ${incomeDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {incomeDiff > 0 ? '+' : ''}{formatWan(incomeDiff)}
                    </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                    <span>(本月收入 - 上月收入)</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">2. 資產成長</span>
                    <span className={`font-mono font-bold ${assetDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {assetDiff > 0 ? '+' : ''}{formatWan(assetDiff)}
                    </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 border-b border-slate-700 pb-2">
                    <span>(本月資產 - 上月資產)</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                    <span className="text-white font-bold">3. 綜合表現 (1+2)</span>
                    <span className={`font-mono text-sm font-bold ${compositeScore >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {compositeScore > 0 ? '+' : ''}{formatWan(compositeScore)}
                    </span>
                </div>
            </div>
            <div className={`absolute -bottom-1 h-2 w-2 rotate-45 bg-slate-800 ${arrowPosition}`}></div>
        </div>
    );
};

const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 min-w-[120px]">
                <p className="font-inter font-bold text-amber-300 mb-1 border-b border-slate-600 pb-1">
                    {d.year ? `${d.year}年` : `${d.month}月`}
                </p>
                <div className="flex justify-between gap-4 mb-0.5">
                    <span className="text-slate-400">總資產</span>
                    <span className="font-inter font-medium">{formatMoney(d.assets)}</span>
                </div>
                {d.incomeGrowthRate !== undefined && (
                    <div className="border-t border-slate-600 pt-1 mt-1 space-y-0.5">
                        <div className="flex justify-between gap-4 items-center">
                            <span className="text-slate-400 scale-90 origin-left">收入年增長</span>
                            <span className={`font-inter font-bold ${d.incomeGrowthRate >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {d.incomeGrowthRate >= 1 && d.incomeGrowthRate > 0 && <TrendingUp size={10} className="inline mr-1" />}
                                {d.incomeGrowthRate < 1 && d.incomeGrowthRate > 0 && <TrendingDown size={10} className="inline mr-1" />}
                                {formatRate(d.incomeGrowthRate)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4 items-center">
                            <span className="text-slate-400 scale-90 origin-left">收入占總所得</span>
                            <span className="font-inter font-bold text-amber-400">{formatRate(d.incomeShare)}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const DiffBadge = ({ current, prev }) => {
    if (prev === undefined || prev === null) return <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-2 font-bold">New</span>;
    const diff = current - prev;
    if (diff === 0) return <span className="text-[10px] text-slate-300 ml-2">-</span>;
    const isPositive = diff > 0;
    const colorClass = isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50";
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
        <div className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ml-2 ${colorClass}`}>
            <Icon size={10} />
            <span>{formatWan(Math.abs(diff))}</span>
        </div>
    );
};

const AlertModal = ({ title, message, onClose }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s]">
        <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-600">
                <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-serif-tc font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 font-inter leading-relaxed">{message}</p>
            <button onClick={onClose} className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors">
                知道了
            </button>
        </div>
    </div>
);

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s]">
        <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl relative flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500">
                <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-serif-tc font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 font-inter leading-relaxed whitespace-pre-line">{message}</p>
            <div className="flex gap-3 w-full">
                <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                    取消
                </button>
                <button onClick={onConfirm} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors">
                    刪除
                </button>
            </div>
        </div>
    </div>
);

const YearSelectorModal = ({ currentYear, availableYears, yearlyTrendData, onSelect, onClose }) => {
    const hasChartData = yearlyTrendData && yearlyTrendData.some(d => d.assets > 0);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-lg font-serif-tc font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-teal-600" />
                    選擇年份
                </h3>
                {hasChartData ? (
                    <div className="h-32 w-full mb-6 -ml-2 animate-[fadeIn_0.2s]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={yearlyTrendData}>
                                <defs>
                                    <linearGradient id="colorYearly" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter' }} dy={5} />
                                <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
                                <Area type="monotone" dataKey="assets" stroke="#0F766E" strokeWidth={2} fillOpacity={1} fill="url(#colorYearly)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="mb-4 text-center py-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-slate-400 text-xs">
                        尚無資產趨勢資料
                    </div>
                )}


                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto hide-scrollbar">
                    {availableYears.length > 0 ? availableYears.map(year => {
                        // Find stats for this year
                        const stats = yearlyTrendData ? yearlyTrendData.find(d => d.year === year) : null;

                        return (
                            <button
                                key={year}
                                onClick={() => onSelect(year)}
                                className={`w-full p-4 rounded-xl text-left border transition-all ${currentYear === year ? 'bg-teal-50 border-teal-200 shadow-md transform scale-[1.02]' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-500'}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-lg font-inter font-bold flex items-center gap-2 ${currentYear === year ? 'text-teal-700' : 'text-slate-700'}`}>
                                        {year}
                                        {currentYear === year && <Check size={18} />}
                                    </span>
                                    {stats && <span className="text-xs font-inter text-slate-500">資產: {formatMoney(stats.assets)}</span>}
                                </div>

                                {stats ? (
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/50">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 mb-0.5">收入年增長</span>
                                            <div className={`font-inter text-xs font-bold flex items-center ${stats.incomeGrowthRate >= 1 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                {stats.incomeGrowthRate >= 1 && stats.incomeGrowthRate > 0 && <TrendingUp size={10} className="mr-1" />}
                                                {stats.incomeGrowthRate < 1 && stats.incomeGrowthRate > 0 && <TrendingDown size={10} className="mr-1" />}
                                                {formatRate(stats.incomeGrowthRate)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-slate-400 mb-0.5">收入占總所得</span>
                                            <div className="font-inter text-xs font-bold text-teal-500">
                                                {formatRate(stats.incomeShare)}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-2 text-[10px] text-slate-300">無詳細數據</div>
                                )}
                            </button>
                        );
                    }) : (
                        <div className="col-span-3 text-center text-slate-400 text-sm py-2">無可用年份</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ImportConfirmationModal = ({ type, summary, onConfirm, onCancel, currentData, pendingData }) => {
    const [expandedMonth, setExpandedMonth] = useState(null);
    const [expandedJsonSection, setExpandedJsonSection] = useState(null);
    const [expandedJsonExpenseMonth, setExpandedJsonExpenseMonth] = useState(null);

    const changedMonths = summary?.changedMonths || [];
    const jsonSections = summary?.sections || {};

    const renderDiffBadge = (changed) => (
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${changed ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            {changed ? '內容變更' : '無變更'}
        </span>
    );

    const renderExpenseRow = (item, tone = 'default') => {
        const toneClasses = {
            added: 'bg-emerald-50/70',
            removed: 'bg-rose-50/70',
            modified: 'bg-amber-50/70',
            default: ''
        };

        return (
            <tr key={item.id} className={toneClasses[tone] || ''}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date.split('-')[2]}日</td>
                <td className="px-2 py-2">
                    <div className="text-slate-700 font-bold truncate max-w-[100px]">{item.name || item.subCategory}</div>
                    <div className="text-slate-400 scale-90 origin-left">{item.category}-{item.subCategory}</div>
                </td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${item.amount < 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {item.amount < 0 ? '+' : ''}{formatMoney(Math.abs(item.amount))}
                </td>
            </tr>
        );
    };

    const renderRecordRow = (item, tone = 'default') => {
        const toneClasses = {
            added: 'bg-emerald-50/70',
            removed: 'bg-rose-50/70',
            default: ''
        };

        return (
            <tr key={`${item.date}-${item.name}-${item.currency}-${item.amount}-${tone}`} className={toneClasses[tone] || ''}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date}</td>
                <td className="px-2 py-2">
                    <div className="text-slate-700 font-bold truncate max-w-[100px]">{item.name}</div>
                    <div className="text-slate-400 scale-90 origin-left">{item.type === 'floating' ? '浮動資產' : '固定資產'} / {item.currency || 'TWD'}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-slate-600">{formatMoney(item.amount || 0)}</td>
            </tr>
        );
    };

const renderIncomeRow = (item, tone = 'default') => {
        const toneClasses = {
            added: 'bg-emerald-50/70',
            removed: 'bg-rose-50/70',
            default: ''
        };

        return (
            <tr key={`${item.date || item.month}-${item.company}-${item.bank}-${item.amount}-${tone}`} className={toneClasses[tone] || ''}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date || item.month}</td>
                <td className="px-2 py-2">
                    <div className="text-slate-700 font-bold truncate max-w-[100px]">{item.company}</div>
                    <div className="text-slate-400 scale-90 origin-left">{item.bank || '未指定帳戶'} / {item.currency || 'TWD'}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-slate-600">{formatMoney(item.amount || 0)}</td>
            </tr>
        );
    };

    const renderMemoRow = (item, tone = 'default') => {
        const toneClasses = {
            added: 'bg-emerald-50/70',
            removed: 'bg-rose-50/70',
            default: ''
        };

        return (
            <tr key={`${item.date}-${tone}`} className={toneClasses[tone] || ''}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date}</td>
                <td className="px-2 py-2 text-slate-700 break-words">{item.content || '空白備忘'}</td>
            </tr>
        );
    };

    const renderDebtRow = (item, tone = 'default') => {
        const toneClasses = {
            added: 'bg-emerald-50/70',
            removed: 'bg-rose-50/70',
            default: ''
        };

        return (
            <tr key={`${item.date}-${item.name}-${item.lender}-${item.amount}-${tone}`} className={toneClasses[tone] || ''}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date}</td>
                <td className="px-2 py-2">
                    <div className="text-slate-700 font-bold truncate max-w-[100px]">{item.name}</div>
                    <div className="text-slate-400 scale-90 origin-left">{item.lender || '未指定機構'}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-rose-500">-{formatMoney(item.amount || 0)}</td>
            </tr>
        );
    };

    const renderDebtEventRow = (item, tone = 'default') => {
        const toneClasses = {
            added: 'bg-emerald-50/70',
            removed: 'bg-rose-50/70',
            default: ''
        };
        const impact = getDebtEventImpact(item);
        const isCostOnly = item.type === 'interest' || item.type === 'fee';

        return (
            <tr key={`${item.month}-${item.date}-${item.type}-${item.name}-${item.amount}-${tone}`} className={toneClasses[tone] || ''}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date}</td>
                <td className="px-2 py-2">
                    <div className="text-slate-700 font-bold truncate max-w-[100px]">{getDebtEventLabel(item.type)} / {item.name}</div>
                    <div className="text-slate-400 scale-90 origin-left">{item.lender || '未指定機構'}</div>
                </td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${isCostOnly ? 'text-rose-500' : impact >= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isCostOnly ? '-' : impact >= 0 ? '+' : ''}{formatMoney(isCostOnly ? item.amount : impact)}
                </td>
            </tr>
        );
    };

    const renderGenericDiffBlock = (title, diff, renderRow, columns) => {
        if (!diff?.hasChanges) return null;

        return (
            <div className="space-y-3">
                {diff.modified.length > 0 && (
                    <div>
                        <div className="text-[10px] font-bold text-amber-700 mb-2">修改 ({diff.modified.length})</div>
                        <div className="space-y-2">
                            {diff.modified.map(({ before, after }, index) => (
                                <div key={`${title}-modified-${index}`} className="rounded-lg border border-amber-100 overflow-hidden">
                                    <table className="w-full text-[10px] text-left">
                                        <thead className="text-slate-400 font-medium bg-amber-50/60 border-b border-amber-100">
                                            <tr>{columns}</tr>
                                        </thead>
                                        <tbody>
                                            {renderRow(before, 'removed')}
                                            {renderRow(after, 'added')}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {diff.added.length > 0 && (
                    <div>
                        <div className="text-[10px] font-bold text-emerald-700 mb-2">新增 ({diff.added.length})</div>
                        <table className="w-full text-[10px] text-left rounded-lg overflow-hidden">
                            <thead className="text-slate-400 font-medium bg-emerald-50/60 border-b border-emerald-100">
                                <tr>{columns}</tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100">
                                {diff.added.map((item) => renderRow(item, 'added'))}
                            </tbody>
                        </table>
                    </div>
                )}

                {diff.removed.length > 0 && (
                    <div>
                        <div className="text-[10px] font-bold text-rose-700 mb-2">刪除 ({diff.removed.length})</div>
                        <table className="w-full text-[10px] text-left rounded-lg overflow-hidden">
                            <thead className="text-slate-400 font-medium bg-rose-50/60 border-b border-rose-100">
                                <tr>{columns}</tr>
                            </thead>
                            <tbody className="divide-y divide-rose-100">
                                {diff.removed.map((item) => renderRow(item, 'removed'))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-600 mx-auto">
                    <FileJson size={24} />
                </div>
                <h3 className="text-lg font-serif-tc font-bold text-slate-800 mb-2 text-center">
                    確認匯入{type === 'json' ? '備份' : '資料'}
                </h3>
                
                <div className="flex-1 overflow-y-auto min-h-[100px] mb-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-600 font-inter space-y-3">
                    {type === 'json' ? (
                        <>
                            <p className="font-bold text-slate-700 border-b border-slate-200 pb-2 mb-2">
                                即將覆蓋現有資料庫：
                            </p>
                            <div className="space-y-3 text-xs">
                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedJsonSection(expandedJsonSection === 'json-records' ? null : 'json-records')}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">資產紀錄</span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${expandedJsonSection === 'json-records' ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="line-through text-slate-400">{jsonSections.records?.currentCount ?? 0}</span>
                                            <ArrowRight size={12} className="text-slate-300" />
                                            <span className="font-bold text-indigo-600">{summary.records}</span>
                                            {renderDiffBadge(jsonSections.records?.changed)}
                                        </div>
                                    </div>
                                    {expandedJsonSection === 'json-records' && jsonSections.records?.changed && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3">
                                            {renderGenericDiffBlock(
                                                'records',
                                                jsonSections.records?.diff,
                                                renderRecordRow,
                                                <>
                                                    <th className="px-3 py-1.5 font-normal">日期</th>
                                                    <th className="px-2 py-1.5 font-normal">資產</th>
                                                    <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedJsonSection(expandedJsonSection === 'json-incomes' ? null : 'json-incomes')}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">收入紀錄</span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${expandedJsonSection === 'json-incomes' ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="line-through text-slate-400">{jsonSections.incomes?.currentCount ?? 0}</span>
                                            <ArrowRight size={12} className="text-slate-300" />
                                            <span className="font-bold text-indigo-600">{summary.incomes}</span>
                                            {renderDiffBadge(jsonSections.incomes?.changed)}
                                        </div>
                                    </div>
                                    {expandedJsonSection === 'json-incomes' && jsonSections.incomes?.changed && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3">
                                            {renderGenericDiffBlock(
                                                'incomes',
                                                jsonSections.incomes?.diff,
                                                renderIncomeRow,
                                                <>
                                                    <th className="px-3 py-1.5 font-normal">日期</th>
                                                    <th className="px-2 py-1.5 font-normal">收入來源</th>
                                                    <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedJsonSection(expandedJsonSection === 'json-expenses' ? null : 'json-expenses')}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">花費紀錄(月)</span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${expandedJsonSection === 'json-expenses' ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="line-through text-slate-400">{jsonSections.expenses?.currentCount ?? 0}</span>
                                            <ArrowRight size={12} className="text-slate-300" />
                                            <span className="font-bold text-indigo-600">{summary.expenses}</span>
                                            {renderDiffBadge(jsonSections.expenses?.changed)}
                                        </div>
                                    </div>
                                    {expandedJsonSection === 'json-expenses' && jsonSections.expenses?.changed && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3 space-y-3">
                                            {jsonSections.expenses?.diff?.changedMonths?.map(({ month, oldItems, newItems, diff }) => {
                                                const oldTotal = oldItems.reduce((sum, i) => sum + i.amount, 0);
                                                const newTotal = newItems.reduce((sum, i) => sum + i.amount, 0);
                                                const isExpanded = expandedJsonExpenseMonth === month;

                                                return (
                                                    <div key={month} className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                                        <div className="p-3 flex flex-col gap-2 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedJsonExpenseMonth(isExpanded ? null : month)}>
                                                            <div className="flex justify-between items-center font-bold text-slate-700 text-xs">
                                                                <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                                                    {month}
                                                                    <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                </span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">有差異</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                                                <div className="border-r border-slate-100 pr-2">
                                                                    <div className="text-[10px] text-slate-400 mb-1">原有的 ({oldItems.length}筆)</div>
                                                                    <div className="font-mono text-slate-500 line-through">{formatMoney(oldTotal)}</div>
                                                                </div>
                                                                <div className="pl-2">
                                                                    <div className="text-[10px] text-indigo-500 mb-1">新的 ({newItems.length}筆)</div>
                                                                    <div className="font-mono font-bold text-indigo-600">{formatMoney(newTotal)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="bg-slate-50 border-t border-slate-100 p-3">
                                                                {renderGenericDiffBlock(
                                                                    `expenses-${month}`,
                                                                    diff,
                                                                    renderExpenseRow,
                                                                    <>
                                                                        <th className="px-3 py-1.5 font-normal">日期</th>
                                                                        <th className="px-2 py-1.5 font-normal">類別/名稱</th>
                                                                        <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedJsonSection(expandedJsonSection === 'json-memos' ? null : 'json-memos')}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">備忘錄</span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${expandedJsonSection === 'json-memos' ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="line-through text-slate-400">{jsonSections.memos?.currentCount ?? 0}</span>
                                            <ArrowRight size={12} className="text-slate-300" />
                                            <span className="font-bold text-indigo-600">{summary.memos}</span>
                                            {renderDiffBadge(jsonSections.memos?.changed)}
                                        </div>
                                    </div>
                                    {expandedJsonSection === 'json-memos' && jsonSections.memos?.changed && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3">
                                            {renderGenericDiffBlock(
                                                'memos',
                                                jsonSections.memos?.diff,
                                                renderMemoRow,
                                                <>
                                                    <th className="px-3 py-1.5 font-normal">日期</th>
                                                    <th className="px-2 py-1.5 font-normal">內容</th>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedJsonSection(expandedJsonSection === 'json-debts' ? null : 'json-debts')}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">負債紀錄</span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${expandedJsonSection === 'json-debts' ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="line-through text-slate-400">{jsonSections.debts?.currentCount ?? 0}</span>
                                            <ArrowRight size={12} className="text-slate-300" />
                                            <span className="font-bold text-indigo-600">{summary.debts ?? 0}</span>
                                            {renderDiffBadge(jsonSections.debts?.changed)}
                                        </div>
                                    </div>
                                    {expandedJsonSection === 'json-debts' && jsonSections.debts?.changed && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3">
                                            {renderGenericDiffBlock(
                                                'debts',
                                                jsonSections.debts?.diff,
                                                renderDebtRow,
                                                <>
                                                    <th className="px-3 py-1.5 font-normal">日期</th>
                                                    <th className="px-2 py-1.5 font-normal">負債</th>
                                                    <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setExpandedJsonSection(expandedJsonSection === 'json-debt-events' ? null : 'json-debt-events')}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">負債異動</span>
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${expandedJsonSection === 'json-debt-events' ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="line-through text-slate-400">{jsonSections.debtEvents?.currentCount ?? 0}</span>
                                            <ArrowRight size={12} className="text-slate-300" />
                                            <span className="font-bold text-indigo-600">{summary.debtEvents ?? 0}</span>
                                            {renderDiffBadge(jsonSections.debtEvents?.changed)}
                                        </div>
                                    </div>
                                    {expandedJsonSection === 'json-debt-events' && jsonSections.debtEvents?.changed && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3">
                                            {renderGenericDiffBlock(
                                                'debtEvents',
                                                jsonSections.debtEvents?.diff,
                                                renderDebtEventRow,
                                                <>
                                                    <th className="px-3 py-1.5 font-normal">日期</th>
                                                    <th className="px-2 py-1.5 font-normal">異動</th>
                                                    <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-rose-500 mt-2 font-bold flex items-center gap-1">
                                <AlertCircle size={12} /> 注意：此操作無法復原
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-bold text-slate-700 border-b border-slate-200 pb-2 mb-2">
                                花費匯入分析：
                            </p>
                            {changedMonths.length === 0 ? (
                                <div className="bg-white rounded-lg border border-slate-100 p-4 text-center text-xs text-slate-500">
                                    這次匯入和現有花費資料沒有差異，不需要覆蓋任何月份。
                                </div>
                            ) : (
                                <div className="space-y-3">
                                {changedMonths.map(({ month, oldItems, newItems, diff }) => {
                                    
                                    const oldTotal = oldItems.reduce((sum, i) => sum + i.amount, 0);
                                    const newTotal = newItems.reduce((sum, i) => sum + i.amount, 0);
                                    
                                    const oldCount = oldItems.length;
                                    const newCount = newItems.length;
                                    
                                    const isExpanded = expandedMonth === month;

                                    return (
                                        <div key={month} className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                            <div 
                                                className="p-3 flex flex-col gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => setExpandedMonth(isExpanded ? null : month)}
                                            >
                                                <div className="flex justify-between items-center font-bold text-slate-700 text-xs">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                                        {month} 
                                                        <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                                                        有差異
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                                    <div className="border-r border-slate-100 pr-2">
                                                        <div className="text-[10px] text-slate-400 mb-1">原有的 ({oldCount}筆)</div>
                                                        <div className="font-mono text-slate-500 line-through">{formatMoney(oldTotal)}</div>
                                                    </div>
                                                    <div className="pl-2">
                                                        <div className="text-[10px] text-indigo-500 mb-1">新的 ({newCount}筆)</div>
                                                        <div className="font-mono font-bold text-indigo-600">{formatMoney(newTotal)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="bg-slate-50 border-t border-slate-100 max-h-[200px] overflow-y-auto">
                                                    <div className="p-3 space-y-3">
                                                        {diff.modified.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-amber-700 mb-2">修改 ({diff.modified.length})</div>
                                                                <div className="space-y-2">
                                                                    {diff.modified.map(({ before, after }, index) => (
                                                                        <div key={`${month}-modified-${index}`} className="rounded-lg border border-amber-100 overflow-hidden">
                                                                            <table className="w-full text-[10px] text-left">
                                                                                <thead className="text-slate-400 font-medium bg-amber-50/60 border-b border-amber-100">
                                                                                    <tr>
                                                                                        <th className="px-3 py-1.5 font-normal">日期</th>
                                                                                        <th className="px-2 py-1.5 font-normal">類別/名稱</th>
                                                                                        <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {renderExpenseRow(before, 'removed')}
                                                                                    {renderExpenseRow(after, 'added')}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {diff.added.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-emerald-700 mb-2">新增 ({diff.added.length})</div>
                                                                <table className="w-full text-[10px] text-left rounded-lg overflow-hidden">
                                                                    <thead className="text-slate-400 font-medium bg-emerald-50/60 border-b border-emerald-100">
                                                                        <tr>
                                                                            <th className="px-3 py-1.5 font-normal">日期</th>
                                                                            <th className="px-2 py-1.5 font-normal">類別/名稱</th>
                                                                            <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-emerald-100">
                                                                        {diff.added.map((item) => renderExpenseRow(item, 'added'))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {diff.removed.length > 0 && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-rose-700 mb-2">刪除 ({diff.removed.length})</div>
                                                                <table className="w-full text-[10px] text-left rounded-lg overflow-hidden">
                                                                    <thead className="text-slate-400 font-medium bg-rose-50/60 border-b border-rose-100">
                                                                        <tr>
                                                                            <th className="px-3 py-1.5 font-normal">日期</th>
                                                                            <th className="px-2 py-1.5 font-normal">類別/名稱</th>
                                                                            <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-rose-100">
                                                                        {diff.removed.map((item) => renderExpenseRow(item, 'removed'))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                </div>
                            )}
                            {changedMonths.length > 0 && (
                                <p className="text-xs text-slate-500 mt-2 bg-amber-50 text-amber-600 p-2 rounded">
                                    注意：上述月份的舊有花費資料將被完全覆蓋。
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                        取消
                    </button>
                    <button onClick={onConfirm} disabled={type === 'csv' && changedMonths.length === 0} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed">
                        確認匯入
                    </button>
                </div>
            </div>
        </div>
    );
};

const processExpenseCSVText = (csvText, onSuccess, onError) => {
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

const handleProcessExpenseCSV = (file, onSuccess, onError) => {
    const reader = new FileReader();
    reader.onload = (e) => processExpenseCSVText(e.target.result, onSuccess, onError);
    reader.readAsText(file);
};

const getExpenseIdentityKey = (item) => [
    item.date || '',
    item.account || '',
    item.category || '',
    item.subCategory || '',
    item.name || '',
    item.currency || 'TWD'
].join('|');

const getExpenseFullKey = (item) => [
    getExpenseIdentityKey(item),
    Number(item.amount) || 0
].join('|');

const buildExpenseDiff = (oldItems = [], newItems = []) => {
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

const getExpenseImportSummary = (currentExpenses = {}, pendingExpenses = {}) => {
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

const getSortedValue = (value) => {
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

const areDataStructuresEqual = (a, b) => JSON.stringify(getSortedValue(a)) === JSON.stringify(getSortedValue(b));

const buildCollectionDiff = (oldItems = [], newItems = [], getIdentityKey, getFullKey) => {
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

const flattenRecords = (records = {}) => Object.entries(records).flatMap(([date, items]) =>
    (items || []).map((item) => ({ ...item, date }))
);

const flattenIncomeSources = (incomes = {}) => Object.entries(incomes).flatMap(([month, value]) =>
    (value?.sources || []).map((source) => ({ ...source, month, date: source.date || month }))
);

const flattenMemos = (memos = {}) => Object.entries(memos).map(([date, content]) => ({ date, content: content || '' }));
const flattenDebts = (debts = {}) => Object.entries(debts).flatMap(([date, items]) =>
    (items || []).map((item) => ({ ...item, date }))
);
const flattenDebtEvents = (debtEvents = {}) => Object.entries(debtEvents).flatMap(([month, items]) =>
    (items || []).map((item) => ({ ...item, month }))
);

const getRecordIdentityKey = (item) => [item.date || '', item.type || '', item.name || '', item.currency || 'TWD'].join('|');
const getRecordFullKey = (item) => [getRecordIdentityKey(item), Number(item.amount) || 0, Number(item.originalAmount) || 0, Number(item.exchangeRate) || 0].join('|');

const getIncomeIdentityKey = (item) => [item.month || '', item.company || '', item.bank || '', item.currency || 'TWD', item.memo || ''].join('|');
const getIncomeFullKey = (item) => [getIncomeIdentityKey(item), item.date || '', Number(item.amount) || 0, Number(item.originalAmount) || 0, Number(item.exchangeRate) || 0].join('|');

const getMemoIdentityKey = (item) => item.date || '';
const getMemoFullKey = (item) => [item.date || '', item.content || ''].join('|');
const getDebtIdentityKey = (item) => [item.date || '', item.name || '', item.lender || ''].join('|');
const getDebtFullKey = (item) => [getDebtIdentityKey(item), Number(item.amount) || 0, item.memo || ''].join('|');
const getDebtEventIdentityKey = (item) => [item.month || '', item.date || '', item.type || '', item.name || '', item.lender || '', item.memo || ''].join('|');
const getDebtEventFullKey = (item) => [getDebtEventIdentityKey(item), Number(item.amount) || 0, JSON.stringify(getSortedValue(item.collateral || []))].join('|');

const getJsonImportSummary = (currentData = {}, parsedData = {}) => {
    const currentRecords = currentData.records || {};
    const currentIncomes = currentData.incomes || {};
    const currentExpenses = currentData.expenses || {};
    const currentMemos = currentData.memos || {};
    const currentDebts = currentData.debts || {};
    const currentDebtEvents = currentData.debtEvents || {};

    const nextRecords = parsedData.records || {};
    const nextIncomes = parsedData.incomes || {};
    const nextExpenses = parsedData.expenses || {};
    const nextMemos = parsedData.memos || {};
    const nextDebts = parsedData.debts || {};
    const nextDebtEvents = parsedData.debtEvents || {};

    const recordDiff = buildCollectionDiff(flattenRecords(currentRecords), flattenRecords(nextRecords), getRecordIdentityKey, getRecordFullKey);
    const incomeDiff = buildCollectionDiff(flattenIncomeSources(currentIncomes), flattenIncomeSources(nextIncomes), getIncomeIdentityKey, getIncomeFullKey);
    const memoDiff = buildCollectionDiff(flattenMemos(currentMemos), flattenMemos(nextMemos), getMemoIdentityKey, getMemoFullKey);
    const debtDiff = buildCollectionDiff(flattenDebts(currentDebts), flattenDebts(nextDebts), getDebtIdentityKey, getDebtFullKey);
    const debtEventDiff = buildCollectionDiff(flattenDebtEvents(currentDebtEvents), flattenDebtEvents(nextDebtEvents), getDebtEventIdentityKey, getDebtEventFullKey);
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
        }
    };

    return {
        records: sections.records.nextCount,
        incomes: sections.incomes.nextCount,
        expenses: sections.expenses.nextCount,
        memos: sections.memos.nextCount,
        debts: sections.debts.nextCount,
        debtEvents: sections.debtEvents.nextCount,
        sections,
        hasChanges: Object.values(sections).some((section) => section.changed)
    };
};

// --- WebAuthn Security Logic ---
const BIOMETRIC_STORAGE_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIAL_ID_KEY = 'biometric_credential_id';

const registerBiometric = async (userEmail) => {
    if (!window.PublicKeyCredential) {
        throw new Error("您的裝置不支援生物辨識驗證");
    }

    try {
        // Create random challenge
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // User ID needs to be a buffer
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const publicKey = {
            challenge,
            rp: {
                name: "極簡貓資產",
                id: window.location.hostname // Should be effective domain
            },
            user: {
                id: userId,
                name: userEmail,
                displayName: userEmail
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Face ID / Touch ID
                userVerification: "required",
                requireResidentKey: false
            },
            timeout: 60000,
            attestation: "none"
        };

        const credential = await navigator.credentials.create({ publicKey });
        
        // In a real backend scenario, we would send this credential to the server.
        // For local "App Lock", we just mark it as enabled. 
        // We save the credential ID to verify later if needed, though for local "Unlock", 
        // mere possession and successful .get() challenge is the gatekeeper.
        
        localStorage.setItem(BIOMETRIC_STORAGE_KEY, 'true');
        // Convert ArrayBuffer to Base64 string for storage
        const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem(BIOMETRIC_CREDENTIAL_ID_KEY, credId);
        
        return true;
    } catch (err) {
        console.error("Biometric registration failed", err);
        throw err;
    }
};

const verifyBiometric = async () => {
    if (!window.PublicKeyCredential) return false;

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Retrieve stored credential ID if available (optional for 'discoverable' creds but good for specific targeting)
        const storedId = localStorage.getItem(BIOMETRIC_CREDENTIAL_ID_KEY);
        let allowCredentials = [];
        
        if (storedId) {
            const rawId = Uint8Array.from(atob(storedId), c => c.charCodeAt(0));
            allowCredentials.push({
                type: "public-key",
                id: rawId,
                transports: ["internal"]
            });
        }

        const publicKey = {
            challenge,
            allowCredentials,
            userVerification: "required", // This triggers Face ID
            timeout: 60000
        };

        const assertion = await navigator.credentials.get({ publicKey });
        return !!assertion;
    } catch (err) {
        console.error("Biometric verification failed", err);
        return false;
    }
};

const BiometricLockScreen = ({ onUnlock, errorMsg }) => (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white animate-[fadeIn_0.3s]">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-2xl ring-4 ring-slate-700/50">
            <Lock size={48} className="text-teal-400" />
        </div>
        <h2 className="text-2xl font-serif-tc font-bold mb-2">極簡貓資產 已鎖定</h2>
        <p className="text-slate-400 text-sm mb-8 font-inter text-center">請使用 Face ID / Touch ID 解鎖以繼續訪問</p>
        
        <button 
            onClick={onUnlock} 
            className="w-full max-w-xs bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-teal-500/20 active:scale-95 flex items-center justify-center gap-2"
        >
            <ScanFace size={20} />
            點擊解鎖
        </button>

        {errorMsg && (
            <div className="mt-6 flex items-center gap-2 text-rose-400 bg-rose-400/10 px-4 py-2 rounded-lg text-sm animate-shake">
                <ShieldAlert size={16} />
                {errorMsg}
            </div>
        )}
        
        <div className="mt-12 text-slate-600 text-xs font-inter flex items-center gap-1">
            <ShieldCheck size={12} /> Secured by WebAuthn
        </div>
    </div>
);

const AddIncomeModal = ({ onClose, onSave, assetNames, exchangeRateCache }) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [date, setDate] = useState(todayStr);
    const [company, setCompany] = useState("");
    const [bank, setBank] = useState("");
    const [currency, setCurrency] = useState("TWD");
    const [exchangeRate, setExchangeRate] = useState("1");
    const [originalAmount, setOriginalAmount] = useState("");
    const [amount, setAmount] = useState("");
    const [memo, setMemo] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Cache Logic
    useEffect(() => {
        if (!exchangeRateCache) return;
        const key = `${date.substring(0, 7)}-${currency}`;
        if (exchangeRateCache.current[key]) {
            setExchangeRate(exchangeRateCache.current[key]);
        } else if (currency === 'TWD') {
            setExchangeRate('1');
        }
    }, [date, currency, exchangeRateCache]);

    useEffect(() => {
        if (!exchangeRateCache) return;
        if (exchangeRate && !isNaN(parseFloat(exchangeRate))) {
            const key = `${date.substring(0, 7)}-${currency}`;
            exchangeRateCache.current[key] = exchangeRate;
        }
    }, [exchangeRate, date, currency, exchangeRateCache]);

    useEffect(() => {
        if (originalAmount && exchangeRate) {
            const val = parseFloat(originalAmount) * parseFloat(exchangeRate);
            setAmount(val.toFixed(0));
        } else {
            setAmount("");
        }
    }, [originalAmount, exchangeRate]);

    const handleCurrencyChange = (e) => {
        const newCurr = e.target.value;
        setCurrency(newCurr);
        // Note: setExchangeRate logic is now handled by the cache effect above
        // But for UX, if no cache, we might want to reset?
        // The effect handles "else if TWD".
        // If not TWD and no cache, it stays as is or we should reset?
        // Existing logic: if TWD set 1, else "".
        // My effect handles the "restore from cache" part.
        // If I change currency, effect triggers.
        // If cache exists -> sets rate.
        // If cache NOT exists -> 
        // We probably want to clear it if it's not TWD.
        // Let's refine the effect.
    };

    const handleSubmit = () => {
        setErrorMsg("");
        if (!date) return setErrorMsg("請選擇日期");
        if (!company) return setErrorMsg("請輸入收入來源");
        if (!amount) return setErrorMsg("請輸入金額");

        const newIncomeSource = {
            date,
            company,
            bank,
            currency,
            originalAmount: Number(originalAmount) || Number(amount),
            exchangeRate: Number(exchangeRate),
            amount: Number(amount),
            memo: memo.trim()
        };
        onSave(newIncomeSource, date);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="bg-teal-100 p-2 rounded-lg"><DollarSign size={20} className="text-teal-700" /></div> 新增收入
                </h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar px-1">
                    {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-shake"><AlertCircle size={16} />{errorMsg}</div>}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">日期</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 font-inter text-slate-800" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">收入來源 (公司/客戶)</label>
                        <div className="relative">
                            <Building2 size={16} className="absolute left-3 top-3.5 text-slate-400" />
                            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full pl-9 p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：Google, 永豐銀行..." />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">入帳銀行/帳戶</label>
                        <div className="relative">
                            <select value={bank} onChange={(e) => setBank(e.target.value)} className={`w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm appearance-none ${!bank ? 'text-slate-400' : 'text-slate-800'}`}>
                                <option value="" disabled>選擇關聯帳戶...</option>
                                {assetNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">幣別</label>
                            <select value={currency} onChange={handleCurrencyChange} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm appearance-none">
                                <option value="TWD">TWD (台幣)</option>
                                <option value="USD">USD (美金)</option>
                                <option value="JPY">JPY (日圓)</option>
                                <option value="EUR">EUR (歐元)</option>
                                <option value="CNY">CNY (人民幣)</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">匯率</label>
                            <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} disabled={currency === 'TWD'} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm disabled:text-slate-300" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">原幣金額</label>
                            <input type="number" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm font-inter text-right placeholder:text-slate-300" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">金額 (TWD)</label>
                            <input type="text" value={amount} readOnly className="w-full p-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 text-sm font-inter text-right cursor-not-allowed" placeholder="-" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">備註</label>
                        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 text-sm font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：年終獎金、加班費..." />
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm transition-colors">取消</button>
                    <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all">確認新增</button>
                </div>
            </div>
        </div>
    );
};

const AddAssetModal = ({ onClose, onSave, historyRecords, exchangeRateCache }) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [date, setDate] = useState(todayStr);
    const [type, setType] = useState('fixed');
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [exchangeRate, setExchangeRate] = useState('1');
    const [originalAmount, setOriginalAmount] = useState('');
    const [amount, setAmount] = useState('');
    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [pendingAssets, setPendingAssets] = useState([]);
    const [hasImportedPreviousAssets, setHasImportedPreviousAssets] = useState(false);

    // Cache Logic
    useEffect(() => {
        if (!exchangeRateCache) return;
        // Extract YYYY-MM from YYYY-MM-DD to share cache with Income Modal
        const monthStr = date.substring(0, 7);
        const key = `${monthStr}-${currency}`;

        if (exchangeRateCache.current[key]) {
            setExchangeRate(exchangeRateCache.current[key]);
        } else if (currency === 'TWD') {
            setExchangeRate('1');
        }
    }, [date, currency, exchangeRateCache]);

    useEffect(() => {
        if (!exchangeRateCache) return;
        if (exchangeRate && !isNaN(parseFloat(exchangeRate))) {
            const monthStr = date.substring(0, 7);
            const key = `${monthStr}-${currency}`;
            exchangeRateCache.current[key] = exchangeRate;
        }
    }, [exchangeRate, date, currency, exchangeRateCache]);

    const uniqueAssetOptions = useMemo(() => {
        const map = new Map();
        Object.keys(historyRecords).sort().forEach(date => {
            historyRecords[date].forEach(r => map.set(r.name, r.type));
        });
        return Array.from(map.entries()).map(([name, type]) => ({ name, type }));
    }, [historyRecords]);

    const handleNameSelect = (e) => {
        const selectedName = e.target.value;
        setName(selectedName);
        let found = null;
        const allDates = Object.keys(historyRecords).sort().reverse();
        for (const d of allDates) {
            const record = historyRecords[d].find(r => r.name === selectedName);
            if (record) { found = record; break; }
        }
        if (found && found.type === type) {
            setCurrency(found.currency || 'TWD');
            if (found.exchangeRate) setExchangeRate(String(found.exchangeRate));
        }
    };

    const previousAssetSnapshot = useMemo(() => {
        if (!date) return [];
        const currentTimestamp = new Date(date).getTime();
        const dates = Object.keys(historyRecords)
            .filter(d => new Date(d).getTime() < currentTimestamp && (historyRecords[d] || []).length > 0) // 找出比選擇日期更早且有資產的日期
            .sort((a, b) => new Date(b) - new Date(a)); // 降序排列，取最近的

        if (dates.length === 0) return { date: null, assets: [] };
        return { date: dates[0], assets: historyRecords[dates[0]] || [] };
    }, [date, historyRecords]);

    const prevAssets = previousAssetSnapshot.assets;
    const suggestions = prevAssets.filter(a => a.type === type);

    useEffect(() => {
        setHasImportedPreviousAssets(false);
    }, [date]);

    const fetchRate = async () => {
        if (currency === 'TWD') return;
        setIsFetchingRate(true);
        setErrorMsg("");

        try {
            // Using a reliable free API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const rate = data.rates['TWD'];

            if (rate) {
                setExchangeRate(String(rate));
                if (originalAmount) {
                    const twd = (parseFloat(originalAmount) * rate).toFixed(0);
                    setAmount(twd);
                }
            } else {
                throw new Error('Rate not found');
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch aborted');
                return;
            }
            console.warn("API Error, falling back to cache/mock", err);
            // Fallback logic
            const mockRates = DEFAULT_EXCHANGE_RATES;
            const rate = mockRates[currency];
            if (rate) {
                setExchangeRate(String(rate));
                setErrorMsg("無法連線，已使用預設匯率");
            } else {
                setErrorMsg("匯率抓取失敗，請手動輸入");
            }
        } finally {
            setIsFetchingRate(false);
        }
    };

    useEffect(() => {
        if (currency !== 'TWD' && originalAmount && exchangeRate) {
            const val = parseFloat(originalAmount) * parseFloat(exchangeRate);
            setAmount(val.toFixed(0));
        } else if (currency === 'TWD') {
            setAmount(originalAmount);
        }
    }, [originalAmount, exchangeRate, currency]);

    const handleOriginalAmountChange = (e) => {
        const val = e.target.value;
        if (val.indexOf('.') !== -1 && val.split('.')[1].length > 2) return;
        setOriginalAmount(val);
    };

    const getDraftAsset = () => {
        setErrorMsg("");
        if (!name || !amount) return setErrorMsg("請填寫名稱與金額");
        if (!date) return setErrorMsg("請選擇日期");

        const cleanName = name.trim();
        const assetsInDate = historyRecords[date] || [];
        const pendingInDate = pendingAssets.filter((asset) => asset.date === date);
        
        // Duplicate check logic:
        // Same Name AND Same Currency = Duplicate (Block)
        // Same Name BUT Different Currency = Allowed (e.g. Taishin TWD vs Taishin JPY)
        const isDuplicate = [...assetsInDate, ...pendingInDate].some(asset => asset.name === cleanName && asset.currency === currency);

        if (isDuplicate) {
            setErrorMsg(`「${cleanName} (${currency})」在 ${date} 已存在，請使用編輯功能。`);
            return null;
        }

        return {
            id: `asset-${Date.now()}-${pendingAssets.length}`,
            type,
            name: cleanName,
            amount: Number(amount),
            currency,
            originalAmount: Number(originalAmount) || Number(amount),
            exchangeRate: Number(exchangeRate),
            date
        };
    };

    const resetDraftFields = () => {
        setName('');
        setOriginalAmount('');
        setAmount('');
    };

    const handleAddPending = () => {
        const draftAsset = getDraftAsset();
        if (!draftAsset) return;
        setPendingAssets((items) => [...items, draftAsset]);
        resetDraftFields();
        setErrorMsg('');
    };

    const handleRemovePending = (id) => {
        setPendingAssets((items) => items.filter((item) => item.id !== id));
    };

    const handlePendingAmountChange = (id, value) => {
        setPendingAssets((items) => items.map((item) => {
            if (item.id !== id) return item;
            const originalAmount = Number(value) || 0;
            const exchangeRate = Number(item.exchangeRate) || 1;
            return {
                ...item,
                originalAmount,
                amount: Math.round(originalAmount * exchangeRate)
            };
        }));
    };

    const handleImportPreviousAssets = () => {
        if (!previousAssetSnapshot.assets.length) return;
        const assetsInDate = historyRecords[date] || [];
        setPendingAssets((items) => {
            const existingKeys = new Set([...assetsInDate, ...items].map((asset) => `${asset.name}-${asset.currency || 'TWD'}`));
            const importedAssets = previousAssetSnapshot.assets
                .filter((asset) => !existingKeys.has(`${asset.name}-${asset.currency || 'TWD'}`))
                .map((asset, index) => ({
                    ...asset,
                    id: `asset-import-${Date.now()}-${index}`,
                    date,
                    amount: Number(asset.amount) || 0,
                    originalAmount: Number(asset.originalAmount) || Number(asset.amount) || 0,
                    exchangeRate: Number(asset.exchangeRate) || 1
                }));
            return [...items, ...importedAssets];
        });
        setHasImportedPreviousAssets(true);
        setErrorMsg('');
    };

    const handleSaveAll = () => {
        const draftAsset = name || originalAmount || amount ? getDraftAsset() : null;
        if ((name || originalAmount || amount) && !draftAsset) return;
        const assetsToSave = draftAsset ? [...pendingAssets, draftAsset] : pendingAssets;
        if (assetsToSave.length === 0) return setErrorMsg("請先加入至少一筆資產");
        onSave(assetsToSave, date);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="bg-teal-100 p-2 rounded-lg"><Wallet size={20} className="text-teal-700" /></div> 新增資產
                </h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar px-1">
                    {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-shake"><AlertCircle size={16} />{errorMsg}</div>}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">日期</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 font-inter text-slate-800" />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => { setType('fixed'); setName(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'fixed' ? 'bg-white shadow text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}>固定資產</button>
                        <button onClick={() => { setType('floating'); setName(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'floating' ? 'bg-white shadow text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}>浮動資產</button>
                    </div>
                    {previousAssetSnapshot.assets.length > 0 && (
                        <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs text-teal-700 font-bold flex items-center gap-1"><Sparkles size={12} /> 從上次資產紀錄帶入</div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        {previousAssetSnapshot.date} · {previousAssetSnapshot.assets.length} 筆，帶入後可刪改再儲存
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleImportPreviousAssets}
                                    disabled={hasImportedPreviousAssets}
                                    className="px-3 py-2 rounded-xl bg-white text-teal-700 text-xs font-bold border border-teal-100 hover:bg-teal-100 disabled:text-slate-300 disabled:bg-slate-50 transition-colors"
                                >
                                    {hasImportedPreviousAssets ? '已帶入' : '帶入'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- 新增：快速帶入區域 --- */}
                    {suggestions.length > 0 && (
                        <div className="mb-1 -mt-1">
                            <label className="text-[10px] text-teal-600 font-bold mb-2 ml-1 flex items-center gap-1">
                                <Sparkles size={10} /> 快速帶入 (來自上筆紀錄)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map(asset => (
                                    <button
                                        key={asset.id}
                                        onClick={() => {
                                            setName(asset.name);
                                            setCurrency(asset.currency || 'TWD');
                                            setExchangeRate(String(asset.exchangeRate || 1));
                                            setOriginalAmount(''); // 清空原幣金額
                                            setAmount(''); // 清空台幣金額
                                        }}
                                        className="px-2 py-1.5 bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 rounded-lg text-xs border border-slate-200 hover:border-teal-200 transition-all font-serif-tc shadow-sm"
                                    >
                                        {asset.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">名稱</label>
                        <div className="relative">
                            <input list="history-names" type="text" value={name} onChange={handleNameSelect} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 font-serif-tc text-slate-800 transition-all placeholder:text-slate-300" placeholder={`輸入${type === 'fixed' ? '固定' : '浮動'}資產名稱...`} />
                            <datalist id="history-names">
                                {uniqueAssetOptions.filter(opt => opt.type === type).map(opt => <option key={opt.name} value={opt.name} />)}
                            </datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">幣值</label>
                            <select value={currency} onChange={(e) => { setCurrency(e.target.value); if (e.target.value === 'TWD') setExchangeRate('1'); }} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm appearance-none">
                                <option value="TWD">TWD (台幣)</option>
                                <option value="USD">USD (美金)</option>
                                <option value="JPY">JPY (日圓)</option>
                                <option value="EUR">EUR (歐元)</option>
                                <option value="CNY">CNY (人民幣)</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">匯率</label>
                            <div className="relative">
                                <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} disabled={currency === 'TWD'} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm disabled:text-slate-300" />
                                {currency !== 'TWD' && (
                                    <button onClick={fetchRate} className="absolute right-2 top-2 bottom-2 px-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-600 flex items-center justify-center transition-colors" title="抓取匯率">
                                        <RefreshCw size={14} className={isFetchingRate ? 'animate-spin' : ''} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">原幣金額</label>
                            <input type="number" value={originalAmount} onChange={handleOriginalAmountChange} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-slate-50 text-sm font-inter text-right placeholder:text-slate-300" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">台幣等值</label>
                            <input type="text" value={amount} readOnly className="w-full p-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 text-sm font-inter text-right cursor-not-allowed" placeholder="-" />
                        </div>
                    </div>
                    <button onClick={handleAddPending} className="w-full py-2.5 rounded-xl bg-teal-50 text-teal-700 font-bold text-sm hover:bg-teal-100 border border-teal-100 transition-colors flex items-center justify-center gap-2">
                        <Plus size={16} /> 加入暫存
                    </button>
                    {pendingAssets.length > 0 && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 font-bold">本次待新增 {pendingAssets.length} 筆</span>
                                <span className="text-[10px] text-slate-400">最後一次儲存全部</span>
                            </div>
                            <div className="space-y-2">
                                {pendingAssets.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2">
                                        <div className="min-w-0">
                                            <div className="font-serif-tc font-bold text-sm text-slate-700 truncate">{asset.name}</div>
                                            <div className="text-[10px] text-slate-400 font-inter">{asset.date} · {asset.currency}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="w-24">
                                                <input
                                                    aria-label={`${asset.name} 暫存金額`}
                                                    type="number"
                                                    value={asset.originalAmount || ''}
                                                    onChange={(e) => handlePendingAmountChange(asset.id, e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-right text-sm font-inter font-bold text-slate-600 focus:border-teal-500 outline-none"
                                                />
                                                {asset.currency !== 'TWD' && <div className="text-[10px] text-slate-400 text-right mt-0.5">≈ {formatMoney(asset.amount)}</div>}
                                            </div>
                                            <button type="button" onClick={() => handleRemovePending(asset.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="移除暫存"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm transition-colors">取消</button>
                    <button onClick={handleSaveAll} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all">
                        儲存全部{pendingAssets.length > 0 ? ` (${pendingAssets.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddDebtModal = ({ onClose, onSave, debtNames = [], accountOptions = [], assetRecords = {}, debts = {} }) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [date, setDate] = useState(todayStr);
    const [category, setCategory] = useState('other');
    const [name, setName] = useState('');
    const [lender, setLender] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [pledgeStocks, setPledgeStocks] = useState([{ id: Date.now(), symbol: '', shares: '', rate: '' }]);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (category === 'stock_pledge') setName('股票質押');
    }, [category]);

    const selectableAccountOptions = useMemo(() => {
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
        const recordEntries = Object.entries(assetRecords || {})
            .filter(([dateStr]) => new Date(dateStr) <= targetDate)
            .sort(([a], [b]) => new Date(b) - new Date(a));
        const sameMonthEntry = recordEntries.find(([dateStr]) => dateStr.substring(0, 7) === date.substring(0, 7));
        if (sameMonthEntry) addAssetOptions(sameMonthEntry[1]);
        if (recordEntries[0] && recordEntries[0] !== sameMonthEntry) addAssetOptions(recordEntries[0][1]);

        Object.values(debts || {}).forEach((items) => {
            (items || []).forEach((debt) => addOption(debt.lender));
        });
        accountOptions.forEach(addOption);

        return options;
    }, [accountOptions, assetRecords, date, debts]);

    const addPledgeStock = () => {
        setPledgeStocks((rows) => [...rows, { id: Date.now() + rows.length, symbol: '', shares: '', rate: '' }]);
    };

    const updatePledgeStock = (id, field, value) => {
        setPledgeStocks((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
    };

    const removePledgeStock = (id) => {
        setPledgeStocks((rows) => rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);
    };

    const handleSubmit = () => {
        setErrorMsg('');
        if (!date) return setErrorMsg("請選擇日期");
        if (!name.trim()) return setErrorMsg("請輸入負債名稱");
        if (!amount || Number(amount) <= 0) return setErrorMsg("請輸入有效金額");
        const cleanPledgeStocks = pledgeStocks
            .map((row) => ({ symbol: row.symbol.trim(), shares: Math.trunc(Number(row.shares)) || 0, rate: Number(row.rate) || 0 }))
            .filter((row) => row.symbol);
        if (category === 'stock_pledge' && cleanPledgeStocks.length === 0) return setErrorMsg("請至少輸入一筆質押股票");

        onSave({
            id: Date.now(),
            category,
            name: name.trim(),
            lender: lender.trim(),
            amount: Number(amount),
            pledgeStocks: category === 'stock_pledge' ? cleanPledgeStocks : [],
            memo: memo.trim()
        }, date);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="bg-rose-100 p-2 rounded-lg"><ArrowDownRight size={20} className="text-rose-700" /></div> 新增負債
                </h3>
                <div className="space-y-4 max-h-[65vh] overflow-y-auto hide-scrollbar px-1">
                    {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-shake"><AlertCircle size={16} />{errorMsg}</div>}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">日期</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-slate-50 font-inter text-slate-800" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">類別</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-slate-50 text-sm text-slate-800">
                            {DEBT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">負債名稱</label>
                        <input list="history-debts" type="text" value={name} onChange={(e) => setName(e.target.value)} readOnly={category === 'stock_pledge'} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-slate-50 font-serif-tc text-slate-800 placeholder:text-slate-300 read-only:text-slate-500 read-only:cursor-not-allowed" placeholder="例如：股票質押借款" />
                        <datalist id="history-debts">
                            {debtNames.map((item) => <option key={item} value={item} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">機構 / 帳戶</label>
                        <select value="" onChange={(e) => { if (e.target.value) setLender(e.target.value); }} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-slate-50 text-sm text-slate-800 mb-2">
                            <option value="">{selectableAccountOptions.length > 0 ? '從資產/歷史紀錄選擇' : '目前沒有可選紀錄，請自行輸入'}</option>
                            {selectableAccountOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <input type="text" value={lender} onChange={(e) => setLender(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-white font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：國泰證券 / 永豐金" />
                        <p className="text-[10px] text-slate-400 mt-1 ml-1">會優先列出負債日期當月或之前最近一次資產紀錄中的帳戶，也可以自行輸入。</p>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">金額 (TWD)</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-slate-50 text-sm font-inter text-right placeholder:text-slate-300" placeholder="0" />
                    </div>
                    {category === 'stock_pledge' && (
                        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-rose-500 font-bold block ml-1">質押股票與利率</label>
                                <span className="text-[10px] text-slate-400">利率請輸入 % 數</span>
                            </div>
                            <div className="space-y-2">
                                {pledgeStocks.map((row, index) => (
                                    <div key={row.id} className="grid grid-cols-[1fr_74px_82px_76px] gap-2 items-end">
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">股票代號 / 名稱</label>}
                                            <input type="text" value={row.symbol} onChange={(e) => updatePledgeStock(row.id, 'symbol', e.target.value)} className="w-full p-2.5 border border-rose-100 rounded-xl focus:border-rose-500 outline-none bg-white text-sm font-inter text-slate-800 placeholder:text-slate-300" placeholder="0050 / 台積電" />
                                        </div>
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">股數</label>}
                                            <input type="number" step="1" min="0" value={row.shares} onChange={(e) => updatePledgeStock(row.id, 'shares', e.target.value)} className="w-full p-2.5 border border-rose-100 rounded-xl focus:border-rose-500 outline-none bg-white text-sm font-inter text-right placeholder:text-slate-300" placeholder="0" />
                                        </div>
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">利率 %</label>}
                                            <input type="number" step="0.01" value={row.rate} onChange={(e) => updatePledgeStock(row.id, 'rate', e.target.value)} className="w-full p-2.5 border border-rose-100 rounded-xl focus:border-rose-500 outline-none bg-white text-sm font-inter text-right placeholder:text-slate-300" placeholder="2.5" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button type="button" onClick={addPledgeStock} className="flex-1 h-10 rounded-xl bg-white text-rose-500 hover:bg-rose-100 border border-rose-100 transition-colors flex items-center justify-center" title="新增股票"><Plus size={14} /></button>
                                            <button type="button" onClick={() => removePledgeStock(row.id)} disabled={pledgeStocks.length === 1} className="flex-1 h-10 rounded-xl bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-100 border border-rose-100 disabled:text-slate-200 disabled:bg-slate-50 transition-colors flex items-center justify-center" title="刪除此列"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">備註</label>
                        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none bg-slate-50 text-sm font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：0050 質押、年利率 3.5%" />
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm transition-colors">取消</button>
                    <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">確認新增</button>
                </div>
            </div>
        </div>
    );
};

const AddDebtEventModal = ({ monthKey, onClose, onSave, debtNames = [] }) => {
    const today = new Date();
    const fallbackDate = `${monthKey}-${String(new Date(Number(monthKey.split('-')[0]), Number(monthKey.split('-')[1]), 0).getDate()).padStart(2, '0')}`;
    const todayStr = today.toISOString().split('T')[0].startsWith(monthKey) ? today.toISOString().split('T')[0] : fallbackDate;

    const [date, setDate] = useState(todayStr);
    const [type, setType] = useState('borrow');
    const [name, setName] = useState('股票質押借款');
    const [lender, setLender] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [collateralText, setCollateralText] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const parseCollateral = (text) => text
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const [symbol, shares] = part.split(/[:xX* ]+/).filter(Boolean);
            return { symbol: symbol || part, shares: Number(shares) || 0 };
        });

    const handleSubmit = () => {
        setErrorMsg('');
        if (!date || !date.startsWith(monthKey)) return setErrorMsg("日期需在目前月份內");
        if (!name.trim()) return setErrorMsg("請輸入負債名稱");
        if (type !== 'collateral' && (!amount || Number(amount) <= 0)) return setErrorMsg("請輸入有效金額");

        onSave({
            id: Date.now(),
            date,
            type,
            name: name.trim(),
            lender: lender.trim(),
            amount: type === 'collateral' ? 0 : Number(amount),
            collateral: parseCollateral(collateralText),
            memo: memo.trim()
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg"><ClipboardCheck size={20} className="text-orange-700" /></div> 新增負債異動
                </h3>
                <div className="space-y-4 max-h-[65vh] overflow-y-auto hide-scrollbar px-1">
                    {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-shake"><AlertCircle size={16} />{errorMsg}</div>}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">日期</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 font-inter text-slate-800" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">類型</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none bg-slate-50 text-sm appearance-none">
                            <option value="borrow">借款增加</option>
                            <option value="repay">還本金</option>
                            <option value="interest">利息</option>
                            <option value="fee">手續費</option>
                            <option value="collateral">只記擔保品</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">負債名稱</label>
                        <input list="history-debt-events" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：股票質押借款" />
                        <datalist id="history-debt-events">
                            {debtNames.map((item) => <option key={item} value={item} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">機構 / 帳戶</label>
                        <input type="text" value={lender} onChange={(e) => setLender(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：國泰證券" />
                    </div>
                    {type !== 'collateral' && (
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">金額 (TWD)</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 text-sm font-inter text-right placeholder:text-slate-300" placeholder="0" />
                        </div>
                    )}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">擔保品</label>
                        <input type="text" value={collateralText} onChange={(e) => setCollateralText(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 text-sm font-inter text-slate-800 placeholder:text-slate-300" placeholder="例如：0050:2, 0052:1" />
                        <p className="text-[10px] text-slate-400 mt-1 ml-1">多檔請用逗號分隔，格式：代號:張數</p>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">備註</label>
                        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 text-sm font-serif-tc text-slate-800 placeholder:text-slate-300" placeholder="例如：新增質押額度 / 展延" />
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm transition-colors">取消</button>
                    <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all">確認新增</button>
                </div>
            </div>
        </div>
    );
};

const DetailView = ({ monthKey, data, onBack, onUpdateData, assetNames, isPrivacyMode, debtNames = [] }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('assets');
    const [localAssets, setLocalAssets] = useState([]);
    const [localMemo, setLocalMemo] = useState("");
    const [localIncomes, setLocalIncomes] = useState([]);
    const [localDebts, setLocalDebts] = useState([]);
    const [expenseFilter, setExpenseFilter] = useState("all");
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteMonth, setConfirmDeleteMonth] = useState(false);
    const [showDebtEventModal, setShowDebtEventModal] = useState(false);

    const getLatestDateInMonth = (records = {}, month) => {
        return Object.keys(records || {})
            .filter((date) => date.startsWith(month))
            .sort()
            .pop() || null;
    };

    const assetDate = useMemo(() => getLatestDateInMonth(data.records, monthKey), [data.records, monthKey]);
    const debtDate = useMemo(() => getLatestDateInMonth(data.debts, monthKey), [data.debts, monthKey]);
    const memoDate = useMemo(() => getLatestDateInMonth(data.memos, monthKey), [data.memos, monthKey]);
    const writeDate = assetDate || debtDate || memoDate || `${monthKey}-01`;
    const monthlyDebtSnapshots = useMemo(() => {
        return Object.entries(data.debts || {})
            .filter(([date]) => date.startsWith(monthKey))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, debts]) => ({
                date,
                debts: Array.isArray(debts) ? debts : [],
                total: getDebtTotal(debts)
            }));
    }, [data.debts, monthKey]);

    useEffect(() => {
        if (assetDate && data.records[assetDate]) {
            const assets = data.records[assetDate].map((item, idx) => ({ ...item, id: item.id || `legacy-${Date.now()}-${idx}` }));
            setLocalAssets(JSON.parse(JSON.stringify(assets)));
        } else {
            setLocalAssets([]);
        }
        let memoContent = memoDate ? (data.memos[memoDate] || "") : "";
        setLocalMemo(memoContent);
        const incomes = data.incomes[monthKey]?.sources || [];
        setLocalIncomes(incomes.map((item, idx) => ({ ...item, _tempId: idx })));
        const debts = debtDate ? (data.debts?.[debtDate] || []) : [];
        setLocalDebts(debts.map((item, idx) => ({ ...item, _tempId: item.id || idx })));
    }, [assetDate, debtDate, memoDate, monthKey, data]);

    const sortedMonths = useMemo(() => {
        const months = new Set();
        Object.keys(data.records || {}).forEach(d => months.add(d.substring(0, 7)));
        Object.keys(data.memos || {}).forEach(d => months.add(d.substring(0, 7)));
        Object.keys(data.debts || {}).forEach(d => months.add(d.substring(0, 7)));
        Object.keys(data.incomes || {}).forEach(monthStr => months.add(monthStr));
        Object.keys(data.expenses || {}).forEach(monthStr => months.add(monthStr));
        return Array.from(months).sort();
    }, [data]);

    const currentIndex = sortedMonths.indexOf(monthKey);
    const prevMonth = currentIndex > 0 ? sortedMonths[currentIndex - 1] : null;
    const nextMonth = currentIndex < sortedMonths.length - 1 ? sortedMonths[currentIndex + 1] : null;
    const prevAssetDate = prevMonth ? getLatestDateInMonth(data.records, prevMonth) : null;
    const prevDebtDate = prevMonth ? getLatestDateInMonth(data.debts, prevMonth) : null;

    const prevMonthAssetsMap = useMemo(() => {
        if (!prevAssetDate) return {};
        const assets = data.records[prevAssetDate] || [];
        return assets.reduce((acc, item) => {
            acc[`${item.type}-${item.name}`] = item.amount;
            return acc;
        }, {});
    }, [prevAssetDate, data.records]);

    const prevTotalAssets = useMemo(() => {
        if (!prevAssetDate) return 0;
        const assets = data.records[prevAssetDate] || [];
        return assets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [prevAssetDate, data.records]);

    const prevTotalDebts = useMemo(() => {
        if (!prevDebtDate) return 0;
        return getDebtTotal(data.debts?.[prevDebtDate] || []);
    }, [prevDebtDate, data.debts]);

    const currentMonthExpenses = useMemo(() => {
        return data.expenses?.[monthKey] || [];
    }, [monthKey, data.expenses]);

    const currentDebtEvents = useMemo(() => {
        return [...(data.debtEvents?.[monthKey] || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [data.debtEvents, monthKey]);

    const debtEventStats = useMemo(() => {
        return currentDebtEvents.reduce((acc, item) => {
            acc.principal += getDebtEventImpact(item);
            if (item.type === 'interest') acc.interest += Number(item.amount) || 0;
            if (item.type === 'fee') acc.fees += Number(item.amount) || 0;
            return acc;
        }, { principal: 0, interest: 0, fees: 0 });
    }, [currentDebtEvents]);

    const prevMonthIncome = useMemo(() => {
        if (!prevMonth) return 0;
        const prevIncomeData = data.incomes[prevMonth];
        return prevIncomeData ? (prevIncomeData.totalAmount || 0) : 0;
    }, [prevMonth, data.incomes]);

    const stats = useMemo(() => {
        const totalAssets = localAssets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const totalDebts = getDebtTotal(localDebts);
        const netAssets = totalAssets - totalDebts;
        const floatingAssets = localAssets.filter(item => item.type === 'floating').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const investmentRate = totalAssets > 0 ? floatingAssets / totalAssets : 0;
        const monthlyIncome = localIncomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const monthlyCost = currentMonthExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        const incomeDiff = monthlyIncome - prevMonthIncome;
        const assetDiff = netAssets - (prevTotalAssets - prevTotalDebts);
        const compositeScore = incomeDiff + assetDiff;

        return { totalAssets, totalDebts, netAssets, investmentRate, monthlyIncome, monthlyCost, incomeDiff, assetDiff, compositeScore };
    }, [localAssets, localDebts, localIncomes, currentMonthExpenses, prevTotalAssets, prevTotalDebts, prevMonthIncome]);

    const filteredExpenses = useMemo(() => {
        if (expenseFilter === 'all') return currentMonthExpenses;
        return currentMonthExpenses.filter(ex => ex.account === expenseFilter);
    }, [currentMonthExpenses, expenseFilter]);

    const expenseAccounts = useMemo(() => {
        const accounts = new Set(currentMonthExpenses.map(ex => ex.account));
        return Array.from(accounts).sort();
    }, [currentMonthExpenses]);

    const expenseChartData = useMemo(() => {
        const categoryMap = {};
        currentMonthExpenses.forEach(ex => {
            const cat = ex.category || '其他';
            if (!categoryMap[cat]) categoryMap[cat] = { name: cat, value: 0, items: [] };
            categoryMap[cat].value += ex.amount;
            categoryMap[cat].items.push(ex);
        });
        return Object.values(categoryMap).sort((a, b) => b.value - a.value);
    }, [currentMonthExpenses]);

    const COLORS = ['#0D9488', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];

    const handleNavigate = (targetMonth) => { if (targetMonth) onUpdateData('NAVIGATE_MONTH', targetMonth); };
    const handleAssetChange = (id, field, value) => setLocalAssets(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

    const handleIncomeChange = (idx, field, value) => {
        setLocalIncomes(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            if (field === 'originalAmount' || field === 'exchangeRate' || field === 'currency') {
                const rate = field === 'exchangeRate' ? value : updated.exchangeRate;
                const orig = field === 'originalAmount' ? value : updated.originalAmount;
                if (field === 'currency' && value === 'TWD') {
                    updated.exchangeRate = 1;
                    updated.amount = Number(updated.originalAmount) || 0;
                } else {
                    updated.amount = Number((Number(orig) * Number(rate)).toFixed(0));
                }
            }
            return updated;
        }));
    };

    const handleDeleteIncome = (idx) => setLocalIncomes(prev => prev.filter((_, i) => i !== idx));
    const handleDebtChange = (idx, field, value) => {
        setLocalDebts(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };
    const handleDeleteDebt = (idx) => setLocalDebts(prev => prev.filter((_, i) => i !== idx));
    const handleAddDebtEvent = (event) => {
        onUpdateData('ADD_DEBT_EVENT', { month: monthKey, event });
        setShowDebtEventModal(false);
    };
    const handleDeleteDebtEvent = (id) => {
        onUpdateData('DELETE_DEBT_EVENT', { month: monthKey, id });
    };
    const handleDeleteClick = (e, id) => { e.stopPropagation(); e.preventDefault(); setConfirmDeleteId(id); };
    const confirmDeleteAsset = () => { if (confirmDeleteId) { setLocalAssets(prev => prev.filter(item => item.id !== confirmDeleteId)); setConfirmDeleteId(null); } };
    const handleDeleteMonth = () => setConfirmDeleteMonth(true);
    const executeDeleteMonth = () => onUpdateData('DELETE_MONTH', monthKey);

    const handleSave = () => {
        const cleanIncomes = (localIncomes || []).map(({ _tempId, ...rest }) => rest);
        const cleanDebts = (localDebts || []).map(({ _tempId, ...rest }) => rest);
        onUpdateData('UPDATE_DETAILS', {
            month: monthKey,
            assetDate: assetDate || writeDate,
            debtDate: debtDate || writeDate,
            memoDate: memoDate || writeDate,
            assets: localAssets,
            memo: localMemo,
            incomes: cleanIncomes,
            debts: cleanDebts
        });
        setIsEditing(false);
    };

    const fixedAssets = localAssets.filter(i => i.type === 'fixed');
    const floatingAssets = localAssets.filter(i => i.type === 'floating');

    return (
        <div className="fixed inset-0 bg-[#F9F9F7] z-40 overflow-y-auto animate-[slideIn_0.3s_ease-out]">
            {showDebtEventModal && <AddDebtEventModal monthKey={monthKey} onClose={() => setShowDebtEventModal(false)} onSave={handleAddDebtEvent} debtNames={debtNames} />}
            {confirmDeleteId && <ConfirmModal title="刪除資產" message="確定要刪除這筆資產紀錄嗎？" onConfirm={confirmDeleteAsset} onCancel={() => setConfirmDeleteId(null)} />}
            {confirmDeleteMonth && <ConfirmModal title="刪除整月紀錄" message={`確定要刪除 ${monthKey} 的資產、負債與備忘嗎？\n收入與花費紀錄會保留。`} onConfirm={executeDeleteMonth} onCancel={() => setConfirmDeleteMonth(false)} />}

            <header className="sticky top-0 bg-[#F9F9F7]/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors" aria-label="返回"><ArrowLeft size={24} strokeWidth={1.5} /></button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-4">
                        <button disabled={!prevMonth} onClick={() => handleNavigate(prevMonth)} className={`p-1 ${!prevMonth ? 'text-slate-200' : 'text-slate-400 hover:text-slate-800'}`} aria-label="上一月"><ChevronLeft size={20} /></button>
                        <span className="font-serif-tc font-bold text-xl text-slate-800 tracking-wide">{monthKey}</span>
                        <button disabled={!nextMonth} onClick={() => handleNavigate(nextMonth)} className={`p-1 ${!nextMonth ? 'text-slate-200' : 'text-slate-400 hover:text-slate-800'}`} aria-label="下一月"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-2 -mr-2">
                    <button onClick={handleDeleteMonth} className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="刪除整月紀錄" aria-label="刪除整月紀錄"><Trash2 size={20} strokeWidth={1.5} /></button>
                    {(activeTab === 'assets' || activeTab === 'income' || activeTab === 'debt') && (
                        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`p-2 rounded-full transition-colors flex items-center gap-1 ${isEditing ? 'bg-teal-600 text-white shadow-lg px-4' : 'text-slate-500 hover:bg-slate-200'}`} aria-label={isEditing ? "儲存" : "編輯"}>
                            {isEditing ? <><Check size={18} /><span className="text-xs font-bold">儲存</span></> : <Edit2 size={20} strokeWidth={1.5} />}
                        </button>
                    )}
                </div>
            </header>

            <main className="px-6 py-8 pb-32 space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-teal-500" /><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">當月備忘</h3></div>
                    {!isPrivacyMode && (
                        <div className="mb-3 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2">
                                <span className="block font-bold text-slate-500 mb-0.5">資產快照</span>
                                <span className="font-inter">{assetDate || '尚未記錄'}</span>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-lg px-3 py-2">
                                <span className="block font-bold text-slate-500 mb-0.5">負債快照</span>
                                <span className="font-inter">{debtDate || '尚未記錄'}</span>
                            </div>
                        </div>
                    )}
                    {isEditing ? <textarea value={localMemo} onChange={(e) => setLocalMemo(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-sm text-slate-700 font-serif-tc min-h-[80px]" placeholder="輸入本月備忘..." /> : <div className={`p-4 rounded-xl border border-slate-200/60 bg-white text-sm text-slate-700 font-serif-tc min-h-[60px] ${!localMemo ? 'text-slate-300 italic' : ''}`}>{localMemo || "無備忘紀錄"}</div>}
                </section>

                <section className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                        <button onClick={() => { setActiveTab('assets'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'assets' ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-teal-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'assets' ? 'text-teal-600 font-bold' : 'text-slate-400'}`}>淨資產</div>
                            <AmountWithTooltip amount={stats.netAssets} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'assets' ? 'text-teal-800' : 'text-slate-800'}`} align="center" masked={isPrivacyMode} />
                        </button>
                        <button onClick={() => { setActiveTab('income'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'income' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'income' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>本月收入 (Income)</div>
                            <AmountWithTooltip amount={stats.monthlyIncome} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'income' ? 'text-emerald-800' : 'text-emerald-700'}`} align="center" prefix="+" masked={isPrivacyMode} />
                        </button>
                        <button onClick={() => { setActiveTab('cost'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'cost' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 text-rose-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'cost' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>本月花費 (Cost)</div>
                            <AmountWithTooltip amount={stats.monthlyCost} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'cost' ? 'text-rose-800' : 'text-rose-700'}`} align="center" prefix="-" masked={isPrivacyMode} />
                        </button>
                        <button onClick={() => { setActiveTab('debt'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'debt' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 text-rose-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'debt' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>總負債</div>
                            <AmountWithTooltip amount={stats.totalDebts} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'debt' ? 'text-rose-800' : 'text-rose-700'}`} align="center" prefix="-" masked={isPrivacyMode} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-inter mb-1 flex items-center gap-1">
                                綜合損益 <Activity size={12} />
                                {!isPrivacyMode && (
                                    <div className="group/tooltip relative">
                                        <Info size={10} className="cursor-help text-slate-300 hover:text-slate-500 transition-colors" />
                                        <AnalysisTooltip incomeDiff={stats.incomeDiff} assetDiff={stats.assetDiff} compositeScore={stats.compositeScore} />
                                    </div>
                                )}
                            </div>
                            <div className={`text-lg font-serif-tc font-bold ${stats.compositeScore >= 0 ? 'text-emerald-600' : 'text-rose-500'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                {isPrivacyMode ? '****' : (stats.compositeScore >= 0 ? '+' : '') + formatWan(stats.compositeScore)}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-inter mb-1 flex items-center gap-1">投資占比 <PieChartIcon size={12} /></div>
                            <div className="text-lg font-inter font-bold text-teal-600">{formatRate(stats.investmentRate)}</div>
                        </div>
                    </div>
                </section>

                {activeTab === 'assets' && (
                    <div className="space-y-8 animate-[fadeIn_0.2s]">
                        <section>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                {fixedAssets.map((asset, idx) => (
                                    <div key={asset.id} className={`p-4 flex items-center justify-between ${idx !== fixedAssets.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                        {isEditing ? (
                                            <div className="flex-1 flex gap-2 items-center animate-[fadeIn_0.2s]">
                                                <input type="text" value={asset.name || ''} onChange={(e) => handleAssetChange(asset.id, 'name', e.target.value)} className="w-1/3 p-2 border border-slate-200 rounded-lg focus:border-slate-800 outline-none bg-slate-50 text-sm font-serif-tc" placeholder="名稱" />
                                                <input type="number" value={asset.amount || ''} onChange={(e) => handleAssetChange(asset.id, 'amount', Number(e.target.value))} className="w-1/3 p-2 border border-slate-200 rounded-lg focus:border-slate-800 outline-none bg-slate-50 text-sm font-inter text-right" placeholder="金額" />
                                                <button type="button" onClick={(e) => handleDeleteClick(e, asset.id)} className="ml-auto p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors z-20 relative"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-serif-tc text-slate-700">{asset.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-inter font-medium text-slate-800 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                                        {isPrivacyMode ? '****' : formatMoney(asset.amount)}
                                                    </span>
                                                    {!isPrivacyMode && <DiffBadge current={asset.amount} prev={prevMonthAssetsMap[`${asset.type}-${asset.name}`]} />}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {fixedAssets.length === 0 && <div className="p-4 text-center text-slate-300 text-sm">無固定資產</div>}
                            </div>
                        </section>
                        <section>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                {floatingAssets.map((asset, idx) => (
                                    <div key={asset.id} className={`p-4 flex items-center justify-between relative ${idx !== floatingAssets.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                        {isEditing ? (
                                            <div className="flex-1 flex gap-2 items-center animate-[fadeIn_0.2s]">
                                                <input type="text" value={asset.name || ''} onChange={(e) => handleAssetChange(asset.id, 'name', e.target.value)} className="w-1/3 p-2 border border-slate-200 rounded-lg focus:border-slate-800 outline-none bg-slate-50 text-sm font-serif-tc" placeholder="名稱" />
                                                <input type="number" value={asset.amount || ''} onChange={(e) => handleAssetChange(asset.id, 'amount', Number(e.target.value))} className="w-1/3 p-2 border border-slate-200 rounded-lg focus:border-slate-800 outline-none bg-slate-50 text-sm font-inter text-right" placeholder="金額" />
                                                <button type="button" onClick={(e) => handleDeleteClick(e, asset.id)} className="ml-auto p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors z-20 relative"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 group">
                                                    <span className="font-serif-tc text-slate-700">{asset.name}</span>
                                                    {(asset.originalAmount || asset.currency !== 'TWD') && (
                                                        <div className="relative flex items-center">
                                                            <Info size={14} className="text-slate-300 cursor-help hover:text-teal-500 transition-colors" />
                                                            <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-700">
                                                                <div className="flex justify-between mb-1"><span className="text-slate-400">原始金額:</span><span className="font-inter">{new Intl.NumberFormat().format(asset.originalAmount)} {asset.currency}</span></div>
                                                                {asset.exchangeRate && <div className="flex justify-between"><span className="text-slate-400">匯率:</span><span className="font-inter">{asset.exchangeRate}</span></div>}
                                                                <div className="absolute bottom-[-4px] left-1 w-2 h-2 bg-slate-800 rotate-45 border-r border-b border-slate-700"></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-inter font-medium text-slate-800 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                                        {isPrivacyMode ? '****' : formatMoney(asset.amount)}
                                                    </span>
                                                    {!isPrivacyMode && <DiffBadge current={asset.amount} prev={prevMonthAssetsMap[`${asset.type}-${asset.name}`]} />}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {floatingAssets.length === 0 && <div className="p-4 text-center text-slate-300 text-sm">無浮動資產</div>}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'income' && (
                    <div className="space-y-4 animate-[fadeIn_0.2s]">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            {localIncomes.length > 0 ? localIncomes.map((item, idx) => (
                                <div key={idx} className={`p-4 ${idx !== localIncomes.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                    {isEditing ? (
                                        <div className="flex flex-col gap-3 animate-[fadeIn_0.2s] relative bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">日期</label>
                                                    <input type="date" value={item.date || `${monthKey}-01`} onChange={(e) => handleIncomeChange(idx, 'date', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-xs text-slate-600 h-[38px] font-inter" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">來源</label><input type="text" value={item.company || ''} onChange={(e) => handleIncomeChange(idx, 'company', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-sm font-serif-tc" placeholder="公司/來源" /></div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">銀行</label>
                                                    <select value={item.bank || ''} onChange={(e) => handleIncomeChange(idx, 'bank', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-xs text-slate-600 h-[38px]">
                                                        <option value="" disabled>選擇帳戶</option>
                                                        {assetNames.map(name => <option key={name} value={name}>{name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-1/3">
                                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">幣別</label>
                                                    <select value={item.currency || 'TWD'} onChange={(e) => handleIncomeChange(idx, 'currency', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-xs text-slate-600 h-[38px]">
                                                        <option value="TWD">TWD</option><option value="USD">USD</option><option value="JPY">JPY</option><option value="EUR">EUR</option><option value="CNY">CNY</option><option value="USDT">USDT</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">匯率</label>
                                                    <input type="number" value={item.exchangeRate || 1} onChange={(e) => handleIncomeChange(idx, 'exchangeRate', e.target.value)} disabled={item.currency === 'TWD'} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-sm text-right disabled:text-slate-300" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">原幣金額</label><input type="number" value={item.originalAmount || ''} onChange={(e) => handleIncomeChange(idx, 'originalAmount', Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-sm font-inter text-right" placeholder="0.00" /></div>
                                                <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">台幣金額</label><input type="text" value={item.amount || ''} readOnly className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 text-sm font-inter text-right cursor-not-allowed" /></div>
                                            </div>
                                            <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">備註</label><input type="text" value={item.memo || ''} onChange={(e) => handleIncomeChange(idx, 'memo', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none bg-white text-sm font-serif-tc text-slate-600" placeholder="備註..." /></div>
                                            <button type="button" onClick={() => handleDeleteIncome(idx)} className="absolute top-2 right-2 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="刪除"><Trash2 size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-serif-tc font-bold text-slate-700">{item.company}</span>
                                                    {item.memo && <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 max-w-[120px] truncate"><StickyNote size={10} /><span className="truncate">{item.memo}</span></div>}
                                                </div>
                                                <span className="text-xs text-slate-400 font-inter mt-0.5 flex items-center gap-1">{item.date || monthKey}{item.bank && <><Wallet size={10} /> {item.bank}</>}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-inter font-medium text-emerald-600">+{formatMoney(item.amount)}</span>
                                                {item.currency !== 'TWD' && <span className="text-[10px] text-slate-300 font-inter">{item.originalAmount} {item.currency}</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : <div className="p-8 flex flex-col items-center justify-center text-slate-300"><FileText size={32} className="mb-2 opacity-50" /><span className="text-sm">本月尚無收入明細</span></div>}
                        </div>
                    </div>
                )}

                {activeTab === 'debt' && (
                    <div className="space-y-4 animate-[fadeIn_0.2s]">
                        {monthlyDebtSnapshots.length > 0 && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">本月負債快照版本</span>
                                        <span className="text-[10px] text-slate-400 ml-2">{monthlyDebtSnapshots.length} 個日期</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">最新快照計入總負債</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {monthlyDebtSnapshots.map((snapshot) => (
                                        <div key={snapshot.date} className={`p-4 ${snapshot.date === debtDate ? 'bg-rose-50/40' : ''}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-inter font-bold text-slate-700">{snapshot.date}</span>
                                                        {snapshot.date === debtDate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 font-bold">最新</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-1">
                                                        {snapshot.debts.length > 0 ? snapshot.debts.map((item) => item.name || item.lender || '未命名負債').join('、') : '無負債明細'}
                                                    </div>
                                                </div>
                                                <span className={`font-inter font-bold text-rose-500 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                                    {isPrivacyMode ? '****' : `-${formatMoney(snapshot.total)}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">最新負債快照</span>
                                <span className="text-[10px] text-slate-400">{debtDate || '尚未記錄'}</span>
                            </div>
                            {localDebts.length > 0 ? localDebts.map((item, idx) => (
                                <div key={item._tempId || idx} className={`p-4 ${idx !== localDebts.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                    {isEditing ? (
                                        <div className="flex flex-col gap-3 animate-[fadeIn_0.2s] relative bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <div className="flex gap-2">
                                                <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">名稱</label><input type="text" value={item.name || ''} onChange={(e) => handleDebtChange(idx, 'name', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-rose-500 outline-none bg-white text-sm font-serif-tc" placeholder="負債名稱" /></div>
                                                <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">機構</label><input type="text" value={item.lender || ''} onChange={(e) => handleDebtChange(idx, 'lender', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-rose-500 outline-none bg-white text-sm font-serif-tc" placeholder="機構 / 帳戶" /></div>
                                            </div>
                                            <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">類別</label><select value={item.category || 'other'} onChange={(e) => handleDebtChange(idx, 'category', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-rose-500 outline-none bg-white text-sm"><option value="other">其他</option>{DEBT_CATEGORIES.filter((category) => category.value !== 'other').map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
                                            <div className="flex gap-2">
                                                <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">金額</label><input type="number" value={item.amount || ''} onChange={(e) => handleDebtChange(idx, 'amount', Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg focus:border-rose-500 outline-none bg-white text-sm font-inter text-right" placeholder="0" /></div>
                                            </div>
                                            <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">備註</label><input type="text" value={item.memo || ''} onChange={(e) => handleDebtChange(idx, 'memo', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:border-rose-500 outline-none bg-white text-sm font-serif-tc text-slate-600" placeholder="備註..." /></div>
                                            <button type="button" onClick={() => handleDeleteDebt(idx)} className="absolute top-2 right-2 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="刪除"><Trash2 size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-serif-tc font-bold text-slate-700">{item.name}</span>
                                                    {item.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 font-bold">{getDebtCategoryLabel(item.category)}</span>}
                                                    {item.memo && <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 max-w-[120px] truncate"><StickyNote size={10} /><span className="truncate">{item.memo}</span></div>}
                                                </div>
                                                <span className="text-xs text-slate-400 font-inter mt-0.5 flex items-center gap-1">{item.lender && <><Building2 size={10} /> {item.lender}</>}</span>
                                                {item.pledgeStocks?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.pledgeStocks.map((stock, stockIdx) => (
                                                            <span key={`${stock.symbol}-${stockIdx}`} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-inter">
                                                                {stock.symbol}{stock.shares ? ` · ${formatMoney(Math.trunc(Number(stock.shares)))} 股` : ''}{stock.rate ? ` · ${stock.rate}%` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`font-inter font-medium text-rose-500 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{isPrivacyMode ? '****' : `-${formatMoney(item.amount)}`}</span>
                                        </div>
                                    )}
                                </div>
                            )) : <div className="p-8 flex flex-col items-center justify-center text-slate-300"><ArrowDownRight size={32} className="mb-2 opacity-50" /><span className="text-sm">本月尚無負債快照</span></div>}
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">本月異動明細</span>
                                    <span className="text-[10px] text-slate-400 ml-2">{currentDebtEvents.length} 筆</span>
                                </div>
                                <button onClick={() => setShowDebtEventModal(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors flex items-center gap-1">
                                    <Plus size={14} /> 新增異動
                                </button>
                            </div>
                            {currentDebtEvents.length > 0 ? currentDebtEvents.map((item) => {
                                const impact = getDebtEventImpact(item);
                                const isCostOnly = item.type === 'interest' || item.type === 'fee';
                                return (
                                    <div key={item.id} className="p-4 border-b border-slate-100 last:border-b-0">
                                        <div className="flex justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.type === 'borrow' ? 'bg-emerald-50 text-emerald-600' : item.type === 'repay' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-500'}`}>
                                                        {getDebtEventLabel(item.type)}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-inter">{item.date}</span>
                                                </div>
                                                <div className="font-serif-tc font-bold text-slate-700 truncate">{item.name}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{item.lender || '未指定機構'}</div>
                                                {item.collateral?.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {item.collateral.map((c, idx) => (
                                                            <span key={idx} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{c.symbol} x {c.shares}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.memo && <div className="text-[10px] text-slate-400 mt-2">{item.memo}</div>}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`font-inter font-bold ${isCostOnly ? 'text-rose-500' : impact >= 0 ? 'text-emerald-600' : 'text-blue-600'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                                    {isPrivacyMode ? '****' : isCostOnly ? `-${formatMoney(item.amount)}` : `${impact >= 0 ? '+' : ''}${formatMoney(impact)}`}
                                                </span>
                                                <button onClick={() => handleDeleteDebtEvent(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="刪除異動"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : <div className="p-8 flex flex-col items-center justify-center text-slate-300"><ClipboardCheck size={32} className="mb-2 opacity-50" /><span className="text-sm">本月尚無負債異動</span></div>}
                        </div>
                    </div>
                )}

                {activeTab === 'cost' && (
                    <div className="space-y-4 animate-[fadeIn_0.2s] relative">
                        <div className="sticky top-[72px] z-30 bg-[#F9F9F7]/95 backdrop-blur-sm py-3 -mx-2 px-2 flex justify-between items-center border-b border-slate-200/50 shadow-sm transition-all">
                            <h3 className="text-sm font-serif-tc text-slate-500 font-bold flex items-center gap-2"><ShoppingBag size={16} /> 花費細項</h3>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Filter size={12} className="text-slate-400" /></div>
                                <select value={expenseFilter} onChange={(e) => setExpenseFilter(e.target.value)} className="pl-7 pr-8 py-1 bg-white border border-slate-200 rounded-lg text-xs font-inter text-slate-600 focus:outline-none focus:border-rose-400 appearance-none shadow-sm cursor-pointer">
                                    <option value="all">所有帳戶</option>
                                    {expenseAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none"><ChevronDown size={12} className="text-slate-400" /></div>
                            </div>
                        </div>

                        {expenseChartData.length > 0 && expenseFilter === 'all' && (() => {
                            const sortedData = [...expenseChartData].sort((a, b) => b.value - a.value);
                            const top5 = sortedData.slice(0, 5);
                            return (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-inter mb-4 text-center">消費分類佔比 (Top 5)</div>
                                    <div className="flex items-center justify-center gap-8">
                                        <div className="h-32 w-32 flex-shrink-0 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={sortedData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={35}
                                                        outerRadius={60}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {sortedData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomPieTooltip total={stats.monthlyCost} />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                            {top5.map((item, index) => {
                                                const percent = stats.monthlyCost > 0 ? (item.value / stats.monthlyCost) : 0;
                                                return (
                                                    <div key={item.name} className="flex justify-between items-center text-xs">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                            <span className="text-slate-600 truncate font-medium">{item.name}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-700 font-inter">{formatRate(percent)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            {filteredExpenses.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {filteredExpenses.map((expense) => (
                                        <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-serif-tc font-bold text-slate-700 truncate">{expense.name || expense.subCategory || expense.category}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded whitespace-nowrap">{expense.category}-{expense.subCategory}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 font-inter">
                                                    <span className="flex items-center gap-1"><Calendar size={10} /> {expense.date.split('-')[2]}日</span>
                                                    <span className="flex items-center gap-1"><Wallet size={10} /> {expense.account}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`font-inter font-medium ${expense.amount < 0 ? 'text-emerald-500' : 'text-rose-500'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                                    {isPrivacyMode ? '****' : (
                                                        <>
                                                            {expense.amount < 0 ? '+' : '-'}{formatMoney(Math.abs(expense.amount))}
                                                        </>
                                                    )}
                                                </span>
                                                {expense.currency !== 'TWD' && !isPrivacyMode && (
                                                    <span className="text-[10px] text-slate-300 font-inter">
                                                        {expense.amount < 0 ? '+' : ''}{new Intl.NumberFormat().format(Math.abs(expense.originalAmount))} {expense.currency}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 flex flex-col items-center justify-center text-slate-300"><ShoppingBag size={32} className="mb-2 opacity-50" /><span className="text-sm">本月無相關花費紀錄</span></div>
                            )}
                        </div>
                        <div className="text-center text-[10px] text-slate-400">* 花費資料來自外部匯入，不支援修改刪除</div>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatementModal = ({ data, onClose }) => {
    // Default Dates: Last Month 15th - This Month 16th
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        d.setDate(15);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(16);
        return d.toISOString().split('T')[0];
    });
    const [selectedAccount, setSelectedAccount] = useState('');
    const [checkedItems, setCheckedItems] = useState(new Set());

    // Extract Unique Accounts
    const accounts = useMemo(() => {
        const accs = new Set();
        Object.values(data.expenses || {}).forEach(list => {
            list.forEach(item => {
                if (item.account) accs.add(item.account);
            });
        });
        return Array.from(accs).sort();
    }, [data.expenses]);

    // Set default account
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(accounts[0]);
        }
    }, [accounts]);

    // Filter Expenses
    const filteredExpenses = useMemo(() => {
        if (!selectedAccount) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        // End date should be inclusive, set to end of day
        end.setHours(23, 59, 59, 999);

        const result = [];
        Object.entries(data.expenses || {}).forEach(([month, list]) => {
            // Optimization: Skip months clearly out of range (Optional, strictly checking dates is safer)
            list.forEach(item => {
                // Item date is YYYY/MM/DD or YYYY-MM-DD
                const d = new Date(item.date.replace(/\//g, '-'));
                if (item.account === selectedAccount && d >= start && d <= end) {
                    result.push(item);
                }
            });
        });
        return result.sort((a, b) => new Date(b.date.replace(/\//g, '-')) - new Date(a.date.replace(/\//g, '-')));
    }, [data.expenses, startDate, endDate, selectedAccount]);

    const toggleCheck = (id) => {
        const newSet = new Set(checkedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCheckedItems(newSet);
    };

    const totalAmount = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const checkedAmount = filteredExpenses.filter(i => checkedItems.has(i.id)).reduce((sum, i) => sum + (i.amount || 0), 0);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="bg-teal-100 p-2 rounded-lg"><ClipboardCheck size={20} className="text-teal-700" /></div> 對帳單 Check
                </h3>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">開始日期</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500 font-inter" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">結束日期</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500 font-inter" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">對帳帳戶</label>
                        <div className="relative">
                            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="w-full text-sm p-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500 appearance-none font-inter">
                                {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                            </select>
                            <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto hide-scrollbar border rounded-xl border-slate-100 divide-y divide-slate-50">
                    {filteredExpenses.length > 0 ? filteredExpenses.map(item => (
                        <div key={item.id} onClick={() => toggleCheck(item.id)} className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${checkedItems.has(item.id) ? 'bg-teal-50/50' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checkedItems.has(item.id) ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>
                                    {checkedItems.has(item.id) && <Check size={12} className="text-white" />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{item.name || item.subCategory || item.category}</div>
                                    <div className="text-xs text-slate-400 font-inter">{item.date} • {item.category}</div>
                                </div>
                            </div>
                            <div className={`font-inter font-bold ${checkedItems.has(item.id) ? 'text-teal-600' : 'text-slate-600'}`}>
                                {formatMoney(item.amount)}
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-300 text-sm">此區間無交易紀錄</div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 p-4 rounded-xl">
                    <div>
                        <div className="text-xs text-slate-400">已確認 ({checkedItems.size}/{filteredExpenses.length})</div>
                        <div className="text-lg font-bold text-teal-600 font-inter">{formatMoney(checkedAmount)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-400">總金額</div>
                        <div className="text-lg font-bold text-slate-700 font-inter">{formatMoney(totalAmount)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RangeStatsModal = ({ data, onClose }) => {
    // Default Dates: Start of current month - Today
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    // Calculate Income within range (based on month)
    const incomeStats = useMemo(() => {
        const startMonth = startDate.substring(0, 7);
        const endMonth = endDate.substring(0, 7);
        let total = 0;
        const sources = [];

        Object.entries(data.incomes || {}).forEach(([monthStr, incomeData]) => {
            if (monthStr >= startMonth && monthStr <= endMonth) {
                total += incomeData.totalAmount || 0;
                (incomeData.sources || []).forEach(src => {
                    sources.push({ ...src, month: monthStr });
                });
            }
        });

        return { total, sources, count: sources.length };
    }, [data.incomes, startDate, endDate]);

    // Calculate Asset change within range
    const assetStats = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const sortedDates = Object.keys(data.records || {}).sort((a, b) => new Date(a) - new Date(b));

        // Find closest date at or before start
        let startAssetDate = null;
        let endAssetDate = null;

        for (const d of sortedDates) {
            const dateObj = new Date(d);
            if (dateObj <= start) {
                startAssetDate = d;
            }
            if (dateObj <= end) {
                endAssetDate = d;
            }
        }

        const startRecords = data.records[startAssetDate] || [];
        const endRecords = data.records[endAssetDate] || [];

        // Calculate totals by type
        const calcByType = (records) => {
            let fixed = 0, floating = 0;
            const floatingItems = [];
            records.forEach(item => {
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

        // Calculate floating asset changes (compare by name)
        const floatingChanges = [];
        const startFloatingMap = new Map(startStats.floatingItems.map(i => [i.name, i.amount]));
        const endFloatingMap = new Map(endStats.floatingItems.map(i => [i.name, i.amount]));

        // All unique floating asset names
        const allFloatingNames = new Set([...startFloatingMap.keys(), ...endFloatingMap.keys()]);
        allFloatingNames.forEach(name => {
            const startAmt = startFloatingMap.get(name) || 0;
            const endAmt = endFloatingMap.get(name) || 0;
            const change = endAmt - startAmt;
            if (change !== 0) {
                floatingChanges.push({ name, startAmt, endAmt, change });
            }
        });

        // Sort by absolute change descending
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
    }, [data.records, startDate, endDate]);

    // Calculate Expenses within range
    const expenseStats = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        let total = 0;
        const categories = {};
        let count = 0;

        Object.entries(data.expenses || {}).forEach(([month, list]) => {
            list.forEach(item => {
                const d = new Date(item.date.replace(/\//g, '-'));
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
    }, [data.expenses, startDate, endDate]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="bg-purple-100 p-2 rounded-lg"><PieChartIcon size={20} className="text-purple-700" /></div> 區間統計 Report
                </h3>

                {/* Date Filters */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">開始日期</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-inter" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">結束日期</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-inter" />
                    </div>
                </div>

                {/* Quick Date Selection */}
                <div className="flex gap-2 mb-6">
                    {[
                        { label: '近 3 個月', months: 3 },
                        { label: '近半年', months: 6 },
                        { label: '近 1 年', months: 12 }
                    ].map(({ label, months }) => (
                        <button
                            key={months}
                            onClick={() => {
                                const now = new Date();
                                // End date: last day of current month
                                const endYear = now.getFullYear();
                                const endMonth = now.getMonth();
                                const lastDay = new Date(endYear, endMonth + 1, 0).getDate();
                                const newEndDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                                // Start date: first day of (current month - months + 1)
                                const startMonthDate = new Date(endYear, endMonth - months + 1, 1);
                                const newStartDate = startMonthDate.toISOString().split('T')[0];

                                setStartDate(newStartDate);
                                setEndDate(newEndDate);
                            }}
                            className="flex-1 py-1.5 px-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Stats Cards */}
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4">
                    {/* Income Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <DollarSign size={16} />
                            </div>
                            <span className="font-bold text-slate-700">收入統計</span>
                            <span className="text-xs text-slate-400 ml-auto">{incomeStats.count} 筆</span>
                        </div>
                        <div className="text-2xl font-inter font-bold text-emerald-600 mb-2">
                            +{formatMoney(incomeStats.total)} <span className="text-sm font-normal text-slate-400">TWD</span>
                        </div>
                        {incomeStats.sources.length > 0 && (
                            <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-emerald-100">
                                {incomeStats.sources.slice(0, 3).map((src, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{src.company}</span>
                                        <span className="font-inter">{formatMoney(src.amount)}</span>
                                    </div>
                                ))}
                                {incomeStats.sources.length > 3 && (
                                    <div className="text-slate-400">...還有 {incomeStats.sources.length - 3} 筆</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Asset Change Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                            <span className="font-bold text-slate-700">資產變化</span>
                        </div>
                        <div className={`text-2xl font-inter font-bold mb-2 ${assetStats.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {assetStats.change >= 0 ? '+' : ''}{formatMoney(assetStats.change)} <span className="text-sm font-normal text-slate-400">TWD</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100 text-xs">
                            <div>
                                <div className="text-slate-400 mb-0.5">期初資產 {assetStats.startDate && `(${assetStats.startDate})`}</div>
                                <div className="font-inter font-bold text-slate-600">{formatMoney(assetStats.startAssets)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-400 mb-0.5">期末資產 {assetStats.endDate && `(${assetStats.endDate})`}</div>
                                <div className="font-inter font-bold text-slate-600">{formatMoney(assetStats.endAssets)}</div>
                            </div>
                        </div>

                        {/* Fixed vs Floating Breakdown */}
                        <div className="mt-3 pt-3 border-t border-blue-100 space-y-2 text-xs">
                            {/* Fixed Assets Row */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Lock size={12} className="text-slate-400" />
                                    <span className="text-slate-600 font-medium">固定資產</span>
                                </div>
                                <span className={`font-inter font-bold ${assetStats.fixed.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {assetStats.fixed.change >= 0 ? '+' : ''}{formatMoney(assetStats.fixed.change)}
                                </span>
                            </div>

                            {/* Floating Assets Row */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Activity size={12} className="text-slate-400" />
                                    <span className="text-slate-600 font-medium">浮動資產</span>
                                </div>
                                <span className={`font-inter font-bold ${assetStats.floating.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {assetStats.floating.change >= 0 ? '+' : ''}{formatMoney(assetStats.floating.change)}
                                </span>
                            </div>

                            {/* Floating Asset Details (indented) */}
                            {assetStats.floating.changes.length > 0 && (
                                <div className="ml-6 pl-2 border-l-2 border-blue-200 space-y-1 mt-1">
                                    {assetStats.floating.changes.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[11px]">
                                            <span className="text-slate-500 truncate max-w-[140px]">{item.name}</span>
                                            <span className={`font-inter font-medium ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                {item.change >= 0 ? '+' : ''}{formatMoney(item.change)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expense Card */}
                    <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-4 rounded-xl border border-rose-100">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                                <ShoppingBag size={16} />
                            </div>
                            <span className="font-bold text-slate-700">花費統計</span>
                            <span className="text-xs text-slate-400 ml-auto">{expenseStats.count} 筆</span>
                        </div>
                        <div className="text-2xl font-inter font-bold text-rose-500 mb-2">
                            -{formatMoney(expenseStats.total)} <span className="text-sm font-normal text-slate-400">TWD</span>
                        </div>
                        {expenseStats.topCategories.length > 0 && (
                            <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-rose-100">
                                <div className="text-slate-400 mb-1">前五大類別</div>
                                {expenseStats.topCategories.map(([cat, amt], idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{cat}</span>
                                        <span className="font-inter">{formatMoney(amt)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-800 text-white p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">淨收支 (收入 - 花費)</span>
                            <span className={`text-xl font-inter font-bold ${(incomeStats.total - expenseStats.total) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(incomeStats.total - expenseStats.total) >= 0 ? '+' : ''}{formatMoney(incomeStats.total - expenseStats.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FIREModal = ({ fireStats, yearlyStats = [], onRateChange, onClose }) => {
    const [localRate, setLocalRate] = useState(fireStats.rate);
    useEffect(() => { setLocalRate(fireStats.rate); }, [fireStats.rate]);
    const handleBlur = () => { onRateChange(localRate); };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-6 flex items-center gap-2 flex-shrink-0">
                    <div className="bg-amber-100 p-2 rounded-lg"><Mountain size={20} className="text-amber-700" /></div> FIRE 目標
                </h3>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden group mb-4 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-sm font-serif-tc font-bold text-slate-500 flex items-center gap-2">
                                達成進度
                                <span className="bg-white text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-inter border border-slate-200 flex items-center">
                                    Rate:
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={localRate}
                                        onChange={(e) => setLocalRate(e.target.value)}
                                        onBlur={handleBlur}
                                        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                                        className="w-12 bg-transparent text-center outline-none border-b border-dashed border-slate-300 focus:border-amber-500 ml-1 font-bold text-amber-600 appearance-none"
                                    />%
                                </span>
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">月均花費 {formatWan(fireStats.avgExpense)} / 年支預估 {formatWan(fireStats.avgExpense * 12)}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400 mb-1">目標資產</div>
                            <div className="text-lg font-bold font-inter text-slate-800">{formatWan(fireStats.fireTarget)}</div>
                        </div>
                    </div>

                    <div className="mb-2 flex justify-between items-end text-xs">
                        <span className="font-bold text-teal-600 font-inter">{formatPercent(fireStats.progress)}</span>
                        <span className="text-slate-400 font-inter">{formatWan(fireStats.currentAssets)} / {formatWan(fireStats.fireTarget)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(fireStats.progress * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 mt-4 pr-1 -mr-2 custom-scrollbar">
                    <div className="space-y-3 pr-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sticky top-0 bg-white z-10 py-1">年度花費統計</h4>
                        {yearlyStats.map((stat) => (
                            <div key={stat.year} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                                <span className="font-bold font-inter text-slate-600 w-12">{stat.year}</span>
                                <div className="flex-1 px-2 text-right">
                                    <span className="block font-inter font-bold text-slate-700">{formatWan(stat.avg)}</span>
                                    <span className="text-[10px] text-slate-400">平均月花費</span>
                                </div>
                                <div className="w-px h-6 bg-slate-100 mx-2"></div>
                                <div className="text-[10px] text-slate-400 flex flex-col items-end w-24">
                                    <div className="flex items-center gap-1">Max <span className="font-inter text-slate-600">{formatWan(stat.max.val)}</span> ({stat.max.month}月)</div>
                                    <div className="flex items-center gap-1">Min <span className="font-inter text-slate-600">{formatWan(stat.min.val)}</span> ({stat.min.month}月)</div>
                                </div>
                            </div>
                        ))}
                        {yearlyStats.length === 0 && <div className="text-center text-slate-300 text-xs py-2">尚無花費紀錄</div>}
                        <div className="text-center text-xs text-slate-400 mt-4 pt-4 border-t border-slate-50 pb-2">
                            設定您的提領率來動態計算 FIRE 目標金額。
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StockAnalysisView = ({ data, onBack, onImportTransactions, onClearTransactions, onImportHoldingSnapshot, onDeleteHoldingSnapshot, isPrivacyMode }) => {
    const [inputText, setInputText] = useState('');
    const [holdingRows, setHoldingRows] = useState([{ id: 'holding-row-1', market: 'TW', name: '', price: '', shares: '' }]);
    const [holdingMonth, setHoldingMonth] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });
    const [holdingNote, setHoldingNote] = useState('');
    const [preview, setPreview] = useState(null);
    const [holdingPreview, setHoldingPreview] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [confirmClear, setConfirmClear] = useState(false);
    const [showTransactionImportModal, setShowTransactionImportModal] = useState(false);
    const [showHoldingImportModal, setShowHoldingImportModal] = useState(false);
    const [confirmDeleteSnapshot, setConfirmDeleteSnapshot] = useState(null);
    const [stockSearch, setStockSearch] = useState('');
    const [marketFilter, setMarketFilter] = useState('TW');
    const [usdToTwdRate, setUsdToTwdRate] = useState(DEFAULT_EXCHANGE_RATES.USD);
    const [usPnlCurrency, setUsPnlCurrency] = useState('USD');

    const holdingSnapshots = useMemo(() => Object.entries(data.stockHoldingSnapshots || {}).flatMap(([month, versions]) =>
        (versions || []).map((snapshot) => ({ ...snapshot, month }))
    ).sort((a, b) => new Date(b.importedAt || 0) - new Date(a.importedAt || 0)), [data.stockHoldingSnapshots]);

    const [selectedSnapshotId, setSelectedSnapshotId] = useState('');

    const visibleHoldingSnapshots = useMemo(() => (
        holdingSnapshots.filter((snapshot) => (snapshot.holdings || []).some((holding) => (holding.market || 'TW') === marketFilter))
    ), [holdingSnapshots, marketFilter]);

    const selectedSnapshot = useMemo(() => {
        if (visibleHoldingSnapshots.length === 0) return null;
        return visibleHoldingSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) || visibleHoldingSnapshots[0];
    }, [visibleHoldingSnapshots, selectedSnapshotId]);

    const selectedSnapshotHoldings = useMemo(() => {
        if (!selectedSnapshot) return [];
        return (selectedSnapshot.holdings || []).filter((holding) => (holding.market || 'TW') === marketFilter);
    }, [selectedSnapshot, marketFilter]);

    const stockMarketCounts = useMemo(() => {
        const sets = { TW: new Set(), US: new Set() };
        const addKey = (market, symbol) => {
            if (!symbol) return;
            const normalizedMarket = market || 'TW';
            const key = `${normalizedMarket}:${symbol}`;
            if (!sets[normalizedMarket]) sets[normalizedMarket] = new Set();
            sets[normalizedMarket].add(key);
        };

        (data.stockTransactions || []).forEach((trade) => {
            if (!trade.symbol || trade.type === 'deposit' || trade.unassigned) return;
            addKey(trade.market || 'TW', trade.symbol);
        });
        holdingSnapshots.forEach((snapshot) => {
            (snapshot.holdings || []).forEach((holding) => addKey(holding.market || 'TW', holding.symbol || holding.name));
        });

        return Object.fromEntries(Object.entries(sets).map(([market, values]) => [market, values.size]));
    }, [data.stockTransactions, holdingSnapshots]);

    const holdingMap = useMemo(() => {
        const map = {};
        selectedSnapshotHoldings.forEach((holding) => {
            const keys = [holding.symbol, holding.name].filter(Boolean);
            keys.forEach((key) => {
                const market = holding.market || 'TW';
                const mapKey = `${market}:${key}`;
                map[mapKey] = {
                    value: (map[mapKey]?.value || 0) + (Number(holding.marketValue) || 0),
                    costAmount: (map[mapKey]?.costAmount || 0) + (Number(holding.costAmount) || 0),
                    shares: (map[mapKey]?.shares || 0) + (Number(holding.shares) || 0),
                    date: selectedSnapshot.month,
                    holding
                };
            });
        });
        return map;
    }, [selectedSnapshot, selectedSnapshotHoldings]);

    const stockRows = useMemo(() => {
        const bySymbol = {};
        (data.stockTransactions || []).forEach((trade) => {
            if (!trade.symbol || trade.type === 'deposit' || trade.unassigned) return;
            const symbol = trade.symbol;
            const market = trade.market || 'TW';
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
            const market = holding.market || 'TW';
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
    }, [data.stockTransactions, holdingMap, selectedSnapshot]);

    const marketFilteredStockRows = useMemo(() => (
        stockRows.filter((item) => item.market === marketFilter)
    ), [stockRows, marketFilter]);

    const marketFilteredTransactions = useMemo(() => (
        (data.stockTransactions || []).filter((trade) => (trade.market || 'TW') === marketFilter)
    ), [data.stockTransactions, marketFilter]);

    const stockStats = useMemo(() => ({
        totalBuy: marketFilteredStockRows.reduce((sum, item) => sum + item.buyAmount, 0),
        totalMarketValue: marketFilteredStockRows.reduce((sum, item) => sum + item.marketValue, 0),
        totalDividends: marketFilteredTransactions.filter((trade) => trade.type === 'dividend').reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        totalPnl: marketFilteredStockRows.reduce((sum, item) => sum + item.totalPnl, 0) + marketFilteredTransactions.filter((trade) => trade.type === 'dividend' && trade.unassigned).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    }), [marketFilteredStockRows, marketFilteredTransactions]);

    useEffect(() => {
        if (marketFilter !== 'US' || typeof fetch === 'undefined') return;
        let isCancelled = false;
        fetch('https://api.exchangerate-api.com/v4/latest/USD')
            .then((response) => response.json())
            .then((rateData) => {
                const rate = Number(rateData?.rates?.TWD);
                if (!isCancelled && rate > 0) setUsdToTwdRate(rate);
            })
            .catch(() => {
                if (!isCancelled) setUsdToTwdRate(DEFAULT_EXCHANGE_RATES.USD);
            });
        return () => { isCancelled = true; };
    }, [marketFilter]);

    const totalPnlLabel = useMemo(() => {
        if (isPrivacyMode) return '****';
        const sign = stockStats.totalPnl >= 0 ? '+' : '';
        if (marketFilter !== 'US') return `${sign}${formatMoney(stockStats.totalPnl)}`;
        const twdAmount = stockStats.totalPnl * usdToTwdRate;
        if (usPnlCurrency === 'TWD') return `NT$${sign}${formatMoney(twdAmount)}`;
        return `(USD) ${sign}${formatMoneyByMarket(stockStats.totalPnl, 'US')}`;
    }, [isPrivacyMode, marketFilter, stockStats.totalPnl, usdToTwdRate, usPnlCurrency]);

    const filteredStockRows = useMemo(() => {
        const keyword = stockSearch.trim().toLowerCase();
        if (!keyword) return marketFilteredStockRows;
        return marketFilteredStockRows.filter((item) => `${item.symbol} ${item.name}`.toLowerCase().includes(keyword));
    }, [marketFilteredStockRows, stockSearch]);

    const stockChartRows = useMemo(() => {
        const rows = [...filteredStockRows]
            .sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl))
            .slice(0, 8);
        const maxAbs = Math.max(...rows.map((item) => Math.abs(item.totalPnl)), 1);
        return rows.map((item) => ({ ...item, barWidth: Math.max(6, Math.round((Math.abs(item.totalPnl) / maxAbs) * 100)) }));
    }, [filteredStockRows]);

    const parseImportText = (text) => {
        setErrorMsg('');
        try {
            const result = processStockCSVText(text);
            if (result.transactions.length === 0) return setErrorMsg('沒有找到可匯入的股票交易。');
            setPreview(result);
        } catch (error) {
            setErrorMsg(error.message || '無法解析股票交易 CSV');
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => parseImportText(e.target.result);
        reader.onerror = () => setErrorMsg('讀取檔案失敗');
        reader.readAsText(file);
        event.target.value = '';
    };

    const parseHoldingRows = () => {
        setErrorMsg('');
        const activeRows = holdingRows.filter((row) => row.name.trim() || row.price || row.shares);
        if (activeRows.length === 0) {
            setErrorMsg('請至少輸入一筆持倉資料。');
            return;
        }

        const skippedRows = [];
        const holdings = activeRows.flatMap((row, index) => {
            const name = row.name.trim();
            const marketPrice = parseAmount(row.price);
            const shares = parseAmount(row.shares);
            if (!name || marketPrice <= 0 || shares <= 0) {
                skippedRows.push({ row: index + 1, item: name || '空白', reason: '請確認股票名稱、現價與股數都有填寫' });
                return [];
            }
            return [{
                id: `holding-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                month: holdingMonth,
                market: row.market || 'TW',
                symbol: '',
                name,
                shares,
                averageCost: 0,
                costAmount: 0,
                marketPrice,
                marketValue: marketPrice * shares,
                account: ''
            }];
        });

        if (holdings.length === 0) {
            setErrorMsg('沒有找到可匯入的持倉快照。請確認至少一列資料完整。');
            return;
        }

        setHoldingPreview({ month: holdingMonth, note: holdingNote.trim(), holdings, skippedRows });
    };

    const confirmImport = () => {
        onImportTransactions(preview.transactions);
        setPreview(null);
        setInputText('');
        setShowTransactionImportModal(false);
    };

    const confirmHoldingImport = () => {
        onImportHoldingSnapshot(holdingPreview);
        setHoldingPreview(null);
        setHoldingRows([{ id: `holding-row-${Date.now()}`, market: 'TW', name: '', price: '', shares: '' }]);
        setHoldingNote('');
        setShowHoldingImportModal(false);
    };

    const stockMoney = (amount, market = marketFilter, prefix = '') => isPrivacyMode ? '****' : `${prefix}${formatMoneyByMarket(amount, market)}`;
    const updateHoldingRow = (id, field, value) => setHoldingRows((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
    const addHoldingRow = () => setHoldingRows((rows) => [...rows, { id: `holding-row-${Date.now()}-${rows.length}`, market: rows.at(-1)?.market || 'TW', name: '', price: '', shares: '' }]);
    const removeHoldingRow = (id) => setHoldingRows((rows) => rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);
    const getSnapshotMarketHoldings = (snapshot) => (snapshot.holdings || []).filter((holding) => (holding.market || 'TW') === marketFilter);
    const topWinners = marketFilteredStockRows.filter((item) => item.totalPnl > 0).slice(0, 5);
    const topLosers = [...marketFilteredStockRows].filter((item) => item.totalPnl < 0).sort((a, b) => a.totalPnl - b.totalPnl).slice(0, 5);
    const latestTrades = [...marketFilteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

    return (
        <div className="min-h-screen bg-[#F9F9F7] text-slate-800 font-sans animate-[fadeIn_0.2s]">
            <header className="sticky top-0 z-30 bg-[#F9F9F7]/95 backdrop-blur-md border-b border-slate-200/70 px-6 py-5">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white transition-colors"><ArrowLeft size={22} /></button>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-inter">Stock Lab</div>
                        <h2 className="text-xl font-serif-tc font-bold text-slate-800">個股績效</h2>
                    </div>
                </div>
            </header>

            <main className="px-6 py-6 pb-24 space-y-6">
                <section className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl shadow-slate-900/10 relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
                    {marketFilter === 'US' && (
                        <button onClick={() => setUsPnlCurrency((currency) => currency === 'USD' ? 'TWD' : 'USD')} className="absolute right-4 top-4 z-20 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] font-bold text-slate-200 transition-colors">
                            {usPnlCurrency === 'USD' ? '轉台幣' : '轉美金'}
                        </button>
                    )}
                    <div className="relative z-10">
                        <div className="text-xs text-slate-400 mb-1">目前總損益</div>
                        <div className={`text-3xl font-inter font-bold ${stockStats.totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{totalPnlLabel}</div>
                        {marketFilter === 'US' && !isPrivacyMode && (
                            <div className="text-[10px] text-slate-500 mt-1">匯率 USD/TWD {formatExchangeRate(usdToTwdRate)}</div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-5 text-xs">
                            <div className="bg-white/5 rounded-xl p-3"><div className="text-slate-400 mb-1">累計買入</div><div className="font-inter font-bold">{stockMoney(stockStats.totalBuy)}</div></div>
                            <div className="bg-white/5 rounded-xl p-3"><div className="text-slate-400 mb-1">快照市值</div><div className="font-inter font-bold">{stockMoney(stockStats.totalMarketValue)}</div></div>
                            <div className="bg-white/5 rounded-xl p-3"><div className="text-slate-400 mb-1">累計股息</div><div className="font-inter font-bold text-amber-200">{stockMoney(stockStats.totalDividends, marketFilter, '+')}</div></div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3">目前市值會以選定的持倉快照版本計算。</p>
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 grid grid-cols-2 gap-2">
                    {STOCK_MARKETS.map((market) => {
                        const count = stockMarketCounts[market.value] || 0;
                        return (
                            <button key={market.value} onClick={() => setMarketFilter(market.value)} className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${marketFilter === market.value ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {market.label}
                                <span className={`ml-1 text-[10px] ${marketFilter === market.value ? 'text-slate-300' : 'text-slate-300'}`}>{count}</span>
                            </button>
                        );
                    })}
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-base font-serif-tc font-bold text-slate-800">資料匯入</h3>
                            <p className="text-xs text-slate-400 mt-1">股票交易採 append；持倉快照每次寫入都會新增版本。</p>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">獨立功能</span>
                    </div>
                    {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold mb-3"><AlertCircle size={14} />{errorMsg}</div>}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { setErrorMsg(''); setShowTransactionImportModal(true); }} className="p-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-left">
                            <Upload size={18} className="mb-2" />
                            <div className="font-bold text-sm">匯入股票交易</div>
                            <div className="text-[10px] text-blue-500 mt-1">檔案或貼上 CSV</div>
                        </button>
                        <button onClick={() => { setErrorMsg(''); setShowHoldingImportModal(true); }} className="p-4 rounded-2xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors text-left">
                            <Package size={18} className="mb-2" />
                            <div className="font-bold text-sm">匯入持倉快照</div>
                            <div className="text-[10px] text-teal-500 mt-1">手動輸入持倉</div>
                        </button>
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-serif-tc font-bold text-slate-700">持倉快照版本</h3>
                        <span className="text-[10px] text-slate-400">{getStockMarketLabel(marketFilter)} · {visibleHoldingSnapshots.length} 版</span>
                    </div>
                    {visibleHoldingSnapshots.length > 0 ? (
                        <>
                            {visibleHoldingSnapshots.slice(0, 8).map((snapshot) => {
                                const snapshotMarketHoldings = getSnapshotMarketHoldings(snapshot);
                                return (
                                <div key={snapshot.id} className={`px-4 py-3 border-b border-slate-50 ${selectedSnapshot?.id === snapshot.id ? 'bg-teal-50/60' : ''}`}>
                                    <div className="flex justify-between gap-3">
                                        <button onClick={() => setSelectedSnapshotId(snapshot.id)} className="text-left flex-1">
                                            <div className="font-bold text-sm text-slate-700">{snapshot.month} v{snapshot.version} {selectedSnapshot?.id === snapshot.id && <span className="text-[10px] text-teal-600 ml-1">使用中</span>}</div>
                                            <div className="text-xs text-slate-400">{snapshotMarketHoldings.length} 檔 · {getStockMarketLabel(marketFilter)} · {snapshot.note || '無備註'} · {snapshot.importedAt?.slice(0, 10)}</div>
                                        </button>
                                        <button onClick={() => setConfirmDeleteSnapshot(snapshot)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="刪除版本"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                );
                            })}
                            {selectedSnapshot && (
                                <div className="bg-slate-50/70 border-t border-slate-100 p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">版本內容</h4>
                                        <span className="text-[10px] text-slate-400">{selectedSnapshot.month} v{selectedSnapshot.version}</span>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {selectedSnapshotHoldings.map((holding) => (
                                            <div key={holding.id} className="bg-white rounded-xl border border-slate-100 p-3 flex justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-700 truncate">{holding.name || holding.symbol}</div>
                                                    <div className="text-[10px] text-slate-400 font-inter">{getStockMarketLabel(holding.market || 'TW')} · {formatMoneyByMarket(holding.marketPrice || 0, holding.market || 'TW')} x {formatMoneyByMarket(holding.shares || 0, holding.market || 'TW')} 股</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-inter font-bold text-teal-600">{formatMoneyByMarket(holding.marketValue || 0, holding.market || 'TW')}</div>
                                                    <div className="text-[10px] text-slate-400">目前市值</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : <div className="p-6 text-center text-slate-300 text-sm">尚無{getStockMarketLabel(marketFilter)}持倉快照，總損益會缺少目前市值。</div>}
                </section>

                <section className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-base font-serif-tc font-bold text-slate-800 flex items-center gap-2"><Trash2 size={16} /> 股票交易資料</h3>
                            <p className="text-xs text-slate-400 mt-1">目前{getStockMarketLabel(marketFilter)}已有 {marketFilteredTransactions.length} 筆。若剛剛重複匯入或想重新整理，可以只清空目前市場再匯入。</p>
                        </div>
                        <button onClick={() => setConfirmClear(true)} disabled={marketFilteredTransactions.length === 0} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-500 text-xs font-bold hover:bg-rose-100 disabled:bg-slate-50 disabled:text-slate-300 transition-colors">刪除{getStockMarketLabel(marketFilter)}</button>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <h3 className="text-xs font-bold text-emerald-600 mb-3 flex items-center gap-1"><TrendingUp size={14} /> 賺最多</h3>
                        {topWinners.length > 0 ? topWinners.map((item) => <div key={item.key} className="py-2 border-b border-slate-50 last:border-0"><div className="font-bold text-slate-700 text-sm">{item.symbol}</div><div className={`text-xs font-inter text-emerald-600 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{stockMoney(item.totalPnl, item.market, '+')}</div></div>) : <div className="text-xs text-slate-300 py-4">尚無獲利資料</div>}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <h3 className="text-xs font-bold text-rose-500 mb-3 flex items-center gap-1"><TrendingDown size={14} /> 虧最多</h3>
                        {topLosers.length > 0 ? topLosers.map((item) => <div key={item.key} className="py-2 border-b border-slate-50 last:border-0"><div className="font-bold text-slate-700 text-sm">{item.symbol}</div><div className={`text-xs font-inter text-rose-500 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{stockMoney(item.totalPnl, item.market)}</div></div>) : <div className="text-xs text-slate-300 py-4">尚無虧損資料</div>}
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 space-y-3">
                        <div className="flex items-center justify-between"><h3 className="text-sm font-serif-tc font-bold text-slate-700">個股損益表</h3><span className="text-[10px] text-slate-400">{getStockMarketLabel(marketFilter)} · {filteredStockRows.length} / {marketFilteredStockRows.length} 檔</span></div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-blue-500 outline-none text-sm" placeholder="搜尋股票名稱或代號" />
                        </div>
                    </div>
                    {stockRows.length > 0 && (
                        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1"><Activity size={13} /> 個股損益圖表</h4>
                                <span className="text-[10px] text-slate-400">依損益絕對值排序</span>
                            </div>
                            {stockChartRows.length > 0 ? (
                                <div className="space-y-2">
                                    {stockChartRows.map((item) => (
                                        <div key={item.key} className="grid grid-cols-[76px_1fr_72px] gap-2 items-center text-xs">
                                            <div className="font-bold text-slate-600 truncate">{item.symbol}</div>
                                            <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-100">
                                                <div className={`h-full rounded-full ${item.totalPnl >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${item.barWidth}%` }}></div>
                                            </div>
                                            <div className={`text-right font-inter font-bold ${item.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-500'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{stockMoney(item.totalPnl, item.market, item.totalPnl >= 0 ? '+' : '')}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-center text-slate-300 text-sm py-4">搜尋結果沒有可顯示的圖表資料</div>}
                        </div>
                    )}
                    {marketFilteredStockRows.length > 0 ? (filteredStockRows.length > 0 ? <div className="divide-y divide-slate-100">{filteredStockRows.map((item) => (
                        <div key={item.key} className="p-4">
                            <div className="flex justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2"><span className="font-serif-tc font-bold text-slate-800">{item.symbol}</span><span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{getStockMarketLabel(item.market)}</span>{item.realizedOnly && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">已實現</span>}{!item.hasSnapshot && !item.realizedOnly && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">未對應資產快照</span>}</div>
                                    <div className="text-xs text-slate-400 mt-1">{item.tradeCount} 筆交易，最近 {item.latestTradeDate}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-inter font-bold ${item.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-500'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{stockMoney(item.totalPnl, item.market, item.totalPnl >= 0 ? '+' : '')}</div>
                                    <div className="text-[10px] text-slate-400 font-inter">{formatRate(item.roi)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                                <div className="bg-slate-50 rounded-lg p-2"><div className="text-slate-400">買入</div><div className="font-inter text-slate-700">{stockMoney(item.buyAmount, item.market)}</div></div>
                                <div className="bg-slate-50 rounded-lg p-2"><div className="text-slate-400">市值</div><div className="font-inter text-slate-700">{stockMoney(item.marketValue, item.market)}</div></div>
                                <div className="bg-slate-50 rounded-lg p-2"><div className="text-slate-400">股息</div><div className="font-inter text-amber-600">{stockMoney(item.dividends, item.market, '+')}</div></div>
                            </div>
                        </div>
                    ))}</div> : <div className="p-8 text-center text-slate-300 text-sm">找不到符合搜尋的股票</div>) : <div className="p-8 text-center text-slate-300 text-sm">尚無{getStockMarketLabel(marketFilter)}股票交易資料</div>}
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100"><h3 className="text-sm font-serif-tc font-bold text-slate-700">最近匯入交易</h3></div>
                    {latestTrades.length > 0 ? latestTrades.map((trade) => <div key={trade.id} className="px-4 py-3 border-b border-slate-50 last:border-0 flex justify-between items-center"><div><div className="font-bold text-sm text-slate-700">{trade.symbol || trade.rawItem || trade.name}</div><div className="text-xs text-slate-400">{trade.date} · {getStockMarketLabel(trade.market || 'TW')} · {getStockTradeLabel(trade.type)}</div></div><div className={`font-inter text-sm font-bold ${trade.type === 'buy' ? 'text-slate-600' : 'text-emerald-600'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{stockMoney(trade.amount, trade.market || 'TW', trade.type === 'buy' ? '-' : '+')}</div></div>) : <div className="p-8 text-center text-slate-300 text-sm">尚無交易明細</div>}
                </section>
            </main>

            {showTransactionImportModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto relative">
                        <button onClick={() => setShowTransactionImportModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600"><X size={18} /></button>
                        <div className="mb-4 pr-8">
                            <h3 className="text-xl font-serif-tc font-bold text-slate-800 flex items-center gap-2"><Upload size={18} /> 匯入股票交易</h3>
                            <p className="text-sm text-slate-400 mt-1">支援檔案或直接貼上 CSV。匯入採 append，不會覆蓋既有資料。</p>
                        </div>
                        {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold mb-4"><AlertCircle size={14} />{errorMsg}</div>}
                        <div className="relative border border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 hover:text-blue-600 transition-colors text-slate-400 bg-slate-50">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Upload size={18} className="mx-auto mb-1" />
                            <div className="text-xs font-bold">選擇股票交易 CSV</div>
                        </div>
                        <div className="mt-4">
                            <label className="text-xs text-slate-400 font-bold mb-1 block">或貼上 CSV 內容</label>
                            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full min-h-[160px] p-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-blue-500 outline-none text-xs font-inter text-slate-700" placeholder={"類型,日期,項目,股票買入,存入戶頭,帳面餘額\n匯款,2016/2/1,ＡＴＭ轉,,30000,32000\n,2016/2/3,國泰金,37081,,24919"} />
                            <button onClick={() => parseImportText(inputText)} disabled={!inputText.trim()} className="mt-3 w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">預覽匯入明細</button>
                        </div>
                    </div>
                </div>
            )}

            {showHoldingImportModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto relative">
                        <button onClick={() => setShowHoldingImportModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600"><X size={18} /></button>
                        <div className="mb-4 pr-8">
                            <h3 className="text-xl font-serif-tc font-bold text-slate-800 flex items-center gap-2"><Package size={18} /> 匯入持倉快照</h3>
                            <p className="text-sm text-slate-400 mt-1">用來記錄月底持股市值。每次寫入都會新增版本。</p>
                        </div>
                        {errorMsg && <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl flex items-center gap-2 font-bold mb-4"><AlertCircle size={14} />{errorMsg}</div>}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 font-bold mb-1 block">快照月份</label>
                                <input type="month" value={holdingMonth} onChange={(e) => setHoldingMonth(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-blue-500 outline-none text-sm font-inter" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold mb-1 block">版本備註</label>
                                <input type="text" value={holdingNote} onChange={(e) => setHoldingNote(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-blue-500 outline-none text-sm" placeholder="例如：10 月底" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="text-xs text-slate-400 font-bold mb-1 block">手動輸入持倉</label>
                            <div className="space-y-2">
                                {holdingRows.map((row, index) => (
                                    <div key={row.id} className="grid grid-cols-[76px_1fr_72px_72px_64px] gap-2 items-end">
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">市場</label>}
                                            <select value={row.market || 'TW'} onChange={(e) => updateHoldingRow(row.id, 'market', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-teal-500 outline-none text-sm">
                                                <option value="TW">台股</option>
                                                <option value="US">美股</option>
                                            </select>
                                        </div>
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">股票名稱</label>}
                                            <input type="text" value={row.name} onChange={(e) => updateHoldingRow(row.id, 'name', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-teal-500 outline-none text-sm" placeholder="台積電" />
                                        </div>
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">現價</label>}
                                            <input type="number" value={row.price} onChange={(e) => updateHoldingRow(row.id, 'price', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-teal-500 outline-none text-sm text-right font-inter" placeholder="0" />
                                        </div>
                                        <div>
                                            {index === 0 && <label className="text-[10px] text-slate-400 font-bold mb-1 block">股數</label>}
                                            <input type="number" value={row.shares} onChange={(e) => updateHoldingRow(row.id, 'shares', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-teal-500 outline-none text-sm text-right font-inter" placeholder="0" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button type="button" onClick={addHoldingRow} className="flex-1 h-10 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors flex items-center justify-center" title="新增一列"><Plus size={14} /></button>
                                            <button type="button" onClick={() => removeHoldingRow(row.id)} disabled={holdingRows.length === 1} className="flex-1 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:bg-slate-50 disabled:text-slate-300 transition-colors flex items-center justify-center" title="刪除此列"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">至少保留一列資料。市值會用「現價 x 股數」計算。</p>
                            <button onClick={parseHoldingRows} className="mt-3 w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors">預覽持倉快照</button>
                        </div>
                    </div>
                </div>
            )}

            {preview && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
                        <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-2">確認匯入股票交易</h3>
                        <p className="text-sm text-slate-400 mb-4">將 append 新增 {preview.transactions.length} 筆交易，不會覆蓋既有資料。</p>
                        <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs">
                            <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">買入</div><div className="font-bold text-slate-700">{preview.transactions.filter(t => t.type === 'buy').length}</div></div>
                            <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">賣出</div><div className="font-bold text-blue-600">{preview.transactions.filter(t => t.type === 'sell').length}</div></div>
                            <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">股息</div><div className="font-bold text-emerald-600">{preview.transactions.filter(t => t.type === 'dividend').length}</div></div>
                            <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">入金</div><div className="font-bold text-blue-600">{preview.transactions.filter(t => t.type === 'deposit').length}</div></div>
                        </div>
                        <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                            {preview.transactions.slice(0, 30).map((trade) => <div key={trade.id} className="p-3 flex justify-between items-center text-sm"><div><div className="font-bold text-slate-700">{trade.symbol || trade.rawItem || trade.name}</div><div className="text-xs text-slate-400">{trade.date} · {getStockTradeLabel(trade.type)}</div></div><div className="font-inter font-bold text-slate-700">{formatMoneyByMarket(trade.amount, trade.market || 'TW')}</div></div>)}
                            {preview.transactions.length > 30 && <div className="p-3 text-center text-xs text-slate-400">還有 {preview.transactions.length - 30} 筆未顯示</div>}
                        </div>
                        {preview.skippedRows.length > 0 && (
                            <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-3 rounded-xl">
                                <div className="font-bold mb-2">略過 {preview.skippedRows.length} 列無法辨識或不需納入績效的資料：</div>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                    {preview.skippedRows.map((row) => (
                                        <div key={row.row} className="flex gap-2 leading-relaxed">
                                            <span className="font-inter font-bold shrink-0">第 {row.row} 列</span>
                                            <span className="text-amber-900 truncate">{row.type} / {row.item}</span>
                                            <span className="text-amber-600 shrink-0">：{row.reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 mt-5"><button onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200">取消</button><button onClick={confirmImport} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200">確認匯入</button></div>
                    </div>
                </div>
            )}

            {holdingPreview && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
                        <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-2">確認匯入持倉快照</h3>
                        <p className="text-sm text-slate-400 mb-4">將新增 {holdingPreview.month} 的一個新版本，共 {holdingPreview.holdings.length} 檔持倉。</p>
                        <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs">
                            <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">成本總額</div><div className="font-bold text-slate-700">{formatMoney(holdingPreview.holdings.reduce((sum, item) => sum + (Number(item.costAmount) || 0), 0))}</div></div>
                            <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">目前市值</div><div className="font-bold text-teal-600">{formatMoney(holdingPreview.holdings.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0))}</div></div>
                        </div>
                        <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                            {holdingPreview.holdings.slice(0, 30).map((holding) => (
                                <div key={holding.id} className="p-3 flex justify-between items-center text-sm">
                                    <div>
                                        <div className="font-bold text-slate-700">{holding.name || holding.symbol}</div>
                                        <div className="text-xs text-slate-400">{holding.shares ? `${holding.shares} 股 · ` : ''}{holding.account || holding.market}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-inter font-bold text-teal-600">{formatMoneyByMarket(holding.marketValue, holding.market || 'TW')}</div>
                                        <div className={`text-[10px] font-inter ${(holding.marketValue - holding.costAmount) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{holding.costAmount ? `${(holding.marketValue - holding.costAmount) >= 0 ? '+' : ''}${formatMoneyByMarket(holding.marketValue - holding.costAmount, holding.market || 'TW')}` : '未填成本'}</div>
                                    </div>
                                </div>
                            ))}
                            {holdingPreview.holdings.length > 30 && <div className="p-3 text-center text-xs text-slate-400">還有 {holdingPreview.holdings.length - 30} 檔未顯示</div>}
                        </div>
                        {holdingPreview.skippedRows.length > 0 && <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">略過 {holdingPreview.skippedRows.length} 列持倉資料。</div>}
                        <div className="flex gap-3 mt-5"><button onClick={() => setHoldingPreview(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200">取消</button><button onClick={confirmHoldingImport} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-200">確認匯入</button></div>
                    </div>
                </div>
            )}

            {confirmDeleteSnapshot && (
                <ConfirmModal
                    title="刪除持倉快照版本"
                    message={`確定要刪除 ${confirmDeleteSnapshot.month} v${confirmDeleteSnapshot.version} 嗎？\n這只會刪除這個持倉快照版本，不會刪除股票交易資料。`}
                    onConfirm={() => {
                        onDeleteHoldingSnapshot(confirmDeleteSnapshot.month, confirmDeleteSnapshot.id);
                        setConfirmDeleteSnapshot(null);
                    }}
                    onCancel={() => setConfirmDeleteSnapshot(null)}
                />
            )}

            {confirmClear && (
                <ConfirmModal
                    title={`清空${getStockMarketLabel(marketFilter)}股票交易`}
                    message={`確定要刪除${getStockMarketLabel(marketFilter)}股票交易資料嗎？這只會清空目前市場的個股績效匯入交易，不會刪除其他市場、資產、收入、花費或負債資料。`}
                    onConfirm={() => {
                        onClearTransactions(marketFilter);
                        setConfirmClear(false);
                    }}
                    onCancel={() => setConfirmClear(false)}
                />
            )}
        </div>
    );
};

import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import { db } from './firebase';
import { collection, doc, writeBatch, getDocs, query, orderBy, where, setDoc } from 'firebase/firestore';

const AuthenticatedApp = () => {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(INITIAL_DATA);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [cloudLoadError, setCloudLoadError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);
    const pendingSaveRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        return localStorage.getItem('isPrivacyMode') === 'true';
    });
    const [diagnostics, setDiagnostics] = useState({ show: false, loading: false, error: '', result: null });
    const isLocalDiagnosticEnabled = import.meta.env.DEV;

    // --- Biometric Lock State ---
    const [isAppLocked, setIsAppLocked] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem(BIOMETRIC_STORAGE_KEY) === 'true');
    const [biometricError, setBiometricError] = useState("");

    useEffect(() => {
        localStorage.setItem('isPrivacyMode', isPrivacyMode);
    }, [isPrivacyMode]);

    // Check Lock State on Startup
    useEffect(() => {
        if (biometricEnabled) {
            setIsAppLocked(true);
        }
    }, []); // Only run once on mount

    // Handle Unlock
    const handleUnlockApp = async () => {
        setBiometricError("");
        const success = await verifyBiometric();
        if (success) {
            setIsAppLocked(false);
        } else {
            setBiometricError("驗證失敗，請重試");
        }
    };

    // Toggle Biometric Setting
    const toggleBiometric = async () => {
        if (biometricEnabled) {
            // Disable it
            localStorage.removeItem(BIOMETRIC_STORAGE_KEY);
            localStorage.removeItem(BIOMETRIC_CREDENTIAL_ID_KEY);
            setBiometricEnabled(false);
            setAlertInfo({ show: true, title: "已停用", message: "Face ID 鎖定已關閉" });
        } else {
            // Enable it
            try {
                await registerBiometric(user.email);
                setBiometricEnabled(true);
                setAlertInfo({ show: true, title: "已啟用", message: "下次開啟 App 時將需要 Face ID 解鎖" });
            } catch (err) {
                setAlertInfo({ show: true, title: "啟用失敗", message: "無法註冊 Face ID: " + err.message });
            }
        }
    };

    const [importConfirmation, setImportConfirmation] = useState({ show: false, type: null, summary: null, pendingData: null });

    // --- Helper Functions for Chunking ---
    // --- Helper Functions for Chunking ---
    const writeFirestoreChunks = async (userData) => {
        const jsonString = JSON.stringify(userData);
        // Reduced chunk size to avoid 1MB limit with multi-byte chars
        const CHUNK_SIZE = 250000;
        const totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);

        const chunksRef = collection(db, "users", user.uid, "chunks");

        // 1. Write new chunks sequentially for progress updates
        for (let i = 0; i < totalChunks; i++) {
            const chunkContent = jsonString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const docRef = doc(chunksRef, i.toString());
            // Use setDoc directly instead of batch to update progress in real-time
            await setDoc(docRef, { index: i, content: chunkContent });

            // Update progress
            setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        // 2. Delete excess chunks (if previous save had more)
        const batch = writeBatch(db); // Use batch for deletion as it's fast and doesn't need progress
        const q = query(chunksRef, where("index", ">=", totalChunks));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    };

    const saveToFirestoreChunks = async (userData) => {
        if (!user) return false;
        if (cloudLoadError) {
            handleShowAlert("儲存已暫停", "雲端資料目前無法解析。為避免覆蓋既有資料，請先修復雲端資料或匯入備份。");
            return false;
        }
        if (isSavingRef.current) {
            pendingSaveRef.current = userData;
            return true;
        }
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            let dataToSave = userData;
            while (dataToSave) {
                pendingSaveRef.current = null;
                await writeFirestoreChunks(dataToSave);
                dataToSave = pendingSaveRef.current;
            }
            return true;
        } catch (error) {
            console.error("Save failed:", error);
            handleShowAlert("儲存失敗", "無法同步至雲端，請檢查網路連線。");
            return false;
        } finally {
            isSavingRef.current = false;
            pendingSaveRef.current = null;
            setIsSaving(false);
            setUploadProgress(0);
        }
    };

    const loadFromFirestoreChunks = async () => {
        if (!user) return null;
        const chunksRef = collection(db, "users", user.uid, "chunks");
        const q = query(chunksRef, orderBy("index"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const chunks = snapshot.docs.map(doc => doc.data().content || "");
        const fullString = chunks.join('');

        try {
            return JSON.parse(fullString);
        } catch (error) {
            console.warn("JSON parse failed, attempting chunk recovery strategy...", error);
            // Heuristic: Ghost chunks might exist if the previous save was larger and the new data size 
            // is an exact multiple of CHUNK_SIZE, causing the 'break' logic (based on size < CHUNK_SIZE) to fail.
            // We try removing chunks from the end one by one to find the valid JSON boundary.
            let currentString = fullString;
            for (let i = chunks.length - 1; i > 0; i--) {
                const lastChunkLen = chunks[i].length;
                currentString = currentString.slice(0, -lastChunkLen);
                try {
                    const result = JSON.parse(currentString);
                    console.log(`Recovered data by trimming ${chunks.length - i} tail chunk(s).`);
                    return result;
                } catch (e) {
                    continue;
                }
            }
            throw error; // If all retries fail, rethrow original error
        }
    };

    // --- Sync Logic ---
    // 1. Load Data on Mount
    useEffect(() => {
        const loadUserData = async () => {
            if (!user) return;
            try {
                const cloudData = await loadFromFirestoreChunks();
                if (cloudData) {
                    console.log("Loaded data from Firestore chunks");
                    setData(normalizeAppData(cloudData));
                    setCloudLoadError('');
                } else {
                    console.log("No chunked data found, using empty state.");
                    setCloudLoadError('');
                    // Fallback: check if legacy single-doc exists (optional migration)
                }
            } catch (error) {
                console.error("Error loading chunked data:", error);
                setCloudLoadError(error.message || "雲端資料解析失敗");
            } finally {
                setIsDataLoaded(true);
            }
        };
        loadUserData();
    }, [user]);



    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddAssetModal, setShowAddAssetModal] = useState(false);
    const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
    const [showAddDebtModal, setShowAddDebtModal] = useState(false);
    const [showYearSelector, setShowYearSelector] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [showStatementModal, setShowStatementModal] = useState(false);
    const [showFIREModal, setShowFIREModal] = useState(false);
    const [showRangeStatsModal, setShowRangeStatsModal] = useState(false);
    const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

    const fileInputRef = useRef(null);
    const expenseFileInputRef = useRef(null);
    const repairFileInputRef = useRef(null);

    const exchangeRateCache = useRef({}); // Cache for foreign currency exchange rates

    // Dropbox Integration
    const dropboxAppKey = import.meta.env.VITE_DROPBOX_APP_KEY;

    useEffect(() => {
        if (!dropboxAppKey) return;
        const scriptId = 'dropboxjs';
        if (document.getElementById(scriptId)) return;

        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'text/javascript';
        script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        script.setAttribute('data-app-key', dropboxAppKey);
        document.body.appendChild(script);
    }, [dropboxAppKey]);
    const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '' });
    const [view, setView] = useState('dashboard');
    const [selectedDate, setSelectedDate] = useState(null);
    const realCurrentYear = new Date().getFullYear();

    const allAssetNames = useMemo(() => {
        const names = new Set();
        Object.values(data.records).forEach(assets => assets.forEach(asset => names.add(asset.name)));
        return Array.from(names).sort();
    }, [data.records]);

    const debtAccountOptions = useMemo(() => {
        const options = new Set();
        Object.values(data.records || {}).forEach((assets) => {
            (assets || []).forEach((asset) => {
                if (asset.account) options.add(asset.account);
                if (asset.name) options.add(asset.name);
            });
        });

        const recordDates = Object.keys(data.records || {}).sort();
        const latestRecordDate = recordDates[recordDates.length - 1];
        (data.records?.[latestRecordDate] || []).forEach((asset) => {
            if (asset.account) options.add(asset.account);
            if (asset.name) options.add(asset.name);
        });

        Object.values(data.debts || {}).forEach((debts) => {
            (debts || []).forEach((debt) => {
                if (debt.lender) options.add(debt.lender);
            });
        });

        return Array.from(options).sort();
    }, [data.records, data.debts]);

    const allDebtNames = useMemo(() => {
        const names = new Set();
        Object.values(data.debts || {}).forEach(debts => debts.forEach(debt => names.add(debt.name)));
        return Array.from(names).sort();
    }, [data.debts]);

    const availableYears = useMemo(() => {
        const years = new Set();
        Object.keys(data.records || {}).forEach(d => years.add(new Date(d).getFullYear()));
        Object.keys(data.incomes || {}).forEach(d => years.add(parseInt(d.split('-')[0])));
        Object.keys(data.memos || {}).forEach(d => years.add(new Date(d).getFullYear()));
        Object.keys(data.expenses || {}).forEach(d => years.add(parseInt(d.split('-')[0])));
        Object.keys(data.debts || {}).forEach(d => years.add(new Date(d).getFullYear()));
        Object.keys(data.debtEvents || {}).forEach(d => years.add(parseInt(d.split('-')[0])));

        const thisYear = new Date().getFullYear();
        return Array.from(years).filter(y => y <= thisYear).sort((a, b) => b - a);
    }, [data]);

    const getYearEndAssets = (year, sourceData) => {
        return getLatestSnapshotTotal(sourceData.records, `${year}-12-31`, (assets) =>
            (assets || []).reduce((sum, item) => sum + (item.amount || 0), 0)
        );
    };

    const getYearEndDebt = (year, sourceData) => {
        return getLatestSnapshotTotal(sourceData.debts, `${year}-12-31`, (debts) => getDebtTotal(debts));
    };

    const getAssetRecordDatesInYear = (year, sourceData) => {
        return Object.entries(sourceData.records || {})
            .filter(([dateStr, assets]) => new Date(dateStr).getFullYear() === year && Array.isArray(assets) && assets.length > 0)
            .map(([dateStr]) => dateStr)
            .sort();
    };

    const getNetAssetsAtDate = (dateStr, sourceData) => {
        const grossAssets = (sourceData.records?.[dateStr] || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const debts = getLatestSnapshotTotal(sourceData.debts, dateStr, (items) => getDebtTotal(items));
        return grossAssets - debts;
    };

    const getYearAssetGrowthRange = (year, sourceData) => {
        const dates = getAssetRecordDatesInYear(year, sourceData);
        if (dates.length === 0) {
            return { startDate: null, endDate: null, startAssets: 0, endAssets: 0, amount: 0, percentage: 0, ratio: 0 };
        }

        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const startAssets = getNetAssetsAtDate(startDate, sourceData);
        const endAssets = getNetAssetsAtDate(endDate, sourceData);
        const amount = endAssets - startAssets;
        const percentage = startAssets > 0 ? amount / startAssets : 0;
        const ratio = startAssets > 0 ? endAssets / startAssets : 0;

        return { startDate, endDate, startAssets, endAssets, amount, percentage, ratio };
    };



    const getYearTotalIncome = (year, sourceData) => {
        let total = 0;
        Object.entries(sourceData.incomes || {}).forEach(([dateStr, incomeData]) => {
            const y = parseInt(dateStr.split('-')[0]);
            if (y === year) total += (incomeData.totalAmount || 0);
        });
        return total;
    };

    const yearlyTrendData = useMemo(() => {
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
    }, [availableYears, data]);

    const yearlyGrowthStats = useMemo(() => {
        const yearDates = Object.keys(data.records).filter(d => new Date(d).getFullYear() === currentYear).sort();
        if (yearDates.length < 2) return { amount: 0, rate: 0 };
        const firstDate = yearDates[0];
        const lastDate = yearDates[yearDates.length - 1];
        const getAssetsSum = (date) => data.records[date].reduce((sum, item) => sum + (item.amount || 0), 0);
        const startAmount = getAssetsSum(firstDate);
        const endAmount = getAssetsSum(lastDate);
        const diff = endAmount - startAmount;
        const rate = startAmount > 0 ? diff / startAmount : 0;
        return { amount: diff, rate };
    }, [data, currentYear]);

    const processedData = useMemo(() => {
        const monthlyStats = Array(12).fill(0).map((_, i) => ({ month: i + 1, assets: 0, grossAssets: 0, debts: 0, income: 0, cost: 0, balance: 0, memo: null, hasRecord: false, latestDate: null, allRecords: [], analysis: { incomeDiff: 0, assetDiff: 0, compositeScore: 0 } }));
        const monthRecordsMap = new Map();
        const monthDebtMap = new Map();

        Object.entries(data.records || {}).forEach(([dateStr, assets]) => {
            const date = new Date(dateStr);
            if (date.getFullYear() === currentYear) {
                const totalAssets = assets.reduce((sum, item) => sum + (item.amount || 0), 0);
                if (!Array.isArray(assets) || assets.length === 0 || totalAssets <= 0) return;
                const monthIdx = date.getMonth();
                if (!monthRecordsMap.has(monthIdx)) monthRecordsMap.set(monthIdx, []);
                monthRecordsMap.get(monthIdx).push({ dateStr, assets: totalAssets });
            }
        });

        Object.entries(data.debts || {}).forEach(([dateStr, debts]) => {
            const date = new Date(dateStr);
            if (date.getFullYear() === currentYear) {
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

            const monthEndDay = new Date(currentYear, i + 1, 0).getDate();
            const monthEndKey = `${currentYear}-${String(i + 1).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;
            monthlyStats[i].debts = getLatestSnapshotTotal(data.debts, monthEndKey, (debts) => getDebtTotal(debts));
            monthlyStats[i].assets = monthlyStats[i].grossAssets - monthlyStats[i].debts;
            monthlyStats[i].allRecords = monthlyStats[i].allRecords.map((record) => ({
                ...record,
                assets: record.assets - getLatestSnapshotTotal(data.debts, record.dateStr, (debts) => getDebtTotal(debts))
            }));
        }

        Object.entries(data.incomes || {}).forEach(([dateStr, incomeData]) => {
            const [yearStr, monthStr] = dateStr.split('-');
            if (parseInt(yearStr) === currentYear) {
                const monthIdx = parseInt(monthStr) - 1;
                monthlyStats[monthIdx].income = incomeData.totalAmount || 0;
                if (!monthlyStats[monthIdx].latestDate) monthlyStats[monthIdx].latestDate = `${dateStr}-01`;
            }
        });

        Object.keys(data.expenses || {}).forEach(monthStr => {
            const [yStr, mStr] = monthStr.split('-');
            if (parseInt(yStr) === currentYear) {
                const mIdx = parseInt(mStr) - 1;
                const cost = data.expenses[monthStr].reduce((acc, curr) => acc + curr.amount, 0);
                monthlyStats[mIdx].cost = cost;
                if (!monthlyStats[mIdx].latestDate) monthlyStats[mIdx].latestDate = `${monthStr}-01`;
            }
        });

        Object.entries(data.memos || {}).forEach(([dateStr, content]) => {
            const date = new Date(dateStr);
            if (date.getFullYear() === currentYear) {
                const monthIdx = date.getMonth();
                monthlyStats[monthIdx].memo = content;
                if (!monthlyStats[monthIdx].latestDate) monthlyStats[monthIdx].latestDate = dateStr;
            }
        });

        // 取得去年12月的收入作為初始比較基準 (若無則為0)
        const prevYearDecKey = `${currentYear - 1}-12`;
        let prevIncome = (data.incomes || {})[prevYearDecKey]?.totalAmount || 0;
        let prevAsset = getYearEndAssets(currentYear - 1, data) - getYearEndDebt(currentYear - 1, data);

        for (let i = 0; i < 12; i++) {
            const currentAsset = monthlyStats[i].assets;
            const currentIncome = monthlyStats[i].income;
            const cost = monthlyStats[i].cost || 0;
            const hasAssetRecord = monthlyStats[i].hasRecord;

            // 計算餘額 (原本的邏輯)
            monthlyStats[i].balance = hasAssetRecord ? (currentAsset - prevAsset) - cost : -cost;

            // 計算分析指標 (新增)
            const incomeDiff = currentIncome - prevIncome;
            const assetDiff = hasAssetRecord ? currentAsset - prevAsset : 0;
            const compositeScore = incomeDiff + assetDiff;
            monthlyStats[i].analysis = { incomeDiff, assetDiff, compositeScore };

            if (hasAssetRecord) prevAsset = currentAsset;
            prevIncome = currentIncome; // 更新比較基準為本月收入
        }

        return monthlyStats;
        return monthlyStats;
    }, [data, currentYear]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            // Pull from cloud
            const cloudData = await loadFromFirestoreChunks();
            if (cloudData) {
                setData(cloudData);
                setCloudLoadError('');
                handleShowAlert("同步成功", "已從雲端更新最新資料");
            } else {
                setCloudLoadError('');
                handleShowAlert("同步完成", "雲端無資料");
            }
        } catch (error) {
            console.error(error);
            setCloudLoadError(error.message || "雲端資料解析失敗");
            handleShowAlert("同步失敗", "雲端資料目前無法解析，已暫停寫入以避免覆蓋資料。");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLoadDiagnostics = async () => {
        if (!isLocalDiagnosticEnabled || !user) return;
        setDiagnostics({ show: true, loading: true, error: '', result: null });
        try {
            const chunksRef = collection(db, "users", user.uid, "chunks");
            const q = query(chunksRef, orderBy("index"));
            const snapshot = await getDocs(q);
            const chunks = snapshot.docs.map((doc) => doc.data().content || "");
            const fullString = chunks.join('');
            let parsed = null;
            let parseError = '';

            try {
                parsed = fullString ? JSON.parse(fullString) : null;
            } catch (error) {
                parseError = error.message;
            }

            const countObjectArrayItems = (obj = {}) => Object.values(obj || {}).reduce((sum, items) => sum + ((items || []).length || 0), 0);
            const countIncomeSources = (obj = {}) => Object.values(obj || {}).reduce((sum, item) => sum + ((item?.sources || []).length), 0);
            const countSnapshotVersions = (obj = {}) => Object.values(obj || {}).reduce((sum, versions) => sum + ((versions || []).length), 0);

            setDiagnostics({
                show: true,
                loading: false,
                error: parseError,
                result: {
                    uid: user.uid,
                    email: user.email || '',
                    chunkCount: snapshot.size,
                    charCount: fullString.length,
                    hasParsedData: Boolean(parsed),
                    recordsDates: Object.keys(parsed?.records || {}).length,
                    recordsItems: countObjectArrayItems(parsed?.records),
                    debtDates: Object.keys(parsed?.debts || {}).length,
                    debtItems: countObjectArrayItems(parsed?.debts),
                    incomeMonths: Object.keys(parsed?.incomes || {}).length,
                    incomeSources: countIncomeSources(parsed?.incomes),
                    expenseMonths: Object.keys(parsed?.expenses || {}).length,
                    expenseItems: countObjectArrayItems(parsed?.expenses),
                    memoDates: Object.keys(parsed?.memos || {}).length,
                    debtEventMonths: Object.keys(parsed?.debtEvents || {}).length,
                    debtEventItems: countObjectArrayItems(parsed?.debtEvents),
                    stockTransactions: (parsed?.stockTransactions || []).length,
                    stockSnapshotMonths: Object.keys(parsed?.stockHoldingSnapshots || {}).length,
                    stockSnapshotVersions: countSnapshotVersions(parsed?.stockHoldingSnapshots)
                }
            });
        } catch (error) {
            setDiagnostics({ show: true, loading: false, error: error.message, result: null });
        }
    };

    const assetExtremes = useMemo(() => {
        let allPoints = [];
        processedData.forEach(m => {
            if (m.hasRecord) allPoints = [...allPoints, ...m.allRecords.map(r => ({ val: r.assets, month: m.month }))];
        });
        if (allPoints.length === 0) return { max: { val: 0, month: 0 }, min: { val: 0, month: 0 } };
        const max = allPoints.reduce((prev, current) => (prev.val > current.val) ? prev : current);
        const min = allPoints.reduce((prev, current) => (prev.val < current.val) ? prev : current);
        return { max, min };
    }, [processedData]);

    const assetChartData = useMemo(() => processedData.map((monthData) => ({
        ...monthData,
        assets: monthData.hasRecord ? monthData.assets : null
    })), [processedData]);

    const yearStats = useMemo(() => {
        // Income Stats
        const thisYearIncome = getYearTotalIncome(currentYear, data);
        const lastYearIncome = getYearTotalIncome(currentYear - 1, data);
        const avgIncome = thisYearIncome / 12;

        // "資產年增長" (User definition: This Year Income / Last Year Income %)
        // Using "assetGrowthRate" variable to keep UI binding consistent, but logic is Income Ratio
        const assetGrowthRate = lastYearIncome > 0 ? (thisYearIncome / lastYearIncome) : 0;

        // "總所得%數" (User definition: This Year Income / Total Accumulated Income %)
        // Calculate Total Accumulated Income (Lifetime)
        const totalAccumulatedIncome = Object.values(data.incomes || {}).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        const incomeGrowthRate = totalAccumulatedIncome > 0 ? (thisYearIncome / totalAccumulatedIncome) : 0;

        // Real Asset Stats use only months that actually have asset records.
        const growthRange = getYearAssetGrowthRange(currentYear, data);
        const thisYearAssets = growthRange.endAssets;
        const lastYearAssets = growthRange.startAssets;
        const thisYearDebt = getYearEndDebt(currentYear, data);
        const realAssetGrowthAmount = growthRange.amount;
        const realAssetGrowthPercentage = growthRange.percentage;
        const assetGrowthRatio = growthRange.ratio;

        return {
            totalIncome: thisYearIncome,
            lastYearIncome,
            avgIncome,
            assetGrowthRate, // Income Ratio
            incomeGrowthRate, // Share of Total Ratio
            totalAccumulatedIncome,
            thisYearAssets,
            lastYearAssets,
            assetGrowthStartDate: growthRange.startDate,
            assetGrowthEndDate: growthRange.endDate,
            thisYearDebt,
            realAssetGrowthAmount,
            realAssetGrowthPercentage,
            assetGrowthRatio
        };
    }, [data, currentYear]);

    // FIRE Stats
    const fireStats = useMemo(() => {
        const rate = data.fireSettings?.withdrawalRate || 4.0;
        const expenseMonths = Object.keys(data.expenses || {});
        let avgExpense = 0;

        if (expenseMonths.length > 0) {
            const totalExpense = Object.values(data.expenses).flat().reduce((sum, item) => sum + (item.amount || 0), 0);
            avgExpense = totalExpense / expenseMonths.length;
        }

        const annualExpense = avgExpense * 12;
        const fireTarget = rate > 0 ? annualExpense / (rate / 100) : 0;

        // Current Assets (Latest)
        let currentAssets = 0;
        const sortedDates = Object.keys(data.records || {}).sort((a, b) => new Date(b) - new Date(a));
        if (sortedDates.length > 0) {
            currentAssets = data.records[sortedDates[0]].reduce((sum, i) => sum + (i.amount || 0), 0) - getLatestSnapshotTotal(data.debts, sortedDates[0], (debts) => getDebtTotal(debts));
        }

        return { avgExpense, fireTarget, currentAssets, progress: fireTarget > 0 ? currentAssets / fireTarget : 0, rate };
    }, [data]);

    const fireYearlyStats = useMemo(() => {
        const stats = {};
        Object.entries(data.expenses || {}).forEach(([monthStr, items]) => {
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
                    avg: d.total / d.months, // Average of recorded months
                    max,
                    min: min.val === Infinity ? { val: 0, month: 0 } : min
                };
            });
    }, [data.expenses]);



    // Show loading if data is fetching to prevent overwriting cloud data with initial local state
    if (!isDataLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7] flex-col gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm font-bold animate-pulse">正在同步雲端資料...</p>
            </div>
        );
    }


    const handleConfirmImport = async () => {
        const { type, pendingData } = importConfirmation;
        setIsImporting(true);
        try {
            if (type === 'json') {
                const normalizedData = normalizeAppData(pendingData);
                if (user) await saveToFirestoreChunks(normalizedData);
                setData(normalizedData);
                setCurrentYear(new Date().getFullYear());
                handleShowAlert("匯入成功", "資料已同步至雲端");
            } else if (type === 'csv') {
                // Merge logic: Overwrite only the months present in pendingData, keep others
                const newData = { 
                    ...data, 
                    expenses: { ...data.expenses, ...pendingData } 
                };
                setData(newData);
                saveToFirestoreChunks(newData);
                handleShowAlert("匯入成功", "花費細項已成功覆蓋");
            }
            setImportConfirmation({ show: false, type: null, summary: null, pendingData: null });
        } catch (err) {
            console.error(err);
            handleShowAlert("匯入失敗", err.message);
        } finally {
            setIsImporting(false);
            setUploadProgress(0);
        }
    };

    const handleDataUpdate = (newData) => {
        setData(newData);
        saveToFirestoreChunks(newData);
    };

    const handleFireRateChange = (newRate) => {
        const val = parseFloat(newRate);
        if (isNaN(val) || val <= 0) return;
        const newData = { ...data, fireSettings: { ...data.fireSettings, withdrawalRate: val } };
        handleDataUpdate(newData);
    };

    const handleShowAlert = (title, message) => setAlertInfo({ show: true, title, message });

    const handleExportData = () => {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        link.download = `meow-assets-backup-${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        handleShowAlert("匯出成功", "資料已成功下載");
    };







    const handleDropboxChoose = () => {

        if (!window.Dropbox) {
            handleShowAlert("Dropbox 未載入", "請檢查網路或是 App Key 設定");
            return;
        }

        window.Dropbox.choose({
            success: async (files) => {
                const file = files[0];
                if (!file) return;

                setIsImporting(true);
                try {
                    const response = await fetch(file.link);
                    const text = await response.text();

                    processExpenseCSVText(text, (expensesByMonth) => {
                        const summary = getExpenseImportSummary(data.expenses, expensesByMonth);

                        if (summary.monthsCount === 0) {
                            setShowImportModal(false);
                            handleShowAlert("無需匯入", "花費資料沒有任何差異");
                            return;
                        }

                        setImportConfirmation({
                            show: true,
                            type: 'csv',
                            summary,
                            pendingData: expensesByMonth
                        });
                        setShowImportModal(false);
                    }, (errorMsg) => {
                        handleShowAlert("匯入失敗", errorMsg);
                    });
                } catch (err) {
                    console.error(err);
                    handleShowAlert("匯入失敗", "無法讀取 Dropbox 檔案");
                } finally {
                    setIsImporting(false);
                }
            },
            cancel: () => { },
            linkType: "direct",
            multiselect: false,
            extensions: ['.csv'],
        });
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Show loading state immediately
        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed.records) throw new Error("缺少 records 欄位");

                const summary = getJsonImportSummary(data, parsed);

                if (!summary.hasChanges) {
                    setShowImportModal(false);
                    handleShowAlert("無需匯入", "備份內容和目前資料完全一致");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    return;
                }

                setImportConfirmation({
                    show: true,
                    type: 'json',
                    summary,
                    pendingData: parsed
                });
                setShowImportModal(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            } catch (err) {
                console.error(err);
                handleShowAlert("匯入失敗", "格式錯誤或網路連線問題");
            } finally {
                setIsImporting(false);
                setUploadProgress(0);
            }
        };
        reader.readAsText(file);
    };

    const handleRepairBackupUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const shouldRepair = window.confirm("這會用你選擇的 JSON 備份覆蓋目前 Firebase chunks。建議確認這份備份是最近且可用的版本後再繼續。");
        if (!shouldRepair) {
            if (repairFileInputRef.current) repairFileInputRef.current.value = "";
            return;
        }

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed.records) throw new Error("缺少 records 欄位");

                const normalizedData = normalizeAppData(parsed);

                setIsSaving(true);
                await writeFirestoreChunks(normalizedData);
                setData(normalizedData);
                setCloudLoadError('');
                setDiagnostics({ show: false, loading: false, error: '', result: null });
                setCurrentYear(new Date().getFullYear());
                handleShowAlert("修復完成", "已用 JSON 備份重建 Firebase chunks。");
            } catch (err) {
                console.error(err);
                handleShowAlert("修復失敗", err.message || "備份格式錯誤或無法寫入雲端。");
            } finally {
                setIsSaving(false);
                setIsImporting(false);
                setUploadProgress(0);
                if (repairFileInputRef.current) repairFileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleExpenseUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        handleProcessExpenseCSV(file, (expensesByMonth) => {
            const summary = getExpenseImportSummary(data.expenses, expensesByMonth);

            if (summary.monthsCount === 0) {
                setShowAddModal(false);
                setShowImportModal(false);
                handleShowAlert("無需匯入", "花費資料沒有任何差異");
                if (expenseFileInputRef.current) expenseFileInputRef.current.value = "";
                return;
            }

            setImportConfirmation({
                show: true,
                type: 'csv',
                summary,
                pendingData: expensesByMonth
            });
            setShowAddModal(false);
            setShowImportModal(false);
            if (expenseFileInputRef.current) expenseFileInputRef.current.value = "";
        }, (errorMsg) => {
            handleShowAlert("匯入失敗", errorMsg);
            if (expenseFileInputRef.current) expenseFileInputRef.current.value = "";
        });
    };

    const handleMonthClick = (monthData) => {
        if (monthData.latestDate) {
            setSelectedDate(`${currentYear}-${String(monthData.month).padStart(2, '0')}`);
            setView('detail');
        }
    };

    const handleDetailUpdate = (type, payload) => {
        if (type === 'NAVIGATE_MONTH') setSelectedDate(payload);
        else if (type === 'UPDATE_DETAILS') {
            const { month, assetDate, debtDate, memoDate, assets, memo, incomes, debts } = payload;
            const newTotal = incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const existingIncomeMonth = data.incomes[month] || {};

            const newData = {
                ...data,
                records: { ...data.records, [assetDate]: assets },
                memos: { ...data.memos, [memoDate]: memo },
                debts: { ...data.debts, [debtDate]: debts || [] },
                incomes: {
                    ...data.incomes,
                    [month]: { ...existingIncomeMonth, totalAmount: newTotal, sources: incomes }
                }
            };
            setData(newData);
            saveToFirestoreChunks(newData);
        } else if (type === 'UPDATE_RECORDS') {
            const { date, assets } = payload;
            const newData = { ...data, records: { ...data.records, [date]: assets } };
            setData(newData);
            saveToFirestoreChunks(newData);
        } else if (type === 'UPDATE_MEMO') {
            const { date, content } = payload;
            const newData = { ...data, memos: { ...data.memos, [date]: content } };
            setData(newData);
            saveToFirestoreChunks(newData);
        } else if (type === 'UPDATE_DEBTS') {
            const { date, debts } = payload;
            const newData = { ...data, debts: { ...data.debts, [date]: debts } };
            setData(newData);
            saveToFirestoreChunks(newData);
        } else if (type === 'UPDATE_INCOME') {
            const { date, sources } = payload;
            const yearMonth = date.substring(0, 7);
            const newTotal = sources.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const newData = {
                ...data,
                incomes: {
                    ...data.incomes,
                    [yearMonth]: { ...data.incomes[yearMonth], totalAmount: newTotal, sources }
                }
            };
            setData(newData);
            saveToFirestoreChunks(newData);
        } else if (type === 'DELETE_MONTH') {
            const monthToDelete = payload;
            const newData = { ...data };
            Object.keys(newData.records || {}).forEach((date) => { if (date.startsWith(monthToDelete)) delete newData.records[date]; });
            Object.keys(newData.memos || {}).forEach((date) => { if (date.startsWith(monthToDelete)) delete newData.memos[date]; });
            Object.keys(newData.debts || {}).forEach((date) => { if (date.startsWith(monthToDelete)) delete newData.debts[date]; });
            if (newData.debtEvents) delete newData.debtEvents[monthToDelete];
            setData(newData);
            saveToFirestoreChunks(newData);
            setView('dashboard');
            handleShowAlert("刪除成功", `已刪除 ${monthToDelete} 的資產、負債與備忘`);
        } else if (type === 'ADD_DEBT_EVENT') {
            const { month, event } = payload;
            const existingEvents = data.debtEvents?.[month] || [];
            const newData = {
                ...data,
                debtEvents: {
                    ...data.debtEvents,
                    [month]: [...existingEvents, event]
                }
            };
            setData(newData);
            saveToFirestoreChunks(newData);
            handleShowAlert("新增成功", `已新增一筆${getDebtEventLabel(event.type)}異動`);
        } else if (type === 'DELETE_DEBT_EVENT') {
            const { month, id } = payload;
            const newData = {
                ...data,
                debtEvents: {
                    ...data.debtEvents,
                    [month]: (data.debtEvents?.[month] || []).filter((item) => item.id !== id)
                }
            };
            setData(newData);
            saveToFirestoreChunks(newData);
        }
    };

    const handleSaveNewAsset = async (newAssets, dateKey) => {
        const assetsToAdd = (Array.isArray(newAssets) ? newAssets : [newAssets]).map(({ date, ...asset }) => asset);
        const existingDetails = data.records[dateKey] || [];
        const newData = {
            ...data,
            records: { ...data.records, [dateKey]: [...existingDetails, ...assetsToAdd] }
        };
        setData(newData);
        const didSave = await saveToFirestoreChunks(newData);
        if (!didSave) return;
        handleShowAlert("新增成功", assetsToAdd.length === 1 ? `資產 ${assetsToAdd[0].name} 已新增到 ${dateKey}` : `已新增 ${assetsToAdd.length} 筆資產到 ${dateKey}`);
        setShowAddAssetModal(false);
        setShowAddModal(false);
    };

    const handleSaveNewIncome = (newIncomeSource, dateKey) => {
        const monthKey = dateKey.substring(0, 7);
        const existingMonthData = data.incomes[monthKey] || { totalAmount: 0, sources: [] };
        const existingSources = existingMonthData.sources || [];
        const newTotal = (existingMonthData.totalAmount || 0) + newIncomeSource.amount;
        const newData = {
            ...data,
            incomes: { ...data.incomes, [monthKey]: { ...existingMonthData, totalAmount: newTotal, sources: [...existingSources, newIncomeSource] } }
        };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("新增成功", `已新增一筆收入至 ${monthKey}`);
        setShowAddIncomeModal(false);
        setShowAddModal(false);
    };

    const handleSaveNewDebt = async (newDebt, dateKey) => {
        try {
            const cloudData = await loadFromFirestoreChunks();
            const cloudBase = cloudData ? normalizeAppData(cloudData) : null;
            const mergedDebts = mergeDebtMaps(cloudBase?.debts, data.debts);
            const baseData = cloudBase ? { ...data, ...cloudBase, debts: mergedDebts } : { ...data, debts: mergedDebts };
            const newData = {
                ...baseData,
                debts: addDebtAndCarryForward(mergedDebts, dateKey, newDebt)
            };
            setData(newData);
            const didSave = await saveToFirestoreChunks(newData);
            if (!didSave) return;
            handleShowAlert("新增成功", `已新增一筆負債至 ${dateKey}`);
            setShowAddDebtModal(false);
            setShowAddModal(false);
        } catch (error) {
            console.error(error);
            handleShowAlert("新增失敗", "無法取得最新雲端資料，為避免覆蓋既有負債，這次沒有寫入。");
        }
    };

    const handleImportStockTransactions = (transactions) => {
        const newData = {
            ...data,
            stockTransactions: [...(data.stockTransactions || []), ...transactions]
        };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("匯入成功", `已新增 ${transactions.length} 筆股票交易`);
    };

    const handleClearStockTransactions = (market) => {
        const targetMarket = market || 'TW';
        const newData = {
            ...data,
            stockTransactions: (data.stockTransactions || []).filter((trade) => (trade.market || 'TW') !== targetMarket)
        };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("已清空", `${getStockMarketLabel(targetMarket)}股票交易資料已刪除`);
    };

    const handleImportHoldingSnapshot = (snapshotPreview) => {
        const month = snapshotPreview.month;
        const existingVersions = data.stockHoldingSnapshots?.[month] || [];
        const nextVersion = existingVersions.reduce((max, item) => Math.max(max, Number(item.version) || 0), 0) + 1;
        const snapshot = {
            id: `holding-snapshot-${month}-v${nextVersion}-${Date.now()}`,
            version: nextVersion,
            importedAt: new Date().toISOString(),
            note: snapshotPreview.note || '',
            holdings: snapshotPreview.holdings
        };
        const newData = {
            ...data,
            stockHoldingSnapshots: {
                ...(data.stockHoldingSnapshots || {}),
                [month]: [...existingVersions, snapshot]
            }
        };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("匯入成功", `已新增 ${month} 持倉快照 v${nextVersion}`);
    };

    const handleDeleteHoldingSnapshot = (month, snapshotId) => {
        const remaining = (data.stockHoldingSnapshots?.[month] || []).filter((snapshot) => snapshot.id !== snapshotId);
        const nextSnapshots = { ...(data.stockHoldingSnapshots || {}) };
        if (remaining.length > 0) nextSnapshots[month] = remaining;
        else delete nextSnapshots[month];
        const newData = { ...data, stockHoldingSnapshots: nextSnapshots };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("刪除成功", "已刪除持倉快照版本");
    };

    return (
        <div className="min-h-screen max-w-md mx-auto bg-white text-slate-800 relative font-sans shadow-2xl overflow-hidden">
            <GlobalStyles />
            {isAppLocked && <BiometricLockScreen onUnlock={handleUnlockApp} errorMsg={biometricError} />}
            {alertInfo.show && <AlertModal title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />}
            {cloudLoadError && (
                <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={22} />
                        </div>
                        <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-2">雲端資料讀取失敗</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-3">
                            Firestore chunks 串接後不是合法 JSON。為了避免把空資料寫回雲端，目前已暫停所有新增、匯入與同步寫入。
                        </p>
                        <div className="p-3 rounded-xl bg-rose-50 text-rose-500 text-xs text-left break-words mb-4">
                            {cloudLoadError}
                        </div>
                        {isLocalDiagnosticEnabled && (
                            <div className="space-y-2">
                                <button onClick={handleLoadDiagnostics} className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 transition-colors">
                                    開啟本機診斷
                                </button>
                                <button onClick={() => repairFileInputRef.current?.click()} className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors">
                                    用 JSON 備份修復
                                </button>
                                <input
                                    ref={repairFileInputRef}
                                    type="file"
                                    accept=".json"
                                    aria-label="選擇修復備份 JSON"
                                    onChange={handleRepairBackupUpload}
                                    className="hidden"
                                />
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    修復會用備份檔重新寫入 Firebase chunks，請只選擇你信任的匯出備份。
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isLocalDiagnosticEnabled && diagnostics.show && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
                        <button onClick={() => setDiagnostics(prev => ({ ...prev, show: false }))} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600"><X size={18} /></button>
                        <h3 className="text-xl font-serif-tc font-bold text-slate-800 mb-2 flex items-center gap-2"><Activity size={18} /> 本機資料診斷</h3>
                        <p className="text-xs text-slate-400 mb-4">只在 local/dev 環境顯示。此面板只讀取 Firestore chunks，不會寫入資料。</p>
                        {diagnostics.loading && <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-sm text-center">讀取 Firebase chunks 中...</div>}
                        {!diagnostics.loading && diagnostics.error && <div className="p-3 rounded-xl bg-rose-50 text-rose-500 text-xs mb-3 break-words">診斷錯誤：{diagnostics.error}</div>}
                        {!diagnostics.loading && diagnostics.result && (
                            <div className="space-y-2 text-xs">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <div className="text-slate-400 mb-1">Firebase 使用者</div>
                                    <div className="font-inter text-slate-700 break-all">{diagnostics.result.email || '未提供 email'}</div>
                                    <div className="font-inter text-slate-500 break-all mt-1">{diagnostics.result.uid}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">Chunks</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.chunkCount}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">JSON 字元</div><div className="font-inter font-bold text-slate-700">{formatMoney(diagnostics.result.charCount)}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">資產日期 / 筆數</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.recordsDates} / {diagnostics.result.recordsItems}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">負債日期 / 筆數</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.debtDates} / {diagnostics.result.debtItems}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">收入月份 / 來源</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.incomeMonths} / {diagnostics.result.incomeSources}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">花費月份 / 筆數</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.expenseMonths} / {diagnostics.result.expenseItems}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">備忘日期</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.memoDates}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">負債異動</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.debtEventMonths} / {diagnostics.result.debtEventItems}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">股票交易</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.stockTransactions}</div></div>
                                    <div className="bg-slate-50 rounded-xl p-3"><div className="text-slate-400">持倉版本</div><div className="font-inter font-bold text-slate-700">{diagnostics.result.stockSnapshotMonths} / {diagnostics.result.stockSnapshotVersions}</div></div>
                                </div>
                            </div>
                        )}
                        <button onClick={handleLoadDiagnostics} disabled={diagnostics.loading} className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 disabled:bg-slate-200 transition-colors">重新讀取診斷</button>
                    </div>
                </div>
            )}
            {importConfirmation.show && (
                <ImportConfirmationModal 
                    type={importConfirmation.type} 
                    summary={importConfirmation.summary} 
                    onConfirm={handleConfirmImport} 
                    onCancel={() => setImportConfirmation({ show: false, type: null, summary: null, pendingData: null })}
                    currentData={data} // Pass current data
                    pendingData={importConfirmation.pendingData} // Pass pending data
                />
            )}
            {showYearSelector && <YearSelectorModal currentYear={currentYear} availableYears={availableYears} yearlyTrendData={yearlyTrendData} onSelect={(year) => { setCurrentYear(year); setShowYearSelector(false); }} onClose={() => setShowYearSelector(false)} />}
            {showAddIncomeModal && <AddIncomeModal onClose={() => setShowAddIncomeModal(false)} onSave={handleSaveNewIncome} assetNames={allAssetNames} exchangeRateCache={exchangeRateCache} />}
            {showAddAssetModal && <AddAssetModal onClose={() => setShowAddAssetModal(false)} onSave={handleSaveNewAsset} historyRecords={data.records} exchangeRateCache={exchangeRateCache} />}
            {showAddDebtModal && <AddDebtModal onClose={() => setShowAddDebtModal(false)} onSave={handleSaveNewDebt} debtNames={allDebtNames} accountOptions={debtAccountOptions} assetRecords={data.records} debts={data.debts} />}

            {showStatementModal && <StatementModal data={data} onClose={() => setShowStatementModal(false)} />}
            {showFIREModal && <FIREModal fireStats={fireStats} yearlyStats={fireYearlyStats} onRateChange={handleFireRateChange} onClose={() => setShowFIREModal(false)} />}
            {showRangeStatsModal && <RangeStatsModal data={data} onClose={() => setShowRangeStatsModal(false)} />}
            {/* Global Loading Overlay */}
            {(isImporting || isSaving || isSyncing) && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col animate-[fadeIn_0.2s]">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 w-64">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-teal-500 rounded-full animate-spin"></div>
                            {uploadProgress > 0 && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-600">{uploadProgress}%</div>}
                        </div>
                        <div className="text-center">
                            <h3 className="text-slate-800 font-bold mb-1">
                                {isSaving ? '儲存中...' : isSyncing ? '同步中...' : '匯入處理中...'}
                            </h3>
                            <p className="text-xs text-slate-400">正在同步至雲端資料庫</p>
                        </div>
                    </div>
                </div>
            )}

            {view === 'detail' && selectedDate && (
                <div className="w-full max-w-md mx-auto">
                    <DetailView monthKey={selectedDate} data={data} onBack={() => setView('dashboard')} onUpdateData={handleDetailUpdate} assetNames={allAssetNames} debtNames={allDebtNames} isPrivacyMode={isPrivacyMode} />
                </div>
            )}
            {view === 'stock-analysis' && (
                <div className="w-full max-w-md mx-auto">
                    <StockAnalysisView data={data} onBack={() => setView('dashboard')} onImportTransactions={handleImportStockTransactions} onClearTransactions={handleClearStockTransactions} onImportHoldingSnapshot={handleImportHoldingSnapshot} onDeleteHoldingSnapshot={handleDeleteHoldingSnapshot} isPrivacyMode={isPrivacyMode} />
                </div>
            )}
            <div className={`transition-transform duration-300 w-full max-w-md mx-auto ${view !== 'dashboard' ? 'scale-95 opacity-50 pointer-events-none hidden' : ''}`}>
                <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-b from-[#EBEAE5] to-transparent -z-10"></div>
                <header className="sticky top-0 z-20 px-6 py-5 bg-[#F9F9F7]/90 backdrop-blur-md border-b border-slate-200/50">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-inter">CatLog</span>
                                <button
                                    onClick={handleManualSync}
                                    className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                                    title="同步資料"
                                >
                                    <RefreshCw size={12} />
                                </button>
                                {isLocalDiagnosticEnabled && (
                                    <button
                                        onClick={handleLoadDiagnostics}
                                        className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                                        title="本機資料診斷"
                                    >
                                        <Activity size={12} />
                                    </button>
                                )}
                            </div>
                            <h1 className="text-2xl font-serif-tc font-bold text-slate-800 flex items-center gap-2">
                                <img src="/favicon.png" alt="極簡貓資產 Logo" className="w-[30px] h-[30px] object-contain" />
                                極簡貓資產
                                {isSaving && <span className="text-[10px] bg-amber-50 text-amber-500 px-2 py-1 rounded-full animate-pulse border border-amber-200">儲存中...</span>}
                            </h1>
                        </div>
                        <div className="flex gap-2 items-center relative">
                            <button
                                onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                                className="p-2 bg-white text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-all border border-slate-100 shadow-sm"
                                title="進階功能"
                            >
                                <LayoutGrid size={18} />
                            </button>

                            {showAdvancedMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowAdvancedMenu(false)}></div>
                                    <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-slate-100 py-2 w-48 z-50 animate-[fadeIn_0.1s]">
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">Advanced</div>
                                        <button
                                            onClick={() => { setShowFIREModal(true); setShowAdvancedMenu(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Mountain size={16} /></div>
                                            <span className="text-sm font-medium">FIRE 目標</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowStatementModal(true); setShowAdvancedMenu(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><ClipboardCheck size={16} /></div>
                                            <span className="text-sm font-medium">對帳單</span>
                                        </button>
                                        <button
                                            onClick={() => { setView('stock-analysis'); setShowAdvancedMenu(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                                            <span className="text-sm font-medium">個股績效</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowRangeStatsModal(true); setShowAdvancedMenu(false); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><PieChartIcon size={16} /></div>
                                            <span className="text-sm font-medium">區間統計</span>
                                        </button>
                                    </div>
                                </>
                            )}
                            <button
                                onClick={toggleBiometric}
                                className={`p-2 rounded-full transition-all border border-slate-100 shadow-sm ${biometricEnabled ? 'bg-teal-50 text-teal-600' : 'bg-white text-slate-400 hover:text-teal-500 hover:bg-teal-50'}`}
                                title={biometricEnabled ? "已啟用 Face ID" : "啟用 Face ID"}
                            >
                                <ScanFace size={18} />
                            </button>
                            <button
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className="p-2 bg-white text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-all border border-slate-100 shadow-sm"
                                title={isPrivacyMode ? "顯示金額" : "隱藏金額"}
                            >
                                {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <div className="relative group/user z-50">
                                <img src={user.photoURL || "https://ui-avatars.com/api/?name=User"} alt="User" className="w-9 h-9 rounded-full border border-slate-200 shadow-sm cursor-pointer" />
                                <div className="absolute top-10 right-0 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 opacity-0 group-hover/user:opacity-100 transition-all pointer-events-none group-hover/user:pointer-events-auto transform origin-top-right scale-95 group-hover/user:scale-100">
                                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                        <p className="text-xs font-bold text-slate-700 truncate">{user.displayName}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="w-full text-left text-xs px-3 py-2 text-rose-500 hover:bg-rose-50 rounded-lg font-bold transition-colors flex items-center gap-2"
                                    >
                                        <LogOut size={12} /> 登出
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <button onClick={() => setCurrentYear(y => y - 1)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors"><ChevronLeft size={24} strokeWidth={1.5} /></button>
                        <button onClick={() => setShowYearSelector(true)} className="text-3xl font-inter font-light tracking-tight text-slate-800 hover:text-amber-500 transition-colors px-4 py-1 rounded-lg hover:bg-slate-100 flex-1 text-center">{currentYear}</button>
                        <button
                            onClick={() => setCurrentYear(y => y + 1)}
                            disabled={currentYear >= realCurrentYear}
                            className={`p-2 transition-colors ${currentYear >= realCurrentYear ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-800'}`}
                        >
                            <ChevronRight size={24} strokeWidth={1.5} />
                        </button>
                    </div>
                </header>

                <main className="px-6 py-6 pb-2">
                    <section>
                        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-serif-tc text-slate-500 font-medium">年度資產淨值</h3><span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-inter">TWD</span></div>
                        <div className="h-28 w-full -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={assetChartData}>
                                    <defs><linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FBBF24" stopOpacity={0.2} /><stop offset="95%" stopColor="#FBBF24" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter' }} dy={10} />
                                    <YAxis tickFormatter={(val) => `${val / 10000}萬`} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter' }} width={40} />
                                    <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
                                    <Area type="monotone" dataKey="assets" stroke="#D97706" strokeWidth={2} fillOpacity={1} fill="url(#colorAssets)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group/tooltip z-10 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-slate-400 font-inter mb-1 block flex items-center justify-center gap-1 cursor-help">
                                    年度資產增長金額 {!isPrivacyMode && <Info size={12} />}
                                </span>
                                <span className={`text-2xl font-inter font-bold ${yearStats.realAssetGrowthAmount >= 0 ? 'text-emerald-600' : 'text-rose-500'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                    {isPrivacyMode ? '****' : (yearStats.realAssetGrowthAmount > 0 ? '+' : '') + formatWan(yearStats.realAssetGrowthAmount)}
                                </span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細</div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">期末資產:</span><span className="font-inter">{formatWan(yearStats.thisYearAssets)}</span></div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">期初資產:</span><span className="font-inter">{formatWan(yearStats.lastYearAssets)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">公式: {yearStats.assetGrowthStartDate || '尚無紀錄'} 至 {yearStats.assetGrowthEndDate || '尚無紀錄'} 的資產淨值差額</div>
                                    </div>
                                )}
                                <Footprints className="absolute -bottom-3 -right-2 text-amber-100 opacity-40 rotate-[-15deg]" size={50} />
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group/tooltip z-10 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-slate-400 font-inter mb-1 block flex items-center justify-center gap-1 cursor-help">
                                    年度資產增長比例 {!isPrivacyMode && <Info size={12} />}
                                </span>
                                <span className={`text-2xl font-inter font-bold ${yearStats.assetGrowthRatio >= 1 ? 'text-emerald-600' : 'text-rose-500'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                    {isPrivacyMode ? '****' : `${yearStats.assetGrowthRatio >= 1 ? '📈' : '📉'} ${formatRate(yearStats.assetGrowthRatio)}`}
                                </span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細</div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">期末資產:</span><span className="font-inter">{formatWan(yearStats.thisYearAssets)}</span></div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">期初資產:</span><span className="font-inter">{formatWan(yearStats.lastYearAssets)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">公式: 期末資產 / 期初資產</div>
                                    </div>
                                )}
                                <Cat className="absolute -bottom-2 -left-2 text-amber-100 opacity-40 rotate-[15deg] scale-x-[-1]" size={50} />
                            </div>
                        </div>
                        <div className="mt-4 p-4 bg-slate-800 text-white rounded-xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 flex justify-around items-center px-4">
                                <div className="flex flex-col gap-1 items-center text-center"><span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1"><Mountain size={12} className="text-emerald-400" /> 年度最高 ({assetExtremes.max.month}月)</span><span className={`text-lg font-inter font-bold text-white ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{isPrivacyMode ? '****' : formatWan(assetExtremes.max.val)}</span></div>
                                <div className="w-px h-8 bg-slate-600 mx-2"></div>
                                <div className="flex flex-col gap-1 items-center text-center"><span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">年度最低 ({assetExtremes.min.month}月) <ArrowDown size={12} className="text-rose-400" /></span><span className={`text-lg font-inter font-bold text-white ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{isPrivacyMode ? '****' : formatWan(assetExtremes.min.val)}</span></div>
                            </div>
                        </div>
                    </section>

                    <section className="mt-8">
                        {/* New Annual Stats Section */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group/tooltip z-10">
                                <span className="text-[10px] text-slate-400 font-inter mb-1 flex items-center gap-1 cursor-help">
                                    年總和 {!isPrivacyMode && <Info size={10} />}
                                </span>
                                <span className={`text-sm font-bold font-inter text-slate-700 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{isPrivacyMode ? '****' : formatWan(yearStats.totalIncome)}</span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細</div>
                                        <div className="flex justify-between"><span>本年度總收入</span></div>
                                        <div className="font-inter text-emerald-400 mt-1 text-right">{formatMoney(yearStats.totalIncome)}</div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group/tooltip z-10">
                                <span className="text-[10px] text-slate-400 font-inter mb-1 flex items-center gap-1 cursor-help">
                                    年平均 {!isPrivacyMode && <Info size={10} />}
                                </span>
                                <span className={`text-sm font-bold font-inter text-slate-700 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{isPrivacyMode ? '****' : formatWan(yearStats.avgIncome)}</span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細</div>
                                        <div className="flex justify-between mb-1"><span>年總和</span><span className="font-inter">{formatWan(yearStats.totalIncome)}</span></div>
                                        <div className="flex justify-between border-t border-slate-600 pt-1"><span>除以 12 個月</span></div>
                                        <div className="font-inter text-emerald-400 mt-1 text-right">= {formatMoney(yearStats.avgIncome)} / 月</div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group/tooltip z-10">
                                <span className="text-[10px] text-slate-400 font-inter mb-1 flex items-center gap-1 cursor-help">
                                    收入年增長 {!isPrivacyMode && <Info size={10} />}
                                </span>
                                <span className={`text-sm font-bold font-inter flex items-center justify-center gap-1 ${yearStats.assetGrowthRate < 1 ? 'text-rose-500' : 'text-emerald-600'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                    {isPrivacyMode ? '****' : (
                                        <>
                                            {yearStats.assetGrowthRate < 1 && yearStats.assetGrowthRate > 0 ? <TrendingDown size={14} /> : null}
                                            {formatRate(yearStats.assetGrowthRate)}
                                        </>
                                    )}
                                </span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full mb-2 w-56 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細 {(currentYear - 1)} vs {currentYear}</div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">今年收入:</span><span className="font-inter">{formatWan(yearStats.totalIncome)}</span></div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">去年收入:</span><span className="font-inter">{formatWan(yearStats.lastYearIncome)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">公式: 今年收入 / 去年收入</div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group/tooltip z-10">
                                <span className="text-[10px] text-slate-400 font-inter mb-1 flex items-center gap-1 cursor-help">
                                    收入占總所得%數 {!isPrivacyMode && <Info size={10} />}
                                </span>
                                <span className={`text-sm font-bold font-inter text-emerald-600 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                    {isPrivacyMode ? '****' : formatRate(yearStats.incomeGrowthRate)}
                                </span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full mb-2 w-56 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細</div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">本年度收入:</span><span className="font-inter">{formatWan(yearStats.totalIncome)}</span></div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">歷年總收入:</span><span className="font-inter">{formatWan(yearStats.totalAccumulatedIncome)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">公式: 今年收入 / 歷年總收入</div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative group/tooltip z-10 col-span-2">
                                <span className="text-[10px] text-slate-400 font-inter mb-1 flex items-center gap-1 cursor-help">
                                    目前總負債 {!isPrivacyMode && <Info size={10} />}
                                </span>
                                <span className={`text-sm font-bold font-inter text-rose-500 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                    {isPrivacyMode ? '****' : `-${formatWan(yearStats.thisYearDebt)}`}
                                </span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full mb-2 w-56 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">最新負債快照</div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">截至 {currentYear} 年底:</span><span className="font-inter">-{formatMoney(yearStats.thisYearDebt)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">此數值會直接影響資產淨值與年度趨勢。</div>
                                    </div>
                                )}
                            </div>
                        </div>





                        <h3 className="text-sm font-serif-tc text-slate-500 font-medium mb-4 flex justify-between items-center"><span>月份明細</span><span className="text-xs text-slate-300 font-inter font-light">點擊查看明細</span></h3>
                        <div className="space-y-0 divide-y divide-slate-100 border-t border-b border-slate-100">
                            {processedData.map((monthData) => (
                                <div key={monthData.month} onClick={() => handleMonthClick(monthData)} className={`group py-4 transition-colors cursor-pointer flex justify-between items-center -mx-2 px-2 rounded-lg ${monthData.latestDate ? 'hover:bg-white' : 'opacity-50 cursor-default grayscale'}`}>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-inter font-medium text-slate-400 w-8">{String(monthData.month).padStart(2, '0')}</span>
                                            {monthData.allRecords.length > 1 ? (<div className="flex flex-col gap-1">{monthData.allRecords.map((r, idx) => (
                                                <div key={idx} className={`flex items-center gap-2 text-base font-inter font-normal ${monthData.latestDate ? 'text-slate-700' : 'text-slate-400'}`}>
                                    <AmountWithTooltip amount={r.assets} className="font-inter text-slate-700" align="left" masked={isPrivacyMode} />
                                                    <span className="text-xs text-slate-400">({parseInt(r.dateStr.split('-')[2])}日)</span>
                                                </div>
                                            ))}</div>) : (<span className={`text-base font-inter font-normal ${monthData.latestDate ? 'text-slate-700' : 'text-slate-400'}`}><AmountWithTooltip amount={monthData.assets} className="font-inter text-slate-700" align="left" masked={isPrivacyMode} /></span>)}
                                        </div>
                                        {monthData.memo && (
                                            !isPrivacyMode && (
                                                <div className="ml-11 mt-1 text-xs text-slate-400 font-serif-tc italic flex items-center gap-1 group/memo relative cursor-help w-fit max-w-[120px]">
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"></span>
                                                    <span className="truncate">{monthData.memo}</span>
                                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/memo:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-normal break-words">
                                                        {monthData.memo}
                                                        <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45 transform -translate-x-1/2 -translate-y-1/2"></div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        {monthData.income > 0 && <div className={`text-xs text-emerald-600 font-inter bg-emerald-50 px-2 py-1 rounded-md ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>{isPrivacyMode ? '****' : '+' + formatMoney(monthData.income)}</div>}
                                        {monthData.analysis && (
                                            <div className={`text-[10px] font-bold flex items-center gap-1 ${monthData.analysis.compositeScore >= 0 ? 'text-emerald-500' : 'text-rose-400'} ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                                {isPrivacyMode ? '****' : (
                                                    <>
                                                        {monthData.analysis.compositeScore >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                        {monthData.analysis.compositeScore > 0 ? '+' : ''}{formatWan(monthData.analysis.compositeScore)}
                                                    </>
                                                )}
                                                {!isPrivacyMode && (
                                                    <div className="group/tooltip relative">
                                                        <Info size={10} className="cursor-help text-slate-300 hover:text-slate-500 transition-colors ml-1" />
                                                        <AnalysisTooltip
                                                            incomeDiff={monthData.analysis.incomeDiff}
                                                            assetDiff={monthData.analysis.assetDiff}
                                                            compositeScore={monthData.analysis.compositeScore}
                                                            align="right"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <footer className="text-center text-slate-300 text-[10px] py-4 mt-4 font-inter">@copyright Jet | v1.0.0</footer>
                    </section>
                </main>

                <button onClick={() => setShowAddModal(true)} className="fixed bottom-8 right-6 w-14 h-14 bg-slate-800 text-white rounded-full shadow-lg shadow-slate-800/30 flex items-center justify-center hover:bg-slate-700 hover:scale-105 transition-all z-30 group"><Plus size={28} strokeWidth={2} className="group-hover:rotate-90 transition-transform duration-300" /></button>

                {showImportModal && (
                    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-6 transition-all duration-300">
                        <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
                            {!isImporting && (
                                <button onClick={() => setShowImportModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                            <div className="mb-6">
                                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                                    <FileJson size={20} className="text-teal-600" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-serif-tc font-bold text-slate-800">匯入資料</h3>
                                <p className="text-sm text-slate-400 mt-1 font-serif-tc">請上傳您的 JSON 備份檔案</p>
                            </div>

                            {isImporting ? (
                                <div className="py-8 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 relative mb-4">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="32" cy="32" r="28" stroke="#F1F5F9" strokeWidth="4" fill="none" />
                                            <circle cx="32" cy="32" r="28" stroke="#0D9488" strokeWidth="4" fill="none" strokeDasharray="176" strokeDashoffset={176 - (176 * uploadProgress) / 100} className="transition-all duration-300 ease-out" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-teal-600">{uploadProgress}%</div>
                                    </div>
                                    <p className="text-sm text-slate-500 font-bold animate-pulse">正在處理資料...</p>
                                    <p className="text-xs text-slate-400 mt-2 text-center max-w-[200px]">檔案較大時可能需要一點時間，請勿關閉視窗</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {/* Section 1: JSON Backup */}
                                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><FileJson size={14} /> 匯入備份 (JSON)</h4>
                                        <div className="relative group cursor-pointer bg-white border border-dashed border-slate-300 rounded-lg p-4 hover:border-teal-400 hover:text-teal-600 text-slate-400 transition-colors text-center">
                                            <input type="file" accept=".json" onChange={handleFileUpload} ref={fileInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <Upload size={16} />
                                                <span className="text-xs">上傳 JSON 備份檔</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Expense CSV */}
                                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><FileText size={14} /> 匯入花費 (Moze CSV)</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Local Upload */}
                                            <div className="relative group cursor-pointer bg-white border border-dashed border-slate-300 rounded-lg p-4 hover:border-teal-400 hover:text-teal-600 text-slate-400 transition-colors text-center">
                                                <input type="file" accept=".csv" onChange={handleExpenseUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <Upload size={16} />
                                                    <span className="text-xs">本機 CSV</span>
                                                </div>
                                            </div>

                                            {/* Dropbox Chooser */}
                                            <button onClick={handleDropboxChoose} className="bg-[#0061FE]/5 border border-[#0061FE]/20 rounded-lg p-4 hover:bg-[#0061FE]/10 transition-colors text-[#0061FE] flex flex-col items-center justify-center gap-1 text-center">
                                                <Box size={16} />
                                                <span className="text-xs font-bold">Dropbox</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showAddModal && (
                    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-6">
                        <div className="bg-white w-full sm:max-w-xs rounded-t-2xl sm:rounded-2xl p-8 shadow-2xl relative animate-[slideUp_0.3s_ease-out]">
                            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-serif-tc font-bold text-slate-800">新增紀錄</h3><button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-600"><X size={20} /></button></div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => { setShowAddModal(false); setShowAddAssetModal(true); }} className="col-span-2 flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors"><Wallet size={20} strokeWidth={1.5} className="text-teal-600" /></div><span className="text-sm font-serif-tc font-bold">新增資產</span>
                                </button>
                                <button onClick={() => { setShowAddModal(false); setShowAddIncomeModal(true); }} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors"><Coins size={20} strokeWidth={1.5} className="text-amber-600" /></div><span className="text-sm font-serif-tc font-bold">新增收入</span>
                                </button>
                                <button onClick={() => { setShowAddModal(false); setShowAddDebtModal(true); }} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-rose-200 hover:text-rose-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors"><ArrowDownRight size={20} strokeWidth={1.5} className="text-rose-600" /></div><span className="text-sm font-serif-tc font-bold">新增負債</span>
                                </button>
                                <button onClick={handleExportData} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-sky-200 hover:text-sky-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center mb-3 group-hover:bg-sky-100 transition-colors"><Download size={20} strokeWidth={1.5} className="text-sky-600" /></div><span className="text-sm font-serif-tc font-bold">匯出備份</span>
                                </button>
                                <button onClick={() => { setShowAddModal(false); setShowImportModal(true); }} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors"><FileJson size={20} strokeWidth={1.5} className="text-indigo-600" /></div><span className="text-sm font-serif-tc font-bold">匯入資料</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

const CustomPieTooltip = ({ active, payload, total }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const percent = total > 0 ? ((data.value / total) * 100).toFixed(0) : 0;

        // Sort items by amount desc and take top 5
        const sortedItems = [...data.items].sort((a, b) => b.amount - a.amount).slice(0, 5);
        const remainingCount = data.items.length - 5;

        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl text-xs z-50 min-w-[150px]">
                <div className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1 flex justify-between items-center gap-4">
                    <span>{data.name}</span>
                    <span className="text-teal-600">{percent}%</span>
                </div>
                <div className="space-y-1 mb-2">
                    {sortedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-4">
                            <span className="text-slate-500 truncate max-w-[80px]">{item.name}</span>
                            <span className="font-inter text-slate-700">{formatMoney(item.amount)}</span>
                        </div>
                    ))}
                    {remainingCount > 0 && <div className="text-slate-300 text-center text-[10px] pt-1">...還有 {remainingCount} 筆</div>}
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-800">
                    <span>總計</span>
                    <span>{formatMoney(data.value)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function App() {
    return (
        <AuthProvider>
            <AuthenticatedApp />
        </AuthProvider>
    );
}
