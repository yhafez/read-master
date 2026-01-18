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

// ============================================================================
// Pagination Utilities
// ============================================================================

// Pagination constants
export { PaginationDefaults } from "./pagination.js";

// Pagination parsing functions
export {
  parseQueryNumber,
  parsePaginationParams,
  parseCursorPaginationParams,
} from "./pagination.js";

// Pagination calculation functions
export {
  calculatePrismaPagination,
  calculatePrismaPaginationFromOffset,
  calculatePagination,
  calculatePaginationFromOffset,
} from "./pagination.js";

// Cursor pagination functions
export {
  encodeCursor,
  decodeCursor,
  buildCursorPaginationResult,
} from "./pagination.js";

// Pagination utility functions
export {
  isValidPage,
  getLastPage,
  clampPage,
  getPageNumbers,
  getItemRange,
} from "./pagination.js";

// Pagination Zod schemas
export {
  paginationQuerySchema,
  offsetPaginationSchema,
  cursorPaginationSchema,
} from "./pagination.js";

// Pagination namespaced exports
export { pagination, paginationSchemas } from "./pagination.js";

// Pagination types
export type {
  PaginationParams,
  PrismaPagination,
  ParsePaginationOptions,
  RawPaginationQuery,
  CursorPaginationParams,
  CursorPaginationResult,
  PaginationResult,
} from "./pagination.js";
