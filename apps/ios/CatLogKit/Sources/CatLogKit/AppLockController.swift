import Combine
import Foundation

/// 生物辨識驗證（Face ID / Touch ID，失敗時可用裝置密碼）。App 端用 LocalAuthentication 實作，測試用假的。
public protocol DeviceAuthenticating: Sendable {
    /// 這台裝置能不能驗證；不能時回傳原因。
    func availability() -> DeviceAuthAvailability
    /// 跳出驗證畫面。使用者取消或失敗時回傳 false。
    func authenticate(reason: String) async -> Bool
}

public enum DeviceAuthAvailability: Equatable, Sendable {
    case available
    case unavailable(String)
}

/// 鎖定的時間規則，數值來自 packages/core 的 appLock.js（與 web 相同）。
public struct AppLockPolicy: Equatable, Sendable {
    public let backgroundLockInterval: TimeInterval
    public let idleLockInterval: TimeInterval

    public init(backgroundLockInterval: TimeInterval, idleLockInterval: TimeInterval) {
        self.backgroundLockInterval = backgroundLockInterval
        self.idleLockInterval = idleLockInterval
    }

    /// web 的預設值：背景 30 秒、閒置 5 分鐘。
    public static let standard = AppLockPolicy(backgroundLockInterval: 30, idleLockInterval: 5 * 60)

    /// 從 core 讀取，確保與 web 一致。
    public static func fromCore(_ bridge: CoreBridge) -> AppLockPolicy {
        guard let background = try? bridge.constant("AUTO_LOCK_BACKGROUND_MS", as: Double.self),
              let idle = try? bridge.constant("AUTO_LOCK_IDLE_MS", as: Double.self) else { return .standard }
        return AppLockPolicy(backgroundLockInterval: background / 1000, idleLockInterval: idle / 1000)
    }
}

/// Face ID 鎖定狀態，規則與 web 相同：
/// - 開啟後，App 啟動時第一個畫面就是鎖定（不會先閃出資料）
/// - 切到背景超過 30 秒、或閒置 5 分鐘，自動重新上鎖
/// - 開關存在這台裝置（UserDefaults），不同步到雲端
@MainActor
public final class AppLockController: ObservableObject {
    public static let enabledKey = "biometricLockEnabled"

    @Published public private(set) var isEnabled: Bool
    @Published public private(set) var isLocked: Bool
    @Published public private(set) var isAuthenticating = false
    @Published public private(set) var errorMessage: String?

    private let authenticator: DeviceAuthenticating
    private let policy: AppLockPolicy
    private let defaults: UserDefaults
    private let now: () -> Date
    private var backgroundedAt: Date?
    private var lastActivityAt: Date

    public init(
        authenticator: DeviceAuthenticating,
        policy: AppLockPolicy = .standard,
        defaults: UserDefaults = .standard,
        now: @escaping () -> Date = Date.init
    ) {
        self.authenticator = authenticator
        self.policy = policy
        self.defaults = defaults
        self.now = now
        let enabled = defaults.bool(forKey: Self.enabledKey)
        isEnabled = enabled
        isLocked = enabled
        lastActivityAt = now()
    }

    // MARK: - 解鎖 / 開關

    public func unlock() async {
        guard isEnabled, isLocked, !isAuthenticating else { return }
        isAuthenticating = true
        errorMessage = nil
        let success = await authenticator.authenticate(reason: "解鎖極簡貓資產")
        isAuthenticating = false
        if success {
            isLocked = false
            lastActivityAt = now()
        } else {
            errorMessage = "驗證失敗，請重試"
        }
    }

    /// 開啟前先驗證一次，確認這台裝置能用 Face ID。
    @discardableResult
    public func enable() async -> Bool {
        guard !isEnabled else { return true }
        if case .unavailable(let reason) = authenticator.availability() {
            errorMessage = reason
            return false
        }
        isAuthenticating = true
        let success = await authenticator.authenticate(reason: "開啟 Face ID 鎖定")
        isAuthenticating = false
        guard success else {
            errorMessage = "驗證失敗，沒有開啟 Face ID 鎖定"
            return false
        }
        errorMessage = nil
        defaults.set(true, forKey: Self.enabledKey)
        isEnabled = true
        isLocked = false
        lastActivityAt = now()
        return true
    }

    public func disable() {
        defaults.removeObject(forKey: Self.enabledKey)
        isEnabled = false
        isLocked = false
        errorMessage = nil
    }

    // MARK: - 自動上鎖

    public func didEnterBackground() {
        backgroundedAt = now()
    }

    /// 回到前景：背景超過 30 秒，或閒置期限在背景期間已經到了，都要上鎖。
    /// 不重設閒置計時，否則短暫切到背景就能延長閒置時間。
    public func willEnterForeground() {
        defer { backgroundedAt = nil }
        guard isEnabled, !isLocked, let backgroundedAt else { return }
        let current = now()
        if current.timeIntervalSince(backgroundedAt) >= policy.backgroundLockInterval
            || current.timeIntervalSince(lastActivityAt) >= policy.idleLockInterval {
            isLocked = true
        }
    }

    /// 使用者有操作（觸控）時呼叫。
    public func recordActivity() {
        guard !isLocked else { return }
        lastActivityAt = now()
    }

    /// 定期呼叫，閒置超過時間就上鎖。
    public func checkIdle() {
        guard isEnabled, !isLocked, backgroundedAt == nil else { return }
        if now().timeIntervalSince(lastActivityAt) >= policy.idleLockInterval {
            isLocked = true
        }
    }

    /// 立即上鎖（例如登出時，確保下次登入要重新驗證）。
    public func lockNow() {
        guard isEnabled else { return }
        isLocked = true
    }
}
