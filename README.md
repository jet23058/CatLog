# CatLog 📊

**CatLog** 是一個現代化、介面精美的個人資產與投資組合追蹤應用程式。專為重視數據分析的投資者設計，提供直觀的資產增長趨勢、月度收支管理，以及深度的個股績效分析。

![Version](https://img.shields.io/badge/version-2.7.0-teal.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ 特色功能

### 🔥 FIRE 目標計算器 (New!)
- **即時試算**: 根據歷史花費自動計算「平均月支出」與「預估年支出」。
- **參數調整**: 支援自訂「提領率 (Withdrawal Rate)」，模擬不同退休情境。
- **進度追蹤**: 視覺化呈現 FIRE 目標達成率 (Progress Bar) 與年度花費統計。

### 💳 對帳單核對
- **智能篩選**: 可依照帳戶別 (信用卡/現金) 與日期區間篩選交易紀錄。
- **快速核銷**: 互動式勾選核對，即時計算已確認金額，協助精準理財。

### 📈 投資組合分析
- **個股績效模組**: 專屬的「個股績效分析」儀表板。
- **持倉分佈**: 自動計算持倉佔比 (Pie Chart) 與市值分佈。
- **損益追蹤**: 結合 CSV 交易紀錄與每月浮動資產，精確計算未實現損益與報酬率 (ROI)。
- **配息現金流**: 視覺化呈現每月/年度股息收入，掌握被動收入趨勢。

### 📊 財務視覺化
- **年度資產趨勢**: 互動式 Area Chart，支援跨年份比較。
- **收支結構**: 自動統計花費類別，提供 Top 5 開銷分析。
- **綜合損益指標**: 獨家綜合評分算法，結合「收入成長」與「資產累積」雙重指標。

### 💰 全方位資產管理
- **多維度紀錄**: 整合資產總額 (固定/浮動)、月收入、月結餘與備忘錄。
- **智慧匯入**: 
  - **MOZE 記帳**: 支援 CSV 花費匯入與自動分類 (Local / Dropbox)。
  - **證券戶交易**: 支援特定格式的 CSV 交易紀錄匯入 (股息/買賣)。
- **智能匯率快取**: 
  - 自動記憶當月外幣匯率，跨功能 (收入/資產) 共享，減少重複輸入。
- **年度統計卡片**: 快速檢視年度資產增長率、平均月收與資產高點。

### ☁️ 企業級雲端架構
- **Google 登入**: 整合 Firebase Authentication，安全便利。
- **即時同步**: 資料即時寫入 Firestore，多裝置無縫接軌。
- **智能分塊技術**: 針對大量歷史數據實作 Chunking 機制，突破 Firestore 單一文件限制，確保極速載入。

## 🛠️ 技術棧

- **Frontend**: React 18, Vite
- **UI System**: Tailwind CSS (Custom Theme: Amber/Blue), Lucide Icons
- **Visualization**: Recharts
- **Backend/Cloud**: Firebase (Auth, Firestore)
- **Deployment**: Vercel
- **Testing**: Vitest, React Testing Library
- **CI/CD**: GitHub Actions

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定環境變數
請在專案根目錄建立 `.env` 檔案，並填入 Firebase 設定：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_DROPBOX_APP_KEY=your_dropbox_app_key (Optional: for Dropbox Import)
```

### 3. 啟動開發伺服器
```bash
npm run dev
```
開啟瀏覽器訪問 `http://localhost:5173`。

### 4. 執行測試
支援完整的單元測試與整合測試：

```bash
# 執行所有測試
npm test

# UI 測試模式
npm run test:ui
```

### 5. CI/CD
本專案已整合 GitHub Actions，在 `main` 分支的 Push 與 PR 事件將自動觸發 CI 流程，執行所有測試案例以確保程式碼品質。

## 📝 版本紀錄

- **v2.7.0** (Current)
  - 花費匯入優化：支援退款 (Refund) 識別與合併模式。
  - 隱私模式：新增一鍵隱藏金額功能，保護敏感資訊。
  - 匯入確認：新增詳細差異預覽 (Detailed Diff) 與明細展開功能。

- **v2.6.0**
  - 品牌重塑：更名為 **CatLog**。
  - 工程優化：導入 Vitest 測試框架與 GitHub Actions CI/CD。
  - 雲端整合：支援 **Dropbox** 直接匯入花費 CSV。
  - 體驗優化：新增 **智能匯率快取** 功能，提升多幣別記帳效率。
  - 介面升級：全新 Amber/Blue 主題色調。

- **v2.5.0**
  - 品牌重塑前導：視覺風格更新。
  - 介面優化：背景與互動體驗改善。

- **v2.1.0**
  - 新增 **個股績效分析** 模組。
  - 支援證券交易 CSV 匯入。
  - App 更名為 **CatLog**。

- **v2.0.0**
  - 整合 Firebase 雲端儲存與身份驗證。
  - 新增年度資產統計卡片與詳細 Tooltip 分析。
  - 資料分塊 (Chunking) 優化。

- **v1.2.0**
  - 使用 React + Vite 重構。
  - 基礎資產記錄功能。

## 📄 License
MIT

---
Developed by Jet & Antigravity