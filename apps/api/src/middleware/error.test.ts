import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, z } from "zod";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ServiceUnavailableError,
  formatZodErrors,
  isPrismaError,
  handlePrismaError,
  createErrorResponse,
  handleError,
  withErrorHandling,
  assert,
  assertExists,
} from "./error.js";
import { ErrorCodes } from "../utils/response.js";

// Mock logger to prevent console output during tests
vi.mock("../utils/logger.js", () => ({
  logError: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Helper to create mock response
function createMockResponse(): VercelResponse {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as VercelResponse;
  return res;
}

// Helper to create mock request
function createMockRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    method: "GET",
    url: "/api/test",
    headers: {},
    ...overrides,
  } as VercelRequest;
}

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with default values", () => {
      const error = new AppError("Something went wrong");

      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error.name).toBe("AppError");
    });

    it("should create error with custom values", () => {
      const error = new AppError(
        "Custom error",
        422,
        ErrorCodes.VALIDATION_ERROR,
        { field: "email" }
      );

      expect(error.message).toBe("Custom error");
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: "email" });
    });

    it("should capture stack trace", () => {
      const error = new AppError("Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });
  });

  describe("ValidationError", () => {
    it("should create with correct defaults", () => {
      const error = new ValidationError("Invalid input");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.name).toBe("ValidationError");
    });

    it("should accept details", () => {
      const error = new ValidationError("Invalid input", { field: "name" });
      expect(error.details).toEqual({ field: "name" });
    });
  });

  describe("UnauthorizedError", () => {
    it("should create with default message", () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Token expired");
      expect(error.message).toBe("Token expired");
    });
  });

  describe("ForbiddenError", () => {
    it("should create with default message", () => {
      const error = new ForbiddenError();

      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it("should accept custom message", () => {
      const error = new ForbiddenError("Admin access required");
      expect(error.message).toBe("Admin access required");
    });
  });

  describe("NotFoundError", () => {
    it("should create with default resource", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it("should accept custom resource name", () => {
      const error = new NotFoundError("Book");
      expect(error.message).toBe("Book not found");
    });
  });

  describe("ConflictError", () => {
    it("should create with default message", () => {
      const error = new ConflictError();

      expect(error.message).toBe("Resource already exists");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCodes.CONFLICT);
    });

    it("should accept custom message", () => {
      const error = new ConflictError("Email already in use");
      expect(error.message).toBe("Email already in use");
    });
  });

  describe("RateLimitError", () => {
    it("should create with default message", () => {
      const error = new RateLimitError();

      expect(error.message).toBe("Rate limit exceeded");
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(error.retryAfter).toBeUndefined();
    });

    it("should accept retryAfter value", () => {
      const error = new RateLimitError("Too many requests", 60);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("DatabaseError", () => {
    it("should create with default message", () => {
      const error = new DatabaseError();

      expect(error.message).toBe("Database operation failed");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCodes.DATABASE_ERROR);
    });
  });

  describe("ServiceUnavailableError", () => {
    it("should create with default message", () => {
      const error = new ServiceUnavailableError();

      expect(error.message).toBe("Service temporarily unavailable");
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    });
  });
});

describe("formatZodErrors", () => {
  it("should format single field error", () => {
    const schema = z.object({ email: z.string().email() });

    try {
      schema.parse({ email: "invalid" });
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodErrors(error);
        expect(formatted).toHaveLength(1);
        expect(formatted[0]?.field).toBe("email");
        expect(formatted[0]?.message).toContain("email");
      }
    }
  });

  it("should format nested field errors", () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          age: z.number().min(18),
        }),
      }),
    });

    try {
      schema.parse({ user: { profile: { age: 10 } } });
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodErrors(error);
        expect(formatted).toHaveLength(1);
        expect(formatted[0]?.field).toBe("user.profile.age");
      }
    }
  });

  it("should format multiple errors", () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    try {
      schema.parse({ name: "", email: "invalid" });
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodErrors(error);
        expect(formatted.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("should handle root-level errors with 'unknown' field", () => {
    const schema = z.string().min(5);

    try {
      schema.parse("ab");
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = formatZodErrors(error);
        expect(formatted[0]?.field).toBe("unknown");
      }
    }
  });
});

describe("isPrismaError", () => {
  it("should return true for Prisma-like errors", () => {
    const prismaError = {
      code: "P2002",
      message: "Unique constraint failed",
      meta: { target: ["email"] },
    };

    expect(isPrismaError(prismaError)).toBe(true);
  });

  it("should return false for non-Prisma errors", () => {
    expect(isPrismaError(new Error("Regular error"))).toBe(false);
    expect(isPrismaError({ code: "ERR_HTTP", message: "Not prisma" })).toBe(
      false
    );
    expect(isPrismaError(null)).toBe(false);
    expect(isPrismaError(undefined)).toBe(false);
    expect(isPrismaError("string error")).toBe(false);
    expect(isPrismaError({ message: "No code" })).toBe(false);
  });

  it("should return true for various Prisma error codes", () => {
    expect(isPrismaError({ code: "P2000", message: "test" })).toBe(true);
    expect(isPrismaError({ code: "P2025", message: "test" })).toBe(true);
    expect(isPrismaError({ code: "P2034", message: "test" })).toBe(true);
  });
});

describe("handlePrismaError", () => {
  it("should handle P2002 (unique constraint)", () => {
    const error = {
      code: "P2002",
      message: "Unique constraint failed",
      meta: { target: ["email"] },
    };

    const result = handlePrismaError(error);

    expect(result).toBeInstanceOf(ConflictError);
    expect(result.statusCode).toBe(409);
    expect(result.message).toContain("email");
    expect(result.message).toContain("already exists");
  });

  it("should handle P2002 with multiple fields", () => {
    const error = {
      code: "P2002",
      message: "Unique constraint failed",
      meta: { target: ["userId", "bookId"] },
    };

    const result = handlePrismaError(error);
    expect(result.message).toContain("userId, bookId");
  });

  it("should handle P2025 (record not found)", () => {
    const error = {
      code: "P2025",
      message: "Record not found",
    };

    const result = handlePrismaError(error);

    expect(result).toBeInstanceOf(NotFoundError);
    expect(result.statusCode).toBe(404);
  });

  it("should handle P2003 (foreign key constraint)", () => {
    const error = {
      code: "P2003",
      message: "Foreign key constraint failed",
    };

    const result = handlePrismaError(error);

    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe("Related record not found");
  });

  it("should handle P2014 (required relation)", () => {
    const error = {
      code: "P2014",
      message: "Required relation missing",
    };

    const result = handlePrismaError(error);

    expect(result).toBeInstanceOf(ValidationError);
    expect(result.message).toBe("Required relation missing");
  });

  it("should handle P2024 (connection timeout)", () => {
    const error = {
      code: "P2024",
      message: "Connection pool timeout",
    };

    const result = handlePrismaError(error);

    expect(result).toBeInstanceOf(ServiceUnavailableError);
    expect(result.statusCode).toBe(503);
  });

  it("should handle unknown Prisma errors", () => {
    const error = {
      code: "P9999",
      message: "Unknown error",
    };

    const result = handlePrismaError(error);

    expect(result).toBeInstanceOf(DatabaseError);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("A database error occurred");
  });
});

describe("createErrorResponse", () => {
  it("should create response without details", () => {
    const response = createErrorResponse(
      ErrorCodes.NOT_FOUND,
      "Book not found"
    );

    expect(response).toEqual({
      success: false,
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: "Book not found",
      },
    });
  });

  it("should create response with details", () => {
    const response = createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      "Validation failed",
      [{ field: "email", message: "Invalid email" }]
    );

    expect(response.error.details).toEqual([
      { field: "email", message: "Invalid email" },
    ]);
  });
});

describe("handleError", () => {
  let res: VercelResponse;

  beforeEach(() => {
    res = createMockResponse();
    vi.clearAllMocks();
  });

  it("should handle AppError", () => {
    const error = new NotFoundError("Book");

    handleError(error, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: "Book not found",
      },
    });
  });

  it("should handle ZodError", () => {
    const schema = z.object({ email: z.string().email() });
    let zodError: ZodError | null = null;

    try {
      schema.parse({ email: "invalid" });
    } catch (e) {
      zodError = e as ZodError;
    }

    handleError(zodError, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = vi.mocked(res.json).mock.calls[0]?.[0];
    expect(jsonCall?.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(jsonCall?.error.details).toBeDefined();
  });

  it("should handle Prisma error", () => {
    const prismaError = {
      code: "P2002",
      message: "Unique constraint",
      meta: { target: ["email"] },
    };

    handleError(prismaError, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("should handle unknown errors", () => {
    const error = new Error("Something unexpected");

    handleError(error, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCall = vi.mocked(res.json).mock.calls[0]?.[0];
    expect(jsonCall?.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });

  it("should handle non-Error unknown errors", () => {
    handleError("string error", res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("should set Retry-After header for rate limit errors", () => {
    const error = new RateLimitError("Too many requests", 60);

    handleError(error, res);

    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", 60);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("should include context in logging", async () => {
    const { logError } = await import("../utils/logger.js");
    const error = new AppError("Test error", 500);
    const context = { userId: "user123", requestId: "req456" };

    handleError(error, res, context);

    expect(logError).toHaveBeenCalledWith(
      "Test error",
      error,
      expect.objectContaining({
        statusCode: 500,
        userId: "user123",
        requestId: "req456",
      })
    );
  });

  it("should include error details in response", () => {
    const error = new ValidationError("Invalid input", { field: "email" });

    handleError(error, res);

    const jsonCall = vi.mocked(res.json).mock.calls[0]?.[0];
    expect(jsonCall?.error.details).toEqual({ field: "email" });
  });
});

describe("withErrorHandling", () => {
  let res: VercelResponse;
  let req: VercelRequest;

  beforeEach(() => {
    res = createMockResponse();
    req = createMockRequest();
    vi.clearAllMocks();
  });

  it("should call handler normally when no error", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = withErrorHandling(handler);

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledWith(req, res);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should catch and handle thrown errors", async () => {
    const handler = vi.fn().mockRejectedValue(new NotFoundError("User"));
    const wrapped = withErrorHandling(handler);

    await wrapped(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should catch and handle sync errors", async () => {
    const handler = vi.fn().mockImplementation(() => {
      throw new ValidationError("Bad input");
    });
    const wrapped = withErrorHandling(handler);

    await wrapped(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should include request context in error handling", async () => {
    const { logError } = await import("../utils/logger.js");
    const handler = vi.fn().mockRejectedValue(new AppError("Error", 500));
    const wrapped = withErrorHandling(handler);

    const requestWithAuth = createMockRequest({
      method: "POST",
      url: "/api/books",
    }) as VercelRequest & { auth: { userId: string } };
    requestWithAuth.auth = { userId: "user123" };

    await wrapped(requestWithAuth, res);

    expect(logError).toHaveBeenCalledWith(
      "Error",
      expect.any(AppError),
      expect.objectContaining({
        method: "POST",
        url: "/api/books",
        userId: "user123",
      })
    );
  });

  it("should handle unauthenticated requests", async () => {
    const handler = vi.fn().mockRejectedValue(new AppError("Error", 500));
    const wrapped = withErrorHandling(handler);

    await wrapped(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("assert", () => {
  it("should not throw when condition is truthy", () => {
    expect(() => assert(true, "Error message")).not.toThrow();
    expect(() => assert(1, "Error message")).not.toThrow();
    expect(() => assert("string", "Error message")).not.toThrow();
    expect(() => assert({}, "Error message")).not.toThrow();
  });

  it("should throw AppError with string message", () => {
    expect(() => assert(false, "Something is wrong")).toThrow(AppError);

    try {
      assert(false, "Custom message");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).toBe("Custom message");
      expect((error as AppError).statusCode).toBe(400);
    }
  });

  it("should throw provided error", () => {
    const customError = new ForbiddenError("No access");

    expect(() => assert(false, customError)).toThrow(ForbiddenError);
    expect(() => assert(false, customError)).toThrow("No access");
  });

  it("should handle falsy conditions", () => {
    expect(() => assert(null, "Error")).toThrow();
    expect(() => assert(undefined, "Error")).toThrow();
    expect(() => assert(0, "Error")).toThrow();
    expect(() => assert("", "Error")).toThrow();
  });
});

describe("assertExists", () => {
  it("should not throw for existing values", () => {
    expect(() => assertExists("value", "Item")).not.toThrow();
    expect(() => assertExists(0, "Number")).not.toThrow();
    expect(() => assertExists(false, "Boolean")).not.toThrow();
    expect(() => assertExists({}, "Object")).not.toThrow();
    expect(() => assertExists([], "Array")).not.toThrow();
  });

  it("should throw NotFoundError for null", () => {
    expect(() => assertExists(null, "User")).toThrow(NotFoundError);
    expect(() => assertExists(null, "User")).toThrow("User not found");
  });

  it("should throw NotFoundError for undefined", () => {
    expect(() => assertExists(undefined, "Book")).toThrow(NotFoundError);
    expect(() => assertExists(undefined, "Book")).toThrow("Book not found");
  });

  it("should narrow type after assertion", () => {
    const value: string | null = "test";
    assertExists(value, "Value");
    // TypeScript should know value is string here
    const uppercased: string = value.toUpperCase();
    expect(uppercased).toBe("TEST");
  });
});

describe("Error inheritance", () => {
  it("all custom errors should extend AppError", () => {
    expect(new ValidationError("test")).toBeInstanceOf(AppError);
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ConflictError()).toBeInstanceOf(AppError);
    expect(new RateLimitError()).toBeInstanceOf(AppError);
    expect(new DatabaseError()).toBeInstanceOf(AppError);
    expect(new ServiceUnavailableError()).toBeInstanceOf(AppError);
  });

  it("all custom errors should extend Error", () => {
    expect(new ValidationError("test")).toBeInstanceOf(Error);
    expect(new AppError("test")).toBeInstanceOf(Error);
  });
});
