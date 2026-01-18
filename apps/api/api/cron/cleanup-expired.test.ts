import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./cleanup-expired";

// Mock the logger
vi.mock("../../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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

  it("should return 200 for successful execution without cron secret", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({
      success: true,
      message: "Cleanup job completed",
      stats: {
        expiredDownloadsDeleted: 0,
        oldAuditLogsDeleted: 0,
        orphanedFilesDeleted: 0,
        softDeletedRecordsPurged: 0,
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

  it("should include all cleanup stats in response", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    const json = res._json as { duration: number; stats: object };
    expect(typeof json.duration).toBe("number");
    expect(json.stats).toEqual({
      expiredDownloadsDeleted: 0,
      oldAuditLogsDeleted: 0,
      orphanedFilesDeleted: 0,
      softDeletedRecordsPurged: 0,
    });
  });
});
