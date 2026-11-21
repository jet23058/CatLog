import XCTest
@testable import CatLogKit

private final class FakeAuthenticator: DeviceAuthenticating, @unchecked Sendable {
    var availabilityResult: DeviceAuthAvailability = .available
    var results: [Bool] = []
    private(set) var reasons: [String] = []

    func availability() -> DeviceAuthAvailability { availabilityResult }

    func authenticate(reason: String) async -> Bool {
        reasons.append(reason)
        return results.isEmpty ? false : results.removeFirst()
    }
}

@MainActor
final class AppLockControllerTests: XCTestCase {
    private var defaults: UserDefaults!
    private var clock = Date(timeIntervalSince1970: 1_000_000)
    private let auth = FakeAuthenticator()

    override func setUp() {
        defaults = UserDefaults(suiteName: "AppLockControllerTests-\(UUID().uuidString)")
    }

    private func makeController() -> AppLockController {
        AppLockController(authenticator: auth, policy: .standard, defaults: defaults, now: { [unowned self] in self.clock })
    }

    func testPolicyMatchesCore() throws {
        XCTAssertEqual(AppLockPolicy.fromCore(try CoreBridge.bundled()), .standard)
    }

    func testDisabledByDefaultAndNeverLocks() {
        let lock = makeController()
        XCTAssertFalse(lock.isEnabled)
        XCTAssertFalse(lock.isLocked)
        clock += 3600
        lock.checkIdle()
        XCTAssertFalse(lock.isLocked)
    }

    func testEnableRequiresAuthenticationAndPersists() async {
        let lock = makeController()
        auth.results = [false]
        let first = await lock.enable()
        XCTAssertFalse(first)
        XCTAssertFalse(lock.isEnabled)

        auth.results = [true]
        let second = await lock.enable()
        XCTAssertTrue(second)
        XCTAssertTrue(lock.isEnabled)
        XCTAssertFalse(lock.isLocked)

        // 下次啟動 App：第一個畫面就是鎖定
        let relaunched = makeController()
        XCTAssertTrue(relaunched.isEnabled)
        XCTAssertTrue(relaunched.isLocked)
    }

    func testEnableFailsWhenDeviceHasNoBiometrics() async {
        auth.availabilityResult = .unavailable("這台裝置沒有設定 Face ID 或密碼")
        let lock = makeController()
        let enabled = await lock.enable()
        XCTAssertFalse(enabled)
        XCTAssertEqual(lock.errorMessage, "這台裝置沒有設定 Face ID 或密碼")
        XCTAssertTrue(auth.reasons.isEmpty)
    }

    func testUnlock() async {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        XCTAssertTrue(lock.isLocked)

        auth.results = [false]
        await lock.unlock()
        XCTAssertTrue(lock.isLocked)
        XCTAssertEqual(lock.errorMessage, "驗證失敗，請重試")

        auth.results = [true]
        await lock.unlock()
        XCTAssertFalse(lock.isLocked)
        XCTAssertNil(lock.errorMessage)
    }

    func testBackgroundLocksAfter30Seconds() async {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        auth.results = [true]
        await lock.unlock()

        lock.didEnterBackground()
        clock += 29
        lock.willEnterForeground()
        XCTAssertFalse(lock.isLocked)

        lock.didEnterBackground()
        clock += 30
        lock.willEnterForeground()
        XCTAssertTrue(lock.isLocked)
    }

    func testIdleLocksAfter5MinutesAndActivityResets() async {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        auth.results = [true]
        await lock.unlock()

        clock += 4 * 60
        lock.recordActivity()
        clock += 4 * 60
        lock.checkIdle()
        XCTAssertFalse(lock.isLocked)

        clock += 60
        lock.checkIdle()
        XCTAssertTrue(lock.isLocked)
    }

    func testShortBackgroundDoesNotExtendIdleDeadline() async {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        auth.results = [true]
        await lock.unlock()

        clock += 4 * 60 + 50       // 閒置將近 5 分鐘
        lock.didEnterBackground()
        clock += 15                // 背景不到 30 秒
        lock.willEnterForeground()
        XCTAssertTrue(lock.isLocked, "閒置期限在背景期間已到，回來時要上鎖")
    }

    func testShortBackgroundKeepsRemainingIdleTime() async {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        auth.results = [true]
        await lock.unlock()

        clock += 60
        lock.didEnterBackground()
        clock += 10
        lock.willEnterForeground()
        XCTAssertFalse(lock.isLocked)
        clock += 3 * 60 + 50       // 合計閒置 5 分鐘，沒有因為切背景而重算
        lock.checkIdle()
        XCTAssertTrue(lock.isLocked)
    }

    func testLockNowRelocksForNextSignIn() async {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        auth.results = [true]
        await lock.unlock()
        lock.lockNow()
        XCTAssertTrue(lock.isLocked)
    }

    func testDisableUnlocksAndForgets() {
        defaults.set(true, forKey: AppLockController.enabledKey)
        let lock = makeController()
        lock.disable()
        XCTAssertFalse(lock.isEnabled)
        XCTAssertFalse(lock.isLocked)
        XCTAssertFalse(makeController().isEnabled)
    }
}
