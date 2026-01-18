import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Use vi.hoisted to properly hoist mock variables
const mocks = vi.hoisted(() => ({
  mockDbQueryRaw: vi.fn(),
  mockIsRedisAvailable: vi.fn(() => true),
  mockGetRedisClient: vi.fn(),
  mockRedisPing: vi.fn(),
}));

// Create mock redis client
const mockRedisClient = {
  ping: mocks.mockRedisPing,
};

vi.mock("../src/services/db.js", () => ({
  db: {
    $queryRaw: mocks.mockDbQueryRaw,
  },
}));

vi.mock("../src/services/redis.js", () => ({
  isRedisAvailable: mocks.mockIsRedisAvailable,
  getRedisClient: mocks.mockGetRedisClient,
}));

import handler from "./health.js";

// Mock VercelRequest
function createMockRequest(): VercelRequest {
  return {} as VercelRequest;
}

// Mock VercelResponse
function createMockResponse(): VercelResponse & {
  statusCode: number;
  body: unknown;
} {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status: vi.fn().mockImplementation(function (
      this: { statusCode: number },
      code: number
    ) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn().mockImplementation(function (
      this: { body: unknown },
      data: unknown
    ) {
      this.body = data;
      return this;
    }),
  };
  return res as unknown as VercelResponse & {
    statusCode: number;
    body: unknown;
  };
}

// Type for health response body
type HealthResponseBody = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    api: { status: string; latency?: number; error?: string };
    database: { status: string; latency?: number; error?: string };
    redis: { status: string; latency?: number; error?: string };
  };
};

describe("health endpoint", () => {
  let mockReq: VercelRequest;
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T12:00:00.000Z"));

    // Reset all mocks
    mocks.mockDbQueryRaw.mockReset();
    mocks.mockRedisPing.mockReset();
    mocks.mockIsRedisAvailable.mockReturnValue(true);
    mocks.mockGetRedisClient.mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when all services are healthy", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mocks.mockRedisPing.mockResolvedValue("PONG");
    });

    it("should return 200 status code", async () => {
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return healthy status", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.status).toBe("healthy");
    });

    it("should include timestamp in ISO format", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.timestamp).toBe("2026-01-17T12:00:00.000Z");
    });

    it("should include version", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe("string");
    });

    it("should include environment", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.environment).toBeDefined();
    });

    it("should include all checks", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks).toBeDefined();
      expect(body.checks.api).toBeDefined();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.redis).toBeDefined();
    });

    it("should show api as ok", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.api.status).toBe("ok");
    });

    it("should show database as ok with latency", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.database.status).toBe("ok");
      expect(typeof body.checks.database.latency).toBe("number");
    });

    it("should show redis as ok with latency", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.redis.status).toBe("ok");
      expect(typeof body.checks.redis.latency).toBe("number");
    });
  });

  describe("when database is unhealthy", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockRejectedValue(new Error("Connection refused"));
      mocks.mockRedisPing.mockResolvedValue("PONG");
    });

    it("should return 503 status code", async () => {
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it("should return unhealthy status", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.status).toBe("unhealthy");
    });

    it("should show database as error with message", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.database.status).toBe("error");
      expect(body.checks.database.error).toBe("Connection refused");
    });

    it("should still include latency for failed database check", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(typeof body.checks.database.latency).toBe("number");
    });
  });

  describe("when redis is unhealthy", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mocks.mockRedisPing.mockRejectedValue(new Error("Redis timeout"));
    });

    it("should return 200 status code (degraded but operational)", async () => {
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return degraded status", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.status).toBe("degraded");
    });

    it("should show redis as error with message", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.redis.status).toBe("error");
      expect(body.checks.redis.error).toBe("Redis timeout");
    });

    it("should still show database as ok", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.database.status).toBe("ok");
    });
  });

  describe("when redis is not configured", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mocks.mockIsRedisAvailable.mockReturnValue(false);
    });

    it("should return 200 status code", async () => {
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return healthy status", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.status).toBe("healthy");
    });

    it("should show redis as ok (not configured is acceptable)", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.redis.status).toBe("ok");
      expect(body.checks.redis.latency).toBe(0);
    });
  });

  describe("when redis client returns null", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mocks.mockIsRedisAvailable.mockReturnValue(true);
      mocks.mockGetRedisClient.mockReturnValue(null);
    });

    it("should return 200 status code", async () => {
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should show redis as ok", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.redis.status).toBe("ok");
    });
  });

  describe("when redis ping returns unexpected response", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mocks.mockRedisPing.mockResolvedValue("UNEXPECTED");
    });

    it("should return degraded status", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.status).toBe("degraded");
    });

    it("should show redis as error with descriptive message", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.redis.status).toBe("error");
      expect(body.checks.redis.error).toBe(
        "Unexpected ping response: UNEXPECTED"
      );
    });
  });

  describe("when both database and redis are unhealthy", () => {
    beforeEach(() => {
      mocks.mockDbQueryRaw.mockRejectedValue(new Error("DB error"));
      mocks.mockRedisPing.mockRejectedValue(new Error("Redis error"));
    });

    it("should return 503 status code", async () => {
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it("should return unhealthy status", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.status).toBe("unhealthy");
    });

    it("should show both services as error", async () => {
      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.database.status).toBe("error");
      expect(body.checks.redis.status).toBe("error");
    });
  });

  describe("error handling edge cases", () => {
    it("should handle non-Error database exceptions", async () => {
      mocks.mockDbQueryRaw.mockRejectedValue("String error");
      mocks.mockRedisPing.mockResolvedValue("PONG");

      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.database.error).toBe("Unknown database error");
    });

    it("should handle non-Error redis exceptions", async () => {
      mocks.mockDbQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mocks.mockRedisPing.mockRejectedValue("String error");

      await handler(mockReq, mockRes);
      const body = mockRes.body as HealthResponseBody;
      expect(body.checks.redis.error).toBe("Unknown Redis error");
    });
  });
});
