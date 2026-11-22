import XCTest
@testable import CatLogKit

final class MaintenanceTests: XCTestCase {
    private var core: CatLogCore!

    override func setUpWithError() throws {
        core = try CatLogCore.bundled()
        try core.load(dataJSON: #"""
        {"records":{},"fireSettings":{"withdrawalRate":4},"expenses":{"2026-10":[
          {"id":1,"date":"2026/10/20","account":"信用卡","name":"晚餐","category":"飲食","amount":200},
          {"date":"2026/10/21","account":"信用卡","subCategory":"交通","category":"行","amount":50},
          {"date":"2026/10/21","account":"現金","category":"雜支","amount":10}]}}
        """#)
    }

    func testStatement() throws {
        let range = try core.statementDefaultRange(today: "2026-11-21")
        XCTAssertEqual(range.startDate, "2026-10-15")
        XCTAssertEqual(range.endDate, "2026-11-16")
        let view = try core.statementView(account: "", startDate: range.startDate, endDate: range.endDate)
        XCTAssertEqual(view.accounts, ["信用卡", "現金"])
        XCTAssertEqual(view.account, "信用卡")
        XCTAssertEqual(view.items.map(\.title), ["交通", "晚餐"])
        XCTAssertEqual(view.total, 250)
        XCTAssertEqual(Set(view.items.map(\.key)).count, 2)
    }

    func testNewerSchemaDetection() throws {
        XCTAssertFalse(try core.isNewerSchema(dataJSON: #"{"records":{},"schemaVersion":1}"#))
        XCTAssertFalse(try core.isNewerSchema(dataJSON: #"{"records":{}}"#))
        XCTAssertTrue(try core.isNewerSchema(dataJSON: #"{"records":{},"schemaVersion":99}"#))
    }

    func testFireRate() throws {
        try core.load(dataJSON: try core.settingFireWithdrawalRate("3.5"))
        XCTAssertEqual(try core.fireStats().rate, 3.5)
        XCTAssertThrowsError(try core.settingFireWithdrawalRate("0")) { error in
            XCTAssertTrue(error.localizedDescription.contains("提領率必須大於 0"))
        }
    }

    func testFireYearlyStats() throws {
        let stats = try core.fireYearlyStats()
        XCTAssertEqual(stats.map(\.year), ["2026"])
        XCTAssertEqual(stats.first?.avg, 260)
        XCTAssertEqual(stats.first?.max.month, 10)
    }

    func testDiagnoseAndRepair() async throws {
        let store = InMemoryChunkStore()
        let repository = CloudRepository(store: store, core: core.bridge)
        _ = try await repository.write(dataJSON: #"{"records":{"2026-01-31":[{"name":"a"}]}}"#, expectedRevision: 0, chunkSize: 5)

        let healthy = try await repository.diagnose(core: core)
        XCTAssertEqual(healthy.checksumMatches, true)
        XCTAssertNil(healthy.parseError)
        XCTAssertEqual(healthy.counts?.recordsItems, 1)

        // 弄壞一個資料塊
        let broken = try XCTUnwrap(store.chunks.values.first { $0.index == 1 })
        try await store.writeChunk(StoredChunk(id: broken.id, index: broken.index, content: "!!", generation: broken.generation))
        let diagnosis = try await repository.diagnose(core: core)
        XCTAssertEqual(diagnosis.checksumMatches, false)
        XCTAssertNotNil(diagnosis.parseError)
        do { _ = try await repository.read(); XCTFail("應該驗證失敗") } catch {}

        // 用備份修復
        let backup = #"{"records":{"2026-02-28":[{"name":"b"}]}}"#
        let repaired = try core.repairDataJSON(fromBackup: backup)
        _ = try await repository.write(dataJSON: repaired, expectedRevision: 0, force: true)
        let snapshot = try await repository.read()
        XCTAssertTrue(try XCTUnwrap(snapshot.dataJSON).contains("2026-02-28"))
        XCTAssertThrowsError(try core.repairDataJSON(fromBackup: "{}"))
    }
}
