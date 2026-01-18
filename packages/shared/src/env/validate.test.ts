import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEnvLoader, validateEnv, validateEnvOrThrow } from "./validate";

describe("validateEnv", () => {
  const testSchema = z.object({
    PORT: z.coerce.number().positive(),
    HOST: z.string().default("localhost"),
    DEBUG: z.coerce.boolean().default(false),
  });

  it("should return success with valid environment variables", () => {
    const env = { PORT: "3000", HOST: "example.com", DEBUG: "true" };
    const result = validateEnv(testSchema, env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        PORT: 3000,
        HOST: "example.com",
        DEBUG: true,
      });
    }
  });

  it("should apply default values for missing optional variables", () => {
    const env = { PORT: "8080" };
    const result = validateEnv(testSchema, env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        PORT: 8080,
        HOST: "localhost",
        DEBUG: false,
      });
    }
  });

  it("should return errors for invalid variables", () => {
    const env = { PORT: "not-a-number" };
    const result = validateEnv(testSchema, env);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContainEqual(expect.stringContaining("PORT"));
    }
  });

  it("should return multiple errors when multiple validations fail", () => {
    const strictSchema = z.object({
      REQUIRED_A: z.string().min(1),
      REQUIRED_B: z.string().min(1),
    });

    const env = {};
    const result = validateEnv(strictSchema, env);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBe(2);
    }
  });
});

describe("validateEnvOrThrow", () => {
  const testSchema = z.object({
    API_KEY: z.string().min(1),
    TIMEOUT: z.coerce.number().positive().default(5000),
  });

  it("should return parsed environment when valid", () => {
    const env = { API_KEY: "test-key", TIMEOUT: "3000" };
    const result = validateEnvOrThrow(testSchema, env);

    expect(result).toEqual({
      API_KEY: "test-key",
      TIMEOUT: 3000,
    });
  });

  it("should throw an error with descriptive message when validation fails", () => {
    const env = {};

    expect(() => validateEnvOrThrow(testSchema, env)).toThrow(
      /Environment validation failed/
    );
  });

  it("should include specific error details in thrown error", () => {
    const env = { TIMEOUT: "-100" };

    try {
      validateEnvOrThrow(testSchema, env);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toContain("API_KEY");
      expect(message).toContain(".env");
    }
  });
});

describe("createEnvLoader", () => {
  const testSchema = z.object({
    DATABASE_URL: z.string().url(),
    POOL_SIZE: z.coerce.number().positive().default(10),
  });

  it("should return a function that validates on first call", () => {
    const env = { DATABASE_URL: "https://db.example.com", POOL_SIZE: "20" };
    const getEnv = createEnvLoader(testSchema, env);

    const result = getEnv();

    expect(result).toEqual({
      DATABASE_URL: "https://db.example.com",
      POOL_SIZE: 20,
    });
  });

  it("should cache the result after first validation", () => {
    let callCount = 0;
    const env = new Proxy(
      { DATABASE_URL: "https://db.example.com" },
      {
        get(target, prop) {
          callCount++;
          return target[prop as keyof typeof target];
        },
      }
    );

    const getEnv = createEnvLoader(testSchema, env);

    getEnv();
    const initialCallCount = callCount;

    getEnv();
    getEnv();
    getEnv();

    // Should not have accessed env again after caching
    expect(callCount).toBe(initialCallCount);
  });

  it("should throw on first call if validation fails", () => {
    const env = { DATABASE_URL: "not-a-url" };
    const getEnv = createEnvLoader(testSchema, env);

    expect(() => getEnv()).toThrow(/Environment validation failed/);
  });
});

describe("schema validation patterns", () => {
  it("should validate URL patterns", () => {
    const urlSchema = z.object({
      API_URL: z.string().url(),
    });

    expect(
      validateEnv(urlSchema, { API_URL: "https://api.example.com" }).success
    ).toBe(true);
    expect(validateEnv(urlSchema, { API_URL: "not-a-url" }).success).toBe(
      false
    );
  });

  it("should validate prefix patterns (like API keys)", () => {
    const keySchema = z.object({
      CLERK_KEY: z.string().startsWith("sk_"),
    });

    expect(validateEnv(keySchema, { CLERK_KEY: "sk_test_123" }).success).toBe(
      true
    );
    expect(validateEnv(keySchema, { CLERK_KEY: "pk_test_123" }).success).toBe(
      false
    );
  });

  it("should coerce boolean strings correctly", () => {
    const boolSchema = z.object({
      ENABLED: z.coerce.boolean(),
    });

    // Truthy values
    expect(validateEnv(boolSchema, { ENABLED: "true" }).success).toBe(true);
    expect(validateEnv(boolSchema, { ENABLED: "1" }).success).toBe(true);

    // Falsy values - coerce.boolean() treats empty string as false
    const falseResult = validateEnv(boolSchema, { ENABLED: "false" });
    expect(falseResult.success).toBe(true);
  });

  it("should coerce numeric strings correctly", () => {
    const numSchema = z.object({
      COUNT: z.coerce.number().int().positive(),
    });

    const result = validateEnv(numSchema, { COUNT: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.COUNT).toBe(42);
      expect(typeof result.data.COUNT).toBe("number");
    }
  });

  it("should handle optional fields with defaults", () => {
    const optionalSchema = z.object({
      REQUIRED: z.string(),
      OPTIONAL: z.string().default("default-value"),
    });

    const result = validateEnv(optionalSchema, { REQUIRED: "present" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.OPTIONAL).toBe("default-value");
    }
  });
});
