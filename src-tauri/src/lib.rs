//! Inkwell's native shell. Product logic lives in TypeScript; keep this thin.

mod menu;
mod migrations;

use tauri_plugin_log::{log::LevelFilter, RotationStrategy, Target, TargetKind};

/// Largest a log file gets before it is rotated, in bytes.
const MAX_LOG_BYTES: u128 = 1_000_000;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Warnings and errors, from Rust and from the webview (DESIGN_SPEC
        // §10.2), go to the terminal and to a file in the app's log folder.
        // The current file and the one before it are kept.
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .level(LevelFilter::Warn)
                .max_file_size(MAX_LOG_BYTES)
                .rotation_strategy(RotationStrategy::KeepSome(2))
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(migrations::DB_URL, migrations::migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .menu(menu::build)
        .on_menu_event(menu::handle_event)
        .run(tauri::generate_context!())
        .expect("error while running Inkwell");
}
