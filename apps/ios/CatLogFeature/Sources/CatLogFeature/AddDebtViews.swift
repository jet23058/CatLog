import CatLogKit
import SwiftUI

// 新增負債 / 負債異動。欄位與檢查和 web 的 AddDebtModal / AddDebtEventModal 相同（規則在 core 的 records.js）。

/// 質押股票 / 新利率的多列輸入。
private struct PledgeRowsEditor: View {
    @Binding var rows: [PledgeRowInput]
    let rateTitle: String

    var body: some View {
        ForEach($rows) { $row in
            VStack(alignment: .leading, spacing: 6) {
                TextField("股票代號 / 名稱", text: $row.symbol)
                HStack {
                    TextField("股數", text: $row.shares).numericField($row.shares, allowDecimal: false)
                    Divider()
                    TextField(rateTitle, text: $row.rate).numericField($row.rate)
                }
            }
        }
        .onDelete { offsets in
            guard rows.count > 1 else { return }
            rows.remove(atOffsets: offsets)
        }
        Button("再加一檔", systemImage: "plus") { rows.append(PledgeRowInput()) }
    }
}

// MARK: - 新增負債

struct AddDebtSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    @Environment(\.dismiss) private var dismiss

    @State private var date = Date()
    @State private var input = DebtInput(date: CatLogCore.todayKey())
    @State private var errorMessage: String?

    private var isStockPledge: Bool { input.category == "stock_pledge" }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("日期", selection: $date, displayedComponents: .date)
                        .onChange(of: date) { _, new in input.date = CatLogCore.todayKey(new) }
                    Picker("類別", selection: $input.category) {
                        ForEach(core.debtCategories, id: \.value) { Text($0.label).tag($0.value) }
                    }
                    .onChange(of: input.category) { _, new in
                        if new == "stock_pledge" { input.name = "股票質押" }
                    }
                    TextField("負債名稱", text: $input.name)
                        .disabled(isStockPledge)
                    HStack {
                        TextField("機構 / 帳戶", text: $input.lender)
                        let accounts = (try? core.debtAccountOptions(date: input.date)) ?? []
                        if !accounts.isEmpty {
                            Menu {
                                ForEach(accounts, id: \.self) { account in Button(account) { input.lender = account } }
                            } label: {
                                Image(systemName: "list.bullet")
                            }
                        }
                    }
                    TextField("金額（TWD）", text: $input.amount).numericField($input.amount)
                }

                if isStockPledge {
                    Section {
                        PledgeRowsEditor(rows: $input.pledgeStocks, rateTitle: "利率 %")
                    } header: {
                        Text("質押股票")
                    } footer: {
                        let monthly = core.estimatedMonthlyPledgeInterest(input)
                        if monthly > 0 {
                            Text("預估月息 \(core.formatMoney(monthly))・年息 \(core.formatMoney(monthly * 12))")
                        }
                    }
                }

                Section {
                    TextField("備註（選填）", text: $input.memo, axis: .vertical)
                } footer: {
                    Text("新增後會延續到之後的負債快照；存檔前會先合併雲端最新的負債，不會蓋掉其他裝置剛新增的負債。")
                }

                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("新增負債")
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

    private func save() async {
        errorMessage = nil
        if let error = try? core.debtInputError(input) {
            errorMessage = error
            return
        }
        switch await model.addDebt(input, dateKey: input.date) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}

// MARK: - 新增負債異動

struct AddDebtEventSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    let monthKey: String
    @Environment(\.dismiss) private var dismiss

    @State private var date = Date()
    @State private var input: DebtEventInput
    @State private var targets: [DebtEventTarget] = []
    @State private var errorMessage: String?

    private static let types: [(String, String)] = [
        ("borrow", "借款增加"), ("repay", "還本金"), ("interest", "利息"),
        ("fee", "手續費"), ("collateral", "只記擔保品"), ("rate_change", "利率調整"),
    ]

    init(model: AppModel, core: CatLogCore, monthKey: String) {
        self.model = model
        self.core = core
        self.monthKey = monthKey
        let defaultDate = (try? core.debtEventDefaultDate(monthKey: monthKey, today: CatLogCore.todayKey())) ?? "\(monthKey)-01"
        _input = State(initialValue: DebtEventInput(monthKey: monthKey, date: defaultDate))
        _date = State(initialValue: RangeStatsView.date(defaultDate) ?? Date())
    }

    private var monthRange: ClosedRange<Date> {
        let start = RangeStatsView.date("\(monthKey)-01") ?? Date()
        let end = Calendar.current.date(byAdding: DateComponents(month: 1, day: -1), to: start) ?? start
        return start...end
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("日期", selection: $date, in: monthRange, displayedComponents: .date)
                        .onChange(of: date) { _, new in input.date = CatLogCore.todayKey(new) }
                    Picker("類型", selection: $input.type) {
                        ForEach(Self.types, id: \.0) { Text($0.1).tag($0.0) }
                    }
                    .onChange(of: input.type) { _, new in if new == "rate_change" { selectTarget(input.target ?? targets.first) } }
                }

                if input.type == "rate_change" {
                    Section {
                        if targets.isEmpty {
                            Text("本月尚無可調整的股票質押").foregroundStyle(.secondary)
                        } else {
                            Picker("調整對象", selection: Binding(get: { input.target }, set: { selectTarget($0) })) {
                                ForEach(targets) { Text($0.title).tag(Optional($0)) }
                            }
                        }
                    }
                    Section("調整後利率") {
                        PledgeRowsEditor(rows: $input.rateRows, rateTitle: "新利率 %")
                    }
                } else {
                    Section {
                        TextField("負債名稱", text: $input.name)
                        TextField("機構 / 帳戶", text: $input.lender)
                        if input.type != "collateral" {
                            TextField("金額（TWD）", text: $input.amount).numericField($input.amount)
                        }
                    }
                    if input.type == "collateral" {
                        Section {
                            TextField("擔保品，例如 2330:1000, 0050:500", text: $input.collateralText)
                        } footer: {
                            Text("股票代號與股數用冒號分隔，多檔用逗號分隔。")
                        }
                    }
                }

                Section {
                    TextField("備註（選填）", text: $input.memo, axis: .vertical)
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("新增負債異動")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("確認新增") { Task { await save() } }.disabled(model.isSaving)
                }
            }
            .interactiveDismissDisabled(model.isSaving)
            .overlay { if model.isSaving { ProgressView("儲存中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
            .task { targets = (try? core.debtEventTargets(monthKey: monthKey)) ?? [] }
        }
    }

    /// 與 web 相同：選對象時帶入名稱、機構與目前的質押股票利率。
    private func selectTarget(_ target: DebtEventTarget?) {
        input.target = target
        guard let target else { return }
        input.name = target.name
        input.lender = target.lender
        input.rateRows = target.pledgeStocks.isEmpty ? [PledgeRowInput()] : target.pledgeStocks
    }

    private func save() async {
        errorMessage = nil
        if let error = try? core.debtEventInputError(input) {
            errorMessage = error
            return
        }
        switch await model.addDebtEvent(input) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}
