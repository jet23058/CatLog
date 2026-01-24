import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Cat, ChevronLeft, ChevronRight, Plus, Upload, Wallet, TrendingUp, DollarSign, Calendar, X, Save, FileJson, ArrowUpRight, ArrowDownRight, ArrowLeft, ArrowRight, Edit2, Trash2, Info, Check, TrendingDown, RefreshCw, FileText, Mountain, ArrowDown, AlertCircle, Building2, Lock, PieChart as PieChartIcon, Download, StickyNote, ShoppingBag, Filter, ChevronDown, PiggyBank, Activity, Sparkles, LogOut, Coins, ClipboardCheck, LayoutGrid, Package, Box, Footprints, Eye, EyeOff, ScanFace, ShieldCheck, ShieldAlert } from 'lucide-react';

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
    "fireSettings": { "withdrawalRate": 4.0 }
};

// --- 工具函數 ---
const formatMoney = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(val);
const formatWan = (val) => {
    if (Math.abs(val) < 10000) return formatMoney(val);
    const wan = val / 10000;
    return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(wan)} 萬`;
};
const formatRate = (val) => `${(val * 100).toFixed(1)}%`;
const formatPercent = (value) => !isFinite(value) ? "0.0%" : `${Math.abs(value).toFixed(1)}%`;

const parseCSV = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
                            <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                                {/* Assets */}
                                <div className="col-span-2 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-500">資產紀錄</span>
                                    <div className="flex items-center gap-2">
                                        <span className="line-through text-slate-400">{Object.values(currentData.records || {}).flat().length}</span>
                                        <ArrowRight size={12} className="text-slate-300" />
                                        <span className="font-bold text-indigo-600">{summary.records}</span>
                                    </div>
                                </div>
                                {/* Incomes */}
                                <div className="col-span-2 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-500">收入紀錄</span>
                                    <div className="flex items-center gap-2">
                                        <span className="line-through text-slate-400">{Object.values(currentData.incomes || {}).reduce((acc, curr) => acc + (curr.sources?.length || 0), 0)}</span>
                                        <ArrowRight size={12} className="text-slate-300" />
                                        <span className="font-bold text-indigo-600">{summary.incomes}</span>
                                    </div>
                                </div>
                                {/* Expenses */}
                                <div className="col-span-2 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-500">花費紀錄(月)</span>
                                    <div className="flex items-center gap-2">
                                        <span className="line-through text-slate-400">{Object.keys(currentData.expenses || {}).length}</span>
                                        <ArrowRight size={12} className="text-slate-300" />
                                        <span className="font-bold text-indigo-600">{summary.expenses}</span>
                                    </div>
                                </div>
                                {/* Memos */}
                                <div className="col-span-2 flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-500">備忘錄</span>
                                    <div className="flex items-center gap-2">
                                        <span className="line-through text-slate-400">{Object.keys(currentData.memos || {}).length}</span>
                                        <ArrowRight size={12} className="text-slate-300" />
                                        <span className="font-bold text-indigo-600">{summary.memos}</span>
                                    </div>
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
                            <div className="space-y-3">
                                {summary.months.map(month => {
                                    const oldItems = currentData.expenses?.[month] || [];
                                    const newItems = pendingData[month] || [];
                                    
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
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${newTotal !== oldTotal ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                                        {newTotal !== oldTotal ? '金額變動' : '金額無變化'}
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
                                                    <table className="w-full text-[10px] text-left">
                                                        <thead className="text-slate-400 font-medium sticky top-0 bg-slate-50 border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-3 py-1.5 font-normal">日期</th>
                                                                <th className="px-2 py-1.5 font-normal">類別/名稱</th>
                                                                <th className="px-3 py-1.5 font-normal text-right">金額</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {newItems.map((item) => (
                                                                <tr key={item.id}>
                                                                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.date.split('-')[2]}日</td>
                                                                    <td className="px-2 py-2">
                                                                        <div className="text-slate-700 font-bold truncate max-w-[100px]">{item.name || item.subCategory}</div>
                                                                        <div className="text-slate-400 scale-90 origin-left">{item.category}-{item.subCategory}</div>
                                                                    </td>
                                                                    <td className={`px-3 py-2 text-right font-mono font-bold ${item.amount < 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                                        {item.amount < 0 ? '+' : ''}{formatMoney(Math.abs(item.amount))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                
                                <p className="text-xs text-slate-500 mt-2 bg-amber-50 text-amber-600 p-2 rounded">
                                    注意：上述月份的舊有花費資料將被完全覆蓋。
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                        取消
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
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
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const [date, setDate] = useState(currentMonthStr);
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
        const key = `${date}-${currency}`;
        if (exchangeRateCache.current[key]) {
            setExchangeRate(exchangeRateCache.current[key]);
        } else if (currency === 'TWD') {
            setExchangeRate('1');
        }
    }, [date, currency, exchangeRateCache]);

    useEffect(() => {
        if (!exchangeRateCache) return;
        if (exchangeRate && !isNaN(parseFloat(exchangeRate))) {
            const key = `${date}-${currency}`;
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
        if (!date) return setErrorMsg("請選擇月份");
        if (!company) return setErrorMsg("請輸入收入來源");
        if (!amount) return setErrorMsg("請輸入金額");

        const newIncomeSource = {
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
                        <label className="text-xs text-slate-400 font-bold mb-1 block ml-1">月份</label>
                        <input type="month" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-slate-50 font-inter text-slate-800" />
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

    // --- 新增：取得上筆紀錄的資產建議 ---
    const prevAssets = useMemo(() => {
        if (!date) return [];
        const currentTimestamp = new Date(date).getTime();
        const dates = Object.keys(historyRecords)
            .filter(d => new Date(d).getTime() < currentTimestamp) // 找出比選擇日期更早的日期
            .sort((a, b) => new Date(b) - new Date(a)); // 降序排列，取最近的

        if (dates.length === 0) return [];
        return historyRecords[dates[0]]; // 回傳該日期的所有資產
    }, [date, historyRecords]);

    const suggestions = prevAssets.filter(a => a.type === type);

    const fetchRate = () => {
        if (currency === 'TWD') return;
        setIsFetchingRate(true);
        setTimeout(() => {
            const mockRates = DEFAULT_EXCHANGE_RATES;
            const rate = mockRates[currency] || (Math.random() * 30 + 1).toFixed(2);
            setExchangeRate(String(rate));
            setIsFetchingRate(false);
            if (originalAmount) {
                const twd = (parseFloat(originalAmount) * rate).toFixed(0);
                setAmount(twd);
            }
        }, 800);
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

    const handleSubmit = () => {
        setErrorMsg("");
        if (!name || !amount) return setErrorMsg("請填寫名稱與金額");
        if (!date) return setErrorMsg("請選擇日期");

        const cleanName = name.trim();
        const assetsInDate = historyRecords[date] || [];
        const isDuplicate = assetsInDate.some(asset => asset.name === cleanName);

        if (isDuplicate) {
            setErrorMsg(`「${cleanName}」在 ${date} 已存在，請使用編輯功能。`);
            return;
        }

        const newAsset = {
            id: Date.now(),
            type,
            name: cleanName,
            amount: Number(amount),
            currency,
            originalAmount: Number(originalAmount) || Number(amount),
            exchangeRate: Number(exchangeRate)
        };
        onSave(newAsset, date);
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
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-sm transition-colors">取消</button>
                    <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all">新增</button>
                </div>
            </div>
        </div>
    );
};

const DetailView = ({ dateStr, data, onBack, onUpdateData, assetNames, isPrivacyMode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('assets');
    const [localAssets, setLocalAssets] = useState([]);
    const [localMemo, setLocalMemo] = useState("");
    const [localIncomes, setLocalIncomes] = useState([]);
    const [expenseFilter, setExpenseFilter] = useState("all");
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteDate, setConfirmDeleteDate] = useState(false);

    useEffect(() => {
        if (data.records[dateStr]) {
            const assets = data.records[dateStr].map((item, idx) => ({ ...item, id: item.id || `legacy-${Date.now()}-${idx}` }));
            setLocalAssets(JSON.parse(JSON.stringify(assets)));
        } else {
            setLocalAssets([]);
        }
        let memoContent = data.memos[dateStr] || "";
        setLocalMemo(memoContent);
        const yearMonth = dateStr.substring(0, 7);
        const incomes = data.incomes[yearMonth]?.sources || [];
        setLocalIncomes(incomes.map((item, idx) => ({ ...item, _tempId: idx })));
    }, [dateStr, data]);

    const sortedDates = useMemo(() => {
        const allDates = new Set(Object.keys(data.records));
        Object.keys(data.memos || {}).forEach(d => allDates.add(d));
        Object.keys(data.incomes || {}).forEach(monthStr => {
            const hasDateInMonth = Array.from(allDates).some(d => d.startsWith(monthStr));
            if (!hasDateInMonth) allDates.add(`${monthStr}-01`);
        });
        Object.keys(data.expenses || {}).forEach(monthStr => {
            const hasDateInMonth = Array.from(allDates).some(d => d.startsWith(monthStr));
            if (!hasDateInMonth) allDates.add(`${monthStr}-01`);
        });
        return Array.from(allDates).sort();
    }, [data]);

    const currentIndex = sortedDates.indexOf(dateStr);
    const prevDate = currentIndex > 0 ? sortedDates[currentIndex - 1] : null;
    const nextDate = currentIndex < sortedDates.length - 1 ? sortedDates[currentIndex + 1] : null;

    const prevMonthAssetsMap = useMemo(() => {
        if (!prevDate) return {};
        const assets = data.records[prevDate] || [];
        return assets.reduce((acc, item) => {
            acc[`${item.type}-${item.name}`] = item.amount;
            return acc;
        }, {});
    }, [prevDate, data.records]);

    const prevTotalAssets = useMemo(() => {
        if (!prevDate) return 0;
        const assets = data.records[prevDate] || [];
        return assets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [prevDate, data.records]);

    const currentMonthExpenses = useMemo(() => {
        const yearMonth = dateStr.substring(0, 7);
        return data.expenses?.[yearMonth] || [];
    }, [dateStr, data.expenses]);

    const prevMonthIncome = useMemo(() => {
        if (!prevDate) return 0;
        const prevYearMonth = prevDate.substring(0, 7);
        const prevIncomeData = data.incomes[prevYearMonth];
        return prevIncomeData ? (prevIncomeData.totalAmount || 0) : 0;
    }, [prevDate, data.incomes]);

    const stats = useMemo(() => {
        const totalAssets = localAssets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const floatingAssets = localAssets.filter(item => item.type === 'floating').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const investmentRate = totalAssets > 0 ? floatingAssets / totalAssets : 0;
        const monthlyIncome = localIncomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const monthlyCost = currentMonthExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        const incomeDiff = monthlyIncome - prevMonthIncome;
        const assetDiff = totalAssets - prevTotalAssets;
        const compositeScore = incomeDiff + assetDiff;

        return { totalAssets, investmentRate, monthlyIncome, monthlyCost, incomeDiff, assetDiff, compositeScore };
    }, [localAssets, localIncomes, currentMonthExpenses, prevTotalAssets, prevMonthIncome]);

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

    const handleNavigate = (targetDate) => { if (targetDate) onUpdateData('NAVIGATE_DATE', targetDate); };
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
    const handleDeleteClick = (e, id) => { e.stopPropagation(); e.preventDefault(); setConfirmDeleteId(id); };
    const confirmDeleteAsset = () => { if (confirmDeleteId) { setLocalAssets(prev => prev.filter(item => item.id !== confirmDeleteId)); setConfirmDeleteId(null); } };
    const handleDeleteDay = () => setConfirmDeleteDate(true);
    const executeDeleteDay = () => onUpdateData('DELETE_DATE', dateStr);

    const handleSave = () => {
        const cleanIncomes = (localIncomes || []).map(({ _tempId, ...rest }) => rest);
        onUpdateData('UPDATE_DETAILS', {
            date: dateStr,
            assets: localAssets,
            memo: localMemo,
            incomes: cleanIncomes
        });
        setIsEditing(false);
    };

    const fixedAssets = localAssets.filter(i => i.type === 'fixed');
    const floatingAssets = localAssets.filter(i => i.type === 'floating');

    return (
        <div className="fixed inset-0 bg-[#F9F9F7] z-40 overflow-y-auto animate-[slideIn_0.3s_ease-out]">
            {confirmDeleteId && <ConfirmModal title="刪除資產" message="確定要刪除這筆資產紀錄嗎？" onConfirm={confirmDeleteAsset} onCancel={() => setConfirmDeleteId(null)} />}
            {confirmDeleteDate && <ConfirmModal title="刪除整日紀錄" message={`確定要刪除 ${dateStr} 的所有資產與備忘嗎？\n此動作無法復原。`} onConfirm={executeDeleteDay} onCancel={() => setConfirmDeleteDate(false)} />}

            <header className="sticky top-0 bg-[#F9F9F7]/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors" aria-label="返回"><ArrowLeft size={24} strokeWidth={1.5} /></button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-4">
                        <button disabled={!prevDate} onClick={() => handleNavigate(prevDate)} className={`p-1 ${!prevDate ? 'text-slate-200' : 'text-slate-400 hover:text-slate-800'}`} aria-label="上一日"><ChevronLeft size={20} /></button>
                        <span className="font-serif-tc font-bold text-xl text-slate-800 tracking-wide">{dateStr}</span>
                        <button disabled={!nextDate} onClick={() => handleNavigate(nextDate)} className={`p-1 ${!nextDate ? 'text-slate-200' : 'text-slate-400 hover:text-slate-800'}`} aria-label="下一日"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-2 -mr-2">
                    <button onClick={handleDeleteDay} className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="刪除整日紀錄" aria-label="刪除整日紀錄"><Trash2 size={20} strokeWidth={1.5} /></button>
                    {(activeTab === 'assets' || activeTab === 'income') && (
                        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`p-2 rounded-full transition-colors flex items-center gap-1 ${isEditing ? 'bg-teal-600 text-white shadow-lg px-4' : 'text-slate-500 hover:bg-slate-200'}`} aria-label={isEditing ? "儲存" : "編輯"}>
                            {isEditing ? <><Check size={18} /><span className="text-xs font-bold">儲存</span></> : <Edit2 size={20} strokeWidth={1.5} />}
                        </button>
                    )}
                </div>
            </header>

            <main className="px-6 py-8 pb-32 space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-teal-500" /><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">當月備忘</h3></div>
                    {isEditing ? <textarea value={localMemo} onChange={(e) => setLocalMemo(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:border-teal-500 outline-none text-sm text-slate-700 font-serif-tc min-h-[80px]" placeholder="輸入本月備忘..." /> : <div className={`p-4 rounded-xl border border-slate-200/60 bg-white text-sm text-slate-700 font-serif-tc min-h-[60px] ${!localMemo ? 'text-slate-300 italic' : ''}`}>{localMemo || "無備忘紀錄"}</div>}
                </section>

                <section className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => { setActiveTab('assets'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'assets' ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-teal-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'assets' ? 'text-teal-600 font-bold' : 'text-slate-400'}`}>總資產 (Total)</div>
                            <AmountWithTooltip amount={stats.totalAssets} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'assets' ? 'text-teal-800' : 'text-slate-800'}`} align="center" masked={isPrivacyMode} />
                        </button>
                        <button onClick={() => { setActiveTab('income'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'income' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'income' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>本月收入 (Income)</div>
                            <AmountWithTooltip amount={stats.monthlyIncome} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'income' ? 'text-emerald-800' : 'text-emerald-700'}`} align="center" prefix="+" masked={isPrivacyMode} />
                        </button>
                        <button onClick={() => { setActiveTab('cost'); setIsEditing(false); }} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeTab === 'cost' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 text-rose-900' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}>
                            <div className={`text-[10px] uppercase tracking-wider font-inter mb-1 ${activeTab === 'cost' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>本月花費 (Cost)</div>
                            <AmountWithTooltip amount={stats.monthlyCost} className={`text-lg font-serif-tc font-bold justify-center ${activeTab === 'cost' ? 'text-rose-800' : 'text-rose-700'}`} align="center" prefix="-" masked={isPrivacyMode} />
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
                                                <span className="text-xs text-slate-400 font-inter mt-0.5 flex items-center gap-1">{item.bank && <><Wallet size={10} /> {item.bank}</>}</span>
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
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        return localStorage.getItem('isPrivacyMode') === 'true';
    });

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
    const saveToFirestoreChunks = async (userData) => {
        if (!user) return;
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
                    setData(cloudData);
                } else {
                    console.log("No chunked data found, using empty state.");
                    // Fallback: check if legacy single-doc exists (optional migration)
                }
            } catch (error) {
                console.error("Error loading chunked data:", error);
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
    const [showYearSelector, setShowYearSelector] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [showStatementModal, setShowStatementModal] = useState(false);
    const [showFIREModal, setShowFIREModal] = useState(false);
    const [showRangeStatsModal, setShowRangeStatsModal] = useState(false);
    const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

    const fileInputRef = useRef(null);
    const expenseFileInputRef = useRef(null);

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

    const availableYears = useMemo(() => {
        const years = new Set();
        Object.keys(data.records || {}).forEach(d => years.add(new Date(d).getFullYear()));
        Object.keys(data.incomes || {}).forEach(d => years.add(parseInt(d.split('-')[0])));
        Object.keys(data.memos || {}).forEach(d => years.add(new Date(d).getFullYear()));
        Object.keys(data.expenses || {}).forEach(d => years.add(parseInt(d.split('-')[0])));

        const thisYear = new Date().getFullYear();
        return Array.from(years).filter(y => y <= thisYear).sort((a, b) => b - a);
    }, [data]);

    const getYearEndAssets = (year, sourceData) => {
        let lastDate = null;
        let totalAssets = 0;
        Object.entries(sourceData.records || {}).forEach(([dateStr, assets]) => {
            const date = new Date(dateStr);
            if (date.getFullYear() === year) {
                if (!lastDate || date > lastDate) {
                    lastDate = date;
                    totalAssets = assets.reduce((sum, item) => sum + (item.amount || 0), 0);
                }
            }
        });
        return totalAssets;
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
                assets: getYearEndAssets(year, data),
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
        const monthlyStats = Array(12).fill(0).map((_, i) => ({ month: i + 1, assets: 0, income: 0, cost: 0, balance: 0, memo: null, hasRecord: false, latestDate: null, allRecords: [], analysis: { incomeDiff: 0, assetDiff: 0, compositeScore: 0 } }));
        const monthRecordsMap = new Map();

        Object.entries(data.records || {}).forEach(([dateStr, assets]) => {
            const date = new Date(dateStr);
            if (date.getFullYear() === currentYear) {
                const totalAssets = assets.reduce((sum, item) => sum + (item.amount || 0), 0);
                const monthIdx = date.getMonth();
                if (!monthRecordsMap.has(monthIdx)) monthRecordsMap.set(monthIdx, []);
                monthRecordsMap.get(monthIdx).push({ dateStr, assets: totalAssets });
            }
        });

        monthRecordsMap.forEach((records, monthIdx) => {
            records.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
            const latest = records[records.length - 1];
            monthlyStats[monthIdx].hasRecord = true;
            monthlyStats[monthIdx].assets = latest.assets;
            monthlyStats[monthIdx].latestDate = latest.dateStr;
            monthlyStats[monthIdx].allRecords = records;
        });

        let lastKnownAsset = getYearEndAssets(currentYear - 1, data);
        for (let i = 0; i < 12; i++) {
            if (monthlyStats[i].hasRecord) lastKnownAsset = monthlyStats[i].assets;
            else monthlyStats[i].assets = lastKnownAsset;
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
        let prevAsset = getYearEndAssets(currentYear - 1, data);

        for (let i = 0; i < 12; i++) {
            const currentAsset = monthlyStats[i].assets;
            const currentIncome = monthlyStats[i].income;
            const cost = monthlyStats[i].cost || 0;

            // 計算餘額 (原本的邏輯)
            monthlyStats[i].balance = (currentAsset - prevAsset) - cost;

            // 計算分析指標 (新增)
            const incomeDiff = currentIncome - prevIncome;
            const assetDiff = currentAsset - prevAsset;
            const compositeScore = incomeDiff + assetDiff;
            monthlyStats[i].analysis = { incomeDiff, assetDiff, compositeScore };

            prevAsset = currentAsset;
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
                handleShowAlert("同步成功", "已從雲端更新最新資料");
            } else {
                handleShowAlert("同步完成", "雲端無資料");
            }
        } catch (error) {
            console.error(error);
            handleShowAlert("同步失敗", "無法連接雲端");
        } finally {
            setIsSyncing(false);
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

        // Real Asset Stats (Restored for new requirement)
        const thisYearAssets = getYearEndAssets(currentYear, data);
        const lastYearAssets = getYearEndAssets(currentYear - 1, data);
        const realAssetGrowthAmount = thisYearAssets - lastYearAssets;
        const realAssetGrowthPercentage = lastYearAssets > 0 ? (realAssetGrowthAmount / lastYearAssets) : 0;
        const assetGrowthRatio = lastYearAssets > 0 ? (thisYearAssets / lastYearAssets) : 0;

        return {
            totalIncome: thisYearIncome,
            lastYearIncome,
            avgIncome,
            assetGrowthRate, // Income Ratio
            incomeGrowthRate, // Share of Total Ratio
            totalAccumulatedIncome,
            thisYearAssets,
            lastYearAssets,
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
            currentAssets = data.records[sortedDates[0]].reduce((sum, i) => sum + (i.amount || 0), 0);
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
                if (user) await saveToFirestoreChunks(pendingData);
                setData(pendingData);
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
                        const monthsCount = Object.keys(expensesByMonth).length;
                        const totalRecords = Object.values(expensesByMonth).flat().length;
                        const months = Object.keys(expensesByMonth).sort();

                        setImportConfirmation({
                            show: true,
                            type: 'csv',
                            summary: { monthsCount, totalRecords, months },
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

                const summary = {
                    records: Object.values(parsed.records || {}).flat().length,
                    incomes: Object.values(parsed.incomes || {}).reduce((acc, curr) => acc + (curr.sources?.length || 0), 0),
                    expenses: Object.keys(parsed.expenses || {}).length,
                    memos: Object.keys(parsed.memos || {}).length
                };

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

    const handleExpenseUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        handleProcessExpenseCSV(file, (expensesByMonth) => {
            const monthsCount = Object.keys(expensesByMonth).length;
            const totalRecords = Object.values(expensesByMonth).flat().length;
            const months = Object.keys(expensesByMonth).sort();

            setImportConfirmation({
                show: true,
                type: 'csv',
                summary: { monthsCount, totalRecords, months },
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

    const handleMonthClick = (monthData) => { if (monthData.latestDate) { setSelectedDate(monthData.latestDate); setView('detail'); } };

    const handleDetailUpdate = (type, payload) => {
        if (type === 'NAVIGATE_DATE') setSelectedDate(payload);
        else if (type === 'UPDATE_DETAILS') {
            const { date, assets, memo, incomes } = payload;
            const yearMonth = date.substring(0, 7);
            const newTotal = incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const existingIncomeMonth = data.incomes[yearMonth] || {};

            const newData = {
                ...data,
                records: { ...data.records, [date]: assets },
                memos: { ...data.memos, [date]: memo },
                incomes: {
                    ...data.incomes,
                    [yearMonth]: { ...existingIncomeMonth, totalAmount: newTotal, sources: incomes }
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
        } else if (type === 'DELETE_DATE') {
            const dateToDelete = payload;
            const newData = { ...data };
            if (newData.records) delete newData.records[dateToDelete];
            if (newData.memos) delete newData.memos[dateToDelete];
            setData(newData);
            saveToFirestoreChunks(newData);
            setView('dashboard');
            handleShowAlert("刪除成功", `已刪除 ${dateToDelete} 的所有紀錄`);
        }
    };

    const handleSaveNewAsset = (newAsset, dateKey) => {
        const existingDetails = data.records[dateKey] || [];
        const newData = {
            ...data,
            records: { ...data.records, [dateKey]: [...existingDetails, newAsset] }
        };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("新增成功", `資產 ${newAsset.name} 已新增到 ${dateKey}`);
        setShowAddAssetModal(false);
        setShowAddModal(false);
    };

    const handleSaveNewIncome = (newIncomeSource, dateKey) => {
        const existingMonthData = data.incomes[dateKey] || { totalAmount: 0, sources: [] };
        const existingSources = existingMonthData.sources || [];
        const newTotal = (existingMonthData.totalAmount || 0) + newIncomeSource.amount;
        const newData = {
            ...data,
            incomes: { ...data.incomes, [dateKey]: { ...existingMonthData, totalAmount: newTotal, sources: [...existingSources, newIncomeSource] } }
        };
        setData(newData);
        saveToFirestoreChunks(newData);
        handleShowAlert("新增成功", `已新增一筆收入至 ${dateKey}`);
        setShowAddIncomeModal(false);
        setShowAddModal(false);
    };

    return (
        <div className="min-h-screen max-w-md mx-auto bg-white text-slate-800 relative font-sans shadow-2xl overflow-hidden">
            <GlobalStyles />
            {isAppLocked && <BiometricLockScreen onUnlock={handleUnlockApp} errorMsg={biometricError} />}
            {alertInfo.show && <AlertModal title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />}
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
                    <DetailView dateStr={selectedDate} data={data} onBack={() => setView('dashboard')} onUpdateData={handleDetailUpdate} assetNames={allAssetNames} isPrivacyMode={isPrivacyMode} />
                </div>
            )}
            <div className={`transition-transform duration-300 w-full max-w-md mx-auto ${view === 'detail' ? 'scale-95 opacity-50 pointer-events-none hidden' : ''}`}>
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
                                <AreaChart data={processedData}>
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
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">今年資產:</span><span className="font-inter">{formatWan(yearStats.thisYearAssets)}</span></div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">去年資產:</span><span className="font-inter">{formatWan(yearStats.lastYearAssets)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">公式: 今年度資產 - 去年度資產</div>
                                    </div>
                                )}
                                <Footprints className="absolute -bottom-3 -right-2 text-amber-100 opacity-40 rotate-[-15deg]" size={50} />
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group/tooltip z-10 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-slate-400 font-inter mb-1 block flex items-center justify-center gap-1 cursor-help">
                                    年度資產增長比例 {!isPrivacyMode && <Info size={12} />}
                                </span>
                                <span className={`text-2xl font-inter font-bold text-emerald-600 ${isPrivacyMode ? 'font-mono tracking-widest' : ''}`}>
                                    {isPrivacyMode ? '****' : formatRate(yearStats.assetGrowthRatio)}
                                </span>
                                {!isPrivacyMode && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">計算明細</div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">今年資產:</span><span className="font-inter">{formatWan(yearStats.thisYearAssets)}</span></div>
                                        <div className="flex justify-between mb-1"><span className="text-slate-400">去年資產:</span><span className="font-inter">{formatWan(yearStats.lastYearAssets)}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-600">公式: 今年度資產 / 去年度資產</div>
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
                                        {monthData.memo && (<div className="ml-11 mt-1 text-xs text-slate-400 font-serif-tc italic flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-300"></span>{monthData.memo}</div>)}
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
                                <button onClick={() => { setShowAddModal(false); setShowAddAssetModal(true); }} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors"><Wallet size={20} strokeWidth={1.5} className="text-teal-600" /></div><span className="text-sm font-serif-tc font-bold">新增資產</span>
                                </button>
                                <button onClick={() => { setShowAddModal(false); setShowAddIncomeModal(true); }} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors"><Coins size={20} strokeWidth={1.5} className="text-amber-600" /></div><span className="text-sm font-serif-tc font-bold">新增收入</span>
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
