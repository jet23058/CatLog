import { describe, expect, it } from 'vitest';
import { AUTO_LOCK_BACKGROUND_MS, AUTO_LOCK_IDLE_MS, PRIVACY_MASK, isIdleExpired, maskAmount, shouldLockOnResume } from './index.js';

describe('App 鎖定規則', () => {
    it('背景超過 30 秒才重新上鎖', () => {
        expect(AUTO_LOCK_BACKGROUND_MS).toBe(30_000);
        expect(shouldLockOnResume(1_000, 1_000 + 29_999)).toBe(false);
        expect(shouldLockOnResume(1_000, 1_000 + 30_000)).toBe(true);
        expect(shouldLockOnResume(null, 999_999)).toBe(false);
    });

    it('閒置 5 分鐘自動上鎖', () => {
        expect(AUTO_LOCK_IDLE_MS).toBe(300_000);
        expect(isIdleExpired(0, 299_999)).toBe(false);
        expect(isIdleExpired(0, 300_000)).toBe(true);
        expect(isIdleExpired(null, 1e12)).toBe(false);
    });

    it('隱私模式遮蔽金額', () => {
        expect(maskAmount('1,234 萬', true)).toBe(PRIVACY_MASK);
        expect(maskAmount('1,234 萬', false)).toBe('1,234 萬');
    });
});
