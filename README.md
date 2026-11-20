# 極簡貓資產 (CatLog) 📊

**極簡貓資產** 是一個介面精美的個人資產與投資組合追蹤 App：資產淨值趨勢、負債與質押追蹤、月度收支、FIRE 試算，以及台股 / 美股個股績效分析。

目前提供 **web 版**，**iOS 原生版（SwiftUI）規劃中**。兩邊共用同一份雲端資料，也共用同一份計算核心，所以同一筆資料在兩邊算出來的數字一定一樣。

![Release](https://img.shields.io/github/v/tag/jet23058/CatLog?label=release)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> 📖 完整功能說明：[docs/FEATURES.md](docs/FEATURES.md)　・　專案計劃：[PROJECT_PLAN.md](PROJECT_PLAN.md)　・　版本紀錄：[CHANGELOG.md](CHANGELOG.md)

## 功能對照表

| 功能 | Web | iOS |
|---|:---:|:---:|
| Google 登入、雲端同步 | ✅ | 🚧 |
| 資產 / 收入 / 花費 / 備忘錄紀錄 | ✅ | 🚧 |
| 年度資產趨勢與統計 | ✅ | 🚧 |
| 負債、股票質押與利息估算 | ✅ | 🚧 |
| 個股績效（台股 / 美股） | ✅ | 🚧 |
| 持倉快照與最新估值 | ✅ | 🚧 |
| FIRE 計算機、區間統計、對帳單核對 | ✅ | 🚧 |
| MOZE 花費 CSV / 證券交易 / JSON 備份匯入 | ✅ | 🚧 |
| 生物辨識鎖 | ✅ WebAuthn | 🚧 Face ID |
| 隱私模式 | ✅ | 🚧 |

✅ 已支援　🚧 規劃中　— 新功能必須兩邊一起上線，規則見 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Repo 結構

```
CatLog/
├── apps/
│   └── web/             React + Vite 網頁版（含 Vercel API：/api/stock-quote）
├── packages/
│   └── core/            共用核心：資料格式、計算、匯入解析（web 直接 import，iOS 用 JavaScriptCore 執行）
├── firebase/            Firestore Security Rules
├── docs/                架構、資料格式、功能說明
└── .github/workflows/   CI
```

iOS 專案會放在 `apps/ios/`。架構說明見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 快速開始

需要 Docker（建議 [OrbStack](https://orbstack.dev/)）或 Node.js 22。

1. 複製環境變數範本，填入 Firebase 設定：
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```
2. 啟動 web 開發伺服器（Docker）：
   ```bash
   cd apps/web && docker compose up -d
   ```
   開啟 <http://localhost:3002>。不用 Docker 的話，在根目錄執行 `npm install` 再 `npm run dev`。
3. 執行全部測試（web + core）：
   ```bash
   npm run test:run
   ```

各子專案的細節：[apps/web](apps/web/README.md)　・　[packages/core](packages/core/README.md)

## 版本號規則

- **產品版本 `MAJOR.MINOR.PATCH`**：`MAJOR.MINOR` 由 web 與 iOS 共用（相同代表功能一致），`PATCH` 各平台獨立。
- **Git tag**：`web-v4.2.3`、`ios-v4.2.0`，標在整個 repo 的 commit 上。
- **iOS build number**：CI 執行次數，持續遞增。
- **資料格式版本**：與產品版本分開管理，見 [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md)。

## 技術棧

- **Web**：React 18、Vite、Tailwind CSS、Recharts、Lucide Icons
- **iOS（規劃中）**：SwiftUI、Swift Charts、JavaScriptCore
- **雲端**：Firebase Auth、Firestore；Vercel（web 部署與抓價 API）
- **測試 / CI**：Vitest、React Testing Library、GitHub Actions

## License
MIT

---
Developed by Jet & Antigravity
