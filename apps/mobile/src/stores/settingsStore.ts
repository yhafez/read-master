/**
 * Read Master Mobile - Settings Store
 *
 * Manages app settings using Zustand with persistence.
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeMode } from "../theme/ThemeProvider";

// ============================================================================
// Types
// ============================================================================

interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  textAlign: "left" | "justify";
  marginSize: "small" | "medium" | "large";
  margins: number; // Pixel value for margins
  scrollMode: "paginated" | "continuous";
}

interface NotificationSettings {
  flashcardReminders: boolean;
  streakReminders: boolean;
  bookClubUpdates: boolean;
  dailyDigest: boolean;
  reminderTime: string; // HH:mm format
}

interface SettingsState {
  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Language
  language: string;
  setLanguage: (language: string) => void;

  // Reader settings
  readerSettings: ReaderSettings;
  setReaderSettings: (settings: Partial<ReaderSettings>) => void;

  // Reader convenience accessors
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  margins: number;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setLineSpacing: (spacing: number) => void;
  setMargins: (margins: number) => void;

  // Notification settings
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;

  // AI settings
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;

  // TTS settings
  ttsVoice: string;
  ttsSpeed: number;
  setTtsVoice: (voice: string) => void;
  setTtsSpeed: (speed: number) => void;

  // Offline settings
  autoDownload: boolean;
  downloadOnWifiOnly: boolean;
  setAutoDownload: (enabled: boolean) => void;
  setDownloadOnWifiOnly: (enabled: boolean) => void;

  // Persistence
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultReaderSettings: ReaderSettings = {
  fontSize: 16,
  fontFamily: "system",
  lineSpacing: 1.5,
  textAlign: "left",
  marginSize: "medium",
  margins: 16,
  scrollMode: "paginated",
};

const defaultNotificationSettings: NotificationSettings = {
  flashcardReminders: true,
  streakReminders: true,
  bookClubUpdates: true,
  dailyDigest: false,
  reminderTime: "09:00",
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  themeMode: "system",
  language: "en",
  readerSettings: defaultReaderSettings,
  notificationSettings: defaultNotificationSettings,
  aiEnabled: true,
  ttsVoice: "default",
  ttsSpeed: 1.0,
  autoDownload: false,
  downloadOnWifiOnly: true,

  // Reader convenience accessors (computed from readerSettings)
  get fontSize() {
    return get().readerSettings.fontSize;
  },
  get fontFamily() {
    return get().readerSettings.fontFamily;
  },
  get lineSpacing() {
    return get().readerSettings.lineSpacing;
  },
  get margins() {
    return get().readerSettings.margins;
  },

  // Theme
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    get().saveSettings();
  },

  // Language
  setLanguage: (language) => {
    set({ language });
    get().saveSettings();
  },

  // Reader settings
  setReaderSettings: (settings) => {
    set((state) => ({
      readerSettings: { ...state.readerSettings, ...settings },
    }));
    get().saveSettings();
  },

  // Reader convenience setters
  setFontSize: (size) => {
    get().setReaderSettings({ fontSize: size });
  },
  setFontFamily: (family) => {
    get().setReaderSettings({ fontFamily: family });
  },
  setLineSpacing: (spacing) => {
    get().setReaderSettings({ lineSpacing: spacing });
  },
  setMargins: (margins) => {
    get().setReaderSettings({ margins });
  },

  // Notification settings
  setNotificationSettings: (settings) => {
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, ...settings },
    }));
    get().saveSettings();
  },

  // AI settings
  setAiEnabled: (enabled) => {
    set({ aiEnabled: enabled });
    get().saveSettings();
  },

  // TTS settings
  setTtsVoice: (voice) => {
    set({ ttsVoice: voice });
    get().saveSettings();
  },
  setTtsSpeed: (speed) => {
    set({ ttsSpeed: speed });
    get().saveSettings();
  },

  // Offline settings
  setAutoDownload: (enabled) => {
    set({ autoDownload: enabled });
    get().saveSettings();
  },
  setDownloadOnWifiOnly: (enabled) => {
    set({ downloadOnWifiOnly: enabled });
    get().saveSettings();
  },

  // Load settings from storage
  loadSettings: async () => {
    try {
      const settingsJson = await AsyncStorage.getItem("@settings");
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        set({
          themeMode: settings.themeMode ?? "system",
          language: settings.language ?? "en",
          readerSettings: {
            ...defaultReaderSettings,
            ...settings.readerSettings,
          },
          notificationSettings: {
            ...defaultNotificationSettings,
            ...settings.notificationSettings,
          },
          aiEnabled: settings.aiEnabled ?? true,
          ttsVoice: settings.ttsVoice ?? "default",
          ttsSpeed: settings.ttsSpeed ?? 1.0,
          autoDownload: settings.autoDownload ?? false,
          downloadOnWifiOnly: settings.downloadOnWifiOnly ?? true,
        });
      }
    } catch (_error) {
      // Error handled silently("Error loading settings:", error);
    }
  },

  // Save settings to storage
  saveSettings: async () => {
    try {
      const state = get();
      const settings = {
        themeMode: state.themeMode,
        language: state.language,
        readerSettings: state.readerSettings,
        notificationSettings: state.notificationSettings,
        aiEnabled: state.aiEnabled,
        ttsVoice: state.ttsVoice,
        ttsSpeed: state.ttsSpeed,
        autoDownload: state.autoDownload,
        downloadOnWifiOnly: state.downloadOnWifiOnly,
      };
      await AsyncStorage.setItem("@settings", JSON.stringify(settings));
    } catch (_error) {
      // Error handled silently("Error saving settings:", error);
    }
  },
}));
