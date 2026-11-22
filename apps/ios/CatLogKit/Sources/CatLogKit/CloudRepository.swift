import Foundation

// 雲端儲存格式 v3 的讀寫，規則與 apps/web/src/cloudStorage.js 相同（見 docs/DATA_FORMAT.md）：
//
//   users/{uid}/meta/storage             指標文件
//   users/{uid}/chunks/{generation}_{i}  資料塊 { index, content, generation }
//   users/{uid}/history/{generation}     歷史版本（每次存檔一筆；保留規則在 core 的 selectHistoryToPrune）
//
// 切塊、checksum、舊格式解析、版本欄位都呼叫 packages/core，確保與 web 結果一致。
// Firestore 的存取放在 ChunkStore 協定後面，App 端提供 Firestore 實作，測試用記憶體實作。

/// meta/storage 文件。
public struct CloudMeta: Codable, Equatable, Sendable {
    public var schema: Int?
    public var revision: Int?
    public var generation: String?
    public var chunkCount: Int?
    public var checksum: String?
    public var length: Int?
    public var updatedAt: Double?
    public var deviceId: String?
    public var schemaVersion: Int?
    public var minClientVersion: String?

    public init(schema: Int? = nil, revision: Int? = nil, generation: String? = nil, chunkCount: Int? = nil,
                checksum: String? = nil, length: Int? = nil, updatedAt: Double? = nil, deviceId: String? = nil,
                schemaVersion: Int? = nil, minClientVersion: String? = nil) {
        self.schema = schema
        self.revision = revision
        self.generation = generation
        self.chunkCount = chunkCount
        self.checksum = checksum
        self.length = length
        self.updatedAt = updatedAt
        self.deviceId = deviceId
        self.schemaVersion = schemaVersion
        self.minClientVersion = minClientVersion
    }

    public func jsonString() throws -> String {
        String(decoding: try JSONEncoder().encode(self), as: UTF8.self)
    }
}

/// chunks 集合裡的一份文件。舊格式資料塊沒有 generation。
public struct StoredChunk: Equatable, Sendable {
    public let id: String
    public let index: Int
    public let content: String
    public let generation: String?

    public init(id: String, index: Int, content: String, generation: String?) {
        self.id = id
        self.index = index
        self.content = content
        self.generation = generation
    }
}

/// users/{uid}/history/{generation}：一個可以還原的歷史版本（core: createHistoryEntry）。
public struct HistoryEntry: Codable, Equatable, Sendable, Identifiable {
    public let generation: String
    public let revision: Int
    public let chunkCount: Int
    public let checksum: String
    public let length: Int
    public let savedAt: Double
    public let deviceId: String
    public let schemaVersion: Int
    /// 手動還原點：不會被自動清掉。nil 表示寫入時不改動（合併寫入，保留原本的設定）。
    public var pinned: Bool?
    public var label: String?
    public var id: String { generation }
    public var isRestorePoint: Bool { pinned == true }

    public init(generation: String, revision: Int, chunkCount: Int, checksum: String, length: Int, savedAt: Double, deviceId: String, schemaVersion: Int, pinned: Bool? = nil, label: String? = nil) {
        self.pinned = pinned
        self.label = label
        self.generation = generation
        self.revision = revision
        self.chunkCount = chunkCount
        self.checksum = checksum
        self.length = length
        self.savedAt = savedAt
        self.deviceId = deviceId
        self.schemaVersion = schemaVersion
    }

    public var savedDate: Date { Date(timeIntervalSince1970: savedAt / 1000) }
}

/// 雲端儲存的最小操作集合（對應 Firestore 的呼叫）。
public protocol ChunkStore: Sendable {
    /// users/{uid}/settings/history 的 mode；沒有設定檔時為 nil。
    func readHistoryMode() async throws -> String?
    func writeHistoryMode(_ mode: String) async throws
    func readHistory() async throws -> [HistoryEntry]
    func writeHistory(_ entries: [HistoryEntry]) async throws
    func deleteHistory(generation: String) async throws
    func readMeta() async throws -> CloudMeta?
    func readChunks(generation: String) async throws -> [StoredChunk]
    func readAllChunksOrderedByIndex() async throws -> [StoredChunk]
    func writeChunk(_ chunk: StoredChunk) async throws
    /// 交易：讀取最新 meta，交給 `update` 產生新 meta（或丟錯取消），再原子寫回。
    func updateMeta(_ update: @escaping @Sendable (CloudMeta?) throws -> CloudMeta) async throws -> CloudMeta
    func deleteChunks(ids: [String]) async throws
}

public struct CloudSnapshot: Sendable {
    /// 雲端資料 JSON；雲端沒有資料時為 nil。
    public let dataJSON: String?
    public let revision: Int
    public let chunkIds: [String]
    public let meta: CloudMeta?
}

public struct CloudWriteResult: Equatable, Sendable {
    public let revision: Int
    public let chunkIds: [String]
}

public enum CloudStorageError: Error, Equatable, LocalizedError {
    /// 雲端已被其他裝置更新。
    case conflict(remoteRevision: Int, expectedRevision: Int)
    /// 資料塊遺失、錯置或 checksum 不符。
    case integrity(String)

    public var errorDescription: String? {
        switch self {
        case .conflict(let remote, let expected):
            return "雲端資料已被其他裝置更新（雲端版本 \(remote)，本機版本 \(expected)）"
        case .integrity(let message):
            return message
        }
    }
}

public final class CloudRepository: @unchecked Sendable {
    let store: ChunkStore
    private let core: CoreBridge

    public init(store: ChunkStore, core: CoreBridge) {
        self.store = store
        self.core = core
    }

    /// 讀取雲端資料，並驗證資料塊數量、長度與 checksum。
    public func read() async throws -> CloudSnapshot {
        let meta = try await store.readMeta()

        if let meta, let generation = meta.generation {
            let chunks = try await store.readChunks(generation: generation).sorted { $0.index < $1.index }
            if chunks.count != meta.chunkCount {
                throw CloudStorageError.integrity("雲端資料塊數量不符（預期 \(meta.chunkCount ?? 0)，實際 \(chunks.count)）")
            }
            let json = chunks.map(\.content).joined()
            // 長度以 JavaScript 的 UTF-16 code unit 計算，與 web 相同。
            let checksum = try core.callString("hashString", [.string(json)])
            if json.utf16.count != meta.length || checksum != meta.checksum {
                throw CloudStorageError.integrity("雲端資料 checksum 驗證失敗，資料可能不完整")
            }
            return CloudSnapshot(dataJSON: json, revision: meta.revision ?? 0, chunkIds: chunks.map(\.id), meta: meta)
        }

        // 舊格式資料塊沒有 generation；有 generation 但沒有指標的是中斷寫入留下的孤兒資料塊。
        let legacy = try await store.readAllChunksOrderedByIndex().filter { $0.generation == nil }
        guard !legacy.isEmpty else {
            return CloudSnapshot(dataJSON: nil, revision: meta?.revision ?? 0, chunkIds: [], meta: meta)
        }
        let contentsJSON = String(decoding: try JSONEncoder().encode(legacy.map(\.content)), as: UTF8.self)
        let json = try core.callJSON("parseLegacyChunks", [.json(contentsJSON)])
        return CloudSnapshot(dataJSON: json, revision: meta?.revision ?? 0, chunkIds: legacy.map(\.id), meta: meta)
    }

    /// 寫入雲端資料：先寫完新 generation 的資料塊，再用交易確認版本並切換指標。
    ///
    /// - expectedRevision：本機最後讀到或寫入的版本；雲端不同時丟出 `.conflict`。
    /// - force：略過版本檢查（使用者明確選擇以本機覆蓋時）。
    /// - previousChunkIds：舊資料塊，切換成功後刪除。
    /// - chunkSize：每塊字元數，只有測試會改。
    public func write(
        dataJSON: String,
        expectedRevision: Int,
        force: Bool = false,
        previousChunkIds: [String] = [],
        deviceId: String = "",
        chunkSize: Int? = nil,
        now: Date = Date()
    ) async throws -> CloudWriteResult {
        // 與 web 相同：寫入前一律升級到目前的 schemaVersion。
        let json = try core.callJSON("migrateData", [.json(dataJSON)])
        var splitArguments: [CoreBridge.Argument] = [.string(json)]
        if let chunkSize { splitArguments.append(.int(chunkSize)) }
        let chunks: [String] = try core.call("splitIntoChunks", splitArguments)
        let checksum = try core.callString("hashString", [.string(json)])
        let length = json.utf16.count
        let generation = Self.makeGenerationId(now: now)

        if !force {
            let remoteRevision = try await store.readMeta()?.revision ?? 0
            if remoteRevision != expectedRevision {
                throw CloudStorageError.conflict(remoteRevision: remoteRevision, expectedRevision: expectedRevision)
            }
        }

        let newChunkIds = chunks.indices.map { "\(generation)_\($0)" }
        for (index, content) in chunks.enumerated() {
            try await store.writeChunk(StoredChunk(id: newChunkIds[index], index: index, content: content, generation: generation))
        }

        let core = self.core
        let meta: CloudMeta
        let previousBox = MetaCapture()
        do {
            meta = try await store.updateMeta { previous in
                previousBox.value = previous
                let remoteRevision = previous?.revision ?? 0
                if !force && remoteRevision != expectedRevision {
                    throw CloudStorageError.conflict(remoteRevision: remoteRevision, expectedRevision: expectedRevision)
                }
                let versions: MetaVersionFields = try core.call(
                    "buildMetaVersionFields",
                    [previous.map { .json((try? $0.jsonString()) ?? "null") } ?? .null]
                )
                return CloudMeta(
                    schema: 3,
                    revision: remoteRevision + 1,
                    generation: generation,
                    chunkCount: chunks.count,
                    checksum: checksum,
                    length: length,
                    updatedAt: (now.timeIntervalSince1970 * 1000).rounded(),
                    deviceId: deviceId,
                    schemaVersion: versions.schemaVersion,
                    minClientVersion: versions.minClientVersion
                )
            }
        } catch {
            // 指標沒有切換，新資料塊不會被讀到；盡量清掉。
            try? await store.deleteChunks(ids: newChunkIds)
            throw error
        }

        // 上一份保留成歷史版本（與 web 相同）。舊格式資料塊（沒有 generation）無法列入歷史，或歷史紀錄寫不進去
        // （例如 Firestore 規則還沒部署）時，照舊刪除上一份，避免資料塊無限累積。歷史失敗不影響這次存檔。
        let previous = previousBox.value
        var keepPrevious = false
        do {
            let mode = await resolvedHistoryMode(dataJSON: json)
            try await recordHistory(metas: [meta, previous].compactMap { $0 }, currentGeneration: generation, mode: mode, now: now)
            keepPrevious = previous?.generation != nil
        } catch {
            keepPrevious = false
        }
        if !keepPrevious {
            let stale = previousChunkIds.filter { !newChunkIds.contains($0) }
            try? await store.deleteChunks(ids: stale)
        }

        return CloudWriteResult(revision: meta.revision ?? expectedRevision + 1, chunkIds: newChunkIds)
    }

    // MARK: - 歷史版本

    /// 雲端歷史版本，新到舊。
    public func listHistory() async throws -> [HistoryEntry] {
        let text = String(decoding: try JSONEncoder().encode(try await store.readHistory()), as: UTF8.self)
        return try core.call("sortHistoryEntries", [.json(text)])
    }

    /// 讀出某個歷史版本的資料 JSON（驗證 checksum）。
    public func readVersion(_ entry: HistoryEntry) async throws -> String {
        let chunks = try await store.readChunks(generation: entry.generation)
        let chunksJSON = try JSONSerialization.data(withJSONObject: chunks.map { ["index": $0.index, "content": $0.content] })
        let entryJSON = String(decoding: try JSONEncoder().encode(entry), as: UTF8.self)
        return try core.callString("assembleHistoryVersion", [.json(entryJSON), .json(String(decoding: chunksJSON, as: UTF8.self))])
    }

    /// 目前的保留方式：設定檔優先，沒有時沿用資料裡的舊設定（core: resolveHistoryMode）。
    public func resolvedHistoryMode(dataJSON: String?) async -> String {
        let stored = try? await store.readHistoryMode()
        let settings: CoreBridge.Argument = stored.map { .object(["mode": .string($0)]) } ?? .null
        return (try? core.callString("resolveHistoryMode", [settings, dataJSON.map { .json($0) } ?? .null])) ?? "auto"
    }

    /// 切換保留方式：只寫設定檔，不重寫財務資料、不產生新版本。
    public func setHistoryMode(_ mode: String) async throws {
        _ = try core.callJSON("createHistorySettings", [.string(mode)]) // 不支援的值丟錯
        try await store.writeHistoryMode(mode)
    }

    /// 把目前的雲端版本設成手動還原點（不會被自動清掉）。
    public func createRestorePoint(label: String) async throws {
        guard let meta = try await store.readMeta() else { throw CloudStorageError.integrity("雲端還沒有可以設成還原點的版本，請先存檔一次。") }
        let text = try core.callJSON("createHistoryEntry", [.json(try meta.jsonString())])
        guard text != "null" else { throw CloudStorageError.integrity("雲端還沒有可以設成還原點的版本，請先存檔一次。") }
        var entry = try JSONDecoder().decode(HistoryEntry.self, from: Data(text.utf8))
        entry.pinned = true
        entry.label = try core.callString("normalizeRestorePointLabel", [.string(label)])
        try await store.writeHistory([entry])
    }

    /// 取消還原點：之後依一般的保留規則處理。
    public func clearRestorePoint(_ entry: HistoryEntry) async throws {
        var cleared = entry
        cleared.pinned = false
        cleared.label = ""
        try await store.writeHistory([cleared])
    }

    private func recordHistory(metas: [CloudMeta], currentGeneration: String, mode: String, now: Date) async throws {
        var entries: [HistoryEntry] = []
        for meta in metas {
            let text = try core.callJSON("createHistoryEntry", [.json(try meta.jsonString())])
            if text != "null" { entries.append(try JSONDecoder().decode(HistoryEntry.self, from: Data(text.utf8))) }
        }
        try await store.writeHistory(entries)
        let all = String(decoding: try JSONEncoder().encode(try await store.readHistory()), as: UTF8.self)
        let prune: [String] = try core.call("selectHistoryToPrune", [.json(all), .object([
            "now": .number((now.timeIntervalSince1970 * 1000).rounded()), "currentGeneration": .string(currentGeneration), "mode": .string(mode),
        ])])
        for generation in prune {
            let ids = try await store.readChunks(generation: generation).map(\.id)
            try await store.deleteChunks(ids: ids)
            try await store.deleteHistory(generation: generation)
        }
    }

    /// 與 web 的 createGenerationId 相同格式：g + 時間（36 進位）+ 6 位亂數。
    static func makeGenerationId(now: Date) -> String {
        let millis = Int64(now.timeIntervalSince1970 * 1000)
        let alphabet = Array("0123456789abcdefghijklmnopqrstuvwxyz")
        let random = String((0..<6).map { _ in alphabet.randomElement()! })
        return "g\(String(millis, radix: 36))\(random)"
    }
}

private struct MetaVersionFields: Decodable {
    let schemaVersion: Int
    let minClientVersion: String?
}

/// 在交易中記下切換前的指標文件（交易可能重試，以最後一次為準）。
private final class MetaCapture: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: CloudMeta?
    var value: CloudMeta? {
        get { lock.withLock { stored } }
        set { lock.withLock { stored = newValue } }
    }
}
