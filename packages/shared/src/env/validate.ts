import type { ZodSchema } from "zod";

/**
 * Validation result type
 */
export type EnvValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Validates environment variables against a Zod schema
 * Returns a typed result with either the parsed data or validation errors
 *
 * @param schema - Zod schema to validate against
 * @param env - Environment variables object (defaults to process.env)
 * @returns Validation result with parsed data or errors
 */
export function validateEnv<T>(
  schema: ZodSchema<T>,
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): EnvValidationResult<T> {
  const result = schema.safeParse(env);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  return { success: false, errors };
}

/**
 * Validates environment variables and throws if validation fails
 * Use this for fail-fast behavior during app initialization
 *
 * @param schema - Zod schema to validate against
 * @param env - Environment variables object (defaults to process.env)
 * @returns Parsed and typed environment variables
 * @throws Error with formatted validation messages if validation fails
 */
export function validateEnvOrThrow<T>(
  schema: ZodSchema<T>,
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): T {
  const result = validateEnv(schema, env);

  if (!result.success) {
    const errorMessage = [
      "Environment validation failed:",
      "",
      ...result.errors.map((e) => `  - ${e}`),
      "",
      "Check your .env file and ensure all required variables are set.",
      "See .env.example for the list of required variables.",
    ].join("\n");

    throw new Error(errorMessage);
  }

  return result.data;
}

/**
 * Creates a lazy environment loader that validates on first access
 * Useful for applications that need deferred validation
 *
 * @param schema - Zod schema to validate against
 * @param env - Environment variables object (defaults to process.env)
 * @returns Function that returns validated environment on first call
 */
export function createEnvLoader<T>(
  schema: ZodSchema<T>,
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): () => T {
  let cachedEnv: T | null = null;

  return () => {
    if (cachedEnv === null) {
      cachedEnv = validateEnvOrThrow(schema, env);
    }
    return cachedEnv;
  };
}
