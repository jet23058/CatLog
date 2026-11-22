import Foundation
@testable import CatLogKit

/// 測試用的記憶體版 ChunkStore，行為對應 Firestore（與 web 的 cloudStorage.test.js 相同）。
final class InMemoryChunkStore: ChunkStore, @unchecked Sendable {
    private let lock = NSLock()
    private(set) var meta: CloudMeta?
    private(set) var chunks: [String: StoredChunk] = [:]
    private(set) var history: [String: HistoryEntry] = [:]
    private(set) var historyMode: String?
    var failTransaction: Error?

    func readHistoryMode() async throws -> String? { lock.withLock { historyMode } }
    func writeHistoryMode(_ mode: String) async throws { lock.withLock { historyMode = mode } }

    func readHistory() async throws -> [HistoryEntry] { lock.withLock { Array(history.values) } }
    /// 與 Firestore 的 merge 寫入相同：pinned / label 為 nil 時保留原本的值。
    func writeHistory(_ entries: [HistoryEntry]) async throws {
        lock.withLock {
            for var entry in entries {
                if let existing = history[entry.generation] {
                    entry.pinned = entry.pinned ?? existing.pinned
                    entry.label = entry.label ?? existing.label
                }
                history[entry.generation] = entry
            }
        }
    }
    func deleteHistory(generation: String) async throws { lock.withLock { _ = history.removeValue(forKey: generation) } }
    func setHistory(_ entry: HistoryEntry) { lock.withLock { history[entry.generation] = entry } }

    func readMeta() async throws -> CloudMeta? {
        lock.withLock { meta }
    }

    func readChunks(generation: String) async throws -> [StoredChunk] {
        lock.withLock { chunks.values.filter { $0.generation == generation } }
    }

    func readAllChunksOrderedByIndex() async throws -> [StoredChunk] {
        lock.withLock { chunks.values.sorted { $0.index < $1.index } }
    }

    func writeChunk(_ chunk: StoredChunk) async throws {
        lock.withLock { chunks[chunk.id] = chunk }
    }

    func updateMeta(_ update: @escaping @Sendable (CloudMeta?) throws -> CloudMeta) async throws -> CloudMeta {
        try lock.withLock {
            if let failTransaction { throw failTransaction }
            let next = try update(meta)
            meta = next
            return next
        }
    }

    func deleteChunks(ids: [String]) async throws {
        lock.withLock { ids.forEach { chunks.removeValue(forKey: $0) } }
    }

    // 測試輔助
    func setMeta(_ value: CloudMeta?) { lock.withLock { meta = value } }
    func setChunk(_ chunk: StoredChunk) { lock.withLock { chunks[chunk.id] = chunk } }
    var chunkCount: Int { lock.withLock { chunks.count } }
}
