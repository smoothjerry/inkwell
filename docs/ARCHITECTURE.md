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

## Current state (M5)

Storage, the library, the editor, sessions, goals, the streak, settings, onboarding, and the stats view exist. Focus modes, search, and export do not yet.

- `src-tauri/src/lib.rs` registers `tauri-plugin-sql`. `migrations.rs` lists the migrations; the SQL is in `src-tauri/migrations/`.
- `src/lib/db/` holds the connection (`client.ts`) and the folder, document, trash, settings, sessions, weeks, and achievements repositories.
- `src/domain/` holds the pure logic, each file with unit tests beside it: `word-count.ts`, `sessions.ts`, `weeks.ts`, `streak.ts`, `achievements.ts`.
- `src/features/library/` holds the library store and the sidebar components.
- `src/features/editor/` holds the Tiptap editor, autosave, the session tracker, the selection toolbar, the slash menu, and the status-bar word count.
- `src/features/stats/` holds the progress store, the status-bar progress bar, streak, today ring, and celebration, and the Stats view.
- `src/features/settings/` holds the Settings view and its controls.
- `src/features/onboarding/` holds the first-launch dialog and the Welcome document.
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

Geist Sans and Geist Mono are loaded with `@font-face` from the `geist` npm package's font files. The serif editor font, Newsreader, comes from `@fontsource-variable/newsreader`. Vite bundles them all into the app, so nothing is fetched at runtime.

## Security

- The Tauri capability in `src-tauri/capabilities/default.json` grants the main window the core defaults, window dragging and closing, and SQL access.
- A content security policy in `src-tauri/tauri.conf.json` restricts the webview to the app's own assets.

## Quality gates

Biome (lint and format), `tsc`, Vitest, `cargo fmt`, `cargo clippy -D warnings`, and `cargo test` run in CI (`.github/workflows/ci.yml`). lefthook runs Biome, the typecheck, and `cargo fmt --check` before each commit.
