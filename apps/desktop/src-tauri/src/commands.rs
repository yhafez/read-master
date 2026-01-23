// Read Master Desktop - Tauri Commands
//
// IPC commands exposed to the frontend.

use log::info;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_store::StoreExt;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDialogResult {
    pub canceled: bool,
    pub paths: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveDialogResult {
    pub canceled: bool,
    pub path: Option<String>,
}

// ============================================================================
// Basic Commands
// ============================================================================

/// Greet command for testing
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Read Master.", name)
}

/// Get application version
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get current platform
#[tauri::command]
pub fn get_platform() -> String {
    #[cfg(target_os = "macos")]
    return "macos".to_string();

    #[cfg(target_os = "windows")]
    return "windows".to_string();

    #[cfg(target_os = "linux")]
    return "linux".to_string();

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return "unknown".to_string();
}

// ============================================================================
// File Dialog Commands
// ============================================================================

/// Open file dialog for selecting books
#[tauri::command]
pub async fn open_file_dialog<R: Runtime>(
    app: AppHandle<R>,
    title: Option<String>,
    multiple: Option<bool>,
) -> Result<FileDialogResult, String> {
    info!("Opening file dialog: {:?}", title);

    let mut dialog = app.dialog().file();

    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }

    // Add book file filters
    dialog = dialog
        .add_filter("Books", &["epub", "pdf"])
        .add_filter("EPUB", &["epub"])
        .add_filter("PDF", &["pdf"])
        .add_filter("All Files", &["*"]);

    let result = if multiple.unwrap_or(false) {
        match dialog.pick_files() {
            Some(paths) => FileDialogResult {
                canceled: false,
                paths: paths.iter().map(|p| p.to_string()).collect(),
            },
            None => FileDialogResult {
                canceled: true,
                paths: vec![],
            },
        }
    } else {
        match dialog.pick_file() {
            Some(path) => FileDialogResult {
                canceled: false,
                paths: vec![path.to_string()],
            },
            None => FileDialogResult {
                canceled: true,
                paths: vec![],
            },
        }
    };

    info!("File dialog result: {:?}", result);
    Ok(result)
}

/// Save file dialog
#[tauri::command]
pub async fn save_file_dialog<R: Runtime>(
    app: AppHandle<R>,
    title: Option<String>,
    default_name: Option<String>,
) -> Result<SaveDialogResult, String> {
    info!("Opening save dialog: {:?}", title);

    let mut dialog = app.dialog().file();

    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }

    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    let result = match dialog.save_file() {
        Some(path) => SaveDialogResult {
            canceled: false,
            path: Some(path.to_string()),
        },
        None => SaveDialogResult {
            canceled: true,
            path: None,
        },
    };

    info!("Save dialog result: {:?}", result);
    Ok(result)
}

// ============================================================================
// File Operations
// ============================================================================

/// Read file contents
#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    info!("Reading file: {}", path);
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write file contents
#[tauri::command]
pub async fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    info!("Writing file: {}", path);
    std::fs::write(&path, contents).map_err(|e| format!("Failed to write file: {}", e))
}

// ============================================================================
// Notification Commands
// ============================================================================

/// Show a notification
#[tauri::command]
pub async fn show_notification<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    body: Option<String>,
) -> Result<(), String> {
    info!("Showing notification: {}", title);

    let mut notification = app.notification().builder();
    notification = notification.title(&title);

    if let Some(b) = body {
        notification = notification.body(&b);
    }

    notification
        .show()
        .map_err(|e| format!("Failed to show notification: {}", e))
}

// ============================================================================
// Store Commands
// ============================================================================

/// Get value from persistent store
#[tauri::command]
pub async fn get_store_value<R: Runtime>(
    app: AppHandle<R>,
    key: String,
) -> Result<Option<serde_json::Value>, String> {
    info!("Getting store value: {}", key);

    let store = app
        .store("settings.json")
        .map_err(|e| format!("Failed to open store: {}", e))?;

    Ok(store.get(&key))
}

/// Set value in persistent store
#[tauri::command]
pub async fn set_store_value<R: Runtime>(
    app: AppHandle<R>,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    info!("Setting store value: {} = {:?}", key, value);

    let store = app
        .store("settings.json")
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(&key, value);
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))
}

// ============================================================================
// Update Commands
// ============================================================================

/// Check for application updates
#[tauri::command]
pub async fn check_for_updates<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    info!("Checking for updates...");

    // Use the updater plugin
    use tauri_plugin_updater::UpdaterExt;

    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(update)) => {
                    info!("Update available: {:?}", update.version);
                    // You can download and install here or return info to frontend
                    Ok(true)
                }
                Ok(None) => {
                    info!("No updates available");
                    Ok(false)
                }
                Err(e) => {
                    Err(format!("Failed to check for updates: {}", e))
                }
            }
        }
        Err(e) => Err(format!("Updater not available: {}", e)),
    }
}
