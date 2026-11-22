import SwiftUI

/// 共用設計規則（與 web 相同，見 CatLog 首頁示意圖的「共用設計規則」）。
enum Theme {
    /// 主色：深青綠，白字在上面也看得清楚。
    static let accent = Color(red: 15 / 255, green: 118 / 255, blue: 110 / 255)
    /// 主色淡底（月份方塊、選取狀態）。
    static let accentSoft = Color(red: 15 / 255, green: 118 / 255, blue: 110 / 255).opacity(0.1)
    /// 主卡片上的次要文字。
    static let onAccentSecondary = Color(red: 204 / 255, green: 251 / 255, blue: 241 / 255)

    /// 台股慣例：紅漲綠跌（2026-11-22 使用者決定，web 相同）。漲跌另外加上 ▲▼ 與正負號，不只靠顏色。
    static let up = Color(red: 220 / 255, green: 38 / 255, blue: 38 / 255)
    static let down = Color(red: 21 / 255, green: 128 / 255, blue: 61 / 255)

    static func trend(_ value: Double) -> Color { value >= 0 ? up : down }
    static func arrow(_ value: Double) -> String { value >= 0 ? "▲" : "▼" }

    static let cardRadius: CGFloat = 20
    static let heroRadius: CGFloat = 24
    /// 卡片底色：淺色模式白、深色模式深灰（跟著系統）。
    static let card = Color(.secondarySystemGroupedBackground)
}

extension View {
    /// 一般卡片：白底、圓角 20、不加陰影。
    func themeCard(padding: CGFloat = 16) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: .rect(cornerRadius: Theme.cardRadius))
    }

    /// 放在 List 裡、不要系統列底色與分隔線的自訂卡片列。
    func plainListRow(top: CGFloat = 6, bottom: CGFloat = 6) -> some View {
        self.listRowInsets(EdgeInsets(top: top, leading: 0, bottom: bottom, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}
