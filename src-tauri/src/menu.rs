//! The native menu bar. It starts from Tauri's default menu (app, Edit,
//! Window, …) and adds Inkwell's View items. A chosen item is sent to the
//! frontend as a `menu` event; see `src/app/use-menu-events.ts`.

use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Wry};

/// Menu item ids start with this; the rest is the action sent to the frontend.
const VIEW_PREFIX: &str = "view:";

pub fn build(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let menu = Menu::default(app)?;

    let item = |action: &str, label: &str, accelerator: Option<&str>| {
        MenuItem::with_id(
            app,
            format!("{VIEW_PREFIX}{action}"),
            label,
            true,
            accelerator,
        )
    };

    let palette = item("palette", "Command Palette…", Some("CmdOrCtrl+K"))?;
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

    // Add to the default View menu where there is one (macOS); otherwise
    // create it.
    let existing_view = menu.items()?.into_iter().find_map(|kind| match kind {
        MenuItemKind::Submenu(submenu) if submenu.text().is_ok_and(|text| text == "View") => {
            Some(submenu)
        }
        _ => None,
    });
    match existing_view {
        Some(view) => {
            let separator = PredefinedMenuItem::separator(app)?;
            let palette_separator = PredefinedMenuItem::separator(app)?;
            view.insert_items(
                &[
                    &palette,
                    &palette_separator,
                    &zen,
                    &typewriter,
                    &dimming,
                    &separator,
                ],
                0,
            )?;
        }
        None => {
            let view =
                Submenu::with_items(app, "View", true, &[&palette, &zen, &typewriter, &dimming])?;
            menu.append(&view)?;
        }
    }

    Ok(menu)
}

/// Forwards Inkwell's own menu items to the frontend.
pub fn handle_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    if let Some(action) = event.id().as_ref().strip_prefix(VIEW_PREFIX) {
        // Nothing useful can be done if the window is already gone.
        let _ = app.emit("menu", action);
    }
}
