import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { logger, logRequest, logError, logAIUsage } from "./logger.js";

describe("logger utilities", () => {
  beforeEach(() => {
    // Spy on logger methods
    vi.spyOn(logger, "info").mockImplementation(() => logger);
    vi.spyOn(logger, "error").mockImplementation(() => logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logger", () => {
    it("should be defined and have expected methods", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });
  });

  describe("logRequest", () => {
    it("should log API request with method and path", () => {
      logRequest("GET", "/api/books");

      expect(logger.info).toHaveBeenCalledWith("API Request", {
        method: "GET",
        path: "/api/books",
        userId: undefined,
        requestId: undefined,
      });
    });

    it("should log API request with userId and requestId", () => {
      logRequest("POST", "/api/books", "user-123", "req-456");

      expect(logger.info).toHaveBeenCalledWith("API Request", {
        method: "POST",
        path: "/api/books",
        userId: "user-123",
        requestId: "req-456",
      });
    });
  });

  describe("logError", () => {
    it("should log Error instances with message and stack", () => {
      const error = new Error("Something went wrong");

      logError("Operation failed", error);

      expect(logger.error).toHaveBeenCalledWith(
        "Operation failed",
        expect.objectContaining({
          error: {
            message: "Something went wrong",
            stack: expect.any(String),
          },
        })
      );
    });

    it("should log non-Error values as strings", () => {
      logError("Operation failed", "string error");

      expect(logger.error).toHaveBeenCalledWith(
        "Operation failed",
        expect.objectContaining({
          error: {
            message: "string error",
          },
        })
      );
    });

    it("should include additional context", () => {
      const error = new Error("Failed");
      const context = { userId: "user-123", bookId: "book-456" };

      logError("Operation failed", error, context);

      expect(logger.error).toHaveBeenCalledWith(
        "Operation failed",
        expect.objectContaining({
          userId: "user-123",
          bookId: "book-456",
        })
      );
    });
  });

  describe("logAIUsage", () => {
    it("should log AI usage with all parameters", () => {
      logAIUsage("pre_reading_guide", 1500, 0.045, "user-123", 2500);

      expect(logger.info).toHaveBeenCalledWith("AI Usage", {
        operation: "pre_reading_guide",
        tokens: 1500,
        cost: 0.045,
        userId: "user-123",
        duration: 2500,
      });
    });

    it("should log AI usage without duration", () => {
      logAIUsage("explain", 500, 0.015, "user-456");

      expect(logger.info).toHaveBeenCalledWith("AI Usage", {
        operation: "explain",
        tokens: 500,
        cost: 0.015,
        userId: "user-456",
        duration: undefined,
      });
    });
  });
});
