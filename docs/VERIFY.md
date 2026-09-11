# Turnstone Manual Verification Checklist

This is the ordered end-to-end device checklist covering all ten functional
requirements of the app: server management, SSH connect with TOFU host key
verification, tree browsing, the code viewer, markdown rendering, search, git
status and diffs, remote change detection, theming, and strictly read-only
behavior. The autonomous build loop cannot run any of it headlessly: every
entry below needs a development build installed on a real device and at least
one reachable SSH server (a second one, plus a read-only account on it, for
the auth and read-only sections).

The automated gates (`pnpm typecheck`, `pnpm lint`, `pnpm test:contract`,
`pnpm bundle-check`) all pass before this checklist is worth running; the
entries here cover only what a real device can prove. Work through the
sections in order: each one assumes the state left by the previous ones.

## 1. Set up servers

On the Servers home screen (first tab):

- [ ] Add a server with password auth (label, host, port, username, password); it appears in the list showing `user@host:port` and "Password auth".
- [ ] Add a server with a pasted ed25519 private key plus optional passphrase; it appears showing "Key auth".
- [ ] Edit a server and change only its label; saving does not wipe its stored secret (a later connect still authenticates).
- [ ] Delete a server after confirming the dialog; it disappears from the list.
- [ ] Fully restart the app; the remaining servers still appear (list persists).

## 2. Connect and verify host keys (TOFU)

On the Servers home screen, with a reachable SSH server configured:

- [ ] Tap a freshly added server: the fingerprint modal appears showing the server label and a `SHA256:...` fingerprint; tapping Accept connects and opens the file tree screen for that host.
- [ ] Go back to the servers list and tap the same server again: the connect is silent (no fingerprint modal) and the tree screen opens directly.
- [ ] Tap the Reject button on a first-connect prompt: the connect aborts, the modal closes, and no repeated prompts or error alerts fire.
- [ ] Simulate a changed host key (edit the server's stored known-host entry, or point the config at a different server behind the same label): the connect is rejected loudly with the mismatch warning naming the stored and presented fingerprints, and no silent-accept option is offered.
- [ ] Both modal states follow the system theme (light and dark).

## 3. Browse the file tree

On a connected server's tree screen (tap a verified server on the Servers
screen):

- [ ] The breadcrumb starts at `/`; directories list first with chevrons; tapping a directory expands its children inline (indented, chevron rotates); tapping again collapses.
- [ ] Expand nested directories several levels deep; scrolling stays smooth on a large directory (200+ entries per level).
- [ ] Tap breadcrumb segments to jump to an ancestor; the listing re-roots there and the last-browsed root persists (kill and reopen the app, reconnect: it starts at that path).
- [ ] Reopen the app on a previously browsed directory: the cached listing paints instantly, before the network validation finishes.

## 4. Open files in the code viewer

On a connected server's tree screen, tap file rows to open the file viewer:

- [ ] Open a ~50 KB text/source file: the header shows the file name and size, syntax highlighting renders with line numbers, and the line-number gutter stays aligned with the code lines at every scroll offset.
- [ ] Scroll a long line horizontally: the gutter stays fixed while the code scrolls; the gesture does not fight the outer vertical scroll.
- [ ] Long-press a token and drag the selection handles, then copy: the selection copies the file text, not the line numbers.
- [ ] Open a ~1.5 MB file: the size shows immediately; scrolling auto-loads content up to 1 MB, then an explicit "Load more" button appears at the bottom; tapping it loads the remainder; at the 2 MB cap the footer shows the on-demand limit note.
- [ ] Open a binary file (e.g. a .png or .tar): the binary placeholder renders ("Binary file" plus name and size), never decoded text.
- [ ] The JetBrains Mono webfont renders in the viewer (glyph shapes match the app-wide monospace, not the system fallback).
- [ ] The Back button in the header returns to the tree at the previously browsed location.

## 5. Read markdown

On a connected server's tree screen, tap a `.md` / `.markdown` file row
(other file rows still open the code viewer):

- [ ] The markdown screen opens (not the plain file viewer) and renders the file: headings, lists, links, tables, and inline code appear styled for the current theme.
- [ ] Toggle "Source" in the header: the raw markdown renders in the code viewer with markdown syntax highlighting; toggle back to "Rendered" restores the rendered view without reloading the file.
- [ ] Tap a fenced code block in the rendered view: the code block viewer opens showing the block with syntax highlighting for its fence language (e.g. a \`\`\`ts block highlights as TypeScript); Back returns to the markdown screen.
- [ ] A markdown file larger than 2 MB renders with the truncation note ("Large markdown file: showing the first 2 MB") instead of failing.

## 6. Search

On a connected server's tree screen, tap Search in the header (the search
runs from the directory currently shown as the tree root):

- [ ] Content search on a repo with ripgrep present: results stream in batches, the match count grows live, rows show path, line number, and matching line text.
- [ ] Filename mode: fuzzy search ranks results (exact name matches ahead of scattered subsequence matches), rows show paths only.
- [ ] Cancel mid-search: the stream stops, the count indicator shows "stopped", and no error alert appears.
- [ ] Tap a content match: the file viewer opens for that file.

## 7. Inspect git status and diffs

On a connected server's tree screen inside a git repository, tap Git in the
header (the button appears only when the browsed directory belongs to a repo;
navigating to a non-repo directory hides it again):

- [ ] The branch header matches the server's `git status`: same branch name (or "(detached)"), and the Ahead/Behind badges match the `# branch.ab` counts from `git status -sb --porcelain=v2`.
- [ ] The changed-file list matches `git status --porcelain`: modified, staged, renamed, untracked, and unmerged files all appear with their status badge.
- [ ] Expand a modified file row: the unified diff loads lazily (spinner while fetching) and renders added lines in the primary color, deleted lines in the error color, with line numbers and hunk headers.
- [ ] Word-level highlights: in a changed line pair, the changed words render bold/underlined inside both the old and the new line.
- [ ] Rename rows show both the old and the new path.
- [ ] Expand a binary file row (e.g. a modified .png): the diff area shows the binary note, never decoded content.
- [ ] Switch the diff mode selector (Worktree / Cached / HEAD) and expand the same file: the patch reflects the selected mode (staged-only changes appear under Cached).
- [ ] Outside a git repository the tree header shows no Git button; opening /git/[host] directly for a non-repo root shows "Not a git repository".

## 8. Watch remote changes

On a connected server, with a file open in the viewer and one or more
directories expanded in the tree:

- [ ] Touch (or edit and save) the open file on the server: the viewer refreshes its content within ~5 seconds, keeping the scroll position anchored to the same line (with inotifywait installed on the host the refresh follows the change immediately).
- [ ] Scroll partway down a large open file, then change it on the server: after the refresh the same line is still at the top of the viewport; previously loaded extra chunks are re-loaded too.
- [ ] Create a file inside an expanded directory on the server (`touch newfile`): the new row appears within ~20 seconds (instantly or within a second when inotifywait is installed).
- [ ] Delete a file inside an expanded directory on the server: the row disappears on the next reconcile tick.
- [ ] Pull to refresh in the tree with expanded directories visible: contents changed on the server appear once the spinner stops.
- [ ] Background the app for ~30 seconds, change a watched file or expanded directory on the server, then foreground the app: the viewer and tree reconcile without a manual refresh.
- [ ] Break the connection (e.g. toggle airplane mode) and let the app reconnect: after reconnect, changing a watched file or directory still refreshes the viewer/tree (polling resumed on the fresh transport).
- [ ] Navigate back from the tree to the server list and leave the app idle on that screen: no further watcher polling or alerts occur for the left screen (subscriptions were cleaned up on unmount).

## 9. Switch themes

With a server configured and connected, walk every screen in both themes. The
Servers header has a theme chip (Auto / Light / Dark) that cycles the persisted
override; the system scheme is toggled from the OS quick settings.

- [ ] On the Servers screen, tap the theme chip: it cycles Auto -> Light -> Dark -> Auto, every screen element recolors immediately, and the chip label always shows the active override.
- [ ] Set the override to Light while the system is on Dark (and vice versa): every screen follows the override, not the system scheme.
- [ ] With the override on Auto, toggle the OS system theme: the Servers screen (list rows, header, form modal, fingerprint modal), the tree screen (breadcrumb, rows, header buttons), the file viewer (header, footer, syntax colors), the markdown screen (rendered and source views), the code block viewer, the search screen (bar, results), and the git screens (branch header, file list, diff colors) all follow the scheme with no white flashes or reloads.
- [ ] Open a file in the viewer and switch themes (chip or system toggle): the WebView swaps its CSS classes in place, line numbers and selection survive, and the markdown rendered view restyles for the scheme.
- [ ] The root background behind safe areas and the system UI background follow the scheme on every screen (no dark keyboard area under a light screen or the reverse).
- [ ] Fully restart the app: the last chosen override is still active (persisted).

## 10. Confirm read-only behavior

Turnstone must never write to, modify, rename, or delete anything on the
server. The strongest device proof is a connection that physically cannot
write:

- [ ] Configure a server using an account with read-only access to the browsed tree (or chmod the test tree 555): every feature above still works end to end (connect, browse, open, markdown, search, git view, change watching).
- [ ] On a normal account, after a full session of browsing, opening, searching, and git viewing, run `find <root> -newer <session-start-marker>` (or check file mtimes) on the server: nothing inside the browsed tree was modified by the app.
- [ ] Keep the app connected and idle for several minutes: no error alerts, disconnect loops, or battery drain from runaway polling appear (keepalive and watcher cadence are stable).
