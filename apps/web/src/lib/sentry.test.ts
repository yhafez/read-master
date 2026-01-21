import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as Sentry from "@sentry/react";

import {
  initSentry,
  setSentryUser,
  clearSentryUser,
  addBreadcrumb,
  captureError,
  captureMessage,
  setSentryContext,
  setSentryTag,
} from "./sentry";

// Mock Sentry
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
  startTransaction: vi.fn(() => ({
    finish: vi.fn(),
    setHttpStatus: vi.fn(),
  })),
  reactRouterV7BrowserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
  ErrorBoundary: vi.fn(
    ({ children }: { children: React.ReactNode }) => children
  ),
  Profiler: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));

describe("Sentry Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete (import.meta.env as { VITE_SENTRY_DSN?: string }).VITE_SENTRY_DSN;
  });

  describe("initSentry", () => {
    it("should not initialize Sentry if DSN is not configured", () => {
      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it("should initialize Sentry with correct configuration when DSN is set", () => {
      import.meta.env.VITE_SENTRY_DSN = "https://test@sentry.io/123";
      import.meta.env.MODE = "production";
      import.meta.env.VITE_APP_VERSION = "1.0.0";

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          environment: "production",
          release: "read-master-web@1.0.0",
        })
      );
    });
  });

  describe("setSentryUser", () => {
    it("should set user context with all fields", () => {
      setSentryUser({
        id: "user123",
        email: "test@example.com",
        username: "testuser",
        tier: "PRO",
      });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "user123",
        email: "test@example.com",
        username: "testuser",
        tier: "PRO",
      });
    });

    it("should set user context with only required fields", () => {
      setSentryUser({
        id: "user456",
      });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "user456",
        email: undefined,
        username: undefined,
        tier: undefined,
      });
    });
  });

  describe("clearSentryUser", () => {
    it("should clear user context", () => {
      clearSentryUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe("addBreadcrumb", () => {
    it("should add breadcrumb with message and category", () => {
      addBreadcrumb("User clicked button", "ui", { buttonId: "submit" });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: "User clicked button",
        category: "ui",
        level: "info",
        data: { buttonId: "submit" },
        timestamp: expect.any(Number),
      });
    });

    it("should add breadcrumb without data", () => {
      addBreadcrumb("Navigation started", "navigation");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: "Navigation started",
        category: "navigation",
        level: "info",
        data: undefined,
        timestamp: expect.any(Number),
      });
    });
  });

  describe("captureError", () => {
    it("should capture error with context", () => {
      const error = new Error("Test error");
      const context = { userId: "123", action: "upload" };

      captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
      });
    });

    it("should capture error without context", () => {
      const error = new Error("Test error");

      captureError(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe("captureMessage", () => {
    it("should capture message with default level", () => {
      captureMessage("Test message");

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Test message",
        "info"
      );
    });

    it("should capture message with custom level", () => {
      captureMessage("Warning message", "warning");

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Warning message",
        "warning"
      );
    });

    it("should capture error message", () => {
      captureMessage("Error occurred", "error");

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Error occurred",
        "error"
      );
    });
  });

  describe("setSentryContext", () => {
    it("should set custom context", () => {
      const context = { requestId: "123", duration: 145 };

      setSentryContext("api-call", context);

      expect(Sentry.setContext).toHaveBeenCalledWith("api-call", context);
    });
  });

  describe("setSentryTag", () => {
    it("should set custom tag", () => {
      setSentryTag("feature", "library");

      expect(Sentry.setTag).toHaveBeenCalledWith("feature", "library");
    });

    it("should set multiple tags", () => {
      setSentryTag("tier", "PRO");
      setSentryTag("platform", "web");

      expect(Sentry.setTag).toHaveBeenCalledWith("tier", "PRO");
      expect(Sentry.setTag).toHaveBeenCalledWith("platform", "web");
    });
  });
});
