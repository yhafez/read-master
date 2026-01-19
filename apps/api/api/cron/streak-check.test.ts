import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler, {
  verifyCronAuth,
  getStartOfDayUTC,
  isSameDayUTC,
  isYesterday,
  BATCH_SIZE,
  STREAK_MILESTONES,
} from "./streak-check";

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
    userStats: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    flashcardReview: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    readingProgress: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    achievement: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    userAchievement: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock the shared package
vi.mock("@read-master/shared", () => ({
  ACHIEVEMENTS: [
    {
      code: "streak_7",
      name: "Week Warrior",
      category: "STREAK",
      isActive: true,
      xpReward: 100,
      criteria: { currentStreak: { gte: 7 } },
    },
    {
      code: "streak_30",
      name: "Monthly Master",
      category: "STREAK",
      isActive: true,
      xpReward: 500,
      criteria: { currentStreak: { gte: 30 } },
    },
  ],
  checkAchievementCriteria: vi.fn().mockReturnValue(false),
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

describe("Streak Check Cron", () => {
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
        message: "Streak check job completed",
        stats: {
          streaksChecked: 0,
          streaksReset: 0,
          achievementsAwarded: 0,
        },
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

    it("should include duration and stats in response", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { duration: number; stats: object };
      expect(typeof json.duration).toBe("number");
      expect(json.stats).toBeDefined();
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

  describe("getStartOfDayUTC", () => {
    it("should return start of day in UTC", () => {
      const date = new Date("2024-06-15T14:30:45.123Z");
      const startOfDay = getStartOfDayUTC(date);

      expect(startOfDay.getUTCFullYear()).toBe(2024);
      expect(startOfDay.getUTCMonth()).toBe(5); // June (0-indexed)
      expect(startOfDay.getUTCDate()).toBe(15);
      expect(startOfDay.getUTCHours()).toBe(0);
      expect(startOfDay.getUTCMinutes()).toBe(0);
      expect(startOfDay.getUTCSeconds()).toBe(0);
      expect(startOfDay.getUTCMilliseconds()).toBe(0);
    });
  });

  describe("isSameDayUTC", () => {
    it("should return true for same day", () => {
      const date1 = new Date("2024-06-15T10:00:00Z");
      const date2 = new Date("2024-06-15T23:59:59Z");
      expect(isSameDayUTC(date1, date2)).toBe(true);
    });

    it("should return false for different days", () => {
      const date1 = new Date("2024-06-15T10:00:00Z");
      const date2 = new Date("2024-06-16T10:00:00Z");
      expect(isSameDayUTC(date1, date2)).toBe(false);
    });

    it("should return false for different months", () => {
      const date1 = new Date("2024-06-15T10:00:00Z");
      const date2 = new Date("2024-07-15T10:00:00Z");
      expect(isSameDayUTC(date1, date2)).toBe(false);
    });

    it("should return false for different years", () => {
      const date1 = new Date("2024-06-15T10:00:00Z");
      const date2 = new Date("2025-06-15T10:00:00Z");
      expect(isSameDayUTC(date1, date2)).toBe(false);
    });
  });

  describe("isYesterday", () => {
    it("should return true for yesterday", () => {
      const today = new Date("2024-06-15T10:00:00Z");
      const yesterday = new Date("2024-06-14T15:00:00Z");
      expect(isYesterday(yesterday, today)).toBe(true);
    });

    it("should return false for today", () => {
      const today = new Date("2024-06-15T10:00:00Z");
      const sameDay = new Date("2024-06-15T05:00:00Z");
      expect(isYesterday(sameDay, today)).toBe(false);
    });

    it("should return false for two days ago", () => {
      const today = new Date("2024-06-15T10:00:00Z");
      const twoDaysAgo = new Date("2024-06-13T10:00:00Z");
      expect(isYesterday(twoDaysAgo, today)).toBe(false);
    });
  });

  describe("configuration constants", () => {
    it("should have expected batch size", () => {
      expect(BATCH_SIZE).toBe(100);
    });

    it("should have expected streak milestones", () => {
      expect(STREAK_MILESTONES).toEqual([7, 30, 100, 365]);
    });
  });
});
