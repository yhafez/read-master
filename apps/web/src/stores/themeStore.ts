/**
 * Theme store for Read Master
 *
 * Manages theme settings with localStorage persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FontFamily, ThemeMode, ThemeSettings } from "../theme/types";
import {
  DEFAULT_THEME_SETTINGS,
  FONT_SIZE_RANGE,
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_RANGE,
} from "../theme/types";

export const THEME_STORAGE_KEY = "read-master-theme";

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate and sanitize theme settings
 */
export function sanitizeSettings(
  settings: Partial<ThemeSettings>
): Partial<ThemeSettings> {
  const sanitized: Partial<ThemeSettings> = {};

  if (settings.mode !== undefined) {
    const validModes: ThemeMode[] = ["light", "dark", "sepia", "high-contrast"];
    sanitized.mode = validModes.includes(settings.mode)
      ? settings.mode
      : "light";
  }

  if (settings.fontFamily !== undefined) {
    const validFonts: FontFamily[] = ["system", "serif", "opendyslexic"];
    sanitized.fontFamily = validFonts.includes(settings.fontFamily)
      ? settings.fontFamily
      : "system";
  }

  if (settings.fontSize !== undefined) {
    sanitized.fontSize = clamp(
      settings.fontSize,
      FONT_SIZE_RANGE.min,
      FONT_SIZE_RANGE.max
    );
  }

  if (settings.lineHeight !== undefined) {
    sanitized.lineHeight = clamp(
      settings.lineHeight,
      LINE_HEIGHT_RANGE.min,
      LINE_HEIGHT_RANGE.max
    );
  }

  if (settings.letterSpacing !== undefined) {
    sanitized.letterSpacing = clamp(
      settings.letterSpacing,
      LETTER_SPACING_RANGE.min,
      LETTER_SPACING_RANGE.max
    );
  }

  return sanitized;
}

interface ThemeStore {
  settings: ThemeSettings;
  setMode: (mode: ThemeMode) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setLetterSpacing: (letterSpacing: number) => void;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_THEME_SETTINGS,

      setMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, ...sanitizeSettings({ mode }) },
        })),

      setFontFamily: (fontFamily) =>
        set((state) => ({
          settings: { ...state.settings, ...sanitizeSettings({ fontFamily }) },
        })),

      setFontSize: (fontSize) =>
        set((state) => ({
          settings: { ...state.settings, ...sanitizeSettings({ fontSize }) },
        })),

      setLineHeight: (lineHeight) =>
        set((state) => ({
          settings: { ...state.settings, ...sanitizeSettings({ lineHeight }) },
        })),

      setLetterSpacing: (letterSpacing) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...sanitizeSettings({ letterSpacing }),
          },
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...sanitizeSettings(newSettings) },
        })),

      resetSettings: () =>
        set(() => ({
          settings: DEFAULT_THEME_SETTINGS,
        })),
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
