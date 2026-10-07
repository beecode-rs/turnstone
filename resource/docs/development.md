# Development

Requires [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/beecode-rs/turnstone.git
cd turnstone
pnpm install
pnpm android
```

`pnpm android` builds and installs the development client on a connected Android device or emulator (it appears as "Turnstone (dev)" on the device, so a development build is never confused with a release); `pnpm start` then starts the Metro dev server for it. The `start-usb` and `start-tailscale` scripts cover device packaging over USB and Tailscale (see [android-network-dev.md](../../docs/android-network-dev.md)).

Automated gates:

- `pnpm typecheck`: TypeScript, no emit
- `pnpm lint` / `pnpm lint-fix`: ESLint + Prettier + json-sort-cli (the ESLint stage is currently disabled in CI: typescript-eslint cannot load TypeScript 7 yet; Prettier and json-sort still run)
- `pnpm test:contract` / `pnpm test:smoke`: Vitest contract and smoke suites
- `pnpm bundle-check`: export the Android bundle to catch packaging errors

What the gates cannot prove lives in the manual device checklist: [VERIFY.md](../../docs/VERIFY.md) walks every feature end to end on a real device against a reachable SSH server, using an account with read-only access to the browsed tree, and requires that a full session leaves no modified files behind. The web platform is used for SSH plumbing tests only ([ssh-testing-web-android.md](../../docs/ssh-testing-web-android.md), `pnpm web`, `pnpm relay`).

The code viewer's highlight.js bundle, the PDF viewer's pdf.js bundle, and the file-icon module are vendored into `src/asset` and committed; the `pnpm vendor:file-icons`, `pnpm vendor:highlight`, and `pnpm vendor:pdfjs` scripts re-generate them after upgrading the source packages.

## Tech stack

Expo SDK 57 on React Native 0.87 and React 19, written in TypeScript. expo-router for navigation, react-native-paper for MD3 components, ssh2 for the SSH/SFTP engine, MMKV and AsyncStorage for storage, Vitest for the contract and smoke suites, pnpm as the package manager.

## Releasing

Releases are tag-driven: pushing a `v*` tag runs the quality gates, then CI builds a signed Android APK and an unsigned iOS IPA (no App Store distribution — the IPA is sideloaded by whoever installs it) and publishes both to [GitHub Releases](https://github.com/beecode-rs/turnstone/releases); see [release.yml](../../.github/workflows/release.yml). The tag must match the version in both `app.json` and `package.json`. Local version-bump helpers: `pnpm release:major` / `pnpm release:minor` / `pnpm release:patch`.

How the source is layered is covered in [architecture.md](architecture.md).
