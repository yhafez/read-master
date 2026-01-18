import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelResponse } from "@vercel/node";

import {
  sendSuccess,
  sendPaginated,
  sendError,
  ErrorCodes,
} from "./response.js";

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

describe("response utilities", () => {
  let mockRes: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    mockRes = createMockResponse();
  });

  describe("sendSuccess", () => {
    it("should send a success response with default status 200", () => {
      const data = { id: "123", name: "Test" };

      sendSuccess(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should send a success response with custom status code", () => {
      const data = { id: "new-item" };

      sendSuccess(mockRes, data, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should handle null data", () => {
      sendSuccess(mockRes, null);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    it("should handle array data", () => {
      const data = [1, 2, 3];

      sendSuccess(mockRes, data);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });
  });

  describe("sendPaginated", () => {
    it("should send paginated response with correct metadata", () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

      sendPaginated(mockRes, items, 1, 10, 25);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items,
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrevious: false,
          },
        },
      });
    });

    it("should calculate totalPages correctly", () => {
      sendPaginated(mockRes, [], 1, 10, 15);

      const response = mockRes.body as {
        data: { pagination: { totalPages: number } };
      };
      expect(response.data.pagination.totalPages).toBe(2);
    });

    it("should set hasNext to false on last page", () => {
      sendPaginated(mockRes, [], 3, 10, 30);

      const response = mockRes.body as {
        data: { pagination: { hasNext: boolean } };
      };
      expect(response.data.pagination.hasNext).toBe(false);
    });

    it("should set hasPrevious to true when not on first page", () => {
      sendPaginated(mockRes, [], 2, 10, 30);

      const response = mockRes.body as {
        data: { pagination: { hasPrevious: boolean } };
      };
      expect(response.data.pagination.hasPrevious).toBe(true);
    });

    it("should handle empty result set", () => {
      sendPaginated(mockRes, [], 1, 10, 0);

      const response = mockRes.body as {
        data: { pagination: { totalPages: number; hasNext: boolean } };
      };
      expect(response.data.pagination.totalPages).toBe(0);
      expect(response.data.pagination.hasNext).toBe(false);
    });
  });

  describe("sendError", () => {
    it("should send error response with default status 400", () => {
      sendError(mockRes, ErrorCodes.VALIDATION_ERROR, "Invalid input");

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
      });
    });

    it("should send error response with custom status code", () => {
      sendError(mockRes, ErrorCodes.NOT_FOUND, "Resource not found", 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      });
    });

    it("should include details when provided", () => {
      const details = { field: "email", reason: "Invalid format" };

      sendError(
        mockRes,
        ErrorCodes.VALIDATION_ERROR,
        "Validation failed",
        400,
        details
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details,
        },
      });
    });

    it("should not include details key when undefined", () => {
      sendError(
        mockRes,
        ErrorCodes.INTERNAL_ERROR,
        "Something went wrong",
        500
      );

      const response = mockRes.body as { error: Record<string, unknown> };
      expect(response.error).not.toHaveProperty("details");
    });
  });

  describe("ErrorCodes", () => {
    it("should have all expected client error codes", () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN");
      expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
      expect(ErrorCodes.CONFLICT).toBe("CONFLICT");
    });

    it("should have all expected server error codes", () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
      expect(ErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR");
    });
  });
});
