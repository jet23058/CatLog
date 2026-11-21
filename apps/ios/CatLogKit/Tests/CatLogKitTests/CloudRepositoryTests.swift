import XCTest
@testable import CatLogKit

// 對應 apps/web/src/cloudStorage.test.js，確認 iOS 的讀寫規則與 web 相同。
final class CloudRepositoryTests: XCTestCase {
    private var bridge: CoreBridge!
    private var store: InMemoryChunkStore!
    private var repository: CloudRepository!

    override func setUpWithError() throws {
        bridge = try CoreBridge.bundled()
        store = InMemoryChunkStore()
        repository = CloudRepository(store: store, core: bridge)
    }

    private func object(_ json: String?) throws -> NSDictionary {
        try XCTUnwrap(JSONSerialization.jsonObject(with: Data(XCTUnwrap(json).utf8)) as? NSDictionary)
    }

    func testRoundTripAcrossManyChunksWithEmoji() async throws {
        let data = #"{"memos":{"2026-01-01":"🐱🎉 中文"},"records":{"a":1}}"#
        let first = try await repository.write(dataJSON: data, expectedRevision: 0, chunkSize: 3)
        XCTAssertEqual(first.revision, 1)
        XCTAssertGreaterThan(first.chunkIds.count, 10)

        let snapshot = try await repository.read()
        XCTAssertEqual(snapshot.revision, 1)
        let loaded = try object(snapshot.dataJSON)
        XCTAssertEqual((loaded["memos"] as? NSDictionary)?["2026-01-01"] as? String, "🐱🎉 中文")
        XCTAssertEqual(loaded["schemaVersion"] as? Int, 1) // 寫入前補上 schemaVersion
        XCTAssertEqual(snapshot.meta?.schemaVersion, 1)
        XCTAssertEqual(snapshot.meta?.minClientVersion, "3.0.0")
        XCTAssertEqual(snapshot.meta?.schema, 3)

        let second = try await repository.write(dataJSON: #"{"records":{"a":2}}"#, expectedRevision: 1, previousChunkIds: snapshot.chunkIds)
        XCTAssertEqual(second.revision, 2)
        // 上一份保留成歷史版本：兩份資料塊都在，各有一筆紀錄，可以讀回舊內容。
        XCTAssertEqual(store.chunkCount, first.chunkIds.count + second.chunkIds.count)
        let history = try await repository.listHistory()
        XCTAssertEqual(history.map(\.revision), [2, 1])
        let oldVersion = try await repository.readVersion(history[1])
        XCTAssertTrue(oldVersion.contains("🐱🎉 中文"))
    }

    func testPrunesHistoryButKeepsCurrent() async throws {
        var revision = 0
        var chunkIds: [String] = []
        let start = Date(timeIntervalSince1970: 1_767_225_600)
        for i in 0..<25 {
            let result = try await repository.write(dataJSON: #"{"records":{"i":\#(i)}}"#, expectedRevision: revision,
                                                   previousChunkIds: chunkIds, now: start.addingTimeInterval(Double(i) * 60))
            revision = result.revision
            chunkIds = result.chunkIds
        }
        let history = try await repository.listHistory()
        XCTAssertEqual(history.count, 20)
        XCTAssertEqual(history.first?.revision, 25)
        XCTAssertEqual(store.chunkCount, 20)
        let current = try await repository.read()
        XCTAssertTrue(try XCTUnwrap(current.dataJSON).contains(#""i":24"#))
    }

    func testRejectsStaleWrites() async throws {
        _ = try await repository.write(dataJSON: #"{"v":"a"}"#, expectedRevision: 0)
        do {
            _ = try await repository.write(dataJSON: #"{"v":"b"}"#, expectedRevision: 0)
            XCTFail("應該要衝突")
        } catch {
            XCTAssertEqual(error as? CloudStorageError, .conflict(remoteRevision: 1, expectedRevision: 0))
        }
        let snapshot = try await repository.read()
        XCTAssertEqual(try object(snapshot.dataJSON)["v"] as? String, "a")
    }

    func testForceOverwrites() async throws {
        _ = try await repository.write(dataJSON: #"{"v":"a"}"#, expectedRevision: 0)
        let result = try await repository.write(dataJSON: #"{"v":"b"}"#, expectedRevision: 0, force: true)
        XCTAssertEqual(result.revision, 2)
    }

    func testInterruptedSaveKeepsPreviousVersion() async throws {
        _ = try await repository.write(dataJSON: #"{"v":"stable"}"#, expectedRevision: 0)
        store.failTransaction = URLError(.networkConnectionLost)
        do {
            _ = try await repository.write(dataJSON: #"{"v":"partial"}"#, expectedRevision: 1)
            XCTFail("應該要失敗")
        } catch {}
        store.failTransaction = nil
        let snapshot = try await repository.read()
        XCTAssertEqual(try object(snapshot.dataJSON)["v"] as? String, "stable")
    }

    func testDetectsTamperedChunks() async throws {
        let result = try await repository.write(dataJSON: #"{"v":"ok"}"#, expectedRevision: 0)
        let id = result.chunkIds[0]
        store.setChunk(StoredChunk(id: id, index: 0, content: #"{"v":"no"}"#, generation: store.meta?.generation))
        do {
            _ = try await repository.read()
            XCTFail("應該要偵測到竄改")
        } catch {
            guard case .integrity = error as? CloudStorageError else { return XCTFail("錯誤類型不符：\(error)") }
        }
    }

    func testReadsLegacyChunks() async throws {
        let json = #"{"records":{"legacy":true}}"#
        store.setChunk(StoredChunk(id: "0", index: 0, content: String(json.prefix(10)), generation: nil))
        store.setChunk(StoredChunk(id: "1", index: 1, content: String(json.dropFirst(10)), generation: nil))
        let snapshot = try await repository.read()
        XCTAssertEqual(snapshot.chunkIds, ["0", "1"])
        XCTAssertEqual((try object(snapshot.dataJSON)["records"] as? NSDictionary)?["legacy"] as? Bool, true)
    }

    func testEmptyStore() async throws {
        let snapshot = try await repository.read()
        XCTAssertNil(snapshot.dataJSON)
        XCTAssertEqual(snapshot.revision, 0)
    }

    func testKeepsManuallyRaisedMinClientVersion() async throws {
        _ = try await repository.write(dataJSON: "{}", expectedRevision: 0)
        var meta = try XCTUnwrap(store.meta)
        meta.minClientVersion = "4.2.0"
        store.setMeta(meta)
        _ = try await repository.write(dataJSON: "{}", expectedRevision: 1)
        XCTAssertEqual(store.meta?.minClientVersion, "4.2.0")
    }

    /// web 實際寫出的資料（packages/core/fixtures/cloud-storage-v3.json），iOS 必須讀得出一模一樣的內容。
    func testReadsDataWrittenByWeb() async throws {
        // 直接讀 repo 內的 packages/core/fixtures（與 web 測試同一個檔案）。
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("../../../../../packages/core/fixtures/cloud-storage-v3.json")
            .standardizedFileURL
        let fixture = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let docs = try XCTUnwrap(fixture["docs"] as? [String: [String: Any]])

        for (path, value) in docs {
            if path.contains("/history/") {
                store.setHistory(try JSONDecoder().decode(HistoryEntry.self, from: JSONSerialization.data(withJSONObject: value)))
            } else if path.hasSuffix("/meta/storage") {
                let metaData = try JSONSerialization.data(withJSONObject: value)
                store.setMeta(try JSONDecoder().decode(CloudMeta.self, from: metaData))
            } else {
                store.setChunk(StoredChunk(
                    id: String(path.split(separator: "/").last!),
                    index: try XCTUnwrap(value["index"] as? Int),
                    content: try XCTUnwrap(value["content"] as? String),
                    generation: value["generation"] as? String
                ))
            }
        }

        let snapshot = try await repository.read()
        let expected = try XCTUnwrap(fixture["data"] as? NSDictionary)
        XCTAssertEqual(try object(snapshot.dataJSON), expected)
        XCTAssertEqual(snapshot.revision, 1)
        XCTAssertEqual(snapshot.meta?.deviceId, "web-fixture")
    }
}
