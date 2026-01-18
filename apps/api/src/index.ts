/**
 * @read-master/api
 *
 * Vercel serverless API for Read Master.
 * This package contains shared utilities, middleware, and services
 * used by the API endpoints in the api/ directory.
 */

// Re-export response utilities (non-conflicting)
export {
  sendSuccess,
  sendPaginated,
  sendError,
  ErrorCodes,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
  type PaginatedData,
  type ErrorCode,
} from "./utils/index.js";

// Re-export all middleware (includes comprehensive logger middleware)
export * from "./middleware/index.js";

// Re-export all services (database, cache, etc.)
export * from "./services/index.js";
