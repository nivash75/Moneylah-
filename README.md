# Moneylah!

[![CI](https://github.com/tnivash/Moneylah/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tnivash/Moneylah/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tnivash/Moneylah)](https://github.com/tnivash/Moneylah/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A private, on-device income, expense and budget tracker for iPhone, iPad and Android, built with React Native (Expo) and TypeScript.

It follows Apple's [Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) guidance by using the system tab bar, navigation bar buttons and controls. Glass is kept to navigation and actions; content cards stay solid.

## Features

- Expenses, income and transfers, with categories and subcategories, including common Singapore bills and installments on iPhone and iPad
- List and calendar views
- Weekly, monthly and yearly statistics
- Accounts, net worth, credit card statements and payments
- Monthly budgets
- Lending and borrowing, with return dates and reminders
- A chosen cycle start day, such as payday, for budgets and monthly totals
- Multiple currencies with daily exchange rates (or your own), converting as you type, on iPhone and iPad. Android uses one currency
- Face ID / passcode lock (fingerprint or screen lock on Android)
- Spending analytics by category, with changes, daily averages and subcategories
- Budget left and a month-end spending projection
- Excel and CSV export, manual backup to iCloud Drive and restore
- Home screen widget with money in hand and the current cycle
- Optional automatic copy to your own Google Sheet
- "Add Transaction" shortcut for Back Tap, the Action button and Siri

Not included yet: iCloud sync and automatic iCloud backup (both need a paid Apple Developer account), and viewing your data on a PC over Wi-Fi.

## Run it

Needs a Mac with Node 24 or later and Xcode. Expo Go is not enough, because the widget and Face ID need a native build.

```sh
git clone https://github.com/tnivash/Moneylah.git
cd Moneylah
npm install
npm run ios                      # builds and opens the simulator
EXPO_PUBLIC_DEMO=1 npm run ios   # same, with sample data on a fresh install
```

Sample data can also be loaded from Settings in development builds.

`app.json` turns off Expo's precompiled iOS modules. With them on, the app crashed at launch because `React.framework` was missing, so the first native build compiles from source and takes longer.

## Back Tap

Double-tap the back of an iPhone to start a new transaction:

1. In the Shortcuts app, tap +, add the Moneylah! action **Add Transaction**, and close it.
2. In iPhone Settings, open Accessibility > Touch > Back Tap > Double Tap and choose that shortcut.

The action is defined in `plugins/shortcut/`. Back Tap needs a real iPhone.

## Check it

```sh
npm test            # money, balances, card cycles, CSV and backup logic
npm run typecheck
```

## Run on your own iPhone

1. In `app.json`, check `ios.appleTeamId` and the three identifiers (app, widget and app group). To use another Apple account, change all four.
2. Run `npx expo prebuild --platform ios --clean`.
3. Open `ios/Moneylah.xcworkspace` in Xcode and choose your team for both targets.
4. Run `npx expo run:ios --device --configuration Release` so the app works without the dev server.

With a free Apple account the install stops opening after 7 days. Run step 4 again to renew it, without deleting the app, so your records are kept.

The `ios/` folder is generated from `app.json`, so don't edit it by hand.

## Android

To install without building, download [apk/Moneylah.apk](apk/Moneylah.apk) on your phone, open it and allow the installation. It is version 1.1.0 for 64-bit ARM phones, signed with the debug key, so treat it as a test build.

Needs Android Studio, which provides the Android SDK and Java. The folder path must not contain `!`: Gradle fails to build from such a path.

```sh
npx expo prebuild --platform android   # creates android/
npm run android                        # builds and runs on an emulator or phone
cd android && ./gradlew app:assembleRelease   # makes an installable APK
```

The APK is written to `android/app/build/outputs/apk/release/`. It is signed with the debug key, which is fine for installing on your own phone but not for Google Play.

Android draws the same large titles, round buttons, floating tab bar, switches and sheets as the iPhone app. Dialogs, date pickers, the keyboard and the font stay Android's.

Android uses one currency, chosen under Settings > Currency, and downloads no exchange rates. A backup with accounts in several currencies can't be restored there.

Android has no "Add Transaction" shortcut or iCloud Drive; backups are saved to a folder you pick. The Android widget updates only when the app is open, so a new cycle or a light/dark change appears after you next open it. Due date reminders can arrive up to an hour after 9:00 am. The app switcher may show your screens even when app lock is on.

The `android/` folder is generated from `app.json`, so don't edit it by hand.

## Layout

Files ending in `.android.ts(x)` replace the file of the same name on Android.

| Folder        | Contents                                   |
| ------------- | ------------------------------------------ |
| `src/core`    | Pure logic with no React Native imports    |
| `src/data`    | SQLite storage and app state               |
| `src/app`     | Screens (expo-router)                      |
| `src/ui`      | Shared components and app lock             |
| `src/widgets` | Home screen widget                         |
| `tests`       | Tests for `src/core`                       |

## Data and privacy

Records are stored in a local SQLite database. The app makes network requests for exchange rates from [Exchange Rate API](https://www.exchangerate-api.com), when you use more than one currency on iPhone or iPad. It sends your main currency code, never your records, and can be turned off under Settings > Currencies and rates. If you set up Google Sheets backup under Settings, it also sends your records to the Apps Script web app in your own Google account. That link and its key stay on the device and are left out of backup files. The app lock hides the screens; it does not add encryption beyond what the device provides. Backup and CSV files are not encrypted.

Amounts are stored as whole numbers in each currency's smallest unit, to avoid rounding errors.

## Contributing

Bug reports and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. To report a security problem, follow [SECURITY.md](SECURITY.md).

Changes in each version are listed in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
