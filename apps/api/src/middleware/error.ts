import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError } from "zod";
import { logError } from "../utils/logger.js";
import { ErrorCodes, type ErrorCode } from "../utils/response.js";

/**
 * Error Handling Middleware
 *
 * Provides comprehensive error handling for API endpoints:
 * - Custom error classes for different error types
 * - Automatic error classification and status codes
 * - Consistent error response format
 * - Special handling for Zod validation and Prisma errors
 * - Error logging with context
 */

/**
 * Base application error class
 *
 * All custom errors should extend this class for proper
 * error handling and response formatting.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

/**
 * Authentication error for unauthenticated requests
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

/**
 * Authorization error for forbidden access
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, ErrorCodes.NOT_FOUND);
  }
}

/**
 * Conflict error for duplicate resources or state conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, ErrorCodes.CONFLICT);
  }
}

/**
 * Rate limit error when user exceeds allowed requests
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number | undefined;

  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, 429, ErrorCodes.RATE_LIMITED);
    this.retryAfter = retryAfter;
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, 500, ErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Service unavailable error for external service failures
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, 503, ErrorCodes.SERVICE_UNAVAILABLE);
  }
}

/**
 * Format Zod validation errors into readable field-level errors
 */
export function formatZodErrors(
  error: ZodError
): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join(".") || "unknown",
    message: err.message,
  }));
}

/**
 * Check if an error is a Prisma known request error
 *
 * Prisma errors have specific error codes:
 * - P2000-P2034: Query engine errors
 * - P2002: Unique constraint violation
 * - P2025: Record not found
 */
export function isPrismaError(
  error: unknown
): error is { code: string; message: string; meta?: Record<string, unknown> } {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("P")
  );
}

/**
 * Convert Prisma error to appropriate AppError
 */
export function handlePrismaError(error: {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}): AppError {
  switch (error.code) {
    case "P2002": {
      // Unique constraint violation
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : "field";
      return new ConflictError(`A record with this ${field} already exists`);
    }
    case "P2025":
      // Record not found
      return new NotFoundError("Record");
    case "P2003":
      // Foreign key constraint failed
      return new ValidationError("Related record not found");
    case "P2014":
      // Required relation violation
      return new ValidationError("Required relation missing");
    case "P2024":
      // Connection pool timeout
      return new ServiceUnavailableError("Database connection timeout");
    default:
      // Generic database error - don't expose internal details
      return new DatabaseError("A database error occurred");
  }
}

/**
 * Determine if error should be logged
 *
 * Operational errors (known, expected) are logged at info level.
 * Programming errors (bugs) are logged at error level.
 */
function shouldLogAsError(error: unknown): boolean {
  if (error instanceof AppError) {
    // 5xx errors and non-operational errors are always error-level
    return error.statusCode >= 500 || !error.isOperational;
  }
  // Unknown errors are always error-level
  return true;
}

/**
 * Get a safe error message for client response
 *
 * Internal error details should not be exposed to clients.
 */
function getClientErrorMessage(error: unknown, statusCode: number): string {
  if (error instanceof AppError) {
    return error.message;
  }

  // For unknown 5xx errors, return generic message
  if (statusCode >= 500) {
    return "An unexpected error occurred";
  }

  // For known error types, we can expose the message
  if (error instanceof Error) {
    return error.message;
  }

  return "An error occurred";
}

/**
 * Error response type for consistent API responses
 */
export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

/**
 * Handle an error and send appropriate response
 *
 * This is the main error handling function that should be called
 * in catch blocks to handle any error appropriately.
 *
 * @param error - The caught error
 * @param res - Vercel response object
 * @param context - Optional context for logging (e.g., userId, requestId)
 */
export function handleError(
  error: unknown,
  res: VercelResponse,
  context?: Record<string, unknown>
): void {
  let statusCode: number;
  let errorCode: ErrorCode;
  let message: string;
  let details: unknown;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = "Validation failed";
    details = formatZodErrors(error);
  }
  // Handle Prisma errors
  else if (isPrismaError(error)) {
    const appError = handlePrismaError(error);
    statusCode = appError.statusCode;
    errorCode = appError.code;
    message = appError.message;
    details = undefined;
  }
  // Handle our custom AppError instances
  else if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  }
  // Handle unknown errors
  else {
    statusCode = 500;
    errorCode = ErrorCodes.INTERNAL_ERROR;
    message = getClientErrorMessage(error, statusCode);
    details = undefined;
  }

  // Log the error with appropriate level
  if (shouldLogAsError(error)) {
    logError(message, error, {
      statusCode,
      errorCode,
      ...context,
    });
  }

  // Add Retry-After header for rate limit errors
  if (error instanceof RateLimitError && error.retryAfter) {
    res.setHeader("Retry-After", error.retryAfter);
  }

  // Send error response
  const response = createErrorResponse(errorCode, message, details);
  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper with error handling
 *
 * Wraps an async handler to automatically catch and handle errors.
 * This eliminates the need for try-catch blocks in every handler.
 *
 * Usage:
 * ```ts
 * export default withErrorHandling(async (req, res) => {
 *   // Handler logic - any thrown error will be caught and handled
 *   throw new NotFoundError("Book");
 * });
 * ```
 */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      // Extract context from request for logging
      const context: Record<string, unknown> = {
        method: req.method,
        url: req.url,
      };

      // Try to get userId if request is authenticated
      if ("auth" in req && typeof req.auth === "object" && req.auth !== null) {
        const auth = req.auth as { userId?: string };
        if (auth.userId) {
          context.userId = auth.userId;
        }
      }

      handleError(error, res, context);
    }
  };
}

/**
 * Assert a condition or throw an error
 *
 * Useful for input validation and precondition checks.
 *
 * Usage:
 * ```ts
 * assert(user !== null, new NotFoundError("User"));
 * assert(book.userId === userId, new ForbiddenError("Cannot modify this book"));
 * ```
 */
export function assert(
  condition: unknown,
  error: AppError | string
): asserts condition {
  if (!condition) {
    if (typeof error === "string") {
      throw new AppError(error, 400, ErrorCodes.VALIDATION_ERROR);
    }
    throw error;
  }
}

/**
 * Assert a value is not null or undefined
 *
 * Type-safe way to assert a value exists.
 *
 * Usage:
 * ```ts
 * const user = await prisma.user.findUnique({ where: { id } });
 * assertExists(user, "User");
 * // user is now typed as User (not User | null)
 * ```
 */
export function assertExists<T>(
  value: T | null | undefined,
  resourceName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resourceName);
  }
}
