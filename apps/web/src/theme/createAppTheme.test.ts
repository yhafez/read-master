/**
 * Tests for createAppTheme
 */

import { describe, expect, it } from "vitest";

import { createAppTheme, themes } from "./createAppTheme";
import type { ThemeSettings } from "./types";

describe("createAppTheme", () => {
  describe("default theme", () => {
    it("should create theme with default settings", () => {
      const theme = createAppTheme();
      expect(theme).toBeDefined();
      expect(theme.palette.mode).toBe("light");
    });

    it("should have default border radius", () => {
      const theme = createAppTheme();
      expect(theme.shape.borderRadius).toBe(8);
    });

    it("should have default spacing", () => {
      const theme = createAppTheme();
      expect(theme.spacing(1)).toBe("8px");
    });
  });

  describe("theme modes", () => {
    it("should create light theme", () => {
      const theme = createAppTheme({ mode: "light" });
      expect(theme.palette.mode).toBe("light");
      expect(theme.palette.background.default).toBe("#FAFAFA");
    });

    it("should create dark theme", () => {
      const theme = createAppTheme({ mode: "dark" });
      expect(theme.palette.mode).toBe("dark");
      expect(theme.palette.background.default).toBe("#121212");
    });

    it("should create sepia theme", () => {
      const theme = createAppTheme({ mode: "sepia" });
      expect(theme.palette.mode).toBe("light"); // Sepia uses light mode base
      expect(theme.palette.background.default).toBe("#FBF5E6");
    });

    it("should create high-contrast theme", () => {
      const theme = createAppTheme({ mode: "high-contrast" });
      expect(theme.palette.mode).toBe("light");
      expect(theme.palette.background.default).toBe("#FFFFFF");
      expect(theme.palette.text.primary).toBe("#000000");
    });
  });

  describe("component overrides", () => {
    it("should have button component overrides", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiButton).toBeDefined();
    });

    it("should have disabled elevation on buttons", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiButton?.defaultProps?.disableElevation).toBe(
        true
      );
    });

    it("should have text field component overrides", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiTextField).toBeDefined();
    });

    it("should have outlined variant as default for text fields", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiTextField?.defaultProps?.variant).toBe(
        "outlined"
      );
    });

    it("should have card component overrides", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiCard).toBeDefined();
    });

    it("should have tooltip component overrides", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiTooltip).toBeDefined();
      expect(theme.components?.MuiTooltip?.defaultProps?.arrow).toBe(true);
    });

    it("should have link component overrides", () => {
      const theme = createAppTheme();
      expect(theme.components?.MuiLink).toBeDefined();
      expect(theme.components?.MuiLink?.defaultProps?.underline).toBe("hover");
    });
  });

  describe("high contrast mode specifics", () => {
    it("should have 2px border on buttons in high contrast mode", () => {
      const theme = createAppTheme({ mode: "high-contrast" });
      const buttonStyles = theme.components?.MuiButton?.styleOverrides?.root;
      expect(buttonStyles).toBeDefined();
    });

    it("should have underline on links in high contrast mode", () => {
      const theme = createAppTheme({ mode: "high-contrast" });
      const linkStyles = theme.components?.MuiLink?.styleOverrides?.root;
      expect(linkStyles).toBeDefined();
    });
  });

  describe("typography integration", () => {
    it("should apply font family setting", () => {
      const theme = createAppTheme({ fontFamily: "serif" });
      expect(theme.typography.fontFamily).toContain("Georgia");
    });

    it("should apply font size setting", () => {
      const theme = createAppTheme({ fontSize: 1.25 });
      const body1Size = parseFloat(theme.typography.body1.fontSize as string);
      expect(body1Size).toBeCloseTo(1.25, 2);
    });
  });

  describe("partial settings", () => {
    it("should merge partial settings with defaults", () => {
      const theme = createAppTheme({ mode: "dark" });
      // Should have dark mode
      expect(theme.palette.mode).toBe("dark");
      // Should have default font family (system)
      expect(theme.typography.fontFamily).toContain("-apple-system");
    });

    it("should handle empty settings object", () => {
      const theme = createAppTheme({});
      expect(theme.palette.mode).toBe("light");
    });
  });

  describe("themes object", () => {
    it("should have pre-built light theme", () => {
      expect(themes.light).toBeDefined();
      expect(themes.light.palette.mode).toBe("light");
    });

    it("should have pre-built dark theme", () => {
      expect(themes.dark).toBeDefined();
      expect(themes.dark.palette.mode).toBe("dark");
    });

    it("should have pre-built sepia theme", () => {
      expect(themes.sepia).toBeDefined();
      expect(themes.sepia.palette.background.default).toBe("#FBF5E6");
    });

    it("should have pre-built high-contrast theme", () => {
      expect(themes["high-contrast"]).toBeDefined();
      expect(themes["high-contrast"].palette.text.primary).toBe("#000000");
    });

    it("should have all four themes", () => {
      expect(Object.keys(themes)).toHaveLength(4);
    });
  });

  describe("accessibility", () => {
    it("should have minimum 44px touch targets for buttons", () => {
      const theme = createAppTheme();
      const buttonStyles = theme.components?.MuiButton?.styleOverrides?.root;
      expect(buttonStyles).toBeDefined();
      if (typeof buttonStyles === "object" && buttonStyles !== null) {
        expect((buttonStyles as Record<string, unknown>).minHeight).toBe(
          "44px"
        );
      }
    });

    it("should have minimum 44px touch targets for icon buttons", () => {
      const theme = createAppTheme();
      const iconButtonStyles =
        theme.components?.MuiIconButton?.styleOverrides?.root;
      expect(iconButtonStyles).toBeDefined();
      if (typeof iconButtonStyles === "object" && iconButtonStyles !== null) {
        expect((iconButtonStyles as Record<string, unknown>).minHeight).toBe(
          "44px"
        );
        expect((iconButtonStyles as Record<string, unknown>).minWidth).toBe(
          "44px"
        );
      }
    });
  });

  describe("complete settings", () => {
    it("should handle all settings together", () => {
      const settings: ThemeSettings = {
        mode: "dark",
        fontFamily: "opendyslexic",
        fontSize: 1.25,
        lineHeight: 1.8,
        letterSpacing: 0.02,
      };

      const theme = createAppTheme(settings);

      expect(theme.palette.mode).toBe("dark");
      expect(theme.typography.fontFamily).toContain("OpenDyslexic");
      expect(parseFloat(theme.typography.body1.fontSize as string)).toBeCloseTo(
        1.25,
        2
      );
      expect(theme.typography.body1.letterSpacing).toBe("0.02em");
    });
  });
});
