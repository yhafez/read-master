import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelResponse } from "@vercel/node";

import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendAccepted,
  sendPaginated,
  sendError,
  createSuccessResponse,
  createPaginatedResponse,
  createErrorResponse,
  calculatePaginationMeta,
  isSuccessResponse,
  isErrorResponse,
  response,
  responseUtils,
  ErrorCodes,
} from "./response.js";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginationMeta,
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

  describe("sendCreated", () => {
    it("should send a 201 response with data", () => {
      const data = { id: "new-resource", name: "Test" };

      sendCreated(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should handle complex data structures", () => {
      const data = {
        id: "book-123",
        chapters: [{ id: 1 }, { id: 2 }],
        metadata: { author: "Test Author" },
      };

      sendCreated(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.body).toEqual({
        success: true,
        data,
      });
    });
  });

  describe("sendNoContent", () => {
    it("should send a 204 response with no body", () => {
      const endMock = vi.fn();
      mockRes.end = endMock;

      sendNoContent(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(endMock).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe("sendAccepted", () => {
    it("should send a 202 response with job info", () => {
      const data = { jobId: "job-123", message: "Processing started" };

      sendAccepted(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should handle custom data types", () => {
      const data = { taskId: "task-456", estimatedTime: 30 };

      sendAccepted(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.body).toEqual({
        success: true,
        data,
      });
    });
  });

  describe("createSuccessResponse", () => {
    it("should create a success response object", () => {
      const data = { id: "123", name: "Test" };

      const response = createSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        data,
      });
    });

    it("should handle null data", () => {
      const response = createSuccessResponse(null);

      expect(response).toEqual({
        success: true,
        data: null,
      });
    });

    it("should handle array data", () => {
      const data = [1, 2, 3];

      const response = createSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        data,
      });
    });

    it("should be properly typed", () => {
      const response: ApiSuccessResponse<{ id: string }> =
        createSuccessResponse({ id: "123" });

      expect(response.success).toBe(true);
      expect(response.data.id).toBe("123");
    });
  });

  describe("createPaginatedResponse", () => {
    it("should create a paginated response object", () => {
      const items = [{ id: 1 }, { id: 2 }];

      const response = createPaginatedResponse(items, 1, 10, 25);

      expect(response).toEqual({
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

    it("should handle last page correctly", () => {
      const response = createPaginatedResponse([], 3, 10, 25);

      expect(response.data.pagination.hasNext).toBe(false);
      expect(response.data.pagination.hasPrevious).toBe(true);
    });

    it("should handle empty results", () => {
      const response = createPaginatedResponse([], 1, 10, 0);

      expect(response.data.pagination.totalPages).toBe(0);
      expect(response.data.pagination.hasNext).toBe(false);
      expect(response.data.pagination.hasPrevious).toBe(false);
    });

    it("should handle single page results", () => {
      const items = [{ id: 1 }];
      const response = createPaginatedResponse(items, 1, 10, 1);

      expect(response.data.pagination.totalPages).toBe(1);
      expect(response.data.pagination.hasNext).toBe(false);
      expect(response.data.pagination.hasPrevious).toBe(false);
    });
  });

  describe("createErrorResponse", () => {
    it("should create an error response object", () => {
      const response = createErrorResponse("NOT_FOUND", "Resource not found");

      expect(response).toEqual({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      });
    });

    it("should include details when provided", () => {
      const details = { field: "email", reason: "Invalid format" };

      const response = createErrorResponse(
        "VALIDATION_ERROR",
        "Validation failed",
        details
      );

      expect(response).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details,
        },
      });
    });

    it("should not include details key when undefined", () => {
      const response = createErrorResponse(
        "INTERNAL_ERROR",
        "Something went wrong"
      );

      expect(response.error).not.toHaveProperty("details");
    });

    it("should be properly typed", () => {
      const response: ApiErrorResponse = createErrorResponse(
        "ERROR",
        "Message"
      );

      expect(response.success).toBe(false);
      expect(response.error.code).toBe("ERROR");
    });
  });

  describe("calculatePaginationMeta", () => {
    it("should calculate correct pagination metadata", () => {
      const meta = calculatePaginationMeta(1, 10, 25);

      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrevious: false,
      });
    });

    it("should handle middle page", () => {
      const meta = calculatePaginationMeta(2, 10, 30);

      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrevious).toBe(true);
    });

    it("should handle last page", () => {
      const meta = calculatePaginationMeta(3, 10, 30);

      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrevious).toBe(true);
    });

    it("should handle empty results", () => {
      const meta = calculatePaginationMeta(1, 10, 0);

      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrevious).toBe(false);
    });

    it("should be properly typed", () => {
      const meta: PaginationMeta = calculatePaginationMeta(1, 10, 100);

      expect(typeof meta.page).toBe("number");
      expect(typeof meta.limit).toBe("number");
      expect(typeof meta.total).toBe("number");
      expect(typeof meta.totalPages).toBe("number");
      expect(typeof meta.hasNext).toBe("boolean");
      expect(typeof meta.hasPrevious).toBe("boolean");
    });

    it("should handle partial last page", () => {
      const meta = calculatePaginationMeta(1, 10, 15);

      expect(meta.totalPages).toBe(2);
      expect(meta.hasNext).toBe(true);
    });
  });

  describe("isSuccessResponse", () => {
    it("should return true for success responses", () => {
      const response = { success: true as const, data: { id: "123" } };

      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return false for error responses", () => {
      const response = {
        success: false as const,
        error: { code: "ERROR", message: "Failed" },
      };

      expect(isSuccessResponse(response)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const response:
        | { success: true; data: { id: string } }
        | { success: false; error: { code: string; message: string } } = {
        success: true,
        data: { id: "123" },
      };

      if (isSuccessResponse(response)) {
        // TypeScript should now know response.data exists
        expect(response.data.id).toBe("123");
      }
    });
  });

  describe("isErrorResponse", () => {
    it("should return true for error responses", () => {
      const response = {
        success: false as const,
        error: { code: "ERROR", message: "Failed" },
      };

      expect(isErrorResponse(response)).toBe(true);
    });

    it("should return false for success responses", () => {
      const response = { success: true as const, data: { id: "123" } };

      expect(isErrorResponse(response)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const response:
        | { success: true; data: { id: string } }
        | { success: false; error: { code: string; message: string } } = {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      };

      if (isErrorResponse(response)) {
        // TypeScript should now know response.error exists
        expect(response.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("response object", () => {
    it("should have all response sending functions", () => {
      expect(response.success).toBe(sendSuccess);
      expect(response.created).toBe(sendCreated);
      expect(response.noContent).toBe(sendNoContent);
      expect(response.accepted).toBe(sendAccepted);
      expect(response.paginated).toBe(sendPaginated);
      expect(response.error).toBe(sendError);
    });

    it("should work when called via response object", () => {
      const data = { id: "test" };

      response.success(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.body).toEqual({
        success: true,
        data,
      });
    });
  });

  describe("responseUtils object", () => {
    it("should have all response utility functions", () => {
      expect(responseUtils.createSuccess).toBe(createSuccessResponse);
      expect(responseUtils.createPaginated).toBe(createPaginatedResponse);
      expect(responseUtils.createError).toBe(createErrorResponse);
      expect(responseUtils.calculatePaginationMeta).toBe(
        calculatePaginationMeta
      );
      expect(responseUtils.isSuccess).toBe(isSuccessResponse);
      expect(responseUtils.isError).toBe(isErrorResponse);
    });

    it("should work when called via responseUtils object", () => {
      const result = responseUtils.createSuccess({ id: "test" });

      expect(result).toEqual({
        success: true,
        data: { id: "test" },
      });
    });
  });
});
