//! Inkwell's native shell. Product logic lives in TypeScript; keep this thin.

mod migrations;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(migrations::DB_URL, migrations::migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Inkwell");
}
