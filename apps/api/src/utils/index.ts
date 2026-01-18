/**
 * API utility functions
 */

export { logger, logRequest, logError, logAIUsage } from "./logger.js";

// Response sending functions
export {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendAccepted,
  sendPaginated,
  sendError,
} from "./response.js";

// Response creation functions
export {
  createSuccessResponse,
  createPaginatedResponse,
  createErrorResponse,
  calculatePaginationMeta,
} from "./response.js";

// Type guards
export { isSuccessResponse, isErrorResponse } from "./response.js";

// Response objects for clean imports
export { response, responseUtils } from "./response.js";

// Constants
export { ErrorCodes } from "./response.js";

// Types
export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  ApiNoContentResponse,
  ApiAcceptedResponse,
  PaginatedData,
  PaginationMeta,
  ErrorCode,
} from "./response.js";
