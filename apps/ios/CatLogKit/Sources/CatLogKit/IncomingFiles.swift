import Combine
import Foundation

/// 從其他 App「分享／打開方式」送進來的檔案（例如郵件附件、Dropbox 裡的 MOZE CSV）。
public struct IncomingFile: Identifiable, Equatable, Sendable {
    public let id = UUID()
    public let name: String
    public let text: String

    public init(name: String, text: String) {
        self.name = name
        self.text = text
    }
}

public enum IncomingFileError: LocalizedError, Equatable {
    case unsupported(String)
    case unreadable(String)

    public var errorDescription: String? {
        switch self {
        case .unsupported(let name): return "「\(name)」不是 CSV 檔，目前只能直接打開 MOZE 匯出的花費 CSV。"
        case .unreadable(let name): return "讀不到「\(name)」的內容，請確認檔案是 UTF-8 文字檔。"
        }
    }
}

/// 收件匣：App 收到檔案時先讀成文字放著，等登入、解鎖、資料載入完成的畫面來取。
/// 系統會把檔案複製到 Documents/Inbox，讀完就刪掉，不留財務資料在裝置上。
@MainActor
public final class IncomingFileInbox: ObservableObject {
    public static let shared = IncomingFileInbox()

    /// 還沒處理的檔案；同時只保留最新的一個。
    @Published public private(set) var pending: IncomingFile?
    /// 收檔失敗的原因（不是 CSV、讀不到），由畫面顯示後清掉。
    @Published public private(set) var failure: IncomingFileError?

    private let fileManager: FileManager

    public init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
    }

    /// 處理 `onOpenURL` 收到的網址。不是檔案（例如 Google 登入回呼）時回傳 false，交給其他處理。
    @discardableResult
    public func receive(_ url: URL) -> Bool {
        guard url.isFileURL else { return false }
        let name = url.lastPathComponent
        defer { removeInboxCopy(url) }
        guard url.pathExtension.lowercased() == "csv" else {
            failure = .unsupported(name)
            return true
        }
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            failure = .unreadable(name)
            return true
        }
        failure = nil
        pending = IncomingFile(name: name, text: text)
        return true
    }

    /// 取出待處理的檔案（取出後就清空，避免重複匯入）。
    public func take() -> IncomingFile? {
        defer { pending = nil }
        return pending
    }

    public func clearFailure() {
        failure = nil
    }

    /// 只刪系統複製進 App 的 Inbox 副本；原地打開的外部檔案不動。
    private func removeInboxCopy(_ url: URL) {
        guard url.deletingLastPathComponent().lastPathComponent == "Inbox" else { return }
        try? fileManager.removeItem(at: url)
    }
}
