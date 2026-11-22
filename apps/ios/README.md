# CatLog iOS

SwiftUI 原生版。畫面是 SwiftUI，計算邏輯在 JavaScriptCore 裡執行 `packages/core`，與 web 共用同一份程式碼，所以兩邊數字一定一致。

> 目前可以檢視所有統計，**新增**資產、收入、負債與負債異動，在月份明細**編輯 / 刪除**當月資料，並**匯出 / 匯入備份**與**匯入 MOZE 花費**；證券交易匯入請先用網頁版。
>
> 寫入規則與 web 相同：帶著上次讀到的版本號寫入，雲端已被其他裝置更新時不覆蓋，讓你選擇載入雲端版本或用這台覆蓋；資料版本不相容時不寫入。

## 隱私與鎖定

規則與 web 相同（時間定義在 `packages/core/src/appLock.js`）：

- **Face ID 鎖定**：右上角帳號選單開啟。開啟時先驗證一次；之後 App 啟動時第一個畫面就是鎖定，切到背景超過 30 秒或閒置 5 分鐘會重新上鎖（短暫切到背景不會重算閒置時間），登出後也會重新上鎖。Face ID 失敗可改輸入裝置密碼。鎖定時不建立任何資料畫面，多工切換畫面也會蓋上遮罩。
- **隱私模式**：右上角眼睛圖示，金額顯示為 `****`，比例照常顯示。
- 兩個設定都只存在這台裝置，不同步到雲端。

在模擬器測試 Face ID：

```bash
xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged 1
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.enrollmentChanged
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit_Sim.pearl.match     # 比對成功
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit_Sim.pearl.nomatch   # 比對失敗
```

## 結構

```
apps/ios/
├── CatLog.xcodeproj      App 專案（只有 App 進入點，其他都在 Swift Package）
├── CatLog/               App 進入點、Info.plist（放 GoogleService-Info.plist 的地方）
├── Config/               Base.xcconfig（版本號、Bundle ID）、Local.xcconfig（個人設定，不進版控）
├── CatLogFeature/        畫面、Google 登入、Firestore 存取（相依 Firebase、GoogleSignIn）
└── CatLogKit/            非 UI 邏輯，沒有第三方相依
    ├── CoreBridge        在 JavaScriptCore 執行 Resources/catlog-core.js
    ├── CatLogCore        core 函式的 Swift 包裝（年度統計、FIRE、相容性…）
    ├── AppLockController Face ID 自動上鎖規則（與 web 相同）
    └── CloudRepository   雲端儲存格式 v3 讀寫（規則同 apps/web/src/cloudStorage.js）
```

`CatLogKit/Sources/CatLogKit/Resources/catlog-core.js` 是從 `packages/core` 產生的檔案，**不要手改**。改了 core 之後執行：

```bash
npm run build:ios -w @catlog/core
```

CI 會檢查這個檔案有沒有跟 core 同步。

## 第一次設定

需要 Xcode 16 以上（以 Xcode 27.2 測試）。

App 依建置設定連到不同的 Firebase 專案，開發時不會碰到正式資料：

| 建置設定 | Firebase 專案 | 設定檔 |
|---|---|---|
| Debug（模擬器、Xcode 執行） | 測試站 `assets-e4a73` | `CatLog/GoogleService-Info-Debug.plist` |
| Release（TestFlight、上架） | 正式站 `asset-prod` | `CatLog/GoogleService-Info-Release.plist` |

每個建置設定只打包自己那一份（`Base.xcconfig` 的 `EXCLUDED_SOURCE_FILE_NAMES`）。App 帳號選單會顯示目前連的是「測試站」還是「正式站」。

1. **在兩個 Firebase 專案都註冊 iOS App**：Firebase Console → 專案設定 → 新增應用程式 → iOS，Bundle ID 填 `Config/Base.xcconfig` 的 `CATLOG_BUNDLE_ID`（預設 `work.cloudjet.catlog`）。
2. 下載兩份 `GoogleService-Info.plist`，分別改名成 `GoogleService-Info-Debug.plist`（測試站）與 `GoogleService-Info-Release.plist`（正式站），放到 `apps/ios/CatLog/`（已列入 `.gitignore`）。
3. 複製設定範本並填入：
   ```bash
   cp apps/ios/Config/Local.xcconfig.example apps/ios/Config/Local.xcconfig
   ```
   - `GOOGLE_REVERSED_CLIENT_ID_Debug` / `_Release`：兩份設定檔各自的 `REVERSED_CLIENT_ID`（Google 登入回到 App 用）
   - `CATLOG_DEVELOPMENT_TEAM`：Apple Developer Team ID（實機執行與上架需要）
4. 用 Xcode 開啟 `apps/ios/CatLog.xcodeproj`，選 `CatLog` scheme 執行。

沒有對應的設定檔時 App 仍可執行，會顯示設定說明。

### 裝到實體 iPhone

1. 用傳輸線接上 iPhone、解鎖並「信任這部電腦」；iPhone 設定 → 隱私權與安全性 → 開啟「開發者模式」。
2. Xcode → Settings → Accounts 登入 Apple ID，把 Team ID 填進 `Config/Local.xcconfig` 的 `CATLOG_DEVELOPMENT_TEAM`。免費帳號裝的 App 7 天後失效，重新安裝即可。
3. 在 Mac **本機**（Warp / 終端機）執行：
   ```bash
   apps/ios/scripts/install-device.sh
   ```
   會建置 Debug 版（連測試站）、簽章、安裝並打開。簽章需要登入鑰匙圈，遠端連線（SSH）沒辦法簽。
4. 第一次打開若顯示「未信任的開發者」：iPhone 設定 → 一般 → VPN 與裝置管理 → 信任。

#### 從遠端（SSH）安裝

SSH 讀不到登入鑰匙圈，所以改由 Mac 登入環境裡的 LaunchAgent 執行 `install-device.sh`：

```sh
apps/ios/scripts/setup-launch-agent.sh   # 只需一次；移除：setup-launch-agent.sh remove
apps/ios/scripts/remote-install.sh       # 之後每次安裝
```

要驗證正式站時用 `remote-install.sh --production`：安裝連正式站 asset-prod 的 Release 版，並以「這台裝置唯讀」啟動（不會寫入任何資料，之後可在 App 右上角帳號選單關閉）。已經在正式站使用、只是更新 App 時用 `remote-install.sh --production-update`，不會重設成唯讀。

LaunchAgent 只有在執行 `remote-install.sh` 時才會跑（不會開機自動執行或排程）。需要 Mac 保持登入**而且螢幕沒有鎖定**（鎖定或睡眠時登入鑰匙圈會鎖住，簽章會失敗，出現 `errSecInternalComponent`）、iPhone 接著線；紀錄在 `~/Library/Logs/catlog-install-device.log`。

### 發行與自動重新簽章（免費 Apple 帳號）

免費帳號簽的 App 7 天後就打不開，所以手機上用的是**發行版本**（最新的 `ios-vX.Y.Z` tag），並定期重新簽章：

```bash
apps/ios/scripts/setup-launch-agent.sh schedule    # 建立排程：每週一、四 09:00 自動重新簽章並安裝
apps/ios/scripts/resign-release.sh                 # 也可以手動馬上跑一次
apps/ios/scripts/setup-launch-agent.sh unschedule  # 移除排程
```

- 在 `~/Library/Application Support/CatLog/release-worktree` 另開一個 git worktree 切到最新的 `ios-v*` tag 建置，不會動到開發用的工作區；`Local.xcconfig` 與 `GoogleService-Info-*.plist` 從開發工作區複製過去。
- 安裝的是連正式站的 Release 版，保留手機上的設定（同 `--production-update`）。
- 需要 Mac 已登入且螢幕沒鎖、iPhone 接線或與 Mac 在同一個 Wi-Fi；錯過排程時間（Mac 睡眠）時，醒來後會補跑。
- 成功或失敗都會跳 macOS 通知；最近一次結果在 `~/Library/Logs/catlog-resign-status.txt`，完整紀錄在 `~/Library/Logs/catlog-resign.log`。
- 發行新版本：合併後打 `ios-vX.Y.Z` tag 並推上 GitHub，下一次排程就會裝新版。

### 不用 Firebase 檢查畫面

Debug 建置以 `-CatLogDemo` 啟動會載入範例資料（Xcode：Scheme → Run → Arguments）。

## 測試

```bash
# CatLogKit：JavaScriptCore 橋接、雲端讀寫、與 web 共用的 fixture（直接在 Mac 上跑）
swift test --package-path apps/ios/CatLogKit

# App 建置（CI 用；不簽章，只確認能編譯）
xcodebuild build -project apps/ios/CatLog.xcodeproj -scheme CatLog \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO
```

要裝進模擬器實際使用時，**不要**加 `CODE_SIGNING_ALLOWED=NO`：沒有簽章的 App 在模擬器無法使用鑰匙圈，Firebase 存不了登入狀態，每次開啟都要重新登入。改用本機簽章（不需要 Apple 開發者帳號）：

```bash
xcodebuild build -project apps/ios/CatLog.xcodeproj -scheme CatLog \
  -destination 'platform=iOS Simulator,name=iPhone 17' CODE_SIGN_IDENTITY=-
```

`CloudRepositoryTests` 直接讀取 `packages/core/fixtures/cloud-storage-v3.json`：這個檔案由 web 的 `writeCloudData` 實際寫出，iOS 測試必須讀出相同內容，確保兩邊讀寫格式一致。

## 版本號

- `MARKETING_VERSION`（`Config/Base.xcconfig`）：與 web 共用 `MAJOR.MINOR`，見根目錄 README。
- `CURRENT_PROJECT_VERSION`：CI 以執行次數覆寫。
- App 讀到比自己新的資料格式，或版本低於雲端的 `minClientVersion` 時會切成唯讀（見 `docs/DATA_FORMAT.md`）。

## 相依套件

Firebase iOS SDK 與 GoogleSignIn 定義在 `CatLogFeature/Package.swift`，鎖定版本記錄在 `CatLog.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`。目前沒有交給 Dependabot，升級時在 Xcode 執行 File → Packages → Update to Latest Package Versions，跑過測試後一起 commit。
