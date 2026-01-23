// Read Master Desktop - System Tray
//
// System tray icon and menu.

use log::info;
use tauri::{
    image::Image,
    menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager, Runtime,
};

/// Create the system tray icon and menu
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<TrayIcon<R>, tauri::Error> {
    info!("Creating system tray...");

    // Build tray menu
    let menu = MenuBuilder::new(app)
        .items(&[
            &MenuItemBuilder::with_id("tray_title", "Read Master")
                .enabled(false)
                .build(app)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItemBuilder::with_id("tray_show", "Show Window")
                .build(app)?,
            &MenuItemBuilder::with_id("tray_hide", "Hide Window")
                .build(app)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItemBuilder::with_id("tray_library", "Open Library")
                .build(app)?,
            &MenuItemBuilder::with_id("tray_continue", "Continue Reading")
                .build(app)?,
            &MenuItemBuilder::with_id("tray_flashcards", "Review Flashcards")
                .build(app)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItemBuilder::with_id("tray_settings", "Settings")
                .build(app)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItemBuilder::with_id("tray_quit", "Quit Read Master")
                .build(app)?,
        ])
        .build()?;

    // Create tray icon
    let tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Read Master")
        .on_menu_event(move |app, event| {
            info!("Tray menu event: {:?}", event.id());

            match event.id().as_ref() {
                "tray_show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "tray_hide" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
                "tray_library" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate", "/library");
                    }
                }
                "tray_continue" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate", "/reader/continue");
                    }
                }
                "tray_flashcards" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate", "/flashcards/review");
                    }
                }
                "tray_settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("navigate", "/settings");
                    }
                }
                "tray_quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            use tauri::tray::TrayIconEvent;

            match event {
                TrayIconEvent::Click {
                    button: tauri::tray::MouseButton::Left,
                    button_state: tauri::tray::MouseButtonState::Up,
                    ..
                } => {
                    info!("Tray icon clicked");
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                TrayIconEvent::DoubleClick { .. } => {
                    info!("Tray icon double-clicked");
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    info!("System tray created");
    Ok(tray)
}
