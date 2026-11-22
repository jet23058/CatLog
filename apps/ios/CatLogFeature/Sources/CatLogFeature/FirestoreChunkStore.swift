import CatLogKit
import FirebaseFirestore
import Foundation

/// ChunkStore 的 Firestore 實作，路徑與 web 相同：
/// users/{uid}/meta/storage、users/{uid}/chunks/{id}
final class FirestoreChunkStore: ChunkStore, @unchecked Sendable {
    private let db: Firestore
    private let uid: String
    private static let maxBatchDeletes = 400

    init(db: Firestore = .firestore(), uid: String) {
        self.db = db
        self.uid = uid
    }

    private var userRef: DocumentReference { db.collection("users").document(uid) }
    var metaRef: DocumentReference { userRef.collection("meta").document("storage") }
    private var chunksRef: CollectionReference { userRef.collection("chunks") }
    private var historyRef: CollectionReference { userRef.collection("history") }

    func readHistory() async throws -> [HistoryEntry] {
        try await historyRef.getDocuments().documents.compactMap { document in
            let data = document.data()
            guard let generation = data["generation"] as? String else { return nil }
            func int(_ key: String) -> Int { (data[key] as? NSNumber)?.intValue ?? 0 }
            return HistoryEntry(generation: generation, revision: int("revision"), chunkCount: int("chunkCount"),
                                checksum: data["checksum"] as? String ?? "", length: int("length"),
                                savedAt: (data["savedAt"] as? NSNumber)?.doubleValue ?? 0,
                                deviceId: data["deviceId"] as? String ?? "", schemaVersion: int("schemaVersion"),
                                pinned: data["pinned"] as? Bool, label: data["label"] as? String)
        }
    }

    func writeHistory(_ entries: [HistoryEntry]) async throws {
        guard !entries.isEmpty else { return }
        let batch = db.batch()
        for entry in entries {
            var data: [String: Any] = [
                "generation": entry.generation, "revision": entry.revision, "chunkCount": entry.chunkCount,
                "checksum": entry.checksum, "length": entry.length, "savedAt": Int64(entry.savedAt),
                "deviceId": entry.deviceId, "schemaVersion": entry.schemaVersion,
            ]
            if let pinned = entry.pinned { data["pinned"] = pinned }
            if let label = entry.label { data["label"] = label }
            // merge：沒帶 pinned / label 時保留原本的還原點設定（與 web 相同）。
            batch.setData(data, forDocument: historyRef.document(entry.generation), merge: true)
        }
        try await batch.commit()
    }

    func deleteHistory(generation: String) async throws {
        try await historyRef.document(generation).delete()
    }

    func readMeta() async throws -> CloudMeta? {
        let snapshot = try await metaRef.getDocument()
        guard snapshot.exists, let data = snapshot.data() else { return nil }
        return CloudMeta(firestore: data)
    }

    func readChunks(generation: String) async throws -> [StoredChunk] {
        try await chunksRef.whereField("generation", isEqualTo: generation).getDocuments().documents.compactMap(StoredChunk.init(document:))
    }

    func readAllChunksOrderedByIndex() async throws -> [StoredChunk] {
        try await chunksRef.order(by: "index").getDocuments().documents.compactMap(StoredChunk.init(document:))
    }

    func writeChunk(_ chunk: StoredChunk) async throws {
        var data: [String: Any] = ["index": chunk.index, "content": chunk.content]
        if let generation = chunk.generation { data["generation"] = generation }
        try await chunksRef.document(chunk.id).setData(data)
    }

    func updateMeta(_ update: @escaping @Sendable (CloudMeta?) throws -> CloudMeta) async throws -> CloudMeta {
        let metaRef = self.metaRef
        let result = try await db.runTransaction { transaction, errorPointer -> Any? in
            do {
                let snapshot = try transaction.getDocument(metaRef)
                let previous = snapshot.exists ? snapshot.data().map(CloudMeta.init(firestore:)) : nil
                let next = try update(previous)
                transaction.setData(next.firestoreData, forDocument: metaRef)
                return MetaBox(next)
            } catch {
                errorPointer?.pointee = error as NSError
                return nil
            }
        }
        guard let box = result as? MetaBox else { throw CloudStorageError.integrity("無法更新雲端指標文件") }
        return box.meta
    }

    func deleteChunks(ids: [String]) async throws {
        let valid = ids.filter { !$0.isEmpty }
        for start in stride(from: 0, to: valid.count, by: Self.maxBatchDeletes) {
            let batch = db.batch()
            valid[start..<min(start + Self.maxBatchDeletes, valid.count)].forEach { batch.deleteDocument(chunksRef.document($0)) }
            try await batch.commit()
        }
    }
}

private final class MetaBox: NSObject {
    let meta: CloudMeta
    init(_ meta: CloudMeta) { self.meta = meta }
}

private extension StoredChunk {
    init?(document: QueryDocumentSnapshot) {
        let data = document.data()
        self.init(
            id: document.documentID,
            index: (data["index"] as? NSNumber)?.intValue ?? 0,
            content: data["content"] as? String ?? "",
            generation: data["generation"] as? String
        )
    }
}

extension CloudMeta {
    init(firestore data: [String: Any]) {
        func int(_ key: String) -> Int? { (data[key] as? NSNumber)?.intValue }
        self.init(
            schema: int("schema"),
            revision: int("revision"),
            generation: data["generation"] as? String,
            chunkCount: int("chunkCount"),
            checksum: data["checksum"] as? String,
            length: int("length"),
            updatedAt: (data["updatedAt"] as? NSNumber)?.doubleValue,
            deviceId: data["deviceId"] as? String,
            schemaVersion: int("schemaVersion"),
            minClientVersion: data["minClientVersion"] as? String
        )
    }

    /// 寫回 Firestore 的欄位（與 web 相同；updatedAt 存成整數毫秒）。
    var firestoreData: [String: Any] {
        var data: [String: Any] = [:]
        if let schema { data["schema"] = schema }
        if let revision { data["revision"] = revision }
        if let generation { data["generation"] = generation }
        if let chunkCount { data["chunkCount"] = chunkCount }
        if let checksum { data["checksum"] = checksum }
        if let length { data["length"] = length }
        if let updatedAt { data["updatedAt"] = Int64(updatedAt) }
        if let deviceId { data["deviceId"] = deviceId }
        if let schemaVersion { data["schemaVersion"] = schemaVersion }
        if let minClientVersion { data["minClientVersion"] = minClientVersion }
        return data
    }
}
