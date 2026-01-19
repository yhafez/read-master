import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler, {
  verifyCronAuth,
  getCutoffDate,
  AUDIT_LOG_RETENTION_DAYS,
  SOFT_DELETE_RETENTION_DAYS,
  AI_USAGE_LOG_RETENTION_DAYS,
} from "./cleanup-expired";

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
    auditLog: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    aIUsageLog: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    book: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    flashcard: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    flashcardReview: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    annotation: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    assessment: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    preReadingGuide: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    readingProgress: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    chapter: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    curriculum: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    curriculumFollow: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    curriculumItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    forumPost: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    forumReply: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    forumVote: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
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

describe("Cleanup Expired Cron", () => {
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
        message: "Cleanup job completed successfully",
        stats: {
          oldAuditLogsDeleted: 0,
          oldAILogsDeleted: 0,
          softDeletedBooksDeleted: 0,
          softDeletedFlashcardsDeleted: 0,
          softDeletedAnnotationsDeleted: 0,
          softDeletedCurriculumsDeleted: 0,
          softDeletedForumPostsDeleted: 0,
          softDeletedForumRepliesDeleted: 0,
          totalDeleted: 0,
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

    it("should include duration in response", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { duration: number };
      expect(typeof json.duration).toBe("number");
    });

    it("should include all cleanup stats in response", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(200);
      const json = res._json as { stats: Record<string, number> };
      expect(json.stats).toHaveProperty("oldAuditLogsDeleted");
      expect(json.stats).toHaveProperty("oldAILogsDeleted");
      expect(json.stats).toHaveProperty("softDeletedBooksDeleted");
      expect(json.stats).toHaveProperty("softDeletedFlashcardsDeleted");
      expect(json.stats).toHaveProperty("softDeletedAnnotationsDeleted");
      expect(json.stats).toHaveProperty("softDeletedCurriculumsDeleted");
      expect(json.stats).toHaveProperty("softDeletedForumPostsDeleted");
      expect(json.stats).toHaveProperty("softDeletedForumRepliesDeleted");
      expect(json.stats).toHaveProperty("totalDeleted");
    });
  });

  describe("verifyCronAuth", () => {
    it("should return true when no cron secret is set", () => {
      const mockReq = { headers: {} } as VercelRequest;
      expect(verifyCronAuth(mockReq)).toBe(true);
    });

    it("should return false when cron secret is set but auth header is missing", () => {
      process.env.CRON_SECRET = "test-secret";
      const mockReq = { headers: {} } as VercelRequest;
      expect(verifyCronAuth(mockReq)).toBe(false);
    });

    it("should return false when cron secret is set but auth header is wrong", () => {
      process.env.CRON_SECRET = "test-secret";
      const mockReq = {
        headers: { authorization: "Bearer wrong-secret" },
      } as VercelRequest;
      expect(verifyCronAuth(mockReq)).toBe(false);
    });

    it("should return true when cron secret matches", () => {
      process.env.CRON_SECRET = "test-secret";
      const mockReq = {
        headers: { authorization: "Bearer test-secret" },
      } as VercelRequest;
      expect(verifyCronAuth(mockReq)).toBe(true);
    });
  });

  describe("getCutoffDate", () => {
    it("should return a date in the past by specified days", () => {
      const cutoff = getCutoffDate(30);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Should be approximately 30 days ago (within same day)
      expect(cutoff.getDate()).toBe(thirtyDaysAgo.getDate());
      expect(cutoff.getMonth()).toBe(thirtyDaysAgo.getMonth());
      expect(cutoff.getFullYear()).toBe(thirtyDaysAgo.getFullYear());
    });

    it("should set time to start of day", () => {
      const cutoff = getCutoffDate(30);
      expect(cutoff.getHours()).toBe(0);
      expect(cutoff.getMinutes()).toBe(0);
      expect(cutoff.getSeconds()).toBe(0);
      expect(cutoff.getMilliseconds()).toBe(0);
    });
  });

  describe("configuration constants", () => {
    it("should have expected retention periods", () => {
      expect(AUDIT_LOG_RETENTION_DAYS).toBe(90);
      expect(SOFT_DELETE_RETENTION_DAYS).toBe(30);
      expect(AI_USAGE_LOG_RETENTION_DAYS).toBe(365);
    });
  });
});
