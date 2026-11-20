# 開發規則

## 功能對等

web 與 iOS 的功能必須一致。

- 新功能在**同一個 PR**（或同一個版本）內完成 core、web、iOS 三部分。
- 某一邊還沒做完時，用 feature flag 先藏起來，等兩邊都好再一起開放。
- 上線後更新 README 的[功能對照表](README.md#功能對照表)。
- 只修單一平台的 bug 不受此限，用該平台的 PATCH 版本發布。

## 計算放在 core

- 任何會影響數字的邏輯（金額、利息、損益、統計、匯入解析）都放 `packages/core`，並附上測試。
- web / iOS 只負責畫面與平台功能，不重寫計算。
- core 不可依賴平台 API，純度檢查在 `packages/core/src/core.test.js`。

## 資料格式

改動雲端資料結構前，先讀並更新 [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md)。

## 版本與發布

- `MAJOR.MINOR` 兩平台共用，`PATCH` 各自獨立。
- Tag：`web-vX.Y.Z`、`ios-vX.Y.Z`。
- [CHANGELOG.md](CHANGELOG.md) 每條標上 `[core]`、`[web]`、`[iOS]`。

## 本機開發

- Node.js 22（CI 跑 20 / 22）。web 建議用 Docker：`cd apps/web && docker compose up -d`。
- commit 前 husky 會跑 `npm run test:run`。
