# Contributing

## Report a bug or suggest a feature

[Open an issue](https://github.com/tnivash/Moneylah/issues/new/choose). Never include real financial records, backup files, or your Google Sheets link or key. Use made-up data.

For security problems, follow [SECURITY.md](SECURITY.md) instead.

## Change the code

1. Fork the repository and create a branch from `main`.
2. Install with `npm ci`. You need Node 24 or later; running the app also needs a Mac with Xcode (see the [README](README.md#run-it)).
3. Make one focused change. For large changes, open an issue first.
4. Keep logic in `src/core` free of React Native imports, and add tests for it in `tests`.
5. Run `npm run typecheck` and `npm test`.
6. Open a pull request that says what changed and how you checked it.

To run the app on your own iPhone you have to change the Apple team ID and identifiers in `app.json`. Leave those changes out of your pull request.

By contributing, you agree that your work is released under the [MIT License](LICENSE).

## Release a version

For maintainers:

1. Set the new version in `package.json`, `package-lock.json` and `app.json`.
2. Add the changes to `CHANGELOG.md`.
3. Merge into `main` once the checks pass.
4. Publish a GitHub release with a new tag, such as `v1.1.1`, on `main`.
