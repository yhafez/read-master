/**
 * @read-master/database
 *
 * Prisma ORM and database utilities for Read Master.
 *
 * @example
 * ```typescript
 * import { prisma } from '@read-master/database';
 * import type { User, Book, Chapter, BookSource, FileType, ReadingStatus } from '@read-master/database';
 *
 * const user = await prisma.user.findUnique({
 *   where: { clerkId: 'user_123' },
 *   include: { books: true }
 * });
 *
 * const book = await prisma.book.findUnique({
 *   where: { id: 'book_123' },
 *   include: { chapters: true }
 * });
 * ```
 */

// Re-export Prisma client and utilities
export { prisma, disconnect, connect, PrismaClient } from "./client";

// Re-export all generated Prisma types
export * from "@prisma/client";

// Export common type aliases for convenience
export type { User, Book, Chapter } from "@prisma/client";
