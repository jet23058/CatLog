import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { getStockQuote } from './lib/stockQuote.js'

const { version: appVersion } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // 相容性檢查用的 App 版本（見 docs/DATA_FORMAT.md）
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
