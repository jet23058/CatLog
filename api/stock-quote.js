import { getStockQuote } from '../lib/stockQuote.js';

export default async function handler(request, response) {
    const market = request.query?.market || 'TW';
    const symbol = request.query?.symbol || '';

    try {
        const quote = await getStockQuote({ market, symbol });
        response.status(200).json(quote);
    } catch (error) {
        response.status(400).json({ error: error.message || '無法抓取最新股價' });
    }
}
