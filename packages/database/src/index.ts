/**
 * @read-master/database
 *
 * Prisma ORM and database utilities for Read Master.
 *
 * @example
 * ```typescript
 * import { prisma } from '@read-master/database';
 * import type { User, Book, Chapter, ReadingProgress, Annotation } from '@read-master/database';
 * import type { BookSource, FileType, ReadingStatus, AnnotationType } from '@read-master/database';
 *
 * // Fetch user with books
 * const user = await prisma.user.findUnique({
 *   where: { clerkId: 'user_123' },
 *   include: { books: true }
 * });
 *
 * // Fetch book with chapters
 * const book = await prisma.book.findUnique({
 *   where: { id: 'book_123' },
 *   include: { chapters: true }
 * });
 *
 * // Upsert reading progress (unique per user+book)
 * const progress = await prisma.readingProgress.upsert({
 *   where: { userId_bookId: { userId: 'user_123', bookId: 'book_123' } },
 *   update: { currentPosition: 5000, percentage: 25.5 },
 *   create: { userId: 'user_123', bookId: 'book_123', currentPosition: 0 }
 * });
 *
 * // Create annotation (highlight, note, or bookmark)
 * const annotation = await prisma.annotation.create({
 *   data: {
 *     userId: 'user_123',
 *     bookId: 'book_123',
 *     type: 'HIGHLIGHT',
 *     startOffset: 100,
 *     endOffset: 200,
 *     selectedText: 'Important passage',
 *     color: '#FFFF00'
 *   }
 * });
 * ```
 */

// Re-export Prisma client and utilities
export { prisma, disconnect, connect, PrismaClient } from "./client";

// Re-export all generated Prisma types
export * from "@prisma/client";

// Export common type aliases for convenience
export type {
  User,
  Book,
  Chapter,
  ReadingProgress,
  Annotation,
} from "@prisma/client";
