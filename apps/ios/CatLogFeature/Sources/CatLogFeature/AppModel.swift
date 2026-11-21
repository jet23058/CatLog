import CatLogKit
import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import Foundation
import GoogleSignIn
import UIKit

/// App 狀態：登入、讀取雲端資料、用 core 計算儀表板數字。
///
/// 寫入規則與 web 相同（apps/web/src/App.jsx 的 saveToFirestoreChunks）：
/// - 寫入前必須通過 `compatibility.canWrite`（見 docs/DATA_FORMAT.md）
/// - 帶著上次讀到 / 寫入的 revision，雲端較新時不覆蓋，交給使用者選擇
/// - 寫入成功後才更新畫面上的資料，失敗不會留下「看起來存了但其實沒存」的狀態
@MainActor
public final class AppModel: ObservableObject {
    public enum Phase: Equatable {
        /// 缺少 GoogleService-Info.plist 等設定。
        case needsSetup
        case signedOut
        case loading
        case ready
        case failed(String)
    }

    @Published public private(set) var phase: Phase = .signedOut
    @Published public private(set) var userEmail: String?
    @Published public private(set) var availableYears: [Int] = []
    @Published public var year: Int = Calendar.current.component(.year, from: Date()) {
        didSet { if oldValue != year { recompute() } }
    }
    @Published public private(set) var yearStats: YearStats?
    @Published public private(set) var months: [MonthlyStat] = []
    /// 有任何資料的月份（YYYY-MM），每月列表用來決定哪些月份可以打開明細。
    @Published public private(set) var dataMonths: Set<String> = []
    @Published public private(set) var fire: FireStats?
    @Published public private(set) var compatibility: Compatibility = .writable
    @Published public private(set) var compatibilityMessage: String?
    @Published public private(set) var isSaving = false
    /// 最後一次成功讀取或寫入雲端的時間（同步狀態顯示用）。
    @Published public private(set) var lastSyncedAt: Date?
    /// 最後一次存檔失敗的訊息；之後成功存檔或重新讀取時清空。
    @Published public private(set) var lastSaveError: String?
    /// 每次資料變動 +1，讓月份明細等畫面知道要重新讀取。
    @Published public private(set) var dataVersion = 0
    /// 雲端已被其他裝置更新，這次存檔沒有寫入；等使用者決定載入雲端或覆蓋。
    @Published public var conflict: PendingConflict?
    /// 其他裝置存檔後提示重新載入。
    @Published public private(set) var remoteUpdateAvailable = false
    @Published public private(set) var isSigningIn = false
    @Published public private(set) var signInError: String?

    public let core: CatLogCore?
    public let appVersion: String
    private var authListener: AuthStateDidChangeListenerHandle?
    private var metaListener: ListenerRegistration?
    private var revision = 0
    private var chunkIds: [String] = []
    private var isDemo = false

    /// 這台裝置的識別碼，寫在 meta/storage 的 deviceId，用來分辨是不是別台裝置存的。
    private static let deviceId: String = {
        let key = "cloudDeviceId"
        if let existing = UserDefaults.standard.string(forKey: key) { return existing }
        let id = "ios-" + UUID().uuidString.prefix(8).lowercased()
        UserDefaults.standard.set(id, forKey: key)
        return id
    }()

    public init() {
        appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0"
        core = try? CatLogCore.bundled()

        #if DEBUG
        // 開發用：以 `-CatLogDemo` 啟動時載入範例資料，不需要 Firebase 就能檢查畫面。
        if ProcessInfo.processInfo.arguments.contains("-CatLogDemo"), let core {
            userEmail = "demo@catlog.local"
            isDemo = true
            loadDemo(core: core)
            return
        }
        #endif

        guard FirebaseBootstrap.isConfigured, core != nil else {
            phase = .needsSetup
            return
        }
        authListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in self?.handleAuthChange(user) }
        }
    }

    // MARK: - 登入

    public func signIn() async {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            signInError = "GoogleService-Info.plist 缺少 CLIENT_ID，請在 Firebase 啟用 Google 登入後重新下載。"
            return
        }
        guard let presenter = Self.topViewController() else { return }
        isSigningIn = true
        signInError = nil
        defer { isSigningIn = false }
        do {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
            guard let idToken = result.user.idToken?.tokenString else {
                signInError = "Google 沒有回傳登入憑證"
                return
            }
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: result.user.accessToken.tokenString)
            try await Auth.auth().signIn(with: credential)
        } catch let error as GIDSignInError where error.code == .canceled {
            // 使用者取消，不顯示錯誤。
        } catch {
            signInError = error.localizedDescription
        }
    }

    public func signOut() {
        GIDSignIn.sharedInstance.signOut()
        try? Auth.auth().signOut()
    }

    // MARK: - 資料

    public func reload() async {
        guard let core, let uid = Auth.auth().currentUser?.uid else { return }
        phase = .loading
        do {
            let repository = CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge)
            let snapshot = try await repository.read()
            revision = snapshot.revision
            chunkIds = snapshot.chunkIds
            remoteUpdateAvailable = false
            try core.load(dataJSON: snapshot.dataJSON ?? "{}")
            let metaJSON = try snapshot.meta.map { try $0.jsonString() }
            compatibility = try core.compatibility(appVersion: appVersion, metaJSON: metaJSON)
            compatibilityMessage = compatibility.canWrite ? nil : try core.describe(compatibility)

            let thisYear = Calendar.current.component(.year, from: Date())
            availableYears = try core.availableYears(thisYear: thisYear)
            if !availableYears.contains(year) { year = availableYears.first ?? thisYear }
            recompute()
            dataVersion += 1
            lastSyncedAt = Date()
            lastSaveError = nil
            phase = .ready
            listenForRemoteChanges(uid: uid)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    // MARK: - 寫入

    public struct PendingConflict: Identifiable, Equatable {
        public let id = UUID()
        public let dataJSON: String
        public let remoteRevision: Int
    }

    public enum SaveOutcome: Equatable {
        case saved
        case conflict
        case failed(String)
    }

    /// 新增資產到指定日期並存檔。
    public func addAssets(_ entries: [AssetEntry], dateKey: String) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try core.addingAssets(entries, to: dateKey)) } catch { return .failed(error.localizedDescription) }
    }

    /// 新增一筆收入並存檔。
    public func addIncome(_ entry: IncomeEntry, dateKey: String) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try core.addingIncome(entry, to: dateKey)) } catch { return .failed(error.localizedDescription) }
    }

    /// 新增負債：與 web 相同，先重新讀取雲端最新資料、合併負債後再新增，避免蓋掉其他裝置剛新增的負債。
    public func addDebt(_ input: DebtInput, dateKey: String) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        var cloudJSON: String?
        var cloudRevision: (revision: Int, chunkIds: [String])?
        if !isDemo {
            guard let uid = Auth.auth().currentUser?.uid else { return .failed("尚未登入") }
            do {
                let snapshot = try await CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge).read()
                // 只用在這次寫入：寫入成功後 save() 才會更新本機的 revision 與資料，
                // 失敗時兩者都維持原狀，不會出現「版本號是新的、資料是舊的」。
                cloudRevision = (snapshot.revision, snapshot.chunkIds)
                if let meta = try snapshot.meta?.jsonString() {
                    let result = try core.compatibility(appVersion: appVersion, metaJSON: meta)
                    if !result.canWrite {
                        compatibility = result
                        compatibilityMessage = try? core.describe(result)
                        return .failed(compatibilityMessage ?? "這個版本的 App 無法寫入雲端資料，請先更新。")
                    }
                }
                cloudJSON = try snapshot.dataJSON.map { try core.bridge.callJSON("normalizeAppData", [.json($0)]) }
            } catch {
                return .failed("無法取得最新雲端資料，為避免覆蓋既有負債，這次沒有寫入。")
            }
        }
        do {
            let id = "debt-\(Int(Date().timeIntervalSince1970 * 1000))"
            return await save(dataJSON: try core.addingDebt(input, id: id, cloudDataJSON: cloudJSON, dateKey: dateKey), basedOn: cloudRevision)
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    /// 新增負債異動並存檔。
    public func addDebtEvent(_ input: DebtEventInput) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do {
            let id = "event-\(Int(Date().timeIntervalSince1970 * 1000))"
            return await save(dataJSON: try core.addingDebtEvent(input, id: id))
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    /// 儲存月份明細的編輯（資產、收入、負債、備忘錄一起寫回）。
    public func saveMonthEdit(_ draft: MonthEditDraft) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try core.updatingMonth(draft)) } catch { return .failed(error.localizedDescription) }
    }

    /// 刪除整個月的資產、負債、備忘錄與負債異動（收入與花費保留）。
    public func deleteMonth(_ monthKey: String) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try core.deletingMonth(monthKey)) } catch { return .failed(error.localizedDescription) }
    }

    /// 匯入 JSON 備份：整份取代雲端資料（與 web 相同）。
    public func importBackup(_ preview: BackupImportPreview) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try core.importingBackup(preview)) } catch { return .failed(error.localizedDescription) }
    }

    /// 匯入 MOZE 花費：只覆蓋 CSV 裡出現的月份。
    public func importExpenses(_ preview: ExpenseImportPreview) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try core.mergingExpenses(preview)) } catch { return .failed(error.localizedDescription) }
    }

    /// 由 core 算出變更後的完整資料再存檔（個股績效的匯入、清空、持倉快照都走這裡）。
    public func saveChange(_ build: (CatLogCore) throws -> String) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        do { return await save(dataJSON: try build(core)) } catch { return .failed(error.localizedDescription) }
    }

    /// 寫入雲端；成功後才更新畫面資料。
    /// - basedOn：資料是以這份雲端版本為基礎做出來的（新增負債會先重新讀取雲端）；nil 時用本機最後讀到 / 寫入的版本。
    public func save(dataJSON: String, force: Bool = false, basedOn base: (revision: Int, chunkIds: [String])? = nil) async -> SaveOutcome {
        guard let core else { return .failed("core 無法載入") }
        guard compatibility.canWrite else {
            return .failed(compatibilityMessage ?? "這個版本的 App 無法寫入雲端資料，請先更新。")
        }
        if conflict != nil && !force { return .conflict }
        if isDemo {
            do { try core.load(dataJSON: dataJSON); refreshAfterChange(core: core); return .saved } catch { return .failed(error.localizedDescription) }
        }
        guard let uid = Auth.auth().currentUser?.uid else { return .failed("尚未登入") }

        isSaving = true
        defer { isSaving = false }
        do {
            let repository = CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge)
            let result = try await repository.write(
                dataJSON: dataJSON,
                expectedRevision: base?.revision ?? revision,
                force: force,
                previousChunkIds: base?.chunkIds ?? chunkIds,
                deviceId: Self.deviceId
            )
            revision = result.revision
            chunkIds = result.chunkIds
            conflict = nil
            remoteUpdateAvailable = false
            try core.load(dataJSON: dataJSON)
            refreshAfterChange(core: core)
            lastSyncedAt = Date()
            lastSaveError = nil
            return .saved
        } catch CloudStorageError.conflict(let remoteRevision, _) {
            conflict = PendingConflict(dataJSON: dataJSON, remoteRevision: remoteRevision)
            return .conflict
        } catch {
            lastSaveError = error.localizedDescription
            return .failed(error.localizedDescription)
        }
    }

    // MARK: - 雲端歷史版本

    /// 雲端歷史版本，新到舊。
    public func cloudHistory() async throws -> [HistoryEntry] {
        guard let core, !isDemo, let uid = Auth.auth().currentUser?.uid else { return [] }
        return try await CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge).listHistory()
    }

    /// 某個歷史版本的完整資料，包成備份檔格式（匯出與預覽還原共用）。
    public func historyBackupText(_ entry: HistoryEntry) async throws -> String {
        guard let core, let uid = Auth.auth().currentUser?.uid else { throw CoreBridgeError.coreNotLoaded }
        let dataJSON = try await CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge).readVersion(entry)
        return try core.bridge.callString("createBackupText", [.json(dataJSON)])
    }

    // MARK: - 診斷與修復（開發版）

    /// 只讀不寫，回報雲端資料塊、checksum 與解析狀態。
    public func diagnoseCloud() async throws -> CloudDiagnostics {
        guard let core, let uid = Auth.auth().currentUser?.uid else { throw CoreBridgeError.coreNotLoaded }
        return try await CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge).diagnose(core: core)
    }

    /// 用 JSON 備份覆蓋雲端資料（與 web 的「用 JSON 備份修復」相同），成功後重新讀取。回傳要顯示的訊息。
    public func repair(fromBackup text: String) async -> String {
        guard let core, let uid = Auth.auth().currentUser?.uid else { return "尚未登入" }
        isSaving = true
        defer { isSaving = false }
        do {
            let dataJSON = try core.repairDataJSON(fromBackup: text)
            let repository = CloudRepository(store: FirestoreChunkStore(uid: uid), core: core.bridge)
            _ = try await repository.write(dataJSON: dataJSON, expectedRevision: 0, force: true, deviceId: Self.deviceId)
            await reload()
            return "已用 JSON 備份重建雲端資料。"
        } catch {
            return "修復失敗：\(error.localizedDescription)"
        }
    }

    /// 衝突時：放棄這次的變更，載入雲端最新版本。
    public func resolveConflictByReloading() async {
        conflict = nil
        await reload()
    }

    /// 衝突時：用這台裝置的資料覆蓋雲端。
    public func resolveConflictByOverwriting() async -> SaveOutcome {
        guard let pending = conflict else { return .saved }
        return await save(dataJSON: pending.dataJSON, force: true)
    }

    private func refreshAfterChange(core: CatLogCore) {
        dataVersion += 1
        let thisYear = Calendar.current.component(.year, from: Date())
        availableYears = (try? core.availableYears(thisYear: thisYear)) ?? availableYears
        recompute()
    }

    /// 監看 meta/storage：其他裝置存檔後提示重新載入；雲端要求較新版本時立即切成唯讀。
    private func listenForRemoteChanges(uid: String) {
        metaListener?.remove()
        guard let core else { return }
        metaListener = FirestoreChunkStore(uid: uid).metaRef.addSnapshotListener { [weak self] snapshot, _ in
            guard let data = snapshot?.data() else { return }
            let meta = CloudMeta(firestore: data)
            Task { @MainActor in
                guard let self else { return }
                if (meta.revision ?? 0) > self.revision && meta.deviceId != Self.deviceId {
                    self.remoteUpdateAvailable = true
                }
                if let json = try? meta.jsonString(),
                   let result = try? core.compatibility(appVersion: self.appVersion, metaJSON: json),
                   !result.canWrite {
                    self.compatibility = result
                    self.compatibilityMessage = try? core.describe(result)
                }
            }
        }
    }

    #if DEBUG
    private func loadDemo(core: CatLogCore) {
        do {
            try core.load(dataJSON: DemoData.json)
            availableYears = try core.availableYears(thisYear: 2026)
            year = 2026
            recompute()
            phase = .ready
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
    #endif

    private func recompute() {
        guard let core, core.bridge.hasLoadedData else { return }
        do {
            yearStats = try core.yearStats(year: year)
            months = try core.monthlyStats(year: year)
            dataMonths = Set(try core.dataMonths())
            fire = try core.fireStats()
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func handleAuthChange(_ user: User?) {
        userEmail = user?.email
        if user == nil {
            phase = .signedOut
            yearStats = nil
            months = []
            dataMonths = []
            metaListener?.remove()
            metaListener = nil
            revision = 0
            chunkIds = []
            conflict = nil
            remoteUpdateAvailable = false
            fire = nil
        } else {
            Task { await reload() }
        }
    }

    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var top = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}

/// Firebase 初始化：Debug 連測試站（GoogleService-Info-Debug.plist），Release 連正式站（-Release）。
/// 找不到設定檔時不初始化，App 會顯示設定說明。
public enum FirebaseBootstrap {
    #if DEBUG
    public static let configFileName = "GoogleService-Info-Debug"
    #else
    public static let configFileName = "GoogleService-Info-Release"
    #endif

    public static func configure() {
        guard FirebaseApp.app() == nil,
              let path = Bundle.main.path(forResource: configFileName, ofType: "plist"),
              let options = FirebaseOptions(contentsOfFile: path) else { return }
        FirebaseApp.configure(options: options)
    }

    /// 目前連線的 Firebase 專案（顯示在帳號選單，避免分不清測試站與正式站）。
    public static var projectID: String? { FirebaseApp.app()?.options.projectID }

    public static var isConfigured: Bool { FirebaseApp.app() != nil }

    /// Google 登入完成後的 URL 回呼。
    public static func handle(url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }
}
