import CatLogKit
import SwiftUI

/// 個股績效：台股 / 美股、持倉快照版本、日期區間、損益總覽與個股損益表；
/// 右上「⋯」可匯入交易、新增持倉快照、刪除快照版本、清空目前市場的交易。
/// 計算與寫入規則都在 core（getStockOverview、stockImport.js），與 web 相同。
struct StocksView: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false
    @State private var market = "TW"
    @State private var snapshotId: String?
    @State private var useRange = false
    @State private var rangeStart = Calendar.current.date(byAdding: .month, value: -3, to: Date()) ?? Date()
    @State private var rangeEnd = Date()
    @State private var search = ""
    @State private var overview: StockOverview?
    @State private var errorMessage: String?
    @State private var showTransactionImport = false
    @State private var showHoldingImport = false
    @State private var confirmClear = false
    @State private var confirmDeleteSnapshot: HoldingSnapshotSummary?
    @State private var saveError: String?

    private var currencySuffix: String { market == "US" ? "（USD）" : "" }

    private func money(_ value: Double) -> String {
        isPrivacyMode ? "****" : core.formatMoney(value, market: market)
    }

    private func signed(_ value: Double) -> String {
        isPrivacyMode ? "****" : "\(value >= 0 ? "+" : "")\(core.formatMoney(value, market: market))"
    }

    private var reloadKey: String {
        "\(model.dataVersion)|\(market)|\(snapshotId ?? "")|\(useRange)|\(CatLogCore.todayKey(rangeStart))|\(CatLogCore.todayKey(rangeEnd))"
    }

    var body: some View {
        List {
            Section {
                Picker("市場", selection: $market) {
                    Text("台股").tag("TW")
                    Text("美股").tag("US")
                }
                .pickerStyle(.segmented)
                if let overview, !overview.snapshots.isEmpty, !useRange {
                    Picker("持倉快照", selection: Binding(
                        get: { overview.selectedSnapshotId ?? "" },
                        set: { snapshotId = $0 }
                    )) {
                        ForEach(overview.snapshots) { snapshot in
                            Text(snapshot.title).tag(snapshot.id)
                        }
                    }
                }
                Toggle("只看日期區間", isOn: $useRange)
                if useRange {
                    DatePicker("區間開始", selection: $rangeStart, displayedComponents: .date)
                    DatePicker("區間結束", selection: $rangeEnd, in: rangeStart..., displayedComponents: .date)
                }
            } footer: {
                if useRange {
                    Text("區間模式只計算日期內的交易、股息與費用，不納入持倉快照市值。")
                }
            }

            if let overview {
                summarySection(overview)
                leadersSection(overview)
                rowsSection(overview)
                if !overview.holdings.isEmpty && !useRange {
                    holdingsSection(overview)
                }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }
        }
        .navigationTitle("個股績效")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, prompt: "搜尋名稱或代號")
        .toolbar { ToolbarItem(placement: .primaryAction) { actionsMenu } }
        .sheet(isPresented: $showTransactionImport) { StockTransactionImportSheet(model: model, core: core) }
        .sheet(isPresented: $showHoldingImport) { HoldingSnapshotSheet(model: model, core: core, market: market) }
        .confirmationDialog("清空\(marketLabel)股票交易？", isPresented: $confirmClear, titleVisibility: .visible) {
            Button("清空\(marketLabel)交易", role: .destructive) { Task { await clearTransactions() } }
        } message: {
            Text("只會清空目前市場的匯入交易，不會刪除其他市場、資產、收入、花費或負債資料。")
        }
        .confirmationDialog("刪除持倉快照版本？", isPresented: Binding(get: { confirmDeleteSnapshot != nil }, set: { if !$0 { confirmDeleteSnapshot = nil } }),
                            titleVisibility: .visible, presenting: confirmDeleteSnapshot) { snapshot in
            Button("刪除 \(snapshot.title)", role: .destructive) { Task { await deleteSnapshot(snapshot) } }
        } message: { snapshot in
            Text("只會刪除 \(snapshot.title) 這個版本，不會刪除股票交易資料。")
        }
        .alert("無法儲存", isPresented: Binding(get: { saveError != nil }, set: { if !$0 { saveError = nil } })) {
            Button("好") { saveError = nil }
        } message: {
            Text(saveError ?? "")
        }
        .task(id: reloadKey) { load() }
        .onChange(of: market) { _, _ in snapshotId = nil }
        .navigationDestination(for: StockRow.self) { row in
            StockTradesView(core: core, row: row,
                            rangeStart: useRange ? CatLogCore.todayKey(rangeStart) : "",
                            rangeEnd: useRange ? CatLogCore.todayKey(rangeEnd) : "")
        }
    }

    private var marketLabel: String { market == "US" ? "美股" : "台股" }

    private var selectedSnapshot: HoldingSnapshotSummary? {
        guard let overview, !useRange else { return nil }
        return overview.snapshots.first { $0.id == overview.selectedSnapshotId }
    }

    private var actionsMenu: some View {
        Menu {
            Button("匯入股票交易", systemImage: "square.and.arrow.down") { showTransactionImport = true }
            Button("新增持倉快照", systemImage: "shippingbox") { showHoldingImport = true }
            if let selectedSnapshot {
                Button("刪除快照 \(selectedSnapshot.title)", systemImage: "trash", role: .destructive) { confirmDeleteSnapshot = selectedSnapshot }
            }
            Button("清空\(marketLabel)交易", systemImage: "trash", role: .destructive) { confirmClear = true }
                .disabled((overview?.transactionCount ?? 0) == 0)
        } label: {
            Image(systemName: "ellipsis.circle")
        }
        .disabled(!model.compatibility.canWrite || model.isSaving)
    }

    private func clearTransactions() async {
        let target = market
        if case .failed(let message) = await model.saveChange({ try $0.clearingStockTransactions(market: target) }) { saveError = message }
    }

    private func deleteSnapshot(_ snapshot: HoldingSnapshotSummary) async {
        let outcome = await model.saveChange { try $0.deletingHoldingSnapshot(month: snapshot.month, id: snapshot.id) }
        switch outcome {
        case .saved: snapshotId = nil
        case .conflict: break
        case .failed(let message): saveError = message
        }
    }

    // MARK: - Sections

    private func summarySection(_ overview: StockOverview) -> some View {
        let stats = overview.stats
        let debt = overview.debtStats
        return Section {
            VStack(alignment: .leading, spacing: 4) {
                Text("總損益\(currencySuffix)").font(.caption).foregroundStyle(.secondary)
                Text(signed(stats.totalPnl))
                    .font(.title.bold().monospacedDigit())
                    .foregroundStyle(stats.totalPnl >= 0 ? .green : .red)
            }
            .padding(.vertical, 4)
            StockStatRow(title: "目前市值", value: money(stats.totalMarketValue))
            StockStatRow(title: "累計買入", value: money(stats.totalBuy))
            StockStatRow(title: "累計股息", value: money(stats.totalDividends))
            if market == "US" {
                StockStatRow(title: "利息", value: money(stats.totalInterest))
                StockStatRow(title: "匯款淨額", value: signed(stats.totalDeposits - stats.totalWithdrawals))
            }
            if debt.marketPledgeDebt > 0 {
                StockStatRow(title: "股票質押負債", value: money(debt.marketPledgeDebt),
                             detail: debt.debtSnapshotDate.map { "快照 \($0)" })
                StockStatRow(title: "扣除質押後淨損益", value: signed(debt.netPnlAfterDebt))
                if debt.marketEstimatedMonthlyInterest > 0 {
                    StockStatRow(title: "預估月息", value: money(debt.marketEstimatedMonthlyInterest))
                }
            }
        } header: {
            Text(market == "US" ? "美股總覽" : "台股總覽")
        } footer: {
            Text("\(overview.rows.count) 檔股票・\(overview.transactionCount) 筆交易")
        }
    }

    private func leadersSection(_ overview: StockOverview) -> some View {
        Section("排行") {
            LeaderGroup(title: "賺最多", rows: overview.winners, color: .green, value: signed)
            LeaderGroup(title: "虧最多", rows: overview.losers, color: .red, value: signed)
        }
    }

    private func rowsSection(_ overview: StockOverview) -> some View {
        let keyword = search.trimmingCharacters(in: .whitespaces).lowercased()
        let rows = keyword.isEmpty ? overview.rows : overview.rows.filter {
            "\($0.symbol) \($0.displayName)".lowercased().contains(keyword)
        }
        return Section("個股損益表") {
            if rows.isEmpty {
                Text(overview.rows.isEmpty ? "目前沒有可顯示的股票" : "找不到符合搜尋的股票").foregroundStyle(.secondary)
            }
            ForEach(rows) { row in
                NavigationLink(value: row) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.displayName)
                            Text("\(row.symbol)・\(row.tradeCount) 筆\(row.hasSnapshot ? "・市值 \(money(row.marketValue))" : "")")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(signed(row.totalPnl)).monospacedDigit()
                                .foregroundStyle(row.totalPnl >= 0 ? .green : .red)
                            if row.buyAmount > 0 {
                                Text(StocksView.percent(row.roi)).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func holdingsSection(_ overview: StockOverview) -> some View {
        Section("快照持股") {
            ForEach(Array(overview.holdings.enumerated()), id: \.offset) { _, holding in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.displayName)
                        Text("\(holding.shares.formatted()) 股").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(money(holding.marketValue)).monospacedDigit()
                }
            }
        }
    }

    // MARK: - Helpers

    private func load() {
        do {
            overview = try core.stockOverview(
                market: market,
                snapshotId: snapshotId,
                rangeStart: useRange ? CatLogCore.todayKey(rangeStart) : "",
                rangeEnd: useRange ? CatLogCore.todayKey(rangeEnd) : "",
                today: CatLogCore.todayKey()
            )
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    static func percent(_ value: Double) -> String {
        value.isFinite ? value.formatted(.percent.precision(.fractionLength(1))) : "—"
    }
}

extension StockRow: Hashable {
    public func hash(into hasher: inout Hasher) { hasher.combine(key) }
}

private struct LeaderGroup: View {
    let title: String
    let rows: [StockRow]
    let color: Color
    let value: (Double) -> String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.caption.bold()).foregroundStyle(color)
            if rows.isEmpty {
                Text("沒有資料").font(.caption).foregroundStyle(.secondary)
            }
            ForEach(rows.prefix(3)) { row in
                HStack {
                    Text(row.displayName).lineLimit(1)
                    Spacer()
                    Text(value(row.totalPnl)).monospacedDigit().foregroundStyle(color)
                }
                .font(.subheadline)
            }
        }
        .padding(.vertical, 2)
    }
}

private struct StockStatRow: View {
    let title: String
    let value: String
    var detail: String?

    var body: some View {
        HStack {
            Text(title).foregroundStyle(.secondary)
            Spacer()
            VStack(alignment: .trailing) {
                Text(value).monospacedDigit()
                if let detail { Text(detail).font(.caption).foregroundStyle(.secondary) }
            }
        }
    }
}

/// 單一股票的交易明細（新到舊）。
struct StockTradesView: View {
    let core: CatLogCore
    let row: StockRow
    let rangeStart: String
    let rangeEnd: String
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false
    @State private var trades: [StockTrade] = []

    var body: some View {
        List {
            Section {
                HStack {
                    Text("總損益").foregroundStyle(.secondary)
                    Spacer()
                    Text(isPrivacyMode ? "****" : "\(row.totalPnl >= 0 ? "+" : "")\(core.formatMoney(row.totalPnl, market: row.market))")
                        .bold().monospacedDigit()
                        .foregroundStyle(row.totalPnl >= 0 ? .green : .red)
                }
            }
            Section("交易明細（\(trades.count) 筆）") {
                if trades.isEmpty {
                    Text("尚無這檔股票的交易明細").foregroundStyle(.secondary)
                }
                ForEach(Array(trades.enumerated()), id: \.offset) { _, trade in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(trade.label)\(trade.shares > 0 ? " \(trade.shares.formatted()) 股" : "")")
                            Text([trade.date, trade.description.isEmpty ? nil : trade.description].compactMap { $0 }.joined(separator: "・"))
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(isPrivacyMode ? "****" : core.formatMoney(trade.amount, market: row.market)).monospacedDigit()
                    }
                }
            }
        }
        .navigationTitle(row.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            trades = (try? core.stockTrades(market: row.market, symbol: row.symbol, rangeStart: rangeStart, rangeEnd: rangeEnd)) ?? []
        }
    }
}
