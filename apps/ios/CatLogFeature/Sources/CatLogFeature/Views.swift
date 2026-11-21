import CatLogKit
import Charts
import SwiftUI
import UIKit

/// App 的根畫面，依登入、鎖定與讀取狀態切換。
public struct RootView: View {
    @StateObject private var model = AppModel()
    @StateObject private var lock = AppLockController(
        authenticator: LocalDeviceAuthenticator(),
        policy: (try? CoreBridge.bundled()).map(AppLockPolicy.fromCore) ?? .standard
    )
    @Environment(\.scenePhase) private var scenePhase
    /// 30 秒檢查一次閒置；閒置上限是 5 分鐘，誤差可接受。
    private let idleTimer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    public init() {}

    /// 與 web 相同：登入後的畫面才需要鎖。
    private var needsLock: Bool {
        guard lock.isEnabled, lock.isLocked else { return false }
        switch model.phase {
        case .needsSetup, .signedOut: return false
        default: return true
        }
    }

    public var body: some View {
        ZStack {
            if needsLock {
                // 鎖定時完全不建立資料畫面，避免資產資料留在畫面階層中。
                LockView(lock: lock)
            } else {
                content
            }
            if lock.isEnabled && scenePhase != .active {
                PrivacyCover()
            }
        }
        .tint(.teal)
        .background(ActivityTracker { lock.recordActivity() })
        .onReceive(idleTimer) { _ in lock.checkIdle() }
        // 登出後重新上鎖，下次登入要再過一次 Face ID（與 web 相同）。
        .onChange(of: model.phase) { _, phase in
            if phase == .signedOut { lock.lockNow() }
        }
        // 用系統的 App 生命週期通知判斷進出背景（scenePhase 只用來決定要不要蓋上多工畫面遮罩）。
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification)) { _ in
            lock.didEnterBackground()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            lock.willEnterForeground()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .needsSetup:
            SetupNeededView()
        case .signedOut:
            LoginView(model: model)
        case .loading:
            ProgressView("正在同步雲端資料…")
        case .ready:
            DashboardView(model: model, lock: lock)
        case .failed(let message):
            ErrorView(message: message) { Task { await model.reload() } } signOut: { model.signOut() }
        }
    }
}

// MARK: - 登入

struct LoginView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "cat.fill")
                .font(.system(size: 56))
                .foregroundStyle(.teal)
            VStack(spacing: 8) {
                Text("極簡貓資產").font(.largeTitle.bold())
                Text("與網頁版共用同一份資料").foregroundStyle(.secondary)
            }
            Spacer()
            if let error = model.signInError {
                Text(error).font(.footnote).foregroundStyle(.red).multilineTextAlignment(.center)
            }
            Button {
                Task { await model.signIn() }
            } label: {
                HStack {
                    if model.isSigningIn { ProgressView().tint(.white) }
                    Text("使用 Google 登入").bold()
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .disabled(model.isSigningIn)
        }
        .padding(24)
    }
}

// MARK: - 儀表板

struct DashboardView: View {
    @ObservedObject var model: AppModel
    @ObservedObject var lock: AppLockController
    /// 隱私模式：金額顯示成 ****，比例照常顯示。與 web 相同，只存在這台裝置。
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false
    @State private var lockError: String?
    @State private var showAddAsset = Self.demoSheet == "asset"
    @State private var showAddIncome = Self.demoSheet == "income"
    @State private var showAddDebt = Self.demoSheet == "debt"

    /// 開發用：`-CatLogDemoSheet asset|income` 啟動時直接打開新增畫面。
    private static var demoSheet: String? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-CatLogDemoSheet"), index + 1 < args.count { return args[index + 1] }
        #endif
        return nil
    }
    @State private var saveError: String?
    @State private var path = Self.initialPath()

    /// 開發用：`-CatLogDemoMonth 2026-03` 或 `-CatLogDemoScreen stocks|range` 啟動時直接打開該畫面。
    private static func initialPath() -> NavigationPath {
        var path = NavigationPath()
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        func value(after flag: String) -> String? {
            guard let index = args.firstIndex(of: flag), index + 1 < args.count else { return nil }
            return args[index + 1]
        }
        if let month = value(after: "-CatLogDemoMonth") { path.append(DashboardRoute.month(month)) }
        switch value(after: "-CatLogDemoScreen") {
        case "stocks": path.append(DashboardRoute.stocks)
        case "range": path.append(DashboardRoute.range)
        default: break
        }
        #endif
        return path
    }

    private func money(_ text: String) -> String {
        isPrivacyMode ? "****" : text
    }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    PreviewNotice(message: model.compatibilityMessage)
                    if model.remoteUpdateAvailable {
                        HStack {
                            Label("另一台裝置已更新雲端資料", systemImage: "arrow.triangle.2.circlepath")
                                .font(.footnote)
                            Spacer()
                            Button("重新載入") { Task { await model.reload() } }
                                .font(.footnote.bold())
                        }
                    }
                }
                if let stats = model.yearStats, let core = model.core {
                    Section("\(String(model.year)) 年度") {
                        // 與 web 相同：期末是「該年度最後一筆資產紀錄」，不一定是 12/31。
                        StatRow(
                            title: "期末淨資產",
                            value: money(core.formatWan(stats.thisYearAssets)),
                            detail: stats.assetGrowthEndDate.map { "截至 \($0)" } ?? "尚無紀錄"
                        )
                        StatRow(
                            title: "年度資產增長",
                            value: money("\(stats.realAssetGrowthAmount >= 0 ? "+" : "")\(core.formatWan(stats.realAssetGrowthAmount))"),
                            detail: Self.percent(stats.realAssetGrowthPercentage)
                        )
                        StatRow(title: "年度總收入", value: money(core.formatWan(stats.totalIncome)))
                        StatRow(title: "平均月收入", value: money(core.formatMoney(stats.avgIncome)))
                        StatRow(title: "負債", value: money(core.formatWan(stats.thisYearDebt)), detail: "截至 \(String(model.year)) 年底")
                    }
                }
                if let core = model.core {
                    let recorded = model.months.filter(\.hasRecord)
                    if recorded.count >= 2 {
                        Section("資產趨勢") {
                            AssetTrendChart(months: recorded, core: core, isPrivacyMode: isPrivacyMode)
                                .frame(height: 180)
                                .padding(.vertical, 8)
                        }
                    }
                }
                if let fire = model.fire, let core = model.core {
                    Section("FIRE 目標（提領率 \(fire.rate.formatted())%）") {
                        VStack(alignment: .leading, spacing: 8) {
                            // 隱私模式連進度一起隱藏：達成率加上提領率就能推算出資產規模。
                            if !isPrivacyMode {
                                ProgressView(value: min(max(fire.progress, 0), 1))
                            }
                            HStack {
                                Text(isPrivacyMode ? "****" : Self.percent(fire.progress)).bold()
                                Spacer()
                                Text(money("\(core.formatWan(fire.currentAssets)) / \(core.formatWan(fire.fireTarget))"))
                                    .foregroundStyle(.secondary)
                            }
                            .font(.subheadline)
                        }
                        StatRow(title: "平均月支出", value: money(core.formatMoney(fire.avgExpense)))
                    }
                }
                if let core = model.core {
                    Section("工具") {
                        NavigationLink(value: DashboardRoute.stocks) {
                            Label("個股績效", systemImage: "chart.line.uptrend.xyaxis")
                        }
                        NavigationLink(value: DashboardRoute.range) {
                            Label("區間統計", systemImage: "calendar.badge.clock")
                        }
                    }
                    Section("每月") {
                        // 只要該月有任何資料（含只有備忘錄或負債快照的月份）就列出，才能打開月份明細。
                        ForEach(model.months.filter { model.dataMonths.contains(Self.monthKey(year: model.year, month: $0.month)) }) { month in
                            NavigationLink(value: DashboardRoute.month(Self.monthKey(year: model.year, month: month.month))) {
                                MonthRow(month: month, core: core, isPrivacyMode: isPrivacyMode)
                            }
                        }
                    }
                }
            }
            .navigationTitle("極簡貓資產")
            .navigationDestination(for: DashboardRoute.self) { route in
                if let core = model.core {
                    switch route {
                    case .month(let monthKey): MonthDetailView(model: model, core: core, monthKey: monthKey)
                    case .stocks: StocksView(core: core)
                    case .range: RangeStatsView(core: core)
                    }
                }
            }
            .alert("無法開啟 Face ID 鎖定", isPresented: Binding(get: { lockError != nil }, set: { if !$0 { lockError = nil } })) {
                Button("好") { lockError = nil }
            } message: {
                Text(lockError ?? "")
            }
            .refreshable { await model.reload() }
            .sheet(isPresented: $showAddAsset) {
                if let core = model.core { AddAssetSheet(model: model, core: core) }
            }
            .sheet(isPresented: $showAddIncome) {
                if let core = model.core { AddIncomeSheet(model: model, core: core) }
            }
            .sheet(isPresented: $showAddDebt) {
                if let core = model.core { AddDebtSheet(model: model, core: core) }
            }
            // 與 web 相同：另一台裝置先存了檔，讓使用者選擇載入雲端版本或用這台覆蓋。
            .alert("雲端有較新的資料", isPresented: Binding(get: { model.conflict != nil }, set: { _ in })) {
                Button("載入雲端版本") { Task { await model.resolveConflictByReloading() } }
                Button("用這台裝置覆蓋", role: .destructive) {
                    Task {
                        if case .failed(let message) = await model.resolveConflictByOverwriting() { saveError = message }
                    }
                }
            } message: {
                Text("另一台裝置在你之後存了檔，這次的新增還沒有寫入。載入雲端版本會放棄這次的新增；覆蓋會用這台裝置的資料取代雲端。")
            }
            .alert("儲存失敗", isPresented: Binding(get: { saveError != nil }, set: { if !$0 { saveError = nil } })) {
                Button("好") { saveError = nil }
            } message: {
                Text(saveError ?? "")
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("新增資產", systemImage: "wallet.pass") { showAddAsset = true }
                        Button("新增收入", systemImage: "dollarsign.circle") { showAddIncome = true }
                        Button("新增負債", systemImage: "creditcard") { showAddDebt = true }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .disabled(!model.compatibility.canWrite)
                    .accessibilityLabel("新增紀錄")
                }
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        ForEach(model.availableYears, id: \.self) { year in
                            Button(String(year)) { model.year = year }
                        }
                    } label: {
                        Label(String(model.year), systemImage: "calendar")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isPrivacyMode.toggle()
                    } label: {
                        Image(systemName: isPrivacyMode ? "eye.slash" : "eye")
                    }
                    .accessibilityLabel(isPrivacyMode ? "顯示金額" : "隱藏金額")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if let email = model.userEmail { Text(email) }
                        Text("版本 \(model.appVersion)")
                        if let project = FirebaseBootstrap.projectID {
                            Text(project == "asset-prod" ? "正式站" : "測試站（\(project)）")
                        }
                        if lock.isEnabled {
                            Button("關閉 Face ID 鎖定", systemImage: "faceid") { lock.disable() }
                        } else {
                            Button("開啟 Face ID 鎖定", systemImage: "faceid") {
                                Task {
                                    if !(await lock.enable()) { lockError = lock.errorMessage }
                                }
                            }
                        }
                        Button("登出", role: .destructive) { model.signOut() }
                    } label: {
                        Image(systemName: "person.circle")
                    }
                }
            }
        }
    }

    static func percent(_ value: Double) -> String {
        value.isFinite ? (value).formatted(.percent.precision(.fractionLength(1))) : "—"
    }

    static func monthKey(year: Int, month: Int) -> String {
        "\(year)-\(month < 10 ? "0" : "")\(month)"
    }
}

enum DashboardRoute: Hashable {
    case month(String)
    case stocks
    case range
}

/// 年度淨資產趨勢：只畫有實際資產紀錄的月份（與 web 相同，未紀錄月份不當成 0）。
private struct AssetTrendChart: View {
    let months: [MonthlyStat]
    let core: CatLogCore
    let isPrivacyMode: Bool

    /// VoiceOver 會讀出每個點的數值；隱私模式時改成「已隱藏」。
    private func spokenValue(_ month: MonthlyStat) -> String {
        isPrivacyMode ? "已隱藏" : core.formatWan(month.assets)
    }

    var body: some View {
        Chart(months) { month in
            AreaMark(x: .value("月份", month.month), y: .value("淨資產", month.assets))
                .foregroundStyle(.teal.opacity(0.15))
                .interpolationMethod(.monotone)
                .accessibilityHidden(true)
            LineMark(x: .value("月份", month.month), y: .value("淨資產", month.assets))
                .foregroundStyle(.teal)
                .interpolationMethod(.monotone)
                .accessibilityHidden(true)
            PointMark(x: .value("月份", month.month), y: .value("淨資產", month.assets))
                .foregroundStyle(.teal)
                .symbolSize(24)
                .accessibilityLabel("\(month.month) 月淨資產")
                .accessibilityValue(spokenValue(month))
        }
        .chartXScale(domain: 1...12)
        .chartXAxis {
            AxisMarks(values: [1, 3, 5, 7, 9, 11]) { value in
                AxisGridLine()
                AxisValueLabel { if let m = value.as(Int.self) { Text("\(m)月") } }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { value in
                AxisGridLine()
                // 隱私模式隱藏金額刻度，只保留曲線形狀。
                if !isPrivacyMode, let amount = value.as(Double.self) {
                    AxisValueLabel { Text(core.formatWan(amount)).font(.caption2) }
                }
            }
        }
        .accessibilityLabel("年度淨資產趨勢圖")
    }
}

private struct PreviewNotice: View {
    let message: String?

    var body: some View {
        if let message {
            Label {
                VStack(alignment: .leading, spacing: 4) {
                    Text("需要更新 App，目前為唯讀模式").bold()
                    Text(message).font(.footnote).foregroundStyle(.secondary)
                }
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            }
        } else {
            Label("iOS 可以新增資產、收入、負債與負債異動；編輯、刪除與匯入請先使用網頁版。", systemImage: "info.circle")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }
}

private struct StatRow: View {
    let title: String
    let value: String
    var detail: String?

    var body: some View {
        HStack {
            Text(title).foregroundStyle(.secondary)
            Spacer()
            VStack(alignment: .trailing) {
                Text(value).bold().monospacedDigit()
                if let detail { Text(detail).font(.caption).foregroundStyle(.secondary) }
            }
        }
    }
}

private struct MonthRow: View {
    let month: MonthlyStat
    let core: CatLogCore
    let isPrivacyMode: Bool

    private func money(_ text: String) -> String { isPrivacyMode ? "****" : text }

    var body: some View {
        HStack {
            Text("\(month.month) 月").frame(width: 44, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(month.hasRecord ? money(core.formatWan(month.assets)) : "未紀錄資產")
                    .foregroundStyle(month.hasRecord ? .primary : .secondary)
                Text("收入 \(money(core.formatMoney(month.income)))・支出 \(money(core.formatMoney(month.cost)))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if month.hasRecord {
                Text(money("\(month.balance >= 0 ? "+" : "")\(core.formatWan(month.balance))"))
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(month.balance >= 0 ? .green : .red)
            }
        }
    }
}

// MARK: - 設定 / 錯誤

struct SetupNeededView: View {
    var body: some View {
        ContentUnavailableView {
            Label("尚未設定 Firebase", systemImage: "gearshape.2")
        } description: {
            Text("請依 apps/ios/README.md 把 GoogleService-Info-Debug.plist（測試站）與 -Release.plist（正式站）放進 apps/ios/CatLog/，並在 Config/Local.xcconfig 設定 GOOGLE_REVERSED_CLIENT_ID_Debug / _Release。")
        }
    }
}

struct ErrorView: View {
    let message: String
    let retry: () -> Void
    let signOut: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("雲端資料讀取失敗", systemImage: "exclamationmark.icloud")
        } description: {
            Text(message)
        } actions: {
            Button("重試", action: retry).buttonStyle(.borderedProminent)
            Button("登出", role: .destructive, action: signOut)
        }
    }
}
