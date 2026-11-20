# CatLog Web

React 18 + Vite 網頁版，部署在 Vercel。

## 啟動

用 Docker（建議）：

```bash
cp .env.example .env   # 填入 Firebase 設定
docker compose up -d   # http://localhost:3002，只開放本機連線
docker compose logs -f web
docker compose down
```

原始碼（含 `packages/core`）掛載進容器，存檔後會自動更新。

不用 Docker：在 repo 根目錄 `npm install`，再 `npm run dev`。

## 環境變數（`apps/web/.env`）

見 `.env.example`。`VITE_*` 給前端使用；`FIREBASE_PROJECT_ID` 給 `/api/stock-quote` 驗證 Firebase ID token。

## 測試與建置

```bash
npm run test:run -w @catlog/web
npm run build -w @catlog/web
```

## 目錄

```
src/          畫面與狀態（App.jsx）、Firebase 讀寫（cloudStorage.js）、登入
api/          Vercel Serverless Function：/api/stock-quote
lib/          抓價、驗證 Firebase token、限流（api 與 vite dev middleware 共用）
public/       靜態檔、PWA manifest
vercel.json   安全標頭
```

計算邏輯從 `@catlog/core` import，不要在元件內重寫。

## 部署（Vercel）

Vercel 專案的 **Root Directory 設為 `apps/web`**，並開啟「Include files outside the root directory」，讓 npm workspaces 能安裝 `@catlog/core`。
