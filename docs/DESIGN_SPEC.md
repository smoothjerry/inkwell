# Inkwell — Design Spec (v1)

> **Working name:** "Inkwell" is a placeholder. Find/replace `Inkwell` / `inkwell` before the first commit if you rename it.
> **Audience:** This document is the build brief for an AI coding session (Fable). It is prescriptive where decisions were made and marks open items explicitly.
> **Status:** Draft v1.4 · 2026-11-23. M0–M9 are built. v1.4 adds an in-app notice when a newer build of Inkwell has been installed, with Relaunch (§7.12), to be built as M9.6 (§11). v1.3 adds a formatting toolbar, richer formatting, and a bundled font library (§7.11), to be built as M9.5 (§11.2) before M10. v1.2 added books, print formats, page counts, and a paged view (§7.9, §7.10), to be built as M10 (§11.3). v1.1 moved the features that earlier milestones specified but did not deliver into M9 (§11.1), added single-item permanent delete (§7.2), and recorded the focus shortcuts added in M6 (§7.7).

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
- No user-editable page layout (custom margins, headers/footers, manual page breaks) and no track changes. The fixed print formats of books (§7.9, §7.10) are the one exception: they show where pages fall, but the writer does not design the page.
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
| Books | **A folder can be marked as a book**; its documents, in manual order, are its chapters | Long-form work already lives in folders; no new container to learn. |
| Print formats | **Chosen per book** from fixed presets (trade, mass-market, hardcover, manuscript, …) | One book is one format; writers compare formats without designing pages. |
| Paged view | **Editable**, set in the book's format typography | What you see is how the printed book breaks, and you can keep writing in it. |
| Page counts | **One pagination engine** for counts and the paged view; shown as estimates (≈) | The count always matches the pages on screen; real typesetting still differs. |
| Toolbar | **Optional formatting toolbar** (View ▸ Show Toolbar), alongside the bubble and slash menus | Word-processor controls for those who want them, without forcing chrome on those who don't. |
| Fonts | **Bundled library of ~20 open-licence fonts**; no system or downloaded fonts | Same look on every machine and no network calls (§1.1). |
| Font scope | **Per document, with per-selection overrides** | A document reads as one design; a word or passage can still differ. |
| Rich formatting | **Underline, alignment, indent, highlight, text colour, per-selection font and size** | Expected of a word processor; Markdown export drops what it cannot express, and says so. |
| Updates | **The app notices when a newer build is installed and offers Relaunch**; downloading updates comes later (§13) | A rebuild or reinstall otherwise goes unnoticed until the app is restarted. One notice serves both, so the downloader only adds a source. |

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

**Settings keys:** `theme` (`system|light|dark`), `weeklyGoal` (default 2500), `dailyTarget` (default null), `weekStartsOn` (default 1), `editorFont` (a font id from §7.11, default `geist`; the font of documents that have not chosen one — from M9.5, older values map `sans` → `geist`, `serif` → `newsreader`, `mono` → `geist-mono`), `editorWidth` (`narrow|medium|wide`), `showToolbar` (bool, default true), `typewriterMode`, `dimMode` (`off|sentence|paragraph`), `celebrations` (bool), `sessionIdleMinutes` (default 10), `pagedView` (bool, default false), `defaultBookFormat` (a format id from §7.9, default `trade-6x9`).

```sql
-- 002_books.sql (M10)
-- A folder is a book when book_format is set to a format id from §7.9.
ALTER TABLE folders ADD COLUMN book_format TEXT;
```

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
- Pin docs; Trash (soft delete, restore, delete one item permanently after confirmation, empty, 30-day auto purge).
- Sort: manual (default), updated, title.
- Full-text search via FTS5 in the ⌘K palette (docs + commands).

### 7.3 Editor
- Blocks: paragraph, H1–H3, bullet/ordered/task lists, blockquote, code block, horizontal rule, link, bold/italic/strike/inline code.
- Markdown input rules (`# `, `- `, `1. `, `> `, ``` ``` ```, `**x**`, `_x_`, `---`).
- Bubble menu on selection (bold, italic, link, H1/H2, quote). An optional formatting toolbar (§7.11) offers the same and more.
- Slash menu (`/`) for block insertion.
- Smart typography (curly quotes, em dashes, ellipses).
- Fonts from the bundled library (§7.11), per document and per selection, and a width setting.
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
| Typewriter scrolling | ⌘⇧T |
| Next dimming mode (off → sentence → paragraph) | ⌘⇧D |
| Stats / Settings | ⌘⇧S / ⌘, |
| Export | ⌘⇧E |
| Find in doc | ⌘F |
| Paged view | ⌘⇧P |
| Show toolbar | ⌘⌥T |
| Underline / highlight | ⌘U / ⌘⇧H |
| Align left / centre / right / justify | ⌘{ / ⌘\| / ⌘} / ⌘⌥\| |
| Indent / outdent | ⌘] / ⌘[ |
| Bigger / smaller text (selection) | ⌘⇧. / ⌘⇧, |
(Use Ctrl on Windows/Linux. Register via the native menu so they show in the menu bar.)

### 7.8 Onboarding
First launch: a 2-step modal — (1) pick weekly goal (presets), optional daily target, week start; (2) theme. Then open a "Welcome" doc explaining Markdown shortcuts and streak rules.

### 7.9 Books, print formats, and page counts

**Books.**
- A folder becomes a book when it is given a print format: folder context menu ▸ **Book Format** ▸ a format, with **Not a Book** at the top to undo it. A book's sidebar row shows a book icon instead of a folder icon.
- The book's **chapters** are its documents in reading order: a depth-first walk of the folder in manual `sort_order`, where subfolders act as parts. The sidebar's sort mode does not change reading order. Trashed documents are left out.
- A book cannot contain another book. Marking a folder as a book is unavailable if an ancestor or descendant is already a book, and Move to and drag-and-drop refuse a move that would nest one book inside another.
- A document outside any book uses the `defaultBookFormat` setting (Settings ▸ Editor) for its page count and the paged view.

**Print formats.** Fixed presets, defined as data in `src/domain/book-formats.ts`. All use Newsreader, the bundled serif. Margins are the same on both sides in v1; there is no mirrored inside/outside margin. The type sizes are starting values, to be tuned by comparing with real books.

| Id | Name | Trim | Margins (top, bottom, sides) | Type size / line height |
|---|---|---|---|---|
| `mass-market` | Mass-market paperback | 4.25 × 6.87 in | 0.5, 0.6, 0.5 in | 10 / 12.5 pt |
| `trade-5.5x8.5` | Trade paperback 5.5 × 8.5 | 5.5 × 8.5 in | 0.75, 0.75, 0.625 in | 11 / 14 pt |
| `trade-6x9` | Trade paperback 6 × 9 | 6 × 9 in | 0.75, 0.75, 0.75 in | 11.5 / 15 pt |
| `hardcover-6.14x9.21` | Hardcover 6.14 × 9.21 | 6.14 × 9.21 in | 0.75, 0.75, 0.75 in | 11.5 / 15 pt |
| `uk-b-format` | UK B-format paperback | 129 × 198 mm | 15, 17, 14 mm | 10.5 / 13.5 pt |
| `a5` | A5 | 148 × 210 mm | 18, 20, 16 mm | 11 / 14 pt |
| `manuscript` | Standard manuscript | 8.5 × 11 in | 1, 1, 1 in | 12 / 24 pt (double-spaced) |

**Page counts.**
- The status bar shows the current book's count in its format, for example `≈ 312 pages`, and the open chapter's page range, for example `pp. 41–52`. Outside a book it shows the document's own count in the default format.
- **Page Counts…** (book context menu and command palette) opens a dialog listing the book and the open chapter in every format, so formats can be compared.
- Counts are estimates and always shown with ≈. A tooltip says why: front matter, chapter openings, hyphenation, and the typesetter's choices all change a printed book's length.

**Pagination engine.** One engine, in `src/features/pages/`, serves both the counts and the paged view (§7.10), so a count always matches the pages on screen.
- Input: a document and a format. Output: the page breaks, as positions in the document, and the page count.
- Rules: each chapter starts on a new page. Headings stay with the paragraph after them. A paragraph leaves at least two lines at the bottom of a page and carries at least two to the next (widow and orphan control).
- Suggested technique, to be proven by a prototype first: lay a hidden copy of the document out in the format's typography inside a box of the page's text-block size, using CSS multi-column so that the browser breaks it into columns; each column is a page. Map the first line of each column back to a document position.
- Results are cached per document, format, and `updated_at`, and computed off the keystroke path (§9).

### 7.10 Paged view
- **Toggle:** View ▸ **Paged View** (a check item) and ⌘⇧P. The `pagedView` setting persists. Pageless stays the default.
- **Pages:** the document is shown as page sheets of the format's trim size, stacked vertically with a gap between them, at 96 CSS px per inch, scaled down to fit narrow windows. Sheets use the theme's background with a hairline border, not white paper, so the dark theme stays dark.
- **Typography:** the format's font, size, line height, and text-block width replace the editor width setting, the document's font and size (§7.11), and any per-selection font or size while paged; page counts ignore them too. Bold, italic, underline, highlight, colour, alignment, and indents still show. Headings keep their relative sizes.
- **Page breaks:** the engine's breaks are drawn as non-editable gaps (ProseMirror widget decorations) placed at the start of each page's first line, so the text before them does not reflow. The caret and arrow keys pass over a gap as over a line break; copying text does not include it.
- **Page numbers:** at the foot of each sheet. In a book they continue from the previous chapters, so chapter 3 starts after the last page of chapter 2.
- **Editing:** everything works as in pageless: typing, menus, find, autosave, sessions. After an edit, pages are recomputed once typing pauses, starting from the edited page.
- **Other modes:** zen mode, typewriter scrolling, and dimming work in the paged view.
- **Accessibility:** gaps and page numbers are hidden from screen readers; the current page number is in the status bar as `Page 41 of ≈ 312`.

### 7.11 Formatting toolbar, rich formatting, and fonts

**Toolbar.**
- A 36 px bar between the title bar and the document, in the status bar's style: ghost icon buttons, a hairline bottom border, no fill. View ▸ **Show Toolbar** (a check item) and ⌘⌥T toggle it; the `showToolbar` setting persists, and it is on by default. It is hidden in zen mode and in the Stats and Settings views.
- Groups, left to right: undo and redo · paragraph style (Body, Heading 1–3, Quote, Code) · font · size · bold, italic, underline, strikethrough · text colour, highlight · link · alignment (left, centre, right, justify) · bullet, numbered, and task list · outdent, indent.
- Buttons show the selection's state (`aria-pressed`). When the selection mixes values, the font and size pickers are blank.
- When the window is too narrow, the groups that do not fit move into a ⋯ overflow menu, from the right.
- The toolbar is one tab stop with arrow-key navigation between controls (`role="toolbar"`, roving tabindex), and Esc returns focus to the document.
- A native **Format** menu lists the same commands with their shortcuts (§7.7).

**Rich formatting.**
- **Underline:** StarterKit's underline mark, now enabled. ⌘U.
- **Alignment:** left (default), centre, right, justify, on paragraphs and headings.
- **Indent:** in a list, indent and outdent nest the item (as Tab and Shift+Tab already do). On a paragraph they set a block indent of 0–5 steps of 0.5 in.
- **Text colour and highlight:** chosen from small named palettes, stored by name (for example `red`, `yellow`) and drawn from theme tokens, so each reads well in both themes. Text colour: default plus 8; highlight: none plus 5.
- **Per-selection font and size:** a font from the library and a size in points (8–72) on any run of text, as text-style marks. ⌘⇧. and ⌘⇧, step the size up and down. Applying a document's own font or size to a selection removes the mark rather than adding one.

**Document style.**
- Each document has its own font, size (default 13 pt, today's 17 px body size), and line spacing (1.0, 1.15, 1.5, 2.0; default 1.5), set in Format ▸ **Document Style…** and with the toolbar's pickers when nothing is selected.
- They are stored as attributes of the document node in the Tiptap JSON, so they travel with the content, export with it, and changing them can be undone.
- A document that has not chosen a font uses the `editorFont` setting. Settings ▸ Editor keeps that choice and now lists the whole library.
- Per-selection marks win over the document style, which wins over the setting. This resolution is a pure, tested function in `src/domain/`.

**Font library.**
- About 20 fonts under the SIL Open Font License, bundled through `@fontsource` packages (variable versions where available), with Latin and Latin Extended subsets, upright and italic. No font is downloaded at run time, and no system fonts are listed.
- `@font-face` rules load a font only when it is first used, so the library does not slow cold start. The font picker shows each name in its own face.
- Starting list, grouped as in the picker:

  | Group | Fonts |
  |---|---|
  | Serif | Newsreader, EB Garamond, Libre Baskerville, Crimson Pro, Literata, Lora, Source Serif 4, Cormorant Garamond |
  | Sans | Geist, Inter, IBM Plex Sans, Work Sans, Atkinson Hyperlegible |
  | Mono | Geist Mono, JetBrains Mono, IBM Plex Mono |
  | Typewriter | Courier Prime, Cutive Mono |
  | Handwriting | Caveat, Patrick Hand |

- Each font's licence is checked when it is added and listed in `docs/FONTS.md`. A font id that is no longer in the library falls back to the document's font, then to `editorFont`.
- The library is defined as data in `src/domain/fonts.ts`: id, display name, group, CSS family, and generic fallback.

**Export.**
- **PDF** (printed from the app) keeps everything, with the bundled fonts.
- **DOCX** keeps underline, alignment, indents, colour, highlight, fonts, and sizes. Fonts are named, not embedded, so Word substitutes any font that is not installed.
- **HTML** keeps them as inline styles, naming the font with a generic fallback.
- **Markdown** keeps text and structure only. The export dialog says that underline, alignment, indents, colour, highlight, fonts, and sizes are left out.
- Markdown import is unchanged.

**Not in scope:** fonts installed on the computer, fonts added by the user, custom colours, line spacing on a selection, and fonts in book formats (books keep Newsreader, §7.9).

### 7.12 Update notice

When a newer build of Inkwell replaces the one that is running, the app says so and offers to restart into it. On macOS the running app keeps its old code until it is restarted, so without a notice a rebuild (for example the post-pull rebuild of a source checkout) or a reinstall goes unseen.

**Detecting a new build.**
- At launch, Rust records the identity of the app's own executable on disk: its file id (inode) and modification time.
- The `installed_update` command compares that record with the executable now at the same path and returns whether it has been replaced. A missing or unreadable file counts as not replaced.
- The frontend calls it when the window regains focus, and at no other time. There is no polling (§9 idle CPU), and no network access.
- On Windows a running executable cannot be replaced, so the check is a no-op there.

**The notice.**
- A persistent toast at the bottom right: "Inkwell has been updated." with a **Relaunch** button and a close button. It stays until one of them is used.
- It appears once per new build: closing it hides it until a further build is installed. Relaunch stays available from the command palette (⌘K, "Relaunch to Update") while an update is waiting.
- In zen mode the notice waits until zen mode ends.
- Settings ▸ Updates says whether a newer build is waiting, with **Relaunch** while one is and **Check Now** otherwise, so an update is still reachable after the notice is closed. Check Now runs the same check once, when clicked; it is not polling.

**Relaunch.**
- Relaunch first runs the same flush as quitting (pending autosave, open session), then restarts the app with Tauri's built-in `AppHandle::restart()` (no process plugin is needed), which starts the executable now at the app's path: the new build.
- If the flush fails, the app does not restart and shows the usual save-error toast.

**Later.** When auto-update arrives (§13), a downloaded update uses the same notice, with "Restart to Update" for an update that is installed on restart.

**Not in scope:** checking for, downloading, or installing updates; release notes; anything that needs the network.

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
| Installer size | < 15 MB (including the font library, §7.11) |
| Idle CPU | ~0% (no polling; timers only while a session is active; the update check (§7.12) runs only on window focus) |
| Keystroke → paint, paged view | < 16 ms on a 50k-word doc; re-pagination never runs on the keystroke path |
| Re-pagination after an edit | Pages correct within 500 ms of typing pausing, on a 50k-word doc |
| Full pagination (count or first paged view) | 50k words in < 1 s, in idle chunks; no task over 50 ms |

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
| M9 | **Completion + release** — features carried over from M1–M8, then native menu, window state, backups, a11y pass, perf budgets, release workflow producing signed-ready artifacts. Full list in §11.1 | Every §11.1 item meets its "done when"; a tagged build produces installers for 3 OSes |
| M9.5 | **Formatting and fonts** — formatting toolbar, rich formatting, document style, bundled font library. Full list in §11.2 | Every §11.2 item meets its "done when" |
| M9.6 | **Update notice** — §7.12, one PR; it does not depend on M9.5 and can be built before or after it | A replaced executable is reported on the next window focus; the notice appears once per new build; Relaunch saves pending work and starts the new build; a Rust test covers replaced, unchanged, and missing executables |
| M10 | **Books and paged view** — books as folders, print formats, page counts, editable paged view. Full list in §11.3 | Every §11.3 item meets its "done when" |

### 11.1 M9 scope

M9 has two parts. Part A finishes features that earlier milestones specified but did not deliver. Part B is the original polish and release work. Build Part A first, so that the accessibility pass and performance checks in Part B cover the finished app. Each row is small enough for its own PR.

**Part A: carried over from M1–M8**

| Item | From | Done when |
|---|---|---|
| Collapsible sidebar | §7.1 | ⌘\ hides and shows the sidebar; the state persists across restarts |
| Resizable sidebar | §7.1 | Dragging the sidebar's edge resizes it between 200 and 400 px; the width persists |
| Keyboard shortcuts | §7.7 | Every shortcut in §7.7 works and appears next to its item in the native menu |
| Find in document | §7.7 | ⌘F opens a find bar over the editor that highlights every match, steps through them with Enter and ⇧Enter, shows "3 of 12", and closes with Esc |
| Drag-and-drop | §7.2 | Documents and folders can be dragged to reorder and to move into another folder (dnd-kit); a folder cannot be dropped into itself or a descendant; order persists through `sort_order` |
| Sort modes | §7.2 | The sidebar offers manual (default), last updated, and title order; the choice persists |
| Delete one item permanently | §7.2 (added in v1.1) | A trashed document or folder can be deleted on its own after a confirmation that says it cannot be undone |
| Word-count cache | §6.1 | Documents over 20k words reuse per-top-level-node counts and recount only changed nodes; counting a one-word edit in a 50k-word doc stays within the §9 keystroke budget |
| File logging | §10.2 | `tauri-plugin-log` writes warnings and errors to a log file in the app's log directory |
| Repository templates | §10.1 | `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/feature.yml`, and `.github/pull_request_template.md` exist |

**Part B: polish and release**

| Item | From | Done when |
|---|---|---|
| Native menu | §7.7 | The app, File, Edit, View, Window, and Help menus are complete on macOS, with equivalents on Windows and Linux; View items show a check mark when their mode is on |
| Window state | §3 | `tauri-plugin-window-state` restores the window's size and position |
| Backups | §4.3 | On start, if the newest backup is over 24 h old, the database is copied to `backups/inkwell-YYYYMMDD.db`; only the newest 7 are kept |
| Accessibility pass | §8 | Every control has an accessible name; focus is visible everywhere; the sidebar, palette, menus, and dialogs work by keyboard alone; text meets WCAG AA in both themes |
| Performance budgets | §9 | Each §9 budget is measured and recorded in `docs/ARCHITECTURE.md`; any budget missed has a fix or a written reason. The editor, Stats, and export code load in separate chunks |
| Release workflow | §10.1 | `release.yml` runs on a version tag and uses `tauri-action` to build unsigned installers for macOS, Windows, and Linux |

Out of scope for M9: the component, end-to-end, and Rust migration tests listed in §12 have not been written; `tests/e2e/` arrives with the end-to-end test. Code signing, notarization, and auto-update stay in §13.

### 11.2 M9.5 scope

Build before M10, in this order; each row is its own PR.

| Item | From | Done when |
|---|---|---|
| Font library | §7.11 | The fonts are bundled and defined in `src/domain/fonts.ts`; their licences are in `docs/FONTS.md`; Settings ▸ Editor lists them all, with old `editorFont` values mapped; the installer is measured and still under 15 MB; cold start is unchanged |
| Document style | §7.11 | Format ▸ Document Style… sets a document's font, size, and line spacing; they persist in the document JSON and can be undone; the resolution order is a tested function in `src/domain/` |
| Rich formatting | §7.11, §7.7 | Underline, alignment, indent, text colour, highlight, and per-selection font and size work from the native Format menu and their shortcuts, survive a restart, and read well in both themes |
| Formatting toolbar | §7.11 | ⌘⌥T and View ▸ Show Toolbar toggle it; every control works and shows the selection's state; it overflows into ⋯ when narrow; it works by keyboard alone |
| Export of formatting | §7.11 | DOCX, HTML, and PDF keep the new formatting; the export dialog says what Markdown leaves out; the export converters have tests for each new mark and attribute |

### 11.3 M10 scope

Build in this order; each row is its own PR. Prototype the pagination engine before the rows that depend on it, and stop to revise this section if the prototype cannot meet §9.

| Item | From | Done when |
|---|---|---|
| Print formats | §7.9 | `src/domain/book-formats.ts` defines the presets and the text-block size of each, with unit tests |
| Books in the library | §7.9, §5 | Migration `002_books.sql` applies; a folder can be marked as a book and unmarked from its context menu; book rows show a book icon; nesting a book inside a book is refused by the menu, Move to, and drag-and-drop; reading order is a pure, tested function in `src/domain/` |
| Pagination engine | §7.9 | Given a document and a format, returns page breaks and a count following the §7.9 rules; meets the full-pagination budget in §9; results are cached |
| Page counts | §7.9 | The status bar shows the book's count and the chapter's page range; the Page Counts dialog lists every format; `defaultBookFormat` is in Settings |
| Paged view | §7.10 | ⌘⇧P and the View menu toggle sheets in the format's typography with page gaps and page numbers that continue across a book; editing, find, zen, typewriter, and dimming work; the paged-view budgets in §9 are measured and recorded |

Out of scope for M10: book typography (chapters starting on a right-hand page, drop caps, running heads, front matter) and exporting a book as a print-ready PDF in its format. Both are in §13.

---

## 12. Testing requirements
- **Unit (Vitest):** all `src/domain/` functions, with table-driven cases:
  - word count: English, punctuation, contractions, hyphenation, URLs, emoji, CJK, empty doc
  - sessions: idle split at exactly 10 min, midnight split, multiple docs, deletion floors at 0, paste counted
  - weeks: Monday vs Sunday start, DST transitions, week-start change mid-history (pro-rated transitional week), goal change mid-week
  - streak: in-progress week met/unmet, gaps, skipped weeks with no data, longest streak
  - achievements: idempotent unlocks, threshold boundaries
  - fonts: unique ids, every group non-empty, an unknown id falling back; style resolution: selection mark over document style over the `editorFont` setting
  - book formats: text-block size of each preset, inch and millimetre units
  - reading order: nested subfolders, manual order regardless of sidebar sort, trashed documents left out, a book refusing a nested book
- **Component:** progress bar ARIA values, status bar rendering, stats tiles with fixture data.
- **E2E (smoke):** create folder → create doc → type → see progress update → restart app → content and stats persist; export Markdown.
- **Rust:** migrations apply cleanly on an empty DB and are idempotent; the update check (§7.12) reports a replaced file and ignores an unchanged or missing one.

---

## 13. Open questions / future
- **Streak freezes** (earn 1 per 4 met weeks, max 2) — deferred to v1.1; schema needs a `freezes_used` field on `weeks`.
- **Sync** — candidates: Yjs + a small relay, or SQLite-level sync (cr-sqlite / ElectricSQL). Requires accounts.
- **AI (BYO key)** — selection actions via the Claude API; would plug into the slash/bubble command registry.
- **Writing sprints** — optional timed sprints with their own target.
- **Code signing / notarization + auto-update** (`tauri-plugin-updater`) — needed before public distribution. Auto-update checks GitHub Releases for a signed newer version, downloads it, and shows it through the update notice (§7.12). It needs a signing key for update files, `latest.json` from the release workflow, and macOS notarization.
- **Final product name** and icon.
- **Book typography** — chapters starting on a right-hand page, scene-break ornaments, drop caps, running heads, mirrored margins, and front matter (title page, copyright, contents). Each changes page counts, so the pagination engine (§7.9) must take them in.
- **Print-ready PDF of a book** — export a whole book in its format, with its page breaks, for print-on-demand services.
