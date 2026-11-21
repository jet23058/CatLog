import CatLogKit
import SwiftUI

/// 區間統計（唯讀）：現金流、資產負債變化與財務推估。計算來自 core 的 getRangeStats，與 web 相同。
struct RangeStatsView: View {
    let core: CatLogCore
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false
    @State private var startDate: Date = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Date())) ?? Date()
    @State private var endDate = Date()
    @State private var stats: RangeStats?
    @State private var errorMessage: String?

    private func money(_ value: Double) -> String { isPrivacyMode ? "****" : core.formatMoney(value) }
    private func signed(_ value: Double) -> String {
        isPrivacyMode ? "****" : "\(value >= 0 ? "+" : "")\(core.formatMoney(value))"
    }

    var body: some View {
        List {
            Section {
                DatePicker("開始日期", selection: $startDate, displayedComponents: .date)
                DatePicker("結束日期", selection: $endDate, in: startDate..., displayedComponents: .date)
                HStack {
                    ForEach([(3, "近 3 個月"), (6, "近半年"), (12, "近 1 年")], id: \.0) { months, label in
                        Button(label) { applyRecent(months) }
                            .buttonStyle(.bordered)
                            .font(.caption)
                            .frame(maxWidth: .infinity)
                    }
                }
            }

            if let stats {
                Section("現金流") {
                    RangeRow(title: "收入", value: money(stats.incomeStats.total), detail: "\(stats.incomeStats.count) 筆")
                    RangeRow(title: "花費", value: money(stats.expenseStats.total), detail: "\(stats.expenseStats.count) 筆")
                    RangeRow(title: "現金流", value: signed(stats.financeStats.cashFlow), emphasized: true)
                    ForEach(stats.expenseStats.topCategories) { category in
                        RangeRow(title: "　\(category.name)", value: money(category.amount))
                    }
                }

                Section {
                    RangeRow(title: "期初資產", value: money(stats.assetStats.startAssets), detail: stats.assetStats.startDate)
                    RangeRow(title: "期末資產", value: money(stats.assetStats.endAssets), detail: stats.assetStats.endDate)
                    RangeRow(title: "固定資產變化", value: signed(stats.assetStats.fixed.change))
                    RangeRow(title: "浮動資產變化", value: signed(stats.assetStats.floating.change))
                    ForEach(Array(stats.assetStats.floating.changes.prefix(5).enumerated()), id: \.offset) { _, change in
                        RangeRow(title: "　\(change.name ?? "未命名")", value: signed(change.change))
                    }
                    RangeRow(title: "期初負債", value: money(stats.debtStats.startDebts), detail: stats.debtStats.startDate)
                    RangeRow(title: "期末負債", value: money(stats.debtStats.endDebts), detail: stats.debtStats.endDate)
                } header: {
                    Text("資產負債變化")
                } footer: {
                    Text("資產取起訖日當天或之前最近一次紀錄；淨值會扣除期初 / 期末負債。")
                }

                Section("財務推估") {
                    RangeRow(title: "期初淨值", value: money(stats.financeStats.startNetWorth))
                    RangeRow(title: "期末淨值", value: money(stats.financeStats.endNetWorth))
                    RangeRow(title: "淨值變化", value: signed(stats.financeStats.netWorthChange), emphasized: true)
                    RangeRow(title: "總創造價值", value: signed(stats.financeStats.totalCreated), detail: "淨值變化 + 花費")
                    RangeRow(title: "非收入變化", value: signed(stats.financeStats.nonIncomeChange), detail: "總創造價值 − 收入")
                }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }
        }
        .navigationTitle("區間統計")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(CatLogCore.todayKey(startDate))|\(CatLogCore.todayKey(endDate))") { load() }
    }

    private func applyRecent(_ months: Int) {
        guard let range = try? core.recentMonthsRange(months, today: CatLogCore.todayKey()),
              let start = Self.date(range.startDate), let end = Self.date(range.endDate) else { return }
        startDate = start
        endDate = end
    }

    private func load() {
        do {
            stats = try core.rangeStats(startDate: CatLogCore.todayKey(startDate), endDate: CatLogCore.todayKey(endDate))
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    static func date(_ key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }
}

private struct RangeRow: View {
    let title: String
    let value: String
    var detail: String?
    var emphasized = false

    var body: some View {
        HStack {
            Text(title).foregroundStyle(.secondary)
            Spacer()
            VStack(alignment: .trailing) {
                Text(value).monospacedDigit().fontWeight(emphasized ? .bold : .regular)
                if let detail { Text(detail).font(.caption).foregroundStyle(.secondary) }
            }
        }
    }
}
