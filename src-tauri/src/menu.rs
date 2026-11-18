//! The native menu bar. It starts from Tauri's default menu (app, Edit,
//! Window, …) and adds Inkwell's own items to File, Edit and View, plus Settings
//! (in the app menu on macOS, in File elsewhere). A chosen item is
//! sent to the frontend as a `menu` event; see `src/app/use-menu-events.ts`.

use tauri::menu::{IsMenuItem, Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Wry};

/// Ids of Inkwell's items start with this; the rest is the action sent to
/// the frontend.
const ACTION_PREFIX: &str = "action:";

pub fn build(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let menu = Menu::default(app)?;

    let item = |action: &str, label: &str, accelerator: Option<&str>| {
        MenuItem::with_id(
            app,
            format!("{ACTION_PREFIX}{action}"),
            label,
            true,
            accelerator,
        )
    };

    let new_document = item("new-document", "New Document", Some("CmdOrCtrl+N"))?;
    let new_folder = item("new-folder", "New Folder", Some("CmdOrCtrl+Shift+N"))?;
    let new_separator = PredefinedMenuItem::separator(app)?;
    let import = item("import", "Import Markdown…", None)?;
    let export = item("export", "Export…", Some("CmdOrCtrl+Shift+E"))?;
    let file_separator = PredefinedMenuItem::separator(app)?;
    // Settings sits in the app menu on macOS and in File elsewhere.
    let settings = item("settings", "Settings…", Some("CmdOrCtrl+Comma"))?;
    let is_macos = cfg!(target_os = "macos");

    let mut file_items: Vec<&dyn IsMenuItem<Wry>> =
        vec![&new_document, &new_folder, &new_separator, &import, &export];
    if !is_macos {
        file_items.push(&settings);
    }
    let file_items_if_new = file_items.clone();
    file_items.push(&file_separator);
    add_to_submenu(app, &menu, "File", &file_items, &file_items_if_new)?;

    if is_macos {
        // The default macOS app menu starts with About; Settings follows it.
        if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
            app_menu.insert_items(&[&PredefinedMenuItem::separator(app)?, &settings], 1)?;
        }
    }

    let palette = item("palette", "Command Palette…", Some("CmdOrCtrl+K"))?;
    let stats = item("stats", "Stats", Some("CmdOrCtrl+Shift+S"))?;
    let sidebar = item("sidebar", "Toggle Sidebar", Some("CmdOrCtrl+Backslash"))?;
    let zen = item("zen", "Zen Mode", Some("CmdOrCtrl+Shift+F"))?;
    let typewriter = item(
        "typewriter",
        "Typewriter Scrolling",
        Some("CmdOrCtrl+Shift+T"),
    )?;
    let dimming = Submenu::with_items(
        app,
        "Dimming",
        true,
        &[
            &item("dim-off", "Off", None)?,
            &item("dim-sentence", "Sentence", None)?,
            &item("dim-paragraph", "Paragraph", None)?,
            &PredefinedMenuItem::separator(app)?,
            &item("dim-cycle", "Next Mode", Some("CmdOrCtrl+Shift+D"))?,
        ],
    )?;
    let palette_separator = PredefinedMenuItem::separator(app)?;
    let view_separator = PredefinedMenuItem::separator(app)?;
    add_to_submenu(
        app,
        &menu,
        "View",
        &[
            &palette,
            &stats,
            &palette_separator,
            &sidebar,
            &zen,
            &typewriter,
            &dimming,
            &view_separator,
        ],
        &[&palette, &stats, &sidebar, &zen, &typewriter, &dimming],
    )?;

    // Find goes at the bottom of Edit, after the clipboard items.
    let find = item("find", "Find…", Some("CmdOrCtrl+F"))?;
    match find_submenu(&menu, "Edit")? {
        Some(edit) => {
            edit.append(&PredefinedMenuItem::separator(app)?)?;
            edit.append(&find)?;
        }
        None => menu.append(&Submenu::with_items(app, "Edit", true, &[&find])?)?,
    }

    Ok(menu)
}

/// Puts `items` at the top of the default menu's submenu called `title`.
/// Where the platform's default menu has no such submenu, a new one is added
/// holding `items_if_new` (the same items without the trailing separator).
fn add_to_submenu(
    app: &AppHandle,
    menu: &Menu<Wry>,
    title: &str,
    items: &[&dyn IsMenuItem<Wry>],
    items_if_new: &[&dyn IsMenuItem<Wry>],
) -> tauri::Result<()> {
    match find_submenu(menu, title)? {
        Some(submenu) => submenu.insert_items(items, 0),
        None => menu.append(&Submenu::with_items(app, title, true, items_if_new)?),
    }
}

/// The default menu's submenu called `title`, if the platform has one.
fn find_submenu(menu: &Menu<Wry>, title: &str) -> tauri::Result<Option<Submenu<Wry>>> {
    Ok(menu.items()?.into_iter().find_map(|kind| match kind {
        MenuItemKind::Submenu(submenu) if submenu.text().is_ok_and(|text| text == title) => {
            Some(submenu)
        }
        _ => None,
    }))
}

/// Forwards Inkwell's own menu items to the frontend.
pub fn handle_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    if let Some(action) = event.id().as_ref().strip_prefix(ACTION_PREFIX) {
        // Nothing useful can be done if the window is already gone.
        let _ = app.emit("menu", action);
    }
}
