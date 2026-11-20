import '@testing-library/jest-dom';

// Node 25+ 內建 Web Storage：沒帶 --localstorage-file 時 globalThis.localStorage 是 undefined，
// 而且會蓋掉 jsdom 的版本。這裡補一個記憶體版本，讓測試在 Node 20 / 22 / 26 行為一致。
const createMemoryStorage = () => {
    let store = new Map();
    return {
        get length() { return store.size; },
        key: (i) => [...store.keys()][i] ?? null,
        getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
        setItem: (k, v) => { store.set(String(k), String(v)); },
        removeItem: (k) => { store.delete(String(k)); },
        clear: () => { store = new Map(); },
    };
};
for (const name of ['localStorage', 'sessionStorage']) {
    if (!globalThis[name]) {
        Object.defineProperty(globalThis, name, { value: createMemoryStorage(), configurable: true, writable: true });
    }
}

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock createRange for some UI components if needed
document.createRange = () => {
    const range = new Range();
    range.getBoundingClientRect = () => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    });
    range.getClientRects = () => ({
        item: () => null,
        length: 0,
        [Symbol.iterator]: function* () { },
    });
    return range;
};

