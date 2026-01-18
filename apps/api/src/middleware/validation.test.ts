import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ValidationError } from "./error.js";
import {
  CommonSchemas,
  createQuerySchema,
  extractValidated,
  formatValidationErrors,
  parseOrThrow,
  validateBody,
  validateParams,
  validateQuery,
  validateRequest,
  validateWithSchema,
  withValidation,
  type ValidatedRequest,
  type ValidationSchema,
} from "./validation.js";

// Helper to create mock request
function createMockRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    body: {},
    query: {},
    headers: {},
    method: "POST",
    url: "/api/test",
    ...overrides,
  } as VercelRequest;
}

// Helper to create mock response
function createMockResponse(): VercelResponse & {
  statusCode: number;
  body: unknown;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status: vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: unknown) => {
      res.body = data;
      return res;
    }),
    setHeader: vi.fn(),
  } as unknown as VercelResponse & { statusCode: number; body: unknown };
  return res;
}

describe("validateWithSchema", () => {
  it("should return success with valid data", () => {
    const schema = z.object({ name: z.string() });
    const result = validateWithSchema(schema, { name: "John" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John" });
    }
  });

  it("should return errors with invalid data", () => {
    const schema = z.object({ name: z.string() });
    const result = validateWithSchema(schema, { name: 123 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      const firstError = result.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError?.field).toBe("name");
      expect(firstError?.source).toBe("body");
    }
  });

  it("should handle nested objects", () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          age: z.number(),
        }),
      }),
    });
    const result = validateWithSchema(schema, {
      user: { profile: { age: "not a number" } },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const firstError = result.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError?.field).toBe("user.profile.age");
    }
  });
});

describe("validateBody", () => {
  it("should validate body and set source to body", () => {
    const schema = z.object({ title: z.string().min(1) });

    const valid = validateBody(schema, { title: "Hello" });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.title).toBe("Hello");
    }

    const invalid = validateBody(schema, { title: "" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const firstError = invalid.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError?.source).toBe("body");
    }
  });

  it("should handle multiple errors", () => {
    const schema = z.object({
      title: z.string().min(1),
      count: z.number().positive(),
    });

    const result = validateBody(schema, { title: "", count: -5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.every((e) => e.source === "body")).toBe(true);
    }
  });
});

describe("validateQuery", () => {
  it("should validate query params and set source to query", () => {
    const schema = z.object({ page: z.coerce.number().positive() });

    const valid = validateQuery(schema, { page: "5" });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.page).toBe(5);
    }

    const invalid = validateQuery(schema, { page: "abc" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const firstError = invalid.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError?.source).toBe("query");
    }
  });

  it("should handle optional query params", () => {
    const schema = z.object({
      search: z.string().optional(),
      limit: z.coerce.number().default(10),
    });

    const result = validateQuery(schema, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeUndefined();
      expect(result.data.limit).toBe(10);
    }
  });
});

describe("validateParams", () => {
  it("should validate URL params and set source to params", () => {
    const schema = z.object({ id: z.string().uuid() });

    const validId = "550e8400-e29b-41d4-a716-446655440000";
    const valid = validateParams(schema, { id: validId });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.id).toBe(validId);
    }

    const invalid = validateParams(schema, { id: "not-a-uuid" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const firstError = invalid.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError?.source).toBe("params");
      expect(firstError?.field).toBe("id");
    }
  });
});

describe("validateRequest", () => {
  it("should validate all parts of a request", () => {
    const schemas: ValidationSchema = {
      body: z.object({ title: z.string() }),
      query: z.object({ page: z.coerce.number().default(1) }),
      params: z.object({ id: z.string() }),
    };

    const req = createMockRequest({
      body: { title: "Test" },
      query: { page: "2", id: "abc123" },
    });

    const result = validateRequest(schemas, req);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({ title: "Test" });
      expect(result.data.query).toEqual({ page: 2 });
      expect(result.data.params).toEqual({ id: "abc123" });
    }
  });

  it("should aggregate errors from multiple sources", () => {
    const schemas: ValidationSchema = {
      body: z.object({ title: z.string() }),
      query: z.object({ page: z.coerce.number() }),
    };

    const req = createMockRequest({
      body: { title: 123 },
      query: { page: "not-a-number" },
    });

    const result = validateRequest(schemas, req);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBe(2);
      const sources = result.errors.map((e) => e.source);
      expect(sources).toContain("body");
      expect(sources).toContain("query");
    }
  });

  it("should handle partial schema (body only)", () => {
    const schemas: ValidationSchema = {
      body: z.object({ name: z.string() }),
    };

    const req = createMockRequest({
      body: { name: "John" },
    });

    const result = validateRequest(schemas, req);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toEqual({ name: "John" });
      expect(result.data.query).toBeUndefined();
      expect(result.data.params).toBeUndefined();
    }
  });

  it("should handle empty schema", () => {
    const schemas: ValidationSchema = {};
    const req = createMockRequest();

    const result = validateRequest(schemas, req);
    expect(result.success).toBe(true);
  });
});

describe("formatValidationErrors", () => {
  it("should group errors by source", () => {
    const errors = [
      { field: "title", message: "Required", source: "body" as const },
      { field: "page", message: "Must be positive", source: "query" as const },
      { field: "id", message: "Invalid UUID", source: "params" as const },
    ];

    const grouped = formatValidationErrors(errors);

    expect(grouped.body).toEqual({ title: "Required" });
    expect(grouped.query).toEqual({ page: "Must be positive" });
    expect(grouped.params).toEqual({ id: "Invalid UUID" });
  });

  it("should handle multiple errors in same source", () => {
    const errors = [
      { field: "title", message: "Required", source: "body" as const },
      { field: "content", message: "Too short", source: "body" as const },
    ];

    const grouped = formatValidationErrors(errors);

    expect(grouped.body).toEqual({
      title: "Required",
      content: "Too short",
    });
    expect(grouped.query).toBeUndefined();
  });

  it("should handle empty errors array", () => {
    const grouped = formatValidationErrors([]);
    expect(grouped).toEqual({});
  });
});

describe("withValidation", () => {
  it("should call handler with validated data on success", async () => {
    const schemas: ValidationSchema = {
      body: z.object({ name: z.string() }),
    };

    const handler = vi.fn();
    const wrapped = withValidation(schemas, handler);

    const req = createMockRequest({ body: { name: "John" } });
    const res = createMockResponse();

    await wrapped(req, res);

    expect(handler).toHaveBeenCalled();
    const firstCall = handler.mock.calls[0];
    expect(firstCall).toBeDefined();
    const calledReq = firstCall?.[0] as
      | ValidatedRequest<typeof schemas>
      | undefined;
    expect(calledReq?.validated.body).toEqual({ name: "John" });
  });

  it("should return 400 with validation errors on failure", async () => {
    const schemas: ValidationSchema = {
      body: z.object({ name: z.string(), age: z.number() }),
    };

    const handler = vi.fn();
    const wrapped = withValidation(schemas, handler);

    const req = createMockRequest({ body: { name: 123 } });
    const res = createMockResponse();

    await wrapped(req, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: expect.objectContaining({
          body: expect.any(Object),
        }),
      },
    });
  });

  it("should handle async handlers", async () => {
    const schemas: ValidationSchema = {
      body: z.object({ id: z.string() }),
    };

    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = withValidation(schemas, handler);

    const req = createMockRequest({ body: { id: "test-id" } });
    const res = createMockResponse();

    await wrapped(req, res);

    expect(handler).toHaveBeenCalled();
  });

  it("should preserve validated data types", async () => {
    const schemas = {
      body: z.object({
        count: z.number(),
        active: z.boolean(),
      }),
      query: z.object({
        page: z.coerce.number().default(1),
      }),
    };

    type ExpectedBody = { count: number; active: boolean };

    const handler = vi.fn();
    const wrapped = withValidation(schemas, handler);

    const req = createMockRequest({
      body: { count: 5, active: true },
      query: { page: "3" },
    });
    const res = createMockResponse();

    await wrapped(req, res);

    const firstCall = handler.mock.calls[0];
    expect(firstCall).toBeDefined();
    const calledReq = firstCall?.[0] as
      | ValidatedRequest<typeof schemas>
      | undefined;
    expect(calledReq).toBeDefined();
    const body = calledReq?.validated.body as ExpectedBody | undefined;
    expect(body?.count).toBe(5);
    expect(body?.active).toBe(true);
    expect(calledReq?.validated.query?.page).toBe(3);
  });
});

describe("parseOrThrow", () => {
  it("should return parsed value on success", () => {
    const result = parseOrThrow(z.string().min(1), "hello", "name");
    expect(result).toBe("hello");
  });

  it("should throw ValidationError on failure", () => {
    expect(() => parseOrThrow(z.string().min(1), "", "name")).toThrow(
      ValidationError
    );
  });

  it("should include field name in error message", () => {
    try {
      parseOrThrow(z.number(), "not-a-number", "userId");
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain("userId");
    }
  });

  it("should handle complex schemas", () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    const valid = parseOrThrow(
      schema,
      { email: "test@example.com", age: 25 },
      "user"
    );
    expect(valid).toEqual({ email: "test@example.com", age: 25 });

    expect(() =>
      parseOrThrow(schema, { email: "invalid", age: 10 }, "user")
    ).toThrow(ValidationError);
  });
});

describe("extractValidated", () => {
  it("should extract validated data on success", () => {
    const schema = z.object({ id: z.string() });
    const result = extractValidated(schema, { id: "abc" });
    expect(result).toEqual({ id: "abc" });
  });

  it("should throw ValidationError with detailed message", () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
    });

    try {
      extractValidated(schema, { name: 123, count: "abc" }, "body");
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain("body");
    }
  });

  it("should use correct source in error message", () => {
    const schema = z.object({ page: z.number() });

    try {
      extractValidated(schema, { page: "abc" }, "query");
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as ValidationError).message).toContain("query");
    }
  });
});

describe("CommonSchemas", () => {
  describe("uuid", () => {
    it("should validate valid UUIDs", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(CommonSchemas.uuid.safeParse(validUuid).success).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(CommonSchemas.uuid.safeParse("not-a-uuid").success).toBe(false);
      expect(CommonSchemas.uuid.safeParse("").success).toBe(false);
    });
  });

  describe("pagination", () => {
    it("should provide defaults", () => {
      const result = CommonSchemas.pagination.parse({});
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it("should coerce string values", () => {
      const result = CommonSchemas.pagination.parse({ page: "5", limit: "50" });
      expect(result).toEqual({ page: 5, limit: 50 });
    });

    it("should reject invalid values", () => {
      expect(CommonSchemas.pagination.safeParse({ page: 0 }).success).toBe(
        false
      );
      expect(CommonSchemas.pagination.safeParse({ limit: 200 }).success).toBe(
        false
      );
    });
  });

  describe("idParam", () => {
    it("should validate UUID id parameter", () => {
      const validId = "550e8400-e29b-41d4-a716-446655440000";
      const result = CommonSchemas.idParam.safeParse({ id: validId });
      expect(result.success).toBe(true);
    });

    it("should reject non-UUID ids", () => {
      expect(CommonSchemas.idParam.safeParse({ id: "123" }).success).toBe(
        false
      );
    });
  });

  describe("sortDirection", () => {
    it("should accept asc and desc", () => {
      expect(CommonSchemas.sortDirection.parse("asc")).toBe("asc");
      expect(CommonSchemas.sortDirection.parse("desc")).toBe("desc");
    });

    it("should default to desc", () => {
      expect(CommonSchemas.sortDirection.parse(undefined)).toBe("desc");
    });
  });

  describe("queryBoolean", () => {
    it("should transform string booleans", () => {
      expect(CommonSchemas.queryBoolean.parse("true")).toBe(true);
      expect(CommonSchemas.queryBoolean.parse("false")).toBe(false);
      expect(CommonSchemas.queryBoolean.parse("1")).toBe(true);
      expect(CommonSchemas.queryBoolean.parse("0")).toBe(false);
    });
  });

  describe("commaSeparated", () => {
    it("should split comma-separated values", () => {
      expect(CommonSchemas.commaSeparated.parse("a,b,c")).toEqual([
        "a",
        "b",
        "c",
      ]);
      expect(CommonSchemas.commaSeparated.parse("a, b, c")).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("should handle single values", () => {
      expect(CommonSchemas.commaSeparated.parse("single")).toEqual(["single"]);
    });
  });
});

describe("createQuerySchema", () => {
  it("should create schema with custom fields", () => {
    const schema = createQuerySchema({
      search: z.string().optional(),
      status: z.enum(["active", "inactive"]),
    });

    const result = schema.parse({ status: "active" }) as { status: string };
    expect(result.status).toBe("active");
  });

  it("should add pagination fields when enabled", () => {
    const schema = createQuerySchema(
      { search: z.string().optional() },
      { pagination: true }
    );

    const result = schema.parse({}) as { page: number; limit: number };
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("should add sort fields when enabled", () => {
    const schema = createQuerySchema(
      { search: z.string().optional() },
      { sort: true }
    );

    const result = schema.parse({}) as { sortDir: string };
    expect(result.sortDir).toBe("desc");
  });

  it("should combine pagination and sort", () => {
    const schema = createQuerySchema(
      { filter: z.string().optional() },
      { pagination: true, sort: true }
    );

    const result = schema.parse({ sortBy: "name", page: "2" }) as {
      page: number;
      sortBy: string;
      sortDir: string;
    };
    expect(result.page).toBe(2);
    expect(result.sortBy).toBe("name");
    expect(result.sortDir).toBe("desc");
  });
});

describe("Type inference", () => {
  it("should correctly infer body types", async () => {
    const schemas = {
      body: z.object({
        title: z.string(),
        count: z.number(),
      }),
    };

    const handler = async (
      req: ValidatedRequest<typeof schemas>,
      _res: VercelResponse
    ) => {
      // These should be correctly typed
      const body = req.validated.body;
      expect(body).toBeDefined();
      const title: string = body?.title ?? "";
      const count: number = body?.count ?? 0;
      expect(typeof title).toBe("string");
      expect(typeof count).toBe("number");
    };

    const wrapped = withValidation(schemas, handler);
    const req = createMockRequest({ body: { title: "Test", count: 5 } });
    const res = createMockResponse();

    await wrapped(req, res);
  });
});
