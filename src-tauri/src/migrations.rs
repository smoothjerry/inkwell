//! SQL migrations, applied by `tauri-plugin-sql` when the database is loaded.

use tauri_plugin_sql::{Migration, MigrationKind};

/// Connection string shared with the frontend (`src/lib/db/client.ts`).
/// Debug builds (`pnpm tauri dev`) use their own file, so testing never
/// touches the writing in an installed release build.
pub const DB_URL: &str = if cfg!(debug_assertions) {
    "sqlite:inkwell-dev.db"
} else {
    "sqlite:inkwell.db"
};

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "books",
            sql: include_str!("../migrations/002_books.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
