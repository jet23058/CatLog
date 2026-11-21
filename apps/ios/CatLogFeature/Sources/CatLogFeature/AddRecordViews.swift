import CatLogKit
import SwiftUI

// 新增資產 / 收入。欄位、驗證與換算規則與 web 的 AddAssetModal / AddIncomeModal 相同（規則在 core 的 records.js）。

extension View {
    /// 數字欄位：螢幕鍵盤用數字鍵盤，並過濾實體鍵盤或注音輸入法打出的非數字字元。
    func numericField(_ text: Binding<String>, allowDecimal: Bool = true, maxFractionDigits: Int? = nil) -> some View {
        self
            .keyboardType(allowDecimal ? .decimalPad : .numberPad)
            .onChange(of: text.wrappedValue) { _, new in
                let clean = NumericInput.sanitize(new, allowDecimal: allowDecimal, maxFractionDigits: maxFractionDigits)
                if clean != new { text.wrappedValue = clean }
            }
    }
}

/// 同一個月份、同一幣別的匯率，在新增資產與收入之間共用（與 web 的 exchangeRateCache 相同，只存在這次開啟期間）。
@MainActor
enum ExchangeRateMemory {
    private static var rates: [String: String] = [:]
    static func rate(month: String, currency: String) -> String? { rates["\(month)-\(currency)"] }
    static func remember(_ rate: String, month: String, currency: String) {
        guard Double(rate) != nil else { return }
        rates["\(month)-\(currency)"] = rate
    }
}

/// 從 exchangerate-api.com 抓「1 外幣 = ? 台幣」（與 web 同一個來源），失敗時用 core 的預設匯率。
enum ExchangeRateFetcher {
    struct Response: Decodable { let rates: [String: Double] }

    static func rateToTWD(_ currency: String) async -> Double? {
        guard let url = URL(string: "https://api.exchangerate-api.com/v4/latest/\(currency)") else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 5
        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let response = try? JSONDecoder().decode(Response.self, from: data) else { return nil }
        return response.rates["TWD"]
    }
}

/// 幣別、匯率、原幣金額與換算後台幣（資產與收入共用）。
private struct CurrencyAmountFields: View {
    let core: CatLogCore
    let month: String
    @Binding var currency: String
    @Binding var exchangeRate: String
    @Binding var originalAmount: String
    @Binding var message: String?
    @State private var isFetching = false

    var body: some View {
        Picker("幣別", selection: $currency) {
            ForEach(core.supportedCurrencies, id: \.self) { Text($0).tag($0) }
        }
        .onChange(of: currency) { _, _ in restoreRate() }
        // 換到別的月份時，改用那個月份記住的匯率（與 web 相同）。
        .onChange(of: month) { _, _ in restoreRate() }
        TextField(currency == "TWD" ? "金額" : "原幣金額（\(currency)）", text: $originalAmount)
            .numericField($originalAmount, maxFractionDigits: 2)
        if currency != "TWD" {
            HStack {
                TextField("匯率", text: $exchangeRate)
                    .numericField($exchangeRate)
                    .onChange(of: exchangeRate) { _, new in ExchangeRateMemory.remember(new, month: month, currency: currency) }
                Button {
                    Task { await fetchRate() }
                } label: {
                    if isFetching { ProgressView() } else { Text("抓取匯率") }
                }
                .buttonStyle(.borderless)
                .disabled(isFetching)
            }
            HStack {
                Text("台幣金額").foregroundStyle(.secondary)
                Spacer()
                Text(core.formatMoney(core.convertToTWD(originalAmount: originalAmount, exchangeRate: exchangeRate, currency: currency)))
                    .monospacedDigit()
            }
        }
    }

    private func restoreRate() {
        if currency == "TWD" {
            exchangeRate = "1"
        } else if let remembered = ExchangeRateMemory.rate(month: month, currency: currency) {
            exchangeRate = remembered
        }
    }

    private func fetchRate() async {
        isFetching = true
        defer { isFetching = false }
        if let rate = await ExchangeRateFetcher.rateToTWD(currency) {
            exchangeRate = String(rate)
            message = nil
        } else if let fallback = core.defaultExchangeRate(currency) {
            exchangeRate = String(fallback)
            message = "無法連線，已使用預設匯率"
        } else {
            message = "匯率抓取失敗，請手動輸入"
        }
    }
}

// MARK: - 新增資產

struct AddAssetSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    @Environment(\.dismiss) private var dismiss

    @State private var date = Date()
    @State private var type = "fixed"
    @State private var name = ""
    @State private var currency = "TWD"
    @State private var exchangeRate = "1"
    @State private var originalAmount = ""
    @State private var pending: [AssetEntry] = []
    @State private var importedPrevious = false
    @State private var message: String?
    @State private var errorMessage: String?

    private var dateKey: String { CatLogCore.todayKey(date) }
    private var hasDraft: Bool { !name.isEmpty || !originalAmount.isEmpty }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("日期", selection: $date, displayedComponents: .date)
                        .onChange(of: date) { _, _ in importedPrevious = false }
                    Picker("類型", selection: $type) {
                        Text("固定資產").tag("fixed")
                        Text("浮動資產").tag("floating")
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    HStack {
                        TextField("資產名稱", text: $name)
                        let options = ((try? core.assetNameOptions()) ?? []).filter { $0.type == type }
                        if !options.isEmpty {
                            Menu {
                                ForEach(options, id: \.self) { option in
                                    Button(option.name) { selectName(option.name) }
                                }
                            } label: {
                                Image(systemName: "list.bullet")
                            }
                        }
                    }
                    CurrencyAmountFields(core: core, month: String(dateKey.prefix(7)), currency: $currency,
                                         exchangeRate: $exchangeRate, originalAmount: $originalAmount, message: $message)
                    Button("加入清單", systemImage: "plus.circle") { addDraft() }
                        .disabled(!hasDraft)
                } header: {
                    Text("新增一筆")
                } footer: {
                    if let message { Text(message) }
                }

                if let previous = try? core.previousAssetSnapshot(date: dateKey), let previousDate = previous.date, !importedPrevious {
                    Section {
                        Button("帶入上次資產（\(previousDate)，\(previous.assets.count) 筆）", systemImage: "arrow.down.doc") {
                            importPrevious()
                        }
                    } footer: {
                        Text("會略過這天或清單裡已經有的「名稱 + 幣別」。")
                    }
                }

                if !pending.isEmpty {
                    Section("待新增（\(pending.count) 筆）") {
                        ForEach(pending) { entry in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(entry.name)
                                    Text("\(entry.isFloating ? "浮動" : "固定")・\(entry.currency)").font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(core.formatMoney(entry.amount)).monospacedDigit()
                            }
                        }
                        .onDelete { pending.remove(atOffsets: $0) }
                    }
                }

                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("新增資產")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存全部") { Task { await saveAll() } }
                        .disabled(model.isSaving || (pending.isEmpty && !hasDraft))
                }
            }
            .interactiveDismissDisabled(model.isSaving)
            .overlay { if model.isSaving { ProgressView("儲存中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
        }
    }

    private func selectName(_ selected: String) {
        name = selected
        if let latest = try? core.latestAsset(named: selected), latest.type == type {
            currency = latest.currency ?? "TWD"
            if latest.exchangeRate > 0 { exchangeRate = String(latest.exchangeRate) }
        }
    }

    /// 與 web 的 getDraftAsset 相同：名稱與金額必填，同天「名稱 + 幣別」重複時擋下。
    private func makeDraft() -> AssetEntry? {
        errorMessage = nil
        let cleanName = name.trimmingCharacters(in: .whitespaces)
        guard !cleanName.isEmpty, !originalAmount.isEmpty else {
            errorMessage = "請填寫名稱與金額"
            return nil
        }
        guard let draft = try? core.createAssetEntry(
            id: "asset-\(Int(Date().timeIntervalSince1970 * 1000))-\(pending.count)",
            type: type, name: cleanName, originalAmount: originalAmount,
            currency: currency, exchangeRate: exchangeRate, date: dateKey
        ) else { return nil }
        // 用實際要存的日期檢查：清單裡的項目可能是改日期前加的。
        if let duplicate = try? core.findDuplicateAsset(dateKey: dateKey, entries: pending + [draft]) {
            errorMessage = "「\(duplicate)」在 \(dateKey) 已存在，請使用編輯功能。"
            return nil
        }
        return draft
    }

    private func addDraft() {
        guard let draft = makeDraft() else { return }
        pending.append(draft)
        name = ""
        originalAmount = ""
    }

    private func importPrevious() {
        let imported = (try? core.importablePreviousAssets(
            date: dateKey, pending: pending, idPrefix: "asset-import-\(Int(Date().timeIntervalSince1970 * 1000))"
        )) ?? []
        pending.append(contentsOf: imported)
        importedPrevious = true
    }

    private func saveAll() async {
        var entries = pending
        if hasDraft {
            guard let draft = makeDraft() else { return }
            entries.append(draft)
        }
        guard !entries.isEmpty else { errorMessage = "請先加入至少一筆資產"; return }
        if let duplicate = try? core.findDuplicateAsset(dateKey: dateKey, entries: entries) {
            errorMessage = "「\(duplicate)」在 \(dateKey) 重複，請刪除其中一筆或改用編輯功能。"
            return
        }
        switch await model.addAssets(entries, dateKey: dateKey) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}

// MARK: - 新增收入

struct AddIncomeSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    @Environment(\.dismiss) private var dismiss

    @State private var date = Date()
    @State private var company = ""
    @State private var bank = ""
    @State private var currency = "TWD"
    @State private var exchangeRate = "1"
    @State private var originalAmount = ""
    @State private var memo = ""
    @State private var message: String?
    @State private var errorMessage: String?

    private var dateKey: String { CatLogCore.todayKey(date) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("日期", selection: $date, displayedComponents: .date)
                    TextField("收入來源（例如：Google、永豐銀行）", text: $company)
                    HStack {
                        TextField("入帳帳戶（選填）", text: $bank)
                        let accounts = ((try? core.assetNameOptions()) ?? []).map(\.name)
                        if !accounts.isEmpty {
                            Menu {
                                ForEach(accounts, id: \.self) { account in Button(account) { bank = account } }
                            } label: {
                                Image(systemName: "list.bullet")
                            }
                        }
                    }
                }
                Section {
                    CurrencyAmountFields(core: core, month: String(dateKey.prefix(7)), currency: $currency,
                                         exchangeRate: $exchangeRate, originalAmount: $originalAmount, message: $message)
                } footer: {
                    if let message { Text(message) }
                }
                Section {
                    TextField("備註（選填）", text: $memo, axis: .vertical)
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("新增收入")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("確認新增") { Task { await save() } }.disabled(model.isSaving)
                }
            }
            .interactiveDismissDisabled(model.isSaving)
            .overlay { if model.isSaving { ProgressView("儲存中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
        }
    }

    /// 與 web 相同：收入來源與金額必填。
    private func save() async {
        errorMessage = nil
        let cleanCompany = company.trimmingCharacters(in: .whitespaces)
        guard !cleanCompany.isEmpty else { errorMessage = "請輸入收入來源"; return }
        guard !originalAmount.isEmpty else { errorMessage = "請輸入金額"; return }
        guard let entry = try? core.createIncomeSource(
            date: dateKey, company: cleanCompany, bank: bank, currency: currency,
            originalAmount: originalAmount, exchangeRate: exchangeRate, memo: memo
        ) else { errorMessage = "無法建立收入資料"; return }
        switch await model.addIncome(entry, dateKey: dateKey) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}
