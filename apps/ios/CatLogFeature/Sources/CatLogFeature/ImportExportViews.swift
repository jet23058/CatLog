import CatLogKit
import CoreTransferable
import SwiftUI
import UniformTypeIdentifiers

/// 匯出用的備份檔：分享時才產生內容（資料以 core 目前載入的為準）。
struct BackupFile: Transferable {
    let core: CatLogCore

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .json) { file in
            let name = (try? file.core.backupFileName(today: CatLogCore.todayKey())) ?? "meow-assets-backup.json"
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
            try file.core.backupText().write(to: url, atomically: true, encoding: .utf8)
            return SentTransferredFile(url)
        }
    }
}

/// 首頁「資料」區塊：匯出備份、匯入備份、匯入 MOZE 花費。
struct DataToolsSection: View {
    @ObservedObject var model: AppModel
    let core: CatLogCore

    private enum ImportKind { case backup, expenses }
    @State private var importKind: ImportKind?
    @State private var showImporter = false
    // 預覽放在有固定 id 的盒子裡，sheet 才不會每次重繪都以為換了一份而重新開關。
    @State private var backupBox: PreviewBox?
    @State private var expenseBox: PreviewBox?
    @State private var errorMessage: String?

    var body: some View {
        Section {
            ShareLink(item: BackupFile(core: core), preview: SharePreview("極簡貓資產備份")) {
                Label("匯出備份（JSON）", systemImage: "square.and.arrow.up")
            }
            Button { start(.backup) } label: {
                Label("匯入備份（JSON）", systemImage: "square.and.arrow.down")
            }
            .disabled(!model.compatibility.canWrite)
            Button { start(.expenses) } label: {
                Label("匯入 MOZE 花費（CSV）", systemImage: "tablecells")
            }
            .disabled(!model.compatibility.canWrite)
        } header: {
            Text("資料")
        } footer: {
            Text("匯入前會先顯示差異，確認後才寫入。匯入備份會取代整份資料；匯入花費只覆蓋 CSV 裡出現的月份。")
        }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: importKind == .expenses ? [.commaSeparatedText, .plainText] : [.json, .plainText]
        ) { result in
            handle(result)
        }
        .sheet(item: $backupBox) { box in
            if let preview = box.backup { BackupImportSheet(model: model, preview: preview) { backupBox = nil } }
        }
        .sheet(item: $expenseBox) { box in
            if let preview = box.expenses { ExpenseImportSheet(model: model, preview: preview) { expenseBox = nil } }
        }
        .alert("無法匯入", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
            Button("好") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func start(_ kind: ImportKind) {
        importKind = kind
        showImporter = true
    }

    private func handle(_ result: Result<URL, Error>) {
        do {
            let url = try result.get()
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            let text = try String(contentsOf: url, encoding: .utf8)
            switch importKind {
            case .backup: backupBox = PreviewBox(try core.previewBackupImport(text: text))
            case .expenses: expenseBox = PreviewBox(try core.previewExpenseImport(csv: text))
            case nil: break
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// 讓兩種預覽都能用 `.sheet(item:)`。
private struct PreviewBox: Identifiable {
    let id = UUID()
    var backup: BackupImportPreview?
    var expenses: ExpenseImportPreview?
    init(_ preview: BackupImportPreview) { backup = preview }
    init(_ preview: ExpenseImportPreview) { expenses = preview }
}

/// JSON 備份匯入預覽：每個區塊的筆數變化，確認後整份取代。
private struct BackupImportSheet: View {
    @ObservedObject var model: AppModel
    let preview: BackupImportPreview
    let onDone: () -> Void
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(preview.sections) { section in
                        HStack {
                            Text(section.label)
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(section.currentCount) → \(section.nextCount) 筆").monospacedDigit()
                                if section.changed {
                                    Text("新增 \(section.added)・刪除 \(section.removed)・修改 \(section.modified)")
                                        .font(.caption).foregroundStyle(.orange)
                                } else {
                                    Text("沒有變動").font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                } footer: {
                    if preview.hasChanges {
                        Text("確認後會用這份備份**取代整份雲端資料**，無法復原。建議先匯出目前資料備份。")
                    } else {
                        Text("備份內容與目前資料相同；仍可確認覆蓋還原。")
                    }
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("匯入備份")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消", action: onDone) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("確認匯入") {
                        Task {
                            switch await model.importBackup(preview) {
                            case .saved, .conflict: onDone()
                            case .failed(let message): errorMessage = message
                            }
                        }
                    }
                    .disabled(model.isSaving)
                }
            }
            .overlay { if model.isSaving { ProgressView("匯入中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
        }
    }
}

/// MOZE 花費匯入預覽：涉及的月份與每月變化，確認後只覆蓋這些月份。
private struct ExpenseImportSheet: View {
    @ObservedObject var model: AppModel
    let preview: ExpenseImportPreview
    let onDone: () -> Void
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("月份", value: "\(preview.months.count) 個月")
                    LabeledContent("花費筆數", value: "\(preview.totalRecords) 筆")
                }
                Section("各月變化") {
                    ForEach(preview.changedMonths) { month in
                        HStack {
                            Text(MonthDetailView.title(month.month))
                            Spacer()
                            if month.added + month.removed + month.modified == 0 {
                                Text("沒有變動").font(.caption).foregroundStyle(.secondary)
                            } else {
                                Text("新增 \(month.added)・刪除 \(month.removed)・修改 \(month.modified)")
                                    .font(.caption).foregroundStyle(.orange)
                            }
                        }
                    }
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("匯入 MOZE 花費")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消", action: onDone) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("確認匯入") {
                        Task {
                            switch await model.importExpenses(preview) {
                            case .saved, .conflict: onDone()
                            case .failed(let message): errorMessage = message
                            }
                        }
                    }
                    .disabled(model.isSaving || !preview.hasChanges)
                }
            }
            .overlay { if model.isSaving { ProgressView("匯入中…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) } }
        }
    }
}
