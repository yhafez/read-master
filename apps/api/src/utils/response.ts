import type { VercelResponse } from "@vercel/node";

/**
 * Response Utilities
 *
 * Standard API response types and utilities to ensure consistent
 * response format across all endpoints.
 *
 * Features:
 * - Typed success responses with data
 * - Paginated response helpers with metadata
 * - Error responses with codes and details
 * - Specialized response helpers (created, no-content, accepted)
 * - Response creation functions for testing/serialization
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Standard success response structure
 */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

/**
 * Standard error response structure
 */
export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Union of success and error responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination metadata
 */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

/**
 * Paginated data structure with items and pagination metadata
 */
export type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

/**
 * No content response (204)
 */
export type ApiNoContentResponse = {
  success: true;
};

/**
 * Accepted response for async operations (202)
 */
export type ApiAcceptedResponse<T = { jobId?: string; message?: string }> = {
  success: true;
  data: T;
};

// ============================================================================
// Response Sending Functions
// ============================================================================

/**
 * Send a success response
 *
 * @param res - Vercel response object
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: VercelResponse,
  data: T,
  statusCode = 200
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a 201 Created response
 *
 * Use when a new resource has been created.
 *
 * @param res - Vercel response object
 * @param data - The created resource data
 */
export function sendCreated<T>(res: VercelResponse, data: T): void {
  sendSuccess(res, data, 201);
}

/**
 * Send a 204 No Content response
 *
 * Use for successful operations that don't return data (e.g., DELETE).
 *
 * @param res - Vercel response object
 */
export function sendNoContent(res: VercelResponse): void {
  res.status(204).end();
}

/**
 * Send a 202 Accepted response
 *
 * Use when an operation has been accepted for processing
 * but the processing has not been completed (async operations).
 *
 * @param res - Vercel response object
 * @param data - Information about the accepted operation (e.g., jobId)
 */
export function sendAccepted<T = { jobId?: string; message?: string }>(
  res: VercelResponse,
  data: T
): void {
  sendSuccess(res, data, 202);
}

/**
 * Send a paginated success response
 */
export function sendPaginated<T>(
  res: VercelResponse,
  items: T[],
  page: number,
  limit: number,
  total: number
): void {
  const totalPages = Math.ceil(total / limit);
  const response: ApiSuccessResponse<PaginatedData<T>> = {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    },
  };
  res.status(200).json(response);
}

/**
 * Send an error response
 */
export function sendError(
  res: VercelResponse,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Response Creation Functions (for testing or serialization)
// ============================================================================

/**
 * Create a success response object
 *
 * Useful for testing or when you need the response object
 * without sending it immediately.
 *
 * @param data - Response data
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create a paginated response object
 *
 * @param items - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): ApiSuccessResponse<PaginatedData<T>> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    },
  };
}

/**
 * Create an error response object
 *
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional error details
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
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
 * Calculate pagination metadata
 *
 * Utility function for calculating pagination metadata
 * without sending a response.
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 */
export function calculatePaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a response is a success response
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}

// ============================================================================
// Response Objects (for clean imports)
// ============================================================================

/**
 * Response sending utilities
 */
export const response = {
  success: sendSuccess,
  created: sendCreated,
  noContent: sendNoContent,
  accepted: sendAccepted,
  paginated: sendPaginated,
  error: sendError,
} as const;

/**
 * Response creation utilities
 */
export const responseUtils = {
  createSuccess: createSuccessResponse,
  createPaginated: createPaginatedResponse,
  createError: createErrorResponse,
  calculatePaginationMeta,
  isSuccess: isSuccessResponse,
  isError: isErrorResponse,
} as const;
