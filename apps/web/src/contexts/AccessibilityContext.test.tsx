/**
 * Accessibility Context Tests
 *
 * Tests for the accessibility context and screen reader announcements.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  AccessibilityProvider,
  useAccessibility,
  useLoadingAnnouncement,
  useErrorAnnouncement,
  useSuccessAnnouncement,
  type AccessibilitySettings,
} from "./AccessibilityContext";

// Mock useTranslation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && "defaultValue" in options) {
        return options.defaultValue as string;
      }
      if (options && "page" in options) {
        return `Navigated to ${options.page}`;
      }
      if (options && "message" in options) {
        if (key.includes("error")) return `Error: ${options.message}`;
        if (key.includes("success")) return `Success: ${options.message}`;
      }
      return key;
    },
  }),
}));

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AccessibilityProvider announceRouteChanges={false}>
        {children}
      </AccessibilityProvider>
    </MemoryRouter>
  );
}

describe("AccessibilityContext", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key) => store[key] || null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      store[key] = value;
    });

    // Mock matchMedia
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useAccessibility", () => {
    it("should provide default settings", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(result.current.settings).toEqual({
        dyslexiaFont: false,
        highContrast: false,
        reducedMotion: false,
        enhancedFocus: true,
        fontScale: 1.0,
        lineSpacing: 1.5,
        letterSpacing: 0,
        wordSpacing: 0,
      });
    });

    it("should toggle dyslexia font", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(result.current.settings.dyslexiaFont).toBe(false);

      act(() => {
        result.current.toggleDyslexiaFont();
      });

      expect(result.current.settings.dyslexiaFont).toBe(true);
    });

    it("should toggle high contrast mode", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(result.current.settings.highContrast).toBe(false);

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(result.current.settings.highContrast).toBe(true);
    });

    it("should toggle reduced motion", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(result.current.settings.reducedMotion).toBe(false);

      act(() => {
        result.current.toggleReducedMotion();
      });

      expect(result.current.settings.reducedMotion).toBe(true);
    });

    it("should increase font size within bounds", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(result.current.settings.fontScale).toBe(1.0);

      act(() => {
        result.current.increaseFontSize();
      });

      expect(result.current.settings.fontScale).toBeCloseTo(1.1, 1);

      // Increase to max
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.increaseFontSize();
        });
      }

      expect(result.current.settings.fontScale).toBeLessThanOrEqual(2.0);
    });

    it("should decrease font size within bounds", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(result.current.settings.fontScale).toBe(1.0);

      act(() => {
        result.current.decreaseFontSize();
      });

      expect(result.current.settings.fontScale).toBeCloseTo(0.9, 1);

      // Decrease to min
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.decreaseFontSize();
        });
      }

      expect(result.current.settings.fontScale).toBeGreaterThanOrEqual(0.8);
    });

    it("should update settings", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      const newSettings: Partial<AccessibilitySettings> = {
        lineSpacing: 2.0,
        letterSpacing: 0.1,
      };

      act(() => {
        result.current.updateSettings(newSettings);
      });

      expect(result.current.settings.lineSpacing).toBe(2.0);
      expect(result.current.settings.letterSpacing).toBe(0.1);
    });

    it("should reset settings to defaults", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.toggleDyslexiaFont();
        result.current.toggleHighContrast();
        result.current.increaseFontSize();
      });

      expect(result.current.settings.dyslexiaFont).toBe(true);
      expect(result.current.settings.highContrast).toBe(true);

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings.dyslexiaFont).toBe(false);
      expect(result.current.settings.highContrast).toBe(false);
      expect(result.current.settings.fontScale).toBe(1.0);
    });
  });

  describe("Announcement Functions", () => {
    it("should have announce function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.announce).toBe("function");
    });

    it("should have announcePolite function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.announcePolite).toBe("function");
    });

    it("should have announceAssertive function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.announceAssertive).toBe("function");
    });

    it("should have announceLoading function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.announceLoading).toBe("function");
    });

    it("should have announceError function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.announceError).toBe("function");
    });

    it("should have announceSuccess function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.announceSuccess).toBe("function");
    });
  });

  describe("Focus Management", () => {
    it("should have focusElement function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.focusElement).toBe("function");
    });

    it("should have focusMain function", () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.focusMain).toBe("function");
    });

    it("should focus element by id", () => {
      // Create a test element
      const testElement = document.createElement("div");
      testElement.id = "test-element";
      testElement.tabIndex = -1;
      // Mock scrollIntoView
      testElement.scrollIntoView = vi.fn();
      document.body.appendChild(testElement);

      const focusSpy = vi.spyOn(testElement, "focus");

      const { result } = renderHook(() => useAccessibility(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.focusElement("test-element");
      });

      expect(focusSpy).toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(testElement);
    });
  });
});

describe("useLoadingAnnouncement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should announce when loading state changes to true", async () => {
    const { rerender } = renderHook(
      ({ isLoading }) => {
        useLoadingAnnouncement(isLoading, "test data");
      },
      {
        wrapper: TestWrapper,
        initialProps: { isLoading: false },
      }
    );

    // Change loading state to true
    rerender({ isLoading: true });

    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Check that the live region contains the loading message
    const liveRegion = document.querySelector(
      '[role="status"][aria-live="polite"]'
    );
    expect(liveRegion?.textContent).toContain("Loading");
  });
});

describe("useErrorAnnouncement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should announce when error changes", async () => {
    const { rerender } = renderHook(
      ({ error }) => {
        useErrorAnnouncement(error);
      },
      {
        wrapper: TestWrapper,
        initialProps: { error: null as string | null },
      }
    );

    // Change error state
    rerender({ error: "Something went wrong" });

    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Check that the alert region contains the error message
    const alertRegion = document.querySelector(
      '[role="alert"][aria-live="assertive"]'
    );
    expect(alertRegion?.textContent).toContain("Error");
  });
});

describe("useSuccessAnnouncement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should announce when success changes to true", async () => {
    const { rerender } = renderHook(
      ({ isSuccess }) => {
        useSuccessAnnouncement(isSuccess, "Operation completed");
      },
      {
        wrapper: TestWrapper,
        initialProps: { isSuccess: false },
      }
    );

    // Change success state
    rerender({ isSuccess: true });

    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Check that the live region contains the success message
    const liveRegion = document.querySelector(
      '[role="status"][aria-live="polite"]'
    );
    expect(liveRegion?.textContent).toContain("Success");
  });
});

describe("Provider throws without context", () => {
  it("should throw error when useAccessibility is used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAccessibility());
    }).toThrow("useAccessibility must be used within AccessibilityProvider");

    consoleSpy.mockRestore();
  });
});
