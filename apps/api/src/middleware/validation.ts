import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z, type ZodSchema, type ZodTypeAny } from "zod";
import { formatZodErrors, ValidationError } from "./error.js";

/**
 * Validation Middleware
 *
 * Provides Zod-based validation for API request data:
 * - Validates request body, query parameters, and URL parameters
 * - Returns detailed, field-level error messages
 * - Type-safe validated data extraction
 * - Higher-order middleware for automatic validation
 */

/**
 * Schema configuration for request validation
 */
export type ValidationSchema<
  TBody extends ZodTypeAny = ZodTypeAny,
  TQuery extends ZodTypeAny = ZodTypeAny,
  TParams extends ZodTypeAny = ZodTypeAny,
> = {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
};

/**
 * Infer the validated data types from a validation schema
 */
export type ValidatedData<TSchema extends ValidationSchema> = {
  body: TSchema["body"] extends ZodSchema
    ? z.infer<TSchema["body"]>
    : undefined;
  query: TSchema["query"] extends ZodSchema
    ? z.infer<TSchema["query"]>
    : undefined;
  params: TSchema["params"] extends ZodSchema
    ? z.infer<TSchema["params"]>
    : undefined;
};

/**
 * Result of a validation operation
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      errors: {
        field: string;
        message: string;
        source: "body" | "query" | "params";
      }[];
    };

/**
 * Extended request with validated data attached
 */
export type ValidatedRequest<TSchema extends ValidationSchema> =
  VercelRequest & {
    validated: ValidatedData<TSchema>;
  };

/**
 * Validate a value against a Zod schema
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validation result with either validated data or errors
 */
export function validateWithSchema<T extends ZodSchema>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = formatZodErrors(result.error).map((e) => ({
    ...e,
    source: "body" as const,
  }));

  return { success: false, errors };
}

/**
 * Validate request body against a Zod schema
 *
 * @param schema - The Zod schema for the body
 * @param body - The request body to validate
 * @returns Validation result with source set to "body"
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
  body: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = formatZodErrors(result.error).map((e) => ({
    ...e,
    source: "body" as const,
  }));

  return { success: false, errors };
}

/**
 * Validate query parameters against a Zod schema
 *
 * Query parameters are always strings, so coercion should be used
 * in schemas for numeric/boolean values.
 *
 * @param schema - The Zod schema for query params
 * @param query - The query object to validate
 * @returns Validation result with source set to "query"
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  query: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = formatZodErrors(result.error).map((e) => ({
    ...e,
    source: "query" as const,
  }));

  return { success: false, errors };
}

/**
 * Validate URL parameters against a Zod schema
 *
 * URL params from Vercel are extracted from the URL path.
 * Like query params, they are always strings.
 *
 * @param schema - The Zod schema for URL params
 * @param params - The params object to validate
 * @returns Validation result with source set to "params"
 */
export function validateParams<T extends ZodSchema>(
  schema: T,
  params: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = formatZodErrors(result.error).map((e) => ({
    ...e,
    source: "params" as const,
  }));

  return { success: false, errors };
}

/**
 * Validate all parts of a request (body, query, params) against schemas
 *
 * This function validates all provided schemas and aggregates errors
 * from all sources into a single result.
 *
 * @param schemas - Object containing schemas for body, query, and/or params
 * @param request - The request object to validate
 * @returns Combined validation result
 */
export function validateRequest<TSchema extends ValidationSchema>(
  schemas: TSchema,
  request: VercelRequest
): ValidationResult<ValidatedData<TSchema>> {
  const errors: {
    field: string;
    message: string;
    source: "body" | "query" | "params";
  }[] = [];
  const validated: Partial<ValidatedData<TSchema>> = {
    body: undefined,
    query: undefined,
    params: undefined,
  };

  // Validate body if schema provided
  if (schemas.body) {
    const bodyResult = schemas.body.safeParse(request.body);
    if (bodyResult.success) {
      validated.body = bodyResult.data;
    } else {
      errors.push(
        ...formatZodErrors(bodyResult.error).map((e) => ({
          ...e,
          source: "body" as const,
        }))
      );
    }
  }

  // Validate query if schema provided
  if (schemas.query) {
    const queryResult = schemas.query.safeParse(request.query);
    if (queryResult.success) {
      validated.query = queryResult.data;
    } else {
      errors.push(
        ...formatZodErrors(queryResult.error).map((e) => ({
          ...e,
          source: "query" as const,
        }))
      );
    }
  }

  // Validate params if schema provided
  // Vercel puts URL params in query, but we also check body for [id] patterns
  if (schemas.params) {
    // In Vercel, dynamic route params come from the file structure
    // and are accessible via the query object (e.g., /api/books/[id] -> query.id)
    // We validate against query for params to support this pattern
    const paramsResult = schemas.params.safeParse(request.query);
    if (paramsResult.success) {
      validated.params = paramsResult.data;
    } else {
      errors.push(
        ...formatZodErrors(paramsResult.error).map((e) => ({
          ...e,
          source: "params" as const,
        }))
      );
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validated as ValidatedData<TSchema> };
}

/**
 * Format validation errors into a structured response
 *
 * Groups errors by source (body, query, params) for clearer feedback.
 */
export function formatValidationErrors(
  errors: {
    field: string;
    message: string;
    source: "body" | "query" | "params";
  }[]
): {
  body?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
} {
  const grouped: {
    body?: Record<string, string>;
    query?: Record<string, string>;
    params?: Record<string, string>;
  } = {};

  for (const error of errors) {
    if (!grouped[error.source]) {
      grouped[error.source] = {};
    }
    const sourceGroup = grouped[error.source];
    if (sourceGroup) {
      sourceGroup[error.field] = error.message;
    }
  }

  return grouped;
}

/**
 * Create a validation middleware that validates requests against schemas
 *
 * This higher-order function wraps a handler and performs validation
 * before passing control. If validation fails, a 400 error is returned.
 *
 * The validated data is attached to the request as `request.validated`.
 *
 * Usage:
 * ```ts
 * const schema = {
 *   body: z.object({ title: z.string() }),
 *   query: z.object({ page: z.coerce.number().optional() }),
 * };
 *
 * export default withValidation(schema, async (req, res) => {
 *   const { title } = req.validated.body;
 *   const { page } = req.validated.query;
 *   // Handler logic with type-safe validated data
 * });
 * ```
 */
export function withValidation<TSchema extends ValidationSchema>(
  schemas: TSchema,
  handler: (
    req: ValidatedRequest<TSchema>,
    res: VercelResponse
  ) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const result = validateRequest(schemas, req);

    if (!result.success) {
      const grouped = formatValidationErrors(result.errors);
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: grouped,
        },
      });
      return;
    }

    // Attach validated data to request
    const validatedRequest = req as ValidatedRequest<TSchema>;
    validatedRequest.validated = result.data;

    await handler(validatedRequest, res);
  };
}

/**
 * Parse and validate a single value
 *
 * Useful for validating individual values like IDs, tokens, etc.
 * Throws ValidationError if validation fails.
 *
 * Usage:
 * ```ts
 * const userId = parseOrThrow(z.string().uuid(), req.query.userId, "userId");
 * ```
 */
export function parseOrThrow<T extends ZodSchema>(
  schema: T,
  value: unknown,
  fieldName: string
): z.infer<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const firstError = errors[0];
    const errorMessage = firstError ? firstError.message : "Invalid value";
    throw new ValidationError(`Invalid ${fieldName}: ${errorMessage}`);
  }

  return result.data;
}

/**
 * Common validation schemas for reuse
 *
 * These schemas handle common URL/query parameter patterns.
 */
export const CommonSchemas = {
  /** UUID validation */
  uuid: z.string().uuid("Invalid UUID format"),

  /** Pagination parameters */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** ID parameter (from URL path) */
  idParam: z.object({
    id: z.string().uuid("Invalid ID format"),
  }),

  /** Sort direction */
  sortDirection: z.enum(["asc", "desc"]).default("desc"),

  /** Boolean from query string (handles "true", "false", "1", "0") */
  queryBoolean: z
    .enum(["true", "false", "1", "0"])
    .transform((val) => val === "true" || val === "1"),

  /** Comma-separated list from query string */
  commaSeparated: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim())),
};

/**
 * Create a validated query schema with common patterns
 *
 * Helper for creating query schemas with pagination, sorting, etc.
 * Returns a union type that includes any optional fields.
 */
export function createQuerySchema<T extends z.ZodRawShape>(
  fields: T,
  options?: {
    pagination?: boolean;
    sort?: boolean;
  }
): z.ZodObject<z.ZodRawShape> {
  const baseSchema = z.object(fields);

  const paginationFields = options?.pagination
    ? {
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }
    : {};

  const sortFields = options?.sort
    ? {
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      }
    : {};

  return baseSchema.extend({
    ...paginationFields,
    ...sortFields,
  });
}

/**
 * Extract validated data or throw
 *
 * Convenience wrapper that validates and throws ValidationError on failure.
 */
export function extractValidated<T extends ZodSchema>(
  schema: T,
  data: unknown,
  source: "body" | "query" | "params" = "body"
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const details = errors.map((e) => `${e.field}: ${e.message}`).join(", ");
    throw new ValidationError(`Invalid ${source}: ${details}`, errors);
  }

  return result.data;
}
