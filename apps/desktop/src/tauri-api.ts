/**
 * Read Master Desktop - Tauri API Bridge
 *
 * TypeScript wrapper for Tauri commands and events.
 * This provides type-safe access to native desktop features.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";

// ============================================================================
// Types
// ============================================================================

export interface FileDialogResult {
  canceled: boolean;
  paths: string[];
}

export interface SaveDialogResult {
  canceled: boolean;
  path: string | null;
}

export interface TauriStore {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
}

// ============================================================================
// Detection
// ============================================================================

/**
 * Check if running in Tauri desktop environment
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Get the current platform
 */
export async function getPlatform(): Promise<string> {
  if (!isTauri()) return "web";
  return invoke<string>("get_platform");
}

/**
 * Get the app version
 */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return "web";
  return invoke<string>("get_app_version");
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Open a file dialog for selecting books
 */
export async function openFileDialog(options?: {
  title?: string;
  multiple?: boolean;
}): Promise<FileDialogResult> {
  if (!isTauri()) {
    // Fallback to web file input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".epub,.pdf";
      input.multiple = options?.multiple ?? false;

      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          const paths = Array.from(input.files).map((f) =>
            URL.createObjectURL(f)
          );
          resolve({ canceled: false, paths });
        } else {
          resolve({ canceled: true, paths: [] });
        }
      };

      input.oncancel = () => {
        resolve({ canceled: true, paths: [] });
      };

      input.click();
    });
  }

  const result = await open({
    title: options?.title ?? "Select Book",
    multiple: options?.multiple ?? false,
    filters: [
      { name: "Books", extensions: ["epub", "pdf"] },
      { name: "EPUB", extensions: ["epub"] },
      { name: "PDF", extensions: ["pdf"] },
    ],
  });

  if (result === null) {
    return { canceled: true, paths: [] };
  }

  const paths = Array.isArray(result) ? result.map(String) : [String(result)];
  return { canceled: false, paths };
}

/**
 * Open a save file dialog
 */
export async function saveFileDialog(options?: {
  title?: string;
  defaultName?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<SaveDialogResult> {
  if (!isTauri()) {
    // Fallback: not supported in web
    return { canceled: true, path: null };
  }

  const result = await save({
    title: options?.title ?? "Save File",
    defaultPath: options?.defaultName,
    filters: options?.filters,
  });

  return {
    canceled: result === null,
    path: result ? String(result) : null,
  };
}

/**
 * Read file contents
 */
export async function readFileContents(
  path: string
): Promise<Uint8Array | null> {
  if (!isTauri()) {
    // Web: fetch the blob URL
    try {
      const response = await fetch(path);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (_e) {
      return null;
    }
  }

  try {
    return await readFile(path);
  } catch (_e) {
    return null;
  }
}

/**
 * Write file contents
 */
export async function writeFileContents(
  path: string,
  contents: Uint8Array
): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    await writeFile(path, contents);
    return true;
  } catch (_e) {
    return false;
  }
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Show a native notification
 */
export async function showNotification(
  title: string,
  body?: string
): Promise<void> {
  if (!isTauri()) {
    // Web: use Notification API
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          new Notification(title, { body });
        }
      }
    }
    return;
  }

  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  if (permissionGranted) {
    sendNotification({ title, body });
  }
}

// ============================================================================
// Shell Operations
// ============================================================================

/**
 * Open a URL in the default browser
 */
export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  await shellOpen(url);
}

// ============================================================================
// Clipboard Operations
// ============================================================================

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!isTauri()) {
    await navigator.clipboard.writeText(text);
    return;
  }

  await writeText(text);
}

/**
 * Read text from clipboard
 */
export async function readFromClipboard(): Promise<string> {
  if (!isTauri()) {
    return navigator.clipboard.readText();
  }

  return (await readText()) ?? "";
}

// ============================================================================
// Store Operations
// ============================================================================

/**
 * Get a value from the persistent store
 */
export async function getStoreValue<T>(key: string): Promise<T | null> {
  if (!isTauri()) {
    const value = localStorage.getItem(`readmaster:${key}`);
    return value ? JSON.parse(value) : null;
  }

  return invoke<T | null>("get_store_value", { key });
}

/**
 * Set a value in the persistent store
 */
export async function setStoreValue<T>(key: string, value: T): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(`readmaster:${key}`, JSON.stringify(value));
    return;
  }

  await invoke("set_store_value", { key, value });
}

// ============================================================================
// Updates
// ============================================================================

/**
 * Check for application updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    const update = await checkUpdate();
    return update !== null;
  } catch (_e) {
    return false;
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Listen for navigation events from the native menu/tray
 */
export function onNavigate(callback: (route: string) => void): () => void {
  if (!isTauri()) {
    return () => {};
  }

  const unlisten = listen<string>("navigate", (event) => {
    callback(event.payload);
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}

/**
 * Listen for import book events
 */
export function onImportBook(callback: () => void): () => void {
  if (!isTauri()) {
    return () => {};
  }

  const unlisten = listen("import-book", () => {
    callback();
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}

/**
 * Listen for reader action events
 */
export function onReaderAction(callback: (action: string) => void): () => void {
  if (!isTauri()) {
    return () => {};
  }

  const unlisten = listen<string>("reader-action", (event) => {
    callback(event.payload);
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}

// ============================================================================
// Export Desktop API
// ============================================================================

export const desktopApi = {
  isTauri,
  getPlatform,
  getAppVersion,
  file: {
    openDialog: openFileDialog,
    saveDialog: saveFileDialog,
    read: readFileContents,
    write: writeFileContents,
  },
  notification: {
    show: showNotification,
  },
  shell: {
    openExternal,
  },
  clipboard: {
    copy: copyToClipboard,
    read: readFromClipboard,
  },
  store: {
    get: getStoreValue,
    set: setStoreValue,
  },
  updates: {
    check: checkForUpdates,
  },
  events: {
    onNavigate,
    onImportBook,
    onReaderAction,
  },
};

export default desktopApi;
