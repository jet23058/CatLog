# @catlog/core

web 與 iOS 共用的計算核心：資料格式、負債與質押利息、持倉快照、CSV 與證券交易匯入、花費匯入、備份格式、差異比對、金額格式化。

## 規則

- 只放純函式：輸入資料、回傳結果。
- 不可依賴 React、Firebase、瀏覽器 API（`window`、`document`、`localStorage`、`fetch`）或 `import.meta.env`。它會在 iOS 的 JavaScriptCore 裡執行，那裡沒有這些東西。
- `src/core.test.js` 的純度檢查會擋下違規。
- 需要「今天 / 今年」的函式，一律由呼叫端傳入日期，core 不自己讀時間。

## 模組

| 檔案 | 內容 |
|---|---|
| `data.js` | 預設資料、`normalizeAppData`、匯率預設值、備份檔格式 |
| `debts.js` | 負債快照、延續、股票質押利率與利息估算、利率調整事件 |
| `snapshots.js` | 依日期取最近一次資產快照 |
| `csv.js` | CSV / tab 解析、金額與日期正規化 |
| `stocks.js` | 台股 / 美股交易匯入、持倉快照匯入 |
| `expenses.js` | MOZE 花費 CSV 匯入、花費差異 |
| `diff.js` | JSON 備份匯入差異比對 |
| `format.js` | 金額、百分比、萬元格式 |
| `schema.js` | `schemaVersion`、資料遷移、版本比較、App 相容性檢查 |
| `dashboard.js` | 年度統計、每月資產趨勢、年度高低點、FIRE |
| `rangeStats.js` | 區間統計（收入、資產、負債、花費、財務推估）、對帳單核對；`getRangeStats`、「近 N 個月」快捷區間 |
| `stockAnalysis.js` | 持倉快照、個股損益、市場統計、質押分攤、最新估值、損益標籤；`getStockOverview` 一次取得整頁資料 |
| `monthDetail.js` | 月份明細：當月資產、有效負債與異動、預估利息、花費類別、前後月份與比較 |
| `records.js` | 新增資產 / 收入 / 負債 / 負債異動，月份明細的編輯與刪除：幣別換算、重複檢查、帶入上次資產、負債合併與延續、欄位檢查、寫入資料 |
| `appLock.js` | Face ID 自動上鎖時間（背景 30 秒、閒置 5 分鐘）、隱私模式遮罩 |
| `storageFormat.js` | 雲端儲存格式 v3：切塊、checksum、舊格式解析（web 與 iOS 共用） |
| `index.js` | 公開入口 |

## 指令

```bash
npm run test:run -w @catlog/core    # 測試
npm run build:jsc -w @catlog/core   # 打包成 dist/catlog-core.js（檢查用）
npm run build:ios -w @catlog/core   # 打包進 apps/ios 的 CatLogKit（改了 core 必須執行並 commit）
```
