import CatLogKit
import LocalAuthentication
import SwiftUI
import UIKit

/// 用 LocalAuthentication 實作：優先 Face ID / Touch ID，失敗時可以輸入裝置密碼（與 web 的 WebAuthn 平台驗證相同等級）。
struct LocalDeviceAuthenticator: DeviceAuthenticating {
    func availability() -> DeviceAuthAvailability {
        var error: NSError?
        if LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
            return .available
        }
        return .unavailable("這台裝置沒有設定 Face ID 或密碼，無法開啟鎖定。")
    }

    func authenticate(reason: String) async -> Bool {
        let context = LAContext()
        context.localizedFallbackTitle = "輸入密碼"
        do {
            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
        } catch {
            return false
        }
    }
}

/// 鎖定畫面：只有圖示與解鎖按鈕，不渲染任何資產資料。出現時自動跳出 Face ID。
struct LockView: View {
    @ObservedObject var lock: AppLockController
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 56))
                .foregroundStyle(.teal)
            VStack(spacing: 8) {
                Text("極簡貓資產已鎖定").font(.title2.bold())
                Text("使用 Face ID 解鎖").foregroundStyle(.secondary)
            }
            if let error = lock.errorMessage {
                Text(error).font(.footnote).foregroundStyle(.red)
            }
            Spacer()
            Button {
                Task { await lock.unlock() }
            } label: {
                Label("解鎖", systemImage: "faceid")
                    .bold()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .disabled(lock.isAuthenticating)
        }
        .padding(24)
        .task(id: scenePhase) {
            // 回到前景時自動跳出驗證，不用再按一次。
            if scenePhase == .active { await lock.unlock() }
        }
    }
}

/// App 切換器的截圖遮罩：離開前景時蓋住畫面，避免在多工畫面看到金額。
struct PrivacyCover: View {
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            Image(systemName: "cat.fill")
                .font(.system(size: 56))
                .foregroundStyle(.teal)
        }
    }
}

/// 監聽整個視窗的觸控，用來重設閒置計時；不攔截任何操作。
struct ActivityTracker: UIViewRepresentable {
    let onActivity: () -> Void

    func makeUIView(context: Context) -> TrackerView {
        TrackerView(onActivity: onActivity)
    }

    func updateUIView(_ view: TrackerView, context: Context) {
        view.onActivity = onActivity
    }

    final class TrackerView: UIView {
        var onActivity: () -> Void
        private var observer: TouchObserver?

        init(onActivity: @escaping () -> Void) {
            self.onActivity = onActivity
            super.init(frame: .zero)
            isUserInteractionEnabled = false
        }

        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

        override func didMoveToWindow() {
            super.didMoveToWindow()
            guard let window, observer == nil else { return }
            let observer = TouchObserver { [weak self] in self?.onActivity() }
            window.addGestureRecognizer(observer)
            self.observer = observer
        }
    }

    final class TouchObserver: UIGestureRecognizer, UIGestureRecognizerDelegate {
        private let handler: () -> Void

        init(handler: @escaping () -> Void) {
            self.handler = handler
            super.init(target: nil, action: nil)
            cancelsTouchesInView = false
            delaysTouchesBegan = false
            delaysTouchesEnded = false
            delegate = self
        }

        override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
            handler()
            state = .failed
        }

        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                               shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }
    }
}
