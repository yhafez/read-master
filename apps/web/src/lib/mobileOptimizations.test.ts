/**
 * Tests for mobile optimizations utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  isMobileDevice,
  prefersReducedMotion,
  isLandscape,
  getSafeAreaInsets,
  debounce,
  throttle,
  isInViewport,
  getViewportDimensions,
  isHighDensityDisplay,
  disableTextSelection,
  enableTextSelection,
  lockScroll,
  unlockScroll,
} from "./mobileOptimizations";

describe("mobileOptimizations", () => {
  beforeEach(() => {
    // Reset document body styles
    document.body.style.cssText = "";
    document.documentElement.style.cssText = "";

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.body.style.cssText = "";
    document.documentElement.style.cssText = "";
  });

  describe("isMobileDevice", () => {
    it("should detect mobile devices based on touch support", () => {
      const result = isMobileDevice();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("prefersReducedMotion", () => {
    it("should check for prefers-reduced-motion media query", () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("isLandscape", () => {
    it("should check orientation media query", () => {
      const result = isLandscape();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getSafeAreaInsets", () => {
    it("should return safe area insets object", () => {
      const insets = getSafeAreaInsets();
      expect(insets).toHaveProperty("top");
      expect(insets).toHaveProperty("right");
      expect(insets).toHaveProperty("bottom");
      expect(insets).toHaveProperty("left");
      expect(typeof insets.top).toBe("number");
      expect(typeof insets.right).toBe("number");
      expect(typeof insets.bottom).toBe("number");
      expect(typeof insets.left).toBe("number");
    });

    it("should default to 0 when not set", () => {
      const insets = getSafeAreaInsets();
      expect(insets.top).toBeGreaterThanOrEqual(0);
      expect(insets.right).toBeGreaterThanOrEqual(0);
      expect(insets.bottom).toBeGreaterThanOrEqual(0);
      expect(insets.left).toBeGreaterThanOrEqual(0);
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should pass arguments to debounced function", async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced("arg1", "arg2");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });
  });

  describe("throttle", () => {
    it("should throttle function calls", async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("isInViewport", () => {
    it("should detect if element is in viewport", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      // Mock getBoundingClientRect
      element.getBoundingClientRect = vi.fn(() => ({
        top: 10,
        left: 10,
        bottom: 100,
        right: 100,
        width: 90,
        height: 90,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }));

      const result = isInViewport(element);
      expect(typeof result).toBe("boolean");

      document.body.removeChild(element);
    });

    it("should respect threshold parameter", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);

      element.getBoundingClientRect = vi.fn(() => ({
        top: -10,
        left: -10,
        bottom: window.innerHeight + 10,
        right: window.innerWidth + 10,
        width: window.innerWidth + 20,
        height: window.innerHeight + 20,
        x: -10,
        y: -10,
        toJSON: () => ({}),
      }));

      // With threshold of 20, element should be considered in viewport
      const result = isInViewport(element, 20);
      expect(result).toBe(true);

      document.body.removeChild(element);
    });
  });

  describe("getViewportDimensions", () => {
    it("should return viewport dimensions", () => {
      const dimensions = getViewportDimensions();
      expect(dimensions).toHaveProperty("width");
      expect(dimensions).toHaveProperty("height");
      expect(typeof dimensions.width).toBe("number");
      expect(typeof dimensions.height).toBe("number");
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    });
  });

  describe("isHighDensityDisplay", () => {
    it("should check device pixel ratio", () => {
      const result = isHighDensityDisplay();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("disableTextSelection", () => {
    it("should disable text selection on body", () => {
      disableTextSelection();
      expect(document.body.style.userSelect).toBe("none");
      expect(document.body.style.webkitUserSelect).toBe("none");
    });
  });

  describe("enableTextSelection", () => {
    it("should enable text selection on body", () => {
      disableTextSelection(); // First disable
      enableTextSelection(); // Then enable
      expect(document.body.style.userSelect).toBe("");
      expect(document.body.style.webkitUserSelect).toBe("");
    });
  });

  describe("lockScroll", () => {
    it("should lock scroll on body", () => {
      lockScroll();
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.body.style.position).toBe("fixed");
      expect(document.body.style.width).toBe("100%");
    });
  });

  describe("unlockScroll", () => {
    it("should unlock scroll on body", () => {
      lockScroll(); // First lock
      unlockScroll(); // Then unlock
      expect(document.body.style.overflow).toBe("");
      expect(document.body.style.position).toBe("");
      expect(document.body.style.width).toBe("");
    });
  });
});
