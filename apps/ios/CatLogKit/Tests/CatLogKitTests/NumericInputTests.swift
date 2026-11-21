import XCTest
@testable import CatLogKit

final class NumericInputTests: XCTestCase {
    func testDropsNonDigits() {
        XCTAssertEqual(NumericInput.sanitize("ㄅㄆ12ㄇ3"), "123")
        XCTAssertEqual(NumericInput.sanitize("abc-1,000"), "1000")
    }

    func testSingleDecimalPoint() {
        XCTAssertEqual(NumericInput.sanitize("12.3.4"), "12.34")
        XCTAssertEqual(NumericInput.sanitize(".5"), "0.5")
        XCTAssertEqual(NumericInput.sanitize("12.5", allowDecimal: false), "125")
    }

    func testFullWidthAndFractionLimit() {
        XCTAssertEqual(NumericInput.sanitize("１２．５"), "12.5")
        XCTAssertEqual(NumericInput.sanitize("100.456", maxFractionDigits: 2), "100.45")
    }
}
