import CatLogKit
import Charts
import SwiftUI

/// 首頁主卡片：淨資產大字、和上個月比的變化、今年走勢。
struct HeroCard: View {
    let year: Int
    let stats: YearStats
    let recorded: [MonthlyStat]
    let core: CatLogCore
    let isPrivacyMode: Bool
    let onPickYear: () -> Void

    private func money(_ text: String) -> String { isPrivacyMode ? "****" : text }

    /// 最近一筆有資產紀錄的月份，和它的上個月比。
    private var lastChange: Double? { recorded.last?.analysis?.assetDiff }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("淨資產").font(.subheadline).foregroundStyle(Theme.onAccentSecondary)
                Spacer()
                Button(action: onPickYear) {
                    HStack(spacing: 4) {
                        Text("\(String(year)) 年")
                        Image(systemName: "chevron.down").font(.caption.bold())
                    }
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 32)
                    .background(.white.opacity(0.16), in: .capsule)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("選擇年份，目前 \(year) 年")
            }
            Text(money(core.formatWan(stats.thisYearAssets)))
                .font(.system(size: 40, weight: .bold).monospacedDigit())
                .foregroundStyle(.white)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            HStack(spacing: 8) {
                if let change = lastChange {
                    Text(money("\(Theme.arrow(change)) \(change > 0 ? "+" : "")\(core.formatWan(change))"))
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Theme.trend(change))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(.white, in: .rect(cornerRadius: 12))
                }
                Text([lastChange == nil ? nil : "較上月", stats.assetGrowthEndDate.map { "截至 \($0)" }].compactMap { $0 }.joined(separator: "・"))
                    .font(.footnote)
                    .foregroundStyle(Theme.onAccentSecondary)
            }
            if recorded.count >= 2 {
                Sparkline(months: recorded)
                    .frame(height: 56)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.accent, in: .rect(cornerRadius: Theme.heroRadius))
        .accessibilityElement(children: .contain)
    }
}

/// 主卡片裡的走勢線：只畫有紀錄的月份範圍，不畫空白的整年格線。
private struct Sparkline: View {
    let months: [MonthlyStat]

    var body: some View {
        let low = months.map(\.assets).min() ?? 0
        let high = months.map(\.assets).max() ?? 0
        let pad = max((high - low) * 0.15, 1)
        Chart(months) { month in
            AreaMark(x: .value("月份", month.month), yStart: .value("下限", low - pad), yEnd: .value("淨資產", month.assets))
                .foregroundStyle(.white.opacity(0.12))
                .interpolationMethod(.monotone)
            LineMark(x: .value("月份", month.month), y: .value("淨資產", month.assets))
                .foregroundStyle(Theme.onAccentSecondary)
                .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round))
                .interpolationMethod(.monotone)
        }
        .chartXScale(domain: (months.first?.month ?? 1)...(months.last?.month ?? 12))
        .chartYScale(domain: (low - pad)...(high + pad))
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .accessibilityHidden(true)
    }
}

/// 主卡片下方的四張小卡：年度資產增長、年度總收入、負債、FIRE 達成率。
struct SummaryGrid: View {
    let year: Int
    let stats: YearStats
    let fire: FireStats?
    let core: CatLogCore
    let isPrivacyMode: Bool

    private func money(_ text: String) -> String { isPrivacyMode ? "****" : text }

    var body: some View {
        let growth = stats.realAssetGrowthAmount
        Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            GridRow {
                SummaryCard(title: "年度資產增長",
                            value: money("\(growth > 0 ? "+" : "")\(core.formatWan(growth))"),
                            valueColor: isPrivacyMode ? .primary : Theme.trend(growth),
                            detail: DashboardView.percent(stats.realAssetGrowthPercentage))
                SummaryCard(title: "年度總收入",
                            value: money(core.formatWan(stats.totalIncome)),
                            detail: "月均 \(money(core.formatMoney(stats.avgIncome)))")
            }
            GridRow {
                SummaryCard(title: "負債",
                            value: money(core.formatWan(stats.thisYearDebt)),
                            detail: "截至 \(String(year)) 年底")
                if let fire {
                    // 隱私模式連進度一起隱藏：達成率加上提領率就能推算出資產規模。
                    SummaryCard(title: "FIRE 達成",
                                value: isPrivacyMode ? "****" : DashboardView.percent(fire.progress),
                                progress: isPrivacyMode ? nil : min(max(fire.progress, 0), 1))
                } else {
                    SummaryCard(title: "FIRE 達成", value: "—", detail: "還沒有支出紀錄")
                }
            }
        }
    }
}

private struct SummaryCard: View {
    let title: String
    let value: String
    var valueColor: Color = .primary
    var detail: String?
    var progress: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.footnote).foregroundStyle(.secondary)
            Text(value)
                .font(.title3.bold().monospacedDigit())
                .foregroundStyle(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if let detail {
                Text(detail).font(.footnote.monospacedDigit()).foregroundStyle(.secondary).lineLimit(1)
            }
            if let progress {
                ProgressView(value: progress).tint(Theme.accent).padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 76, alignment: .topLeading)
        .themeCard()
        .accessibilityElement(children: .combine)
    }
}

/// 首頁的分析入口：個股、區間、對帳單。
struct QuickLinks: View {
    let open: (DashboardRoute) -> Void

    var body: some View {
        HStack(spacing: 8) {
            tile("個股績效", icon: "chart.line.uptrend.xyaxis", route: .stocks)
            tile("區間統計", icon: "calendar", route: .range)
            tile("對帳單", icon: "checklist", route: .statement)
        }
    }

    private func tile(_ title: String, icon: String, route: DashboardRoute) -> some View {
        Button { open(route) } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.title3).foregroundStyle(Theme.accent)
                Text(title).font(.footnote).foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity, minHeight: 72)
            .background(Theme.card, in: .rect(cornerRadius: 16))
            .contentShape(.rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }
}

/// 右下角的新增按鈕：資產、收入、負債。
struct AddRecordButton: View {
    let addAsset: () -> Void
    let addIncome: () -> Void
    let addDebt: () -> Void

    var body: some View {
        Menu {
            Button("新增資產", systemImage: "wallet.pass", action: addAsset)
            Button("新增收入", systemImage: "dollarsign.circle", action: addIncome)
            Button("新增負債", systemImage: "creditcard", action: addDebt)
        } label: {
            Image(systemName: "plus")
                .font(.title2.bold())
                .foregroundStyle(.white)
                .frame(width: 60, height: 60)
                .background(Theme.accent, in: .circle)
                .shadow(color: Theme.accent.opacity(0.35), radius: 8, y: 4)
        }
        .accessibilityLabel("新增紀錄")
    }
}
