import XCTest
@testable import CatLogKit

@MainActor
final class IncomingFilesTests: XCTestCase {
    private var directory: URL!

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathComponent("Inbox")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: directory.deletingLastPathComponent())
    }

    private func write(_ name: String, _ text: String) throws -> URL {
        let url = directory.appendingPathComponent(name)
        try text.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    func testIgnoresNonFileURLsSoGoogleSignInStillWorks() {
        let inbox = IncomingFileInbox()
        XCTAssertFalse(inbox.receive(URL(string: "com.googleusercontent.apps.123:/oauth2redirect")!))
        XCTAssertNil(inbox.pending)
        XCTAssertNil(inbox.failure)
    }

    func testReadsCSVThenDeletesInboxCopy() throws {
        let inbox = IncomingFileInbox()
        let url = try write("MOZE_20261122.csv", "日期,金額\n2026/11/01,-100\n")

        XCTAssertTrue(inbox.receive(url))

        XCTAssertEqual(inbox.pending?.name, "MOZE_20261122.csv")
        XCTAssertEqual(inbox.pending?.text, "日期,金額\n2026/11/01,-100\n")
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path), "讀完要刪掉 Inbox 副本")
    }

    func testTakeClearsPendingSoItIsImportedOnce() throws {
        let inbox = IncomingFileInbox()
        inbox.receive(try write("a.csv", "x"))

        XCTAssertEqual(inbox.take()?.text, "x")
        XCTAssertNil(inbox.pending)
        XCTAssertNil(inbox.take())
    }

    func testRejectsNonCSVFiles() throws {
        let inbox = IncomingFileInbox()
        let url = try write("backup.json", "{}")

        XCTAssertTrue(inbox.receive(url))

        XCTAssertNil(inbox.pending)
        XCTAssertEqual(inbox.failure, .unsupported("backup.json"))
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
    }

    func testReportsUnreadableFiles() throws {
        let inbox = IncomingFileInbox()
        let url = directory.appendingPathComponent("big5.csv")
        try Data([0xA4, 0xE9, 0xB4, 0xC1, 0xFF]).write(to: url)

        inbox.receive(url)

        XCTAssertNil(inbox.pending)
        XCTAssertEqual(inbox.failure, .unreadable("big5.csv"))
    }

    func testKeepsFilesOutsideInbox() throws {
        let inbox = IncomingFileInbox()
        let outside = directory.deletingLastPathComponent().appendingPathComponent("keep.csv")
        try "x".write(to: outside, atomically: true, encoding: .utf8)

        inbox.receive(outside)

        XCTAssertTrue(FileManager.default.fileExists(atPath: outside.path))
    }
}
