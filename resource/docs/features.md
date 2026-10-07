# Features

The detail behind the [README feature list](../../README.md#features).

## Servers

<img src="../screenshots/server-list-screen.png" height="480" alt="Servers list with a saved SSH server" />

- Manage any number of SSH servers (label, host, port, username) with password or ed25519 key auth.
- Secrets stay in the device secure store, and host keys are verified TOFU-style (trust on first use) on first connect.
- The server list is sorted by name.
- Cloning a server opens a prepopulated add form to save or cancel, instead of copying the entry.
- Where a remote path is needed, a folder icon next to the remote path input opens a modal to browse and select a folder.

## Browsing

<img src="../screenshots/project-list-screen.png" height="480" alt="Projects list with two project roots on the server" />

<img src="../screenshots/project-tree-view.png" height="480" alt="Remote file tree with file-type icons and a branch bar" />

<img src="../screenshots/side-menu-open-files.png" height="480" alt="Open screens drawer over the editor in landscape" />

- The remote file tree is served over SFTP, with file-type icons, configurable nesting and row density, and toggles to hide dot files and gitignored files.
- Pull to refresh in the file view.
- The Servers button lives on the bottom bar (moved from the drawer).
- Always-open drawer setting (off by default; when on, the tree view hides its drawer-open item).

## Viewing files

<img src="../screenshots/markdown-code-view.png" height="480" alt="Code viewer showing a Markdown file with line numbers" />

<img src="../screenshots/markdown-rendered-view.png" height="480" alt="Rendered Markdown view" />

- Code viewer with syntax highlighting, word-wrap and line-number toggles, and tap-to-highlight line selection.
- Rendered Markdown with a source mode, task (checkbox) lists, selectable text, and clickable local links that open the file in the file view.
- PlantUML and Mermaid code blocks embedded in Markdown render as diagrams.
- Standalone PlantUML (`.puml`) and Mermaid (`.mmd`) files render as diagrams in the file viewer.
- HTML viewer with rendered/source modes.
- PDF viewer and binary file previews.
- File view margin setting (compact / normal / large; smaller margins give more reading space) and font size setting (xs, s, m, l, xl, xxl; default m).
- The file name shows in the file view footer, with a view-git-diff button when the file has git changes.

## Search

- Search files on the remote server, with gitignored files filtered out of the results.

## Git

<img src="../screenshots/git-diff-view.png" height="480" alt="Git diff view" />

- Status and diffs of the remote working tree, with a branch bar and diff options.

## Watching

- Remote change detection: watched files and directories reconcile in the tree and open viewers without a manual refresh.
- Uses inotify where the host supports it, with polling as the fallback.

## Theming and layout

<img src="../screenshots/code-view-landscape.png" height="480" alt="Code viewer in landscape" />

<img src="../screenshots/code-view-fullscreen-landscape.png" height="480" alt="Code viewer fullscreen in landscape" />

- MD3 light/dark theming plus an e-ink theme.
- Landscape orientation support.
