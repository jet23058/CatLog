export const formatMoney = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(val);
export const formatMoneyByMarket = (val, market = 'TW') => new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: market === 'US' ? 2 : 0,
    maximumFractionDigits: market === 'US' ? 2 : 0
}).format(val);
export const formatPriceUpToTwo = (val) => new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
}).format(Number(val) || 0);
export const formatExchangeRate = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 3 }).format(val);
export const formatWan = (val) => {
    if (Math.abs(val) < 10000) return formatMoney(val);
    const wan = val / 10000;
    return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(wan)} 萬`;
};
export const formatRate = (val) => `${(val * 100).toFixed(1)}%`;
export const formatPercent = (value) => !isFinite(value) ? "0.0%" : `${Math.abs(value).toFixed(1)}%`;
