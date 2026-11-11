//! SQL migrations, applied by `tauri-plugin-sql` when the database is loaded.

use tauri_plugin_sql::{Migration, MigrationKind};

/// Connection string shared with the frontend (`src/lib/db/client.ts`).
pub const DB_URL: &str = "sqlite:inkwell.db";

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }]
}
