import CatLogKit
import SwiftUI

// 對帳單核對、FIRE 提領率、雲端診斷。規則在 core，與 web 相同。

/// 對帳單核對：選帳戶與區間，逐筆勾選和信用卡 / 銀行對帳單比對。勾選只在畫面上，不會存檔（與 web 相同）。
struct StatementCheckView: View {
    let core: CatLogCore
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var account = ""
    @State private var checked: Set<String> = []
    @State private var view: StatementView?
    @State private var didSetDefaults = false

    private func money(_ value: Double) -> String { isPrivacyMode ? "****" : core.formatMoney(value) }

    var body: some View {
        List {
            Section {
                DatePicker("開始日期", selection: $startDate, displayedComponents: .date)
                DatePicker("結束日期", selection: $endDate, in: startDate..., displayedComponents: .date)
                if let view, !view.accounts.isEmpty {
                    Picker("對帳帳戶", selection: Binding(get: { view.account }, set: { account = $0 })) {
                        ForEach(view.accounts, id: \.self) { Text($0).tag($0) }
                    }
                }
            }

            if let view {
                Section {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("已確認（\(checked.intersection(view.items.map(\.key)).count)/\(view.items.count)）").font(.caption).foregroundStyle(.secondary)
                            Text(money(view.items.filter { checked.contains($0.key) }.reduce(0) { $0 + $1.amount })).font(.title3.bold()).foregroundStyle(.teal)
                        }
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("總金額").font(.caption).foregroundStyle(.secondary)
                            Text(money(view.total)).font(.title3.bold())
                        }
                    }
                    .monospacedDigit()
                }
                Section {
                    if view.items.isEmpty {
                        Text(view.accounts.isEmpty ? "還沒有匯入花費，請先從首頁匯入 MOZE 花費。" : "此區間無交易紀錄").foregroundStyle(.secondary)
                    }
                    ForEach(view.items) { item in
                        Button {
                            if checked.contains(item.key) { checked.remove(item.key) } else { checked.insert(item.key) }
                        } label: {
                            HStack {
                                Image(systemName: checked.contains(item.key) ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(checked.contains(item.key) ? .teal : .secondary)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.title).foregroundStyle(.primary)
                                    Text("\(item.date)・\(item.category)").font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(money(item.amount)).monospacedDigit().foregroundStyle(checked.contains(item.key) ? .teal : .primary)
                            }
                        }
                    }
                } footer: {
                    Text("點一下勾選已在對帳單上核對過的項目；勾選不會存檔。")
                }
            }
        }
        .navigationTitle("對帳單核對")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(CatLogCore.todayKey(startDate))|\(CatLogCore.todayKey(endDate))|\(account)") { load() }
    }

    private func load() {
        if !didSetDefaults {
            didSetDefaults = true
            if let range = try? core.statementDefaultRange(today: CatLogCore.todayKey()),
               let start = RangeStatsView.date(range.startDate), let end = RangeStatsView.date(range.endDate) {
                startDate = start
                endDate = end
                return // 改日期會再觸發一次 load
            }
        }
        view = try? core.statementView(account: account, startDate: CatLogCore.todayKey(startDate), endDate: CatLogCore.todayKey(endDate))
    }
}

/// 調整 FIRE 提領率（%）。
struct FireRateSheet: View {
    @ObservedObject var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var rate = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("提領率 %", text: $rate).numericField($rate)
                } footer: {
                    Text("FIRE 目標 = 年支出 ÷ 提領率。常見的 4% 法則代表目標是年支出的 25 倍。")
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("FIRE 提領率")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") { Task { await save() } }.disabled(model.isSaving)
                }
            }
            .onAppear { rate = model.fire.map { CatLogCore.plain($0.rate) } ?? "4" }
            .interactiveDismissDisabled(model.isSaving)
        }
        .presentationDetents([.medium])
    }

    private func save() async {
        errorMessage = nil
        let value = rate
        switch await model.saveChange({ try $0.settingFireWithdrawalRate(value) }) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}

#if DEBUG
/// 雲端診斷結果（只讀）。
struct DiagnosticsSheet: View {
    let diagnostics: CloudDiagnostics
    let email: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("雲端狀態") {
                    row("帳號", email ?? "—")
                    row("版本（revision）", diagnostics.meta?.revision.map(String.init) ?? "—")
                    row("資料塊", "\(diagnostics.chunkCount)\(diagnostics.meta?.chunkCount.map { "／預期 \($0)" } ?? "")")
                    row("字元數", "\(diagnostics.characterCount)\(diagnostics.meta?.length.map { "／預期 \($0)" } ?? "")")
                    row("checksum", diagnostics.checksumMatches.map { $0 ? "相符" : "不符" } ?? "舊格式，無法比對")
                    if let parseError = diagnostics.parseError {
                        Text(parseError).foregroundStyle(.red).font(.caption)
                    }
                }
                if let counts = diagnostics.counts {
                    Section("資料內容") {
                        row("資產", "\(counts.recordsDates) 天・\(counts.recordsItems) 筆")
                        row("負債", "\(counts.debtDates) 天・\(counts.debtItems) 筆")
                        row("收入", "\(counts.incomeMonths) 月・\(counts.incomeSources) 筆")
                        row("花費", "\(counts.expenseMonths) 月・\(counts.expenseItems) 筆")
                        row("備忘錄", "\(counts.memoDates) 天")
                        row("負債異動", "\(counts.debtEventMonths) 月・\(counts.debtEventItems) 筆")
                        row("股票交易", "\(counts.stockTransactions) 筆")
                        row("持倉快照", "\(counts.stockSnapshotMonths) 月・\(counts.stockSnapshotVersions) 版")
                    }
                }
            }
            .navigationTitle("雲端診斷")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } }
        }
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack { Text(title).foregroundStyle(.secondary); Spacer(); Text(value).monospacedDigit() }
    }
}
#endif
