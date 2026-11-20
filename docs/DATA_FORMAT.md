# 資料格式

web 與 iOS 讀寫同一份雲端資料，這份文件是兩邊共同遵守的約定。改動前先更新這裡。

## 版本號分工

| 版本 | 目前 | 什麼時候升 |
|---|---|---|
| 產品版本（`package.json`） | 3.0.0 | 發版時，規則見 README |
| 雲端儲存格式 | v3 | 切塊、指標文件的存放方式改變時 |
| `schemaVersion`（資料內容結構） | 1 | 資料欄位結構改變、需要遷移時 +1 |
| 備份檔 `BACKUP_VERSION` | 2 | JSON 備份檔格式改變時 |

## 雲端儲存格式 v3

實作：`apps/web/src/cloudStorage.js`

```
users/{uid}/meta/storage             指標文件：revision、generation、chunkCount、checksum、length、
                                     schemaVersion、minClientVersion
users/{uid}/chunks/{generation}_{i}  資料塊：{ index, content, generation }
```

- 整份 App 資料序列化成 JSON 字串，每 250,000 字元切一塊。
- **寫入**：先寫完新 generation 的所有資料塊，再用 transaction 確認 `revision` 沒變、切換指標並 `revision + 1`。中途斷線時指標仍指向舊 generation。
- **讀取**：依指標讀出資料塊，檢查數量、長度與 checksum（cyrb53），不符就停止寫入。
- **衝突**：雲端 `revision` 比本機新時，不覆蓋，讓使用者選擇載入雲端或覆蓋。
- 權限與欄位限制見 `firebase/firestore.rules`。

## 資料內容

預設結構與正規化：`packages/core/src/data.js` 的 `INITIAL_DATA`、`normalizeAppData()`。

```
records               資產紀錄，依日期
memos                 備忘錄，依日期
incomes               收入，依月份
expenses              花費，依月份
debts                 負債快照，依日期
debtEvents            負債異動，依月份
stockTransactions     股票交易（陣列）
stockHoldingSnapshots 持倉快照，依月份
fireSettings          { withdrawalRate }
```

## 相容規則（web 與 iOS 都必須遵守）

實作：`packages/core/src/schema.js`

1. **不認得的欄位原封不動保留並寫回。** `normalizeAppData()` 用展開運算保留額外欄位，iOS 也必須如此，避免舊版 App 刪掉新版加的資料。
2. **`schemaVersion` 存在資料 JSON 裡。** 讀進來時 `normalizeAppData()` 會呼叫 `migrateData()` 升級舊資料；寫入前也會再升級一次，所以新使用者的第一筆資料也有版本號。比 App 新的 `schemaVersion` 不會被降版。
3. **`meta/storage` 也記錄 `schemaVersion` 與 `minClientVersion`。** 每次存檔由 `buildMetaVersionFields()` 產生：`minClientVersion` 取「原本的值」與「目前 schema 要求的最低版本」中較大者，只升不降，所以可以在 Firestore 手動調高來強制舊 App 更新。
4. **App 讀資料時用 `checkCompatibility()` 判斷能不能寫：**
   - 資料或 meta 的 `schemaVersion` 比 App 支援的新 → 唯讀。
   - App 版本低於 `minClientVersion` → 唯讀。
   - 唯讀時畫面顯示「需要更新 App」，所有存檔、匯入、覆蓋都會被擋下。其他裝置存檔後若 meta 要求更新版本，開著的畫面也會立即切成唯讀。
5. **App 版本號**：web 取自 `apps/web/package.json` 的 `version`（建置時注入為 `__APP_VERSION__`）。iOS 用 `CFBundleShortVersionString`。

> 3.0.0 以前已部署的 web 不認得 meta 的版本欄位，存檔時會把它們洗掉；但資料 JSON 裡的 `schemaVersion` 會被保留，所以新版 App 讀到時仍能正確判斷。

### 要改資料結構時

1. 在 `schema.js` 的 `MIGRATIONS` 加一個函式（把 n 升到 n + 1），`CURRENT_SCHEMA_VERSION + 1`。
2. 在 `SCHEMA_MIN_CLIENT_VERSION` 登記新 schema 需要的最低 App 版本（就是這次要發布的版本）。
3. 補上遷移測試，並更新這份文件的「資料內容」。
4. web 與 iOS 一起發布，產品版本升 MAJOR。
