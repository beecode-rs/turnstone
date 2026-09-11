# Architecture Mapping

How the writing-clean-ts skill's layer conventions map onto Turnstone, an
Expo (SDK 57, expo-router, New Architecture) mobile app. The skill lives at
`~/.claude/skills/writing-clean-ts/SKILL.md` and must be loaded before any
TypeScript is written in this repository.

## Layer mapping

| writing-clean-ts layer      | Turnstone mapping                                                            |
| --------------------------- | ---------------------------------------------------------------------------- |
| `src/controller/`           | `src/controller/expo-router/` screen components (translate route params into props); the framework `app/` directory holds only thin default-export adapter files that re-export these components (expo-router requires route files in `app/`; these adapters are framework entry points, not index.ts barrels) |
| `src/ui-component/`         | React Native presentational components, one PascalCase component per kebab-case file, grouped in feature subfolders (including the app-shell chrome: `app-tabs`, `animated-icon`, `themed-text`, `themed-view`, and the theme system in `theme/` — `theme-context` provider/hook, `paper-theme`/`eink-theme` MD3 theme pairs, `effective-theme` resolver, `theme-preference-menu` selector; primitives come from react-native-paper, mounted via `PaperProvider` in the root layout) |
| `src/business/`             | `model/` (types: host config, project config/draft, tree entry, search match, git status, viewer messages), `enum/` (one `<name>-mapper-enum.ts` per closed value set; enum string values are persisted in MMKV/AsyncStorage and cross WebView JSON, so they must never change), `service/` (connection manager, remote exec, tree, file read, search, capability probe, git status, git diff, change watcher, git detection, project seed), `use-case/` only where a screen needs orchestration beyond one service |
| `src/dal/`                  | `src/dal/secure-store/` (credential-dal, device-key-dal, known-host-dal) and `src/dal/mmkv/` (active-project-dal, host-config-dal, open-screens-dal, project-config-dal, tree-cache-dal, tree-expansion-dal, tree-selection-dal) wrapping the native storage libraries |
| `src/lib/`                  | `src/lib/ssh2-client.ts`: the only file importing the ssh2 npm package; implements the `SshTransport` port from `src/business/model/ssh-transport.ts` (connect, exec, sftp readdir/stat/range-read, subscribe-to-close) so the engine stays swappable. `src/lib/mmkv.ts`: the configured MMKV singleton (storage wiring, no business logic) |
| `src/util/`                 | pure helpers: natural-sort, line-split, language mapping, fuzzy scoring, backoff, fingerprint, tree expansion map/list conversion; `constant.ts` holds the single `constant` object (every tunable, storage key, and regex in business/util/lib/dal layers); `config.ts` is the only reader of `process.env` (`isDev`, `sshRelayUrl`); `theme-constant.ts` holds the design tokens (BlueRamp, GrayRamp, Fonts, Spacing, MaxContentWidth) consumed by the MD3 theme definitions in `src/ui-component/theme/` |
| `src/asset/`                | WebView HTML and vendored highlight.js files for the code viewer, the generated file-icon module (`file-icons/file-icons.gen.ts`, vendored from the `material-icon-theme` package by `pnpm vendor:file-icons`), plus `global.css` (web font variables)             |
| `src/app-boot/`             | boot side effects (quick-crypto `install()`, font load) invoked from the root `app/_layout.tsx` adapter |

## Recorded deviations

Places where this project deliberately departs from the skill's default
mechanics, and why.

### 1. Import alias mechanics: tsconfig paths only, no package.json `imports` field

The skill's `#src/*` absolute-import alias is configured solely through
`tsconfig.json` `paths` (`#src` and `#src/*` mapping to `./src` and
`./src/*`). There is no package.json `imports` field. Reason: the app runtime
is the Metro bundle, not plain Node; Expo's metro-config reads tsconfig
`paths` natively, so the alias resolves identically for TypeScript, Metro,
and `expo export`. A package.json `imports` field would only apply to plain
Node resolution, which this app never uses.

Implementation notes: no `baseUrl` is set (TypeScript ~6 deprecates it,
TS5101; `paths` with `./`-relative targets resolve on their own), and
`moduleResolution: "bundler"` is inherited from `expo/tsconfig.base`.

### 2. `app/` route adapters are framework entry points, not barrels

The skill forbids `index.ts` barrel files for business logic. expo-router,
however, requires one route file per route under the framework `app/`
directory. Resolution: every file in `app/` is a thin default-export adapter
that re-exports a screen component from `src/controller/expo-router/` and
contains no logic of its own. These adapters are the framework's mandatory
entry points (equivalent to a framework `main.ts`), not barrels re-exporting
business logic, so they do not violate the no-barrels rule. All screen logic,
param translation, and routing hooks stay in `src/controller/expo-router/`.

### 3. Constants that stay module-local

The skill's constant rule (every module-level constant moves to
`util/constant.ts`) is applied to the business, util, lib, and dal layers.
Three categories deliberately stay module-local:

- **UI presentation values** in `src/ui-component/` and controllers
  (StyleSheet objects, scrim colors, icon sizes, animation/scale values,
  font family names, viewer regexes, fence-token sets) — component-local
  presentation, parallel to how `theme-constant.ts` is the tokens home.
- **Vendored algorithm data**: `src/lib/ssh2-poly1305.ts` (spec-defined
  math constants and its positional params) and the `src/app-boot/`
  buffer-method wiring tables — the constants define what the algorithm
  is, they are not tunables.
- **Structural lookup maps** (`EXTENSION_LANGUAGE_MAP`,
  `EXTENSION_PREVIEW_KIND_MAP`, `SELECTABLE_RUN_BLOCK_TYPES`,
  `OPEN_SCREENS_INITIAL_STATE`) and module-level caches, contexts, and
  service instances (runtime state, not constants).

`mermaidHtml` and `pdfViewerHtml` remain plain objects with `_` members
holding a load cache; converting them to the skill's singleton shape would
add the `@beecode/msh-util` dependency for `singletonPattern`.
