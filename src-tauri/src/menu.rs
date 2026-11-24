//! The native menu bar. It starts from Tauri's default menu (app, Edit,
//! Window, …) and adds Inkwell's own items to File, Edit and View, a Format
//! menu, and Settings (in the app menu on macOS, in File elsewhere). A chosen
//! item is sent to the frontend as a `menu` event; see `src/app/use-menu-events.ts`.
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

/// Text colours and highlights by stored name, as in
/// `src/domain/rich-formatting.ts`. `src/app/format-menu.test.ts` checks
/// that these lists match it.
const TEXT_COLORS: [(&str, &str); 8] = [
    ("red", "Red"),
    ("orange", "Orange"),
    ("yellow", "Yellow"),
    ("green", "Green"),
    ("blue", "Blue"),
    ("purple", "Purple"),
    ("pink", "Pink"),
    ("gray", "Gray"),
];
const HIGHLIGHTS: [(&str, &str); 5] = [
    ("yellow", "Yellow"),
    ("green", "Green"),
    ("blue", "Blue"),
    ("pink", "Pink"),
    ("purple", "Purple"),
];

/// The font library by group, as in `src/domain/fonts.ts` (checked by the same test).
const FONT_GROUPS: [(&str, &[(&str, &str)]); 5] = [
    (
        "Serif",
        &[
            ("newsreader", "Newsreader"),
            ("eb-garamond", "EB Garamond"),
            ("libre-baskerville", "Libre Baskerville"),
            ("crimson-pro", "Crimson Pro"),
            ("literata", "Literata"),
            ("lora", "Lora"),
            ("source-serif-4", "Source Serif 4"),
            ("cormorant-garamond", "Cormorant Garamond"),
        ],
    ),
    (
        "Sans",
        &[
            ("geist", "Geist"),
            ("inter", "Inter"),
            ("ibm-plex-sans", "IBM Plex Sans"),
            ("work-sans", "Work Sans"),
            ("atkinson-hyperlegible", "Atkinson Hyperlegible"),
        ],
    ),
    (
        "Mono",
        &[
            ("geist-mono", "Geist Mono"),
            ("jetbrains-mono", "JetBrains Mono"),
            ("ibm-plex-mono", "IBM Plex Mono"),
        ],
    ),
    (
        "Typewriter",
        &[
            ("courier-prime", "Courier Prime"),
            ("cutive-mono", "Cutive Mono"),
        ],
    ),
    (
        "Handwriting",
        &[("caveat", "Caveat"), ("patrick-hand", "Patrick Hand")],
    ),
];

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
    toolbar: CheckMenuItem<Wry>,
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
    toolbar: bool,
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
        (&checks.toolbar, state.toolbar),
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
    let toolbar = check("toolbar", "Show Toolbar", Some("CmdOrCtrl+Alt+T"))?;
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
            &toolbar,
            &zen,
            &typewriter,
            &dimming,
            &view_separator,
        ],
        &[
            &palette,
            &stats,
            &sidebar,
            &toolbar,
            &zen,
            &typewriter,
            &dimming,
        ],
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

    // Format follows Edit, as in other word processors (DESIGN_SPEC §7.11).
    let format = format_menu(app)?;
    let edit_index = menu.items()?.iter().position(|kind| {
        matches!(kind, MenuItemKind::Submenu(submenu) if submenu.text().is_ok_and(|text| text == "Edit"))
    });
    match edit_index {
        Some(index) => menu.insert(&format, index + 1)?,
        None => menu.append(&format)?,
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
        toolbar,
        typewriter,
        dim_off,
        dim_sentence,
        dim_paragraph,
    });

    Ok(menu)
}

/// The Format menu (DESIGN_SPEC §7.11, shortcuts in §7.7). Its items are sent
/// as `format-…` actions, which the frontend runs on the open document.
fn format_menu(app: &AppHandle) -> tauri::Result<Submenu<Wry>> {
    let item = |action: &str, label: &str, accelerator: Option<&str>| {
        MenuItem::with_id(
            app,
            format!("{ACTION_PREFIX}format-{action}"),
            label,
            true,
            accelerator,
        )
    };
    let separator = || PredefinedMenuItem::separator(app);

    let text_color = Submenu::new(app, "Text Colour", true)?;
    text_color.append(&item("color-default", "Default", None)?)?;
    text_color.append(&separator()?)?;
    for (name, label) in TEXT_COLORS {
        text_color.append(&item(&format!("color-{name}"), label, None)?)?;
    }

    let highlight_color = Submenu::new(app, "Highlight Colour", true)?;
    highlight_color.append(&item("highlight-none", "None", None)?)?;
    highlight_color.append(&separator()?)?;
    for (name, label) in HIGHLIGHTS {
        highlight_color.append(&item(&format!("highlight-{name}"), label, None)?)?;
    }

    // Each group is headed by its name, disabled, as in the font picker.
    let font = Submenu::new(app, "Font", true)?;
    font.append(&item("font-document", "Document Font", None)?)?;
    for (group, fonts) in FONT_GROUPS {
        font.append(&separator()?)?;
        font.append(&MenuItem::new(app, group, false, None::<&str>)?)?;
        for (id, name) in fonts {
            font.append(&item(&format!("font-{id}"), name, None)?)?;
        }
    }

    let size = Submenu::with_items(
        app,
        "Size",
        true,
        &[
            &item("size-bigger", "Bigger", Some("CmdOrCtrl+Shift+Period"))?,
            &item("size-smaller", "Smaller", Some("CmdOrCtrl+Shift+Comma"))?,
            &separator()?,
            &item("size-document", "Document Size", None)?,
        ],
    )?;

    let align = Submenu::with_items(
        app,
        "Align",
        true,
        &[
            &item("align-left", "Left", Some("CmdOrCtrl+Shift+BracketLeft"))?,
            &item("align-center", "Centre", Some("CmdOrCtrl+Shift+Backslash"))?,
            &item("align-right", "Right", Some("CmdOrCtrl+Shift+BracketRight"))?,
            &item(
                "align-justify",
                "Justify",
                Some("CmdOrCtrl+Alt+Shift+Backslash"),
            )?,
        ],
    )?;

    // Tiptap's own shortcuts for these, shown here so they can be found.
    let paragraph_style = Submenu::with_items(
        app,
        "Paragraph Style",
        true,
        &[
            &item("style-body", "Body", Some("CmdOrCtrl+Alt+0"))?,
            &item("style-h1", "Heading 1", Some("CmdOrCtrl+Alt+1"))?,
            &item("style-h2", "Heading 2", Some("CmdOrCtrl+Alt+2"))?,
            &item("style-h3", "Heading 3", Some("CmdOrCtrl+Alt+3"))?,
            &item("style-quote", "Quote", Some("CmdOrCtrl+Shift+B"))?,
            &item("style-code", "Code", Some("CmdOrCtrl+Alt+C"))?,
        ],
    )?;

    Submenu::with_items(
        app,
        "Format",
        true,
        &[
            &MenuItem::with_id(
                app,
                format!("{ACTION_PREFIX}document-style"),
                "Document Style…",
                true,
                None::<&str>,
            )?,
            &separator()?,
            &paragraph_style,
            &separator()?,
            &item("bold", "Bold", Some("CmdOrCtrl+B"))?,
            &item("italic", "Italic", Some("CmdOrCtrl+I"))?,
            &item("underline", "Underline", Some("CmdOrCtrl+U"))?,
            &item("strike", "Strikethrough", None)?,
            &item("highlight", "Highlight", Some("CmdOrCtrl+Shift+H"))?,
            &item("link", "Link…", None)?,
            &separator()?,
            &text_color,
            &highlight_color,
            &separator()?,
            &font,
            &size,
            &separator()?,
            &align,
            &separator()?,
            &item("list-bullet", "Bulleted List", Some("CmdOrCtrl+Shift+8"))?,
            &item("list-numbered", "Numbered List", Some("CmdOrCtrl+Shift+7"))?,
            &item("list-task", "Task List", Some("CmdOrCtrl+Shift+9"))?,
            &item("indent", "Indent", Some("CmdOrCtrl+BracketRight"))?,
            &item("outdent", "Outdent", Some("CmdOrCtrl+BracketLeft"))?,
        ],
    )
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
