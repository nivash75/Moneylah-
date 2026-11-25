import AppIntents
import Foundation

/// Appears in the Shortcuts app, so it can be assigned to Back Tap or the Action button.
struct AddTransactionIntent: AppIntent {
  static let title: LocalizedStringResource = "Add Transaction"
  static let description = IntentDescription("Opens Moneylah! on a new transaction.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    // Read by src/shortcuts/ShortcutHandler.tsx, whether the app was already running or not.
    UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "shortcutAddTransaction")
    return .result()
  }
}

struct MoneylahShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddTransactionIntent(),
      phrases: ["Add a transaction in \(.applicationName)"],
      shortTitle: "Add Transaction",
      systemImageName: "plus.circle"
    )
  }
}
