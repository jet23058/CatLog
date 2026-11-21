// Generated from packages/core by npm run build:ios -w @catlog/core. Do not edit.
var CatLogCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var src_exports = {};
  __export(src_exports, {
    AUTO_LOCK_BACKGROUND_MS: () => AUTO_LOCK_BACKGROUND_MS,
    AUTO_LOCK_IDLE_MS: () => AUTO_LOCK_IDLE_MS,
    BACKUP_FORMAT: () => BACKUP_FORMAT,
    BACKUP_VERSION: () => BACKUP_VERSION,
    CHUNK_SIZE: () => CHUNK_SIZE,
    CURRENT_SCHEMA_VERSION: () => CURRENT_SCHEMA_VERSION,
    DEBT_CATEGORIES: () => DEBT_CATEGORIES,
    DEFAULT_EXCHANGE_RATES: () => DEFAULT_EXCHANGE_RATES,
    INITIAL_DATA: () => INITIAL_DATA,
    PRIVACY_MASK: () => PRIVACY_MASK,
    SCHEMA_MIN_CLIENT_VERSION: () => SCHEMA_MIN_CLIENT_VERSION,
    STOCK_MARKETS: () => STOCK_MARKETS,
    STOCK_QUOTE_SOURCES: () => STOCK_QUOTE_SOURCES,
    SUPPORTED_CURRENCIES: () => SUPPORTED_CURRENCIES,
    addAssetsToData: () => addAssetsToData,
    addDebtAndCarryForward: () => addDebtAndCarryForward,
    addDebtEventToData: () => addDebtEventToData,
    addDebtToData: () => addDebtToData,
    addDebtToSnapshot: () => addDebtToSnapshot,
    addHoldingSnapshotToData: () => addHoldingSnapshotToData,
    addIncomeToData: () => addIncomeToData,
    addStockTransactionsToData: () => addStockTransactionsToData,
    areDataStructuresEqual: () => areDataStructuresEqual,
    buildCollectionDiff: () => buildCollectionDiff,
    buildExpenseDiff: () => buildExpenseDiff,
    buildHoldingMap: () => buildHoldingMap,
    buildHoldingSnapshotPreview: () => buildHoldingSnapshotPreview,
    buildMetaVersionFields: () => buildMetaVersionFields,
    buildStockRows: () => buildStockRows,
    buildTpexQuoteFromListing: () => buildTpexQuoteFromListing,
    buildTwseQuoteFromListing: () => buildTwseQuoteFromListing,
    checkCompatibility: () => checkCompatibility,
    cleanPledgeStockRows: () => cleanPledgeStockRows,
    clearStockTransactionsFromData: () => clearStockTransactionsFromData,
    compareVersions: () => compareVersions,
    convertToTWD: () => convertToTWD,
    createAssetEntry: () => createAssetEntry,
    createBackupFile: () => createBackupFile,
    createBackupText: () => createBackupText,
    createDebtEntry: () => createDebtEntry,
    createDebtEvent: () => createDebtEvent,
    createHoldingRow: () => createHoldingRow,
    createIncomeSource: () => createIncomeSource,
    deleteDebtEventFromData: () => deleteDebtEventFromData,
    deleteHoldingSnapshotFromData: () => deleteHoldingSnapshotFromData,
    deleteMonthData: () => deleteMonthData,
    describeIncompatibility: () => describeIncompatibility,
    describeStockTrades: () => describeStockTrades,
    detectDelimitedTextSeparator: () => detectDelimitedTextSeparator,
    extractBackupData: () => extractBackupData,
    filterTransactionsByRange: () => filterTransactionsByRange,
    findDuplicateAsset: () => findDuplicateAsset,
    flattenDebtEvents: () => flattenDebtEvents,
    flattenDebts: () => flattenDebts,
    flattenIncomeSources: () => flattenIncomeSources,
    flattenMemos: () => flattenMemos,
    flattenRecords: () => flattenRecords,
    flattenStockHoldingSnapshots: () => flattenStockHoldingSnapshots,
    formatExchangeRate: () => formatExchangeRate,
    formatMoney: () => formatMoney,
    formatMoneyByMarket: () => formatMoneyByMarket,
    formatPercent: () => formatPercent,
    formatPriceUpToTwo: () => formatPriceUpToTwo,
    formatRate: () => formatRate,
    formatStockPnlLabel: () => formatStockPnlLabel,
    formatWan: () => formatWan,
    getAssetExtremes: () => getAssetExtremes,
    getAssetNameOptions: () => getAssetNameOptions,
    getAssetRecordDatesInYear: () => getAssetRecordDatesInYear,
    getAvailableYears: () => getAvailableYears,
    getBackupFileName: () => getBackupFileName,
    getDataMonths: () => getDataMonths,
    getDebtAccountOptions: () => getDebtAccountOptions,
    getDebtCategoryLabel: () => getDebtCategoryLabel,
    getDebtEffectiveDate: () => getDebtEffectiveDate,
    getDebtEstimatedAnnualInterest: () => getDebtEstimatedAnnualInterest,
    getDebtEstimatedMonthlyInterest: () => getDebtEstimatedMonthlyInterest,
    getDebtEventDefaultDate: () => getDebtEventDefaultDate,
    getDebtEventFullKey: () => getDebtEventFullKey,
    getDebtEventIdentityKey: () => getDebtEventIdentityKey,
    getDebtEventImpact: () => getDebtEventImpact,
    getDebtEventInputError: () => getDebtEventInputError,
    getDebtEventLabel: () => getDebtEventLabel,
    getDebtEventTargets: () => getDebtEventTargets,
    getDebtFullKey: () => getDebtFullKey,
    getDebtIdentity: () => getDebtIdentity,
    getDebtIdentityKey: () => getDebtIdentityKey,
    getDebtInputError: () => getDebtInputError,
    getDebtMarketAllocation: () => getDebtMarketAllocation,
    getDebtTargetKey: () => getDebtTargetKey,
    getDebtTotal: () => getDebtTotal,
    getEffectiveDebtAtDate: () => getEffectiveDebtAtDate,
    getEffectiveDebtSnapshotAtDate: () => getEffectiveDebtSnapshotAtDate,
    getExpenseAccounts: () => getExpenseAccounts,
    getExpenseCategories: () => getExpenseCategories,
    getExpenseFullKey: () => getExpenseFullKey,
    getExpenseIdentityKey: () => getExpenseIdentityKey,
    getExpenseImportSummary: () => getExpenseImportSummary,
    getFireStats: () => getFireStats,
    getFireYearlyStats: () => getFireYearlyStats,
    getHeaderIndex: () => getHeaderIndex,
    getHoldingSnapshots: () => getHoldingSnapshots,
    getImportablePreviousAssets: () => getImportablePreviousAssets,
    getIncomeFullKey: () => getIncomeFullKey,
    getIncomeIdentityKey: () => getIncomeIdentityKey,
    getJsonImportSummary: () => getJsonImportSummary,
    getLatestAssetByName: () => getLatestAssetByName,
    getLatestDateInMonth: () => getLatestDateInMonth,
    getLatestHoldingSnapshotForMarket: () => getLatestHoldingSnapshotForMarket,
    getLatestSnapshotDate: () => getLatestSnapshotDate,
    getLatestSnapshotEstimate: () => getLatestSnapshotEstimate,
    getLatestSnapshotItems: () => getLatestSnapshotItems,
    getLatestSnapshotTotal: () => getLatestSnapshotTotal,
    getMarketSnapshots: () => getMarketSnapshots,
    getMemoFullKey: () => getMemoFullKey,
    getMemoIdentityKey: () => getMemoIdentityKey,
    getMonthDebtEventTargets: () => getMonthDebtEventTargets,
    getMonthDetail: () => getMonthDetail,
    getMonthEndDateKey: () => getMonthEndDateKey,
    getMonthSummary: () => getMonthSummary,
    getMonthlyDebtInterestEstimate: () => getMonthlyDebtInterestEstimate,
    getMonthlyStats: () => getMonthlyStats,
    getNetAssetsAtDate: () => getNetAssetsAtDate,
    getPledgeAverageRate: () => getPledgeAverageRate,
    getPreviousAssetSnapshot: () => getPreviousAssetSnapshot,
    getPreviousHoldingRows: () => getPreviousHoldingRows,
    getRangeAssetStats: () => getRangeAssetStats,
    getRangeDebtStats: () => getRangeDebtStats,
    getRangeExpenseStats: () => getRangeExpenseStats,
    getRangeFinanceStats: () => getRangeFinanceStats,
    getRangeIncomeStats: () => getRangeIncomeStats,
    getRangeStats: () => getRangeStats,
    getRateChangeEventsForDebt: () => getRateChangeEventsForDebt,
    getRecentMonthsRange: () => getRecentMonthsRange,
    getRecordFullKey: () => getRecordFullKey,
    getRecordIdentityKey: () => getRecordIdentityKey,
    getSchemaVersion: () => getSchemaVersion,
    getSortedValue: () => getSortedValue,
    getStatementDefaultRange: () => getStatementDefaultRange,
    getStatementExpenses: () => getStatementExpenses,
    getStatementView: () => getStatementView,
    getStockChartRows: () => getStockChartRows,
    getStockDebtStats: () => getStockDebtStats,
    getStockLeaders: () => getStockLeaders,
    getStockMarketCounts: () => getStockMarketCounts,
    getStockMarketLabel: () => getStockMarketLabel,
    getStockOverview: () => getStockOverview,
    getStockQuote: () => getStockQuote,
    getStockQuoteEstimate: () => getStockQuoteEstimate,
    getStockSnapshotFullKey: () => getStockSnapshotFullKey,
    getStockSnapshotIdentityKey: () => getStockSnapshotIdentityKey,
    getStockStats: () => getStockStats,
    getStockStatsTargetDate: () => getStockStatsTargetDate,
    getStockSymbolFromItem: () => getStockSymbolFromItem,
    getStockTradeDescription: () => getStockTradeDescription,
    getStockTradeLabel: () => getStockTradeLabel,
    getStockTradeTitle: () => getStockTradeTitle,
    getStockTrades: () => getStockTrades,
    getStockTransactionFullKey: () => getStockTransactionFullKey,
    getStockTransactionIdentityKey: () => getStockTransactionIdentityKey,
    getUSBrokerTradeType: () => getUSBrokerTradeType,
    getYahooChartUrl: () => getYahooChartUrl,
    getYearAssetGrowthRange: () => getYearAssetGrowthRange,
    getYearEndAssets: () => getYearEndAssets,
    getYearEndDebt: () => getYearEndDebt,
    getYearStats: () => getYearStats,
    getYearTotalIncome: () => getYearTotalIncome,
    getYearlyTrendData: () => getYearlyTrendData,
    hashString: () => hashString,
    inferPledgeStockMarket: () => inferPledgeStockMarket,
    isArchivedUSRealizedCSVHeaders: () => isArchivedUSRealizedCSVHeaders,
    isDuplicateAsset: () => isDuplicateAsset,
    isIdleExpired: () => isIdleExpired,
    isNumericTWSymbol: () => isNumericTWSymbol,
    isUSBrokerTransactionCSVHeaders: () => isUSBrokerTransactionCSVHeaders,
    looksLikeUSBrokerPastedRows: () => looksLikeUSBrokerPastedRows,
    maskAmount: () => maskAmount,
    matchTpexListing: () => matchTpexListing,
    matchTwseListing: () => matchTwseListing,
    maxVersion: () => maxVersion,
    mergeDebtMaps: () => mergeDebtMaps,
    mergeExpenseImport: () => mergeExpenseImport,
    mergeListingIntoQuote: () => mergeListingIntoQuote,
    mergePledgeRateRows: () => mergePledgeRateRows,
    migrateData: () => migrateData,
    normalizeAppData: () => normalizeAppData,
    normalizeDate: () => normalizeDate,
    normalizeMonthValue: () => normalizeMonthValue,
    normalizeSnapshotVersions: () => normalizeSnapshotVersions,
    normalizeTradeDescription: () => normalizeTradeDescription,
    normalizeUSBrokerDate: () => normalizeUSBrokerDate,
    normalizeUSDate: () => normalizeUSDate,
    normalizeYahooSymbol: () => normalizeYahooSymbol,
    parseAmount: () => parseAmount,
    parseBackupText: () => parseBackupText,
    parseCSV: () => parseCSV,
    parseCollateralText: () => parseCollateralText,
    parseExpenseCSV: () => parseExpenseCSV,
    parseLegacyChunks: () => parseLegacyChunks,
    parseStockImport: () => parseStockImport,
    parseYahooChart: () => parseYahooChart,
    processArchivedUSRealizedCSVRows: () => processArchivedUSRealizedCSVRows,
    processExpenseCSVText: () => processExpenseCSVText,
    processStockCSVText: () => processStockCSVText,
    processStockHoldingCSVText: () => processStockHoldingCSVText,
    processUSBrokerTransactionCSVRows: () => processUSBrokerTransactionCSVRows,
    processUSBrokerTransactionPastedRows: () => processUSBrokerTransactionPastedRows,
    processUSBrokerTransactionRows: () => processUSBrokerTransactionRows,
    setFireWithdrawalRate: () => setFireWithdrawalRate,
    shouldLockOnResume: () => shouldLockOnResume,
    splitIntoChunks: () => splitIntoChunks,
    summarizeBackupImport: () => summarizeBackupImport,
    summarizeDataCounts: () => summarizeDataCounts,
    summarizeExpenseImport: () => summarizeExpenseImport,
    summarizeStockImport: () => summarizeStockImport,
    updateIncomeSourceField: () => updateIncomeSourceField,
    updateMonthDetails: () => updateMonthDetails,
    validateQuoteParams: () => validateQuoteParams
  });

  // src/schema.js
  var CURRENT_SCHEMA_VERSION = 1;
  var SCHEMA_MIN_CLIENT_VERSION = {
    1: "3.0.0"
  };
  var MIGRATIONS = [
    // 0 → 1：沒有結構變動，只補上 schemaVersion。
    (data) => data
  ];
  var getSchemaVersion = (data) => Number.isInteger(data?.schemaVersion) && data.schemaVersion > 0 ? data.schemaVersion : 0;
  var migrateData = (data = {}) => {
    const source = data || {};
    let version = getSchemaVersion(source);
    if (version > CURRENT_SCHEMA_VERSION) return source;
    let result = source;
    while (version < CURRENT_SCHEMA_VERSION) {
      result = MIGRATIONS[version](result);
      version += 1;
    }
    return { ...result, schemaVersion: CURRENT_SCHEMA_VERSION };
  };
  var parseVersion = (value) => String(value || "0.0.0").replace(/^v/, "").split(/[.+-]/).slice(0, 3).map((part) => parseInt(part, 10) || 0);
  var compareVersions = (a, b) => {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };
  var maxVersion = (...versions) => versions.filter(Boolean).reduce((max, v) => max === null || compareVersions(v, max) > 0 ? v : max, null);
  var checkCompatibility = ({ appVersion, data = null, meta = null }) => {
    const schemaVersion = Math.max(getSchemaVersion(data), getSchemaVersion(meta));
    const requiredVersion = maxVersion(meta?.minClientVersion, SCHEMA_MIN_CLIENT_VERSION[schemaVersion]);
    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
      return { canWrite: false, reason: "schema", requiredVersion, schemaVersion };
    }
    if (requiredVersion && appVersion && compareVersions(appVersion, requiredVersion) < 0) {
      return { canWrite: false, reason: "minClientVersion", requiredVersion, schemaVersion };
    }
    return { canWrite: true };
  };
  var buildMetaVersionFields = (previousMeta = null) => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    minClientVersion: maxVersion(previousMeta?.minClientVersion, SCHEMA_MIN_CLIENT_VERSION[CURRENT_SCHEMA_VERSION])
  });
  var describeIncompatibility = (result) => {
    if (!result || result.canWrite) return "";
    const target = result.requiredVersion ? ` ${result.requiredVersion} \u4EE5\u4E0A` : "\u6700\u65B0";
    if (result.reason === "schema") {
      return `\u96F2\u7AEF\u8CC7\u6599\u662F\u7528\u8F03\u65B0\u7248\u7684 App \u5B58\u7684\uFF08\u8CC7\u6599\u683C\u5F0F v${result.schemaVersion}\uFF09\uFF0C\u9019\u500B\u7248\u672C\u7121\u6CD5\u5B89\u5168\u5BEB\u5165\u3002\u8ACB\u66F4\u65B0\u5230${target}\u7248\u672C\u3002`;
    }
    return `\u96F2\u7AEF\u8CC7\u6599\u9700\u8981${target}\u7248\u672C\u7684 App \u624D\u80FD\u7DE8\u8F2F\uFF0C\u8ACB\u66F4\u65B0\u5F8C\u518D\u8A66\u3002`;
  };

  // src/data.js
  var DEFAULT_EXCHANGE_RATES = {
    "TWD": 1,
    "USD": 32.5,
    "JPY": 0.21,
    "EUR": 35.2,
    "CNY": 4.5,
    "USDT": 32.5
  };
  var INITIAL_DATA = {
    "records": {},
    "memos": {},
    "incomes": {},
    "expenses": {},
    "debts": {},
    "debtEvents": {},
    "stockTransactions": [],
    "stockHoldingSnapshots": {},
    "fireSettings": { "withdrawalRate": 4 }
  };
  var normalizeAppData = (input = {}) => {
    const source = migrateData(input);
    return {
      ...INITIAL_DATA,
      ...source,
      debts: source.debts || {},
      debtEvents: source.debtEvents || {},
      stockTransactions: source.stockTransactions || [],
      stockHoldingSnapshots: source.stockHoldingSnapshots || {}
    };
  };
  var BACKUP_FORMAT = "meow-assets-backup";
  var BACKUP_VERSION = 2;
  var createBackupFile = (data) => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    data: normalizeAppData(data)
  });
  var extractBackupData = (source = {}) => {
    if (source?.format === BACKUP_FORMAT) {
      if (!source.data || typeof source.data !== "object") throw new Error("\u5099\u4EFD\u6A94\u7F3A\u5C11 data \u6B04\u4F4D");
      return source.data;
    }
    return source;
  };

  // src/snapshots.js
  var getLatestSnapshotTotal = (records = {}, targetDateStr, calculator) => {
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
  var getLatestSnapshotItems = (records = {}, targetDateStr) => {
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
  var getLatestSnapshotDate = (records = {}, targetDateStr) => {
    const targetDate = new Date(targetDateStr);
    let latestDateStr = null;
    let latestDate = null;
    Object.keys(records || {}).forEach((dateStr) => {
      const date = new Date(dateStr);
      if (date <= targetDate && (!latestDate || date > latestDate)) {
        latestDate = date;
        latestDateStr = dateStr;
      }
    });
    return latestDateStr;
  };

  // src/debts.js
  var getDebtIdentity = (debt = {}) => debt.id || [
    debt.name,
    debt.lender,
    debt.amount,
    debt.category,
    debt.memo,
    JSON.stringify(debt.pledgeStocks || [])
  ].join("|");
  var getDebtTargetKey = (debt = {}) => debt.id ? `id:${debt.id}` : `fallback:${[
    debt.category,
    debt.name,
    debt.lender
  ].join("|")}`;
  var mergeDebtMaps = (...debtMaps) => {
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
  var addDebtToSnapshot = (snapshot = [], debt) => {
    const seen = new Set((Array.isArray(snapshot) ? snapshot : []).map(getDebtIdentity));
    const identity = getDebtIdentity(debt);
    if (seen.has(identity)) return Array.isArray(snapshot) ? snapshot : [];
    return [...Array.isArray(snapshot) ? snapshot : [], debt];
  };
  var addDebtAndCarryForward = (debtMap = {}, dateKey, newDebt) => {
    const nextDebts = { ...debtMap };
    const exactDateDebts = nextDebts?.[dateKey];
    const existingDebts = exactDateDebts || getLatestSnapshotItems(nextDebts, dateKey);
    nextDebts[dateKey] = addDebtToSnapshot(existingDebts, newDebt);
    Object.keys(nextDebts).filter((date) => date > dateKey).sort().forEach((date) => {
      nextDebts[date] = addDebtToSnapshot(nextDebts[date], newDebt);
    });
    return nextDebts;
  };
  var getDebtTotal = (debts = []) => debts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  var getMonthEndDateKey = (monthKey) => {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return "";
    const [year, month] = monthKey.split("-").map(Number);
    const endDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  };
  var inferPledgeStockMarket = (value = "") => {
    const text = String(value || "").trim().toUpperCase();
    if (!text) return null;
    if (/[\u4e00-\u9fff]/.test(text)) return "TW";
    if (/^\d{4,6}[A-Z]*$/.test(text)) return "TW";
    if (/^[A-Z.\-]+$/.test(text)) return "US";
    return null;
  };
  var getDebtMarketAllocation = (debt = {}) => {
    if (debt.category !== "stock_pledge") return {};
    const pledgeStocks = Array.isArray(debt.pledgeStocks) ? debt.pledgeStocks : [];
    const weights = {};
    pledgeStocks.forEach((stock) => {
      const market = inferPledgeStockMarket(stock.symbol || stock.name || "");
      if (!market) return;
      const rawWeight = Number(stock.shares);
      const weight = rawWeight > 0 ? rawWeight : 1;
      weights[market] = (weights[market] || 0) + weight;
    });
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (totalWeight <= 0) return {};
    return Object.fromEntries(Object.entries(weights).map(([market, weight]) => [market, weight / totalWeight]));
  };
  var getPledgeAverageRate = (debt = {}) => {
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
  var getDebtEstimatedAnnualInterest = (debt = {}) => {
    const amount = Number(debt.amount) || 0;
    const rate = getPledgeAverageRate(debt);
    if (debt.category !== "stock_pledge" || amount <= 0 || rate <= 0) return 0;
    return amount * (rate / 100);
  };
  var getDebtEstimatedMonthlyInterest = (debt = {}) => getDebtEstimatedAnnualInterest(debt) / 12;
  var DEBT_CATEGORIES = [
    { value: "stock_pledge", label: "\u80A1\u7968\u8CEA\u62BC" },
    { value: "personal_loan", label: "\u4FE1\u7528\u8CB8\u6B3E" },
    { value: "mortgage", label: "\u623F\u8CB8" },
    { value: "car_loan", label: "\u8ECA\u8CB8" },
    { value: "credit_card", label: "\u4FE1\u7528\u5361" },
    { value: "installment", label: "\u5206\u671F\u4ED8\u6B3E" },
    { value: "family_loan", label: "\u89AA\u53CB\u501F\u6B3E" },
    { value: "other", label: "\u5176\u4ED6" }
  ];
  var getDebtCategoryLabel = (value) => DEBT_CATEGORIES.find((item) => item.value === value)?.label || value || "\u672A\u5206\u985E";
  var getDebtEventImpact = (event) => {
    if (event.type === "borrow") return Number(event.amount) || 0;
    if (event.type === "repay") return -(Number(event.amount) || 0);
    return 0;
  };
  var getDebtEventLabel = (type) => ({
    borrow: "\u501F\u6B3E",
    repay: "\u9084\u672C\u91D1",
    interest: "\u5229\u606F",
    fee: "\u624B\u7E8C\u8CBB",
    collateral: "\u64D4\u4FDD\u54C1",
    rate_change: "\u5229\u7387\u8ABF\u6574"
  })[type] || "\u7570\u52D5";
  var mergePledgeRateRows = (baseRows = [], eventRows = []) => {
    const rowMap = new Map((Array.isArray(baseRows) ? baseRows : []).map((row) => [String(row.symbol || "").trim(), { ...row }]));
    (Array.isArray(eventRows) ? eventRows : []).forEach((row) => {
      const symbol = String(row.symbol || "").trim();
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
  var getRateChangeEventsForDebt = (debt = {}, debtEvents = {}, targetDateStr = "") => {
    const targetDate = new Date(targetDateStr || "9999-12-31");
    const targetKey = getDebtTargetKey(debt);
    return Object.values(debtEvents || {}).flatMap((items) => items || []).filter((event) => {
      if (event.type !== "rate_change") return false;
      if (!event.date || new Date(event.date) > targetDate) return false;
      return event.targetDebtKey === targetKey || event.targetDebtId && debt.id && event.targetDebtId === debt.id || !event.targetDebtKey && event.name === debt.name && event.lender === debt.lender && (event.category || debt.category) === debt.category;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  var getEffectiveDebtAtDate = (debt = {}, debtEvents = {}, targetDateStr = "") => {
    if (debt.category !== "stock_pledge") return debt;
    const effectiveDebt = { ...debt, pledgeStocks: Array.isArray(debt.pledgeStocks) ? debt.pledgeStocks.map((row) => ({ ...row })) : [] };
    getRateChangeEventsForDebt(debt, debtEvents, targetDateStr).forEach((event) => {
      effectiveDebt.pledgeStocks = mergePledgeRateRows(effectiveDebt.pledgeStocks, event.pledgeStocks);
    });
    return effectiveDebt;
  };
  var getEffectiveDebtSnapshotAtDate = (debts = {}, debtEvents = {}, targetDateStr = "") => getLatestSnapshotItems(debts, targetDateStr).map((debt) => getEffectiveDebtAtDate(debt, debtEvents, targetDateStr));
  var getDebtEffectiveDate = (debt = {}, debts = {}) => {
    const debtKey = getDebtTargetKey(debt);
    const matchedDate = Object.entries(debts || {}).sort(([a], [b]) => a.localeCompare(b)).find(([, items]) => (items || []).some((item) => getDebtTargetKey(item) === debtKey));
    return matchedDate?.[0] || "";
  };
  var getMonthlyDebtInterestEstimate = (debt = {}, monthKey = "", debtEvents = {}, debts = {}) => {
    if (debt.category !== "stock_pledge" || !monthKey) return 0;
    const [year, month] = monthKey.split("-").map(Number);
    if (!year || !month) return 0;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const debtStartDateText = getDebtEffectiveDate(debt, debts);
    const debtStartDate = debtStartDateText ? new Date(debtStartDateText) : monthStart;
    let segmentStart = debtStartDate > monthStart ? new Date(debtStartDate) : new Date(monthStart);
    if (segmentStart > monthEnd) return 0;
    let runningDebt = getEffectiveDebtAtDate(debt, debtEvents, new Date(segmentStart.getTime() - 864e5).toISOString().slice(0, 10));
    let totalInterest = 0;
    const monthEvents = getRateChangeEventsForDebt(debt, debtEvents, monthEnd.toISOString().slice(0, 10)).filter((event) => new Date(event.date) >= segmentStart);
    monthEvents.forEach((event) => {
      const eventDate = new Date(event.date);
      const segmentEnd = new Date(eventDate.getTime() - 864e5);
      if (segmentEnd >= segmentStart) {
        const dayCount = Math.floor((segmentEnd - segmentStart) / 864e5) + 1;
        totalInterest += getDebtEstimatedAnnualInterest(runningDebt) * (dayCount / 365);
      }
      runningDebt = { ...runningDebt, pledgeStocks: mergePledgeRateRows(runningDebt.pledgeStocks, event.pledgeStocks) };
      segmentStart = eventDate;
    });
    if (segmentStart <= monthEnd) {
      const dayCount = Math.floor((monthEnd - segmentStart) / 864e5) + 1;
      totalInterest += getDebtEstimatedAnnualInterest(runningDebt) * (dayCount / 365);
    }
    return totalInterest;
  };

  // src/format.js
  var formatMoney = (val) => new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(val);
  var formatMoneyByMarket = (val, market = "TW") => new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: market === "US" ? 2 : 0,
    maximumFractionDigits: market === "US" ? 2 : 0
  }).format(val);
  var formatPriceUpToTwo = (val) => new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(val) || 0);
  var formatExchangeRate = (val) => new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 3 }).format(val);
  var formatWan = (val) => {
    if (Math.abs(val) < 1e4) return formatMoney(val);
    const wan = val / 1e4;
    return `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 1 }).format(wan)} \u842C`;
  };
  var formatRate = (val) => `${(val * 100).toFixed(1)}%`;
  var formatPercent = (value) => !isFinite(value) ? "0.0%" : `${Math.abs(value).toFixed(1)}%`;

  // src/csv.js
  var detectDelimitedTextSeparator = (text = "") => {
    const sample = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 5).join("\n");
    const tabCount = (sample.match(/\t/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    return tabCount > commaCount ? "	" : ",";
  };
  var parseCSV = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let insideQuote = false;
    const separator = detectDelimitedTextSeparator(text);
    const normalizedText = (separator === "," ? text.replace(/，/g, ",") : text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
      } else if (char === separator && !insideQuote) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\n" && !insideQuote) {
        currentRow.push(currentCell.trim());
        if (currentRow.length > 1 || currentRow.length === 1 && currentRow[0] !== "") {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
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
  var parseAmount = (value) => {
    if (value === void 0 || value === null) return 0;
    const normalized = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
    return Number(normalized) || 0;
  };
  var normalizeDate = (value) => {
    if (!value) return "";
    const parts = String(value).trim().replace(/\//g, "-").split("-");
    if (parts.length !== 3) return String(value).trim();
    const [year, month, day] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };
  var normalizeUSDate = (value) => {
    if (!value) return "";
    const parts = String(value).trim().replace(/\//g, "-").split("-");
    if (parts.length !== 3) return String(value).trim();
    const [month, day, year] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };
  var normalizeUSBrokerDate = (value, format = "auto") => {
    if (!value) return "";
    const parts = String(value).trim().replace(/\//g, "-").split("-");
    if (parts.length !== 3) return String(value).trim();
    const normalizedFormat = format === "ymd" || format === "mdy" ? format : "auto";
    const shouldUseYmd = normalizedFormat === "ymd" || normalizedFormat === "auto" && /^\d{4}$/.test(parts[0]);
    if (shouldUseYmd) {
      const [year2, month2, day2] = parts;
      return `${year2.padStart(4, "0")}-${month2.padStart(2, "0")}-${day2.padStart(2, "0")}`;
    }
    const [month, day, year] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  // src/stocks.js
  var getStockSymbolFromItem = (item = "") => {
    const normalized = item.trim();
    if (!normalized) return "";
    const dividendMatch = normalized.match(/(?:現金股息|股息)[-－](.+)$/);
    if (dividendMatch?.[1]) return dividendMatch[1].trim();
    return normalized;
  };
  var getStockTradeLabel = (type) => ({
    buy: "\u8CB7\u5165",
    sell: "\u8CE3\u51FA",
    dividend: "\u80A1\u606F",
    interest: "\u5229\u606F",
    deposit: "\u5165\u91D1",
    withdrawal: "\u51FA\u91D1",
    fee: "\u8CBB\u7528"
  })[type] || "\u5176\u4ED6";
  var normalizeTradeDescription = (value = "") => value.replace(/\s+/g, " ").trim();
  var getStockTradeTitle = (trade = {}) => {
    if (trade.symbol) return trade.symbol;
    if (trade.type === "interest") return "\u5229\u606F\u6536\u5165";
    if (trade.type === "deposit") return "\u532F\u6B3E\u5165\u91D1";
    if (trade.type === "withdrawal") return "\u532F\u6B3E\u51FA\u91D1";
    if (trade.type === "fee") return "\u624B\u7E8C\u8CBB";
    return normalizeTradeDescription(trade.name || trade.rawItem || getStockTradeLabel(trade.type));
  };
  var getStockTradeDescription = (trade = {}) => {
    const description = normalizeTradeDescription(trade.rawItem || trade.name || "");
    if (!description) return "";
    if (trade.symbol && description === trade.symbol) return "";
    if (!trade.symbol && description === getStockTradeTitle(trade)) return "";
    return description;
  };
  var createHoldingRow = (overrides = {}) => ({
    id: `holding-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    market: "TW",
    name: "",
    price: "",
    shares: "",
    ...overrides
  });
  var normalizeMonthValue = (value = "") => {
    const normalized = String(value).trim().replace(/\//g, "-");
    const match = normalized.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) return normalized;
    const [, year, month] = match;
    return `${year}-${month.padStart(2, "0")}`;
  };
  var normalizeSnapshotVersions = (versions) => {
    if (Array.isArray(versions)) return versions.filter(Boolean);
    if (versions && typeof versions === "object" && Array.isArray(versions.holdings)) return [versions];
    return [];
  };
  var STOCK_MARKETS = [
    { value: "TW", label: "\u53F0\u80A1" },
    { value: "US", label: "\u7F8E\u80A1" }
  ];
  var getStockMarketLabel = (market) => STOCK_MARKETS.find((item) => item.value === market)?.label || market || "\u5176\u4ED6";
  var isUSBrokerTransactionCSVHeaders = (headers) => ["\u65E5\u671F", "\u4EA4\u6613\u985E\u5225", "\u6578\u91CF", "\u8AAA\u660E", "\u4EE3\u865F", "\u50F9\u683C", "\u91D1\u984D"].every((header) => headers.includes(header));
  var looksLikeUSBrokerPastedRows = (rows = []) => rows.some((row) => /^(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})$/.test((row?.[0] || "").trim()) && (row?.[1] || "").trim());
  var getUSBrokerTradeType = (typeText = "", amount = 0, description = "") => {
    const normalized = typeText.trim().toLowerCase();
    const normalizedDescription = description.trim().toLowerCase();
    if (["\u8CB7\u9032", "\u8CB7\u5165", "buy"].some((keyword) => normalized.includes(keyword))) return "buy";
    if (["\u8CE3\u51FA", "sell"].some((keyword) => normalized.includes(keyword))) return "sell";
    if (["\u73FE\u91D1\u80A1\u606F", "\u80A1\u606F", "\u914D\u606F", "dividend"].some((keyword) => normalized.includes(keyword))) return "dividend";
    if (["\u5229\u606F", "interest"].some((keyword) => normalized.includes(keyword))) return "interest";
    if (["\u532F\u6B3E", "\u5165\u91D1", "\u5B58\u5165", "\u5B58\u6B3E", "\u8F49\u5165", "ach deposit", "deposit"].some((keyword) => normalized.includes(keyword))) return "deposit";
    if (["\u51FA\u91D1", "\u8F49\u51FA", "withdrawal"].some((keyword) => normalized.includes(keyword))) return "withdrawal";
    if (["\u624B\u7E8C\u8CBB", "\u8CBB\u7528", "fee"].some((keyword) => normalized.includes(keyword))) return "fee";
    if (normalizedDescription.includes("wire funds received") || normalizedDescription.includes("rebate for wire")) return "deposit";
    if (normalized.includes("cash") && amount > 0) return "deposit";
    if (normalized.includes("cash") && amount < 0) return "withdrawal";
    return "other";
  };
  var processUSBrokerTransactionRows = (rows, fieldMap, options = {}) => {
    const {
      idxDate,
      idxType,
      idxQuantity,
      idxDescription,
      idxSymbol,
      idxAccount,
      idxPrice,
      idxAmount
    } = fieldMap;
    const rowNumberOffset = options.rowNumberOffset ?? 1;
    const usDateFormat = options.usDateFormat || "auto";
    const transactions = [];
    const skippedRows = [];
    rows.forEach((row, index) => {
      const csvRow = index + rowNumberOffset;
      const date = normalizeUSBrokerDate(row[idxDate], usDateFormat);
      const typeText = row[idxType]?.trim() || "";
      const symbol = row[idxSymbol]?.trim() || "";
      const description = row[idxDescription]?.trim() || symbol || typeText;
      const amountRaw = parseAmount(row[idxAmount]);
      const tradeType = getUSBrokerTradeType(typeText, amountRaw, description);
      const amount = Math.abs(amountRaw);
      const shares = Math.abs(parseAmount(row[idxQuantity]));
      const price = Math.abs(parseAmount(row[idxPrice]));
      if (!date || !typeText) {
        skippedRows.push({ row: csvRow, type: typeText || "\u7A7A\u767D", item: symbol || description || "\u7A7A\u767D", reason: "\u7F3A\u5C11\u65E5\u671F\u6216\u4EA4\u6613\u985E\u5225" });
        return;
      }
      if (tradeType === "other") {
        skippedRows.push({ row: csvRow, type: typeText || "\u7A7A\u767D", item: symbol || description || "\u7A7A\u767D", reason: "\u5C1A\u672A\u652F\u63F4\u7684\u7F8E\u80A1\u4EA4\u6613\u985E\u578B" });
        return;
      }
      if (!amount && !["buy", "sell"].includes(tradeType)) {
        skippedRows.push({ row: csvRow, type: typeText || "\u7A7A\u767D", item: symbol || description || "\u7A7A\u767D", reason: "\u91D1\u984D\u70BA 0" });
        return;
      }
      if (["buy", "sell", "dividend"].includes(tradeType) && !symbol) {
        skippedRows.push({ row: csvRow, type: typeText || "\u7A7A\u767D", item: description || "\u7A7A\u767D", reason: "\u7F3A\u5C11\u80A1\u7968\u4EE3\u865F" });
        return;
      }
      transactions.push({
        id: `stock-us-broker-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        source: "csv-us-broker-transactions",
        market: "US",
        currency: "USD",
        date,
        type: tradeType,
        symbol: ["buy", "sell", "dividend"].includes(tradeType) ? symbol : "",
        name: description.split(/\r?\n/)[0]?.replace(/^\*+/, "").trim() || symbol || typeText,
        rawItem: description,
        amount,
        signedAmount: amountRaw,
        shares,
        price,
        balance: 0,
        account: idxAccount >= 0 ? row[idxAccount]?.trim() || "" : "",
        unassigned: tradeType === "dividend" && !symbol,
        memo: typeText
      });
    });
    return { market: "US", importMode: "us-broker-transactions", transactions, skippedRows };
  };
  var processUSBrokerTransactionCSVRows = (rows, headers, options = {}) => processUSBrokerTransactionRows(rows.slice(1), {
    idxDate: headers.indexOf("\u65E5\u671F"),
    idxType: headers.indexOf("\u4EA4\u6613\u985E\u5225"),
    idxQuantity: headers.indexOf("\u6578\u91CF"),
    idxDescription: headers.indexOf("\u8AAA\u660E"),
    idxSymbol: headers.indexOf("\u4EE3\u865F"),
    idxAccount: headers.indexOf("\u8CEC\u6236\u985E\u5225"),
    idxPrice: headers.indexOf("\u50F9\u683C"),
    idxAmount: headers.indexOf("\u91D1\u984D")
  }, { rowNumberOffset: 2, usDateFormat: options.usDateFormat });
  var processUSBrokerTransactionPastedRows = (rows, options = {}) => processUSBrokerTransactionRows(rows, {
    idxDate: 0,
    idxType: 1,
    idxQuantity: 2,
    idxDescription: 3,
    idxSymbol: 4,
    idxAccount: 5,
    idxPrice: 6,
    idxAmount: 7
  }, { rowNumberOffset: 1, usDateFormat: options.usDateFormat });
  var isArchivedUSRealizedCSVHeaders = (headers) => headers.includes("\u4EE3\u865F") && headers.includes("\u8ABF\u6574\u5F8C\u6210\u672C") && headers.includes("\u8CE3\u51FA\u6536\u5165");
  var processArchivedUSRealizedCSVRows = (rows, headers, options = {}) => {
    const idxSymbol = headers.indexOf("\u4EE3\u865F");
    const idxName = headers.indexOf("\u8A73\u7D30\u8CC7\u8A0A");
    const idxQuantity = headers.indexOf("\u6578\u91CF");
    const idxOpenDate = headers.indexOf("\u958B\u5009\u65E5\u671F");
    const idxCloseDate = headers.indexOf("\u5E73\u5009\u65E5\u671F");
    const idxProceeds = headers.indexOf("\u8CE3\u51FA\u6536\u5165");
    const idxCost = headers.indexOf("\u8ABF\u6574\u5F8C\u6210\u672C");
    const idxWashSaleLoss = headers.indexOf("WS Loss Disallowed");
    if ([idxSymbol, idxOpenDate, idxCloseDate, idxProceeds, idxCost].some((idx) => idx === -1)) {
      throw new Error("\u7F8E\u80A1\u5DF2\u5E73\u5009\u640D\u76CA v1 \u683C\u5F0F\u4E0D\u7B26\uFF0C\u627E\u4E0D\u5230\u4EE3\u865F\u3001\u958B\u5009/\u5E73\u5009\u65E5\u671F\u3001\u8CE3\u51FA\u6536\u5165\u6216\u8ABF\u6574\u5F8C\u6210\u672C\u6B04\u4F4D");
    }
    const transactions = [];
    const skippedRows = [];
    rows.slice(1).forEach((row, index) => {
      const symbol = row[idxSymbol]?.trim() || "";
      const name = idxName >= 0 ? row[idxName]?.trim() || symbol : symbol;
      const quantity = idxQuantity >= 0 ? parseAmount(row[idxQuantity]) : 0;
      const openDate = normalizeUSBrokerDate(row[idxOpenDate], options.usDateFormat);
      const closeDate = normalizeUSBrokerDate(row[idxCloseDate], options.usDateFormat);
      const proceeds = parseAmount(row[idxProceeds]);
      const cost = parseAmount(row[idxCost]);
      const washSaleLoss = idxWashSaleLoss >= 0 ? parseAmount(row[idxWashSaleLoss]) : 0;
      const sellAmount = proceeds + washSaleLoss;
      const csvRow = index + 2;
      if (!symbol || !openDate || !closeDate) {
        skippedRows.push({ row: csvRow, type: "\u7F8E\u80A1", item: symbol || name || "\u7A7A\u767D", reason: "\u7F3A\u5C11\u4EE3\u865F\u6216\u65E5\u671F" });
        return;
      }
      if (cost <= 0 && sellAmount <= 0) {
        skippedRows.push({ row: csvRow, type: "\u7F8E\u80A1", item: symbol, reason: "\u6210\u672C\u8207\u8CE3\u51FA\u6536\u5165\u7686\u70BA 0" });
        return;
      }
      if (cost > 0) {
        transactions.push({
          id: `stock-us-buy-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          source: "csv-us-realized",
          market: "US",
          currency: "USD",
          date: openDate,
          type: "buy",
          symbol,
          name,
          rawItem: symbol,
          amount: cost,
          shares: quantity,
          balance: 0,
          memo: "\u5C01\u5B58 v1 \u7F8E\u80A1\u5E73\u5009\u640D\u76CA\u532F\u5165\uFF1A\u8ABF\u6574\u5F8C\u6210\u672C"
        });
      }
      if (sellAmount > 0) {
        transactions.push({
          id: `stock-us-sell-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          source: "csv-us-realized",
          market: "US",
          currency: "USD",
          date: closeDate,
          type: "sell",
          symbol,
          name,
          rawItem: symbol,
          amount: sellAmount,
          shares: quantity,
          balance: 0,
          memo: washSaleLoss ? "\u5C01\u5B58 v1 \u7F8E\u80A1\u5E73\u5009\u640D\u76CA\u532F\u5165\uFF1A\u8CE3\u51FA\u6536\u5165 + WS Loss Disallowed" : "\u5C01\u5B58 v1 \u7F8E\u80A1\u5E73\u5009\u640D\u76CA\u532F\u5165\uFF1A\u8CE3\u51FA\u6536\u5165"
        });
      }
    });
    return { market: "US", importMode: "archived-us-realized", isArchived: true, transactions, skippedRows };
  };
  var processStockCSVText = (csvText, options = {}) => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) throw new Error("CSV \u6A94\u6848\u662F\u7A7A\u7684");
    const headers = rows[0].map((header) => header.trim());
    if (isUSBrokerTransactionCSVHeaders(headers)) {
      return processUSBrokerTransactionCSVRows(rows, headers, options);
    }
    if (looksLikeUSBrokerPastedRows(rows)) {
      return processUSBrokerTransactionPastedRows(rows, options);
    }
    if (isArchivedUSRealizedCSVHeaders(headers)) {
      if (!options.allowArchivedUSRealized) {
        throw new Error("\u7F8E\u80A1\u5DF2\u5E73\u5009\u640D\u76CA v1 \u532F\u5165\u683C\u5F0F\u5DF2\u5C01\u5B58\u3002\u65B0\u7684\u7F8E\u80A1\u532F\u5165\u6703\u6539\u8D70\u5B8C\u6574\u5238\u5546\u4EA4\u6613\u660E\u7D30\uFF1B\u82E5\u53EA\u662F\u8981\u88DC\u6551\u820A\u8CC7\u6599\uFF0C\u8ACB\u4F7F\u7528\u4E0B\u65B9\u300C\u5C01\u5B58 v1 \u683C\u5F0F\u9810\u89BD\u300D\u3002");
      }
      return processArchivedUSRealizedCSVRows(rows, headers, options);
    }
    const hasTWHeaders = headers.includes("\u65E5\u671F") && headers.includes("\u9805\u76EE");
    const idxType = hasTWHeaders ? headers.indexOf("\u985E\u578B") : 0;
    const idxDate = hasTWHeaders ? headers.indexOf("\u65E5\u671F") : 1;
    const idxItem = hasTWHeaders ? headers.indexOf("\u9805\u76EE") : 2;
    const idxBuy = hasTWHeaders ? headers.indexOf("\u80A1\u7968\u8CB7\u5165") : 3;
    const idxDeposit = hasTWHeaders ? headers.indexOf("\u5B58\u5165\u6236\u982D") : 4;
    const idxBalance = hasTWHeaders ? headers.indexOf("\u5E33\u9762\u9918\u984D") : 5;
    if (idxDate === -1 || idxItem === -1) throw new Error("CSV \u683C\u5F0F\u4E0D\u7B26\uFF0C\u627E\u4E0D\u5230\u65E5\u671F\u6216\u9805\u76EE\u6B04\u4F4D");
    const dataRows = hasTWHeaders ? rows.slice(1) : rows;
    if (!hasTWHeaders) {
      const looksLikePasteFormat = dataRows.some((row) => normalizeDate(row[idxDate]) && row[idxItem]?.trim());
      if (!looksLikePasteFormat) throw new Error("CSV \u683C\u5F0F\u4E0D\u7B26\uFF0C\u627E\u4E0D\u5230\u65E5\u671F\u6216\u9805\u76EE\u6B04\u4F4D");
    }
    const transactions = [];
    const skippedRows = [];
    dataRows.forEach((row, index) => {
      const typeText = idxType >= 0 ? row[idxType]?.trim() : "";
      const date = normalizeDate(row[idxDate]);
      const item = row[idxItem]?.trim() || "";
      const buyAmount = idxBuy >= 0 ? parseAmount(row[idxBuy]) : 0;
      const depositAmount = idxDeposit >= 0 ? parseAmount(row[idxDeposit]) : 0;
      const balance = idxBalance >= 0 ? parseAmount(row[idxBalance]) : 0;
      const normalizedType = typeText.replace(/\s+/g, "");
      const actualRowNumber = index + 1 + (hasTWHeaders ? 1 : 0);
      if (!date || !item) {
        skippedRows.push({ row: actualRowNumber, type: typeText || "\u7A7A\u767D", item: item || "\u7A7A\u767D", reason: "\u7F3A\u5C11\u65E5\u671F\u6216\u9805\u76EE" });
        return;
      }
      if (normalizedType.includes("\u8CEA\u62BC")) {
        skippedRows.push({ row: actualRowNumber, type: typeText || "\u7A7A\u767D", item, reason: "\u8CEA\u62BC\u501F\u6B3E\u5DF2\u7531\u8CA0\u50B5\u6A21\u7D44\u8FFD\u8E64\uFF0C\u532F\u5165\u80A1\u7968\u7E3E\u6548\u6642\u6703\u81EA\u52D5\u7565\u904E" });
        return;
      }
      let tradeType = "other";
      let amount = 0;
      let symbol = getStockSymbolFromItem(item);
      const isDividendRow = typeText.includes("\u80A1\u606F") || /^現金股息/.test(item) || /^股息[-－]/.test(item);
      if (typeText.includes("\u532F\u6B3E")) {
        tradeType = depositAmount > 0 ? "deposit" : "withdrawal";
        amount = depositAmount || buyAmount;
        symbol = "";
      } else if (isDividendRow) {
        tradeType = "dividend";
        amount = depositAmount;
        symbol = getStockSymbolFromItem(item);
        if (symbol === "\u73FE\u91D1\u80A1\u606F" || symbol === "\u80A1\u606F") symbol = "";
      } else if (buyAmount > 0) {
        tradeType = "buy";
        amount = buyAmount;
      } else if (depositAmount > 0) {
        tradeType = "sell";
        amount = depositAmount;
      }
      if (!amount && tradeType !== "other") {
        skippedRows.push({ row: actualRowNumber, type: typeText || "\u7A7A\u767D", item, reason: "\u91D1\u984D\u70BA 0" });
        return;
      }
      if (tradeType === "other") {
        skippedRows.push({ row: actualRowNumber, type: typeText || "\u7A7A\u767D", item, reason: "\u5C1A\u672A\u652F\u63F4\u7684\u4EA4\u6613\u985E\u578B" });
        return;
      }
      transactions.push({
        id: `stock-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        source: "csv",
        market: "TW",
        currency: "TWD",
        date,
        type: tradeType,
        symbol,
        name: symbol || item,
        rawItem: item,
        amount,
        balance,
        unassigned: !symbol && tradeType === "dividend",
        memo: !symbol && tradeType === "dividend" ? "\u672A\u6307\u5B9A\u80A1\u7968\u7684\u73FE\u91D1\u80A1\u606F" : typeText || ""
      });
    });
    return { market: "TW", transactions, skippedRows };
  };
  var getHeaderIndex = (headers, candidates) => candidates.map((name) => headers.indexOf(name)).find((idx) => idx >= 0) ?? -1;
  var processStockHoldingCSVText = (csvText, fallbackMonth, note = "") => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) throw new Error("CSV \u6A94\u6848\u662F\u7A7A\u7684");
    const headers = rows[0].map((header) => header.trim());
    const hasHeader = headers.some((header) => ["\u80A1\u7968\u540D\u7A31", "\u540D\u7A31", "\u9805\u76EE", "\u73FE\u50F9", "\u80A1\u6578", "\u76EE\u524D\u5E02\u503C"].includes(header));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const idxMonth = getHeaderIndex(headers, ["\u6708\u4EFD", "\u5E74\u6708", "month"]);
    const idxMarket = getHeaderIndex(headers, ["\u5E02\u5834", "market"]);
    const idxSymbol = getHeaderIndex(headers, ["\u80A1\u7968\u4EE3\u865F", "\u4EE3\u865F", "symbol"]);
    const idxName = hasHeader ? getHeaderIndex(headers, ["\u80A1\u7968\u540D\u7A31", "\u540D\u7A31", "\u9805\u76EE", "name"]) : 0;
    const idxShares = hasHeader ? getHeaderIndex(headers, ["\u80A1\u6578", "\u5EAB\u5B58\u80A1\u6578", "\u5F35\u6578", "shares"]) : 2;
    const idxAvgCost = getHeaderIndex(headers, ["\u5E73\u5747\u6210\u672C", "avgCost", "averageCost"]);
    const idxCostAmount = getHeaderIndex(headers, ["\u6210\u672C\u7E3D\u984D", "\u6301\u6709\u6210\u672C", "\u6210\u672C", "costAmount"]);
    const idxMarketPrice = hasHeader ? getHeaderIndex(headers, ["\u73FE\u50F9", "\u76EE\u524D\u80A1\u50F9", "\u5E02\u50F9", "marketPrice"]) : 1;
    const idxMarketValue = getHeaderIndex(headers, ["\u76EE\u524D\u5E02\u503C", "\u5E02\u503C", "marketValue"]);
    const idxAccount = getHeaderIndex(headers, ["\u5E33\u6236", "\u5238\u5546", "account"]);
    if (idxName === -1 && idxSymbol === -1) throw new Error("CSV \u683C\u5F0F\u4E0D\u7B26\uFF0C\u627E\u4E0D\u5230\u80A1\u7968\u540D\u7A31\u6216\u80A1\u7968\u4EE3\u865F\u6B04\u4F4D");
    if (idxMarketPrice === -1 && idxMarketValue === -1) throw new Error("CSV \u683C\u5F0F\u4E0D\u7B26\uFF0C\u8ACB\u63D0\u4F9B\u73FE\u50F9\u6216\u76EE\u524D\u5E02\u503C\u6B04\u4F4D");
    if (idxShares === -1 && idxMarketValue === -1) throw new Error("CSV \u683C\u5F0F\u4E0D\u7B26\uFF0C\u8ACB\u63D0\u4F9B\u80A1\u6578\u6B04\u4F4D\uFF0C\u6216\u76F4\u63A5\u63D0\u4F9B\u76EE\u524D\u5E02\u503C");
    if (!fallbackMonth && idxMonth === -1) throw new Error("\u8ACB\u9078\u64C7\u6708\u4EFD");
    const holdings = [];
    const skippedRows = [];
    let snapshotMonth = idxMonth >= 0 && hasHeader ? "" : fallbackMonth || "";
    dataRows.forEach((row, index) => {
      const csvRowNumber = index + (hasHeader ? 2 : 1);
      const rowMonth = idxMonth >= 0 && hasHeader ? normalizeDate(`${row[idxMonth]}-01`).substring(0, 7) : fallbackMonth;
      const market = idxMarket >= 0 ? row[idxMarket]?.trim() || "TW" : "TW";
      const symbol = idxSymbol >= 0 ? row[idxSymbol]?.trim() || "" : "";
      const name = idxName >= 0 ? row[idxName]?.trim() || symbol : symbol;
      const shares = idxShares >= 0 ? parseAmount(row[idxShares]) : 0;
      const averageCost = idxAvgCost >= 0 ? parseAmount(row[idxAvgCost]) : 0;
      const costAmount = idxCostAmount >= 0 ? parseAmount(row[idxCostAmount]) : shares && averageCost ? shares * averageCost : 0;
      const marketPrice = idxMarketPrice >= 0 ? parseAmount(row[idxMarketPrice]) : 0;
      const marketValue = idxMarketValue >= 0 ? parseAmount(row[idxMarketValue]) : shares && marketPrice ? shares * marketPrice : 0;
      const account = idxAccount >= 0 ? row[idxAccount]?.trim() || "" : "";
      if (!rowMonth || !name && !symbol) {
        skippedRows.push({ row: csvRowNumber, item: name || symbol || "\u7A7A\u767D", reason: "\u7F3A\u5C11\u6708\u4EFD\u6216\u80A1\u7968\u540D\u7A31" });
        return;
      }
      if (marketValue <= 0) {
        skippedRows.push({ row: csvRowNumber, item: name || symbol, reason: "\u76EE\u524D\u5E02\u503C\u70BA 0\uFF0C\u8ACB\u78BA\u8A8D\u73FE\u50F9\u8207\u80A1\u6578" });
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

  // src/expenses.js
  var processExpenseCSVText = (csvText, onSuccess, onError) => {
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) throw new Error("CSV \u6A94\u6848\u662F\u7A7A\u7684");
      const headers = rows[0];
      const idxDate = headers.indexOf("\u65E5\u671F");
      const idxAccount = headers.indexOf("\u5E33\u6236");
      const idxName = headers.indexOf("\u540D\u7A31");
      const idxAmount = headers.indexOf("\u91D1\u984D");
      const idxMainCat = headers.indexOf("\u4E3B\u985E\u5225");
      const idxSubCat = headers.indexOf("\u5B50\u985E\u5225");
      const idxType = headers.indexOf("\u985E\u578B");
      const idxCurrency = headers.indexOf("\u5E63\u7A2E");
      if (idxDate === -1 || idxAmount === -1) throw new Error("CSV \u683C\u5F0F\u4E0D\u7B26\uFF0C\u627E\u4E0D\u5230\u65E5\u671F\u6216\u91D1\u984D\u6B04\u4F4D");
      const expensesByMonth = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length) continue;
        const dateStr = row[idxDate];
        const dateParts = dateStr.split("/");
        if (dateParts.length !== 3) continue;
        const y = dateParts[0];
        const m = dateParts[1].padStart(2, "0");
        const d = dateParts[2].padStart(2, "0");
        const isoDate = `${y}-${m}-${d}`;
        const monthKey = `${y}-${m}`;
        let amountStr = row[idxAmount];
        amountStr = amountStr.replace(/,/g, "");
        let rawAmount = parseFloat(amountStr);
        if (isNaN(rawAmount)) continue;
        if (idxType !== -1) {
          if (row[idxType] === "\u652F\u51FA") {
            rawAmount = Math.abs(rawAmount);
          } else {
            rawAmount = -Math.abs(rawAmount);
          }
        } else {
          rawAmount = Math.abs(rawAmount);
        }
        const currencyCode = idxCurrency !== -1 ? row[idxCurrency] : "TWD";
        const rate = DEFAULT_EXCHANGE_RATES[currencyCode] || 1;
        const twdAmount = Math.round(rawAmount * rate);
        if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = [];
        expensesByMonth[monthKey].push({
          date: isoDate,
          account: idxAccount !== -1 ? row[idxAccount] : "Unknown",
          category: idxMainCat !== -1 ? row[idxMainCat] : "",
          subCategory: idxSubCat !== -1 ? row[idxSubCat] : "",
          name: idxName !== -1 ? row[idxName] : "",
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
  var getExpenseIdentityKey = (item) => [
    item.date || "",
    item.account || "",
    item.category || "",
    item.subCategory || "",
    item.name || "",
    item.currency || "TWD"
  ].join("|");
  var getExpenseFullKey = (item) => [
    getExpenseIdentityKey(item),
    Number(item.amount) || 0
  ].join("|");
  var buildExpenseDiff = (oldItems = [], newItems = []) => {
    const oldFullCount = /* @__PURE__ */ new Map();
    const newFullCount = /* @__PURE__ */ new Map();
    const oldIdentityMap = /* @__PURE__ */ new Map();
    const newIdentityMap = /* @__PURE__ */ new Map();
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
    const unchangedByFullKey = /* @__PURE__ */ new Map();
    const allFullKeys = /* @__PURE__ */ new Set([...oldFullCount.keys(), ...newFullCount.keys()]);
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
    const removedByIdentity = /* @__PURE__ */ new Map();
    const addedByIdentity = /* @__PURE__ */ new Map();
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
    const allIdentityKeys = /* @__PURE__ */ new Set([...removedByIdentity.keys(), ...addedByIdentity.keys()]);
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
  var getExpenseImportSummary = (currentExpenses = {}, pendingExpenses = {}) => {
    const months = Object.keys(pendingExpenses).sort();
    const changedMonths = months.map((month) => {
      const oldItems = currentExpenses?.[month] || [];
      const newItems = pendingExpenses?.[month] || [];
      const diff = buildExpenseDiff(oldItems, newItems);
      return diff.hasChanges ? {
        month,
        oldItems,
        newItems,
        diff
      } : null;
    }).filter(Boolean);
    return {
      monthsCount: changedMonths.length,
      totalRecords: Object.values(pendingExpenses).flat().length,
      months: changedMonths.map((entry) => entry.month),
      changedMonths
    };
  };

  // src/diff.js
  var getSortedValue = (value) => {
    if (Array.isArray(value)) {
      return value.map(getSortedValue);
    }
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = getSortedValue(value[key]);
        return result;
      }, {});
    }
    return value;
  };
  var areDataStructuresEqual = (a, b) => JSON.stringify(getSortedValue(a)) === JSON.stringify(getSortedValue(b));
  var buildCollectionDiff = (oldItems = [], newItems = [], getIdentityKey, getFullKey) => {
    const oldFullCount = /* @__PURE__ */ new Map();
    const newFullCount = /* @__PURE__ */ new Map();
    oldItems.forEach((item) => {
      const key = getFullKey(item);
      oldFullCount.set(key, (oldFullCount.get(key) || 0) + 1);
    });
    newItems.forEach((item) => {
      const key = getFullKey(item);
      newFullCount.set(key, (newFullCount.get(key) || 0) + 1);
    });
    const unchangedByFullKey = /* @__PURE__ */ new Map();
    const allFullKeys = /* @__PURE__ */ new Set([...oldFullCount.keys(), ...newFullCount.keys()]);
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
    const oldByIdentity = /* @__PURE__ */ new Map();
    const newByIdentity = /* @__PURE__ */ new Map();
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
    const allIdentityKeys = /* @__PURE__ */ new Set([...oldByIdentity.keys(), ...newByIdentity.keys()]);
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
  var flattenRecords = (records = {}) => Object.entries(records).flatMap(
    ([date, items]) => (items || []).map((item) => ({ ...item, date }))
  );
  var flattenIncomeSources = (incomes = {}) => Object.entries(incomes).flatMap(
    ([month, value]) => (value?.sources || []).map((source) => ({ ...source, month, date: source.date || month }))
  );
  var flattenMemos = (memos = {}) => Object.entries(memos).map(([date, content]) => ({ date, content: content || "" }));
  var flattenDebts = (debts = {}) => Object.entries(debts).flatMap(
    ([date, items]) => (items || []).map((item) => ({ ...item, date }))
  );
  var flattenDebtEvents = (debtEvents = {}) => Object.entries(debtEvents).flatMap(
    ([month, items]) => (items || []).map((item) => ({ ...item, month }))
  );
  var flattenStockHoldingSnapshots = (snapshots = {}) => Object.entries(snapshots).flatMap(
    ([month, versions]) => (versions || []).map((snapshot) => ({ ...snapshot, month }))
  );
  var getRecordIdentityKey = (item) => [item.date || "", item.type || "", item.name || "", item.currency || "TWD"].join("|");
  var getRecordFullKey = (item) => [getRecordIdentityKey(item), Number(item.amount) || 0, Number(item.originalAmount) || 0, Number(item.exchangeRate) || 0].join("|");
  var getIncomeIdentityKey = (item) => [item.month || "", item.company || "", item.bank || "", item.currency || "TWD", item.memo || ""].join("|");
  var getIncomeFullKey = (item) => [getIncomeIdentityKey(item), item.date || "", Number(item.amount) || 0, Number(item.originalAmount) || 0, Number(item.exchangeRate) || 0].join("|");
  var getMemoIdentityKey = (item) => item.date || "";
  var getMemoFullKey = (item) => [item.date || "", item.content || ""].join("|");
  var getDebtIdentityKey = (item) => [item.date || "", item.name || "", item.lender || ""].join("|");
  var getDebtFullKey = (item) => [getDebtIdentityKey(item), Number(item.amount) || 0, item.memo || ""].join("|");
  var getDebtEventIdentityKey = (item) => [item.month || "", item.date || "", item.type || "", item.name || "", item.lender || "", item.memo || ""].join("|");
  var getDebtEventFullKey = (item) => [getDebtEventIdentityKey(item), Number(item.amount) || 0, JSON.stringify(getSortedValue(item.collateral || []))].join("|");
  var getStockTransactionIdentityKey = (item) => item.id || [item.market || "TW", item.date || "", item.type || "", item.symbol || "", item.name || ""].join("|");
  var getStockTransactionFullKey = (item) => [getStockTransactionIdentityKey(item), JSON.stringify(getSortedValue(item))].join("|");
  var getStockSnapshotIdentityKey = (item) => item.id || [item.month || "", Number(item.version) || 0, item.importedAt || ""].join("|");
  var getStockSnapshotFullKey = (item) => [getStockSnapshotIdentityKey(item), JSON.stringify(getSortedValue(item))].join("|");
  var getJsonImportSummary = (currentData = {}, parsedData = {}) => {
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

  // src/dashboard.js
  var sumAmounts = (items) => (items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  var getAvailableYears = (data, thisYear) => {
    const years = /* @__PURE__ */ new Set();
    Object.keys(data.records || {}).forEach((d) => years.add(new Date(d).getFullYear()));
    Object.keys(data.incomes || {}).forEach((d) => years.add(parseInt(d.split("-")[0])));
    Object.keys(data.memos || {}).forEach((d) => years.add(new Date(d).getFullYear()));
    Object.keys(data.expenses || {}).forEach((d) => years.add(parseInt(d.split("-")[0])));
    Object.keys(data.debts || {}).forEach((d) => years.add(new Date(d).getFullYear()));
    Object.keys(data.debtEvents || {}).forEach((d) => years.add(parseInt(d.split("-")[0])));
    return Array.from(years).filter((y) => y <= thisYear).sort((a, b) => b - a);
  };
  var getYearEndAssets = (year, data) => getLatestSnapshotTotal(data.records, `${year}-12-31`, (assets) => sumAmounts(assets));
  var getYearEndDebt = (year, data) => getLatestSnapshotTotal(data.debts, `${year}-12-31`, (debts) => getDebtTotal(debts));
  var getAssetRecordDatesInYear = (year, data) => Object.entries(data.records || {}).filter(([dateStr, assets]) => new Date(dateStr).getFullYear() === year && Array.isArray(assets) && assets.length > 0).map(([dateStr]) => dateStr).sort();
  var getNetAssetsAtDate = (dateStr, data) => {
    const grossAssets = (data.records?.[dateStr] || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const debts = getLatestSnapshotTotal(data.debts, dateStr, (items) => getDebtTotal(items));
    return grossAssets - debts;
  };
  var getYearAssetGrowthRange = (year, data) => {
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
  var getYearTotalIncome = (year, data) => {
    let total = 0;
    Object.entries(data.incomes || {}).forEach(([dateStr, incomeData]) => {
      const y = parseInt(dateStr.split("-")[0]);
      if (y === year) total += incomeData.totalAmount || 0;
    });
    return total;
  };
  var getYearlyTrendData = (data, availableYears) => {
    const totalAllTimeIncome = Object.values(data.incomes || {}).reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    return availableYears.map((year) => {
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
  var getMonthlyStats = (data, year) => {
    const monthlyStats = Array(12).fill(0).map((_, i) => ({ month: i + 1, assets: 0, grossAssets: 0, debts: 0, income: 0, cost: 0, balance: 0, memo: null, hasRecord: false, latestDate: null, allRecords: [], analysis: { incomeDiff: 0, assetDiff: 0, compositeScore: 0 } }));
    const monthRecordsMap = /* @__PURE__ */ new Map();
    const monthDebtMap = /* @__PURE__ */ new Map();
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
      const monthEndKey = `${year}-${String(i + 1).padStart(2, "0")}-${String(monthEndDay).padStart(2, "0")}`;
      monthlyStats[i].debts = getLatestSnapshotTotal(data.debts, monthEndKey, (debts) => getDebtTotal(debts));
      monthlyStats[i].assets = monthlyStats[i].grossAssets - monthlyStats[i].debts;
      monthlyStats[i].allRecords = monthlyStats[i].allRecords.map((record) => ({
        ...record,
        assets: record.assets - getLatestSnapshotTotal(data.debts, record.dateStr, (debts) => getDebtTotal(debts))
      }));
    }
    Object.entries(data.incomes || {}).forEach(([dateStr, incomeData]) => {
      const [yearStr, monthStr] = dateStr.split("-");
      if (parseInt(yearStr) === year) {
        const monthIdx = parseInt(monthStr) - 1;
        monthlyStats[monthIdx].income = incomeData.totalAmount || 0;
        if (!monthlyStats[monthIdx].latestDate) monthlyStats[monthIdx].latestDate = `${dateStr}-01`;
      }
    });
    Object.keys(data.expenses || {}).forEach((monthStr) => {
      const [yStr, mStr] = monthStr.split("-");
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
    const prevYearDecKey = `${year - 1}-12`;
    let prevIncome = (data.incomes || {})[prevYearDecKey]?.totalAmount || 0;
    let prevAsset = getYearEndAssets(year - 1, data) - getYearEndDebt(year - 1, data);
    for (let i = 0; i < 12; i++) {
      const currentAsset = monthlyStats[i].assets;
      const currentIncome = monthlyStats[i].income;
      const cost = monthlyStats[i].cost || 0;
      const hasAssetRecord = monthlyStats[i].hasRecord;
      monthlyStats[i].balance = hasAssetRecord ? currentAsset - prevAsset - cost : -cost;
      const incomeDiff = currentIncome - prevIncome;
      const assetDiff = hasAssetRecord ? currentAsset - prevAsset : 0;
      const compositeScore = incomeDiff + assetDiff;
      monthlyStats[i].analysis = { incomeDiff, assetDiff, compositeScore };
      if (hasAssetRecord) prevAsset = currentAsset;
      prevIncome = currentIncome;
    }
    return monthlyStats;
  };
  var getAssetExtremes = (monthlyStats) => {
    let allPoints = [];
    monthlyStats.forEach((m) => {
      if (m.hasRecord) allPoints = [...allPoints, ...m.allRecords.map((r) => ({ val: r.assets, month: m.month }))];
    });
    if (allPoints.length === 0) return { max: { val: 0, month: 0 }, min: { val: 0, month: 0 } };
    const max = allPoints.reduce((prev, current) => prev.val > current.val ? prev : current);
    const min = allPoints.reduce((prev, current) => prev.val < current.val ? prev : current);
    return { max, min };
  };
  var getYearStats = (data, year) => {
    const thisYearIncome = getYearTotalIncome(year, data);
    const lastYearIncome = getYearTotalIncome(year - 1, data);
    const avgIncome = thisYearIncome / 12;
    const assetGrowthRate = lastYearIncome > 0 ? thisYearIncome / lastYearIncome : 0;
    const totalAccumulatedIncome = Object.values(data.incomes || {}).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const incomeGrowthRate = totalAccumulatedIncome > 0 ? thisYearIncome / totalAccumulatedIncome : 0;
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
  var getFireStats = (data) => {
    const rate = data.fireSettings?.withdrawalRate || 4;
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
  var getFireYearlyStats = (expenses = {}) => {
    const stats = {};
    Object.entries(expenses || {}).forEach(([monthStr, items]) => {
      const year = parseInt(monthStr.split("-")[0]);
      const month = parseInt(monthStr.split("-")[1]);
      const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);
      if (!stats[year]) stats[year] = { total: 0, months: 0, records: [] };
      stats[year].total += total;
      stats[year].months += 1;
      stats[year].records.push({ month, val: total });
    });
    return Object.entries(stats).sort((a, b) => b[0] - a[0]).map(([year, d]) => {
      const max = d.records.reduce((prev, curr) => prev.val > curr.val ? prev : curr, { val: 0, month: 0 });
      const min = d.records.reduce((prev, curr) => prev.val < curr.val ? prev : curr, { val: Infinity, month: 0 });
      return {
        year,
        avg: d.total / d.months,
        max,
        min: min.val === Infinity ? { val: 0, month: 0 } : min
      };
    });
  };
  var setFireWithdrawalRate = (data, rate) => {
    const value = parseFloat(rate);
    if (Number.isNaN(value) || value <= 0) throw new Error("\u63D0\u9818\u7387\u5FC5\u9808\u5927\u65BC 0");
    return { ...data, fireSettings: { ...data.fireSettings || {}, withdrawalRate: value } };
  };

  // src/rangeStats.js
  var toInclusiveRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  var parseExpenseDate = (value) => new Date(value.replace(/\//g, "-"));
  var getRangeIncomeStats = (incomes = {}, startDate, endDate) => {
    const startMonth = startDate.substring(0, 7);
    const endMonth = endDate.substring(0, 7);
    let total = 0;
    const sources = [];
    Object.entries(incomes || {}).forEach(([monthStr, incomeData]) => {
      if (monthStr >= startMonth && monthStr <= endMonth) {
        total += incomeData.totalAmount || 0;
        (incomeData.sources || []).forEach((src) => {
          sources.push({ ...src, month: monthStr });
        });
      }
    });
    return { total, sources, count: sources.length };
  };
  var getRangeAssetStats = (records = {}, startDate, endDate) => {
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
      items.forEach((item) => {
        if (item.type === "floating") {
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
    const startFloatingMap = new Map(startStats.floatingItems.map((i) => [i.name, i.amount]));
    const endFloatingMap = new Map(endStats.floatingItems.map((i) => [i.name, i.amount]));
    const allFloatingNames = /* @__PURE__ */ new Set([...startFloatingMap.keys(), ...endFloatingMap.keys()]);
    allFloatingNames.forEach((name) => {
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
  var getRangeDebtStats = (debts = {}, debtEvents = {}, startDate, endDate) => {
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
  var getRangeExpenseStats = (expenses = {}, startDate, endDate) => {
    const { start, end } = toInclusiveRange(startDate, endDate);
    let total = 0;
    const categories = {};
    let count = 0;
    Object.values(expenses || {}).forEach((list) => {
      list.forEach((item) => {
        const d = parseExpenseDate(item.date);
        if (d >= start && d <= end) {
          total += item.amount || 0;
          count++;
          const cat = item.category || "\u672A\u5206\u985E";
          categories[cat] = (categories[cat] || 0) + (item.amount || 0);
        }
      });
    });
    const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, count, topCategories };
  };
  var getRangeFinanceStats = ({ incomeStats, assetStats, debtStats, expenseStats }) => {
    const cashFlow = incomeStats.total - expenseStats.total;
    const startNetWorth = assetStats.startAssets - debtStats.startDebts;
    const endNetWorth = assetStats.endAssets - debtStats.endDebts;
    const netWorthChange = endNetWorth - startNetWorth;
    const totalCreated = netWorthChange + expenseStats.total;
    const nonIncomeChange = totalCreated - incomeStats.total;
    return { cashFlow, startNetWorth, endNetWorth, netWorthChange, totalCreated, nonIncomeChange };
  };
  var getExpenseAccounts = (expenses = {}) => {
    const accs = /* @__PURE__ */ new Set();
    Object.values(expenses || {}).forEach((list) => {
      list.forEach((item) => {
        if (item.account) accs.add(item.account);
      });
    });
    return Array.from(accs).sort();
  };
  var getStatementExpenses = (expenses = {}, account, startDate, endDate) => {
    if (!account) return [];
    const { start, end } = toInclusiveRange(startDate, endDate);
    const result = [];
    Object.values(expenses || {}).forEach((list) => {
      list.forEach((item) => {
        const d = parseExpenseDate(item.date);
        if (item.account === account && d >= start && d <= end) result.push(item);
      });
    });
    return result.sort((a, b) => parseExpenseDate(b.date) - parseExpenseDate(a.date));
  };
  var pad2 = (n) => String(n).padStart(2, "0");
  var getRecentMonthsRange = (months, today) => {
    const [year, month] = today.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const start = new Date(year, month - 1 - months + 1, 1);
    return {
      startDate: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`,
      endDate: `${year}-${pad2(month)}-${pad2(lastDay)}`
    };
  };
  var getRangeStats = (data = {}, startDate, endDate) => {
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
  var getStatementDefaultRange = (today) => {
    const [year, month] = today.split("-").map(Number);
    const previous = new Date(year, month - 2, 1);
    return {
      startDate: `${previous.getFullYear()}-${pad2(previous.getMonth() + 1)}-15`,
      endDate: `${year}-${pad2(month)}-16`
    };
  };
  var getStatementView = (expenses = {}, account, startDate, endDate) => {
    const accounts = getExpenseAccounts(expenses);
    const selected = account && accounts.includes(account) ? account : accounts[0] || "";
    const items = getStatementExpenses(expenses, selected, startDate, endDate).map((item, index) => ({
      key: item.id != null ? String(item.id) : `${item.date}#${index}`,
      title: item.name || item.subCategory || item.category || "",
      date: item.date || "",
      category: item.category || "",
      amount: Number(item.amount) || 0
    }));
    return { accounts, account: selected, items, total: items.reduce((sum, item) => sum + item.amount, 0) };
  };

  // src/stockAnalysis.js
  var marketOf = (item) => item.market || "TW";
  var sumTradeAmounts = (trades, type) => trades.filter((trade) => trade.type === type).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  var getHoldingSnapshots = (stockHoldingSnapshots = {}) => Object.entries(stockHoldingSnapshots || {}).flatMap(
    ([month, versions]) => normalizeSnapshotVersions(versions).map((snapshot) => ({ ...snapshot, month, holdings: Array.isArray(snapshot.holdings) ? snapshot.holdings : [] }))
  ).sort((a, b) => new Date(b.importedAt || `${b.month}-01`).getTime() - new Date(a.importedAt || `${a.month}-01`).getTime());
  var getStockMarketCounts = (stockTransactions = [], holdingSnapshots = []) => {
    const sets = { TW: /* @__PURE__ */ new Set(), US: /* @__PURE__ */ new Set() };
    const addKey = (market, symbol) => {
      if (!symbol) return;
      const normalizedMarket = market || "TW";
      const key = `${normalizedMarket}:${symbol}`;
      if (!sets[normalizedMarket]) sets[normalizedMarket] = /* @__PURE__ */ new Set();
      sets[normalizedMarket].add(key);
    };
    (stockTransactions || []).forEach((trade) => {
      if (!trade.symbol || trade.type === "deposit" || trade.unassigned) return;
      addKey(marketOf(trade), trade.symbol);
    });
    holdingSnapshots.forEach((snapshot) => {
      (snapshot.holdings || []).forEach((holding) => addKey(marketOf(holding), holding.symbol || holding.name));
    });
    return Object.fromEntries(Object.entries(sets).map(([market, values]) => [market, values.size]));
  };
  var buildHoldingMap = (snapshot, holdings = []) => {
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
  var filterTransactionsByRange = (stockTransactions = [], rangeStart = "", rangeEnd = "") => {
    const hasRange = Boolean(rangeStart || rangeEnd);
    return (stockTransactions || []).filter((trade) => {
      if (!hasRange) return true;
      const date = trade.date || "";
      if (!date) return false;
      if (rangeStart && date < rangeStart) return false;
      if (rangeEnd && date > rangeEnd) return false;
      return true;
    });
  };
  var buildStockRows = (transactions = [], holdingMap = {}, selectedSnapshot = null) => {
    const bySymbol = {};
    transactions.forEach((trade) => {
      if (!trade.symbol || trade.type === "deposit" || trade.unassigned) return;
      const symbol = trade.symbol;
      const market = marketOf(trade);
      const rowKey = `${market}:${symbol}`;
      if (!bySymbol[rowKey]) {
        bySymbol[rowKey] = { key: rowKey, symbol, name: trade.name || symbol, market, currency: trade.currency || (market === "US" ? "USD" : "TWD"), buyAmount: 0, sellAmount: 0, dividends: 0, fees: 0, tradeCount: 0, latestTradeDate: trade.date, realizedOnly: false };
      }
      const row = bySymbol[rowKey];
      row.tradeCount += 1;
      if (trade.source === "csv-us-realized") row.realizedOnly = true;
      if (!row.latestTradeDate || new Date(trade.date) > new Date(row.latestTradeDate)) row.latestTradeDate = trade.date;
      if (trade.type === "buy") row.buyAmount += Number(trade.amount) || 0;
      if (trade.type === "sell") row.sellAmount += Number(trade.amount) || 0;
      if (trade.type === "dividend") row.dividends += Number(trade.amount) || 0;
      if (trade.type === "fee") row.fees += Number(trade.amount) || 0;
    });
    Object.values(holdingMap).forEach((snapshot) => {
      const holding = snapshot.holding;
      const symbol = holding.symbol || holding.name;
      const market = marketOf(holding);
      const rowKey = `${market}:${symbol}`;
      if (!symbol || bySymbol[rowKey]) return;
      bySymbol[rowKey] = { key: rowKey, symbol, name: holding.name || symbol, market, currency: market === "US" ? "USD" : "TWD", buyAmount: 0, sellAmount: 0, dividends: 0, fees: 0, tradeCount: 0, latestTradeDate: selectedSnapshot?.month || "", realizedOnly: false };
    });
    return Object.values(bySymbol).map((row) => {
      const snapshot = holdingMap[`${row.market}:${row.symbol}`] || holdingMap[`${row.market}:${row.name}`];
      const marketValue = snapshot?.value || 0;
      const pnlMarketValue = row.realizedOnly ? 0 : marketValue;
      const totalPnl = pnlMarketValue + row.sellAmount + row.dividends - row.buyAmount - row.fees;
      return { ...row, marketValue, snapshotDate: snapshot?.date || null, totalPnl, roi: row.buyAmount > 0 ? totalPnl / row.buyAmount : 0, hasSnapshot: Boolean(snapshot) };
    }).sort((a, b) => b.totalPnl - a.totalPnl);
  };
  var getStockStats = (rows = [], transactions = []) => ({
    totalBuy: rows.reduce((sum, item) => sum + item.buyAmount, 0),
    totalMarketValue: rows.reduce((sum, item) => sum + item.marketValue, 0),
    totalDividends: sumTradeAmounts(transactions, "dividend"),
    totalInterest: sumTradeAmounts(transactions, "interest"),
    totalDeposits: sumTradeAmounts(transactions, "deposit"),
    totalWithdrawals: sumTradeAmounts(transactions, "withdrawal"),
    totalPnl: rows.reduce((sum, item) => sum + item.totalPnl, 0) + transactions.filter((trade) => trade.type === "dividend" && trade.unassigned).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  });
  var getStockStatsTargetDate = ({ hasRange, selectedSnapshot, rangeEnd, transactions = [], today }) => {
    if (!hasRange && selectedSnapshot?.month) return getMonthEndDateKey(selectedSnapshot.month);
    if (rangeEnd) return rangeEnd;
    const latestTradeDate = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date;
    return latestTradeDate || today;
  };
  var getStockDebtStats = ({ debts = {}, debtEvents = {}, market, targetDate, totalPnl }) => {
    const latestDebtItems = getEffectiveDebtSnapshotAtDate(debts, debtEvents, targetDate);
    const debtSnapshotDate = Object.keys(debts || {}).filter((date) => date <= targetDate).sort().at(-1) || null;
    let marketPledgeDebt = 0;
    let totalPledgeDebt = 0;
    let unallocatedPledgeDebt = 0;
    let marketEstimatedAnnualInterest = 0;
    latestDebtItems.forEach((debt) => {
      if (debt.category !== "stock_pledge") return;
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
  var getLatestSnapshotEstimate = ({ rows = [], holdings = [], quotes = {}, totalPnl, marketPledgeDebt }) => {
    const rowMap = /* @__PURE__ */ new Map();
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
  var formatStockPnlLabel = (amount, { market, usdToTwdRate, currency }) => {
    const sign = amount >= 0 ? "+" : "";
    if (market !== "US") return `${sign}${formatMoney(amount)}`;
    if (currency === "TWD") return `NT$${sign}${formatMoney(amount * usdToTwdRate)}`;
    return `(USD) ${sign}${formatMoneyByMarket(amount, "US")}`;
  };
  var getStockChartRows = (rows = []) => {
    const top = [...rows].sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl)).slice(0, 8);
    const maxAbs = Math.max(...top.map((item) => Math.abs(item.totalPnl)), 1);
    return top.map((item) => ({ ...item, barWidth: Math.max(6, Math.round(Math.abs(item.totalPnl) / maxAbs * 100)) }));
  };
  var getMarketSnapshots = (holdingSnapshots = [], market = "TW", snapshotId = "") => {
    const visible = holdingSnapshots.filter((snapshot) => (snapshot.holdings || []).some((holding) => marketOf(holding) === market));
    const selected = visible.find((snapshot) => snapshot.id === snapshotId) || visible[0] || null;
    const holdings = selected ? (selected.holdings || []).filter((holding) => marketOf(holding) === market) : [];
    return { visible, selected, holdings };
  };
  var getStockLeaders = (rows = [], limit = 5) => ({
    winners: rows.filter((item) => item.totalPnl > 0).slice(0, limit),
    losers: [...rows].filter((item) => item.totalPnl < 0).sort((a, b) => a.totalPnl - b.totalPnl).slice(0, limit)
  });
  var getStockOverview = (data = {}, { market = "TW", snapshotId = "", rangeStart = "", rangeEnd = "", today } = {}) => {
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
        id,
        month,
        version,
        note: note || "",
        importedAt: importedAt || "",
        holdingCount: (items || []).filter((holding) => marketOf(holding) === market).length
      })),
      selectedSnapshotId: selected?.id || null,
      holdings,
      rows,
      stats,
      targetDate,
      debtStats,
      ...getStockLeaders(rows),
      transactionCount: marketTransactions.length
    };
  };
  var getStockTrades = (data = {}, { market = "TW", symbol, rangeStart = "", rangeEnd = "" } = {}) => filterTransactionsByRange(data.stockTransactions, rangeStart, rangeEnd).filter((trade) => marketOf(trade) === market && trade.symbol === symbol).sort((a, b) => new Date(b.date) - new Date(a.date));
  var describeStockTrades = (trades = []) => trades.map((trade) => ({
    ...trade,
    label: getStockTradeLabel(trade.type),
    title: getStockTradeTitle(trade),
    description: getStockTradeDescription(trade)
  }));
  var getStockQuoteEstimate = (data = {}, options = {}, quotes = {}) => {
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
        id: holding.id || "",
        market: marketOf(holding),
        symbol: holding.symbol || "",
        name: holding.name || holding.symbol || "",
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

  // src/storageFormat.js
  var CHUNK_SIZE = 25e4;
  var hashString = (str, seed = 0) => {
    let h1 = 3735928559 ^ seed;
    let h2 = 1103547991 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };
  var splitIntoChunks = (str, size = CHUNK_SIZE) => {
    const chunks = [];
    let start = 0;
    while (start < str.length) {
      let end = Math.min(start + size, str.length);
      if (end < str.length && size > 1) {
        const lastCode = str.charCodeAt(end - 1);
        if (lastCode >= 55296 && lastCode <= 56319) end -= 1;
      }
      chunks.push(str.slice(start, end));
      start = end;
    }
    if (chunks.length === 0) chunks.push("");
    return chunks;
  };
  var parseLegacyChunks = (chunks) => {
    const fullString = chunks.join("");
    try {
      return JSON.parse(fullString);
    } catch (error) {
      let currentString = fullString;
      for (let i = chunks.length - 1; i > 0; i--) {
        currentString = currentString.slice(0, -chunks[i].length);
        try {
          return JSON.parse(currentString);
        } catch {
          continue;
        }
      }
      throw error;
    }
  };
  var summarizeDataCounts = (data) => {
    const countItems = (obj = {}) => Object.values(obj || {}).reduce((sum, items) => sum + ((items || []).length || 0), 0);
    const countIncomeSources = (obj = {}) => Object.values(obj || {}).reduce((sum, item) => sum + (item?.sources || []).length, 0);
    return {
      recordsDates: Object.keys(data?.records || {}).length,
      recordsItems: countItems(data?.records),
      debtDates: Object.keys(data?.debts || {}).length,
      debtItems: countItems(data?.debts),
      incomeMonths: Object.keys(data?.incomes || {}).length,
      incomeSources: countIncomeSources(data?.incomes),
      expenseMonths: Object.keys(data?.expenses || {}).length,
      expenseItems: countItems(data?.expenses),
      memoDates: Object.keys(data?.memos || {}).length,
      debtEventMonths: Object.keys(data?.debtEvents || {}).length,
      debtEventItems: countItems(data?.debtEvents),
      stockTransactions: (data?.stockTransactions || []).length,
      stockSnapshotMonths: Object.keys(data?.stockHoldingSnapshots || {}).length,
      stockSnapshotVersions: countItems(data?.stockHoldingSnapshots)
    };
  };

  // src/appLock.js
  var AUTO_LOCK_BACKGROUND_MS = 30 * 1e3;
  var AUTO_LOCK_IDLE_MS = 5 * 60 * 1e3;
  var PRIVACY_MASK = "****";
  var shouldLockOnResume = (hiddenAt, now) => hiddenAt !== null && hiddenAt !== void 0 && now - hiddenAt >= AUTO_LOCK_BACKGROUND_MS;
  var isIdleExpired = (lastActivityAt, now) => lastActivityAt !== null && lastActivityAt !== void 0 && now - lastActivityAt >= AUTO_LOCK_IDLE_MS;
  var maskAmount = (text, isPrivacyMode) => isPrivacyMode ? PRIVACY_MASK : text;

  // src/records.js
  var SUPPORTED_CURRENCIES = Object.keys(DEFAULT_EXCHANGE_RATES);
  var convertToTWD = (originalAmount, exchangeRate, currency = "TWD") => {
    if (currency === "TWD") return Number(originalAmount) || 0;
    const value = parseFloat(originalAmount) * parseFloat(exchangeRate);
    return Number.isFinite(value) ? Number(value.toFixed(0)) : 0;
  };
  var getAssetNameOptions = (records = {}) => {
    const map = /* @__PURE__ */ new Map();
    Object.keys(records || {}).sort().forEach((date) => {
      (records[date] || []).forEach((r) => map.set(r.name, r.type));
    });
    return Array.from(map.entries()).map(([name, type]) => ({ name, type }));
  };
  var getLatestAssetByName = (records = {}, name) => {
    const dates = Object.keys(records || {}).sort().reverse();
    for (const d of dates) {
      const record = (records[d] || []).find((r) => r.name === name);
      if (record) return record;
    }
    return null;
  };
  var getPreviousAssetSnapshot = (records = {}, date) => {
    if (!date) return { date: null, assets: [] };
    const currentTimestamp = new Date(date).getTime();
    const dates = Object.keys(records || {}).filter((d) => new Date(d).getTime() < currentTimestamp && (records[d] || []).length > 0).sort((a, b) => new Date(b) - new Date(a));
    if (dates.length === 0) return { date: null, assets: [] };
    return { date: dates[0], assets: records[dates[0]] || [] };
  };
  var isDuplicateAsset = (records = {}, date, pending = [], name, currency) => {
    const cleanName = (name || "").trim();
    const assetsInDate = records?.[date] || [];
    const pendingInDate = pending.filter((asset) => asset.date === date);
    return [...assetsInDate, ...pendingInDate].some((asset) => asset.name === cleanName && asset.currency === currency);
  };
  var createAssetEntry = ({ id, type = "fixed", name, originalAmount, currency = "TWD", exchangeRate = 1, date }) => {
    const amount = convertToTWD(originalAmount, exchangeRate, currency);
    return {
      id,
      type,
      name: (name || "").trim(),
      amount,
      currency,
      originalAmount: Number(originalAmount) || amount,
      exchangeRate: Number(exchangeRate),
      date
    };
  };
  var getImportablePreviousAssets = (records = {}, date, pending = [], idPrefix = "asset-import") => {
    const snapshot = getPreviousAssetSnapshot(records, date);
    const assetsInDate = records?.[date] || [];
    const existingKeys = new Set([...assetsInDate, ...pending].map((asset) => `${asset.name}-${asset.currency || "TWD"}`));
    return snapshot.assets.filter((asset) => !existingKeys.has(`${asset.name}-${asset.currency || "TWD"}`)).map((asset, index) => ({
      ...asset,
      id: `${idPrefix}-${index}`,
      date,
      amount: Number(asset.amount) || 0,
      originalAmount: Number(asset.originalAmount) || Number(asset.amount) || 0,
      exchangeRate: Number(asset.exchangeRate) || 1
    }));
  };
  var addAssetsToData = (data = {}, dateKey, newAssets) => {
    const assetsToAdd = (Array.isArray(newAssets) ? newAssets : [newAssets]).map(({ date, ...asset }) => asset);
    const existing = data.records?.[dateKey] || [];
    return {
      ...data,
      records: { ...data.records || {}, [dateKey]: [...existing, ...assetsToAdd] }
    };
  };
  var createIncomeSource = ({ date, company, bank = "", currency = "TWD", originalAmount, exchangeRate = 1, memo = "" }) => {
    const amount = convertToTWD(originalAmount, exchangeRate, currency);
    return {
      date,
      company,
      bank,
      currency,
      originalAmount: Number(originalAmount) || amount,
      exchangeRate: Number(exchangeRate),
      amount,
      memo: (memo || "").trim()
    };
  };
  var addIncomeToData = (data = {}, dateKey, newIncomeSource) => {
    const monthKey = dateKey.substring(0, 7);
    const existingMonthData = data.incomes?.[monthKey] || { totalAmount: 0, sources: [] };
    const existingSources = existingMonthData.sources || [];
    const newTotal = (existingMonthData.totalAmount || 0) + newIncomeSource.amount;
    return {
      ...data,
      incomes: {
        ...data.incomes || {},
        [monthKey]: { ...existingMonthData, totalAmount: newTotal, sources: [...existingSources, newIncomeSource] }
      }
    };
  };
  var findDuplicateAsset = (records = {}, dateKey, entries = []) => {
    const seen = new Set((records?.[dateKey] || []).map((asset) => `${asset.name}-${asset.currency || "TWD"}`));
    for (const entry of entries) {
      const key = `${(entry.name || "").trim()}-${entry.currency || "TWD"}`;
      if (seen.has(key)) return `${(entry.name || "").trim()} (${entry.currency || "TWD"})`;
      seen.add(key);
    }
    return null;
  };
  var getDebtAccountOptions = (records = {}, debts = {}, date, extraOptions = []) => {
    const options = [];
    const seen = /* @__PURE__ */ new Set();
    const addOption = (value) => {
      const cleanValue = String(value || "").trim();
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
    const recordEntries = Object.entries(records || {}).filter(([dateStr]) => new Date(dateStr) <= targetDate).sort(([a], [b]) => new Date(b) - new Date(a));
    const sameMonthEntry = recordEntries.find(([dateStr]) => dateStr.substring(0, 7) === String(date).substring(0, 7));
    if (sameMonthEntry) addAssetOptions(sameMonthEntry[1]);
    if (recordEntries[0] && recordEntries[0] !== sameMonthEntry) addAssetOptions(recordEntries[0][1]);
    Object.values(debts || {}).forEach((items) => (items || []).forEach((debt) => addOption(debt.lender)));
    extraOptions.forEach(addOption);
    return options;
  };
  var cleanPledgeStockRows = (rows = []) => rows.map((row) => ({ symbol: String(row.symbol || "").trim(), shares: Math.trunc(Number(row.shares)) || 0, rate: Number(row.rate) || 0 })).filter((row) => row.symbol);
  var getDebtInputError = ({ date, name, amount, category, pledgeStocks = [] }) => {
    if (!date) return "\u8ACB\u9078\u64C7\u65E5\u671F";
    if (!String(name || "").trim()) return "\u8ACB\u8F38\u5165\u8CA0\u50B5\u540D\u7A31";
    if (!amount || Number(amount) <= 0) return "\u8ACB\u8F38\u5165\u6709\u6548\u91D1\u984D";
    if (category === "stock_pledge" && cleanPledgeStockRows(pledgeStocks).length === 0) return "\u8ACB\u81F3\u5C11\u8F38\u5165\u4E00\u7B46\u8CEA\u62BC\u80A1\u7968";
    return null;
  };
  var createDebtEntry = ({ id, category = "other", name, lender = "", amount, pledgeStocks = [], memo = "" }) => ({
    id,
    category,
    name: String(name || "").trim(),
    lender: String(lender || "").trim(),
    amount: Number(amount),
    pledgeStocks: category === "stock_pledge" ? cleanPledgeStockRows(pledgeStocks) : [],
    memo: String(memo || "").trim()
  });
  var addDebtToData = (localData = {}, cloudData = null, dateKey, newDebt) => {
    const mergedDebts = mergeDebtMaps(cloudData?.debts, localData.debts);
    const baseData = cloudData ? { ...localData, ...cloudData, debts: mergedDebts } : { ...localData, debts: mergedDebts };
    return { ...baseData, debts: addDebtAndCarryForward(mergedDebts, dateKey, newDebt) };
  };
  var pad22 = (n) => String(n).padStart(2, "0");
  var getDebtEventDefaultDate = (monthKey, today) => {
    if (String(today).startsWith(monthKey)) return today;
    const [year, month] = monthKey.split("-").map(Number);
    return `${monthKey}-${pad22(new Date(year, month, 0).getDate())}`;
  };
  var parseCollateralText = (text = "") => String(text).split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [symbol, shares] = part.split(/[:xX* ]+/).filter(Boolean);
    return { symbol: symbol || part, shares: Number(shares) || 0 };
  });
  var getDebtEventTargets = (debts = []) => (debts || []).filter((item) => item.category === "stock_pledge").map((item) => ({ ...item, targetKey: getDebtTargetKey(item) }));
  var getDebtEventInputError = ({ monthKey, date, type, name, amount, rateRows = [], target = null }) => {
    if (!date || !String(date).startsWith(monthKey)) return "\u65E5\u671F\u9700\u5728\u76EE\u524D\u6708\u4EFD\u5167";
    if (!String(name || "").trim() && type !== "rate_change") return "\u8ACB\u8F38\u5165\u8CA0\u50B5\u540D\u7A31";
    if (type === "rate_change") {
      if (!target) return "\u8ACB\u5148\u9078\u64C7\u8981\u8ABF\u6574\u5229\u7387\u7684\u80A1\u7968\u8CEA\u62BC";
      if (cleanPledgeStockRows(rateRows).filter((row) => row.rate > 0).length === 0) return "\u8ACB\u81F3\u5C11\u8F38\u5165\u4E00\u7B46\u65B0\u7684\u5229\u7387\u8CC7\u6599";
      return null;
    }
    if (type !== "collateral" && (!amount || Number(amount) <= 0)) return "\u8ACB\u8F38\u5165\u6709\u6548\u91D1\u984D";
    return null;
  };
  var createDebtEvent = ({ id, date, type, name = "", lender = "", amount, collateralText = "", rateRows = [], target = null, memo = "" }) => {
    if (type === "rate_change") {
      return {
        id,
        date,
        type,
        name: target?.name || String(name).trim(),
        lender: target?.lender || String(lender).trim(),
        category: target?.category || "stock_pledge",
        targetDebtId: target?.id || "",
        targetDebtKey: target?.targetKey,
        amount: 0,
        collateral: [],
        pledgeStocks: cleanPledgeStockRows(rateRows).filter((row) => row.rate > 0),
        memo: String(memo).trim()
      };
    }
    return {
      id,
      date,
      type,
      name: String(name).trim(),
      lender: String(lender).trim(),
      amount: type === "collateral" ? 0 : Number(amount),
      collateral: parseCollateralText(collateralText),
      memo: String(memo).trim()
    };
  };
  var addDebtEventToData = (data = {}, month, event) => ({
    ...data,
    debtEvents: {
      ...data.debtEvents || {},
      [month]: [...data.debtEvents?.[month] || [], event]
    }
  });
  var toNumber = (value) => Number(value) || 0;
  var updateIncomeSourceField = (source = {}, field, value) => {
    const updated = { ...source, [field]: value };
    if (field === "originalAmount" || field === "exchangeRate" || field === "currency") {
      if (field === "currency" && value === "TWD") {
        updated.exchangeRate = 1;
        updated.amount = toNumber(updated.originalAmount);
      } else {
        const rate = field === "exchangeRate" ? value : updated.exchangeRate;
        const orig = field === "originalAmount" ? value : updated.originalAmount;
        updated.amount = Number((Number(orig) * Number(rate)).toFixed(0)) || 0;
      }
    }
    return updated;
  };
  var updateMonthDetails = (data = {}, { month, assetDate, debtDate, memoDate, assets = [], memo = "", incomes = [], debts = [], debtEvents }) => {
    const cleanAssets = assets.map(({ _tempId, ...asset }) => ({ ...asset, amount: toNumber(asset.amount) }));
    const cleanIncomes = incomes.map(({ _tempId, ...source }) => ({
      ...source,
      amount: toNumber(source.amount),
      ...source.originalAmount !== void 0 ? { originalAmount: toNumber(source.originalAmount) } : {},
      ...source.exchangeRate !== void 0 ? { exchangeRate: toNumber(source.exchangeRate) } : {}
    }));
    const cleanDebts = debts.map(({ _tempId, ...debt }) => ({ ...debt, amount: toNumber(debt.amount) }));
    const newTotal = cleanIncomes.reduce((sum, item) => sum + item.amount, 0);
    const hasAssetSnapshot = Object.prototype.hasOwnProperty.call(data.records || {}, assetDate);
    const hasDebtSnapshot = Object.prototype.hasOwnProperty.call(data.debts || {}, debtDate);
    const hasMemo = Object.prototype.hasOwnProperty.call(data.memos || {}, memoDate);
    const existingIncomeMonth = data.incomes?.[month];
    const currentEffectiveDebts = getMonthDetail(data, month).debts.map(({ _tempId, ...debt }) => ({ ...debt, amount: toNumber(debt.amount) }));
    const debtsChanged = JSON.stringify(cleanDebts) !== JSON.stringify(currentEffectiveDebts);
    const next = { ...data };
    if (hasAssetSnapshot || cleanAssets.length > 0) next.records = { ...data.records || {}, [assetDate]: cleanAssets };
    if (hasMemo || memo) next.memos = { ...data.memos || {}, [memoDate]: memo };
    if (hasDebtSnapshot || debtsChanged) next.debts = { ...data.debts || {}, [debtDate]: cleanDebts };
    if (existingIncomeMonth || cleanIncomes.length > 0) {
      next.incomes = {
        ...data.incomes || {},
        [month]: { ...existingIncomeMonth || {}, totalAmount: newTotal, sources: cleanIncomes }
      };
    }
    if (Array.isArray(debtEvents)) next.debtEvents = { ...data.debtEvents || {}, [month]: debtEvents };
    return next;
  };
  var deleteMonthData = (data = {}, monthKey) => {
    const withoutMonth = (map = {}) => Object.fromEntries(Object.entries(map || {}).filter(([date]) => !date.startsWith(monthKey)));
    const debtEvents = { ...data.debtEvents || {} };
    delete debtEvents[monthKey];
    return {
      ...data,
      records: withoutMonth(data.records),
      memos: withoutMonth(data.memos),
      debts: withoutMonth(data.debts),
      ...data.debtEvents ? { debtEvents } : {}
    };
  };
  var deleteDebtEventFromData = (data = {}, month, id) => ({
    ...data,
    debtEvents: {
      ...data.debtEvents || {},
      [month]: (data.debtEvents?.[month] || []).filter((item) => item.id !== id)
    }
  });

  // src/monthDetail.js
  var sumAmounts2 = (items = []) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  var getLatestDateInMonth = (records = {}, month) => Object.keys(records || {}).filter((date) => date.startsWith(month)).sort().pop() || null;
  var getDataMonths = (data = {}) => {
    const months = /* @__PURE__ */ new Set();
    Object.keys(data.records || {}).forEach((d) => months.add(d.substring(0, 7)));
    Object.keys(data.memos || {}).forEach((d) => months.add(d.substring(0, 7)));
    Object.keys(data.debts || {}).forEach((d) => months.add(d.substring(0, 7)));
    Object.keys(data.debtEvents || {}).forEach((m) => months.add(m));
    Object.keys(data.incomes || {}).forEach((m) => months.add(m));
    Object.keys(data.expenses || {}).forEach((m) => months.add(m));
    return Array.from(months).sort();
  };
  var getExpenseCategories = (expenses = []) => {
    const categoryMap = {};
    expenses.forEach((ex) => {
      const cat = ex.category || "\u5176\u4ED6";
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, value: 0, items: [] };
      categoryMap[cat].value += ex.amount;
      categoryMap[cat].items.push(ex);
    });
    return Object.values(categoryMap).sort((a, b) => b.value - a.value);
  };
  var getMonthSummary = ({ assets = [], debts = [], incomes = [], expenses = [], prevTotalAssets = 0, prevTotalDebts = 0, prevMonthIncome = 0 }) => {
    const totalAssets = sumAmounts2(assets);
    const totalDebts = getDebtTotal(debts);
    const netAssets = totalAssets - totalDebts;
    const floatingAssets = sumAmounts2(assets.filter((item) => item.type === "floating"));
    const investmentRate = totalAssets > 0 ? floatingAssets / totalAssets : 0;
    const monthlyIncome = sumAmounts2(incomes);
    const monthlyCost = sumAmounts2(expenses);
    const incomeDiff = monthlyIncome - prevMonthIncome;
    const assetDiff = netAssets - (prevTotalAssets - prevTotalDebts);
    const compositeScore = incomeDiff + assetDiff;
    return { totalAssets, totalDebts, netAssets, investmentRate, monthlyIncome, monthlyCost, incomeDiff, assetDiff, compositeScore };
  };
  var getMonthDetail = (data = {}, monthKey) => {
    const monthEndDate = getMonthEndDateKey(monthKey);
    const assetDate = getLatestDateInMonth(data.records, monthKey);
    const debtDate = getLatestDateInMonth(data.debts, monthKey);
    const memoDate = getLatestDateInMonth(data.memos, monthKey);
    const effectiveDebtSnapshotDate = monthEndDate ? getLatestSnapshotDate(data.debts, monthEndDate) : null;
    const isDebtCarriedForward = Boolean(effectiveDebtSnapshotDate && effectiveDebtSnapshotDate.substring(0, 7) !== monthKey);
    const monthlyDebtSnapshots = Object.entries(data.debts || {}).filter(([date]) => date.startsWith(monthKey)).sort(([a], [b]) => a.localeCompare(b)).map(([date, debts2]) => ({ date, debts: Array.isArray(debts2) ? debts2 : [], total: getDebtTotal(debts2) }));
    const debtEvents = [...data.debtEvents?.[monthKey] || []].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestDebtEventDate = debtEvents.map((item) => item.date).filter(Boolean).sort().pop() || "";
    const effectiveDebtDate = effectiveDebtSnapshotDate && latestDebtEventDate && latestDebtEventDate > effectiveDebtSnapshotDate ? latestDebtEventDate : effectiveDebtSnapshotDate;
    const debts = effectiveDebtDate ? getEffectiveDebtSnapshotAtDate(data.debts, data.debtEvents, effectiveDebtDate) : [];
    const baseDebtSnapshotItems = effectiveDebtSnapshotDate ? data.debts?.[effectiveDebtSnapshotDate] || [] : [];
    const debtEventStats = debtEvents.reduce((acc, item) => {
      acc.principal += getDebtEventImpact(item);
      if (item.type === "interest") acc.interest += Number(item.amount) || 0;
      if (item.type === "fee") acc.fees += Number(item.amount) || 0;
      if (item.type === "rate_change") acc.rateChanges += 1;
      return acc;
    }, { principal: 0, interest: 0, fees: 0, rateChanges: 0 });
    const estimatedMonthlyDebtInterest = baseDebtSnapshotItems.reduce((sum, debt) => sum + getMonthlyDebtInterestEstimate(debt, monthKey, data.debtEvents, data.debts), 0);
    const months = getDataMonths(data);
    const currentIndex = months.indexOf(monthKey);
    const prevMonth = currentIndex > 0 ? months[currentIndex - 1] : null;
    const nextMonth = currentIndex < months.length - 1 ? months[currentIndex + 1] : null;
    const prevAssetDate = prevMonth ? getLatestDateInMonth(data.records, prevMonth) : null;
    const prevDebtDate = prevMonth ? getLatestSnapshotDate(data.debts, getMonthEndDateKey(prevMonth)) : null;
    const prevAssets = prevAssetDate ? data.records[prevAssetDate] || [] : [];
    const prevMonthAssetsMap = prevAssets.reduce((acc, item) => {
      acc[`${item.type}-${item.name}`] = item.amount;
      return acc;
    }, {});
    const prevTotalAssets = sumAmounts2(prevAssets);
    const prevTotalDebts = prevDebtDate ? getDebtTotal(getEffectiveDebtSnapshotAtDate(data.debts, data.debtEvents, prevDebtDate)) : 0;
    const prevMonthIncome = prevMonth ? data.incomes?.[prevMonth]?.totalAmount || 0 : 0;
    const assets = assetDate ? data.records[assetDate] || [] : [];
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
      memo: memoDate ? data.memos?.[memoDate] || "" : "",
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
      summary: getMonthSummary({ assets, debts, incomes, expenses, prevTotalAssets, prevTotalDebts, prevMonthIncome })
    };
  };
  var getMonthDebtEventTargets = (data = {}, monthKey) => getDebtEventTargets(getMonthDetail(data, monthKey).debts);

  // src/importExport.js
  var getBackupFileName = (today) => `meow-assets-backup-${String(today).replace(/-/g, "")}.json`;
  var createBackupText = (data) => JSON.stringify(createBackupFile(data), null, 2);
  var parseBackupText = (text) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("\u6A94\u6848\u4E0D\u662F\u6709\u6548\u7684 JSON");
    }
    const backupData = extractBackupData(parsed);
    if (!backupData || !backupData.records) throw new Error("\u7F3A\u5C11 records \u6B04\u4F4D\uFF0C\u9019\u4E0D\u662F\u6975\u7C21\u8C93\u8CC7\u7522\u7684\u5099\u4EFD\u6A94");
    return backupData;
  };
  var parseExpenseCSV = (text) => {
    let result = null;
    let error = null;
    processExpenseCSVText(text, (expensesByMonth) => {
      result = expensesByMonth;
    }, (message) => {
      error = message;
    });
    if (error) throw new Error(error);
    if (!result) throw new Error("CSV \u6C92\u6709\u53EF\u532F\u5165\u7684\u82B1\u8CBB");
    return result;
  };
  var mergeExpenseImport = (data = {}, expensesByMonth = {}) => ({
    ...data,
    expenses: { ...data.expenses || {}, ...expensesByMonth }
  });
  var SECTION_LABELS = {
    records: "\u8CC7\u7522\u7D00\u9304",
    incomes: "\u6536\u5165",
    expenses: "\u82B1\u8CBB",
    memos: "\u5099\u5FD8\u9304",
    debts: "\u8CA0\u50B5",
    debtEvents: "\u8CA0\u50B5\u7570\u52D5",
    stockTransactions: "\u80A1\u7968\u4EA4\u6613",
    stockHoldingSnapshots: "\u6301\u5009\u5FEB\u7167"
  };
  var summarizeBackupImport = (currentData = {}, backupData = {}) => {
    const summary = getJsonImportSummary(currentData, backupData);
    return {
      hasChanges: summary.hasChanges,
      sections: Object.entries(summary.sections).map(([key, section]) => ({
        key,
        label: SECTION_LABELS[key] || key,
        currentCount: section.currentCount,
        nextCount: section.nextCount,
        changed: section.changed,
        added: section.diff?.added?.length || 0,
        removed: section.diff?.removed?.length || 0,
        modified: section.diff?.modified?.length || 0
      }))
    };
  };
  var summarizeExpenseImport = (currentExpenses = {}, expensesByMonth = {}) => {
    const summary = getExpenseImportSummary(currentExpenses, expensesByMonth);
    const changedMonths = summary.changedMonths.map((month) => ({
      month: month.month,
      added: month.diff?.added?.length || 0,
      removed: month.diff?.removed?.length || 0,
      modified: month.diff?.modified?.length || 0
    }));
    return {
      months: summary.months,
      totalRecords: summary.totalRecords,
      changedMonths,
      hasChanges: changedMonths.some((m) => m.added || m.removed || m.modified)
    };
  };

  // src/stockImport.js
  var marketOf2 = (item) => item?.market || "TW";
  var TRADE_TYPES = ["buy", "sell", "dividend", "interest", "deposit", "withdrawal", "fee"];
  var parseStockImport = (text, options = {}) => {
    const result = processStockCSVText(text, options);
    if (result.transactions.length === 0) throw new Error("\u6C92\u6709\u627E\u5230\u53EF\u532F\u5165\u7684\u80A1\u7968\u4EA4\u6613\u3002");
    return result;
  };
  var summarizeStockImport = (result = {}) => {
    const transactions = result.transactions || [];
    const counts = Object.fromEntries(TRADE_TYPES.map((type) => [type, transactions.filter((trade) => trade.type === type).length]));
    return {
      market: result.market || "TW",
      total: transactions.length,
      counts,
      isArchived: Boolean(result.isArchived),
      skippedRows: (result.skippedRows || []).map((row) => ({
        row: row.row,
        item: [row.type, row.item].filter(Boolean).join(" / "),
        reason: row.reason || ""
      }))
    };
  };
  var addStockTransactionsToData = (data, transactions = []) => ({
    ...data,
    stockTransactions: [...data.stockTransactions || [], ...transactions]
  });
  var clearStockTransactionsFromData = (data, market = "TW") => ({
    ...data,
    stockTransactions: (data.stockTransactions || []).filter((trade) => marketOf2(trade) !== (market || "TW"))
  });
  var getLatestHoldingSnapshotForMarket = (stockHoldingSnapshots = {}, market = "TW") => getHoldingSnapshots(stockHoldingSnapshots).filter((snapshot) => snapshot.holdings.some((holding) => marketOf2(holding) === market)).sort((a, b) => {
    const timeA = new Date(a.importedAt || `${a.month}-01`).getTime() || 0;
    const timeB = new Date(b.importedAt || `${b.month}-01`).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return (Number(b.version) || 0) - (Number(a.version) || 0);
  })[0] || null;
  var getPreviousHoldingRows = (stockHoldingSnapshots = {}, market = "TW") => {
    const snapshot = getLatestHoldingSnapshotForMarket(stockHoldingSnapshots, market);
    if (!snapshot) return [];
    return snapshot.holdings.filter((holding) => marketOf2(holding) === market).map((holding) => ({
      market,
      name: holding.name || holding.symbol || "",
      price: holding.marketPrice ? String(holding.marketPrice) : "",
      shares: holding.shares ? String(holding.shares) : ""
    }));
  };
  var buildHoldingSnapshotPreview = ({ month, note = "", rows = [], idPrefix = "holding" }) => {
    const activeRows = rows.filter((row) => String(row.name || "").trim() || row.price || row.shares);
    if (activeRows.length === 0) throw new Error("\u8ACB\u81F3\u5C11\u8F38\u5165\u4E00\u7B46\u6301\u5009\u8CC7\u6599\u3002");
    const skippedRows = [];
    const holdings = activeRows.flatMap((row, index) => {
      const name = String(row.name || "").trim();
      const marketPrice = parseAmount(row.price);
      const shares = parseAmount(row.shares);
      if (!name || marketPrice <= 0 || shares <= 0) {
        skippedRows.push({ row: index + 1, item: name || "\u7A7A\u767D", reason: "\u8ACB\u78BA\u8A8D\u80A1\u7968\u540D\u7A31\u3001\u73FE\u50F9\u8207\u80A1\u6578\u90FD\u6709\u586B\u5BEB" });
        return [];
      }
      return [{
        id: `${idPrefix}-${index}`,
        month,
        market: row.market || "TW",
        symbol: "",
        name,
        shares,
        averageCost: 0,
        costAmount: 0,
        marketPrice,
        marketValue: marketPrice * shares,
        account: ""
      }];
    });
    if (holdings.length === 0) throw new Error("\u6C92\u6709\u627E\u5230\u53EF\u532F\u5165\u7684\u6301\u5009\u5FEB\u7167\u3002\u8ACB\u78BA\u8A8D\u81F3\u5C11\u4E00\u5217\u8CC7\u6599\u5B8C\u6574\u3002");
    return { month, note: String(note).trim(), holdings, skippedRows };
  };
  var addHoldingSnapshotToData = (data, preview, { nowISO, nowMs }) => {
    const { month } = preview;
    const existingVersions = data.stockHoldingSnapshots?.[month] || [];
    const nextVersion = existingVersions.reduce((max, item) => Math.max(max, Number(item.version) || 0), 0) + 1;
    const snapshot = {
      id: `holding-snapshot-${month}-v${nextVersion}-${nowMs}`,
      version: nextVersion,
      importedAt: nowISO,
      note: preview.note || "",
      holdings: preview.holdings
    };
    return {
      ...data,
      stockHoldingSnapshots: { ...data.stockHoldingSnapshots || {}, [month]: [...existingVersions, snapshot] }
    };
  };
  var deleteHoldingSnapshotFromData = (data, month, snapshotId) => {
    const remaining = (data.stockHoldingSnapshots?.[month] || []).filter((snapshot) => snapshot.id !== snapshotId);
    const nextSnapshots = { ...data.stockHoldingSnapshots || {} };
    if (remaining.length > 0) nextSnapshots[month] = remaining;
    else delete nextSnapshots[month];
    return { ...data, stockHoldingSnapshots: nextSnapshots };
  };

  // src/stockQuote.js
  var STOCK_QUOTE_SOURCES = {
    yahooChart: "https://query1.finance.yahoo.com/v8/finance/chart/",
    twseListing: "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL",
    tpexListing: "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes"
  };
  var SYMBOL_PATTERN = /^[\p{Script=Han}A-Za-z0-9.\-^=&*()（）]{1,24}$/u;
  var validateQuoteParams = ({ market, symbol } = {}) => {
    const normalizedMarket = String(market || "TW").toUpperCase();
    if (!["TW", "US"].includes(normalizedMarket)) throw new Error("\u5E02\u5834\u53C3\u6578\u53EA\u652F\u63F4 TW \u6216 US");
    const normalizedSymbol = String(symbol || "").trim();
    if (!normalizedSymbol) throw new Error("\u8ACB\u5148\u8F38\u5165\u80A1\u7968\u4EE3\u865F");
    if (!SYMBOL_PATTERN.test(normalizedSymbol)) throw new Error("\u80A1\u7968\u4EE3\u865F\u683C\u5F0F\u4E0D\u6B63\u78BA");
    return { market: normalizedMarket, symbol: normalizedSymbol };
  };
  var parseNumber = (value) => {
    const parsed = Number(String(value || "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  var matchTwseListing = (rows, rawSymbol) => {
    const keyword = String(rawSymbol || "").trim();
    if (!keyword) throw new Error("\u8ACB\u5148\u8F38\u5165\u80A1\u7968\u4EE3\u865F");
    const normalizedKeyword = keyword.replace(/\.TW$/i, "");
    const list = rows || [];
    const matched = list.find((row) => row.Code === normalizedKeyword) || list.find((row) => row.Name === normalizedKeyword) || list.find((row) => row.Code?.replace(/\.TW$/i, "") === normalizedKeyword) || list.find((row) => row.Name?.includes(normalizedKeyword));
    if (!matched) throw new Error(`\u627E\u4E0D\u5230 ${keyword} \u7684\u53F0\u80A1\u80A1\u50F9`);
    return matched;
  };
  var matchTpexListing = (rows, rawSymbol) => {
    const keyword = String(rawSymbol || "").trim();
    if (!keyword) throw new Error("\u8ACB\u5148\u8F38\u5165\u80A1\u7968\u4EE3\u865F");
    const normalizedKeyword = keyword.replace(/\.(TW|TWO)$/i, "");
    const list = rows || [];
    const matched = list.find((row) => row.SecuritiesCompanyCode === normalizedKeyword) || list.find((row) => row.CompanyName === normalizedKeyword) || list.find((row) => row.CompanyName?.includes(normalizedKeyword));
    if (!matched) throw new Error(`\u627E\u4E0D\u5230 ${keyword} \u7684\u4E0A\u6AC3\u80A1\u50F9`);
    return matched;
  };
  var buildTwseQuoteFromListing = (matched, rawSymbol, fetchedAt) => {
    const price = parseNumber(matched?.ClosingPrice);
    if (!price) throw new Error(`${matched?.Name || rawSymbol} \u76EE\u524D\u6C92\u6709\u53EF\u7528\u6536\u76E4\u50F9`);
    return {
      symbol: `${matched?.Code}.TW`,
      displaySymbol: matched?.Code,
      name: matched?.Name,
      price,
      currency: "TWD",
      source: "TWSE",
      fetchedAt,
      priceType: "close"
    };
  };
  var buildTpexQuoteFromListing = (matched, rawSymbol, fetchedAt) => {
    const price = parseNumber(matched?.Close);
    if (!price) throw new Error(`${matched?.CompanyName || rawSymbol} \u76EE\u524D\u6C92\u6709\u53EF\u7528\u6536\u76E4\u50F9`);
    return {
      symbol: `${matched?.SecuritiesCompanyCode}.TWO`,
      displaySymbol: matched?.SecuritiesCompanyCode,
      name: matched?.CompanyName,
      price,
      currency: "TWD",
      source: "TPEX",
      fetchedAt,
      priceType: "close"
    };
  };
  var normalizeYahooSymbol = (market, rawSymbol) => {
    const symbol = String(rawSymbol || "").trim();
    if (!symbol) return "";
    if (market === "TW") {
      if (/^\d{4,6}$/.test(symbol)) return `${symbol}.TW`;
      return symbol;
    }
    return symbol.toUpperCase();
  };
  var getYahooChartUrl = (market, rawSymbol) => {
    const symbol = normalizeYahooSymbol(market, rawSymbol);
    if (!symbol) throw new Error("\u8ACB\u5148\u8F38\u5165\u80A1\u7968\u4EE3\u865F");
    return `${STOCK_QUOTE_SOURCES.yahooChart}${encodeURIComponent(symbol)}`;
  };
  var parseYahooChart = (payload, market, rawSymbol, fetchedAt) => {
    const symbol = normalizeYahooSymbol(market, rawSymbol);
    const meta = payload?.chart?.result?.[0]?.meta || {};
    const price = Number(meta.regularMarketPrice);
    if (!price || !Number.isFinite(price)) throw new Error(`\u627E\u4E0D\u5230 ${rawSymbol} \u7684\u6700\u65B0\u80A1\u50F9`);
    return {
      symbol: meta.symbol || symbol,
      displaySymbol: meta.symbol || symbol,
      name: meta.longName || meta.shortName || meta.symbol || symbol,
      price,
      currency: meta.currency || (market === "US" ? "USD" : "TWD"),
      source: "Yahoo Finance",
      fetchedAt,
      marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1e3).toISOString() : "",
      priceType: "market"
    };
  };
  var mergeListingIntoQuote = (quote, displaySymbol, name) => ({
    ...quote,
    displaySymbol: displaySymbol || quote.displaySymbol,
    name: name || quote.name
  });
  var isNumericTWSymbol = (symbol) => /^\d{4,6}(\.TW)?$/i.test(String(symbol || "").trim());
  var getStockQuote = async ({ market = "TW", symbol = "" } = {}, { requestJson, requestListing = requestJson, now }) => {
    const normalizedMarket = market === "US" ? "US" : "TW";
    const yahoo = async (sym) => parseYahooChart(await requestJson(getYahooChartUrl(normalizedMarket, sym)), normalizedMarket, sym, now());
    if (normalizedMarket !== "TW") return yahoo(symbol);
    try {
      const listing = matchTwseListing(await requestListing(STOCK_QUOTE_SOURCES.twseListing), symbol);
      try {
        return mergeListingIntoQuote(await yahoo(listing.Code || symbol), listing.Code, listing.Name);
      } catch {
        return buildTwseQuoteFromListing(listing, symbol, now());
      }
    } catch (error) {
      try {
        const listing = matchTpexListing(await requestListing(STOCK_QUOTE_SOURCES.tpexListing), symbol);
        try {
          return mergeListingIntoQuote(await yahoo(`${listing.SecuritiesCompanyCode}.TWO`), listing.SecuritiesCompanyCode, listing.CompanyName);
        } catch {
          return buildTpexQuoteFromListing(listing, symbol, now());
        }
      } catch {
        if (isNumericTWSymbol(symbol)) {
          try {
            return await yahoo(symbol);
          } catch {
            return yahoo(`${String(symbol).trim().replace(/\.TW$/i, "")}.TWO`);
          }
        }
        throw error;
      }
    }
  };
  return __toCommonJS(src_exports);
})();
