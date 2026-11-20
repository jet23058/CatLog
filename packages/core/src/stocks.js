import { normalizeDate, normalizeUSBrokerDate, parseAmount, parseCSV } from './csv.js';

export const getStockSymbolFromItem = (item = '') => {
    const normalized = item.trim();
    if (!normalized) return '';
    const dividendMatch = normalized.match(/(?:現金股息|股息)[-－](.+)$/);
    if (dividendMatch?.[1]) return dividendMatch[1].trim();
    return normalized;
};

export const getStockTradeLabel = (type) => ({
    buy: '買入',
    sell: '賣出',
    dividend: '股息',
    interest: '利息',
    deposit: '入金',
    withdrawal: '出金',
    fee: '費用'
}[type] || '其他');

export const normalizeTradeDescription = (value = '') => value.replace(/\s+/g, ' ').trim();

export const getStockTradeTitle = (trade = {}) => {
    if (trade.symbol) return trade.symbol;
    if (trade.type === 'interest') return '利息收入';
    if (trade.type === 'deposit') return '匯款入金';
    if (trade.type === 'withdrawal') return '匯款出金';
    if (trade.type === 'fee') return '手續費';
    return normalizeTradeDescription(trade.name || trade.rawItem || getStockTradeLabel(trade.type));
};

export const getStockTradeDescription = (trade = {}) => {
    const description = normalizeTradeDescription(trade.rawItem || trade.name || '');
    if (!description) return '';
    if (trade.symbol && description === trade.symbol) return '';
    if (!trade.symbol && description === getStockTradeTitle(trade)) return '';
    return description;
};

export const createHoldingRow = (overrides = {}) => ({
    id: `holding-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    market: 'TW',
    name: '',
    price: '',
    shares: '',
    ...overrides
});

export const normalizeMonthValue = (value = '') => {
    const normalized = String(value).trim().replace(/\//g, '-');
    const match = normalized.match(/^(\d{4})-(\d{1,2})$/);
    if (!match) return normalized;
    const [, year, month] = match;
    return `${year}-${month.padStart(2, '0')}`;
};

export const normalizeSnapshotVersions = (versions) => {
    if (Array.isArray(versions)) return versions.filter(Boolean);
    if (versions && typeof versions === 'object' && Array.isArray(versions.holdings)) return [versions];
    return [];
};

export const STOCK_MARKETS = [
    { value: 'TW', label: '台股' },
    { value: 'US', label: '美股' }
];

export const getStockMarketLabel = (market) => STOCK_MARKETS.find((item) => item.value === market)?.label || market || '其他';

export const isUSBrokerTransactionCSVHeaders = (headers) => (
    ['日期', '交易類別', '數量', '說明', '代號', '價格', '金額'].every((header) => headers.includes(header))
);

export const looksLikeUSBrokerPastedRows = (rows = []) => (
    rows.some((row) => /^(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})$/.test((row?.[0] || '').trim()) && (row?.[1] || '').trim())
);

export const getUSBrokerTradeType = (typeText = '', amount = 0, description = '') => {
    const normalized = typeText.trim().toLowerCase();
    const normalizedDescription = description.trim().toLowerCase();
    if (['買進', '買入', 'buy'].some((keyword) => normalized.includes(keyword))) return 'buy';
    if (['賣出', 'sell'].some((keyword) => normalized.includes(keyword))) return 'sell';
    if (['現金股息', '股息', '配息', 'dividend'].some((keyword) => normalized.includes(keyword))) return 'dividend';
    if (['利息', 'interest'].some((keyword) => normalized.includes(keyword))) return 'interest';
    if (['匯款', '入金', '存入', '存款', '轉入', 'ach deposit', 'deposit'].some((keyword) => normalized.includes(keyword))) return 'deposit';
    if (['出金', '轉出', 'withdrawal'].some((keyword) => normalized.includes(keyword))) return 'withdrawal';
    if (['手續費', '費用', 'fee'].some((keyword) => normalized.includes(keyword))) return 'fee';
    if (normalizedDescription.includes('wire funds received') || normalizedDescription.includes('rebate for wire')) return 'deposit';
    if (normalized.includes('cash') && amount > 0) return 'deposit';
    if (normalized.includes('cash') && amount < 0) return 'withdrawal';
    return 'other';
};

export const processUSBrokerTransactionRows = (rows, fieldMap, options = {}) => {
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
    const usDateFormat = options.usDateFormat || 'auto';

    const transactions = [];
    const skippedRows = [];

    rows.forEach((row, index) => {
        const csvRow = index + rowNumberOffset;
        const date = normalizeUSBrokerDate(row[idxDate], usDateFormat);
        const typeText = row[idxType]?.trim() || '';
        const symbol = row[idxSymbol]?.trim() || '';
        const description = row[idxDescription]?.trim() || symbol || typeText;
        const amountRaw = parseAmount(row[idxAmount]);
        const tradeType = getUSBrokerTradeType(typeText, amountRaw, description);
        const amount = Math.abs(amountRaw);
        const shares = Math.abs(parseAmount(row[idxQuantity]));
        const price = Math.abs(parseAmount(row[idxPrice]));

        if (!date || !typeText) {
            skippedRows.push({ row: csvRow, type: typeText || '空白', item: symbol || description || '空白', reason: '缺少日期或交易類別' });
            return;
        }

        if (tradeType === 'other') {
            skippedRows.push({ row: csvRow, type: typeText || '空白', item: symbol || description || '空白', reason: '尚未支援的美股交易類型' });
            return;
        }

        if (!amount && !['buy', 'sell'].includes(tradeType)) {
            skippedRows.push({ row: csvRow, type: typeText || '空白', item: symbol || description || '空白', reason: '金額為 0' });
            return;
        }

        if (['buy', 'sell', 'dividend'].includes(tradeType) && !symbol) {
            skippedRows.push({ row: csvRow, type: typeText || '空白', item: description || '空白', reason: '缺少股票代號' });
            return;
        }

        transactions.push({
            id: `stock-us-broker-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            source: 'csv-us-broker-transactions',
            market: 'US',
            currency: 'USD',
            date,
            type: tradeType,
            symbol: ['buy', 'sell', 'dividend'].includes(tradeType) ? symbol : '',
            name: description.split(/\r?\n/)[0]?.replace(/^\*+/, '').trim() || symbol || typeText,
            rawItem: description,
            amount,
            signedAmount: amountRaw,
            shares,
            price,
            balance: 0,
            account: idxAccount >= 0 ? row[idxAccount]?.trim() || '' : '',
            unassigned: tradeType === 'dividend' && !symbol,
            memo: typeText
        });
    });

    return { market: 'US', importMode: 'us-broker-transactions', transactions, skippedRows };
};

export const processUSBrokerTransactionCSVRows = (rows, headers, options = {}) => processUSBrokerTransactionRows(rows.slice(1), {
    idxDate: headers.indexOf('日期'),
    idxType: headers.indexOf('交易類別'),
    idxQuantity: headers.indexOf('數量'),
    idxDescription: headers.indexOf('說明'),
    idxSymbol: headers.indexOf('代號'),
    idxAccount: headers.indexOf('賬戶類別'),
    idxPrice: headers.indexOf('價格'),
    idxAmount: headers.indexOf('金額')
}, { rowNumberOffset: 2, usDateFormat: options.usDateFormat });

export const processUSBrokerTransactionPastedRows = (rows, options = {}) => processUSBrokerTransactionRows(rows, {
    idxDate: 0,
    idxType: 1,
    idxQuantity: 2,
    idxDescription: 3,
    idxSymbol: 4,
    idxAccount: 5,
    idxPrice: 6,
    idxAmount: 7
}, { rowNumberOffset: 1, usDateFormat: options.usDateFormat });

export const isArchivedUSRealizedCSVHeaders = (headers) => (
    headers.includes('代號') && headers.includes('調整後成本') && headers.includes('賣出收入')
);

export const processArchivedUSRealizedCSVRows = (rows, headers, options = {}) => {
    const idxSymbol = headers.indexOf('代號');
    const idxName = headers.indexOf('詳細資訊');
    const idxQuantity = headers.indexOf('數量');
    const idxOpenDate = headers.indexOf('開倉日期');
    const idxCloseDate = headers.indexOf('平倉日期');
    const idxProceeds = headers.indexOf('賣出收入');
    const idxCost = headers.indexOf('調整後成本');
    const idxWashSaleLoss = headers.indexOf('WS Loss Disallowed');

    if ([idxSymbol, idxOpenDate, idxCloseDate, idxProceeds, idxCost].some((idx) => idx === -1)) {
        throw new Error("美股已平倉損益 v1 格式不符，找不到代號、開倉/平倉日期、賣出收入或調整後成本欄位");
    }

    const transactions = [];
    const skippedRows = [];

    rows.slice(1).forEach((row, index) => {
        const symbol = row[idxSymbol]?.trim() || '';
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
                memo: '封存 v1 美股平倉損益匯入：調整後成本'
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
                memo: washSaleLoss ? '封存 v1 美股平倉損益匯入：賣出收入 + WS Loss Disallowed' : '封存 v1 美股平倉損益匯入：賣出收入'
            });
        }
    });

    return { market: 'US', importMode: 'archived-us-realized', isArchived: true, transactions, skippedRows };
};

export const processStockCSVText = (csvText, options = {}) => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) throw new Error("CSV 檔案是空的");

    const headers = rows[0].map((header) => header.trim());
    if (isUSBrokerTransactionCSVHeaders(headers)) {
        return processUSBrokerTransactionCSVRows(rows, headers, options);
    }

    if (looksLikeUSBrokerPastedRows(rows)) {
        return processUSBrokerTransactionPastedRows(rows, options);
    }

    if (isArchivedUSRealizedCSVHeaders(headers)) {
        if (!options.allowArchivedUSRealized) {
            throw new Error("美股已平倉損益 v1 匯入格式已封存。新的美股匯入會改走完整券商交易明細；若只是要補救舊資料，請使用下方「封存 v1 格式預覽」。");
        }
        return processArchivedUSRealizedCSVRows(rows, headers, options);
    }

    const hasTWHeaders = headers.includes('日期') && headers.includes('項目');
    const idxType = hasTWHeaders ? headers.indexOf('類型') : 0;
    const idxDate = hasTWHeaders ? headers.indexOf('日期') : 1;
    const idxItem = hasTWHeaders ? headers.indexOf('項目') : 2;
    const idxBuy = hasTWHeaders ? headers.indexOf('股票買入') : 3;
    const idxDeposit = hasTWHeaders ? headers.indexOf('存入戶頭') : 4;
    const idxBalance = hasTWHeaders ? headers.indexOf('帳面餘額') : 5;

    if (idxDate === -1 || idxItem === -1) throw new Error("CSV 格式不符，找不到日期或項目欄位");

    const dataRows = hasTWHeaders ? rows.slice(1) : rows;
    if (!hasTWHeaders) {
        const looksLikePasteFormat = dataRows.some((row) => normalizeDate(row[idxDate]) && row[idxItem]?.trim());
        if (!looksLikePasteFormat) throw new Error("CSV 格式不符，找不到日期或項目欄位");
    }

    const transactions = [];
    const skippedRows = [];

    dataRows.forEach((row, index) => {
        const typeText = idxType >= 0 ? row[idxType]?.trim() : '';
        const date = normalizeDate(row[idxDate]);
        const item = row[idxItem]?.trim() || '';
        const buyAmount = idxBuy >= 0 ? parseAmount(row[idxBuy]) : 0;
        const depositAmount = idxDeposit >= 0 ? parseAmount(row[idxDeposit]) : 0;
        const balance = idxBalance >= 0 ? parseAmount(row[idxBalance]) : 0;
        const normalizedType = typeText.replace(/\s+/g, '');
        const actualRowNumber = index + 1 + (hasTWHeaders ? 1 : 0);

        if (!date || !item) {
            skippedRows.push({ row: actualRowNumber, type: typeText || '空白', item: item || '空白', reason: '缺少日期或項目' });
            return;
        }

        if (normalizedType.includes('質押')) {
            skippedRows.push({ row: actualRowNumber, type: typeText || '空白', item, reason: '質押借款已由負債模組追蹤，匯入股票績效時會自動略過' });
            return;
        }

        let tradeType = 'other';
        let amount = 0;
        let symbol = getStockSymbolFromItem(item);
        const isDividendRow = typeText.includes('股息') || /^現金股息/.test(item) || /^股息[-－]/.test(item);

        if (typeText.includes('匯款')) {
            tradeType = depositAmount > 0 ? 'deposit' : 'withdrawal';
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
            skippedRows.push({ row: actualRowNumber, type: typeText || '空白', item, reason: '金額為 0' });
            return;
        }

        if (tradeType === 'other') {
            skippedRows.push({ row: actualRowNumber, type: typeText || '空白', item, reason: '尚未支援的交易類型' });
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

export const getHeaderIndex = (headers, candidates) => candidates.map((name) => headers.indexOf(name)).find((idx) => idx >= 0) ?? -1;

export const processStockHoldingCSVText = (csvText, fallbackMonth, note = '') => {
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
