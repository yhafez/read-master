import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler, {
  verifyCronAuth,
  hasRemindersEnabled,
  BATCH_SIZE,
  MIN_DUE_CARDS_FOR_REMINDER,
} from "./srs-reminders";

// Mock the logger
vi.mock("../../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the database
vi.mock("../../src/services/db", () => ({
  db: {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

function createMockRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    method: "GET",
    headers: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse & {
  _status: number;
  _json: unknown;
} {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: unknown) {
      this._json = data;
      return this;
    },
  };
  return res as unknown as VercelResponse & {
    _status: number;
    _json: unknown;
  };
}

describe("SRS Reminders Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  describe("handler", () => {
    it("should return 200 for successful execution without cron secret", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json).toMatchObject({
        success: true,
        message: "SRS reminders job completed",
        usersNotified: 0,
      });
    });

    it("should return 401 when cron secret is set but not provided", async () => {
      process.env.CRON_SECRET = "test-secret";
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ error: "Unauthorized" });
    });

    it("should return 401 when cron secret is wrong", async () => {
      process.env.CRON_SECRET = "test-secret";
      const req = createMockRequest({
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({ error: "Unauthorized" });
    });

    it("should return 200 when cron secret is correct", async () => {
      process.env.CRON_SECRET = "test-secret";
      const req = createMockRequest({
        headers: { authorization: "Bearer test-secret" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json).toMatchObject({
        success: true,
      });
    });

    it("should return 405 for non-GET requests", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(405);
      expect(res._json).toEqual({ error: "Method not allowed" });
    });

    it("should include duration in response", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      expect(typeof (res._json as { duration: number }).duration).toBe(
        "number"
      );
    });

    it("should include stats in response", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { stats: object };
      expect(json.stats).toBeDefined();
      expect(json.stats).toHaveProperty("usersProcessed");
      expect(json.stats).toHaveProperty("usersWithDueCards");
      expect(json.stats).toHaveProperty("usersNotified");
      expect(json.stats).toHaveProperty("errors");
    });
  });

  describe("verifyCronAuth", () => {
    it("should return true when no cron secret is set", () => {
      expect(verifyCronAuth(undefined, undefined)).toBe(true);
    });

    it("should return false when cron secret is set but auth header is missing", () => {
      expect(verifyCronAuth(undefined, "test-secret")).toBe(false);
    });

    it("should return false when cron secret is wrong", () => {
      expect(verifyCronAuth("Bearer wrong-secret", "test-secret")).toBe(false);
    });

    it("should return true when auth matches", () => {
      expect(verifyCronAuth("Bearer test-secret", "test-secret")).toBe(true);
    });
  });

  describe("hasRemindersEnabled", () => {
    it("should return true when preferences is null", () => {
      expect(hasRemindersEnabled(null)).toBe(true);
    });

    it("should return true when preferences is undefined", () => {
      expect(hasRemindersEnabled(undefined)).toBe(true);
    });

    it("should return true when preferences is empty object", () => {
      expect(hasRemindersEnabled({})).toBe(true);
    });

    it("should return true when srsRemindersEnabled is not set", () => {
      expect(hasRemindersEnabled({ theme: "dark" })).toBe(true);
    });

    it("should return true when srsRemindersEnabled is true", () => {
      expect(hasRemindersEnabled({ srsRemindersEnabled: true })).toBe(true);
    });

    it("should return false when srsRemindersEnabled is false", () => {
      expect(hasRemindersEnabled({ srsRemindersEnabled: false })).toBe(false);
    });
  });

  describe("configuration constants", () => {
    it("should have expected batch size", () => {
      expect(BATCH_SIZE).toBe(100);
    });

    it("should have expected minimum due cards threshold", () => {
      expect(MIN_DUE_CARDS_FOR_REMINDER).toBe(1);
    });
  });
});
