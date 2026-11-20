import CatLogKit
import SwiftUI

/// App 的根畫面，依登入與讀取狀態切換。
public struct RootView: View {
    @StateObject private var model = AppModel()

    public init() {}

    public var body: some View {
        Group {
            switch model.phase {
            case .needsSetup:
                SetupNeededView()
            case .signedOut:
                LoginView(model: model)
            case .loading:
                ProgressView("正在同步雲端資料…")
            case .ready:
                DashboardView(model: model)
            case .failed(let message):
                ErrorView(message: message) { Task { await model.reload() } } signOut: { model.signOut() }
            }
        }
        .tint(.teal)
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

    var body: some View {
        NavigationStack {
            List {
                Section {
                    PreviewNotice(message: model.compatibilityMessage)
                }
                if let stats = model.yearStats, let core = model.core {
                    Section("\(String(model.year)) 年度") {
                        StatRow(title: "年底淨資產", value: core.formatWan(stats.thisYearAssets))
                        StatRow(
                            title: "年度資產增長",
                            value: "\(stats.realAssetGrowthAmount >= 0 ? "+" : "")\(core.formatWan(stats.realAssetGrowthAmount))",
                            detail: Self.percent(stats.realAssetGrowthPercentage)
                        )
                        StatRow(title: "年度總收入", value: core.formatWan(stats.totalIncome))
                        StatRow(title: "平均月收入", value: core.formatMoney(stats.avgIncome))
                        StatRow(title: "年底負債", value: core.formatWan(stats.thisYearDebt))
                    }
                }
                if let fire = model.fire, let core = model.core {
                    Section("FIRE 目標（提領率 \(fire.rate.formatted())%）") {
                        VStack(alignment: .leading, spacing: 8) {
                            ProgressView(value: min(max(fire.progress, 0), 1))
                            HStack {
                                Text(Self.percent(fire.progress)).bold()
                                Spacer()
                                Text("\(core.formatWan(fire.currentAssets)) / \(core.formatWan(fire.fireTarget))")
                                    .foregroundStyle(.secondary)
                            }
                            .font(.subheadline)
                        }
                        StatRow(title: "平均月支出", value: core.formatMoney(fire.avgExpense))
                    }
                }
                if let core = model.core {
                    Section("每月") {
                        ForEach(model.months.filter { $0.hasRecord || $0.income != 0 || $0.cost != 0 }) { month in
                            MonthRow(month: month, core: core)
                        }
                    }
                }
            }
            .navigationTitle("極簡貓資產")
            .refreshable { await model.reload() }
            .toolbar {
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
                    Menu {
                        if let email = model.userEmail { Text(email) }
                        Text("版本 \(model.appVersion)")
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
            Label("iOS 預覽版：目前只能檢視，新增與編輯請先使用網頁版。", systemImage: "eye")
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

    var body: some View {
        HStack {
            Text("\(month.month) 月").frame(width: 44, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(month.hasRecord ? core.formatWan(month.assets) : "未紀錄資產")
                    .foregroundStyle(month.hasRecord ? .primary : .secondary)
                Text("收入 \(core.formatMoney(month.income))・支出 \(core.formatMoney(month.cost))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if month.hasRecord {
                Text("\(month.balance >= 0 ? "+" : "")\(core.formatWan(month.balance))")
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
            Text("請依 apps/ios/README.md 把 GoogleService-Info.plist 放進 apps/ios/CatLog/，並在 Config/Local.xcconfig 設定 Bundle ID 與 GOOGLE_REVERSED_CLIENT_ID。")
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
