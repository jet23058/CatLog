// swift-tools-version: 6.0
// CatLogFeature：iOS 的畫面與 Firebase 整合。邏輯放在 CatLogKit，這裡只負責 UI、登入與 Firestore 存取。
import PackageDescription

let package = Package(
    name: "CatLogFeature",
    defaultLocalization: "zh-Hant",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "CatLogFeature", targets: ["CatLogFeature"]),
    ],
    dependencies: [
        .package(path: "../CatLogKit"),
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "13.1.1"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "10.0.0"),
    ],
    targets: [
        .target(
            name: "CatLogFeature",
            dependencies: [
                "CatLogKit",
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS"),
            ]
        ),
    ],
    swiftLanguageModes: [.v5]
)
