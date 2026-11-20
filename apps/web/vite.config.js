import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getStockQuote } from './lib/stockQuote.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-stock-quote-api',
      configureServer(server) {
        server.middlewares.use('/api/stock-quote', async (req, res) => {
          try {
            const requestUrl = new URL(req.url || '', 'http://localhost');
            const quote = await getStockQuote({
              market: requestUrl.searchParams.get('market') || 'TW',
              symbol: requestUrl.searchParams.get('symbol') || ''
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(quote));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: error.message || '無法抓取最新股價' }));
          }
        });
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
