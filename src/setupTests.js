import '@testing-library/jest-dom';

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

