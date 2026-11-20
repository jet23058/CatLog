# 架構

## 總覽

```
┌─────────── apps/web (React) ──────────┐   ┌────────── apps/ios (SwiftUI，規劃中) ─────────┐
│ UI：React + Recharts                  │   │ UI：SwiftUI + Swift Charts                    │
│ 生物辨識：WebAuthn                     │   │ 生物辨識：Face ID（LocalAuthentication）        │
│ 匯入：Dropbox Chooser / 貼上            │   │ 匯入：系統檔案選擇器 / 貼上                      │
│ 雲端讀寫：src/cloudStorage.js           │   │ 雲端讀寫：Firebase iOS SDK（同一套規則）          │
│ core：直接 import '@catlog/core'        │   │ core：dist/catlog-core.js 在 JavaScriptCore 執行 │
└──────────────────┬────────────────────┘   └──────────────────┬───────────────────────────┘
                   └───────────────── packages/core ────────────┘
                        資料格式・計算・匯入解析（只有一份）
                                       │
             Firebase Auth + Firestore（同一份資料）・Vercel /api/stock-quote
```

## 分工原則

| 放哪裡 | 內容 | 規則 |
|---|---|---|
| `packages/core` | 資料預設值與正規化、負債 / 質押利息、持倉快照、CSV 解析、證券交易匯入、花費匯入、備份格式、差異比對、金額格式化 | 只能是純函式。不可 import React / Firebase，不可用 `window`、`document`、`localStorage`、`fetch`。由 `core.test.js` 的純度檢查把關。 |
| `apps/web` | 畫面、狀態管理、Firebase 讀寫、WebAuthn、Dropbox、抓價 API | 計算一律呼叫 core，不在元件裡重寫 |
| `apps/ios` | 畫面、狀態管理、Firebase 讀寫、Face ID、檔案匯入 | 計算一律透過 JavaScriptCore 呼叫 core |

需要平台能力的動作（抓股價、讀檔案、存取雲端）留在各 app，計算結果交給 core。

## iOS 如何執行 core

1. `npm run build:jsc -w @catlog/core` 用 esbuild 把 core 打包成單一檔 `packages/core/dist/catlog-core.js`，全域名稱是 `CatLogCore`。
2. iOS 專案把這個檔案放進 App bundle，用 `JSContext` 載入。
3. Swift 呼叫 `CatLogCore.<函式>`，傳入與回傳都是 JSON 相容的資料，再轉成 Swift 型別。

CI 每次都會打包一次，確保 core 隨時能在 JavaScriptCore 執行。

## 目前進度

- ✅ monorepo 結構、`packages/core` 抽出第一批純函式（95 個）
- ⏳ 仍在 `apps/web/src/App.jsx` 元件內的計算：年度統計、FIRE 試算、區間統計、個股損益彙總、對帳單核對。下一步逐一抽到 core。
- ⏳ 資料格式加入 `schemaVersion` / `minClientVersion`（見 [DATA_FORMAT.md](DATA_FORMAT.md)）
- ⏳ `apps/ios` 骨架
