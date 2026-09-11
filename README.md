<p align="center">
  <img src="assets/images/app-icon.png" width="160" alt="Turnstone icon" />
</p>

<h1 align="center">Turnstone</h1>

<p align="center">
  <img src="https://img.shields.io/badge/status-early%20development-yellow" alt="Early development badge" />
  <img src="https://img.shields.io/badge/platform-Android-blue" alt="Platform badge" />
  <img src="https://img.shields.io/badge/Expo%20SDK-57-000020" alt="Expo SDK badge" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License badge" />
</p>

<p align="center">
  Made by
  <a href="https://beecode.rs"><img src="assets/images/beecode-logo.png" width="20" alt="Beecode logo" /></a>
  <a href="https://beecode.rs"><strong>Beecode</strong></a>
</p>

A small Expo (React Native) app for Android that browses and reads files on a remote server over SSH. It is strictly read-only. It does six things:

- **Servers**: manage any number of SSH servers (label, host, port, username) with password or ed25519 key auth; secrets stay in the device secure store, and host keys are verified TOFU-style on first connect.
- **Browse**: the remote file tree over SFTP, with file-type icons, configurable nesting and row density, and toggles to hide dot files and gitignored files.
- **View**: code with syntax highlighting (word-wrap and line-number toggles), rendered Markdown, HTML in rendered or source mode, PDF, and binary file previews.
- **Search**: files on the remote server, with gitignored files filtered out of the results.
- **Git**: status and diffs of the remote working tree, with a branch bar and diff options.
- **Watch**: remote change detection; watched files and directories reconcile in the tree and open viewers without a manual refresh (inotify where the host supports it, polling as the fallback).

## Screenshots

| Servers | Projects | File tree |
| :---: | :---: | :---: |
| <img src="resource/screenshots/server-list-screen.png" width="240" alt="Servers list with a saved SSH server" /> | <img src="resource/screenshots/project-list-screen.png" width="240" alt="Projects list with two project roots on the server" /> | <img src="resource/screenshots/project-tree-view.png" width="240" alt="Remote file tree with file-type icons and a branch bar" /> |

| Markdown source | Rendered Markdown | Git diff |
| :---: | :---: | :---: |
| <img src="resource/screenshots/markdown-code-view.png" width="240" alt="Code viewer showing a Markdown file with line numbers" /> | <img src="resource/screenshots/markdown-rendered-view.png" width="240" alt="Rendered Markdown view" /> | <img src="resource/screenshots/git-diff-view.png" width="240" alt="Git diff view" /> |

| Open screens drawer | Code viewer, landscape | Code viewer, fullscreen |
| :---: | :---: | :---: |
| <img src="resource/screenshots/side-menu-open-files.png" width="300" alt="Open screens drawer over the editor in landscape" /> | <img src="resource/screenshots/code-view-landscape.png" width="300" alt="Code viewer in landscape" /> | <img src="resource/screenshots/code-view-fullscreen-landscape.png" width="300" alt="Code viewer fullscreen in landscape" /> |

## Status: Early Development

Turnstone is in early development. It was built through rapid AI-assisted iteration rather than carefully reviewed engineering, so expect rough edges, missing pieces, and breaking changes without notice.

## Releases

Tagged releases are built by CI and published as installable artifacts on the [GitHub Releases](https://github.com/beecode-rs/turnstone/releases) page: a signed Android APK and an unsigned iOS IPA (sideload it yourself; it is not App Store distributed). Builds made locally from source install as "Turnstone (dev)" so a development build is never confused with a release.

## Read-Only by Design

Turnstone only ever reads from your servers: the device checklist ([docs/VERIFY.md](docs/VERIFY.md)) requires every feature to work end to end against an account with read-only access to the browsed tree, and requires that a full session leaves no modified files behind. Use it with a read-only account; that is what it is built for.

## Feature Status

Done:

- [x] Server management (multiple servers, password or key auth, persisted)
- [x] SSH/SFTP connection with TOFU host-key verification
- [x] Remote file tree browsing (file icons, nesting, density, dot-file and gitignore filtering)
- [x] Code viewer with syntax highlighting (word wrap, line numbers)
- [x] Rendered Markdown file view (with source mode)
- [x] HTML viewer with rendered/source modes
- [x] PDF viewer
- [x] Binary file previews
- [x] Remote file search (gitignored files filtered out)
- [x] Git status and diffs
- [x] Remote change watching (inotify with polling fallback)
- [x] MD3 light/dark theming plus an e-ink theme
- [x] Landscape orientation support
- [x] File view margin setting (compact / normal / large; smaller margins give more reading space)
- [x] File view font size setting (xs, s, m, l, xl, xxl; default m)
- [x] Pull to refresh in the file view
- [x] File name in the file view footer
- [x] Server list sorted by name
- [x] Remote folder browser (a folder icon next to the remote path input opens a modal to browse and select a folder)
- [x] Task (checkbox) lists in rendered Markdown
- [x] Tap-to-highlight line selection in the code viewer
- [x] Servers button moved from the drawer to the bottom bar
- [x] Always-open drawer setting (off by default; when on, the tree view hides its drawer-open item)
- [x] Render PlantUML (`.puml`) files as diagrams in the file viewer
- [x] Render Mermaid (`.mmd`) files as diagrams in the file viewer
- [x] Render PlantUML code blocks embedded in Markdown
- [x] Render Mermaid code blocks embedded in Markdown
- [x] in the file view if the file has git changes add a button to jump and see the git diff
- [x] make rendered Markdown text selectable on device
- [x] make local links in Markdown clickable and open the file in the file view
- [x] cloning should work like relay app, don't copy the entity, just open a new add form with prepopulated info and add the ability for user to save or cancel

Planned:

- nothing

## Security

Passwords, private keys, passphrases, and known-host fingerprints stay on the device, stored in the OS secure store, and are sent only to the server they belong to. The app has no analytics or telemetry dependencies.

## Development

Requires [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io). The full setup, the automated gates, and the manual device checklist live in [resource/docs/development.md](resource/docs/development.md).

## Architecture

An Expo app layered as business services (connection, tree, search, git, change watching) behind expo-router screen controllers, storage behind DALs, and the ssh2 npm package isolated behind a single `SshTransport` port in `src/lib`. The full layer mapping lives in [docs/architecture-mapping.md](docs/architecture-mapping.md).

## Contributing

Issues and pull requests are welcome. Keep the [feature status](#feature-status) in mind: help is most useful on the planned items.

## License

[MIT](LICENSE)
