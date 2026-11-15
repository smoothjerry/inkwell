//! Inkwell's native shell. Product logic lives in TypeScript; keep this thin.

mod menu;
mod migrations;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(migrations::DB_URL, migrations::migrations())
                .build(),
        )
        .menu(menu::build)
        .on_menu_event(menu::handle_event)
        .run(tauri::generate_context!())
        .expect("error while running Inkwell");
}
