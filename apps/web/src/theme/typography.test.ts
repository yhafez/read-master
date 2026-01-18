/**
 * Tests for theme typography
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_THEME_SETTINGS } from "./types";
import { createTypography, fontStacks } from "./typography";

describe("Typography", () => {
  describe("fontStacks", () => {
    it("should have system font stack", () => {
      expect(fontStacks.system).toBeDefined();
      expect(fontStacks.system).toContain("-apple-system");
      expect(fontStacks.system).toContain("Roboto");
    });

    it("should have serif font stack", () => {
      expect(fontStacks.serif).toBeDefined();
      expect(fontStacks.serif).toContain("Georgia");
      expect(fontStacks.serif).toContain("Times");
    });

    it("should have opendyslexic font stack", () => {
      expect(fontStacks.opendyslexic).toBeDefined();
      expect(fontStacks.opendyslexic).toContain("OpenDyslexic");
    });

    it("should have fallback fonts in opendyslexic stack", () => {
      expect(fontStacks.opendyslexic).toContain("-apple-system");
      expect(fontStacks.opendyslexic).toContain("sans-serif");
    });
  });

  describe("createTypography", () => {
    it("should create typography with default settings", () => {
      const typography = createTypography(DEFAULT_THEME_SETTINGS);
      expect(typography).toBeDefined();
      expect(typography.fontFamily).toBe(fontStacks.system);
    });

    it("should use system font family by default", () => {
      const typography = createTypography(DEFAULT_THEME_SETTINGS);
      expect(typography.fontFamily).toBe(fontStacks.system);
    });

    it("should use serif font family when specified", () => {
      const typography = createTypography({
        ...DEFAULT_THEME_SETTINGS,
        fontFamily: "serif",
      });
      expect(typography.fontFamily).toBe(fontStacks.serif);
    });

    it("should use opendyslexic font family when specified", () => {
      const typography = createTypography({
        ...DEFAULT_THEME_SETTINGS,
        fontFamily: "opendyslexic",
      });
      expect(typography.fontFamily).toBe(fontStacks.opendyslexic);
    });

    describe("font size scaling", () => {
      it("should scale h1 font size", () => {
        const defaultTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: 1,
        });
        const scaledTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: 1.25,
        });

        const defaultSize = parseFloat(defaultTypo.h1?.fontSize as string);
        const scaledSize = parseFloat(scaledTypo.h1?.fontSize as string);

        expect(scaledSize).toBe(defaultSize * 1.25);
      });

      it("should scale body1 font size", () => {
        const defaultTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: 1,
        });
        const scaledTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: 1.5,
        });

        const defaultSize = parseFloat(defaultTypo.body1?.fontSize as string);
        const scaledSize = parseFloat(scaledTypo.body1?.fontSize as string);

        expect(scaledSize).toBe(defaultSize * 1.5);
      });

      it("should scale all heading sizes", () => {
        const scaleFactor = 1.25;
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: scaleFactor,
        });

        expect(parseFloat(typography.h1?.fontSize as string)).toBeCloseTo(
          2.5 * scaleFactor,
          2
        );
        expect(parseFloat(typography.h2?.fontSize as string)).toBeCloseTo(
          2 * scaleFactor,
          2
        );
        expect(parseFloat(typography.h3?.fontSize as string)).toBeCloseTo(
          1.75 * scaleFactor,
          2
        );
        expect(parseFloat(typography.h4?.fontSize as string)).toBeCloseTo(
          1.5 * scaleFactor,
          2
        );
        expect(parseFloat(typography.h5?.fontSize as string)).toBeCloseTo(
          1.25 * scaleFactor,
          2
        );
        expect(parseFloat(typography.h6?.fontSize as string)).toBeCloseTo(
          1 * scaleFactor,
          2
        );
      });

      it("should handle minimum font size", () => {
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: 0.75,
        });
        expect(parseFloat(typography.body1?.fontSize as string)).toBeCloseTo(
          0.75,
          2
        );
      });

      it("should handle maximum font size", () => {
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          fontSize: 1.5,
        });
        expect(parseFloat(typography.body1?.fontSize as string)).toBeCloseTo(
          1.5,
          2
        );
      });
    });

    describe("line height scaling", () => {
      it("should adjust line height based on setting", () => {
        const normalTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          lineHeight: 1.5,
        });
        const spaciousTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          lineHeight: 2.0,
        });

        // Line height should be proportionally larger
        const normalLineHeight = normalTypo.body1?.lineHeight as number;
        const spaciousLineHeight = spaciousTypo.body1?.lineHeight as number;

        expect(spaciousLineHeight).toBeGreaterThan(normalLineHeight);
      });

      it("should scale line height for headings", () => {
        const normalTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          lineHeight: 1.5,
        });
        const spaciousTypo = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          lineHeight: 2.0,
        });

        const normalH1LineHeight = normalTypo.h1?.lineHeight as number;
        const spaciousH1LineHeight = spaciousTypo.h1?.lineHeight as number;

        expect(spaciousH1LineHeight).toBeGreaterThan(normalH1LineHeight);
      });
    });

    describe("letter spacing", () => {
      it("should apply letter spacing to body text", () => {
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          letterSpacing: 0.05,
        });
        expect(typography.body1?.letterSpacing).toBe("0.05em");
      });

      it("should apply letter spacing to headings", () => {
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          letterSpacing: 0.02,
        });
        expect(typography.h1?.letterSpacing).toBe("0.02em");
      });

      it("should support negative letter spacing", () => {
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          letterSpacing: -0.05,
        });
        expect(typography.body1?.letterSpacing).toBe("-0.05em");
      });

      it("should apply zero letter spacing", () => {
        const typography = createTypography({
          ...DEFAULT_THEME_SETTINGS,
          letterSpacing: 0,
        });
        expect(typography.body1?.letterSpacing).toBe("0em");
      });
    });

    describe("typography variants", () => {
      it("should have all required variants", () => {
        const typography = createTypography(DEFAULT_THEME_SETTINGS);

        expect(typography.h1).toBeDefined();
        expect(typography.h2).toBeDefined();
        expect(typography.h3).toBeDefined();
        expect(typography.h4).toBeDefined();
        expect(typography.h5).toBeDefined();
        expect(typography.h6).toBeDefined();
        expect(typography.body1).toBeDefined();
        expect(typography.body2).toBeDefined();
        expect(typography.subtitle1).toBeDefined();
        expect(typography.subtitle2).toBeDefined();
        expect(typography.button).toBeDefined();
        expect(typography.caption).toBeDefined();
        expect(typography.overline).toBeDefined();
      });

      it("should have lowercase button text for readability", () => {
        const typography = createTypography(DEFAULT_THEME_SETTINGS);
        expect(typography.button?.textTransform).toBe("none");
      });

      it("should have uppercase overline text", () => {
        const typography = createTypography(DEFAULT_THEME_SETTINGS);
        expect(typography.overline?.textTransform).toBe("uppercase");
      });
    });

    describe("combined settings", () => {
      it("should handle all settings together", () => {
        const typography = createTypography({
          mode: "dark",
          fontFamily: "opendyslexic",
          fontSize: 1.25,
          lineHeight: 1.8,
          letterSpacing: 0.03,
        });

        expect(typography.fontFamily).toBe(fontStacks.opendyslexic);
        expect(parseFloat(typography.body1?.fontSize as string)).toBeCloseTo(
          1.25,
          2
        );
        expect(typography.body1?.letterSpacing).toBe("0.03em");
      });
    });
  });
});
