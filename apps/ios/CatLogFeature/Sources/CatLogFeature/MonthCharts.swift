import CatLogKit
import Charts
import SwiftUI

/// 月份明細的圖表（與 web 相同）。配色避開漲跌用的紅綠；數值一律直接寫出來，不只靠顏色。
enum ChartPalette {
    static let series: [Color] = [
        Color(red: 0x2a / 255, green: 0x78 / 255, blue: 0xd6 / 255),
        Color(red: 0xed / 255, green: 0xa1 / 255, blue: 0x00 / 255),
        Color(red: 0xe8 / 255, green: 0x7b / 255, blue: 0xa4 / 255),
        Color(red: 0x7c / 255, green: 0x5c / 255, blue: 0xd6 / 255),
    ]
    static let other = Color(red: 0x94 / 255, green: 0xa3 / 255, blue: 0xb8 / 255)
    static let income = series[0]
    static let cost = series[1]

    static func color(_ slice: AllocationSlice, index: Int) -> Color {
        slice.isOther ? other : series[index % series.count]
    }
}

/// 主卡片裡近 6 個月的淨資產走勢：只連有紀錄的月份，這個月的點放大。
struct MonthTrendSparkline: View {
    let trend: [MonthTrendPoint]

    var body: some View {
        let points = trend.filter { $0.assets != nil }
        if points.count >= 2 {
            let values = points.compactMap(\.assets)
            let low = values.min() ?? 0, high = values.max() ?? 0
            let pad = max((high - low) * 0.2, 1)
            Chart {
                ForEach(points) { point in
                    LineMark(x: .value("月份", point.monthKey), y: .value("淨資產", point.assets ?? 0))
                        .foregroundStyle(Theme.onAccentSecondary)
                        .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                    PointMark(x: .value("月份", point.monthKey), y: .value("淨資產", point.assets ?? 0))
                        .foregroundStyle(point.id == points.last?.id ? Color.white : Theme.onAccentSecondary)
                        .symbolSize(point.id == points.last?.id ? 90 : 40)
                }
            }
            .chartXScale(domain: trend.map(\.monthKey))
            .chartYScale(domain: (low - pad)...(high + pad))
            .chartYAxis(.hidden)
            .chartXAxis {
                AxisMarks(values: trend.map(\.monthKey)) { value in
                    AxisValueLabel {
                        if let key = value.as(String.self), let month = Int(key.suffix(2)) {
                            Text("\(month)月").font(.caption2).foregroundStyle(Theme.onAccentSecondary)
                        }
                    }
                }
            }
            .frame(height: 78)
            .accessibilityHidden(true)
        }
    }
}

/// 資產配置：一條比例條＋每筆的比例與金額。
struct AssetAllocationCard: View {
    let allocation: AssetAllocation
    let core: CatLogCore
    let isPrivacyMode: Bool

    private func money(_ value: Double) -> String { isPrivacyMode ? "****" : core.formatWan(value) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("資產配置").font(.headline)
                Spacer()
                Text("總資產 \(money(allocation.total))").font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                HStack(spacing: 2) {
                    ForEach(Array(allocation.slices.enumerated()), id: \.element.id) { index, slice in
                        Rectangle()
                            .fill(ChartPalette.color(slice, index: index))
                            .frame(width: max((geo.size.width - CGFloat(allocation.slices.count - 1) * 2) * slice.share, 2))
                    }
                }
                .clipShape(.rect(cornerRadius: 4))
            }
            .frame(height: 16)
            .accessibilityHidden(true)
            ForEach(Array(allocation.slices.enumerated()), id: \.element.id) { index, slice in
                HStack(spacing: 10) {
                    RoundedRectangle(cornerRadius: 3).fill(ChartPalette.color(slice, index: index)).frame(width: 10, height: 10)
                    Text(slice.name).lineLimit(1)
                    Spacer()
                    Text(slice.share.formatted(.percent.precision(.fractionLength(1))))
                        .font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
                    Text(money(slice.amount))
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                        .frame(minWidth: 72, alignment: .trailing)
                }
                .font(.subheadline)
                .accessibilityElement(children: .combine)
            }
        }
        .themeCard()
    }
}

/// 收入與支出：近 6 個月的兩根長條，點一下看數字。
struct IncomeCostCard: View {
    let trend: [MonthTrendPoint]
    let core: CatLogCore
    let isPrivacyMode: Bool
    @State private var selected: String?

    private func money(_ value: Double) -> String { isPrivacyMode ? "****" : core.formatWan(value) }

    var body: some View {
        let current = trend.first { $0.monthKey == selected } ?? trend.last
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text("收入與支出").font(.headline)
                Spacer()
                Text("近 \(trend.count) 個月").font(.footnote).foregroundStyle(.secondary)
            }
            HStack(spacing: 14) {
                Label { Text("收入") } icon: { RoundedRectangle(cornerRadius: 3).fill(ChartPalette.income).frame(width: 10, height: 10) }
                Label { Text("支出") } icon: { RoundedRectangle(cornerRadius: 3).fill(ChartPalette.cost).frame(width: 10, height: 10) }
            }
            .font(.footnote).foregroundStyle(.secondary)
            if let current {
                Text("\(current.month) 月：收入 \(money(current.income))・支出 \(money(current.cost))")
                    .font(.subheadline.monospacedDigit())
            }
            Chart {
                ForEach(trend) { point in
                    BarMark(x: .value("月份", point.monthKey), y: .value("金額", point.income), width: .fixed(12))
                        .foregroundStyle(ChartPalette.income)
                        .position(by: .value("種類", "收入"))
                        .cornerRadius(4)
                    BarMark(x: .value("月份", point.monthKey), y: .value("金額", point.cost), width: .fixed(12))
                        .foregroundStyle(ChartPalette.cost)
                        .position(by: .value("種類", "支出"))
                        .cornerRadius(4)
                }
                if let current {
                    RuleMark(x: .value("月份", current.monthKey))
                        .foregroundStyle(Color.secondary.opacity(0.12))
                        .lineStyle(StrokeStyle(lineWidth: 40))
                }
            }
            .chartYAxis(.hidden)
            .chartXAxis {
                AxisMarks(values: trend.map(\.monthKey)) { value in
                    AxisValueLabel {
                        if let key = value.as(String.self), let month = Int(key.suffix(2)) { Text("\(month)月") }
                    }
                }
            }
            .chartXSelection(value: $selected)
            .frame(height: 140)
            .accessibilityLabel("近 \(trend.count) 個月收入與支出")
            .accessibilityValue(trend.map { "\($0.month) 月收入 \(money($0.income))，支出 \(money($0.cost))" }.joined(separator: "；"))
        }
        .themeCard()
    }
}

/// 本月花費類別：每個類別一條橫條，由多到少。
struct CostCategoryCard: View {
    let categories: [ExpenseCategory]
    let total: Double
    let core: CatLogCore
    let isPrivacyMode: Bool

    var body: some View {
        let sorted = Array(categories.sorted { $0.value > $1.value }.prefix(6))
        let top = sorted.first?.value ?? 1
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text("本月花費類別").font(.headline)
                Spacer()
                Text("共 \(isPrivacyMode ? "****" : core.formatWan(total))").font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
            }
            ForEach(sorted) { category in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(category.name)
                        Spacer()
                        Text(isPrivacyMode ? "****" : core.formatMoney(category.value)).fontWeight(.semibold).monospacedDigit()
                    }
                    .font(.subheadline)
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.secondary.opacity(0.12))
                            Capsule().fill(Theme.accent).frame(width: geo.size.width * max(category.value / top, 0.02))
                        }
                    }
                    .frame(height: 8)
                    .accessibilityHidden(true)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .themeCard()
    }
}
