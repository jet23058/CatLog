# 專案計劃書：極簡貓資產 (CatLog)

## 1. 專案概述 (Project Overview)

**極簡貓資產 (CatLog)** 是一款專為個人設計的「極簡主義」資產管理 Progressive Web App (PWA)。

不同於傳統記帳軟體專注於瑣碎的流水帳，CatLog 的核心價值在於**「關注資產淨值與長期成長」**。透過直觀的圖表與高度隱私的設計，協助使用者掌握財務健康狀況，並邁向 FIRE (Financial Independence, Retire Early) 目標。

### 核心價值
*   **極簡 (Minimalism)**：介面乾淨無廣告，專注於最重要的資產數據。
*   **隱私 (Privacy)**：數據掌握在使用者手中，支援生物辨識鎖定與畫面遮蔽。
*   **成長 (Growth)**：強調資產累積與被動收入的比例，而非單純的省錢。

---

## 2. 功能模組 (Feature Modules)

### 2.1 儀表板 (Dashboard)
*   **資產總覽**：即時顯示年度總資產、與上月/去年相比的增長金額與比例。
*   **視覺化圖表**：
    *   資產趨勢圖 (Area Chart)：追蹤每月資產消長。
    *   收支結構：分析收入年增長率與被動收入佔比。
*   **極值追蹤**：自動記錄年度資產最高與最低點。

### 2.2 資料管理 (Data Management)
*   **資產紀錄**：支援固定資產與浮動資產紀錄，按日追蹤。
*   **收支紀錄**：彈性的收入與花費輸入。
*   **智慧匯入 (Smart Import)**：
    *   支援外部記帳軟體 (如 Moze) CSV 匯入。
    *   **自動識別退款**：智慧判斷正數金額（退款/收益）並正確沖銷花費。
    *   **合併模式**：匯入時僅更新特定月份資料，保障歷史數據安全。
    *   **差異預覽**：匯入前提供詳細的數據變動預覽 (Diff View)。

### 2.3 進階工具 (Advanced Tools)
*   **FIRE 計算機**：根據設定的提領率 (4% Rule)，計算財務自由進度與目標金額。
*   **區間統計**：自訂日期範圍，分析特定期間的資產變化與收支結餘。
*   **個股績效**：(規劃中) 簡單追蹤特定投資標的表現。

### 2.4 系統設定
*   **跨裝置同步**：基於 Firebase 的即時雲端同步。
*   **備份與還原**：支援完整 JSON 格式匯出與匯入，確保資料可攜性。
*   **PWA 支援**：可安裝於 iOS/Android 主畫面，提供原生 App 般的操作體驗。

---

## 3. 安全性與隱私 (Security & Privacy)

本專案將「使用者隱私」視為最高優先級，實作了金融級別的保護措施：

### 3.1 生物辨識鎖定 (Biometric Lock)
*   採用 **WebAuthn API** 標準。
*   支援 **Face ID / Touch ID** 與 Android 生物辨識。
*   App 啟動或從背景喚醒時強制鎖定，防止未經授權的存取。

### 3.2 隱私遮蔽模式 (Privacy Mode)
*   **一鍵切換**：頂部導覽列快速切換「顯示/隱藏」敏感金額。
*   **全域遮蔽**：所有資產、收入、增長率等數字均以 `****` 取代。
*   **防窺機制**：隱私模式下自動停用 Tooltip 與詳細資訊氣泡框，避免滑鼠誤觸洩露資訊。

---

## 4. 技術架構 (Technical Architecture)

### 前端 (Frontend)
*   **Framework**: React 18 (Vite)
*   **Styling**: Tailwind CSS (RWD 設計)
*   **Charts**: Recharts (響應式圖表)
*   **Icons**: Lucide React

### 後端與服務 (Backend & Services)
*   **Authentication**: Firebase Auth (Google Sign-In)
*   **Database**: Firestore (NoSQL，支援離線快取)
*   **Hosting**: Firebase Hosting
*   **Security**: Web Authentication API (WebAuthn)

### 測試 (Testing)
*   **Unit/Integration Test**: Vitest + React Testing Library
*   **Coverage**: 涵蓋核心邏輯、匯入流程與 UI 互動。

---

## 5. 版本歷程 (Version History)

*   **v2.8.0**: 新增 WebAuthn 生物辨識鎖定 (Face ID)。
*   **v2.7.0**: 品牌更名為「極簡貓資產」，優化隱私模式與匯入確認機制。
*   **v2.6.0**: 導入詳細的 CSV 匯入合併邏輯與退款處理。
*   **v1.0 - v2.5**: 基礎架構建立、圖表功能、FIRE 計算機實作。

---

## 6. 未來展望 (Roadmap)

*   [ ] **多幣別支援**：更完善的匯率換算與多幣種資產總計。
*   [ ] **預算規劃**：簡單的月度預算提醒功能。
*   [ ] **AI 財務助理**：整合 LLM 分析消費習慣並提供建議。
*   [ ] **深色模式 (Dark Mode)**：提供夜間瀏覽選項。
