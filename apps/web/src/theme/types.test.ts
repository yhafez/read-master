/**
 * Tests for theme types and constants
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_SETTINGS,
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_RANGE,
  THEME_MODES,
} from "./types";
import type { FontFamily, ThemeMode, ThemeSettings } from "./types";

describe("Theme Types", () => {
  describe("THEME_MODES", () => {
    it("should contain all four theme modes", () => {
      expect(THEME_MODES).toHaveLength(4);
      expect(THEME_MODES).toContain("light");
      expect(THEME_MODES).toContain("dark");
      expect(THEME_MODES).toContain("sepia");
      expect(THEME_MODES).toContain("high-contrast");
    });

    it("should be in expected order", () => {
      expect(THEME_MODES[0]).toBe("light");
      expect(THEME_MODES[1]).toBe("dark");
      expect(THEME_MODES[2]).toBe("sepia");
      expect(THEME_MODES[3]).toBe("high-contrast");
    });
  });

  describe("FONT_FAMILIES", () => {
    it("should contain all font families", () => {
      expect(FONT_FAMILIES).toHaveLength(3);
      expect(FONT_FAMILIES).toContain("system");
      expect(FONT_FAMILIES).toContain("serif");
      expect(FONT_FAMILIES).toContain("opendyslexic");
    });

    it("should include OpenDyslexic for accessibility", () => {
      expect(FONT_FAMILIES).toContain("opendyslexic");
    });
  });

  describe("FONT_SIZE_RANGE", () => {
    it("should have valid min value", () => {
      expect(FONT_SIZE_RANGE.min).toBe(0.75);
    });

    it("should have valid max value", () => {
      expect(FONT_SIZE_RANGE.max).toBe(1.5);
    });

    it("should have valid step value", () => {
      expect(FONT_SIZE_RANGE.step).toBe(0.05);
    });

    it("should have min less than max", () => {
      expect(FONT_SIZE_RANGE.min).toBeLessThan(FONT_SIZE_RANGE.max);
    });
  });

  describe("LINE_HEIGHT_RANGE", () => {
    it("should have valid min value", () => {
      expect(LINE_HEIGHT_RANGE.min).toBe(1.2);
    });

    it("should have valid max value", () => {
      expect(LINE_HEIGHT_RANGE.max).toBe(2.0);
    });

    it("should have valid step value", () => {
      expect(LINE_HEIGHT_RANGE.step).toBe(0.1);
    });

    it("should have min less than max", () => {
      expect(LINE_HEIGHT_RANGE.min).toBeLessThan(LINE_HEIGHT_RANGE.max);
    });
  });

  describe("LETTER_SPACING_RANGE", () => {
    it("should have valid min value", () => {
      expect(LETTER_SPACING_RANGE.min).toBe(-0.05);
    });

    it("should have valid max value", () => {
      expect(LETTER_SPACING_RANGE.max).toBe(0.1);
    });

    it("should have valid step value", () => {
      expect(LETTER_SPACING_RANGE.step).toBe(0.01);
    });

    it("should have min less than max", () => {
      expect(LETTER_SPACING_RANGE.min).toBeLessThan(LETTER_SPACING_RANGE.max);
    });

    it("should allow negative values for tighter spacing", () => {
      expect(LETTER_SPACING_RANGE.min).toBeLessThan(0);
    });
  });

  describe("DEFAULT_THEME_SETTINGS", () => {
    it("should have light mode as default", () => {
      expect(DEFAULT_THEME_SETTINGS.mode).toBe("light");
    });

    it("should have system font as default", () => {
      expect(DEFAULT_THEME_SETTINGS.fontFamily).toBe("system");
    });

    it("should have font size of 1 (100%)", () => {
      expect(DEFAULT_THEME_SETTINGS.fontSize).toBe(1);
    });

    it("should have line height of 1.5", () => {
      expect(DEFAULT_THEME_SETTINGS.lineHeight).toBe(1.5);
    });

    it("should have letter spacing of 0", () => {
      expect(DEFAULT_THEME_SETTINGS.letterSpacing).toBe(0);
    });

    it("should have all required properties", () => {
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty("mode");
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty("fontFamily");
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty("fontSize");
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty("lineHeight");
      expect(DEFAULT_THEME_SETTINGS).toHaveProperty("letterSpacing");
    });

    it("should have values within valid ranges", () => {
      expect(DEFAULT_THEME_SETTINGS.fontSize).toBeGreaterThanOrEqual(
        FONT_SIZE_RANGE.min
      );
      expect(DEFAULT_THEME_SETTINGS.fontSize).toBeLessThanOrEqual(
        FONT_SIZE_RANGE.max
      );
      expect(DEFAULT_THEME_SETTINGS.lineHeight).toBeGreaterThanOrEqual(
        LINE_HEIGHT_RANGE.min
      );
      expect(DEFAULT_THEME_SETTINGS.lineHeight).toBeLessThanOrEqual(
        LINE_HEIGHT_RANGE.max
      );
      expect(DEFAULT_THEME_SETTINGS.letterSpacing).toBeGreaterThanOrEqual(
        LETTER_SPACING_RANGE.min
      );
      expect(DEFAULT_THEME_SETTINGS.letterSpacing).toBeLessThanOrEqual(
        LETTER_SPACING_RANGE.max
      );
    });
  });

  describe("Type exports", () => {
    it("should export ThemeMode type", () => {
      const mode: ThemeMode = "dark";
      expect(THEME_MODES).toContain(mode);
    });

    it("should export FontFamily type", () => {
      const font: FontFamily = "opendyslexic";
      expect(FONT_FAMILIES).toContain(font);
    });

    it("should export ThemeSettings type", () => {
      const settings: ThemeSettings = {
        mode: "dark",
        fontFamily: "serif",
        fontSize: 1.25,
        lineHeight: 1.8,
        letterSpacing: 0.02,
      };
      expect(settings.mode).toBe("dark");
      expect(settings.fontFamily).toBe("serif");
    });
  });
});
