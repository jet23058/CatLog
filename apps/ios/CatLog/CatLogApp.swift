import CatLogFeature
import SwiftUI

@main
struct CatLogApp: App {
    init() {
        FirebaseBootstrap.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .onOpenURL { url in _ = FirebaseBootstrap.handle(url: url) }
        }
    }
}
