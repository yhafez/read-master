// Read Master Desktop - Main Entry Point
//
// Tauri application entry point with native integrations.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod menu;
mod tray;

use log::{info, LevelFilter};
use tauri::{
    generate_context, generate_handler, Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

fn main() {
    // Initialize logger
    env_logger::Builder::new()
        .filter_level(LevelFilter::Info)
        .init();

    info!("Starting Read Master Desktop...");

    tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        // Setup
        .setup(|app| {
            info!("Setting up application...");

            // Create application menu
            let menu = menu::create_menu(app.handle())?;
            app.set_menu(menu)?;

            // Create system tray
            let tray = tray::create_tray(app.handle())?;

            // Get main window
            if let Some(window) = app.get_webview_window("main") {
                // Set window title
                window.set_title("Read Master")?;

                // Show window when ready
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Hide instead of close on macOS
                        #[cfg(target_os = "macos")]
                        {
                            window_clone.hide().unwrap();
                            api.prevent_close();
                        }
                    }
                });
            }

            info!("Application setup complete");
            Ok(())
        })
        // Commands
        .invoke_handler(generate_handler![
            commands::greet,
            commands::get_app_version,
            commands::get_platform,
            commands::open_file_dialog,
            commands::save_file_dialog,
            commands::read_file,
            commands::write_file,
            commands::show_notification,
            commands::get_store_value,
            commands::set_store_value,
            commands::check_for_updates,
        ])
        // Run
        .run(generate_context!())
        .expect("error while running tauri application");
}
