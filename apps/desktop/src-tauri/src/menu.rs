// Read Master Desktop - Application Menu
//
// Native menu bar configuration.

use log::info;
use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Runtime, Wry,
};

/// Create the application menu
pub fn create_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    info!("Creating application menu...");

    let menu = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    let menu = menu.items(&[
        // App menu (macOS only)
        &SubmenuBuilder::new(app, "Read Master")
            .items(&[
                &PredefinedMenuItem::about(app, Some("About Read Master"), None)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("check_updates", "Check for Updates...")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("preferences", "Preferences...")
                    .accelerator("Cmd+,")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::services(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, None)?,
                &PredefinedMenuItem::hide_others(app, None)?,
                &PredefinedMenuItem::show_all(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, None)?,
            ])
            .build()?,
        // File menu
        &SubmenuBuilder::new(app, "File")
            .items(&[
                &MenuItemBuilder::with_id("import_book", "Import Book...")
                    .accelerator("Cmd+O")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("new_window", "New Window")
                    .accelerator("Cmd+Shift+N")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::close_window(app, None)?,
            ])
            .build()?,
        // Edit menu
        &SubmenuBuilder::new(app, "Edit")
            .items(&[
                &PredefinedMenuItem::undo(app, None)?,
                &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &PredefinedMenuItem::copy(app, None)?,
                &PredefinedMenuItem::paste(app, None)?,
                &PredefinedMenuItem::select_all(app, None)?,
            ])
            .build()?,
        // View menu
        &SubmenuBuilder::new(app, "View")
            .items(&[
                &MenuItemBuilder::with_id("library", "Library")
                    .accelerator("Cmd+1")
                    .build(app)?,
                &MenuItemBuilder::with_id("flashcards", "Flashcards")
                    .accelerator("Cmd+2")
                    .build(app)?,
                &MenuItemBuilder::with_id("social", "Social")
                    .accelerator("Cmd+3")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::fullscreen(app, None)?,
            ])
            .build()?,
        // Reading menu
        &SubmenuBuilder::new(app, "Reading")
            .items(&[
                &MenuItemBuilder::with_id("prev_page", "Previous Page")
                    .accelerator("Left")
                    .build(app)?,
                &MenuItemBuilder::with_id("next_page", "Next Page")
                    .accelerator("Right")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("toggle_tts", "Toggle Text-to-Speech")
                    .accelerator("Cmd+T")
                    .build(app)?,
                &MenuItemBuilder::with_id("add_bookmark", "Add Bookmark")
                    .accelerator("Cmd+D")
                    .build(app)?,
                &MenuItemBuilder::with_id("add_note", "Add Note")
                    .accelerator("Cmd+N")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("search_book", "Search in Book...")
                    .accelerator("Cmd+F")
                    .build(app)?,
                &MenuItemBuilder::with_id("table_of_contents", "Table of Contents")
                    .accelerator("Cmd+Shift+T")
                    .build(app)?,
            ])
            .build()?,
        // Window menu
        &SubmenuBuilder::new(app, "Window")
            .items(&[
                &PredefinedMenuItem::minimize(app, None)?,
                &PredefinedMenuItem::maximize(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::close_window(app, None)?,
            ])
            .build()?,
        // Help menu
        &SubmenuBuilder::new(app, "Help")
            .items(&[
                &MenuItemBuilder::with_id("documentation", "Documentation")
                    .build(app)?,
                &MenuItemBuilder::with_id("shortcuts", "Keyboard Shortcuts")
                    .accelerator("Cmd+/")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("report_issue", "Report an Issue...")
                    .build(app)?,
            ])
            .build()?,
    ]);

    #[cfg(not(target_os = "macos"))]
    let menu = menu.items(&[
        // File menu (Windows/Linux)
        &SubmenuBuilder::new(app, "File")
            .items(&[
                &MenuItemBuilder::with_id("import_book", "Import Book...")
                    .accelerator("Ctrl+O")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("preferences", "Preferences...")
                    .accelerator("Ctrl+,")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, None)?,
            ])
            .build()?,
        // Edit menu
        &SubmenuBuilder::new(app, "Edit")
            .items(&[
                &PredefinedMenuItem::undo(app, None)?,
                &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &PredefinedMenuItem::copy(app, None)?,
                &PredefinedMenuItem::paste(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::select_all(app, None)?,
            ])
            .build()?,
        // View menu
        &SubmenuBuilder::new(app, "View")
            .items(&[
                &MenuItemBuilder::with_id("library", "Library")
                    .accelerator("Ctrl+1")
                    .build(app)?,
                &MenuItemBuilder::with_id("flashcards", "Flashcards")
                    .accelerator("Ctrl+2")
                    .build(app)?,
                &MenuItemBuilder::with_id("social", "Social")
                    .accelerator("Ctrl+3")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::fullscreen(app, None)?,
            ])
            .build()?,
        // Reading menu
        &SubmenuBuilder::new(app, "Reading")
            .items(&[
                &MenuItemBuilder::with_id("prev_page", "Previous Page")
                    .accelerator("Left")
                    .build(app)?,
                &MenuItemBuilder::with_id("next_page", "Next Page")
                    .accelerator("Right")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("toggle_tts", "Toggle Text-to-Speech")
                    .accelerator("Ctrl+T")
                    .build(app)?,
                &MenuItemBuilder::with_id("add_bookmark", "Add Bookmark")
                    .accelerator("Ctrl+D")
                    .build(app)?,
                &MenuItemBuilder::with_id("add_note", "Add Note")
                    .accelerator("Ctrl+N")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("search_book", "Search in Book...")
                    .accelerator("Ctrl+F")
                    .build(app)?,
            ])
            .build()?,
        // Help menu
        &SubmenuBuilder::new(app, "Help")
            .items(&[
                &MenuItemBuilder::with_id("documentation", "Documentation")
                    .build(app)?,
                &MenuItemBuilder::with_id("shortcuts", "Keyboard Shortcuts")
                    .accelerator("Ctrl+/")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItemBuilder::with_id("check_updates", "Check for Updates...")
                    .build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::about(app, Some("About Read Master"), None)?,
            ])
            .build()?,
    ]);

    menu.build()
}
