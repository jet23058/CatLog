# CatLog iOS

SwiftUI 原生版。畫面是 SwiftUI，計算邏輯在 JavaScriptCore 裡執行 `packages/core`，與 web 共用同一份程式碼，所以兩邊數字一定一致。

> 目前是**唯讀預覽**：登入後可以檢視年度統計、FIRE 與每月資產，新增與編輯請先用網頁版。

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
    └── CloudRepository   雲端儲存格式 v3 讀寫（規則同 apps/web/src/cloudStorage.js）
```

`CatLogKit/Sources/CatLogKit/Resources/catlog-core.js` 是從 `packages/core` 產生的檔案，**不要手改**。改了 core 之後執行：

```bash
npm run build:ios -w @catlog/core
```

CI 會檢查這個檔案有沒有跟 core 同步。

## 第一次設定

需要 Xcode 16 以上（以 Xcode 27.2 測試）。

1. **在 Firebase 註冊 iOS App**：Firebase Console → 專案設定 → 新增應用程式 → iOS，Bundle ID 填 `Config/Base.xcconfig` 的 `CATLOG_BUNDLE_ID`（預設 `work.cloudjet.catlog`）。
2. 下載 `GoogleService-Info.plist`，放到 `apps/ios/CatLog/`（已列入 `.gitignore`）。
3. 複製設定範本並填入：
   ```bash
   cp apps/ios/Config/Local.xcconfig.example apps/ios/Config/Local.xcconfig
   ```
   - `GOOGLE_REVERSED_CLIENT_ID`：`GoogleService-Info.plist` 裡的 `REVERSED_CLIENT_ID`（Google 登入回到 App 用）
   - `CATLOG_DEVELOPMENT_TEAM`：Apple Developer Team ID（實機執行與上架需要）
4. 用 Xcode 開啟 `apps/ios/CatLog.xcodeproj`，選 `CatLog` scheme 執行。

沒有 `GoogleService-Info.plist` 時 App 仍可執行，會顯示設定說明。

### 不用 Firebase 檢查畫面

Debug 建置以 `-CatLogDemo` 啟動會載入範例資料（Xcode：Scheme → Run → Arguments）。

## 測試

```bash
# CatLogKit：JavaScriptCore 橋接、雲端讀寫、與 web 共用的 fixture（直接在 Mac 上跑）
swift test --package-path apps/ios/CatLogKit

# App 建置
xcodebuild build -project apps/ios/CatLog.xcodeproj -scheme CatLog \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO
```

`CatLogKitTests/Fixtures` 連到 `packages/core/fixtures`：`cloud-storage-v3.json` 由 web 的 `writeCloudData` 實際寫出，iOS 測試必須讀出相同內容，確保兩邊讀寫格式一致。

## 版本號

- `MARKETING_VERSION`（`Config/Base.xcconfig`）：與 web 共用 `MAJOR.MINOR`，見根目錄 README。
- `CURRENT_PROJECT_VERSION`：CI 以執行次數覆寫。
- App 讀到比自己新的資料格式，或版本低於雲端的 `minClientVersion` 時會切成唯讀（見 `docs/DATA_FORMAT.md`）。

## 相依套件

Firebase iOS SDK 與 GoogleSignIn 定義在 `CatLogFeature/Package.swift`，鎖定版本記錄在 `CatLog.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`。目前沒有交給 Dependabot，升級時在 Xcode 執行 File → Packages → Update to Latest Package Versions，跑過測試後一起 commit。
