/**
 * Database Service for Read Master API
 *
 * Provides a singleton Prisma client instance with proper connection
 * handling for Vercel serverless functions. Includes helper functions
 * for common database operations.
 *
 * @example
 * ```typescript
 * import { db, getUserById, getBookWithChapters } from './services/db';
 *
 * // Direct Prisma access
 * const users = await db.user.findMany();
 *
 * // Using helper functions
 * const user = await getUserById('user_123');
 * const book = await getBookWithChapters('book_123');
 * ```
 */

import {
  prisma,
  connect,
  disconnect,
  type PrismaClient,
} from "@read-master/database";
import type {
  User,
  Book,
  Chapter,
  ReadingProgress,
  Prisma,
} from "@read-master/database";

// ============================================================================
// SINGLETON DATABASE CLIENT
// ============================================================================

/**
 * Singleton Prisma client instance for the API
 *
 * This re-exports the Prisma client from @read-master/database which
 * already handles singleton pattern for development hot reloading.
 */
export const db = prisma;

/**
 * Get the Prisma client instance
 * Alias for db for more explicit usage
 */
export function getDb(): PrismaClient {
  return db;
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Database connection state tracking
 */
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

/**
 * Ensure database connection is established
 *
 * This is typically not needed as Prisma connects lazily on first query.
 * Use this when you need to explicitly verify connection before operations.
 *
 * @example
 * ```typescript
 * await ensureConnection();
 * // Database is now connected
 * ```
 */
export async function ensureConnection(): Promise<void> {
  if (isConnected) {
    return;
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  connectionPromise = (async () => {
    try {
      await connect();
      isConnected = true;
    } finally {
      connectionPromise = null;
    }
  })();

  await connectionPromise;
}

/**
 * Gracefully disconnect from the database
 *
 * Call this during shutdown to properly close all connections.
 * In serverless environments, this is typically handled automatically.
 *
 * @example
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await gracefulShutdown();
 *   process.exit(0);
 * });
 * ```
 */
export async function gracefulShutdown(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await disconnect();
    isConnected = false;
  } catch {
    // Silently handle disconnect errors during shutdown
    // In production, the logger middleware should capture this
    isConnected = false;
  }
}

/**
 * Check if database is currently connected
 */
export function isDbConnected(): boolean {
  return isConnected;
}

// ============================================================================
// COMMON QUERY HELPERS
// ============================================================================

/**
 * Options for fetching a user
 */
export type GetUserOptions = {
  includeBooks?: boolean;
  includeStats?: boolean;
  includeAchievements?: boolean;
};

/**
 * Get a user by their Clerk ID
 *
 * @param clerkId - The Clerk user ID
 * @param options - Include related data
 * @returns User or null if not found
 *
 * @example
 * ```typescript
 * const user = await getUserByClerkId('user_abc123');
 * const userWithBooks = await getUserByClerkId('user_abc123', { includeBooks: true });
 * ```
 */
export async function getUserByClerkId(
  clerkId: string,
  options: GetUserOptions = {}
): Promise<User | null> {
  return db.user.findUnique({
    where: { clerkId, deletedAt: null },
    include: {
      books: options.includeBooks ? { where: { deletedAt: null } } : false,
      stats: options.includeStats ?? false,
      achievements: options.includeAchievements
        ? { include: { achievement: true } }
        : false,
    },
  });
}

/**
 * Get a user by their internal ID
 *
 * @param id - The internal user ID
 * @param options - Include related data
 * @returns User or null if not found
 */
export async function getUserById(
  id: string,
  options: GetUserOptions = {}
): Promise<User | null> {
  return db.user.findUnique({
    where: { id, deletedAt: null },
    include: {
      books: options.includeBooks ? { where: { deletedAt: null } } : false,
      stats: options.includeStats ?? false,
      achievements: options.includeAchievements
        ? { include: { achievement: true } }
        : false,
    },
  });
}

/**
 * Options for fetching a book
 */
export type GetBookOptions = {
  includeChapters?: boolean;
  includePreReadingGuide?: boolean;
  includeAnnotations?: boolean;
};

/**
 * Get a book by ID with optional related data
 *
 * @param id - The book ID
 * @param options - Include related data
 * @returns Book or null if not found
 *
 * @example
 * ```typescript
 * const book = await getBookById('book_123');
 * const bookWithChapters = await getBookById('book_123', { includeChapters: true });
 * ```
 */
export async function getBookById(
  id: string,
  options: GetBookOptions = {}
): Promise<Book | null> {
  return db.book.findUnique({
    where: { id, deletedAt: null },
    include: {
      chapters: options.includeChapters
        ? { orderBy: { orderIndex: "asc" } }
        : false,
      preReadingGuide: options.includePreReadingGuide ?? false,
      annotations: options.includeAnnotations
        ? { where: { deletedAt: null } }
        : false,
    },
  });
}

/**
 * Get a book with chapters (convenience alias)
 */
export async function getBookWithChapters(
  id: string
): Promise<(Book & { chapters: Chapter[] }) | null> {
  return db.book.findUnique({
    where: { id, deletedAt: null },
    include: {
      chapters: { orderBy: { orderIndex: "asc" } },
    },
  });
}

/**
 * Get reading progress for a user and book
 *
 * @param userId - The user ID
 * @param bookId - The book ID
 * @returns Reading progress or null if not found
 */
export async function getReadingProgress(
  userId: string,
  bookId: string
): Promise<ReadingProgress | null> {
  return db.readingProgress.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
}

/**
 * Upsert reading progress for a user and book
 *
 * @param userId - The user ID
 * @param bookId - The book ID
 * @param data - Progress data to update/create
 * @returns Updated or created reading progress
 */
export async function upsertReadingProgress(
  userId: string,
  bookId: string,
  data: {
    currentPosition?: number;
    percentage?: number;
    totalReadTime?: number;
    lastReadAt?: Date;
    completedAt?: Date | null;
  }
): Promise<ReadingProgress> {
  const now = new Date();

  // Build create data explicitly to avoid undefined issues
  const createData: Prisma.ReadingProgressCreateInput = {
    user: { connect: { id: userId } },
    book: { connect: { id: bookId } },
    currentPosition: data.currentPosition ?? 0,
    percentage: data.percentage ?? 0,
    totalReadTime: data.totalReadTime ?? 0,
    lastReadAt: data.lastReadAt ?? now,
  };

  // Only add completedAt if explicitly provided (not undefined)
  if (data.completedAt !== undefined) {
    createData.completedAt = data.completedAt;
  }

  return db.readingProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: {
      ...data,
      lastReadAt: data.lastReadAt ?? now,
    },
    create: createData,
  });
}

// ============================================================================
// SOFT DELETE HELPERS
// ============================================================================

/**
 * Apply soft delete filter to a where clause
 *
 * @param where - The existing where clause
 * @returns Where clause with soft delete filter applied
 *
 * @example
 * ```typescript
 * const users = await db.user.findMany({
 *   where: withSoftDeleteFilter({ email: 'test@example.com' }),
 * });
 * ```
 */
export function withSoftDeleteFilter<T extends Record<string, unknown>>(
  where: T
): T & { deletedAt: null } {
  return { ...where, deletedAt: null };
}

/**
 * Soft delete a user record
 */
export async function softDeleteUser(id: string): Promise<User> {
  return db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Soft delete a book record
 */
export async function softDeleteBook(id: string): Promise<Book> {
  return db.book.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Soft delete models by model name
 * Use specific functions like softDeleteUser/softDeleteBook for type safety
 */
export type SoftDeletableModel =
  | "user"
  | "book"
  | "annotation"
  | "flashcard"
  | "curriculum"
  | "forumPost"
  | "forumReply"
  | "groupDiscussion"
  | "discussionReply"
  | "readingGroup";

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Type for Prisma transaction client
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Execute an interactive transaction with a callback
 *
 * @param callback - Function that receives the transaction client
 * @returns Result of the callback
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.findUnique({ where: { id } });
 *   if (!user) throw new Error('User not found');
 *   return tx.book.create({ data: { userId: user.id, title: 'New Book' } });
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(callback);
}

/**
 * Execute multiple Prisma operations in a batch transaction
 *
 * @param operations - Array of Prisma operations to execute
 * @returns Array of results from each operation
 *
 * @example
 * ```typescript
 * const [user, stats] = await batchTransaction([
 *   db.user.update({ where: { id }, data: { name: 'New Name' } }),
 *   db.userStats.update({ where: { userId: id }, data: { totalXP: { increment: 100 } } }),
 * ]);
 * ```
 */
export async function batchTransaction<
  T extends Prisma.PrismaPromise<unknown>[],
>(operations: [...T]): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  return db.$transaction(operations) as Promise<{
    [K in keyof T]: Awaited<T[K]>;
  }>;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Database utilities object for convenient imports
 */
export const dbUtils = {
  // Connection management
  ensureConnection,
  gracefulShutdown,
  isDbConnected,

  // Query helpers
  getUserByClerkId,
  getUserById,
  getBookById,
  getBookWithChapters,
  getReadingProgress,
  upsertReadingProgress,

  // Soft delete helpers
  withSoftDeleteFilter,
  softDeleteUser,
  softDeleteBook,

  // Transaction helpers
  withTransaction,
  batchTransaction,
} as const;

// Re-export connection functions for convenience
export { connect, disconnect };
