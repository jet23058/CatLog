import CatLogKit
import SwiftUI

/// 編輯一個月份：資產、收入、負債、備忘錄一起修改後再存檔，也可以刪除整月。
/// 可編輯的欄位與 web 月份明細的編輯模式相同；規則在 core（updateMonthDetails）。
struct EditMonthSheet: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore
    let monthKey: String
    /// 刪除整月後通知月份明細返回首頁。
    var onMonthDeleted: () -> Void = {}
    @Environment(\.dismiss) private var dismiss

    @State private var draft: MonthEditDraft?
    @State private var errorMessage: String?
    @State private var confirmDeleteMonth = false

    var body: some View {
        NavigationStack {
            Form {
                if draft != nil {
                    memoSection
                    assetsSection
                    incomesSection
                    debtsSection
                    Section {
                        Button("刪除整月紀錄", role: .destructive) { confirmDeleteMonth = true }
                    } footer: {
                        Text("會刪除這個月的資產、負債、備忘錄與負債異動；收入與花費會保留。")
                    }
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("編輯 \(MonthDetailView.title(monthKey))")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") { Task { await save() } }.disabled(model.isSaving || draft == nil)
                }
            }
            .confirmationDialog("確定要刪除 \(monthKey) 的資產、負債與備忘嗎？", isPresented: $confirmDeleteMonth, titleVisibility: .visible) {
                Button("刪除整月紀錄", role: .destructive) { Task { await deleteMonth() } }
            } message: {
                Text("收入與花費不會被刪除。")
            }
            .interactiveDismissDisabled(model.isSaving)
            .overlay { if model.isSaving { ProgressView("儲存中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
            .task {
                do { draft = try core.monthEditDraft(monthKey) } catch { errorMessage = error.localizedDescription }
            }
        }
    }

    // MARK: - Sections

    private var memoSection: some View {
        Section("備忘錄") {
            TextField("這個月的備忘", text: Binding(get: { draft?.memo ?? "" }, set: { draft?.memo = $0 }), axis: .vertical)
                .lineLimit(2...6)
        }
    }

    private var assetsSection: some View {
        Section {
            ForEach(draft?.assets.indices ?? 0..<0, id: \.self) { index in
                HStack {
                    TextField("名稱", text: assetBinding(index, "name"))
                    TextField("金額", text: assetBinding(index, "amount"))
                        .numericField(assetBinding(index, "amount"))
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 140)
                }
            }
            .onDelete { draft?.assets.remove(atOffsets: $0) }
        } header: {
            Text("資產（\(draft?.assetDate ?? "")）")
        } footer: {
            Text("向左滑可以刪除。")
        }
    }

    private var incomesSection: some View {
        Section("收入") {
            ForEach(draft?.incomes.indices ?? 0..<0, id: \.self) { index in
                VStack(alignment: .leading, spacing: 8) {
                    TextField("收入來源", text: incomeBinding(index, "company"))
                    TextField("入帳帳戶", text: incomeBinding(index, "bank")).font(.subheadline)
                    HStack {
                        Picker("幣別", selection: incomeBinding(index, "currency")) {
                            ForEach(core.supportedCurrencies, id: \.self) { Text($0).tag($0) }
                        }
                        .labelsHidden()
                        TextField("原幣金額", text: incomeBinding(index, "originalAmount"))
                            .numericField(incomeBinding(index, "originalAmount"))
                    }
                    if (draft?.incomes[index][text: "currency"] ?? "TWD") != "TWD" {
                        HStack {
                            TextField("匯率", text: incomeBinding(index, "exchangeRate"))
                                .numericField(incomeBinding(index, "exchangeRate"))
                            Spacer()
                            Text("台幣 \(core.formatMoney(Double(draft?.incomes[index][text: "amount"] ?? "") ?? 0))")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    TextField("備註", text: incomeBinding(index, "memo")).font(.caption)
                }
                .padding(.vertical, 4)
            }
            .onDelete { draft?.incomes.remove(atOffsets: $0) }
        }
    }

    private var debtsSection: some View {
        Section {
            ForEach(draft?.debts.indices ?? 0..<0, id: \.self) { index in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        TextField("負債名稱", text: debtBinding(index, "name"))
                        // 舊資料可能沒有類別：顯示成「其他」，只有真的改了才寫回。
                        Picker("類別", selection: Binding(
                            get: { let value = draft?.debts[safe: index]?[text: "category"] ?? ""; return value.isEmpty ? "other" : value },
                            set: { debtBinding(index, "category").wrappedValue = $0 }
                        )) {
                            ForEach(core.debtCategories, id: \.value) { Text($0.label).tag($0.value) }
                        }
                        .labelsHidden()
                    }
                    HStack {
                        TextField("機構 / 帳戶", text: debtBinding(index, "lender"))
                        TextField("金額", text: debtBinding(index, "amount"))
                            .numericField(debtBinding(index, "amount"))
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 140)
                    }
                    TextField("備註", text: debtBinding(index, "memo")).font(.caption)
                }
                .padding(.vertical, 4)
            }
            .onDelete { draft?.debts.remove(atOffsets: $0) }
        } header: {
            Text("負債（\(draft?.debtDate ?? "")）")
        } footer: {
            Text("修改的是這一天的負債快照，之後的日期不會自動跟著改。")
        }
    }

    // MARK: - Bindings

    private func assetBinding(_ index: Int, _ key: String) -> Binding<String> {
        Binding(get: { draft?.assets[safe: index]?[text: key] ?? "" },
                set: { if draft?.assets.indices.contains(index) == true { draft?.assets[index][text: key] = $0 } })
    }

    private func debtBinding(_ index: Int, _ key: String) -> Binding<String> {
        Binding(get: { draft?.debts[safe: index]?[text: key] ?? "" },
                set: { if draft?.debts.indices.contains(index) == true { draft?.debts[index][text: key] = $0 } })
    }

    /// 收入改原幣、匯率、幣別時交給 core 重算台幣金額。
    private func incomeBinding(_ index: Int, _ key: String) -> Binding<String> {
        Binding(get: { draft?.incomes[safe: index]?[text: key] ?? "" },
                set: { value in
                    guard let record = draft?.incomes[safe: index] else { return }
                    draft?.incomes[index] = (try? core.updatingIncome(record, field: key, value: value)) ?? record
                })
    }

    // MARK: - Actions

    private func save() async {
        guard let draft else { return }
        errorMessage = nil
        switch await model.saveMonthEdit(draft) {
        case .saved, .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }

    private func deleteMonth() async {
        errorMessage = nil
        switch await model.deleteMonth(monthKey) {
        case .saved:
            dismiss()
            onMonthDeleted()
        case .conflict: dismiss()
        case .failed(let message): errorMessage = message
        }
    }
}

extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}
