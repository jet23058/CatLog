import CatLogKit
import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import Foundation
import GoogleSignIn
import UIKit

/// App 狀態：登入、讀取雲端資料、用 core 計算儀表板數字。
///
/// iOS 目前是唯讀預覽：只讀取並顯示資料，不寫回雲端。寫入功能會在各項功能移植時一起開放，
/// 屆時寫入前必須先通過 `compatibility.canWrite`（見 docs/DATA_FORMAT.md）。
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
    @Published public private(set) var isSigningIn = false
    @Published public private(set) var signInError: String?

    public let core: CatLogCore?
    public let appVersion: String
    private var authListener: AuthStateDidChangeListenerHandle?

    public init() {
        appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0"
        core = try? CatLogCore.bundled()

        #if DEBUG
        // 開發用：以 `-CatLogDemo` 啟動時載入範例資料，不需要 Firebase 就能檢查畫面。
        if ProcessInfo.processInfo.arguments.contains("-CatLogDemo"), let core {
            userEmail = "demo@catlog.local"
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
            try core.load(dataJSON: snapshot.dataJSON ?? "{}")
            let metaJSON = try snapshot.meta.map { try $0.jsonString() }
            compatibility = try core.compatibility(appVersion: appVersion, metaJSON: metaJSON)
            compatibilityMessage = compatibility.canWrite ? nil : try core.describe(compatibility)

            let thisYear = Calendar.current.component(.year, from: Date())
            availableYears = try core.availableYears(thisYear: thisYear)
            if !availableYears.contains(year) { year = availableYears.first ?? thisYear }
            recompute()
            phase = .ready
        } catch {
            phase = .failed(error.localizedDescription)
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

/// Firebase 初始化。沒有 GoogleService-Info.plist 時不初始化，App 會顯示設定說明。
public enum FirebaseBootstrap {
    public static func configure() {
        guard FirebaseApp.app() == nil,
              Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else { return }
        FirebaseApp.configure()
    }

    public static var isConfigured: Bool { FirebaseApp.app() != nil }

    /// Google 登入完成後的 URL 回呼。
    public static func handle(url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }
}
