// 簡單的固定視窗限流；serverless 每個執行個體各自計算，屬於盡力而為的保護。
export const createRateLimiter = ({ limit, windowMs, now = () => Date.now(), maxKeys = 5000 }) => {
    const buckets = new Map();
    return {
        take(key) {
            const currentTime = now();
            const bucket = buckets.get(key);
            if (!bucket || currentTime - bucket.start >= windowMs) {
                if (!bucket && buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value);
                buckets.set(key, { start: currentTime, count: 1 });
                return true;
            }
            if (bucket.count >= limit) return false;
            bucket.count += 1;
            return true;
        }
    };
};
