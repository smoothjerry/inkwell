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

## Current state (M1)

Storage and the library exist; the editor does not yet.

- `src-tauri/src/lib.rs` registers `tauri-plugin-sql`. `migrations.rs` lists the migrations; the SQL is in `src-tauri/migrations/`.
- `src/lib/db/` holds the connection (`client.ts`) and the folder, document, and trash repositories.
- `src/features/library/` holds the library store and the sidebar components.
- `src/app/app.tsx` renders the sidebar, a placeholder canvas showing the selected document's title, and the status bar.
- `src/domain/` and the other feature folders do not exist yet. Each is created by the milestone that first needs it.

## Storage

- The database is `inkwell.db` in the app's config directory (on macOS, `~/Library/Application Support/com.smoothjerry.inkwell/`). It runs in WAL mode with foreign keys enforced.
- Migrations run when the frontend first loads the database. The connection string must match in `migrations.rs` and `src/lib/db/client.ts`.
- Each repository function is one SQL statement where possible. The plugin uses a connection pool, so multi-statement transactions from TypeScript are not reliable; operations that need several statements (trashing or restoring a folder) are ordered so that a failure part-way leaves data recoverable.

## Library and trash

- The library store reads the whole library (folders and document summaries, not content) after every change.
- Deleting is a soft delete (`deleted_at`). Trashing a folder gives the folder, its subfolders, and their documents the same `deleted_at`; restoring the folder brings back the rows with that timestamp.
- The trash lists only items that were trashed directly. An item restored while its parent is still in the trash moves to the top level.
- Items are purged 30 days after being trashed; this runs when the library loads.

## Theming

- `src/styles/tokens.css` defines the color, radius, and layout tokens from spec §8 as CSS variables, for light and dark.
- `src/app/use-theme.ts` sets `data-theme="light" | "dark"` on `<html>`. In `system` mode it follows the OS and updates live.
- Before JavaScript runs, a `prefers-color-scheme` media query applies the dark tokens, so the window does not flash.
- `src/styles/globals.css` maps the tokens onto Tailwind v4 theme variables and onto the color names shadcn/ui expects (`background`, `foreground`, `primary`, `border`, …).
- The theme choice is held in a Zustand store in memory. It moves to the SQLite `settings` table with the other settings.

## Fonts

Geist Sans and Geist Mono are loaded with `@font-face` from the `geist` npm package's font files. Vite bundles them into the app, so nothing is fetched at runtime.

## Security

- The Tauri capability in `src-tauri/capabilities/default.json` grants the main window only the core defaults plus window dragging.
- A content security policy in `src-tauri/tauri.conf.json` restricts the webview to the app's own assets.

## Quality gates

Biome (lint and format), `tsc`, Vitest, `cargo fmt`, `cargo clippy -D warnings`, and `cargo test` run in CI (`.github/workflows/ci.yml`). lefthook runs Biome, the typecheck, and `cargo fmt --check` before each commit.
