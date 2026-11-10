# ADR 0002: Local-first storage in SQLite

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Inkwell is private by default: no account and no network calls. It must never lose text, must support full-text search across documents, and must record writing sessions and weekly goals for the stats view. Sync and collaboration are out of scope for v1 but must not be blocked.

## Decision

- Store everything in one SQLite database in the app data directory, accessed through `tauri-plugin-sql`.
- Run it in WAL mode with `foreign_keys = ON`.
- Define migrations in Rust (`tauri_plugin_sql::Migration`).
- Access the database only through typed repository functions in `src/lib/db`. No SQL in components.
- Store settings in a `settings` table, not in `tauri-plugin-store`, so there is one place for data.
- Use FTS5 for search.
- Prepare for sync without building it:
  - UUIDv7 primary keys (sortable, globally unique).
  - `created_at`, `updated_at` (UTC ms), and `deleted_at` (soft delete) on rows.
  - Editor content stored as Tiptap JSON, convertible to Yjs state later.
- Back up the database file daily on app start and keep the last 7 copies.

## Consequences

- Data is durable, queryable, and easy for a user to back up or inspect: it is one file.
- Queries cross the IPC boundary, so writes are debounced and hot paths batch their work.
- A future sync layer needs accounts and conflict handling. The ids, timestamps, and soft deletes are in place for it.
- Schema changes need migrations from the first release onward.

## Alternatives considered

- **Plain files (one Markdown file per document):** transparent, but weak for search, stats, and structured content.
- **IndexedDB in the webview:** no native plugin needed, but harder to back up and tied to webview storage behavior.
- **A sync-first database (cr-sqlite, ElectricSQL):** attractive later; too much complexity before sync is a requirement.
