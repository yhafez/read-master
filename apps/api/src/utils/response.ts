import type { VercelResponse } from "@vercel/node";

/**
 * Standard API response types and utilities
 *
 * Ensures consistent response format across all endpoints.
 */

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedData<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

/**
 * Send a success response
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
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",

  // Server errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
