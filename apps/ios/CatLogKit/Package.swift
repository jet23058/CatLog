// swift-tools-version: 6.0
// CatLogKit：iOS 的非 UI 邏輯。沒有任何第三方相依，可以直接在 Mac 上 `swift test`。
// - CoreBridge：在 JavaScriptCore 執行 packages/core（Resources/catlog-core.js）
// - CloudRepository：雲端儲存格式 v3 的讀寫（與 apps/web/src/cloudStorage.js 相同的規則）
import PackageDescription

let package = Package(
    name: "CatLogKit",
    defaultLocalization: "zh-Hant",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "CatLogKit", targets: ["CatLogKit"]),
    ],
    targets: [
        .target(
            name: "CatLogKit",
            resources: [.copy("Resources/catlog-core.js")]
        ),
        .testTarget(
            name: "CatLogKitTests",
            dependencies: ["CatLogKit"],
            resources: [.copy("Fixtures")]
        ),
    ],
    swiftLanguageModes: [.v5]
)
