// App 鎖定與隱私模式的共用規則（web 與 iOS 相同）。
// 「現在時間」一律由呼叫端傳入（毫秒）。

// 切到背景超過這個時間，回來時重新上鎖。
export const AUTO_LOCK_BACKGROUND_MS = 30 * 1000;
// 沒有任何操作超過這個時間，自動上鎖。
export const AUTO_LOCK_IDLE_MS = 5 * 60 * 1000;
// 隱私模式下取代金額的文字。
export const PRIVACY_MASK = '****';

// 從背景回到前景時是否要上鎖。hiddenAt 為切到背景的時間；沒有切到背景時為 null。
export const shouldLockOnResume = (hiddenAt, now) => (
    hiddenAt !== null && hiddenAt !== undefined && now - hiddenAt >= AUTO_LOCK_BACKGROUND_MS
);

// 是否已閒置過久。
export const isIdleExpired = (lastActivityAt, now) => (
    lastActivityAt !== null && lastActivityAt !== undefined && now - lastActivityAt >= AUTO_LOCK_IDLE_MS
);

// 隱私模式時把金額文字換成遮罩。
export const maskAmount = (text, isPrivacyMode) => (isPrivacyMode ? PRIVACY_MASK : text);
