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
