import Foundation

// 雲端儲存格式 v3 的讀寫，規則與 apps/web/src/cloudStorage.js 相同（見 docs/DATA_FORMAT.md）：
//
//   users/{uid}/meta/storage             指標文件
//   users/{uid}/chunks/{generation}_{i}  資料塊 { index, content, generation }
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

/// 雲端儲存的最小操作集合（對應 Firestore 的呼叫）。
public protocol ChunkStore: Sendable {
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
    private let store: ChunkStore
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
        do {
            meta = try await store.updateMeta { previous in
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

        let stale = previousChunkIds.filter { !newChunkIds.contains($0) }
        try? await store.deleteChunks(ids: stale)

        return CloudWriteResult(revision: meta.revision ?? expectedRevision + 1, chunkIds: newChunkIds)
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
