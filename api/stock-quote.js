import { getCachedStockQuote } from '../lib/stockQuote.js';
import { AuthError, getBearerToken, verifyFirebaseIdToken } from '../lib/verifyFirebaseToken.js';
import { createRateLimiter } from '../lib/rateLimit.js';

// 每位使用者每分鐘最多 60 次（單一 serverless 執行個體內）。
const rateLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'private, max-age=60');

    if (request.method && request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        response.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    let uid;
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
        const payload = await verifyFirebaseIdToken(getBearerToken(request.headers), { projectId });
        uid = payload.uid;
    } catch (error) {
        if (error instanceof AuthError) {
            response.status(401).json({ error: '請先登入後再抓取股價' });
        } else {
            console.error('stock-quote auth failure', error);
            response.status(500).json({ error: '股價服務暫時無法驗證登入' });
        }
        return;
    }

    if (!rateLimiter.take(uid)) {
        response.setHeader('Retry-After', '60');
        response.status(429).json({ error: '抓價太頻繁，請稍後再試' });
        return;
    }

    try {
        const quote = await getCachedStockQuote({
            market: request.query?.market || 'TW',
            symbol: request.query?.symbol || ''
        });
        response.status(200).json(quote);
    } catch (error) {
        response.status(400).json({ error: error.message || '無法抓取最新股價' });
    }
}
