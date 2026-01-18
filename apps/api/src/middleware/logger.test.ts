import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  Logger,
  logger,
  generateRequestId,
  extractRequestContext,
  createRequestLogger,
  logRequest,
  logResponse,
  logError,
  logAIUsage,
  logPerformance,
  logAudit,
  logSecurity,
  withRequestLogging,
  loggerUtils,
  baseLogger,
  type LogLevel,
  type RequestContext,
  type RequestWithLogger,
  type AIUsageLogData,
  type PerformanceLogData,
  type AuditLogData,
} from "./logger.js";

// Mock winston base logger
vi.mock("winston", async () => {
  const mockLogger = {
    error: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    log: vi.fn().mockReturnThis(),
    debug: vi.fn().mockReturnThis(),
  };

  return {
    default: {
      createLogger: vi.fn().mockReturnValue(mockLogger),
      format: {
        combine: vi.fn(),
        timestamp: vi.fn(),
        printf: vi.fn((fn: unknown) => fn),
        colorize: vi.fn(),
        json: vi.fn(),
        errors: vi.fn(),
      },
      transports: {
        Console: vi.fn(),
      },
      addColors: vi.fn(),
    },
  };
});

// Create mock request and response
function createMockRequest(overrides?: Partial<VercelRequest>): VercelRequest {
  return {
    method: "GET",
    url: "/api/test",
    headers: {
      "user-agent": "test-agent",
      "x-forwarded-for": "192.168.1.1",
    },
    query: {},
    body: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse {
  const res = {
    statusCode: 200,
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as VercelResponse;
  return res;
}

describe("logger middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Type Exports
  // ============================================================================

  describe("type exports", () => {
    it("should export LogLevel type", () => {
      const level: LogLevel = "info";
      expect(["error", "warn", "info", "http", "debug"]).toContain(level);
    });

    it("should export RequestContext type", () => {
      const context: RequestContext = {
        requestId: "req_123",
        userId: "user_123",
        method: "GET",
        path: "/api/test",
      };
      expect(context.requestId).toBe("req_123");
    });

    it("should export AIUsageLogData type", () => {
      const data: AIUsageLogData = {
        operation: "pre_reading_guide",
        totalTokens: 1500,
        success: true,
      };
      expect(data.operation).toBe("pre_reading_guide");
    });

    it("should export PerformanceLogData type", () => {
      const data: PerformanceLogData = {
        operation: "book_parse",
        durationMs: 150,
        success: true,
      };
      expect(data.operation).toBe("book_parse");
    });

    it("should export AuditLogData type", () => {
      const data: AuditLogData = {
        action: "UPDATE",
        entityType: "Book",
        entityId: "book_123",
      };
      expect(data.action).toBe("UPDATE");
    });
  });

  // ============================================================================
  // Logger Class
  // ============================================================================

  describe("Logger class", () => {
    it("should create a logger with default context", () => {
      const log = new Logger();
      expect(log).toBeInstanceOf(Logger);
    });

    it("should create a logger with provided context", () => {
      const context: RequestContext = {
        requestId: "req_123",
        userId: "user_123",
      };
      const log = new Logger(context);
      expect(log.getContext()).toEqual(context);
    });

    it("should create child logger with merged context", () => {
      const parent = new Logger({ requestId: "req_123" });
      const child = parent.child({ userId: "user_456" });

      expect(child.getContext()).toEqual({
        requestId: "req_123",
        userId: "user_456",
      });
    });

    it("should have all log level methods", () => {
      const log = new Logger();
      expect(typeof log.error).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.info).toBe("function");
      expect(typeof log.http).toBe("function");
      expect(typeof log.debug).toBe("function");
    });

    it("should have logError method", () => {
      const log = new Logger();
      expect(typeof log.logError).toBe("function");
    });

    it("should not mutate parent context when creating child", () => {
      const parent = new Logger({ requestId: "req_123" });
      const originalContext = parent.getContext();
      parent.child({ userId: "user_456" });
      expect(parent.getContext()).toEqual(originalContext);
    });

    it("should override parent context in child", () => {
      const parent = new Logger({ requestId: "req_123", userId: "user_old" });
      const child = parent.child({ userId: "user_new" });
      expect(child.getContext().userId).toBe("user_new");
    });
  });

  // ============================================================================
  // Global Logger Instance
  // ============================================================================

  describe("global logger", () => {
    it("should export a global logger instance", () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should have all expected methods", () => {
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.http).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.logError).toBe("function");
      expect(typeof logger.child).toBe("function");
    });
  });

  // ============================================================================
  // Request ID Generation
  // ============================================================================

  describe("generateRequestId", () => {
    it("should generate a string ID", () => {
      const id = generateRequestId();
      expect(typeof id).toBe("string");
    });

    it("should start with req_ prefix", () => {
      const id = generateRequestId();
      expect(id.startsWith("req_")).toBe(true);
    });

    it("should generate unique IDs", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }
      expect(ids.size).toBe(100);
    });

    it("should contain timestamp component", () => {
      const id = generateRequestId();
      // Format: req_{timestamp}_{random}
      const parts = id.split("_");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("req");
    });
  });

  // ============================================================================
  // Context Extraction
  // ============================================================================

  describe("extractRequestContext", () => {
    it("should extract method and path", () => {
      const req = createMockRequest({ method: "POST", url: "/api/books" });
      const context = extractRequestContext(req);

      expect(context.method).toBe("POST");
      expect(context.path).toBe("/api/books");
    });

    it("should extract user agent", () => {
      const req = createMockRequest({
        headers: { "user-agent": "Mozilla/5.0" },
      });
      const context = extractRequestContext(req);

      expect(context.userAgent).toBe("Mozilla/5.0");
    });

    it("should extract IP from x-forwarded-for", () => {
      const req = createMockRequest({
        headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
      });
      const context = extractRequestContext(req);

      expect(context.ip).toBe("10.0.0.1");
    });

    it("should extract IP from x-real-ip if x-forwarded-for is missing", () => {
      const req = createMockRequest({
        headers: { "x-real-ip": "10.0.0.3" },
      });
      const context = extractRequestContext(req);

      expect(context.ip).toBe("10.0.0.3");
    });

    it("should use existing requestId from request if present", () => {
      const req = createMockRequest() as RequestWithLogger;
      req.requestId = "existing_req_id";
      const context = extractRequestContext(req as VercelRequest);

      expect(context.requestId).toBe("existing_req_id");
    });

    it("should use x-request-id header if present", () => {
      const req = createMockRequest({
        headers: { "x-request-id": "header_req_id" },
      });
      const context = extractRequestContext(req);

      expect(context.requestId).toBe("header_req_id");
    });

    it("should generate requestId if none present", () => {
      const req = createMockRequest({ headers: {} });
      const context = extractRequestContext(req);

      expect(context.requestId).toBeDefined();
      expect(context.requestId?.startsWith("req_")).toBe(true);
    });

    it("should handle missing url", () => {
      const req = createMockRequest({ url: undefined });
      const context = extractRequestContext(req);

      expect(context.path).toBe("");
    });
  });

  // ============================================================================
  // Create Request Logger
  // ============================================================================

  describe("createRequestLogger", () => {
    it("should create a Logger instance", () => {
      const req = createMockRequest();
      const log = createRequestLogger(req);

      expect(log).toBeInstanceOf(Logger);
    });

    it("should include request context", () => {
      const req = createMockRequest({
        method: "GET",
        url: "/api/test",
        headers: { "user-agent": "test" },
      });
      const log = createRequestLogger(req);
      const context = log.getContext();

      expect(context.method).toBe("GET");
      expect(context.path).toBe("/api/test");
      expect(context.userAgent).toBe("test");
    });
  });

  // ============================================================================
  // Logging Helper Functions
  // ============================================================================

  describe("logRequest", () => {
    it("should be a function", () => {
      expect(typeof logRequest).toBe("function");
    });

    it("should accept method and path", () => {
      expect(() => logRequest("GET", "/api/books")).not.toThrow();
    });

    it("should accept optional context", () => {
      expect(() =>
        logRequest("GET", "/api/books", { requestId: "req_123" })
      ).not.toThrow();
    });
  });

  describe("logResponse", () => {
    it("should be a function", () => {
      expect(typeof logResponse).toBe("function");
    });

    it("should accept method, path, statusCode, and duration", () => {
      expect(() => logResponse("GET", "/api/books", 200, 150)).not.toThrow();
    });

    it("should accept optional context", () => {
      expect(() =>
        logResponse("GET", "/api/books", 200, 150, { requestId: "req_123" })
      ).not.toThrow();
    });
  });

  describe("logError", () => {
    it("should be a function", () => {
      expect(typeof logError).toBe("function");
    });

    it("should accept message and Error", () => {
      expect(() =>
        logError("Something failed", new Error("test"))
      ).not.toThrow();
    });

    it("should accept message and string error", () => {
      expect(() => logError("Something failed", "string error")).not.toThrow();
    });

    it("should accept additional context", () => {
      expect(() =>
        logError("Something failed", new Error("test"), { bookId: "book_123" })
      ).not.toThrow();
    });
  });

  describe("logAIUsage", () => {
    it("should be a function", () => {
      expect(typeof logAIUsage).toBe("function");
    });

    it("should accept minimal AI usage data", () => {
      expect(() =>
        logAIUsage({
          operation: "pre_reading_guide",
          totalTokens: 1500,
          success: true,
        })
      ).not.toThrow();
    });

    it("should accept full AI usage data", () => {
      expect(() =>
        logAIUsage({
          operation: "pre_reading_guide",
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 500,
          completionTokens: 1000,
          totalTokens: 1500,
          cost: 0.045,
          durationMs: 2500,
          success: true,
          bookId: "book_123",
          userId: "user_123",
          requestId: "req_123",
        })
      ).not.toThrow();
    });

    it("should accept failed AI operation data", () => {
      expect(() =>
        logAIUsage({
          operation: "explain",
          totalTokens: 0,
          success: false,
          errorCode: "RATE_LIMITED",
          errorMessage: "Too many requests",
        })
      ).not.toThrow();
    });
  });

  describe("logPerformance", () => {
    it("should be a function", () => {
      expect(typeof logPerformance).toBe("function");
    });

    it("should accept performance data", () => {
      expect(() =>
        logPerformance({
          operation: "book_parse",
          durationMs: 150,
          success: true,
        })
      ).not.toThrow();
    });

    it("should accept performance data with metadata", () => {
      expect(() =>
        logPerformance({
          operation: "book_parse",
          durationMs: 150,
          success: true,
          metadata: { fileSize: 1024000, fileType: "epub" },
        })
      ).not.toThrow();
    });
  });

  describe("logAudit", () => {
    it("should be a function", () => {
      expect(typeof logAudit).toBe("function");
    });

    it("should accept audit data", () => {
      expect(() =>
        logAudit({
          action: "UPDATE",
          entityType: "Book",
          entityId: "book_123",
        })
      ).not.toThrow();
    });

    it("should accept audit data with values", () => {
      expect(() =>
        logAudit({
          action: "UPDATE",
          entityType: "Book",
          entityId: "book_123",
          previousValue: { title: "Old Title" },
          newValue: { title: "New Title" },
          userId: "user_123",
        })
      ).not.toThrow();
    });
  });

  describe("logSecurity", () => {
    it("should be a function", () => {
      expect(typeof logSecurity).toBe("function");
    });

    it("should accept security event and details", () => {
      expect(() =>
        logSecurity("INVALID_TOKEN", { ip: "192.168.1.1" })
      ).not.toThrow();
    });

    it("should accept security event with user context", () => {
      expect(() =>
        logSecurity("RATE_LIMIT_EXCEEDED", {
          userId: "user_123",
          operation: "ai",
          attempts: 100,
        })
      ).not.toThrow();
    });
  });

  // ============================================================================
  // Request Logging Middleware
  // ============================================================================

  describe("withRequestLogging", () => {
    it("should return a function", () => {
      const handler = vi.fn();
      const wrapped = withRequestLogging(handler);
      expect(typeof wrapped).toBe("function");
    });

    it("should call the original handler", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await wrapped(req, res);

      expect(handler).toHaveBeenCalled();
    });

    it("should attach requestId to request", async () => {
      let capturedReq: RequestWithLogger | undefined;
      const handler = vi.fn((req: VercelRequest, _res: VercelResponse) => {
        capturedReq = req as RequestWithLogger;
      });
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await wrapped(req, res);

      expect(capturedReq?.requestId).toBeDefined();
      expect(capturedReq?.requestId?.startsWith("req_")).toBe(true);
    });

    it("should attach logger to request", async () => {
      let capturedReq: RequestWithLogger | undefined;
      const handler = vi.fn((req: VercelRequest, _res: VercelResponse) => {
        capturedReq = req as RequestWithLogger;
      });
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await wrapped(req, res);

      expect(capturedReq?.logger).toBeInstanceOf(Logger);
    });

    it("should set X-Request-ID header on response", async () => {
      const handler = vi.fn();
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await wrapped(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Request-ID",
        expect.stringMatching(/^req_/)
      );
    });

    it("should rethrow errors from handler", async () => {
      const error = new Error("Handler error");
      const handler = vi.fn().mockRejectedValue(error);
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await expect(wrapped(req, res)).rejects.toThrow("Handler error");
    });

    it("should work with sync handlers", async () => {
      const handler = vi.fn().mockReturnValue(undefined);
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      await wrapped(req, res);

      expect(handler).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Logger Utils Export
  // ============================================================================

  describe("loggerUtils", () => {
    it("should export Logger class", () => {
      expect(loggerUtils.Logger).toBe(Logger);
    });

    it("should export logger instance", () => {
      expect(loggerUtils.logger).toBe(logger);
    });

    it("should export generateRequestId", () => {
      expect(loggerUtils.generateRequestId).toBe(generateRequestId);
    });

    it("should export extractRequestContext", () => {
      expect(loggerUtils.extractRequestContext).toBe(extractRequestContext);
    });

    it("should export createRequestLogger", () => {
      expect(loggerUtils.createRequestLogger).toBe(createRequestLogger);
    });

    it("should export logRequest", () => {
      expect(loggerUtils.logRequest).toBe(logRequest);
    });

    it("should export logResponse", () => {
      expect(loggerUtils.logResponse).toBe(logResponse);
    });

    it("should export logError", () => {
      expect(loggerUtils.logError).toBe(logError);
    });

    it("should export logAIUsage", () => {
      expect(loggerUtils.logAIUsage).toBe(logAIUsage);
    });

    it("should export logPerformance", () => {
      expect(loggerUtils.logPerformance).toBe(logPerformance);
    });

    it("should export logAudit", () => {
      expect(loggerUtils.logAudit).toBe(logAudit);
    });

    it("should export logSecurity", () => {
      expect(loggerUtils.logSecurity).toBe(logSecurity);
    });

    it("should export withRequestLogging", () => {
      expect(loggerUtils.withRequestLogging).toBe(withRequestLogging);
    });
  });

  // ============================================================================
  // Base Logger Export
  // ============================================================================

  describe("baseLogger", () => {
    it("should be exported", () => {
      expect(baseLogger).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("edge cases", () => {
    it("should handle empty headers", () => {
      const req = createMockRequest({ headers: {} });
      const context = extractRequestContext(req);

      expect(context.requestId).toBeDefined();
      expect(context.userAgent).toBeUndefined();
      expect(context.ip).toBeUndefined();
    });

    it("should handle undefined request properties", () => {
      const req = {
        method: undefined,
        url: undefined,
        headers: {},
        query: {},
        body: {},
      } as unknown as VercelRequest;

      expect(() => extractRequestContext(req)).not.toThrow();
    });

    it("should handle Logger with empty context", () => {
      const log = new Logger({});
      expect(log.getContext()).toEqual({});
    });

    it("should handle child logger with empty additional context", () => {
      const parent = new Logger({ requestId: "req_123" });
      const child = parent.child({});
      expect(child.getContext()).toEqual({ requestId: "req_123" });
    });

    it("should handle logError with null error", () => {
      expect(() => logError("Something failed", null)).not.toThrow();
    });

    it("should handle logError with undefined error", () => {
      expect(() => logError("Something failed", undefined)).not.toThrow();
    });

    it("should handle logError with object error", () => {
      expect(() => logError("Something failed", { code: "ERR" })).not.toThrow();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("integration", () => {
    it("should work in a typical request flow", async () => {
      const handler = vi.fn(async (req: VercelRequest, res: VercelResponse) => {
        const log = (req as RequestWithLogger).logger;
        log?.info("Processing request");
        res.statusCode = 200;
        res.json({ success: true });
        return res;
      });

      const wrapped = withRequestLogging(handler);
      const req = createMockRequest({ method: "POST", url: "/api/books" });
      const res = createMockResponse();

      await wrapped(req, res);

      expect(handler).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Request-ID",
        expect.any(String)
      );
    });

    it("should preserve handler return value", async () => {
      const handler = vi.fn().mockResolvedValue({ data: "result" });
      const wrapped = withRequestLogging(handler);

      const req = createMockRequest();
      const res = createMockResponse();

      const result = await wrapped(req, res);
      expect(result).toEqual({ data: "result" });
    });
  });
});
