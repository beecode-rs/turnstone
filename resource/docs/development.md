# Development

Requires [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/beecode-rs/turnstone.git
cd turnstone
pnpm install
pnpm android
```

`pnpm android` builds and installs the development client on a connected Android device or emulator (it appears as "Turnstone (dev)" on the device); `pnpm start` then starts the Metro dev server for it. The `start-usb` and `start-tailscale` scripts cover device packaging over USB and Tailscale (see [android-network-dev.md](../../docs/android-network-dev.md)).

Automated gates:

- `pnpm typecheck`: TypeScript, no emit
- `pnpm lint` / `pnpm lint-fix`: ESLint + Prettier + json-sort-cli (the ESLint stage is currently disabled in CI: typescript-eslint cannot load TypeScript 7 yet; Prettier and json-sort still run)
- `pnpm test:contract` / `pnpm test:smoke`: Vitest contract and smoke suites
- `pnpm bundle-check`: export the Android bundle to catch packaging errors

What the gates cannot prove lives in the manual device checklist: [VERIFY.md](../../docs/VERIFY.md) walks every feature end to end on a real device against a reachable SSH server. The web platform is used for SSH plumbing tests only ([ssh-testing-web-android.md](../../docs/ssh-testing-web-android.md), `pnpm web`, `pnpm relay`).

The code viewer's highlight.js bundle, the PDF viewer's pdf.js bundle, and the file-icon module are vendored into `src/asset` and committed; the `pnpm vendor:file-icons`, `pnpm vendor:highlight`, and `pnpm vendor:pdfjs` scripts re-generate them after upgrading the source packages.
