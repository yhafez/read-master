import { describe, it, expect, vi, beforeEach } from "vitest";

import * as Sentry from "@sentry/node";

import {
  initSentry,
  setSentryUser,
  clearSentryUser,
  addBreadcrumb,
  captureError,
  captureMessage,
  setSentryContext,
  setSentryTag,
  flushSentry,
} from "./sentry";

// Mock Sentry
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
  flush: vi.fn(() => Promise.resolve()),
  startTransaction: vi.fn(() => ({
    finish: vi.fn(),
    setHttpStatus: vi.fn(),
  })),
}));

describe("API Sentry Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the sentryInitialized flag
    delete process.env.SENTRY_DSN;
  });

  describe("initSentry", () => {
    it("should not initialize Sentry if DSN is not configured", () => {
      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it("should initialize Sentry with correct configuration when DSN is set", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/456";
      process.env.NODE_ENV = "production";
      process.env.VERCEL_GIT_COMMIT_SHA = "abc123";

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/456",
          environment: "production",
          release: "read-master-api@abc123",
        })
      );
    });
  });

  describe("setSentryUser", () => {
    it("should set user context", () => {
      setSentryUser({
        id: "user789",
        email: "api@example.com",
        tier: "SCHOLAR",
      });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "user789",
        email: "api@example.com",
        tier: "SCHOLAR",
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
    it("should add breadcrumb", () => {
      addBreadcrumb("Database query", "db", { table: "users" });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: "Database query",
        category: "db",
        level: "info",
        data: { table: "users" },
        timestamp: expect.any(Number),
      });
    });
  });

  describe("captureError", () => {
    it("should capture error", () => {
      const error = new Error("API error");
      const context = { endpoint: "/api/books" };

      captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
      });
    });
  });

  describe("captureMessage", () => {
    it("should capture message", () => {
      captureMessage("API called", "info");

      expect(Sentry.captureMessage).toHaveBeenCalledWith("API called", "info");
    });
  });

  describe("setSentryContext", () => {
    it("should set context", () => {
      setSentryContext("request", { method: "POST" });

      expect(Sentry.setContext).toHaveBeenCalledWith("request", {
        method: "POST",
      });
    });
  });

  describe("setSentryTag", () => {
    it("should set tag", () => {
      setSentryTag("endpoint", "/api/users");

      expect(Sentry.setTag).toHaveBeenCalledWith("endpoint", "/api/users");
    });
  });

  describe("flushSentry", () => {
    it("should flush events", async () => {
      await flushSentry();

      expect(Sentry.flush).toHaveBeenCalledWith(2000);
    });
  });
});
