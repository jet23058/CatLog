# 資料格式

web 與 iOS 讀寫同一份雲端資料，這份文件是兩邊共同遵守的約定。改動前先更新這裡。

## 版本號分工

| 版本 | 目前 | 什麼時候升 |
|---|---|---|
| 產品版本（`package.json`） | 3.0.0 | 發版時，規則見 README |
| 雲端儲存格式 | v3 | 切塊、指標文件的存放方式改變時 |
| `schemaVersion`（資料內容結構） | 尚未加入 | 資料欄位結構改變、需要遷移時 +1 |
| 備份檔 `BACKUP_VERSION` | 2 | JSON 備份檔格式改變時 |

## 雲端儲存格式 v3

實作：`apps/web/src/cloudStorage.js`

```
users/{uid}/meta/storage             指標文件：revision、generation、chunkCount、checksum、length
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

1. **不認得的欄位原封不動保留並寫回。** `normalizeAppData()` 已用展開運算保留額外欄位，iOS 也必須如此，避免舊版 App 刪掉新版加的資料。
2. 只新增欄位、不改既有欄位意義時，不需要遷移，也不升 `schemaVersion`。
3. 需要改結構時（規劃中）：
   - 在 core 加入 `migrate(data)`，`schemaVersion + 1`。
   - 在 `meta/storage` 設定 `minClientVersion`。低於此版本的 App 會提示更新並停止寫入。
   - 產品版本升 MAJOR。
