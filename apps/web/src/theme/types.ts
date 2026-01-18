/**
 * Theme types for Read Master
 */

export type ThemeMode = "light" | "dark" | "sepia" | "high-contrast";

export type FontFamily = "system" | "serif" | "opendyslexic";

export interface ThemeSettings {
  mode: ThemeMode;
  fontFamily: FontFamily;
  fontSize: number; // Base font size multiplier (0.75 to 1.5)
  lineHeight: number; // Line height multiplier (1.2 to 2.0)
  letterSpacing: number; // Letter spacing in em (-0.05 to 0.1)
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: "light",
  fontFamily: "system",
  fontSize: 1,
  lineHeight: 1.5,
  letterSpacing: 0,
};

export const THEME_MODES: ThemeMode[] = [
  "light",
  "dark",
  "sepia",
  "high-contrast",
];

export const FONT_FAMILIES: FontFamily[] = ["system", "serif", "opendyslexic"];

export const FONT_SIZE_RANGE = { min: 0.75, max: 1.5, step: 0.05 };
export const LINE_HEIGHT_RANGE = { min: 1.2, max: 2.0, step: 0.1 };
export const LETTER_SPACING_RANGE = { min: -0.05, max: 0.1, step: 0.01 };
