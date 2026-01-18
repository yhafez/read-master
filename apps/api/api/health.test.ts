import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

describe("health endpoint", () => {
  let mockReq: VercelRequest;
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T12:00:00.000Z"));
  });

  it("should return 200 status code", () => {
    handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it("should return healthy status", () => {
    handler(mockReq, mockRes);

    const body = mockRes.body as { status: string };
    expect(body.status).toBe("healthy");
  });

  it("should include timestamp in ISO format", () => {
    handler(mockReq, mockRes);

    const body = mockRes.body as { timestamp: string };
    expect(body.timestamp).toBe("2026-01-17T12:00:00.000Z");
  });

  it("should include version", () => {
    handler(mockReq, mockRes);

    const body = mockRes.body as { version: string };
    expect(body.version).toBeDefined();
    expect(typeof body.version).toBe("string");
  });

  it("should include environment", () => {
    handler(mockReq, mockRes);

    const body = mockRes.body as { environment: string };
    expect(body.environment).toBeDefined();
  });

  it("should include checks object with api status", () => {
    handler(mockReq, mockRes);

    const body = mockRes.body as { checks: { api: string } };
    expect(body.checks).toBeDefined();
    expect(body.checks.api).toBe("ok");
  });
});
