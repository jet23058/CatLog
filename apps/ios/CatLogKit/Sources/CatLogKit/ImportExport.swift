import Foundation

// 備份匯出 / 匯入與 MOZE 花費 CSV 匯入。規則在 core 的 importExport.js（與 web 相同）。

public struct BackupImportSection: Decodable, Equatable, Sendable, Identifiable {
    public let key: String
    public let label: String
    public let currentCount: Int
    public let nextCount: Int
    public let changed: Bool
    public let added: Int
    public let removed: Int
    public let modified: Int
    public var id: String { key }
}

/// JSON 備份匯入前的預覽。`dataJSON` 是解析後的備份資料，確認後原樣寫入。
public struct BackupImportPreview: Sendable {
    public let dataJSON: String
    public let hasChanges: Bool
    public let sections: [BackupImportSection]
}

public struct ExpenseImportMonth: Decodable, Equatable, Sendable, Identifiable {
    public let month: String
    public let added: Int
    public let removed: Int
    public let modified: Int
    public var id: String { month }
}

/// MOZE 花費 CSV 匯入前的預覽。`expensesJSON` 是依月份分組的花費，確認後合併寫入。
public struct ExpenseImportPreview: Sendable {
    public let expensesJSON: String
    public let months: [String]
    public let totalRecords: Int
    public let changedMonths: [ExpenseImportMonth]
    public let hasChanges: Bool
}

private struct BackupSummary: Decodable {
    let hasChanges: Bool
    let sections: [BackupImportSection]
}

private struct ExpenseSummary: Decodable {
    let months: [String]
    let totalRecords: Int
    let changedMonths: [ExpenseImportMonth]
    let hasChanges: Bool
}

extension CatLogCore {
    public func backupFileName(today: String) throws -> String {
        try bridge.callString("getBackupFileName", [.string(today)])
    }

    /// 目前資料的完整備份（JSON 文字）。
    public func backupText() throws -> String {
        try bridge.callString("createBackupText", [.data])
    }

    /// 解析備份檔並和目前資料比較；格式錯誤時丟出 core 的錯誤訊息。
    public func previewBackupImport(text: String) throws -> BackupImportPreview {
        let dataJSON = try bridge.callJSON("parseBackupText", [.string(text)])
        let summary: BackupSummary = try bridge.call("summarizeBackupImport", [.data, .json(dataJSON)])
        return BackupImportPreview(dataJSON: dataJSON, hasChanges: summary.hasChanges, sections: summary.sections)
    }

    /// 解析 MOZE 花費 CSV 並和目前花費比較；格式錯誤時丟出 core 的錯誤訊息。
    public func previewExpenseImport(csv: String) throws -> ExpenseImportPreview {
        let expensesJSON = try bridge.callJSON("parseExpenseCSV", [.string(csv)])
        let summary: ExpenseSummary = try bridge.call("summarizeExpenseImport", [.dataField("expenses"), .json(expensesJSON)])
        return ExpenseImportPreview(expensesJSON: expensesJSON, months: summary.months, totalRecords: summary.totalRecords,
                                    changedMonths: summary.changedMonths, hasChanges: summary.hasChanges)
    }

    /// 回傳匯入花費後的完整資料 JSON（只覆蓋 CSV 裡的月份）。
    public func mergingExpenses(_ preview: ExpenseImportPreview) throws -> String {
        try bridge.callJSON("mergeExpenseImport", [.data, .json(preview.expensesJSON)])
    }

    /// 回傳匯入備份後的完整資料 JSON（整份取代，與 web 相同）。
    public func importingBackup(_ preview: BackupImportPreview) throws -> String {
        try bridge.callJSON("normalizeAppData", [.json(preview.dataJSON)])
    }
}
