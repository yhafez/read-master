/**
 * Tests for Mobile-Responsive Layout Utilities
 *
 * @module lib/responsive.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  // Constants
  BREAKPOINT_VALUES,
  EXTENDED_BREAKPOINT_VALUES,
  MIN_TOUCH_TARGET,
  COMFORTABLE_TOUCH_TARGET,
  CONTAINER_MAX_WIDTHS,
  RESPONSIVE_SPACING,
  RESPONSIVE_PADDING,
  RESPONSIVE_COLUMNS,
  SAFE_AREA_VARS,
  // Breakpoint utilities
  getBreakpointFromWidth,
  isBreakpointUp,
  isBreakpointDown,
  isBreakpointBetween,
  isBreakpointOnly,
  // Device detection
  getDeviceType,
  isTouchDevice,
  getOrientation,
  getPixelRatio,
  isHighDPI,
  getScreenInfo,
  // Responsive value utilities
  resolveResponsiveValue,
  createResponsiveSx,
  // Touch target utilities
  validateTouchTarget,
  getMinTouchTargetStyles,
  getComfortableTouchTargetStyles,
  // Layout utilities
  getResponsiveConfig,
  getContainerStyles,
  getSafeAreaPadding,
  getBottomNavPadding,
  // Grid utilities
  getGridItemWidth,
  createResponsiveGridColumns,
  // Media query utilities
  createMinWidthQuery,
  createMaxWidthQuery,
  createPointerQuery,
  createHoverQuery,
  createOrientationQuery,
  // Style helpers
  createResponsiveDisplay,
  createFluidFontSize,
  createResponsiveSpacing,
} from "./responsive";

// ============================================================================
// Test Setup
// ============================================================================

// Store original values for reference (available if needed for restore)

// Mock window object for tests
function mockWindowWithDimensions(width: number, height: number) {
  const mockWindow = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 1,
    matchMedia: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(globalThis, "window", {
    value: mockWindow,
    writable: true,
    configurable: true,
  });

  return mockWindow;
}

function mockNavigator(maxTouchPoints: number) {
  Object.defineProperty(globalThis, "navigator", {
    value: { maxTouchPoints },
    writable: true,
    configurable: true,
  });
}

// ============================================================================
// Constants Tests
// ============================================================================

describe("Responsive Constants", () => {
  describe("BREAKPOINT_VALUES", () => {
    it("should have correct MUI default values", () => {
      expect(BREAKPOINT_VALUES.xs).toBe(0);
      expect(BREAKPOINT_VALUES.sm).toBe(600);
      expect(BREAKPOINT_VALUES.md).toBe(900);
      expect(BREAKPOINT_VALUES.lg).toBe(1200);
      expect(BREAKPOINT_VALUES.xl).toBe(1536);
    });
  });

  describe("EXTENDED_BREAKPOINT_VALUES", () => {
    it("should include all standard breakpoints", () => {
      expect(EXTENDED_BREAKPOINT_VALUES.xs).toBe(BREAKPOINT_VALUES.xs);
      expect(EXTENDED_BREAKPOINT_VALUES.sm).toBe(BREAKPOINT_VALUES.sm);
      expect(EXTENDED_BREAKPOINT_VALUES.md).toBe(BREAKPOINT_VALUES.md);
      expect(EXTENDED_BREAKPOINT_VALUES.lg).toBe(BREAKPOINT_VALUES.lg);
      expect(EXTENDED_BREAKPOINT_VALUES.xl).toBe(BREAKPOINT_VALUES.xl);
    });

    it("should have extended breakpoint values", () => {
      expect(EXTENDED_BREAKPOINT_VALUES.xxs).toBe(0);
      expect(EXTENDED_BREAKPOINT_VALUES.mobile).toBe(320);
      expect(EXTENDED_BREAKPOINT_VALUES.tablet).toBe(600);
      expect(EXTENDED_BREAKPOINT_VALUES.desktop).toBe(1200);
      expect(EXTENDED_BREAKPOINT_VALUES.wide).toBe(1920);
    });
  });

  describe("Touch Target Constants", () => {
    it("should have correct minimum touch target (WCAG AAA)", () => {
      expect(MIN_TOUCH_TARGET).toBe(44);
    });

    it("should have comfortable touch target size", () => {
      expect(COMFORTABLE_TOUCH_TARGET).toBe(48);
    });
  });

  describe("CONTAINER_MAX_WIDTHS", () => {
    it("should have correct container widths", () => {
      expect(CONTAINER_MAX_WIDTHS.xs).toBe(444);
      expect(CONTAINER_MAX_WIDTHS.sm).toBe(600);
      expect(CONTAINER_MAX_WIDTHS.md).toBe(900);
      expect(CONTAINER_MAX_WIDTHS.lg).toBe(1200);
      expect(CONTAINER_MAX_WIDTHS.xl).toBe(1536);
      expect(CONTAINER_MAX_WIDTHS.fluid).toBe("100%");
    });
  });

  describe("RESPONSIVE_SPACING", () => {
    it("should have spacing values for all breakpoints", () => {
      expect(RESPONSIVE_SPACING.xs).toBe(1);
      expect(RESPONSIVE_SPACING.sm).toBe(2);
      expect(RESPONSIVE_SPACING.md).toBe(3);
      expect(RESPONSIVE_SPACING.lg).toBe(4);
      expect(RESPONSIVE_SPACING.xl).toBe(5);
    });
  });

  describe("RESPONSIVE_PADDING", () => {
    it("should have padding values for all breakpoints", () => {
      expect(RESPONSIVE_PADDING.xs).toBe(2);
      expect(RESPONSIVE_PADDING.sm).toBe(3);
      expect(RESPONSIVE_PADDING.md).toBe(4);
      expect(RESPONSIVE_PADDING.lg).toBe(5);
      expect(RESPONSIVE_PADDING.xl).toBe(6);
    });
  });

  describe("RESPONSIVE_COLUMNS", () => {
    it("should have column values for all breakpoints", () => {
      expect(RESPONSIVE_COLUMNS.xs).toBe(1);
      expect(RESPONSIVE_COLUMNS.sm).toBe(2);
      expect(RESPONSIVE_COLUMNS.md).toBe(3);
      expect(RESPONSIVE_COLUMNS.lg).toBe(4);
      expect(RESPONSIVE_COLUMNS.xl).toBe(6);
    });
  });

  describe("SAFE_AREA_VARS", () => {
    it("should have correct CSS env variables", () => {
      expect(SAFE_AREA_VARS.top).toBe("env(safe-area-inset-top, 0px)");
      expect(SAFE_AREA_VARS.right).toBe("env(safe-area-inset-right, 0px)");
      expect(SAFE_AREA_VARS.bottom).toBe("env(safe-area-inset-bottom, 0px)");
      expect(SAFE_AREA_VARS.left).toBe("env(safe-area-inset-left, 0px)");
    });
  });
});

// ============================================================================
// Breakpoint Utilities Tests
// ============================================================================

describe("Breakpoint Utilities", () => {
  describe("getBreakpointFromWidth", () => {
    it("should return xs for widths under 600px", () => {
      expect(getBreakpointFromWidth(0)).toBe("xs");
      expect(getBreakpointFromWidth(320)).toBe("xs");
      expect(getBreakpointFromWidth(599)).toBe("xs");
    });

    it("should return sm for widths 600-899px", () => {
      expect(getBreakpointFromWidth(600)).toBe("sm");
      expect(getBreakpointFromWidth(750)).toBe("sm");
      expect(getBreakpointFromWidth(899)).toBe("sm");
    });

    it("should return md for widths 900-1199px", () => {
      expect(getBreakpointFromWidth(900)).toBe("md");
      expect(getBreakpointFromWidth(1050)).toBe("md");
      expect(getBreakpointFromWidth(1199)).toBe("md");
    });

    it("should return lg for widths 1200-1535px", () => {
      expect(getBreakpointFromWidth(1200)).toBe("lg");
      expect(getBreakpointFromWidth(1400)).toBe("lg");
      expect(getBreakpointFromWidth(1535)).toBe("lg");
    });

    it("should return xl for widths 1536px+", () => {
      expect(getBreakpointFromWidth(1536)).toBe("xl");
      expect(getBreakpointFromWidth(1920)).toBe("xl");
      expect(getBreakpointFromWidth(2560)).toBe("xl");
    });
  });

  describe("isBreakpointUp", () => {
    it("should return true when width is at or above breakpoint", () => {
      expect(isBreakpointUp(600, "sm")).toBe(true);
      expect(isBreakpointUp(900, "md")).toBe(true);
      expect(isBreakpointUp(1500, "lg")).toBe(true);
    });

    it("should return false when width is below breakpoint", () => {
      expect(isBreakpointUp(599, "sm")).toBe(false);
      expect(isBreakpointUp(899, "md")).toBe(false);
      expect(isBreakpointUp(1199, "lg")).toBe(false);
    });

    it("should always return true for xs", () => {
      expect(isBreakpointUp(0, "xs")).toBe(true);
      expect(isBreakpointUp(320, "xs")).toBe(true);
    });
  });

  describe("isBreakpointDown", () => {
    it("should return true when width is below breakpoint", () => {
      expect(isBreakpointDown(599, "sm")).toBe(true);
      expect(isBreakpointDown(899, "md")).toBe(true);
    });

    it("should return false when width is at or above breakpoint", () => {
      expect(isBreakpointDown(600, "sm")).toBe(false);
      expect(isBreakpointDown(900, "md")).toBe(false);
    });
  });

  describe("isBreakpointBetween", () => {
    it("should return true when width is between breakpoints", () => {
      expect(isBreakpointBetween(700, "sm", "md")).toBe(true);
      expect(isBreakpointBetween(1000, "md", "lg")).toBe(true);
    });

    it("should include start breakpoint", () => {
      expect(isBreakpointBetween(600, "sm", "md")).toBe(true);
    });

    it("should exclude end breakpoint", () => {
      expect(isBreakpointBetween(900, "sm", "md")).toBe(false);
    });

    it("should return false when outside range", () => {
      expect(isBreakpointBetween(400, "sm", "md")).toBe(false);
      expect(isBreakpointBetween(1000, "sm", "md")).toBe(false);
    });
  });

  describe("isBreakpointOnly", () => {
    it("should return true for exact breakpoint range", () => {
      expect(isBreakpointOnly(320, "xs")).toBe(true);
      expect(isBreakpointOnly(700, "sm")).toBe(true);
      expect(isBreakpointOnly(1000, "md")).toBe(true);
      expect(isBreakpointOnly(1300, "lg")).toBe(true);
    });

    it("should return false for other breakpoints", () => {
      expect(isBreakpointOnly(700, "xs")).toBe(false);
      expect(isBreakpointOnly(320, "sm")).toBe(false);
    });

    it("should handle xl (last breakpoint)", () => {
      expect(isBreakpointOnly(1600, "xl")).toBe(true);
      expect(isBreakpointOnly(2560, "xl")).toBe(true);
    });
  });
});

// ============================================================================
// Device Detection Tests
// ============================================================================

describe("Device Detection Utilities", () => {
  describe("getDeviceType", () => {
    it("should return mobile for widths under 600px", () => {
      expect(getDeviceType(320)).toBe("mobile");
      expect(getDeviceType(599)).toBe("mobile");
    });

    it("should return tablet for widths 600-1199px", () => {
      expect(getDeviceType(600)).toBe("tablet");
      expect(getDeviceType(900)).toBe("tablet");
      expect(getDeviceType(1199)).toBe("tablet");
    });

    it("should return desktop for widths 1200px+", () => {
      expect(getDeviceType(1200)).toBe("desktop");
      expect(getDeviceType(1920)).toBe("desktop");
    });
  });

  describe("isTouchDevice", () => {
    beforeEach(() => {
      mockWindowWithDimensions(1024, 768);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return false when no touch support", () => {
      mockNavigator(0);
      expect(isTouchDevice()).toBe(false);
    });

    it("should return true when maxTouchPoints > 0", () => {
      mockNavigator(1);
      expect(isTouchDevice()).toBe(true);
    });
  });

  describe("getOrientation", () => {
    it("should return landscape when width >= height", () => {
      expect(getOrientation(1024, 768)).toBe("landscape");
      expect(getOrientation(800, 800)).toBe("landscape"); // Equal is landscape
    });

    it("should return portrait when width < height", () => {
      expect(getOrientation(768, 1024)).toBe("portrait");
      expect(getOrientation(375, 812)).toBe("portrait");
    });
  });

  describe("getPixelRatio", () => {
    beforeEach(() => {
      mockWindowWithDimensions(1024, 768);
    });

    it("should return 1 by default", () => {
      expect(getPixelRatio()).toBe(1);
    });

    it("should return devicePixelRatio when set", () => {
      Object.defineProperty(globalThis.window, "devicePixelRatio", {
        value: 2,
        writable: true,
        configurable: true,
      });
      expect(getPixelRatio()).toBe(2);
    });
  });

  describe("isHighDPI", () => {
    beforeEach(() => {
      mockWindowWithDimensions(1024, 768);
    });

    it("should return false for standard displays (ratio 1)", () => {
      Object.defineProperty(globalThis.window, "devicePixelRatio", {
        value: 1,
        writable: true,
        configurable: true,
      });
      expect(isHighDPI()).toBe(false);
    });

    it("should return true for retina displays (ratio > 1)", () => {
      Object.defineProperty(globalThis.window, "devicePixelRatio", {
        value: 2,
        writable: true,
        configurable: true,
      });
      expect(isHighDPI()).toBe(true);
    });
  });

  describe("getScreenInfo", () => {
    beforeEach(() => {
      mockWindowWithDimensions(1024, 768);
      mockNavigator(0);
    });

    it("should return complete screen information", () => {
      const info = getScreenInfo(1024, 768);

      expect(info.width).toBe(1024);
      expect(info.height).toBe(768);
      expect(info.breakpoint).toBe("md");
      expect(info.deviceType).toBe("tablet");
      expect(info.orientation).toBe("landscape");
      expect(info.isTouch).toBe(false);
      expect(info.pixelRatio).toBe(1);
    });

    it("should detect mobile screen", () => {
      const info = getScreenInfo(375, 812);

      expect(info.breakpoint).toBe("xs");
      expect(info.deviceType).toBe("mobile");
      expect(info.orientation).toBe("portrait");
    });

    it("should detect desktop screen", () => {
      const info = getScreenInfo(1920, 1080);

      expect(info.breakpoint).toBe("xl");
      expect(info.deviceType).toBe("desktop");
      expect(info.orientation).toBe("landscape");
    });
  });
});

// ============================================================================
// Responsive Value Utilities Tests
// ============================================================================

describe("Responsive Value Utilities", () => {
  describe("resolveResponsiveValue", () => {
    it("should return primitive value as-is", () => {
      expect(resolveResponsiveValue(16, "md")).toBe(16);
      expect(resolveResponsiveValue("100%", "lg")).toBe("100%");
      expect(resolveResponsiveValue(true, "xs")).toBe(true);
    });

    it("should resolve value for exact breakpoint", () => {
      const value = { xs: 1, md: 2, xl: 3 };
      expect(resolveResponsiveValue(value, "xs")).toBe(1);
      expect(resolveResponsiveValue(value, "md")).toBe(2);
      expect(resolveResponsiveValue(value, "xl")).toBe(3);
    });

    it("should fall back to lower breakpoint when not specified", () => {
      const value = { xs: 1, lg: 4 };
      expect(resolveResponsiveValue(value, "sm")).toBe(1); // Falls back to xs
      expect(resolveResponsiveValue(value, "md")).toBe(1); // Falls back to xs
      expect(resolveResponsiveValue(value, "xl")).toBe(4); // Falls back to lg
    });

    it("should return undefined when no value found", () => {
      const value = { md: 2 };
      expect(resolveResponsiveValue(value, "xs")).toBeUndefined();
      expect(resolveResponsiveValue(value, "sm")).toBeUndefined();
    });

    it("should handle null and arrays", () => {
      expect(
        resolveResponsiveValue(null as unknown as number, "xs")
      ).toBeNull();
      expect(resolveResponsiveValue([1, 2, 3], "xs")).toEqual([1, 2, 3]);
    });
  });

  describe("createResponsiveSx", () => {
    it("should return single value directly", () => {
      const result = createResponsiveSx({ xs: 16 });
      expect(result).toBe(16);
    });

    it("should return responsive object for multiple values", () => {
      const values = { xs: 8, md: 16, lg: 24 };
      const result = createResponsiveSx(values);
      expect(result).toEqual(values);
    });
  });
});

// ============================================================================
// Touch Target Utilities Tests
// ============================================================================

describe("Touch Target Utilities", () => {
  describe("validateTouchTarget", () => {
    it("should validate compliant touch targets", () => {
      const result = validateTouchTarget(44, 44);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect width issues", () => {
      const result = validateTouchTarget(32, 44);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("Width");
    });

    it("should detect height issues", () => {
      const result = validateTouchTarget(44, 32);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("Height");
    });

    it("should detect both dimensions", () => {
      const result = validateTouchTarget(30, 30);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it("should use custom minimum size", () => {
      const result = validateTouchTarget(44, 44, 48);
      expect(result.valid).toBe(false);
      expect(result.minSize).toBe(48);
    });

    it("should include dimensions in result", () => {
      const result = validateTouchTarget(50, 60);
      expect(result.width).toBe(50);
      expect(result.height).toBe(60);
    });
  });

  describe("getMinTouchTargetStyles", () => {
    it("should return default minimum styles", () => {
      const styles = getMinTouchTargetStyles();
      expect(styles.minWidth).toBe(44);
      expect(styles.minHeight).toBe(44);
    });

    it("should use custom minimum size", () => {
      const styles = getMinTouchTargetStyles(48);
      expect(styles.minWidth).toBe(48);
      expect(styles.minHeight).toBe(48);
    });
  });

  describe("getComfortableTouchTargetStyles", () => {
    it("should return comfortable size (48px)", () => {
      const styles = getComfortableTouchTargetStyles();
      expect(styles.minWidth).toBe(48);
      expect(styles.minHeight).toBe(48);
    });
  });
});

// ============================================================================
// Layout Utilities Tests
// ============================================================================

describe("Layout Utilities", () => {
  describe("getResponsiveConfig", () => {
    it("should return config for xs breakpoint", () => {
      const config = getResponsiveConfig("xs");
      expect(config.columns).toBe(1);
      expect(config.spacing).toBe(1);
      expect(config.padding).toBe(2);
      expect(config.containerWidth).toBe("fluid");
    });

    it("should return config for md breakpoint", () => {
      const config = getResponsiveConfig("md");
      expect(config.columns).toBe(3);
      expect(config.spacing).toBe(3);
      expect(config.padding).toBe(4);
      expect(config.containerWidth).toBe("md");
    });

    it("should return config for xl breakpoint", () => {
      const config = getResponsiveConfig("xl");
      expect(config.columns).toBe(6);
      expect(config.spacing).toBe(5);
      expect(config.padding).toBe(6);
      expect(config.containerWidth).toBe("xl");
    });
  });

  describe("getContainerStyles", () => {
    it("should return numeric max-width for fixed containers", () => {
      const styles = getContainerStyles("md");
      expect(styles.maxWidth).toBe("900px");
      expect(styles.width).toBe("100%");
      expect(styles.marginLeft).toBe("auto");
      expect(styles.marginRight).toBe("auto");
    });

    it("should return 100% for fluid container", () => {
      const styles = getContainerStyles("fluid");
      expect(styles.maxWidth).toBe("100%");
    });
  });

  describe("getSafeAreaPadding", () => {
    it("should return CSS with safe area env variables", () => {
      const padding = getSafeAreaPadding(16);
      expect(padding.paddingTop).toContain("16px");
      expect(padding.paddingTop).toContain("safe-area-inset-top");
      expect(padding.paddingRight).toContain("safe-area-inset-right");
      expect(padding.paddingBottom).toContain("safe-area-inset-bottom");
      expect(padding.paddingLeft).toContain("safe-area-inset-left");
    });
  });

  describe("getBottomNavPadding", () => {
    it("should return calc with safe area", () => {
      const padding = getBottomNavPadding(56);
      expect(padding).toContain("56px");
      expect(padding).toContain("safe-area-inset-bottom");
    });
  });
});

// ============================================================================
// Grid Utilities Tests
// ============================================================================

describe("Grid Utilities", () => {
  describe("getGridItemWidth", () => {
    it("should calculate simple percentages without gap", () => {
      expect(getGridItemWidth(1)).toBe("100%");
      expect(getGridItemWidth(2)).toBe("50%");
      expect(getGridItemWidth(3)).toBe("33.33333333333333%");
      expect(getGridItemWidth(4)).toBe("25%");
    });

    it("should handle span", () => {
      expect(getGridItemWidth(4, 2)).toBe("50%");
      expect(getGridItemWidth(12, 6)).toBe("50%");
    });

    it("should account for gap", () => {
      const width = getGridItemWidth(2, 1, 16);
      expect(width).toContain("calc");
      expect(width).toContain("50%");
    });
  });

  describe("createResponsiveGridColumns", () => {
    it("should return responsive grid configuration", () => {
      const gridConfig = createResponsiveGridColumns() as Record<
        string,
        unknown
      >;
      expect(gridConfig["display"]).toBe("grid");
      expect(gridConfig["gridTemplateColumns"]).toEqual({
        xs: "1fr",
        sm: "repeat(2, 1fr)",
        md: "repeat(3, 1fr)",
        lg: "repeat(4, 1fr)",
        xl: "repeat(6, 1fr)",
      });
      expect(gridConfig["gap"]).toEqual({
        xs: 1,
        sm: 2,
        md: 3,
      });
    });
  });
});

// ============================================================================
// Media Query Utilities Tests
// ============================================================================

describe("Media Query Utilities", () => {
  describe("createMinWidthQuery", () => {
    it("should create min-width media query", () => {
      expect(createMinWidthQuery("sm")).toBe("(min-width: 600px)");
      expect(createMinWidthQuery("lg")).toBe("(min-width: 1200px)");
    });
  });

  describe("createMaxWidthQuery", () => {
    it("should create max-width media query with offset", () => {
      expect(createMaxWidthQuery("sm")).toBe("(max-width: 599.98px)");
      expect(createMaxWidthQuery("lg")).toBe("(max-width: 1199.98px)");
    });
  });

  describe("createPointerQuery", () => {
    it("should create pointer media queries", () => {
      expect(createPointerQuery("coarse")).toBe("(pointer: coarse)");
      expect(createPointerQuery("fine")).toBe("(pointer: fine)");
    });
  });

  describe("createHoverQuery", () => {
    it("should create hover media queries", () => {
      expect(createHoverQuery(true)).toBe("(hover: hover)");
      expect(createHoverQuery(false)).toBe("(hover: none)");
    });
  });

  describe("createOrientationQuery", () => {
    it("should create orientation media queries", () => {
      expect(createOrientationQuery("portrait")).toBe(
        "(orientation: portrait)"
      );
      expect(createOrientationQuery("landscape")).toBe(
        "(orientation: landscape)"
      );
    });
  });
});

// ============================================================================
// Style Helpers Tests
// ============================================================================

describe("Style Helpers", () => {
  describe("createResponsiveDisplay", () => {
    it("should hide below breakpoint", () => {
      const sx = createResponsiveDisplay("md");
      expect(sx).toEqual({
        display: {
          xs: "none",
          sm: "none",
        },
      });
    });

    it("should hide above breakpoint", () => {
      const sx = createResponsiveDisplay(undefined, "lg");
      expect(sx).toEqual({
        display: {
          lg: "none",
        },
      });
    });

    it("should handle both hideBelow and hideAbove", () => {
      const sx = createResponsiveDisplay("sm", "xl");
      expect(sx).toEqual({
        display: {
          xs: "none",
          xl: "none",
        },
      });
    });

    it("should return empty display object when no params", () => {
      const sx = createResponsiveDisplay();
      expect(sx).toEqual({ display: {} });
    });
  });

  describe("createFluidFontSize", () => {
    it("should create clamp expression", () => {
      const fontSize = createFluidFontSize(14, 18);
      expect(fontSize).toContain("clamp");
      expect(fontSize).toContain("14px");
      expect(fontSize).toContain("18px");
      expect(fontSize).toContain("vw");
    });

    it("should use custom viewport widths", () => {
      const fontSize = createFluidFontSize(16, 24, 400, 1600);
      expect(fontSize).toContain("clamp");
      expect(fontSize).toContain("16px");
      expect(fontSize).toContain("24px");
    });
  });

  describe("createResponsiveSpacing", () => {
    it("should create spacing object", () => {
      const spacing = createResponsiveSpacing(1, 2, 4);
      expect(spacing.xs).toBe(1);
      expect(spacing.sm).toBe(2);
      expect(spacing.lg).toBe(4);
    });
  });
});
