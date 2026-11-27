# Changelog

Notable changes to Moneylah!. Versions follow [Semantic Versioning](https://semver.org).

## Unreleased (Android)

### Added

- An Android app, including the home screen widget, as a test APK
- iPhone-style large titles, round buttons, floating tab bar, switches and sheets on Android

### Changed

- Android uses one currency, without exchange rates
- Android keeps only the standard categories

## [1.1.0] - 2026-11-27

### Added

- Lending and borrowing, with return dates and reminders
- Excel export, alongside CSV
- Optional automatic copy to your own Google Sheet
- Money in hand on the home screen widget
- Automatic type checks and tests on GitHub

### Fixed

- Misplaced grouping marks in typed amounts are rejected. Before, a device using a decimal point read `12,50` as 1,250.00.

## [1.0.0] - 2026-11-27

First release: expenses, income and transfers, accounts and credit cards, budgets, statistics and analytics, multiple currencies, app lock, CSV export, backup and restore, a home screen widget and an "Add Transaction" shortcut.

[1.1.0]: https://github.com/tnivash/Moneylah/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/tnivash/Moneylah/releases/tag/v1.0.0
