/**
 * Mobile-Responsive Layout Utilities
 *
 * Comprehensive utilities for building responsive layouts supporting
 * screen widths from 320px to 1920px+ with proper breakpoints, hooks,
 * and helper functions for mobile-first development.
 *
 * @module lib/responsive
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Theme } from "@mui/material";
import { useMediaQuery, useTheme } from "@mui/material";
import type { SxProps } from "@mui/system";

// ============================================================================
// Types
// ============================================================================

/** Standard breakpoint names matching MUI defaults */
export type BreakpointKey = "xs" | "sm" | "md" | "lg" | "xl";

/** Extended breakpoints for more granular control */
export type ExtendedBreakpointKey =
  | BreakpointKey
  | "xxs"
  | "mobile"
  | "tablet"
  | "desktop"
  | "wide";

/** Device orientation */
export type Orientation = "portrait" | "landscape";

/** Device type classification */
export type DeviceType = "mobile" | "tablet" | "desktop";

/** Responsive value that can vary by breakpoint */
export type ResponsiveValue<T> = T | Partial<Record<BreakpointKey, T>>;

/** Container width options */
export type ContainerWidth = "xs" | "sm" | "md" | "lg" | "xl" | "fluid";

/** Spacing scale values (MUI default spacing = 8px) */
export type SpacingScale = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

/** Grid column configurations */
export type GridColumns = 1 | 2 | 3 | 4 | 6 | 12;

/** Touch target size validation result */
export interface TouchTargetResult {
  valid: boolean;
  width: number;
  height: number;
  minSize: number;
  issues: string[];
}

/** Screen size information */
export interface ScreenInfo {
  width: number;
  height: number;
  breakpoint: BreakpointKey;
  deviceType: DeviceType;
  orientation: Orientation;
  isTouch: boolean;
  pixelRatio: number;
}

/** Responsive layout configuration */
export interface ResponsiveConfig {
  columns: GridColumns;
  spacing: SpacingScale;
  padding: SpacingScale;
  containerWidth: ContainerWidth;
}

// ============================================================================
// Constants
// ============================================================================

/** MUI default breakpoint values in pixels */
export const BREAKPOINT_VALUES = {
  xs: 0, // Extra small: 0px+
  sm: 600, // Small: 600px+
  md: 900, // Medium: 900px+
  lg: 1200, // Large: 1200px+
  xl: 1536, // Extra large: 1536px+
} as const;

/** Extended breakpoint values for more granular control */
export const EXTENDED_BREAKPOINT_VALUES = {
  ...BREAKPOINT_VALUES,
  xxs: 0, // Very small phones (320px)
  mobile: 320, // Mobile phones (320px-599px)
  tablet: 600, // Tablets (600px-1199px)
  desktop: 1200, // Desktops (1200px+)
  wide: 1920, // Wide screens (1920px+)
} as const;

/** Minimum touch target size per WCAG 2.2 AAA (44x44px) */
export const MIN_TOUCH_TARGET = 44;

/** Recommended comfortable touch target size (48x48px) */
export const COMFORTABLE_TOUCH_TARGET = 48;

/** Default container max widths matching MUI */
export const CONTAINER_MAX_WIDTHS = {
  xs: 444,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
  fluid: "100%",
} as const;

/** Common responsive spacing values by breakpoint */
export const RESPONSIVE_SPACING: Record<BreakpointKey, SpacingScale> = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
} as const;

/** Common responsive padding values by breakpoint */
export const RESPONSIVE_PADDING: Record<BreakpointKey, SpacingScale> = {
  xs: 2,
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6,
} as const;

/** Grid columns by breakpoint for common layouts */
export const RESPONSIVE_COLUMNS: Record<BreakpointKey, GridColumns> = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
} as const;

/** Safe area CSS custom properties for notched devices */
export const SAFE_AREA_VARS = {
  top: "env(safe-area-inset-top, 0px)",
  right: "env(safe-area-inset-right, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: "env(safe-area-inset-left, 0px)",
} as const;

// ============================================================================
// Breakpoint Utilities
// ============================================================================

/**
 * Get the current breakpoint key based on window width
 * @param width - Window width in pixels
 * @returns Current breakpoint key
 */
export function getBreakpointFromWidth(width: number): BreakpointKey {
  if (width >= BREAKPOINT_VALUES.xl) return "xl";
  if (width >= BREAKPOINT_VALUES.lg) return "lg";
  if (width >= BREAKPOINT_VALUES.md) return "md";
  if (width >= BREAKPOINT_VALUES.sm) return "sm";
  return "xs";
}

/**
 * Check if width is at or above a specific breakpoint
 * @param width - Window width in pixels
 * @param breakpoint - Breakpoint to check against
 * @returns True if width is at or above the breakpoint
 */
export function isBreakpointUp(
  width: number,
  breakpoint: BreakpointKey
): boolean {
  return width >= BREAKPOINT_VALUES[breakpoint];
}

/**
 * Check if width is below a specific breakpoint
 * @param width - Window width in pixels
 * @param breakpoint - Breakpoint to check against
 * @returns True if width is below the breakpoint
 */
export function isBreakpointDown(
  width: number,
  breakpoint: BreakpointKey
): boolean {
  return width < BREAKPOINT_VALUES[breakpoint];
}

/**
 * Check if width is between two breakpoints (inclusive of start, exclusive of end)
 * @param width - Window width in pixels
 * @param start - Start breakpoint (inclusive)
 * @param end - End breakpoint (exclusive)
 * @returns True if width is between the breakpoints
 */
export function isBreakpointBetween(
  width: number,
  start: BreakpointKey,
  end: BreakpointKey
): boolean {
  return width >= BREAKPOINT_VALUES[start] && width < BREAKPOINT_VALUES[end];
}

/**
 * Check if width is exactly at a specific breakpoint range
 * @param width - Window width in pixels
 * @param breakpoint - Breakpoint to check
 * @returns True if width is within that breakpoint's range
 */
export function isBreakpointOnly(
  width: number,
  breakpoint: BreakpointKey
): boolean {
  const keys: BreakpointKey[] = ["xs", "sm", "md", "lg", "xl"];
  const index = keys.indexOf(breakpoint);
  const nextBreakpoint = keys[index + 1];

  if (!nextBreakpoint) {
    // xl is the last breakpoint
    return width >= BREAKPOINT_VALUES.xl;
  }

  return isBreakpointBetween(width, breakpoint, nextBreakpoint);
}

// ============================================================================
// Device Detection Utilities
// ============================================================================

/**
 * Determine device type based on width
 * @param width - Window width in pixels
 * @returns Device type classification
 */
export function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINT_VALUES.sm) return "mobile";
  if (width < BREAKPOINT_VALUES.lg) return "tablet";
  return "desktop";
}

/**
 * Check if the device supports touch input
 * @returns True if touch is supported
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get the current screen orientation
 * @param width - Window width
 * @param height - Window height
 * @returns Current orientation
 */
export function getOrientation(width: number, height: number): Orientation {
  return width >= height ? "landscape" : "portrait";
}

/**
 * Get device pixel ratio for high-DPI detection
 * @returns Device pixel ratio (1 = standard, 2+ = retina/high-DPI)
 */
export function getPixelRatio(): number {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}

/**
 * Check if device is high-DPI (retina)
 * @returns True if pixel ratio is greater than 1
 */
export function isHighDPI(): boolean {
  return getPixelRatio() > 1;
}

/**
 * Get comprehensive screen information
 * @param width - Window width
 * @param height - Window height
 * @returns Complete screen information object
 */
export function getScreenInfo(width: number, height: number): ScreenInfo {
  return {
    width,
    height,
    breakpoint: getBreakpointFromWidth(width),
    deviceType: getDeviceType(width),
    orientation: getOrientation(width, height),
    isTouch: isTouchDevice(),
    pixelRatio: getPixelRatio(),
  };
}

// ============================================================================
// Responsive Value Utilities
// ============================================================================

/**
 * Resolve a responsive value based on current breakpoint
 * @param value - Value that may be responsive
 * @param breakpoint - Current breakpoint
 * @returns Resolved value for the breakpoint
 */
export function resolveResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: BreakpointKey
): T | undefined {
  // If it's not an object, return as-is
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value as T;
  }

  const responsiveValue = value as Partial<Record<BreakpointKey, T>>;
  const breakpoints: BreakpointKey[] = ["xs", "sm", "md", "lg", "xl"];
  const currentIndex = breakpoints.indexOf(breakpoint);

  // Start from current breakpoint and work down to find a value
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpoints[i] as BreakpointKey;
    if (bp && bp in responsiveValue) {
      return responsiveValue[bp];
    }
  }

  return undefined;
}

/**
 * Create responsive sx prop values
 * @param values - Object mapping breakpoints to values
 * @returns MUI sx-compatible responsive value
 */
export function createResponsiveSx<T>(
  values: Partial<Record<BreakpointKey, T>>
): T | Record<string, T> {
  const keys = Object.keys(values) as BreakpointKey[];

  // If only one value, return it directly
  if (keys.length === 1 && keys[0]) {
    const firstKey = keys[0];
    return values[firstKey] as T;
  }

  // Return as responsive object for sx prop
  return values as Record<string, T>;
}

// ============================================================================
// Touch Target Utilities
// ============================================================================

/**
 * Validate touch target size meets accessibility requirements
 * @param width - Element width in pixels
 * @param height - Element height in pixels
 * @param minSize - Minimum required size (default: 44px)
 * @returns Validation result with details
 */
export function validateTouchTarget(
  width: number,
  height: number,
  minSize: number = MIN_TOUCH_TARGET
): TouchTargetResult {
  const issues: string[] = [];

  if (width < minSize) {
    issues.push(`Width ${width}px is less than minimum ${minSize}px`);
  }

  if (height < minSize) {
    issues.push(`Height ${height}px is less than minimum ${minSize}px`);
  }

  return {
    valid: issues.length === 0,
    width,
    height,
    minSize,
    issues,
  };
}

/**
 * Get minimum touch target styles for accessibility
 * @param minSize - Minimum size (default: 44px)
 * @returns Styles object for minimum touch target
 */
export function getMinTouchTargetStyles(
  minSize: number = MIN_TOUCH_TARGET
): Record<string, string | number> {
  return {
    minWidth: minSize,
    minHeight: minSize,
  };
}

/**
 * Get comfortable touch target styles
 * @returns Styles object for comfortable touch target (48x48px)
 */
export function getComfortableTouchTargetStyles(): Record<
  string,
  string | number
> {
  return getMinTouchTargetStyles(COMFORTABLE_TOUCH_TARGET);
}

// ============================================================================
// Layout Utilities
// ============================================================================

/**
 * Get responsive layout configuration based on breakpoint
 * @param breakpoint - Current breakpoint
 * @returns Layout configuration for the breakpoint
 */
export function getResponsiveConfig(
  breakpoint: BreakpointKey
): ResponsiveConfig {
  return {
    columns: RESPONSIVE_COLUMNS[breakpoint],
    spacing: RESPONSIVE_SPACING[breakpoint],
    padding: RESPONSIVE_PADDING[breakpoint],
    containerWidth: breakpoint === "xs" ? "fluid" : breakpoint,
  };
}

/**
 * Generate container styles with responsive max-width
 * @param containerWidth - Container width option
 * @returns Container styles
 */
export function getContainerStyles(
  containerWidth: ContainerWidth
): Record<string, string | number> {
  const maxWidth = CONTAINER_MAX_WIDTHS[containerWidth];

  return {
    width: "100%",
    maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
    marginLeft: "auto",
    marginRight: "auto",
  };
}

/**
 * Get responsive padding that accounts for safe areas on notched devices
 * @param base - Base padding value
 * @returns Padding styles with safe area support
 */
export function getSafeAreaPadding(base: number): Record<string, string> {
  return {
    paddingTop: `max(${base}px, ${SAFE_AREA_VARS.top})`,
    paddingRight: `max(${base}px, ${SAFE_AREA_VARS.right})`,
    paddingBottom: `max(${base}px, ${SAFE_AREA_VARS.bottom})`,
    paddingLeft: `max(${base}px, ${SAFE_AREA_VARS.left})`,
  };
}

/**
 * Get bottom navigation safe area padding
 * @param baseHeight - Base navigation height
 * @returns Bottom padding that accounts for device safe area
 */
export function getBottomNavPadding(baseHeight: number): string {
  return `calc(${baseHeight}px + ${SAFE_AREA_VARS.bottom})`;
}

// ============================================================================
// Grid Utilities
// ============================================================================

/**
 * Calculate grid item width as percentage
 * @param columns - Number of columns
 * @param span - Number of columns to span (default: 1)
 * @param gap - Gap between items in pixels
 * @returns CSS width value
 */
export function getGridItemWidth(
  columns: GridColumns,
  span: number = 1,
  gap: number = 0
): string {
  const fraction = span / columns;
  const totalGapWidth = (columns - 1) * gap;
  const gapPerItem = totalGapWidth / columns;

  if (gap === 0) {
    return `${fraction * 100}%`;
  }

  return `calc(${fraction * 100}% - ${gapPerItem}px)`;
}

/**
 * Create responsive grid columns configuration
 * @returns SxProps for grid container
 */
export function createResponsiveGridColumns(): SxProps<Theme> {
  return {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      md: "repeat(3, 1fr)",
      lg: "repeat(4, 1fr)",
      xl: "repeat(6, 1fr)",
    },
    gap: {
      xs: 1,
      sm: 2,
      md: 3,
    },
  };
}

// ============================================================================
// Media Query Utilities
// ============================================================================

/**
 * Create a media query string for minimum width
 * @param breakpoint - Breakpoint key
 * @returns Media query string
 */
export function createMinWidthQuery(breakpoint: BreakpointKey): string {
  return `(min-width: ${BREAKPOINT_VALUES[breakpoint]}px)`;
}

/**
 * Create a media query string for maximum width
 * @param breakpoint - Breakpoint key
 * @returns Media query string
 */
export function createMaxWidthQuery(breakpoint: BreakpointKey): string {
  return `(max-width: ${BREAKPOINT_VALUES[breakpoint] - 0.02}px)`;
}

/**
 * Create media query for pointer type (touch vs mouse)
 * @param pointerType - 'coarse' for touch, 'fine' for mouse
 * @returns Media query string
 */
export function createPointerQuery(pointerType: "coarse" | "fine"): string {
  return `(pointer: ${pointerType})`;
}

/**
 * Create media query for hover capability
 * @param canHover - Whether device supports hover
 * @returns Media query string
 */
export function createHoverQuery(canHover: boolean): string {
  return `(hover: ${canHover ? "hover" : "none"})`;
}

/**
 * Create orientation media query
 * @param orientation - Target orientation
 * @returns Media query string
 */
export function createOrientationQuery(orientation: Orientation): string {
  return `(orientation: ${orientation})`;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get current window dimensions
 * @returns Current width and height, or undefined on server
 */
export function useWindowSize(): { width: number; height: number } | undefined {
  const [size, setSize] = useState<
    { width: number; height: number } | undefined
  >(undefined);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    updateSize();

    // Listen for resize
    window.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return size;
}

/**
 * Hook to get current breakpoint
 * @returns Current breakpoint key
 */
export function useBreakpoint(): BreakpointKey {
  const theme = useTheme();

  const isXl = useMediaQuery(theme.breakpoints.up("xl"));
  const isLg = useMediaQuery(theme.breakpoints.up("lg"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));

  if (isXl) return "xl";
  if (isLg) return "lg";
  if (isMd) return "md";
  if (isSm) return "sm";
  return "xs";
}

/**
 * Hook for checking if current breakpoint is at or above target
 * @param breakpoint - Target breakpoint
 * @returns True if current width is at or above breakpoint
 */
export function useBreakpointUp(breakpoint: BreakpointKey): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up(breakpoint));
}

/**
 * Hook for checking if current breakpoint is below target
 * @param breakpoint - Target breakpoint
 * @returns True if current width is below breakpoint
 */
export function useBreakpointDown(breakpoint: BreakpointKey): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down(breakpoint));
}

/**
 * Hook for checking if current width matches breakpoint exactly
 * @param breakpoint - Target breakpoint
 * @returns True if current width is exactly at breakpoint range
 */
export function useBreakpointOnly(breakpoint: BreakpointKey): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.only(breakpoint));
}

/**
 * Hook for detecting mobile devices
 * @returns True if device is mobile
 */
export function useIsMobile(): boolean {
  return useBreakpointDown("sm");
}

/**
 * Hook for detecting tablet devices
 * @returns True if device is tablet
 */
export function useIsTablet(): boolean {
  const isSmUp = useBreakpointUp("sm");
  const isLgDown = useBreakpointDown("lg");
  return isSmUp && isLgDown;
}

/**
 * Hook for detecting desktop devices
 * @returns True if device is desktop
 */
export function useIsDesktop(): boolean {
  return useBreakpointUp("lg");
}

/**
 * Hook for detecting touch devices
 * @returns True if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  return isTouch;
}

/**
 * Hook for detecting device orientation
 * @returns Current orientation
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateOrientation = () => {
      setOrientation(getOrientation(window.innerWidth, window.innerHeight));
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);

    // Also listen for orientation change event
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Hook for getting complete screen information
 * @returns Screen information or undefined on server
 */
export function useScreenInfo(): ScreenInfo | undefined {
  const size = useWindowSize();
  const [screenInfo, setScreenInfo] = useState<ScreenInfo | undefined>(
    undefined
  );

  useEffect(() => {
    if (size) {
      setScreenInfo(getScreenInfo(size.width, size.height));
    }
  }, [size]);

  return screenInfo;
}

/**
 * Hook for resolving responsive values
 * @param value - Responsive value to resolve
 * @returns Resolved value for current breakpoint
 */
export function useResponsiveValue<T>(
  value: ResponsiveValue<T>
): T | undefined {
  const breakpoint = useBreakpoint();
  return useMemo(
    () => resolveResponsiveValue(value, breakpoint),
    [value, breakpoint]
  );
}

/**
 * Hook for getting responsive layout configuration
 * @returns Responsive layout config for current breakpoint
 */
export function useResponsiveConfig(): ResponsiveConfig {
  const breakpoint = useBreakpoint();
  return useMemo(() => getResponsiveConfig(breakpoint), [breakpoint]);
}

/**
 * Hook for creating debounced resize handler
 * @param callback - Function to call on resize
 * @param delay - Debounce delay in ms (default: 150)
 */
export function useResizeObserver(
  callback: (entry: ResizeObserverEntry) => void,
  delay: number = 150
): (element: HTMLElement | null) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [observer, setObserver] = useState<ResizeObserver | null>(null);

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      // Cleanup previous observer
      if (observer) {
        observer.disconnect();
        setObserver(null);
      }

      // Clear pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }

      if (!element) return;

      // Create new observer
      const newObserver = new ResizeObserver((entries) => {
        const firstEntry = entries[0];
        if (!firstEntry) return;

        // Debounce the callback
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const newTimeout = setTimeout(() => {
          callback(firstEntry);
        }, delay);

        setTimeoutId(newTimeout);
      });

      newObserver.observe(element);
      setObserver(newObserver);
    },
    [callback, delay, observer, timeoutId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [observer, timeoutId]);

  return setRef;
}

/**
 * Hook for checking if viewport matches a custom media query
 * @param query - Media query string
 * @returns True if viewport matches query
 */
export function useCustomMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers use addEventListener/removeEventListener
    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Hook for checking if device prefers reduced motion
 * @returns True if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useCustomMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Hook for checking if device is in dark mode
 * @returns True if device prefers dark color scheme
 */
export function usePrefersDarkMode(): boolean {
  return useCustomMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * Hook for checking coarse pointer (touch) devices
 * @returns True if device has coarse pointer (touch)
 */
export function useCoarsePointer(): boolean {
  return useCustomMediaQuery("(pointer: coarse)");
}

// ============================================================================
// Responsive Style Helpers
// ============================================================================

/**
 * Create hide/show styles for responsive display
 * @param hideBelow - Hide below this breakpoint
 * @param hideAbove - Hide above this breakpoint (optional)
 * @returns SxProps for responsive display
 */
export function createResponsiveDisplay(
  hideBelow?: BreakpointKey,
  hideAbove?: BreakpointKey
): SxProps<Theme> {
  const display: Record<string, string> = {};

  if (hideBelow) {
    const breakpoints: BreakpointKey[] = ["xs", "sm", "md", "lg", "xl"];
    const hideIndex = breakpoints.indexOf(hideBelow);

    for (let i = 0; i < hideIndex; i++) {
      const bp = breakpoints[i];
      if (bp) {
        display[bp] = "none";
      }
    }
  }

  if (hideAbove) {
    display[hideAbove] = "none";
  }

  return { display };
}

/**
 * Create responsive font size based on viewport
 * @param minSize - Minimum font size in pixels
 * @param maxSize - Maximum font size in pixels
 * @param minWidth - Minimum viewport width (default: 320px)
 * @param maxWidth - Maximum viewport width (default: 1200px)
 * @returns CSS clamp expression for fluid typography
 */
export function createFluidFontSize(
  minSize: number,
  maxSize: number,
  minWidth: number = 320,
  maxWidth: number = 1200
): string {
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minSize;

  return `clamp(${minSize}px, ${yAxisIntersection.toFixed(4)}px + ${(
    slope * 100
  ).toFixed(4)}vw, ${maxSize}px)`;
}

/**
 * Create responsive spacing value
 * @param mobile - Mobile spacing value
 * @param tablet - Tablet spacing value
 * @param desktop - Desktop spacing value
 * @returns Responsive spacing object
 */
export function createResponsiveSpacing(
  mobile: SpacingScale,
  tablet: SpacingScale,
  desktop: SpacingScale
): Partial<Record<BreakpointKey, SpacingScale>> {
  return {
    xs: mobile,
    sm: tablet,
    lg: desktop,
  };
}
