export const detectDelimitedTextSeparator = (text = '') => {
    const sample = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5)
        .join('\n');

    const tabCount = (sample.match(/\t/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    return tabCount > commaCount ? '\t' : ',';
};

export const parseCSV = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuote = false;
    const separator = detectDelimitedTextSeparator(text);
    const normalizedText = (separator === ','
        ? text.replace(/，/g, ',')
        : text
    ).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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

export const parseAmount = (value) => {
    if (value === undefined || value === null) return 0;
    const normalized = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
    return Number(normalized) || 0;
};

export const normalizeDate = (value) => {
    if (!value) return '';
    const parts = String(value).trim().replace(/\//g, '-').split('-');
    if (parts.length !== 3) return String(value).trim();
    const [year, month, day] = parts;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const normalizeUSDate = (value) => {
    if (!value) return '';
    const parts = String(value).trim().replace(/\//g, '-').split('-');
    if (parts.length !== 3) return String(value).trim();
    const [month, day, year] = parts;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const normalizeUSBrokerDate = (value, format = 'auto') => {
    if (!value) return '';
    const parts = String(value).trim().replace(/\//g, '-').split('-');
    if (parts.length !== 3) return String(value).trim();

    const normalizedFormat = format === 'ymd' || format === 'mdy' ? format : 'auto';
    const shouldUseYmd = normalizedFormat === 'ymd' || (normalizedFormat === 'auto' && /^\d{4}$/.test(parts[0]));
    if (shouldUseYmd) {
        const [year, month, day] = parts;
        return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const [month, day, year] = parts;
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};
