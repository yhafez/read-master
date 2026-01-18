/**
 * API Middleware
 *
 * Re-exports all middleware utilities for convenient importing.
 */

export {
  // Types
  type AuthenticatedUser,
  type AuthenticatedRequest,
  type AuthResult,
  type ClerkWebhookEvent,
  // Authentication functions
  verifyClerkToken,
  getClerkUser,
  authenticateRequest,
  optionalAuth,
  // Webhook functions
  verifyWebhookSignature,
  // Higher-order middleware
  withAuth,
  withWebhook,
  // Clerk client (for advanced usage)
  clerkClient,
} from "./auth.js";

export {
  // Error types
  type ErrorResponse,
  // Custom error classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ServiceUnavailableError,
  // Error handling utilities
  formatZodErrors,
  isPrismaError,
  handlePrismaError,
  createErrorResponse,
  handleError,
  // Higher-order middleware
  withErrorHandling,
  // Assertion utilities
  assert,
  assertExists,
} from "./error.js";

export {
  // Types
  type ValidationSchema,
  type ValidatedData,
  type ValidationResult,
  type ValidatedRequest,
  // Validation functions
  validateWithSchema,
  validateBody,
  validateQuery,
  validateParams,
  validateRequest,
  formatValidationErrors,
  // Higher-order middleware
  withValidation,
  // Utilities
  parseOrThrow,
  extractValidated,
  // Common schemas
  CommonSchemas,
  createQuerySchema,
} from "./validation.js";

export {
  // Types
  type RateLimitOperation,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitHeaders,
  type RateLimitedRequest,
  // Rate limit functions
  getRateLimitConfig,
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  // Response helpers
  createRateLimitHeaders,
  applyRateLimitHeaders,
  createRateLimitResponse,
  // Higher-order middleware
  withRateLimit,
  // Utilities
  createRateLimitChecker,
  rateLimitUtils,
} from "./rateLimit.js";
