export const getLatestSnapshotTotal = (records = {}, targetDateStr, calculator) => {
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

export const getLatestSnapshotItems = (records = {}, targetDateStr) => {
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

export const getLatestSnapshotDate = (records = {}, targetDateStr) => {
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

