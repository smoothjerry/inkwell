# Inkwell — Design Spec (v1)

> **Working name:** "Inkwell" is a placeholder. Find/replace `Inkwell` / `inkwell` before the first commit if you rename it.
> **Audience:** This document is the build brief for an AI coding session (Fable). It is prescriptive where decisions were made and marks open items explicitly.
> **Status:** Draft v1 · 2026-11-09

---

## 1. Product summary

Inkwell is a fast, minimal, local-first **desktop word processor** with a Vercel/Geist-style UI and a built-in **weekly writing streak** system. Writers set a weekly word-count goal (with an optional daily target), see their progress at all times, and review stats about recent sessions.

### 1.1 Goals
- Feels instant: sub-second cold start, zero perceptible typing latency on long documents.
- Looks sleek: monochrome, high-contrast, typographic, Vercel-dashboard aesthetic.
- Private by default: everything lives on the user's machine; no account, no network calls.
- Motivating: weekly streaks, progress bar, stats, tasteful celebrations.
- Built cleanly: a well-documented public GitHub repo with conventional tooling and CI.

### 1.2 Non-goals (v1)
- No accounts, cloud sync, or real-time collaboration (but the architecture must not preclude them; see §4.4).
- No AI features (keep the command system extensible so they can be added later).
- No page-layout / print-fidelity features (margins, headers/footers, page breaks, track changes).
- No mobile or web build.

---

## 2. Decisions log

| Area | Decision | Rationale |
|---|---|---|
| Platform | **Desktop via Tauri 2** | Small native binary, real filesystem access, web UI stack. macOS primary; Windows/Linux built in CI. |
| Storage | **Local-first SQLite** (`tauri-plugin-sql`), sync later | Durable, queryable, easy to back up; clean seam for future sync. |
| Editing model | **Rich text WYSIWYG with Markdown shortcuts** | Notion/Docs-like; structured JSON doc model. |
| Collaboration | **Solo v1, collab-ready** | Tiptap + Yjs path exists without rewrite. |
| Organization | **Sidebar library with nested folders**, search, pinning, ⌘K palette | Familiar, scales. |
| Focus features | Focus/zen mode, typewriter scrolling, light/dark/system themes, sentence/paragraph dimming | All in v1. |
| Import/Export | Markdown (import + export); DOCX, PDF, HTML, plain text (export) | |
| AI | **None in v1** | Keep it a pure writing tool. |
| Word counting | **Net new words per session, floored at 0** | Deleting never pushes below zero; rewards real output. |
| Paste | **Counts toward goal** | Self-accountability; no special casing. |
| Streak | **Weekly goal drives streak**; optional daily target only affects heatmap + "today" ring | One clear rule. No freezes in v1 (see §13). |
| Session | **Automatic**: starts on first edit, ends after 10 min idle, app close, or local midnight | Zero friction. |
| Week start | **User setting, default Monday**, local time | |
| Frontend | **React 19 + Vite + TypeScript (strict)** | Best editor/component ecosystem. No Next.js (no server). |
| Editor engine | **Tiptap 3 (ProseMirror)** | Mature, extensible, Yjs-ready. |
| Styling | **Tailwind CSS v4 + shadcn/ui (Radix) + Geist Sans/Mono + Lucide + Motion** | Closest to Vercel's own stack. |
| Tooling | **pnpm, Biome, Vitest, Playwright/WebdriverIO, clippy + rustfmt, GitHub Actions, Conventional Commits** | Fast, minimal config. |
| License | **MIT** | |

---

## 3. Tech stack (concrete)

Use the latest stable versions at build time within these majors; pin exact versions in lockfiles.

**Shell / native**
- Tauri 2.x (Rust stable, edition 2021)
- Plugins: `tauri-plugin-sql` (sqlite), `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-window-state`, `tauri-plugin-store` (settings, optional — settings may also live in SQLite; pick one, prefer SQLite)

**Frontend**
- React 19, TypeScript 5.x (`strict: true`, `noUncheckedIndexedAccess: true`)
- Vite (latest) with `@vitejs/plugin-react`
- Tiptap 3.x: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-typography`, `@tiptap/extension-link`, `@tiptap/extension-task-list`/`task-item`, `@tiptap/markdown` (or `tiptap-markdown` if needed)
- State: Zustand (UI + app state). No Redux, no TanStack Query (no network).
- Navigation: a simple `view` enum in Zustand (`editor | stats | settings`) — no router.
- UI: Tailwind v4, shadcn/ui components (copied into repo), Radix primitives, `cmdk` (command palette), Lucide icons, Motion (`motion/react`) for animation, `sonner` for toasts
- Fonts: Geist Sans + Geist Mono (`geist` npm package, bundled locally — no network)
- Charts: shadcn charts (Recharts); activity heatmap as a hand-rolled SVG component
- Export: `docx` (npm) for DOCX; Tiptap HTML/Markdown serializers; PDF via webview print (§7.6)
- Dates: `date-fns` (week math with configurable `weekStartsOn`)

**Quality**
- Biome (lint + format, single config)
- Vitest + @testing-library/react for unit/component tests
- E2E: WebdriverIO with `tauri-driver` (Linux/Windows CI) and/or Playwright against the Vite dev server for UI flows that don't need native APIs (mock the Tauri bridge)
- Rust: `cargo fmt`, `cargo clippy -D warnings`, `cargo test`
- Commit hooks: `lefthook` running Biome + typecheck on staged files
- Conventional Commits; `CHANGELOG.md` maintained via release-please (or changesets)

---

## 4. Architecture

```
┌──────────────────────────── Tauri window ────────────────────────────┐
│ React UI                                                              │
│  ├─ features/editor     (Tiptap, focus modes, word-count tracker)     │
│  ├─ features/library    (sidebar tree, search, ⌘K)                    │
│  ├─ features/stats      (progress, streak, charts, sessions)          │
│  ├─ features/settings                                                │
│  ├─ features/export                                                  │
│  └─ lib/db  ── typed repository functions ──┐                         │
│                                             │ tauri-plugin-sql (IPC)  │
├─────────────────────────────────────────────┼─────────────────────────┤
│ Rust core: plugin registration, migrations, │ file dialogs, print,    │
│ window state, app menu, small commands      ▼                         │
│                                    SQLite  (app_data_dir/inkwell.db)  │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.1 Responsibilities
- **Rust:** app lifecycle, plugin setup, SQL migrations (defined in Rust via `tauri_plugin_sql::Migration`), native menu (File/Edit/View with accelerators), file dialogs, `print` command for PDF export. Keep Rust thin.
- **TypeScript:** all product logic — editor, word counting, session tracking, streak computation, rendering. Pure logic lives in `src/domain/` with no React/Tauri imports so it is trivially unit-testable.

### 4.2 Data flow for a keystroke
1. Tiptap `onUpdate` fires → mark doc dirty, notify `SessionTracker.onActivity(docId, ts)`.
2. Debounced (500 ms idle, max 5 s) **autosave**: serialize doc JSON + plain text → `documents` row update.
3. Debounced (300 ms, via `requestIdleCallback`) **word count**: recompute doc word count (§6.1), update `session_docs.end_words`, update in-memory progress store → status bar re-renders.

### 4.3 Persistence rules
- DB file: `$APPDATA/inkwell/inkwell.db`, WAL mode, `foreign_keys = ON`.
- Never lose text: flush pending saves on window blur, `beforeunload`, and the Tauri close-requested event.
- Backups: on app start, if the last backup is > 24 h old, copy the DB to `backups/inkwell-YYYYMMDD.db`; keep the last 7.

### 4.4 Collab/sync readiness (do not build, just don't block)
- Documents are addressed by UUIDv7 ids (sortable, globally unique).
- All rows carry `created_at` / `updated_at` (UTC ms) and `deleted_at` (soft delete).
- Editor content is stored as Tiptap JSON. A future migration can convert to Yjs binary state (`Y.Doc`) and add `@tiptap/extension-collaboration`; keep the editor setup in one factory (`createEditorExtensions()`) so that swap is localized.

---

## 5. Data model (SQLite)

```sql
-- 001_init.sql
CREATE TABLE folders (
  id          TEXT PRIMARY KEY,           -- uuidv7
  parent_id   TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  REAL NOT NULL DEFAULT 0,    -- fractional indexing for drag-reorder
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE TABLE documents (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  content     TEXT NOT NULL,              -- Tiptap JSON
  plain_text  TEXT NOT NULL DEFAULT '',   -- for search + export
  word_count  INTEGER NOT NULL DEFAULT 0,
  pinned      INTEGER NOT NULL DEFAULT 0,
  sort_order  REAL NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER                     -- trash; purge after 30 days
);

CREATE VIRTUAL TABLE documents_fts USING fts5(
  title, plain_text, content='documents', content_rowid='rowid'
);
-- + triggers to keep documents_fts in sync

CREATE TABLE sessions (
  id             TEXT PRIMARY KEY,
  local_date     TEXT NOT NULL,           -- 'YYYY-MM-DD' in local tz at session start
  started_at     INTEGER NOT NULL,        -- UTC ms
  ended_at       INTEGER,                 -- null while active
  active_ms      INTEGER NOT NULL DEFAULT 0,
  words          INTEGER NOT NULL DEFAULT 0  -- sum of session_docs net words (denormalized)
);
CREATE INDEX sessions_local_date ON sessions(local_date);

CREATE TABLE session_docs (
  session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  start_words  INTEGER NOT NULL,
  end_words    INTEGER NOT NULL,
  PRIMARY KEY (session_id, document_id)
);

CREATE TABLE weeks (
  week_start   TEXT PRIMARY KEY,          -- 'YYYY-MM-DD' local date of first day
  week_starts_on INTEGER NOT NULL,        -- 0=Sun,1=Mon at time of creation
  goal_words   INTEGER NOT NULL,          -- goal snapshot for this week
  daily_target INTEGER                    -- null = no daily target
);

CREATE TABLE achievements (
  id          TEXT PRIMARY KEY,           -- e.g. 'words_10k', 'streak_10'
  unlocked_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                     -- JSON
);
```

**Settings keys:** `theme` (`system|light|dark`), `weeklyGoal` (default 2500), `dailyTarget` (default null), `weekStartsOn` (default 1), `editorFont` (`sans|serif|mono`), `editorWidth` (`narrow|medium|wide`), `typewriterMode`, `dimMode` (`off|sentence|paragraph`), `celebrations` (bool), `sessionIdleMinutes` (default 10).

---

## 6. Gamification & stats — core logic

All functions in this section live in `src/domain/` as pure functions with exhaustive unit tests.

### 6.1 Word counting
- Count words with `Intl.Segmenter(undefined, { granularity: 'word' })`, counting segments where `isWordLike === true`. This handles punctuation, contractions, and CJK correctly.
- Input is the document's plain text (block nodes joined by `\n`). Exclude code blocks? **No** — count everything visible.
- Performance: for docs > 20k words, cache counts per top-level node (keyed by node identity/position hash) and only recount changed nodes.

### 6.2 Sessions
- A session **starts** on the first content-changing edit when no session is active.
- A session **ends** when: no edit for `sessionIdleMinutes` (default 10), app quit/window close, or **local midnight** (end the session at 23:59:59.999 and immediately open a new one on the next edit — this guarantees each session belongs to exactly one local date).
- **Active time:** sum of inter-edit gaps that are < 60 s.
- For each document touched in a session: record `start_words` (doc count before the first edit in this session) and continuously update `end_words`.
- **Session net words** = Σ over docs `max(0, end_words − start_words)`. Persist to `sessions.words` on every count update (so a crash loses ≤ 1 debounce interval).
- Pasted text counts normally.
- **WPM** = `words / (active_ms / 60000)`; show "—" when active time < 1 min.
- Sessions with `words = 0` and `active_ms < 30s` are deleted on close (noise).

### 6.3 Weeks & goals
- Week boundaries come from `weekStartsOn` (default Monday) in **local time**; a session's week is derived from its `local_date`.
- A `weeks` row is created lazily the first time a week is touched, snapshotting `goal_words`, `daily_target`, and `week_starts_on`.
- Changing the weekly goal updates the **current** week's snapshot and future weeks; past weeks are immutable.
- Changing `weekStartsOn` takes effect **from the next week boundary** (don't re-bucket history). Implementation: the current week keeps its stored start; the next week starts on the next occurrence of the new start day after the current week ends (that transitional week may be 1–13 days; treat it as one week with a pro-rated goal = `round(goal × days/7)`).
- **Week met** ⇔ Σ session words in the week ≥ `goal_words`.

### 6.4 Streak
- **Current streak** = number of consecutive met weeks ending at the most recent **completed** week, **plus 1** if the current (in-progress) week is already met.
- An in-progress unmet week never breaks the streak until it ends.
- **Longest streak** = max run over all history.
- Weeks with no `weeks` row (app not opened) count as unmet.
- Derived on demand from `sessions` + `weeks`; do not store the streak count (avoid drift). Cache in memory.

### 6.5 Daily target (optional)
- Does **not** affect the streak.
- Drives: heatmap cell intensity bands, a small "today" ring in the status bar, and the "Perfect week" badge.

### 6.6 Achievements (v1 set)
| id | Condition |
|---|---|
| `first_session` | First session with ≥ 1 word |
| `words_1k`, `words_10k`, `words_50k`, `words_100k`, `words_250k` | Lifetime net words |
| `streak_4`, `streak_10`, `streak_26`, `streak_52` | Current streak reaches N weeks |
| `goal_crusher` | A week with ≥ 2× goal |
| `perfect_week` | Daily target met on all 7 days of a week |
| `marathon` | Single session ≥ 2,000 words |

Evaluate after each count update (cheap checks) and on app start. Unlock is idempotent.

### 6.7 Celebrations
- Weekly goal reached (first time that week): progress bar fills with a brief shimmer + a single subtle confetti burst from the status bar (≤ 1.2 s), plus a toast "Weekly goal reached — 🔥 N-week streak".
- Achievement unlocked: toast with icon; no confetti.
- All motion respects `prefers-reduced-motion` and the `celebrations` setting.

---

## 7. Features & UX

### 7.1 Layout
```
┌──────────────┬────────────────────────────────────────────────────┐
│ ⌘K Search    │  Doc title (editable, large)                       │
│──────────────│                                                    │
│ ★ Pinned     │  Editor canvas (centered, max-width ~68ch)         │
│ ▸ Folder     │                                                    │
│   · Doc      │                                                    │
│ · Doc        │                                                    │
│──────────────│                                                    │
│ Stats        │                                                    │
│ Settings     │                                                    │
├──────────────┴────────────────────────────────────────────────────┤
│ 1,240 / 2,500 this week ▓▓▓▓▓░░░░░  🔥 6 · ◔ today · 812 words doc │
└───────────────────────────────────────────────────────────────────┘
```
- Sidebar: 260 px, collapsible (⌘\), resizable 200–400 px.
- Status bar: 28 px, always visible except in zen mode (where only a 2 px progress line remains at the bottom edge).
- Native title bar hidden on macOS (`titleBarStyle: Overlay`), with traffic lights over the sidebar.

### 7.2 Library
- Nested folders, drag-and-drop docs and folders (dnd-kit), rename inline (double-click/F2), context menu (Radix).
- Pin docs; Trash (soft delete, restore, empty, 30-day auto purge).
- Sort: manual (default), updated, title.
- Full-text search via FTS5 in the ⌘K palette (docs + commands).

### 7.3 Editor
- Blocks: paragraph, H1–H3, bullet/ordered/task lists, blockquote, code block, horizontal rule, link, bold/italic/strike/inline code.
- Markdown input rules (`# `, `- `, `1. `, `> `, ``` ``` ```, `**x**`, `_x_`, `---`).
- Bubble menu on selection (bold, italic, link, H1/H2, quote). No permanent toolbar.
- Slash menu (`/`) for block insertion.
- Smart typography (curly quotes, em dashes, ellipses).
- Editor font choice (Geist Sans / a serif such as Newsreader or iA Writer Quattro-like / Geist Mono) and width setting.
- Per-doc word count + reading time in status bar; selection word count when text is selected.

### 7.4 Focus features
- **Zen mode** (⌘⇧F): hide sidebar + status bar + title bar chrome; fade UI in on mouse move to the edges; Esc exits.
- **Typewriter scrolling** (setting + View menu): keep the caret line at ~45% viewport height; smooth scroll; disabled when the selection is a range.
- **Dimming** (`off | sentence | paragraph`): ProseMirror decoration plugin that applies `opacity: 0.3` to all text except the active sentence/paragraph. Sentence boundaries via `Intl.Segmenter({ granularity: 'sentence' })` on the current block.
- **Themes:** light / dark / system via `data-theme` on `<html>` and CSS variables; follow OS changes live.

### 7.5 Stats view
- **KPI tiles** (top row): This week (words / goal + bar), Current streak, Longest streak, Avg words/session (last 10), Lifetime words.
- **Weekly bar chart**: last 12 weeks, goal line overlaid, met weeks in foreground color, unmet in muted gray.
- **Activity heatmap**: last 52 weeks × 7 days, GitHub-style, 5 intensity bands (relative to daily target if set, else to `weeklyGoal/7`), tooltip with date + words.
- **Recent sessions table**: last 20 — date/time, duration (active), words, WPM, documents touched (chips).
- **Achievements grid**: unlocked in full color with date; locked as gray outlines with progress (e.g., "6 / 10 weeks").
- **Goal settings inline**: weekly goal (stepper + presets 1k/2.5k/5k/10k), daily target (optional), week start.

### 7.6 Import / Export
- **Import:** `.md` files (single or multi-select) → new docs in the current folder.
- **Export** (File ▸ Export, and doc context menu): Markdown, DOCX (via `docx`, mapping headings/lists/quotes/code/links), HTML (standalone with embedded minimal CSS), Plain text, PDF.
- **PDF:** render the doc into a hidden print-styled view and call the webview print dialog (Tauri `WebviewWindow` print / `window.print()`); the user chooses "Save as PDF". Provide `@media print` styles (serif, 11pt, 1in margins).

### 7.7 Keyboard shortcuts
| Action | Shortcut |
|---|---|
| New doc / new folder | ⌘N / ⌘⇧N |
| Command palette | ⌘K |
| Toggle sidebar | ⌘\ |
| Zen mode | ⌘⇧F |
| Stats / Settings | ⌘⇧S / ⌘, |
| Export | ⌘⇧E |
| Find in doc | ⌘F |
(Use Ctrl on Windows/Linux. Register via the native menu so they show in the menu bar.)

### 7.8 Onboarding
First launch: a 2-step modal — (1) pick weekly goal (presets), optional daily target, week start; (2) theme. Then open a "Welcome" doc explaining Markdown shortcuts and streak rules.

---

## 8. Visual design system (Vercel/Geist-inspired)

Original design informed by the Geist aesthetic; do not copy Vercel logos, brand marks, or proprietary assets.

**Principles:** monochrome first, color only for meaning; 1 px hairline borders over shadows; generous whitespace; crisp typography; fast, subtle motion (150–200 ms, ease-out).

**Tokens (CSS variables, defined in `src/styles/tokens.css`):**
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#ffffff` | `#000000` |
| `--bg-subtle` | `#fafafa` | `#0a0a0a` |
| `--fg` | `#0a0a0a` | `#ededed` |
| `--fg-muted` | `#666666` | `#a1a1a1` |
| `--border` | `#eaeaea` | `#1f1f1f` |
| `--border-strong` | `#d4d4d4` | `#333333` |
| `--accent` | `#0a0a0a` | `#ededed` |
| `--success` | `#16a34a` | `#22c55e` |
| `--streak` (flame) | `#f97316` | `#fb923c` |
| `--focus-ring` | `#0070f3`-like blue at 40% | same |

- **Radius:** 6 px controls, 8 px cards, 12 px dialogs.
- **Type:** Geist Sans for UI (13 px base in chrome, 14 px in panels); editor 17–18 px / 1.7 line height; Geist Mono for numbers in stats (tabular figures).
- **Elevation:** dialogs/popovers use `--bg` + 1 px `--border` + soft shadow `0 8px 30px rgba(0,0,0,.12)` (dark: `rgba(0,0,0,.6)`).
- **Progress bar:** 4 px tall, rounded, `--border` track, `--fg` fill; turns `--success` with a 600 ms shimmer when the goal is met.
- **Charts:** monochrome scale (fg at 100/60/30/12% opacity); goal line dashed `--fg-muted`.
- **Icons:** Lucide, 16 px, 1.5 stroke.
- **Accessibility:** WCAG AA contrast, visible focus rings, full keyboard navigation, `prefers-reduced-motion` honored, screen-reader labels on icon buttons and the progress bar (`role="progressbar"` with values).

---

## 9. Performance budgets

| Metric | Budget |
|---|---|
| Cold start → editable | < 800 ms (M-series Mac), < 1.5 s (mid Windows) |
| Keystroke → paint | < 16 ms on a 50k-word doc |
| Doc switch | < 100 ms for a 20k-word doc |
| Autosave | Never blocks the main thread > 4 ms |
| Installer size | < 15 MB |
| Idle CPU | ~0% (no polling; timers only while a session is active) |

Techniques: lazy-load Stats view and export libs (`docx`, Recharts) with dynamic `import()`; keep word counting debounced/idle; virtualize the sidebar if > 500 items.

---

## 10. Repository & conventions

### 10.1 Structure
```
inkwell/
├─ .github/
│  ├─ workflows/ci.yml          # lint, typecheck, unit, rust checks, build matrix (mac/win/linux)
│  ├─ workflows/release.yml     # tauri-action builds on tag
│  ├─ ISSUE_TEMPLATE/{bug,feature}.yml
│  └─ pull_request_template.md
├─ docs/
│  ├─ DESIGN_SPEC.md            # this file
│  ├─ ARCHITECTURE.md
│  └─ adr/0001-tauri-react-tiptap.md, 0002-sqlite-local-first.md, 0003-streak-rules.md
├─ src/
│  ├─ app/                      # App shell, providers, view switch
│  ├─ components/ui/            # shadcn components
│  ├─ features/{editor,library,stats,settings,export,onboarding}/
│  ├─ domain/                   # pure logic: wordCount, sessions, weeks, streak, achievements
│  ├─ lib/db/                   # repositories over tauri-plugin-sql
│  ├─ stores/                   # zustand stores
│  └─ styles/{tokens.css,globals.css,print.css}
├─ src-tauri/
│  ├─ src/{main.rs,lib.rs,menu.rs,migrations.rs,commands.rs}
│  ├─ migrations/001_init.sql
│  └─ tauri.conf.json
├─ tests/e2e/
├─ biome.json · lefthook.yml · tsconfig.json · vite.config.ts · package.json
├─ README.md · CONTRIBUTING.md · CODE_OF_CONDUCT.md · SECURITY.md · CHANGELOG.md · LICENSE (MIT)
└─ CLAUDE.md                    # agent working agreement (see 10.3)
```

### 10.2 Coding conventions
- TypeScript strict; no `any` (Biome rule); named exports; one component per file; files `kebab-case.tsx`, components `PascalCase`.
- Feature folders own their components, hooks, and store slices; cross-feature imports only via each feature's `index.ts`.
- Domain logic is pure and framework-free; React components stay thin.
- DB access only through `lib/db` repositories; no SQL in components.
- Errors: surface user-facing failures via toast; log details with `console.error` in dev (add `tauri-plugin-log` for file logs).
- Rust: `thiserror` for error types; commands return `Result<T, String>` serialized errors.
- Branches `feat/…`, `fix/…`; Conventional Commit messages; squash-merge PRs; CI must pass.

### 10.3 Agent instructions (put in `CLAUDE.md`)
- Build one milestone (§11) per PR; keep PRs small and reviewable.
- Make targeted edits; don't rewrite files wholesale or introduce new abstractions without a second concrete use.
- Unit-test everything in `src/domain/` (word count, session splitting, week bucketing incl. week-start change, streak math, achievements).
- Summarize each change in under 5 lines.

---

## 11. Milestones (build order)

| # | Milestone | Done when |
|---|---|---|
| M0 | **Scaffold** — Tauri 2 + React + Vite + TS, Tailwind v4, shadcn init, Geist, Biome, Vitest, lefthook, CI (lint/typecheck/test/clippy), README/CONTRIBUTING/LICENSE/CoC/SECURITY, ADRs | `pnpm tauri dev` opens a themed empty window; CI green |
| M1 | **Storage + library** — migrations, repositories, sidebar with folders/docs, create/rename/move/delete/trash, pinning | CRUD persists across restarts |
| M2 | **Editor** — Tiptap setup, Markdown shortcuts, bubble + slash menus, autosave, title editing, typography, fonts/width | Typing a 10k-word doc stays smooth; no data loss on quit |
| M3 | **Word count + sessions** — domain logic + tests, SessionTracker, status bar doc/selection counts | Sessions recorded correctly incl. idle and midnight splits |
| M4 | **Goals + streak** — onboarding, settings, weeks table, progress bar + streak in status bar, celebrations | Streak math passes all tests; goal hit triggers celebration |
| M5 | **Stats view** — KPI tiles, weekly chart, heatmap, sessions table, achievements grid | Matches §7.5 in both themes |
| M6 | **Focus features** — zen mode, typewriter scrolling, sentence/paragraph dimming | All toggleable via menu + shortcuts |
| M7 | **Search + ⌘K** — FTS5, command palette with docs + commands | Search across 1k docs < 50 ms |
| M8 | **Import/export** — MD import; MD/DOCX/HTML/TXT/PDF export | Round-trip MD preserves structure |
| M9 | **Polish + release** — native menu, window state, backups, a11y pass, perf budgets, release workflow producing signed-ready artifacts | Tagged build produces installers for 3 OSes |

---

## 12. Testing requirements
- **Unit (Vitest):** all `src/domain/` functions, with table-driven cases:
  - word count: English, punctuation, contractions, hyphenation, URLs, emoji, CJK, empty doc
  - sessions: idle split at exactly 10 min, midnight split, multiple docs, deletion floors at 0, paste counted
  - weeks: Monday vs Sunday start, DST transitions, week-start change mid-history (pro-rated transitional week), goal change mid-week
  - streak: in-progress week met/unmet, gaps, skipped weeks with no data, longest streak
  - achievements: idempotent unlocks, threshold boundaries
- **Component:** progress bar ARIA values, status bar rendering, stats tiles with fixture data.
- **E2E (smoke):** create folder → create doc → type → see progress update → restart app → content and stats persist; export Markdown.
- **Rust:** migrations apply cleanly on an empty DB and are idempotent.

---

## 13. Open questions / future
- **Streak freezes** (earn 1 per 4 met weeks, max 2) — deferred to v1.1; schema needs a `freezes_used` field on `weeks`.
- **Sync** — candidates: Yjs + a small relay, or SQLite-level sync (cr-sqlite / ElectricSQL). Requires accounts.
- **AI (BYO key)** — selection actions via the Claude API; would plug into the slash/bubble command registry.
- **Writing sprints** — optional timed sprints with their own target.
- **Code signing / notarization + auto-update** (`tauri-plugin-updater`) — needed before public distribution.
- **Final product name** and icon.
