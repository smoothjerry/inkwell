# Architecture

This is a short orientation. The [design spec](DESIGN_SPEC.md) is the source of truth; decisions are recorded in [`adr/`](adr/).

## Overview

Inkwell is a Tauri 2 desktop app. A thin Rust shell hosts a webview that runs a React UI. All product logic is TypeScript. Data lives in a local SQLite database; the app makes no network calls.

```
┌──────────────────────────── Tauri window ────────────────────────────┐
│ React UI                                                              │
│  ├─ app/        shell, providers, view switch                         │
│  ├─ features/   editor, library, stats, settings, export, onboarding  │
│  ├─ domain/     pure logic: word count, sessions, weeks, streak       │
│  ├─ stores/     Zustand stores                                        │
│  └─ lib/db/     typed repositories ──────────┐                        │
│                                              │ tauri-plugin-sql (IPC) │
├──────────────────────────────────────────────┼────────────────────────┤
│ Rust core: plugins, migrations, menu,        ▼                        │
│ dialogs, print                       SQLite (app data dir)            │
└───────────────────────────────────────────────────────────────────────┘
```

## Layers

| Layer | Location | Rule |
|---|---|---|
| Rust shell | `src-tauri/` | App lifecycle, plugins, migrations, native menu, dialogs. Keep it thin. |
| App shell | `src/app/` | Window layout, theme handling, top-level view switch. |
| Features | `src/features/<name>/` | Own their components, hooks, and store slices. Cross-feature imports go through `index.ts`. |
| Domain | `src/domain/` | Pure functions. No React or Tauri imports. Fully unit-tested. |
| Data | `src/lib/db/` | The only place that talks to SQLite. |
| UI kit | `src/components/ui/` | shadcn/ui components, copied into the repo. |
| Styles | `src/styles/` | Design tokens (`tokens.css`) and global CSS (`globals.css`). |

## Current state (M9)

Every feature in the design spec exists, and the M9 polish and release work is done: the native menu, window state, backups, the accessibility pass, the performance budgets, and the release workflow. Not yet written: the component, end-to-end, and Rust migration tests from §12.

- `src-tauri/src/lib.rs` registers the SQL, dialog, and file-system plugins and the native menu (`menu.rs`). `migrations.rs` lists the migrations; the SQL is in `src-tauri/migrations/`.
- `src/lib/db/` holds the connection (`client.ts`) and the folder, document, trash, settings, sessions, weeks, and achievements repositories.
- `src/domain/` holds the pure logic, each file with unit tests beside it: `word-count.ts`, `sessions.ts`, `weeks.ts`, `streak.ts`, `achievements.ts`. `search-query.ts` is also here; it has no tests yet.
- `src/features/library/` holds the library store, the sidebar components, and the command palette.
- `src/features/editor/` holds the Tiptap editor, autosave, the session tracker, the selection toolbar, the slash menu, and the status-bar word count.
- `src/features/stats/` holds the progress store, the status-bar progress bar, streak, today ring, and celebration, and the Stats view.
- `src/features/settings/` holds the Settings view and its controls.
- `src/features/onboarding/` holds the first-launch dialog and the Welcome document.
- `src/features/export/` holds the format converters, Markdown import, PDF printing, and the export dialog.
- `src/stores/` holds the two app-wide stores: settings (read from SQLite) and the current view (`editor`, `stats`, or `settings`; there is no router).

## Storage

- The database is `inkwell.db` in the app's config directory (on macOS, `~/Library/Application Support/com.smoothjerry.inkwell/`). It runs in WAL mode with foreign keys enforced.
- Migrations run when the frontend first loads the database. The connection string must match in `migrations.rs` and `src/lib/db/client.ts`.
- Each repository function is one SQL statement where possible. The plugin uses a connection pool, so multi-statement transactions from TypeScript are not reliable; operations that need several statements (trashing or restoring a folder) are ordered so that a failure part-way leaves data recoverable.

## Library and trash

- The library store reads the whole library (folders and document summaries, not content) after every change.
- Deleting is a soft delete (`deleted_at`). Trashing a folder gives the folder, its subfolders, and their documents the same `deleted_at`; restoring the folder brings back the rows with that timestamp.
- The trash lists only items that were trashed directly. An item restored while its parent is still in the trash moves to the top level.
- Items are purged 30 days after being trashed; this runs when the library loads.

## Editor

- `createEditorExtensions()` in `editor-extensions.ts` is the only place the Tiptap extensions are assembled, so a later move to collaborative editing stays local to it.
- `EditorPane` loads the selected document's content, then mounts `DocumentEditor` keyed by document id. Switching documents unmounts one editor and mounts another.
- The editor does not re-render React on each keystroke (`shouldRerenderOnTransaction: false`). The selection toolbar reads editor state through a selector.
- The slash menu is a ProseMirror suggestion plugin (`slash-command.ts`) that publishes its state to a small Zustand store; `slash-menu.tsx` renders it.
- Document style (DESIGN_SPEC §7.11): a document's font, size, and line spacing are attributes of its `doc` node (`fontId`, `fontSize` in points, `lineSpacing`), added by `document-style.ts`. They are saved in the document JSON, and `setDocumentStyle` changes them with ProseMirror's `setDocAttribute`, so a change is one undoable step. `resolveDocumentStyle` in `src/domain/document-style.ts` fills in what a document has not chosen from the `editorFont` setting and the defaults (13 pt, spacing 1.5); `DocumentEditor` applies the result to the title and body. Line spacing 1.0 is a CSS line-height of 1.15. Format ▸ Document Style… opens `document-style-dialog.tsx`, where each change applies at once.

### Autosave

- Each edit hands the current ProseMirror document to the autosaver (`autosaver.ts`). The document is immutable, so saving does not depend on the editor still being mounted.
- A save runs 500 ms after the last edit, and at least every 5 s while edits continue. It writes the Tiptap JSON, the plain text, and the word count in one statement.
- Pending edits are flushed when the window loses focus, when switching documents, and when the app closes (see Closing the app).
- Saves run one at a time. Loading a document waits for outstanding saves, so reopening a document never reads stale content.

## Word count and sessions

- The rules are pure functions in `src/domain/sessions.ts`: when a session starts and ends, how active time accrues, and how net words are summed. They take times and counts as arguments and never read the clock.
- `src/features/editor/session-tracker.ts` is the only stateful part. It holds the one active session, feeds edits to the domain functions, and writes the result through the sessions repository.
- Each edit is recorded immediately, which is cheap. Counting words is deferred until 300 ms after the last edit; the count then updates the status bar and the session's stored words.
- A document's start count for a session is its last known count before its first edit in that session.
- Two timers run while a session is active, and none otherwise: one for the idle limit and one for local midnight.
- A session cut by midnight ends at 23:59:59.999; the next edit starts a new session on the new date.
- Sessions left open by a crash are closed on the next start (`closeStaleSessions`).

### Closing the app

`src/app/use-close-flush.ts` holds the single close-requested listener. It saves pending edits and ends the session before the window closes. Tauri closes the window as soon as any one listener finishes, so there must be only one.

### Update notice

DESIGN_SPEC §7.12. `src-tauri/src/update_check.rs` records the executable's inode and modification time at launch. The `installed_update` command compares them with the file now at that path and returns a token naming the new build, or `None` when the file is unchanged, missing, or on Windows.

- `src/app/use-update-notice.ts` calls it on the window `focus` event only, so idle CPU stays at zero. A new token goes into `src/stores/update-store.ts` and shows a persistent sonner toast; closing it records that token as dismissed. In zen mode the toast is hidden until zen mode ends.
- Relaunch calls `flushPendingWork()`, which resolves false if an edit could not be saved; then the app stays open with the save-error toast. Otherwise the `relaunch` command calls Tauri's `AppHandle::restart()`, which starts the executable now at the app's path. No process plugin is needed.
- While an update is waiting, the command palette also lists "Relaunch to Update".

## Goals and the streak

- The rules are pure functions: `src/domain/weeks.ts` (week boundaries, goal snapshots, the week-start change) and `src/domain/streak.ts`. Dates are local calendar dates as `YYYY-MM-DD` strings and all arithmetic is on calendar days, so daylight-saving changes cannot move a week boundary.
- A `weeks` row is created the first time a week is touched, with a snapshot of the goal settings. Changing the goal updates the current week's row; past weeks keep theirs.
- Changing the week start never re-buckets history. The week in which it changes runs on until the day before the first new-start day after its normal end, so that one week is 8 to 13 days long, with its goal pro-rated to `round(goal × days / 7)`. The stored row is not rewritten: the extension is derived from the next row (or the current setting) having a different start day.
- The spec describes the transitional week as "1–13 days". With the rule above it is never shorter than 8.
- `src/features/stats/progress-store.ts` recomputes this week's words, today's words, and the streak from `sessions` and `weeks` after every session write. The streak is never stored.
- The goal celebration fires the first time a week's goal is reached. The week's start date is saved in the `lastCelebratedWeek` setting so it happens once per week.

## Stats view and achievements

- `StatsView` is loaded with `React.lazy` from `src/features/stats/index.ts`, so the view and Recharts are fetched only when Stats is first opened.
- Everything on the view except the sessions table comes from the progress store, which already holds the weeks, words per date, lifetime words, and achievements. The table reads the last 20 sessions when the view opens.
- The weekly chart uses Recharts directly. The heatmap is a hand-rolled SVG; a day's shade is relative to the daily target if one is set, otherwise to a seventh of the weekly goal.
- Achievement conditions are pure functions in `src/domain/achievements.ts`. `achievement-check.ts` evaluates them on every progress refresh, stores new unlocks, and shows a toast. An unlock is permanent: a streak that later ends does not remove its achievement.

## Focus features

- **Zen mode** is a flag in the view store, not a saved setting. In zen the sidebar and status bar leave the grid and sit just outside the window's left and bottom edges with a thin strip still reachable, so moving the pointer to an edge (or tabbing into them) fades them back in. This is CSS only (`src/styles/zen.css`). A 2 px weekly-progress line stays along the bottom, and Esc exits. The macOS window buttons stay visible.
- **Typewriter scrolling** (`typewriter-scroll.ts`) is a ProseMirror plugin view. After the caret or document changes, and only for a collapsed selection in a focused editor, it scrolls the `.editor-scroll` container so the caret line sits at 45% of its height.
- **Dimming** (`focus-dimming.ts`) is a ProseMirror plugin that adds the class `is-dimming` to the editor and one inline decoration, `editor-focus`, around the current sentence or paragraph. The CSS fades the text color to 30% and restores it inside the decoration. Sentences come from `Intl.Segmenter`.
- Both plugins read their setting from the settings store when they run, so the editor is not rebuilt when a setting changes. `DocumentEditor` dispatches an empty transaction when `dimMode` changes to trigger a redraw.

### Native menu

- `src-tauri/src/menu.rs` starts from Tauri's default menu, so the standard app, Edit, and Window items keep working, and adds Import Markdown and Export to File, Command Palette, Zen Mode, Typewriter Scrolling, and a Dimming submenu to View, and a Format menu after Edit with Document Style….
- Choosing an item (or pressing its shortcut) emits a `menu` event with the action name. `src/app/use-menu-events.ts` maps the action to a store change. The action names must match in both files.
- Show Sidebar, Zen Mode, Typewriter Scrolling, and the Dimming items are check items. `src/app/use-menu-checks.ts` sends the current modes to the `set_menu_checks` command whenever they change, and again after each menu action, because macOS flips a check item by itself when it is clicked.

## Search and the command palette

- Search uses the `documents_fts` FTS5 table, which triggers have kept in sync with `documents` since the first migration. `src/lib/db/search-repo.ts` ranks with `bm25`, weighting the title five times the body, and returns a `snippet` with the matches marked by two control characters.
- `src/domain/search-query.ts` turns typed text into the MATCH expression: each word becomes a quoted prefix term and all must match. Quoting keeps FTS5 operators in the input from being interpreted.
- `CommandPalette` (`src/features/library/command-palette.tsx`) is a Dialog around `cmdk` with cmdk's own filtering turned off. Documents are filtered by the database, 120 ms after the last keystroke; commands by a substring match on title and keywords. With nothing typed it shows the most recently updated documents.
- Commands are a plain list in `commands.ts`. Each runs against the stores, the same way the menu actions do.
- The palette opens from the sidebar's Search row and from the View menu's Command Palette item (Cmd/Ctrl+K).
- On a database of 1,000 documents of 1,000 words each, the search statement took 3 to 4 ms in the `sqlite3` shell.

## Import and export

- All conversion starts from a document's stored Tiptap JSON, not from a mounted editor, so any document can be exported, not only the open one. Pending edits are autosaved first.
- **Markdown** (`markdown.ts`) uses `@tiptap/markdown`'s `MarkdownManager` with the editor's own extensions, in both directions. A unit test checks that every block type and mark survives a round trip.
- **HTML and plain text** (`html.ts`) use Tiptap's `generateHTML` and `generateText`. The HTML file is standalone, with a small embedded stylesheet.
- **Word** (`docx.ts`) walks the JSON and builds the file with the `docx` library, which is imported only when a Word export runs.
- **PDF** (`print-document.ts`) renders the document into `#print-root`, which only the print stylesheet (`src/styles/print.css`) shows, and calls `window.print()`. The user saves as PDF from the system dialog.
- Markdown and plain text contain the body only, with the title as the file name; that keeps a Markdown round trip clean. HTML, Word, and PDF start with the title as a heading.
- **Import** (`import-markdown.ts`) makes one document per chosen file, titled with the file name, in the folder of the open document or at the top level.
- Files are chosen with the Tauri dialog plugin and read or written with the file-system plugin. The capability grants read and write commands with no path scope of its own; a path becomes accessible only when the user picks it in a dialog.
- The export dialog opens when `exportDocumentId` is set in the view store. That is how the library's context menu asks for an export without importing the export feature, which itself depends on the library.

## Settings

- `src/stores/settings-store.ts` holds every setting, loaded once from the `settings` table. `update()` changes the store immediately and saves in the background. Stored values that fail validation are ignored in favor of the default.
- Two keys are not in the spec's list: `onboarded` and `lastCelebratedWeek`.

## Theming

- `src/styles/tokens.css` defines the color, radius, and layout tokens from spec §8 as CSS variables, for light and dark.
- `src/app/use-theme.ts` sets `data-theme="light" | "dark"` on `<html>`. In `system` mode it follows the OS and updates live.
- Before JavaScript runs, a `prefers-color-scheme` media query applies the dark tokens, so the window does not flash.
- `src/styles/globals.css` maps the tokens onto Tailwind v4 theme variables and onto the color names shadcn/ui expects (`background`, `foreground`, `primary`, `border`, …).
- The theme choice is the `theme` setting, saved with the other settings.

## Fonts

Geist Sans and Geist Mono are loaded with `@font-face` from the `geist` npm package's font files. Vite bundles every font into the app, so nothing is fetched at runtime.

The editor's font library (DESIGN_SPEC §7.11) is defined as data in `src/domain/fonts.ts`; its licences are in `docs/FONTS.md`. The other 18 fonts come from `@fontsource` packages. `src/styles/fonts.css` holds their `@font-face` rules, copied from each package's CSS but keeping only the Latin and Latin Extended subsets: 80 files, 2.9 MB. A font file is downloaded only when text first uses it, so cold start does not load the library. The editor column sets `--editor-font` from the `editorFont` setting, and older `sans`, `serif`, and `mono` values are mapped to Geist, Newsreader, and Geist Mono when settings load.

## Performance budgets

Measured on 2026-11-19 on an Apple Silicon Mac (macOS 26.6), release build unless noted. Test documents are plain paragraphs of 100 words each.

| Budget (§9) | Result | How it was measured |
|---|---|---|
| Cold start → editable < 800 ms | **Missed by about 40 ms.** 799–927 ms over five warm launches (median about 840 ms); 1,068 ms for the first launch after a build. About 430 ms of that is the page; the rest is launching, starting the process, and creating the webview. Opening a document then takes the doc-switch time below. | `open -n` on the release app with `HOME` set to an empty scratch folder, timed to a temporary log line written once the app shell and the editor area were laid out. The scratch library was empty. The window was visible; in a hidden window WebKit throttles timers and the times roughly double. |
| Keystroke → paint < 16 ms on a 50k-word doc | Met: median 3.4 ms, p95 4.9 ms, max 5.3 ms | 60 one-letter inserts in the middle of the document, 100 ms apart, each timed through the transaction, its update handlers, and a forced style and layout. Dev build in the browser pane, with the database stubbed. |
| Doc switch < 100 ms for a 20k-word doc | Met: 48–70 ms (50k words: 105–120 ms) | Selecting the document until its editor was drawn. Same setup as above. |
| Autosave blocks the main thread ≤ 4 ms | Met: median 2.8 ms, max 3.4 ms on a 50k-word doc | Plain text, `JSON.stringify` of the document, the cached word count, and serializing the arguments to the save command. These run in two separate tasks, so neither blocks for the whole time. |
| Installer < 15 MB | Met: 5.9 MB `.dmg`; 8.6 MB `.app` with the font library (3.2 MB and 5.8 MB before it). Cold start was re-timed after adding the library: median 833 ms, page 433 ms, unchanged. | `pnpm tauri build` on macOS (arm64). Windows and Linux installers are measured when the release workflow builds them. |
| Idle CPU ~0% | Met: 0.00 s of CPU in 60 s | CPU time of the installed app and its WebKit helpers, from `ps`, with a document open and no typing. |

Not measured: the Windows cold start, because no Windows machine was available, and the sidebar above 500 items. The library has not reached that size, so it is not virtualized yet (§9).

### Why cold start misses, and what would fix it

- The page's 430 ms covers loading and running the scripts, including the editor chunk, and opening the database, which checks the migrations. The library, settings, and stale-session loads start together after that; progress waits for settings.
- The editor and Tiptap now load in their own chunk, so the shell no longer waits for them. Before this change the first script was 1.08 MB; now it is 501 kB, plus a 53 kB shared chunk.
- What is left to try: profile the page's 430 ms in WebKit to see how it splits between script and database, and create the window hidden and show it after the first paint, so no time is spent on a blank window. Neither is done yet.

### Code splitting

- `EditorPane` is loaded with `React.lazy` from `src/features/editor/index.ts`, like `StatsView`. Tiptap and ProseMirror are in its chunk.
- Export loads its converters with `import()` when an export or import starts: `markdown.ts`, `html.ts`, and `print-document.ts` in `export-document.ts` and `import-markdown.ts`, and the `docx` library in `docx.ts`.
- `package.json` sets `"sideEffects": ["**/*.css"]`. Without it the bundler keeps every module a feature's `index.ts` re-exports, so `createEditorExtensions` pulled Tiptap into the first chunk. A new module that must run for its side effects alone (an `import "./x"` without names) has to be added to that list.

## Security

- The Tauri capability in `src-tauri/capabilities/default.json` grants the main window the core defaults, window dragging and closing, printing, SQL access, the open and save dialogs, and file reads and writes for paths chosen in those dialogs.
- A content security policy in `src-tauri/tauri.conf.json` restricts the webview to the app's own assets.

## Quality gates

Biome (lint and format), `tsc`, Vitest, `cargo fmt`, `cargo clippy -D warnings`, and `cargo test` run in CI (`.github/workflows/ci.yml`). lefthook runs Biome, the typecheck, and `cargo fmt --check` before each commit.

`.github/workflows/release.yml` builds unsigned installers with `tauri-action` for macOS (one universal app), Windows, and Linux. A `v*.*.*` tag that matches the version in `tauri.conf.json` puts them on a draft GitHub release. A pull request that changes the workflow runs the same builds and keeps the installers as run artifacts. Signing, notarization, and updates are left for later (§13).
