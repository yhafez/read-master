/**
 * Tests for theme store
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_THEME_SETTINGS } from "../theme/types";
import {
  clamp,
  sanitizeSettings,
  THEME_STORAGE_KEY,
  useThemeStore,
} from "./themeStore";

// Reset store between tests
beforeEach(() => {
  useThemeStore.setState({ settings: DEFAULT_THEME_SETTINGS });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("themeStore", () => {
  describe("constants", () => {
    it("should export THEME_STORAGE_KEY", () => {
      expect(THEME_STORAGE_KEY).toBe("read-master-theme");
    });
  });

  describe("clamp", () => {
    it("should return value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("should return min when value is below range", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("should return max when value is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should handle equal min and max", () => {
      expect(clamp(5, 5, 5)).toBe(5);
    });

    it("should handle negative ranges", () => {
      expect(clamp(-3, -5, -1)).toBe(-3);
      expect(clamp(-10, -5, -1)).toBe(-5);
      expect(clamp(0, -5, -1)).toBe(-1);
    });

    it("should handle decimal values", () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(-0.1, 0, 1)).toBe(0);
      expect(clamp(1.5, 0, 1)).toBe(1);
    });

    it("should handle boundary values", () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe("sanitizeSettings", () => {
    describe("mode validation", () => {
      it("should accept valid mode values", () => {
        expect(sanitizeSettings({ mode: "light" })).toEqual({ mode: "light" });
        expect(sanitizeSettings({ mode: "dark" })).toEqual({ mode: "dark" });
        expect(sanitizeSettings({ mode: "sepia" })).toEqual({ mode: "sepia" });
        expect(sanitizeSettings({ mode: "high-contrast" })).toEqual({
          mode: "high-contrast",
        });
      });

      it("should default invalid mode to light", () => {
        expect(sanitizeSettings({ mode: "invalid" as never })).toEqual({
          mode: "light",
        });
      });
    });

    describe("fontFamily validation", () => {
      it("should accept valid font family values", () => {
        expect(sanitizeSettings({ fontFamily: "system" })).toEqual({
          fontFamily: "system",
        });
        expect(sanitizeSettings({ fontFamily: "serif" })).toEqual({
          fontFamily: "serif",
        });
        expect(sanitizeSettings({ fontFamily: "opendyslexic" })).toEqual({
          fontFamily: "opendyslexic",
        });
      });

      it("should default invalid fontFamily to system", () => {
        expect(sanitizeSettings({ fontFamily: "comic-sans" as never })).toEqual(
          {
            fontFamily: "system",
          }
        );
      });
    });

    describe("fontSize validation", () => {
      it("should accept valid fontSize values", () => {
        expect(sanitizeSettings({ fontSize: 1 })).toEqual({ fontSize: 1 });
        expect(sanitizeSettings({ fontSize: 0.75 })).toEqual({
          fontSize: 0.75,
        });
        expect(sanitizeSettings({ fontSize: 1.5 })).toEqual({ fontSize: 1.5 });
      });

      it("should clamp fontSize to valid range", () => {
        expect(sanitizeSettings({ fontSize: 0.5 })).toEqual({ fontSize: 0.75 });
        expect(sanitizeSettings({ fontSize: 2 })).toEqual({ fontSize: 1.5 });
      });
    });

    describe("lineHeight validation", () => {
      it("should accept valid lineHeight values", () => {
        expect(sanitizeSettings({ lineHeight: 1.5 })).toEqual({
          lineHeight: 1.5,
        });
        expect(sanitizeSettings({ lineHeight: 1.2 })).toEqual({
          lineHeight: 1.2,
        });
        expect(sanitizeSettings({ lineHeight: 2.0 })).toEqual({
          lineHeight: 2.0,
        });
      });

      it("should clamp lineHeight to valid range", () => {
        expect(sanitizeSettings({ lineHeight: 1 })).toEqual({
          lineHeight: 1.2,
        });
        expect(sanitizeSettings({ lineHeight: 3 })).toEqual({
          lineHeight: 2.0,
        });
      });
    });

    describe("letterSpacing validation", () => {
      it("should accept valid letterSpacing values", () => {
        expect(sanitizeSettings({ letterSpacing: 0 })).toEqual({
          letterSpacing: 0,
        });
        expect(sanitizeSettings({ letterSpacing: -0.05 })).toEqual({
          letterSpacing: -0.05,
        });
        expect(sanitizeSettings({ letterSpacing: 0.1 })).toEqual({
          letterSpacing: 0.1,
        });
      });

      it("should clamp letterSpacing to valid range", () => {
        expect(sanitizeSettings({ letterSpacing: -0.1 })).toEqual({
          letterSpacing: -0.05,
        });
        expect(sanitizeSettings({ letterSpacing: 0.2 })).toEqual({
          letterSpacing: 0.1,
        });
      });
    });

    describe("partial settings", () => {
      it("should handle empty object", () => {
        expect(sanitizeSettings({})).toEqual({});
      });

      it("should only include provided settings", () => {
        const result = sanitizeSettings({ mode: "dark", fontSize: 1.25 });
        expect(result).toEqual({ mode: "dark", fontSize: 1.25 });
        expect(result).not.toHaveProperty("fontFamily");
        expect(result).not.toHaveProperty("lineHeight");
      });
    });
  });

  describe("useThemeStore", () => {
    describe("initial state", () => {
      it("should have default settings initially", () => {
        const { settings } = useThemeStore.getState();
        expect(settings).toEqual(DEFAULT_THEME_SETTINGS);
      });
    });

    describe("setMode", () => {
      it("should update mode to light", () => {
        useThemeStore.getState().setMode("light");
        expect(useThemeStore.getState().settings.mode).toBe("light");
      });

      it("should update mode to dark", () => {
        useThemeStore.getState().setMode("dark");
        expect(useThemeStore.getState().settings.mode).toBe("dark");
      });

      it("should update mode to sepia", () => {
        useThemeStore.getState().setMode("sepia");
        expect(useThemeStore.getState().settings.mode).toBe("sepia");
      });

      it("should update mode to high-contrast", () => {
        useThemeStore.getState().setMode("high-contrast");
        expect(useThemeStore.getState().settings.mode).toBe("high-contrast");
      });

      it("should preserve other settings when changing mode", () => {
        useThemeStore.getState().setFontSize(1.25);
        useThemeStore.getState().setMode("dark");

        const { settings } = useThemeStore.getState();
        expect(settings.mode).toBe("dark");
        expect(settings.fontSize).toBe(1.25);
      });
    });

    describe("setFontFamily", () => {
      it("should update font family to system", () => {
        useThemeStore.getState().setFontFamily("system");
        expect(useThemeStore.getState().settings.fontFamily).toBe("system");
      });

      it("should update font family to serif", () => {
        useThemeStore.getState().setFontFamily("serif");
        expect(useThemeStore.getState().settings.fontFamily).toBe("serif");
      });

      it("should update font family to opendyslexic", () => {
        useThemeStore.getState().setFontFamily("opendyslexic");
        expect(useThemeStore.getState().settings.fontFamily).toBe(
          "opendyslexic"
        );
      });
    });

    describe("setFontSize", () => {
      it("should update font size", () => {
        useThemeStore.getState().setFontSize(1.25);
        expect(useThemeStore.getState().settings.fontSize).toBe(1.25);
      });

      it("should clamp font size to minimum", () => {
        useThemeStore.getState().setFontSize(0.5);
        expect(useThemeStore.getState().settings.fontSize).toBe(0.75);
      });

      it("should clamp font size to maximum", () => {
        useThemeStore.getState().setFontSize(2);
        expect(useThemeStore.getState().settings.fontSize).toBe(1.5);
      });
    });

    describe("setLineHeight", () => {
      it("should update line height", () => {
        useThemeStore.getState().setLineHeight(1.8);
        expect(useThemeStore.getState().settings.lineHeight).toBe(1.8);
      });

      it("should clamp line height to minimum", () => {
        useThemeStore.getState().setLineHeight(1);
        expect(useThemeStore.getState().settings.lineHeight).toBe(1.2);
      });

      it("should clamp line height to maximum", () => {
        useThemeStore.getState().setLineHeight(3);
        expect(useThemeStore.getState().settings.lineHeight).toBe(2);
      });
    });

    describe("setLetterSpacing", () => {
      it("should update letter spacing", () => {
        useThemeStore.getState().setLetterSpacing(0.05);
        expect(useThemeStore.getState().settings.letterSpacing).toBe(0.05);
      });

      it("should allow negative letter spacing", () => {
        useThemeStore.getState().setLetterSpacing(-0.03);
        expect(useThemeStore.getState().settings.letterSpacing).toBe(-0.03);
      });

      it("should clamp letter spacing to minimum", () => {
        useThemeStore.getState().setLetterSpacing(-0.1);
        expect(useThemeStore.getState().settings.letterSpacing).toBe(-0.05);
      });

      it("should clamp letter spacing to maximum", () => {
        useThemeStore.getState().setLetterSpacing(0.2);
        expect(useThemeStore.getState().settings.letterSpacing).toBe(0.1);
      });
    });

    describe("updateSettings", () => {
      it("should update multiple settings at once", () => {
        useThemeStore.getState().updateSettings({
          mode: "dark",
          fontFamily: "serif",
          fontSize: 1.25,
        });

        const { settings } = useThemeStore.getState();
        expect(settings.mode).toBe("dark");
        expect(settings.fontFamily).toBe("serif");
        expect(settings.fontSize).toBe(1.25);
      });

      it("should preserve unchanged settings", () => {
        useThemeStore.getState().updateSettings({
          mode: "dark",
        });

        const { settings } = useThemeStore.getState();
        expect(settings.mode).toBe("dark");
        expect(settings.fontFamily).toBe("system"); // Default
        expect(settings.fontSize).toBe(1); // Default
      });

      it("should validate settings during update", () => {
        useThemeStore.getState().updateSettings({
          fontSize: 0.5, // Below minimum
          lineHeight: 3, // Above maximum
        });

        const { settings } = useThemeStore.getState();
        expect(settings.fontSize).toBe(0.75); // Clamped to min
        expect(settings.lineHeight).toBe(2); // Clamped to max
      });
    });

    describe("resetSettings", () => {
      it("should reset all settings to defaults", () => {
        // Change all settings
        useThemeStore.getState().updateSettings({
          mode: "dark",
          fontFamily: "serif",
          fontSize: 1.25,
          lineHeight: 1.8,
          letterSpacing: 0.05,
        });

        // Reset
        useThemeStore.getState().resetSettings();

        const { settings } = useThemeStore.getState();
        expect(settings).toEqual(DEFAULT_THEME_SETTINGS);
      });
    });
  });

  describe("real-world scenarios", () => {
    it("should handle user customizing reading experience", () => {
      const store = useThemeStore.getState();

      // User prefers dark mode
      store.setMode("dark");

      // User has dyslexia
      store.setFontFamily("opendyslexic");

      // User needs larger text
      store.setFontSize(1.25);

      // User needs more line spacing
      store.setLineHeight(1.8);

      const { settings } = useThemeStore.getState();
      expect(settings.mode).toBe("dark");
      expect(settings.fontFamily).toBe("opendyslexic");
      expect(settings.fontSize).toBe(1.25);
      expect(settings.lineHeight).toBe(1.8);
    });

    it("should handle user switching between reading and coding modes", () => {
      const store = useThemeStore.getState();

      // Reading mode - warm colors, larger text
      store.updateSettings({
        mode: "sepia",
        fontSize: 1.25,
        lineHeight: 1.8,
      });

      expect(useThemeStore.getState().settings.mode).toBe("sepia");

      // Switch to high contrast for detailed reading
      store.setMode("high-contrast");

      expect(useThemeStore.getState().settings.mode).toBe("high-contrast");
      // Other settings should be preserved
      expect(useThemeStore.getState().settings.fontSize).toBe(1.25);
    });
  });
});
