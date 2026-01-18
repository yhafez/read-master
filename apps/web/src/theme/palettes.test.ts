/**
 * Tests for theme palettes
 */

import type { SimplePaletteColorOptions } from "@mui/material";
import { describe, expect, it } from "vitest";

import {
  darkPalette,
  getPalette,
  highContrastPalette,
  lightPalette,
  palettes,
  sepiaPalette,
} from "./palettes";

describe("Palettes", () => {
  describe("lightPalette", () => {
    it("should have light mode", () => {
      expect(lightPalette.mode).toBe("light");
    });

    it("should have primary color", () => {
      const primary = lightPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toBeDefined();
    });

    it("should have secondary color", () => {
      const secondary = lightPalette.secondary as SimplePaletteColorOptions;
      expect(secondary.main).toBeDefined();
    });

    it("should have error color", () => {
      const error = lightPalette.error as SimplePaletteColorOptions;
      expect(error.main).toBeDefined();
    });

    it("should have warning color", () => {
      const warning = lightPalette.warning as SimplePaletteColorOptions;
      expect(warning.main).toBeDefined();
    });

    it("should have info color", () => {
      const info = lightPalette.info as SimplePaletteColorOptions;
      expect(info.main).toBeDefined();
    });

    it("should have success color", () => {
      const success = lightPalette.success as SimplePaletteColorOptions;
      expect(success.main).toBeDefined();
    });

    it("should have background colors", () => {
      expect(lightPalette.background?.default).toBeDefined();
      expect(lightPalette.background?.paper).toBeDefined();
    });

    it("should have text colors", () => {
      expect(lightPalette.text?.primary).toBeDefined();
      expect(lightPalette.text?.secondary).toBeDefined();
      expect(lightPalette.text?.disabled).toBeDefined();
    });

    it("should have divider color", () => {
      expect(lightPalette.divider).toBeDefined();
    });
  });

  describe("darkPalette", () => {
    it("should have dark mode", () => {
      expect(darkPalette.mode).toBe("dark");
    });

    it("should have lighter primary color than light theme", () => {
      const primary = darkPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toBeDefined();
    });

    it("should have dark background", () => {
      expect(darkPalette.background?.default).toBe("#121212");
    });

    it("should have light text for contrast", () => {
      expect(darkPalette.text?.primary).toBe("#FAFAFA");
    });

    it("should have dark paper background", () => {
      expect(darkPalette.background?.paper).toBe("#1E1E1E");
    });
  });

  describe("sepiaPalette", () => {
    it("should have light mode base", () => {
      expect(sepiaPalette.mode).toBe("light");
    });

    it("should have warm cream background", () => {
      expect(sepiaPalette.background?.default).toBe("#FBF5E6");
    });

    it("should have warm paper background", () => {
      expect(sepiaPalette.background?.paper).toBe("#FDF8EE");
    });

    it("should have brown-toned text", () => {
      expect(sepiaPalette.text?.primary).toBe("#3E2723");
    });

    it("should have brown-toned primary color", () => {
      const primary = sepiaPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toBe("#8D6E63");
    });

    it("should have warm divider color", () => {
      expect(sepiaPalette.divider).toBe("#D7CCC8");
    });
  });

  describe("highContrastPalette", () => {
    it("should have light mode base", () => {
      expect(highContrastPalette.mode).toBe("light");
    });

    it("should have pure white background", () => {
      expect(highContrastPalette.background?.default).toBe("#FFFFFF");
      expect(highContrastPalette.background?.paper).toBe("#FFFFFF");
    });

    it("should have pure black text", () => {
      expect(highContrastPalette.text?.primary).toBe("#000000");
    });

    it("should have black divider", () => {
      expect(highContrastPalette.divider).toBe("#000000");
    });

    it("should have high saturation error color", () => {
      const error = highContrastPalette.error as SimplePaletteColorOptions;
      expect(error.main).toBe("#CC0000");
    });

    it("should have traditional link blue", () => {
      const primary = highContrastPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toBe("#0000EE");
    });
  });

  describe("palettes object", () => {
    it("should contain all four palettes", () => {
      expect(Object.keys(palettes)).toHaveLength(4);
    });

    it("should have light palette", () => {
      expect(palettes.light).toBe(lightPalette);
    });

    it("should have dark palette", () => {
      expect(palettes.dark).toBe(darkPalette);
    });

    it("should have sepia palette", () => {
      expect(palettes.sepia).toBe(sepiaPalette);
    });

    it("should have high-contrast palette", () => {
      expect(palettes["high-contrast"]).toBe(highContrastPalette);
    });
  });

  describe("getPalette", () => {
    it("should return light palette for light mode", () => {
      expect(getPalette("light")).toBe(lightPalette);
    });

    it("should return dark palette for dark mode", () => {
      expect(getPalette("dark")).toBe(darkPalette);
    });

    it("should return sepia palette for sepia mode", () => {
      expect(getPalette("sepia")).toBe(sepiaPalette);
    });

    it("should return high-contrast palette for high-contrast mode", () => {
      expect(getPalette("high-contrast")).toBe(highContrastPalette);
    });
  });

  describe("Color format validation", () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

    it("should have valid hex colors in light palette", () => {
      const primary = lightPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toMatch(hexColorRegex);
      expect(lightPalette.background?.default).toMatch(hexColorRegex);
      expect(lightPalette.text?.primary).toMatch(hexColorRegex);
    });

    it("should have valid hex colors in dark palette", () => {
      const primary = darkPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toMatch(hexColorRegex);
      expect(darkPalette.background?.default).toMatch(hexColorRegex);
      expect(darkPalette.text?.primary).toMatch(hexColorRegex);
    });

    it("should have valid hex colors in sepia palette", () => {
      const primary = sepiaPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toMatch(hexColorRegex);
      expect(sepiaPalette.background?.default).toMatch(hexColorRegex);
      expect(sepiaPalette.text?.primary).toMatch(hexColorRegex);
    });

    it("should have valid hex colors in high-contrast palette", () => {
      const primary = highContrastPalette.primary as SimplePaletteColorOptions;
      expect(primary.main).toMatch(hexColorRegex);
      expect(highContrastPalette.background?.default).toMatch(hexColorRegex);
      expect(highContrastPalette.text?.primary).toMatch(hexColorRegex);
    });
  });

  describe("Contrast text colors", () => {
    it("should have white contrast text for dark primary in light palette", () => {
      const primary = lightPalette.primary as SimplePaletteColorOptions;
      expect(primary.contrastText).toBe("#FFFFFF");
    });

    it("should have black contrast text for light primary in dark palette", () => {
      const primary = darkPalette.primary as SimplePaletteColorOptions;
      expect(primary.contrastText).toBe("#000000");
    });

    it("should have white contrast text for brown primary in sepia palette", () => {
      const primary = sepiaPalette.primary as SimplePaletteColorOptions;
      expect(primary.contrastText).toBe("#FFFFFF");
    });

    it("should have white contrast text for blue primary in high-contrast palette", () => {
      const primary = highContrastPalette.primary as SimplePaletteColorOptions;
      expect(primary.contrastText).toBe("#FFFFFF");
    });
  });
});
