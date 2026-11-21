import CatLogKit
import SwiftUI

/// 月份明細（唯讀）：與 web 的月份明細頁相同的資料，計算來自 core 的 getMonthDetail。
struct MonthDetailView: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    @State var monthKey: String
    @State private var showAddDebtEvent: Bool = {
        #if DEBUG
        // 開發用：`-CatLogDemoMonth YYYY-MM -CatLogDemoSheet debtEvent` 直接打開新增負債異動。
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "-CatLogDemoSheet"), index + 1 < args.count { return args[index + 1] == "debtEvent" }
        #endif
        return false
    }()
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false
    @State private var detail: MonthDetail?
    @State private var errorMessage: String?
    @State private var expenseAccount: String?

    private func money(_ value: Double) -> String { isPrivacyMode ? "****" : core.formatMoney(value) }
    private func wan(_ value: Double) -> String { isPrivacyMode ? "****" : core.formatWan(value) }
    private func signedWan(_ value: Double) -> String {
        isPrivacyMode ? "****" : "\(value >= 0 ? "+" : "")\(core.formatWan(value))"
    }

    var body: some View {
        List {
            if let detail {
                summarySection(detail)
                assetsSection(detail)
                if !detail.incomes.isEmpty { incomesSection(detail) }
                debtsSection(detail)
                if !detail.expenses.isEmpty { expensesSection(detail) }
                if !detail.memo.isEmpty {
                    Section("備忘錄") { Text(detail.memo) }
                }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }
        }
        .navigationTitle(Self.title(monthKey))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showAddDebtEvent = true } label: { Image(systemName: "plus") }
                    .disabled(!model.compatibility.canWrite)
                    .accessibilityLabel("新增負債異動")
                Button { go(to: detail?.prevMonth) } label: { Image(systemName: "chevron.left") }
                    .disabled(detail?.prevMonth == nil)
                    .accessibilityLabel("上個月")
                Button { go(to: detail?.nextMonth) } label: { Image(systemName: "chevron.right") }
                    .disabled(detail?.nextMonth == nil)
                    .accessibilityLabel("下個月")
            }
        }
        .task(id: "\(monthKey)#\(model.dataVersion)") { load() }
        .sheet(isPresented: $showAddDebtEvent) {
            AddDebtEventSheet(model: model, core: core, monthKey: monthKey)
        }
    }

    // MARK: - Sections

    private func summarySection(_ detail: MonthDetail) -> some View {
        let summary = detail.summary
        return Section {
            DetailRow(title: "淨資產", value: wan(summary.netAssets), detail: "較上月 \(signedWan(summary.assetDiff))")
            DetailRow(title: "本月收入", value: money(summary.monthlyIncome), detail: "較上月 \(signedWan(summary.incomeDiff))")
            DetailRow(title: "本月支出", value: money(summary.monthlyCost))
            DetailRow(title: "負債", value: wan(summary.totalDebts))
            DetailRow(title: "投資比例", value: Self.percent(summary.investmentRate), detail: "浮動資產 / 總資產")
            DetailRow(title: "綜合損益", value: signedWan(summary.compositeScore), detail: "收入成長 + 資產成長")
        }
    }

    private func assetsSection(_ detail: MonthDetail) -> some View {
        Section {
            if detail.assets.isEmpty {
                Text("本月沒有資產紀錄").foregroundStyle(.secondary)
            }
            ForEach(detail.assets) { asset in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(asset.name ?? "未命名")
                        Text(asset.isFloating ? "浮動資產" : "固定資產").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(money(asset.amount)).monospacedDigit()
                        if let change = detail.changeFromPreviousMonth(asset), change != 0 {
                            Text(isPrivacyMode ? "****" : "\(change >= 0 ? "+" : "")\(core.formatMoney(change))")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(change >= 0 ? .green : .red)
                        }
                    }
                }
            }
        } header: {
            Text("資產")
        } footer: {
            if let date = detail.assetDate { Text("紀錄日期 \(date)") }
        }
    }

    private func incomesSection(_ detail: MonthDetail) -> some View {
        Section("收入") {
            ForEach(Array(detail.incomes.enumerated()), id: \.offset) { _, income in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(income.company ?? "收入")
                        if let sub = [income.bank, income.date].compactMap({ $0 }).joined(separator: "・").nilIfEmpty {
                            Text(sub).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    Text(money(income.amount)).monospacedDigit().foregroundStyle(.green)
                }
            }
        }
    }

    private func debtsSection(_ detail: MonthDetail) -> some View {
        Section {
            if detail.debts.isEmpty {
                Text("沒有負債").foregroundStyle(.secondary)
            }
            ForEach(Array(detail.debts.enumerated()), id: \.offset) { _, debt in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(debt.name ?? "負債")
                        Text([core.debtCategoryLabel(debt.category), debt.lender].compactMap { $0 }.joined(separator: "・"))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(money(debt.amount)).monospacedDigit().foregroundStyle(.red)
                }
            }
            if detail.estimatedMonthlyDebtInterest > 0 {
                DetailRow(title: "預估本月利息", value: money(detail.estimatedMonthlyDebtInterest))
            }
            ForEach(Array(detail.debtEvents.enumerated()), id: \.offset) { _, event in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(core.debtEventLabel(event.type))
                        Text([event.date, event.name, event.memo].compactMap { $0 }.joined(separator: "・"))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if event.type != "rate_change" {
                        Text(money(event.amount)).monospacedDigit()
                    } else {
                        Text("依新利率重算").font(.caption).foregroundStyle(.orange)
                    }
                }
            }
        } header: {
            Text("負債")
        } footer: {
            if detail.isDebtCarriedForward, let date = detail.effectiveDebtSnapshotDate {
                Text("本月沒有新的負債快照，沿用 \(date) 的未還款負債。")
            }
        }
    }

    private func expensesSection(_ detail: MonthDetail) -> some View {
        let total = detail.expenseCategories.reduce(0) { $0 + $1.value }
        let accounts = Array(Set(detail.expenses.compactMap(\.account))).sorted()
        let filtered = detail.expenses.filter { expenseAccount == nil || $0.account == expenseAccount }
        return Group {
            Section("花費類別") {
                ForEach(detail.expenseCategories) { category in
                    HStack {
                        Text(category.name)
                        Spacer()
                        Text(total > 0 ? Self.percent(category.value / total) : "—")
                            .font(.caption).foregroundStyle(.secondary)
                        Text(money(category.value)).monospacedDigit().frame(minWidth: 80, alignment: .trailing)
                    }
                }
            }
            Section {
                ForEach(Array(filtered.enumerated()), id: \.offset) { _, expense in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(expense.name ?? expense.subCategory ?? expense.category ?? "花費")
                            Text([expense.date, expense.category, expense.account].compactMap { $0 }.joined(separator: "・"))
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(money(expense.amount)).monospacedDigit()
                            .foregroundStyle(expense.amount < 0 ? .green : .primary)
                    }
                }
            } header: {
                HStack {
                    Text("花費明細（\(filtered.count) 筆）")
                    Spacer()
                    if accounts.count > 1 {
                        Menu(expenseAccount ?? "全部帳戶") {
                            Button("全部帳戶") { expenseAccount = nil }
                            ForEach(accounts, id: \.self) { account in
                                Button(account) { expenseAccount = account }
                            }
                        }
                        .font(.caption)
                        .textCase(nil)
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func load() {
        do {
            detail = try core.monthDetail(monthKey)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func go(to month: String?) {
        guard let month else { return }
        expenseAccount = nil
        monthKey = month
    }

    static func title(_ monthKey: String) -> String {
        let parts = monthKey.split(separator: "-")
        guard parts.count == 2, let month = Int(parts[1]) else { return monthKey }
        return "\(parts[0]) 年 \(month) 月"
    }

    static func percent(_ value: Double) -> String {
        value.isFinite ? value.formatted(.percent.precision(.fractionLength(1))) : "—"
    }
}

private struct DetailRow: View {
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

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
