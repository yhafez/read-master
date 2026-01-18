/**
 * Shared types for Read Master
 *
 * This module exports all shared types used across the application:
 * - Database types (from Prisma)
 * - API request/response types
 *
 * @example
 * ```typescript
 * // Import database types
 * import type { User, Book, ReadingStatus } from '@read-master/shared/types';
 *
 * // Import API types
 * import type { ApiResponse, BookDetailResponse } from '@read-master/shared/types';
 * ```
 */

// Re-export all database types
export * from "./database";

// Re-export all API types
export * from "./api";
