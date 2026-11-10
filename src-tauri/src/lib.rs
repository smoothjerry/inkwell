//! Inkwell's native shell. Product logic lives in TypeScript; keep this thin.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Inkwell");
}
