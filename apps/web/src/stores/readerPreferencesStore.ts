/**
 * Reader preferences store
 *
 * Manages user preferences for the reader experience,
 * including defaults that apply when opening new books.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ReaderSettings, ReadingMode } from "./readerStore";
import { DEFAULT_READER_SETTINGS, sanitizeReaderSettings } from "./readerStore";

export const READER_PREFERENCES_STORAGE_KEY = "read-master-reader-preferences";

/**
 * Page turn animation styles
 */
export type PageTurnAnimation =
  | "none" // No animation
  | "slide" // Slide transition
  | "fade" // Fade transition
  | "flip"; // 3D flip effect

/**
 * Reader preferences
 */
export interface ReaderPreferences {
  /** Auto-save reading progress (default: true) */
  autoSaveProgress: boolean;

  /** Page turn animation style */
  pageTurnAnimation: PageTurnAnimation;

  /** Default reader settings (applied when opening new books) */
  defaultReaderSettings: ReaderSettings;
}

/**
 * Default reader preferences
 */
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  autoSaveProgress: true,
  pageTurnAnimation: "slide",
  defaultReaderSettings: DEFAULT_READER_SETTINGS,
};

/**
 * Validate page turn animation
 */
export function validatePageTurnAnimation(
  animation: unknown
): PageTurnAnimation {
  const validAnimations: PageTurnAnimation[] = [
    "none",
    "slide",
    "fade",
    "flip",
  ];
  return validAnimations.includes(animation as PageTurnAnimation)
    ? (animation as PageTurnAnimation)
    : "slide";
}

/**
 * Sanitize reader preferences
 */
export function sanitizeReaderPreferences(
  prefs: Partial<ReaderPreferences>
): Partial<ReaderPreferences> {
  const sanitized: Partial<ReaderPreferences> = {};

  if (prefs.autoSaveProgress !== undefined) {
    sanitized.autoSaveProgress = Boolean(prefs.autoSaveProgress);
  }

  if (prefs.pageTurnAnimation !== undefined) {
    sanitized.pageTurnAnimation = validatePageTurnAnimation(
      prefs.pageTurnAnimation
    );
  }

  if (prefs.defaultReaderSettings !== undefined) {
    sanitized.defaultReaderSettings = {
      ...DEFAULT_READER_SETTINGS,
      ...sanitizeReaderSettings(prefs.defaultReaderSettings),
    };
  }

  return sanitized;
}

interface ReaderPreferencesState extends ReaderPreferences {
  /** Update preferences */
  updatePreferences: (prefs: Partial<ReaderPreferences>) => void;

  /** Update only auto-save preference */
  setAutoSaveProgress: (enabled: boolean) => void;

  /** Update only page turn animation */
  setPageTurnAnimation: (animation: PageTurnAnimation) => void;

  /** Update default reader settings */
  updateDefaultReaderSettings: (settings: Partial<ReaderSettings>) => void;

  /** Set default reading mode */
  setDefaultReadingMode: (mode: ReadingMode) => void;

  /** Reset to default preferences */
  resetPreferences: () => void;

  /** Reset only default reader settings */
  resetDefaultReaderSettings: () => void;
}

export type ReaderPreferencesStore = ReaderPreferencesState;

export const useReaderPreferencesStore = create<ReaderPreferencesStore>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_READER_PREFERENCES,

      // Actions
      updatePreferences: (prefs) =>
        set((state) => ({
          ...state,
          ...sanitizeReaderPreferences(prefs),
        })),

      setAutoSaveProgress: (enabled) =>
        set(() => ({
          autoSaveProgress: enabled,
        })),

      setPageTurnAnimation: (animation) =>
        set(() => ({
          pageTurnAnimation: validatePageTurnAnimation(animation),
        })),

      updateDefaultReaderSettings: (settings) =>
        set((state) => ({
          defaultReaderSettings: {
            ...state.defaultReaderSettings,
            ...sanitizeReaderSettings(settings),
          },
        })),

      setDefaultReadingMode: (mode) =>
        set((state) => ({
          defaultReaderSettings: {
            ...state.defaultReaderSettings,
            readingMode: mode,
          },
        })),

      resetPreferences: () =>
        set(() => ({
          ...DEFAULT_READER_PREFERENCES,
        })),

      resetDefaultReaderSettings: () =>
        set((state) => ({
          defaultReaderSettings: DEFAULT_READER_SETTINGS,
          // Keep other preferences intact
          autoSaveProgress: state.autoSaveProgress,
          pageTurnAnimation: state.pageTurnAnimation,
        })),
    }),
    {
      name: READER_PREFERENCES_STORAGE_KEY,
      partialize: (state) => ({
        autoSaveProgress: state.autoSaveProgress,
        pageTurnAnimation: state.pageTurnAnimation,
        defaultReaderSettings: state.defaultReaderSettings,
      }),
    }
  )
);
