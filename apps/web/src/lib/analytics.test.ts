/**
 * Tests for PostHog Analytics
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import posthog from "posthog-js";
import {
  initPostHog,
  identifyUser,
  setUserProperties,
  resetUser,
  trackEvent,
  isFeatureEnabled,
  getFeatureFlagValue,
  startSessionRecording,
  stopSessionRecording,
  isPostHogInitialized,
  getPostHog,
} from "./analytics";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    setPersonProperties: vi.fn(),
    reset: vi.fn(),
    capture: vi.fn(),
    isFeatureEnabled: vi.fn(),
    getFeatureFlag: vi.fn(),
    reloadFeatureFlags: vi.fn(),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock logger
vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock import.meta.env
const mockEnv = {
  VITE_POSTHOG_KEY: "phc_test_key",
  VITE_POSTHOG_HOST: "https://app.posthog.com",
  PROD: false,
  DEV: true,
};

(globalThis as any).import = {
  meta: {
    env: mockEnv,
  },
};

describe("PostHog Analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("trackEvent", () => {
    it("should track custom events with properties", () => {
      // Simulate PostHog init
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      trackEvent("book_added", {
        bookId: "book_123",
        title: "1984",
        author: "George Orwell",
      });

      expect(posthog.capture).toHaveBeenCalledWith("book_added", {
        bookId: "book_123",
        title: "1984",
        author: "George Orwell",
      });
    });

    it("should track events without properties", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      trackEvent("user_logged_in");

      expect(posthog.capture).toHaveBeenCalledWith("user_logged_in", undefined);
    });
  });

  describe("identifyUser", () => {
    it("should identify user with properties", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      identifyUser("user_123", {
        email: "test@example.com",
        tier: "PRO",
        streak: 7,
      });

      expect(posthog.identify).toHaveBeenCalledWith("user_123", {
        email: "test@example.com",
        tier: "PRO",
        streak: 7,
      });
    });
  });

  describe("setUserProperties", () => {
    it("should update user properties", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      setUserProperties({
        tier: "SCHOLAR",
        books_count: 50,
      });

      expect(posthog.setPersonProperties).toHaveBeenCalledWith({
        tier: "SCHOLAR",
        books_count: 50,
      });
    });
  });

  describe("resetUser", () => {
    it("should reset user data on logout", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      resetUser();

      expect(posthog.reset).toHaveBeenCalled();
    });
  });

  describe("feature flags", () => {
    it("should check if feature is enabled", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      vi.mocked(posthog.isFeatureEnabled).mockReturnValue(true);

      const result = isFeatureEnabled("new_ui");

      expect(result).toBe(true);
      expect(posthog.isFeatureEnabled).toHaveBeenCalledWith("new_ui");
    });

    it("should get feature flag value for multivariate flags", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      vi.mocked(posthog.getFeatureFlag).mockReturnValue("variant_b");

      const result = getFeatureFlagValue("ab_test");

      expect(result).toBe("variant_b");
    });

    it("should return false if feature flag check fails", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      vi.mocked(posthog.isFeatureEnabled).mockImplementation(() => {
        throw new Error("Feature flag error");
      });

      const result = isFeatureEnabled("broken_flag");

      expect(result).toBe(false);
    });
  });

  describe("session recording", () => {
    it("should start session recording", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      startSessionRecording();

      expect(posthog.startSessionRecording).toHaveBeenCalled();
    });

    it("should stop session recording", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      stopSessionRecording();

      expect(posthog.stopSessionRecording).toHaveBeenCalled();
    });
  });

  describe("utility functions", () => {
    it("should check initialization status", () => {
      expect(isPostHogInitialized()).toBe(false);

      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      expect(isPostHogInitialized()).toBe(true);
    });

    it("should get PostHog instance after init", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      expect(getPostHog()).toBeNull();

      initPostHog();

      expect(getPostHog()).toBeTruthy();
    });
  });

  describe("error handling", () => {
    it("should handle errors in event tracking gracefully", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      vi.mocked(posthog.capture).mockImplementation(() => {
        throw new Error("Network error");
      });

      // Should not throw
      expect(() => {
        trackEvent("book_added", { bookId: "book_123" });
      }).not.toThrow();
    });

    it("should handle errors in user identification gracefully", () => {
      vi.mocked(posthog.init).mockImplementation((_key, options: any) => {
        options.loaded?.(posthog);
        return posthog as any;
      });

      initPostHog();

      vi.mocked(posthog.identify).mockImplementation(() => {
        throw new Error("Identify error");
      });

      // Should not throw
      expect(() => {
        identifyUser("user_123", { email: "test@example.com" });
      }).not.toThrow();
    });
  });
});
