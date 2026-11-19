//! The native menu bar. It starts from Tauri's default menu (app, Edit,
//! Window, …) and adds Inkwell's own items to File, Edit and View, plus Settings
//! (in the app menu on macOS, in File elsewhere). A chosen item is
//! sent to the frontend as a `menu` event; see `src/app/use-menu-events.ts`.
//! The View modes are check items, which the frontend keeps in step through
//! `set_menu_checks`; the Help items are handled here.

use serde::Deserialize;
use tauri::menu::{
    CheckMenuItem, IsMenuItem, Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu,
};
use tauri::{AppHandle, Emitter, Manager, State, Wry};
use tauri_plugin_log::log;
use tauri_plugin_opener::OpenerExt;

/// Ids of Inkwell's items start with this; the rest is the action sent to
/// the frontend.
const ACTION_PREFIX: &str = "action:";

const REPORT_ISSUE_ID: &str = "help:report-issue";
const SHOW_LOG_ID: &str = "help:show-log";
const REPORT_ISSUE_URL: &str = "https://github.com/smoothjerry/inkwell/issues/new/choose";
/// The log plugin names the file after the product.
const LOG_FILE_NAME: &str = "Inkwell.log";

/// The View items that show a check mark. Submenu items cannot be looked up
/// by id later, so the menu keeps them here.
pub struct MenuChecks {
    sidebar: CheckMenuItem<Wry>,
    zen: CheckMenuItem<Wry>,
    typewriter: CheckMenuItem<Wry>,
    dim_off: CheckMenuItem<Wry>,
    dim_sentence: CheckMenuItem<Wry>,
    dim_paragraph: CheckMenuItem<Wry>,
}

/// Which View modes are on, as the frontend's settings say.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuCheckState {
    sidebar: bool,
    zen: bool,
    typewriter: bool,
    /// "off", "sentence" or "paragraph".
    dim_mode: String,
}

/// Sets the View menu's check marks to match the app's modes.
#[tauri::command]
pub fn set_menu_checks(checks: State<'_, MenuChecks>, state: MenuCheckState) -> Result<(), String> {
    let pairs = [
        (&checks.sidebar, state.sidebar),
        (&checks.zen, state.zen),
        (&checks.typewriter, state.typewriter),
        (&checks.dim_off, state.dim_mode == "off"),
        (&checks.dim_sentence, state.dim_mode == "sentence"),
        (&checks.dim_paragraph, state.dim_mode == "paragraph"),
    ];
    for (item, checked) in pairs {
        item.set_checked(checked)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

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

    let check = |action: &str, label: &str, accelerator: Option<&str>| {
        CheckMenuItem::with_id(
            app,
            format!("{ACTION_PREFIX}{action}"),
            label,
            true,
            false,
            accelerator,
        )
    };

    let palette = item("palette", "Command Palette…", Some("CmdOrCtrl+K"))?;
    let stats = item("stats", "Stats", Some("CmdOrCtrl+Shift+S"))?;
    let sidebar = check("sidebar", "Show Sidebar", Some("CmdOrCtrl+Backslash"))?;
    let zen = check("zen", "Zen Mode", Some("CmdOrCtrl+Shift+F"))?;
    let typewriter = check(
        "typewriter",
        "Typewriter Scrolling",
        Some("CmdOrCtrl+Shift+T"),
    )?;
    let dim_off = check("dim-off", "Off", None)?;
    let dim_sentence = check("dim-sentence", "Sentence", None)?;
    let dim_paragraph = check("dim-paragraph", "Paragraph", None)?;
    let dimming = Submenu::with_items(
        app,
        "Dimming",
        true,
        &[
            &dim_off,
            &dim_sentence,
            &dim_paragraph,
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

    let report_issue =
        MenuItem::with_id(app, REPORT_ISSUE_ID, "Report an Issue…", true, None::<&str>)?;
    let show_log = MenuItem::with_id(app, SHOW_LOG_ID, "Show Log File", true, None::<&str>)?;
    match find_submenu(&menu, "Help")? {
        Some(help) => {
            // Elsewhere than macOS, Help already holds About.
            if !is_macos {
                help.append(&PredefinedMenuItem::separator(app)?)?;
            }
            help.append_items(&[&report_issue, &show_log])?;
        }
        None => menu.append(&Submenu::with_items(
            app,
            "Help",
            true,
            &[&report_issue, &show_log],
        )?)?,
    }

    app.manage(MenuChecks {
        sidebar,
        zen,
        typewriter,
        dim_off,
        dim_sentence,
        dim_paragraph,
    });

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

/// Handles the Help items and forwards Inkwell's other items to the frontend.
pub fn handle_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        REPORT_ISSUE_ID => {
            if let Err(error) = app.opener().open_url(REPORT_ISSUE_URL, None::<&str>) {
                log::warn!("Could not open the issue page: {error}");
            }
        }
        SHOW_LOG_ID => show_log_file(app),
        id => {
            if let Some(action) = id.strip_prefix(ACTION_PREFIX) {
                // Nothing useful can be done if the window is already gone.
                let _ = app.emit("menu", action);
            }
        }
    }
}

/// Shows the log file in the system's file manager, or its folder when no
/// warning or error has been written yet.
fn show_log_file(app: &AppHandle) {
    let result = app
        .path()
        .app_log_dir()
        .map_err(|error| error.to_string())
        .and_then(|dir| {
            let file = dir.join(LOG_FILE_NAME);
            let shown = if file.exists() {
                app.opener().reveal_item_in_dir(file)
            } else {
                std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
                app.opener().open_path(dir.to_string_lossy(), None::<&str>)
            };
            shown.map_err(|error| error.to_string())
        });
    if let Err(error) = result {
        log::warn!("Could not show the log file: {error}");
    }
}
