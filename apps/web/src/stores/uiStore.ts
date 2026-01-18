/**
 * UI store for Read Master
 *
 * Manages UI state (sidebar, language, preferences) with localStorage persistence.
 * Note: Theme settings are managed separately in themeStore.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const UI_STORAGE_KEY = "read-master-ui";

/**
 * Supported languages (duplicated from i18n to avoid circular dependency)
 * Keep in sync with apps/web/src/i18n/index.ts
 */
export const supportedLanguages = ["en", "ar", "es", "ja", "zh", "tl"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/**
 * Valid sidebar states
 */
export type SidebarState = "open" | "closed" | "collapsed";

/**
 * Navigation panel modes in reader view
 */
export type ReaderNavPanel = "none" | "toc" | "notes" | "search" | "settings";

/**
 * UI preferences interface
 */
export interface UIPreferences {
  /** Whether to show the welcome modal for new users */
  showWelcomeModal: boolean;
  /** Whether to show reading tips */
  showReadingTips: boolean;
  /** Whether to enable keyboard shortcuts */
  enableKeyboardShortcuts: boolean;
  /** Whether to show progress in the sidebar */
  showProgressInSidebar: boolean;
  /** Whether to use compact list view in library */
  compactLibraryView: boolean;
}

/**
 * Default UI preferences
 */
export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  showWelcomeModal: true,
  showReadingTips: true,
  enableKeyboardShortcuts: true,
  showProgressInSidebar: true,
  compactLibraryView: false,
};

/**
 * Validate and ensure language is supported
 */
export function validateLanguage(lang: string): SupportedLanguage {
  return supportedLanguages.includes(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : "en";
}

/**
 * Validate sidebar state
 */
export function validateSidebarState(state: string): SidebarState {
  const validStates: SidebarState[] = ["open", "closed", "collapsed"];
  return validStates.includes(state as SidebarState)
    ? (state as SidebarState)
    : "open";
}

/**
 * Validate reader nav panel
 */
export function validateReaderNavPanel(panel: string): ReaderNavPanel {
  const validPanels: ReaderNavPanel[] = [
    "none",
    "toc",
    "notes",
    "search",
    "settings",
  ];
  return validPanels.includes(panel as ReaderNavPanel)
    ? (panel as ReaderNavPanel)
    : "none";
}

/**
 * Sanitize UI preferences
 */
export function sanitizePreferences(
  prefs: Partial<UIPreferences>
): Partial<UIPreferences> {
  const sanitized: Partial<UIPreferences> = {};

  if (typeof prefs.showWelcomeModal === "boolean") {
    sanitized.showWelcomeModal = prefs.showWelcomeModal;
  }

  if (typeof prefs.showReadingTips === "boolean") {
    sanitized.showReadingTips = prefs.showReadingTips;
  }

  if (typeof prefs.enableKeyboardShortcuts === "boolean") {
    sanitized.enableKeyboardShortcuts = prefs.enableKeyboardShortcuts;
  }

  if (typeof prefs.showProgressInSidebar === "boolean") {
    sanitized.showProgressInSidebar = prefs.showProgressInSidebar;
  }

  if (typeof prefs.compactLibraryView === "boolean") {
    sanitized.compactLibraryView = prefs.compactLibraryView;
  }

  return sanitized;
}

interface UIState {
  /** Current language */
  language: SupportedLanguage;
  /** Main sidebar state */
  sidebarState: SidebarState;
  /** Reader navigation panel */
  readerNavPanel: ReaderNavPanel;
  /** UI preferences */
  preferences: UIPreferences;
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
}

interface UIActions {
  /** Set the current language */
  setLanguage: (language: SupportedLanguage) => void;
  /** Set sidebar state */
  setSidebarState: (state: SidebarState) => void;
  /** Toggle sidebar open/closed */
  toggleSidebar: () => void;
  /** Set reader navigation panel */
  setReaderNavPanel: (panel: ReaderNavPanel) => void;
  /** Toggle reader navigation panel */
  toggleReaderNavPanel: (panel: ReaderNavPanel) => void;
  /** Update UI preferences */
  updatePreferences: (prefs: Partial<UIPreferences>) => void;
  /** Reset UI preferences to defaults */
  resetPreferences: () => void;
  /** Set mobile menu state */
  setMobileMenuOpen: (open: boolean) => void;
  /** Toggle mobile menu */
  toggleMobileMenu: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial state
      language: "en",
      sidebarState: "open",
      readerNavPanel: "none",
      preferences: DEFAULT_UI_PREFERENCES,
      mobileMenuOpen: false,

      // Actions
      setLanguage: (language) =>
        set(() => ({
          language: validateLanguage(language),
        })),

      setSidebarState: (state) =>
        set(() => ({
          sidebarState: validateSidebarState(state),
        })),

      toggleSidebar: () =>
        set((state) => ({
          sidebarState: state.sidebarState === "open" ? "closed" : "open",
        })),

      setReaderNavPanel: (panel) =>
        set(() => ({
          readerNavPanel: validateReaderNavPanel(panel),
        })),

      toggleReaderNavPanel: (panel) =>
        set((state) => ({
          readerNavPanel:
            state.readerNavPanel === panel
              ? "none"
              : validateReaderNavPanel(panel),
        })),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...sanitizePreferences(prefs),
          },
        })),

      resetPreferences: () =>
        set(() => ({
          preferences: DEFAULT_UI_PREFERENCES,
        })),

      setMobileMenuOpen: (open) =>
        set(() => ({
          mobileMenuOpen: open,
        })),

      toggleMobileMenu: () =>
        set((state) => ({
          mobileMenuOpen: !state.mobileMenuOpen,
        })),
    }),
    {
      name: UI_STORAGE_KEY,
      partialize: (state) => ({
        language: state.language,
        sidebarState: state.sidebarState,
        preferences: state.preferences,
        // Note: readerNavPanel and mobileMenuOpen are not persisted (session-only)
      }),
    }
  )
);
