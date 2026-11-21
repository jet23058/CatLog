import CatLogKit
import SwiftUI
import UniformTypeIdentifiers

// 個股績效的匯入畫面。欄位與檢查和 web 的 StockAnalysisView 匯入 popup 相同（規則在 core 的 stockImport.js）。

// MARK: - 匯入股票交易

struct StockTransactionImportSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    @Environment(\.dismiss) private var dismiss
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false

    @State private var text = ""
    @State private var dateFormat: USDateFormat = .auto
    @State private var showImporter = false
    @State private var preview: StockImportPreview?
    @State private var errorMessage: String?

    private static let typeTitles: [(String, String)] = [
        ("buy", "買入"), ("sell", "賣出"), ("dividend", "股息"), ("interest", "利息"), ("deposit", "匯入"), ("withdrawal", "匯出"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                if let preview { previewSections(preview) } else { inputSections }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle(preview == nil ? "匯入股票交易" : "確認匯入")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if preview != nil { Button("返回") { preview = nil } } else { Button("取消") { dismiss() } }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if preview != nil {
                        Button("確認匯入") { Task { await save() } }.disabled(model.isSaving)
                    }
                }
            }
            .fileImporter(isPresented: $showImporter, allowedContentTypes: [.commaSeparatedText, .plainText]) { result in
                do {
                    let url = try result.get()
                    let accessing = url.startAccessingSecurityScopedResource()
                    defer { if accessing { url.stopAccessingSecurityScopedResource() } }
                    parse(try String(contentsOf: url, encoding: .utf8))
                } catch {
                    errorMessage = error.localizedDescription
                }
            }
            .interactiveDismissDisabled(model.isSaving)
            .overlay { if model.isSaving { ProgressView("儲存中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
        }
    }

    @ViewBuilder private var inputSections: some View {
        Section {
            Button("選擇股票交易檔案", systemImage: "doc") { showImporter = true }
        } footer: {
            Text("匯入採新增（append），不會覆蓋既有交易。")
        }
        Section {
            TextEditor(text: $text)
                .frame(minHeight: 160)
                .font(.system(.caption, design: .monospaced))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("預覽匯入明細") { parse(text) }.disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        } header: {
            Text("或直接貼上交易內容")
        } footer: {
            Text("台股可貼上券商對帳單的 tab 分隔內容；美股可貼上券商每筆交易明細（日期、交易類別、數量、說明、代號、賬戶類別、價格、金額）。")
        }
        Section {
            Picker("美股日期格式", selection: $dateFormat) {
                ForEach(USDateFormat.allCases) { Text($0.title).tag($0) }
            }
        } footer: {
            Text("預覽日期不對時再手動指定；台股日期不受影響。")
        }
        Section {
            Button("封存 v1 格式預覽") { parse(text, allowArchived: true) }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        } header: {
            Text("美股 v1 已封存")
        } footer: {
            Text("舊版「已平倉損益」格式只用來補救舊檔，請貼上內容後使用。")
        }
    }

    @ViewBuilder private func previewSections(_ preview: StockImportPreview) -> some View {
        Section {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                ForEach(Self.typeTitles, id: \.0) { type, title in
                    VStack(spacing: 2) {
                        Text(title).font(.caption).foregroundStyle(.secondary)
                        Text("\(preview.count(type))").font(.headline.monospacedDigit())
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(.quaternary.opacity(0.5), in: .rect(cornerRadius: 8))
                }
            }
        } header: {
            Text("將新增 \(preview.total) 筆交易")
        } footer: {
            if preview.isArchived {
                Text("這批資料會以封存的美股已平倉損益 v1 格式匯入，只保留相容用途。")
            }
        }
        Section(preview.total > preview.sampleTrades.count ? "前 \(preview.sampleTrades.count) 筆" : "明細") {
            ForEach(Array(preview.sampleTrades.enumerated()), id: \.offset) { _, trade in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(trade.title)
                        if !trade.description.isEmpty { Text(trade.description).font(.caption).foregroundStyle(.secondary) }
                        Text([trade.date, trade.label].compactMap { $0 }.joined(separator: "・")).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(isPrivacyMode ? "****" : core.formatMoney(trade.amount, market: preview.market)).monospacedDigit()
                }
            }
        }
        if !preview.skippedRows.isEmpty {
            Section("略過 \(preview.skippedRows.count) 列") {
                ForEach(Array(preview.skippedRows.enumerated()), id: \.offset) { _, row in
                    VStack(alignment: .leading, spacing: 2) {
                        Text("第 \(row.row) 列・\(row.item)")
                        Text(row.reason).font(.caption).foregroundStyle(.orange)
                    }
                }
            }
        }
    }

    private func parse(_ text: String, allowArchived: Bool = false) {
        errorMessage = nil
        do {
            preview = try core.previewStockImport(text: text, usDateFormat: dateFormat, allowArchived: allowArchived)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        guard let preview else { return }
        errorMessage = nil
        switch await model.saveChange({ try $0.addingStockTransactions(preview) }) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}

// MARK: - 新增持倉快照

struct HoldingSnapshotSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    /// 個股績效目前的市場：決定「帶入上次」帶哪個市場、新列的預設市場。
    let market: String
    @Environment(\.dismiss) private var dismiss
    @AppStorage("isPrivacyMode") private var isPrivacyMode = false

    @State private var month = String(CatLogCore.todayKey().prefix(7))
    @State private var note = ""
    @State private var rows: [HoldingRowInput]
    @State private var preview: HoldingSnapshotPreview?
    @State private var errorMessage: String?

    init(model: AppModel, core: CatLogCore, market: String) {
        self.model = model
        self.core = core
        self.market = market
        _rows = State(initialValue: [HoldingRowInput(market: market)])
    }

    private var marketLabel: String { market == "US" ? "美股" : "台股" }

    /// 最近 36 個月（新到舊），web 用 YYYY-MM 文字輸入，這裡改成選單避免打錯。
    private var monthOptions: [String] {
        let calendar = Calendar.current
        return (0..<36).compactMap { offset in
            calendar.date(byAdding: .month, value: -offset, to: Date()).map { String(CatLogCore.todayKey($0).prefix(7)) }
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                if let preview { previewSections(preview) } else { inputSections }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle(preview == nil ? "新增持倉快照" : "確認持倉快照")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if preview != nil { Button("返回") { preview = nil } } else { Button("取消") { dismiss() } }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if preview != nil {
                        Button("確認匯入") { Task { await save() } }.disabled(model.isSaving)
                    } else {
                        Button("預覽") { buildPreview() }
                    }
                }
            }
            .interactiveDismissDisabled(model.isSaving)
            .overlay { if model.isSaving { ProgressView("儲存中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
        }
    }

    @ViewBuilder private var inputSections: some View {
        Section {
            Picker("快照月份", selection: $month) {
                ForEach(monthOptions, id: \.self) { Text($0).tag($0) }
            }
            TextField("版本備註，例如：10 月底", text: $note)
        } footer: {
            Text("用來記錄月底持股市值，每次寫入都會新增一個版本。")
        }
        Section {
            let previous = (try? core.previousHoldingRows(market: market)) ?? []
            Button("帶入上次\(marketLabel)持倉", systemImage: "arrow.uturn.backward") {
                // 與 web 相同：保留其他市場已填的列，換成上次同市場的持股。
                let others = rows.filter { $0.market != market && !($0.name.isEmpty && $0.price.isEmpty && $0.shares.isEmpty) }
                rows = others + previous
                errorMessage = nil
            }
            .disabled(previous.isEmpty)
            ForEach($rows) { $row in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Picker("市場", selection: $row.market) {
                            Text("台股").tag("TW")
                            Text("美股").tag("US")
                        }
                        .labelsHidden()
                        .fixedSize()
                        TextField("AAPL / 2330 / 台積電", text: $row.name)
                    }
                    HStack {
                        TextField("現價", text: $row.price).numericField($row.price)
                        Divider()
                        TextField("股數", text: $row.shares).numericField($row.shares)
                    }
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    if rows.count > 1 {
                        Button(role: .destructive) { rows.removeAll { $0.id == row.id } } label: {
                            Label("刪除", systemImage: "trash")
                        }
                        .tint(.red)
                    }
                }
            }
            Button("再加一檔", systemImage: "plus") { rows.append(HoldingRowInput(market: rows.last?.market ?? market)) }
        } header: {
            Text("持倉")
        } footer: {
            Text("向左滑可刪除一列。名稱、現價、股數有缺的列會略過。")
        }
    }

    @ViewBuilder private func previewSections(_ preview: HoldingSnapshotPreview) -> some View {
        Section {
            HStack {
                Text("目前市值").foregroundStyle(.secondary)
                Spacer()
                Text(isPrivacyMode ? "****" : core.formatMoney(preview.totalMarketValue, market: market)).bold().monospacedDigit()
            }
        } header: {
            Text("將新增 \(preview.month) 的新版本，共 \(preview.holdings.count) 檔")
        } footer: {
            if preview.skippedCount > 0 { Text("略過 \(preview.skippedCount) 列不完整的持倉資料。") }
        }
        Section("持股") {
            ForEach(Array(preview.holdings.enumerated()), id: \.offset) { _, holding in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(holding.name)
                        Text("\(holding.shares.formatted()) 股・\(holding.market == "US" ? "美股" : "台股")").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(isPrivacyMode ? "****" : core.formatMoney(holding.marketValue, market: holding.market)).monospacedDigit()
                }
            }
        }
    }

    private func buildPreview() {
        errorMessage = nil
        do {
            preview = try core.holdingSnapshotPreview(month: month, note: note, rows: rows)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        guard let preview else { return }
        errorMessage = nil
        switch await model.saveChange({ try $0.addingHoldingSnapshot(preview) }) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}
