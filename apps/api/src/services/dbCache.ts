/**
 * Database Query Caching Service
 *
 * Provides caching utilities for common database queries to improve
 * API response times. Uses Redis for distributed caching with
 * intelligent invalidation strategies.
 *
 * @example
 * ```typescript
 * import { dbCache } from './services/dbCache';
 *
 * // Get cached user with their stats
 * const user = await dbCache.getUser(userId);
 *
 * // Get cached book list with pagination
 * const books = await dbCache.getUserBooks(userId, { page: 1, limit: 20 });
 *
 * // Invalidate on mutation
 * await dbCache.invalidateUserBooks(userId);
 * ```
 */

import { getOrSet, del, invalidatePattern, CacheTTL } from "./redis.js";
import { db } from "./db.js";
import { logger } from "../utils/logger.js";
import type { Prisma } from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

/**
 * Cache key patterns for database entities
 */
export const DbCacheKey = {
  /** User by ID */
  USER: "db:user",
  /** User by Clerk ID */
  USER_CLERK: "db:user:clerk",
  /** User stats */
  USER_STATS: "db:user:stats",
  /** User books list */
  USER_BOOKS: "db:user:books",
  /** User books count */
  USER_BOOKS_COUNT: "db:user:books:count",
  /** Book by ID */
  BOOK: "db:book",
  /** Book with progress */
  BOOK_PROGRESS: "db:book:progress",
  /** User flashcards due */
  FLASHCARDS_DUE: "db:flashcards:due",
  /** User flashcards count */
  FLASHCARDS_COUNT: "db:flashcards:count",
  /** Reading progress */
  PROGRESS: "db:progress",
  /** User achievements */
  ACHIEVEMENTS: "db:achievements",
  /** User following count */
  FOLLOWING_COUNT: "db:following:count",
  /** User followers count */
  FOLLOWERS_COUNT: "db:followers:count",
  /** Forum post */
  FORUM_POST: "db:forum:post",
  /** Forum category posts count */
  FORUM_CATEGORY_COUNT: "db:forum:category:count",
} as const;

export type DbCacheKeyType = (typeof DbCacheKey)[keyof typeof DbCacheKey];

/**
 * Options for paginated queries
 */
export type PaginationOptions = {
  page?: number;
  limit?: number;
};

/**
 * Cached user data structure
 */
export type CachedUser = {
  id: string;
  clerkId: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  tier: string;
  aiEnabled: boolean;
  profilePublic: boolean;
  showStats: boolean;
  showActivity: boolean;
  createdAt: string;
};

/**
 * Cached user stats
 */
export type CachedUserStats = {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  booksCompleted: number;
  totalReadingTime: number;
  totalWordsRead: number;
  followersCount: number;
  followingCount: number;
};

/**
 * Cached book summary for list views
 */
export type CachedBookSummary = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  status: string;
  genre: string | null;
  tags: string[];
  wordCount: number | null;
  createdAt: string;
  updatedAt: string;
  progress: {
    percentage: number;
    lastReadAt: string | null;
  } | null;
};

// ============================================================================
// Cache Key Builders
// ============================================================================

/**
 * Build a database cache key
 */
function dbKey(prefix: DbCacheKeyType, ...parts: (string | number)[]): string {
  return [prefix, ...parts].join(":");
}

// ============================================================================
// User Caching
// ============================================================================

/**
 * Get user by ID with caching
 */
export async function getUserById(userId: string): Promise<CachedUser | null> {
  return getOrSet<CachedUser | null>(
    dbKey(DbCacheKey.USER, userId),
    async () => {
      const user = await db.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: {
          id: true,
          clerkId: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          aiEnabled: true,
          profilePublic: true,
          showStats: true,
          showActivity: true,
          createdAt: true,
        },
      });

      if (!user) return null;

      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
      };
    },
    { ttl: CacheTTL.MEDIUM }
  );
}

/**
 * Get user by Clerk ID with caching
 */
export async function getUserByClerkId(
  clerkId: string
): Promise<CachedUser | null> {
  return getOrSet<CachedUser | null>(
    dbKey(DbCacheKey.USER_CLERK, clerkId),
    async () => {
      const user = await db.user.findUnique({
        where: { clerkId, deletedAt: null },
        select: {
          id: true,
          clerkId: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          aiEnabled: true,
          profilePublic: true,
          showStats: true,
          showActivity: true,
          createdAt: true,
        },
      });

      if (!user) return null;

      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
      };
    },
    { ttl: CacheTTL.MEDIUM }
  );
}

/**
 * Get user stats with caching
 */
export async function getUserStats(
  userId: string
): Promise<CachedUserStats | null> {
  return getOrSet<CachedUserStats | null>(
    dbKey(DbCacheKey.USER_STATS, userId),
    async () => {
      const stats = await db.userStats.findUnique({
        where: { userId },
        select: {
          totalXP: true,
          level: true,
          currentStreak: true,
          longestStreak: true,
          booksCompleted: true,
          totalReadingTime: true,
          totalWordsRead: true,
          followersCount: true,
          followingCount: true,
        },
      });

      return stats;
    },
    { ttl: CacheTTL.SHORT }
  );
}

// ============================================================================
// Book Caching
// ============================================================================

/**
 * Get user's books count with caching
 */
export async function getUserBooksCount(
  userId: string,
  status?: string
): Promise<number> {
  const key = status
    ? dbKey(DbCacheKey.USER_BOOKS_COUNT, userId, status)
    : dbKey(DbCacheKey.USER_BOOKS_COUNT, userId);

  return getOrSet<number>(
    key,
    async () => {
      const where: Prisma.BookWhereInput = {
        userId,
        deletedAt: null,
      };

      if (status) {
        where.status = status as Prisma.EnumReadingStatusFilter;
      }

      return db.book.count({ where });
    },
    { ttl: CacheTTL.SHORT }
  );
}

/**
 * Get a single book by ID with caching
 */
export async function getBookById(
  bookId: string,
  userId?: string
): Promise<CachedBookSummary | null> {
  const cacheKey = userId
    ? dbKey(DbCacheKey.BOOK_PROGRESS, bookId, userId)
    : dbKey(DbCacheKey.BOOK, bookId);

  return getOrSet<CachedBookSummary | null>(
    cacheKey,
    async () => {
      const book = await db.book.findUnique({
        where: { id: bookId, deletedAt: null },
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
          status: true,
          genre: true,
          tags: true,
          wordCount: true,
          createdAt: true,
          updatedAt: true,
          readingProgress: userId
            ? {
                where: { userId },
                select: {
                  percentage: true,
                  lastReadAt: true,
                },
                take: 1,
              }
            : false,
        },
      });

      if (!book) return null;

      const progress = Array.isArray(book.readingProgress)
        ? book.readingProgress[0]
        : null;

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
        status: book.status,
        genre: book.genre,
        tags: book.tags,
        wordCount: book.wordCount,
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString(),
        progress: progress
          ? {
              percentage: progress.percentage,
              lastReadAt: progress.lastReadAt?.toISOString() ?? null,
            }
          : null,
      };
    },
    { ttl: CacheTTL.SHORT }
  );
}

// ============================================================================
// Flashcard Caching
// ============================================================================

/**
 * Get count of due flashcards for a user
 */
export async function getDueFlashcardsCount(userId: string): Promise<number> {
  return getOrSet<number>(
    dbKey(DbCacheKey.FLASHCARDS_DUE, userId),
    async () => {
      return db.flashcard.count({
        where: {
          userId,
          status: { in: ["NEW", "LEARNING", "REVIEW"] },
          dueDate: { lte: new Date() },
          deletedAt: null,
        },
      });
    },
    { ttl: CacheTTL.VERY_SHORT }
  );
}

/**
 * Get total flashcard count for a user
 */
export async function getFlashcardsCount(userId: string): Promise<number> {
  return getOrSet<number>(
    dbKey(DbCacheKey.FLASHCARDS_COUNT, userId),
    async () => {
      return db.flashcard.count({
        where: {
          userId,
          deletedAt: null,
        },
      });
    },
    { ttl: CacheTTL.SHORT }
  );
}

// ============================================================================
// Social Caching
// ============================================================================

/**
 * Get followers count with caching
 */
export async function getFollowersCount(userId: string): Promise<number> {
  return getOrSet<number>(
    dbKey(DbCacheKey.FOLLOWERS_COUNT, userId),
    async () => {
      return db.follow.count({
        where: { followingId: userId },
      });
    },
    { ttl: CacheTTL.SHORT }
  );
}

/**
 * Get following count with caching
 */
export async function getFollowingCount(userId: string): Promise<number> {
  return getOrSet<number>(
    dbKey(DbCacheKey.FOLLOWING_COUNT, userId),
    async () => {
      return db.follow.count({
        where: { followerId: userId },
      });
    },
    { ttl: CacheTTL.SHORT }
  );
}

// ============================================================================
// Achievement Caching
// ============================================================================

/**
 * Get user's earned achievements count
 */
export async function getUserAchievementsCount(
  userId: string
): Promise<number> {
  return getOrSet<number>(
    dbKey(DbCacheKey.ACHIEVEMENTS, userId, "count"),
    async () => {
      return db.userAchievement.count({
        where: { userId },
      });
    },
    { ttl: CacheTTL.SHORT }
  );
}

// ============================================================================
// Forum Caching
// ============================================================================

/**
 * Get forum category post count with caching
 */
export async function getForumCategoryPostCount(
  categoryId: string
): Promise<number> {
  return getOrSet<number>(
    dbKey(DbCacheKey.FORUM_CATEGORY_COUNT, categoryId),
    async () => {
      return db.forumPost.count({
        where: {
          categoryId,
          deletedAt: null,
        },
      });
    },
    { ttl: CacheTTL.SHORT }
  );
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate all cached data for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const patterns = [
    `${DbCacheKey.USER}:${userId}*`,
    `${DbCacheKey.USER_STATS}:${userId}*`,
    `${DbCacheKey.USER_BOOKS}:${userId}*`,
    `${DbCacheKey.USER_BOOKS_COUNT}:${userId}*`,
    `${DbCacheKey.FLASHCARDS_DUE}:${userId}*`,
    `${DbCacheKey.FLASHCARDS_COUNT}:${userId}*`,
    `${DbCacheKey.ACHIEVEMENTS}:${userId}*`,
    `${DbCacheKey.FOLLOWERS_COUNT}:${userId}*`,
    `${DbCacheKey.FOLLOWING_COUNT}:${userId}*`,
  ];

  await Promise.all(patterns.map((pattern) => invalidatePattern(pattern)));

  logger.debug("Invalidated user cache", { userId });
}

/**
 * Invalidate cached data for a book
 */
export async function invalidateBookCache(bookId: string): Promise<void> {
  await invalidatePattern(`${DbCacheKey.BOOK}:${bookId}*`);
  await invalidatePattern(`${DbCacheKey.BOOK_PROGRESS}:${bookId}*`);

  logger.debug("Invalidated book cache", { bookId });
}

/**
 * Invalidate user's book list cache
 */
export async function invalidateUserBooksCache(userId: string): Promise<void> {
  await invalidatePattern(`${DbCacheKey.USER_BOOKS}:${userId}*`);
  await invalidatePattern(`${DbCacheKey.USER_BOOKS_COUNT}:${userId}*`);

  logger.debug("Invalidated user books cache", { userId });
}

/**
 * Invalidate user's flashcard cache
 */
export async function invalidateFlashcardsCache(userId: string): Promise<void> {
  await del(dbKey(DbCacheKey.FLASHCARDS_DUE, userId));
  await del(dbKey(DbCacheKey.FLASHCARDS_COUNT, userId));

  logger.debug("Invalidated flashcards cache", { userId });
}

/**
 * Invalidate social counts cache for a user
 */
export async function invalidateSocialCache(userId: string): Promise<void> {
  await del(dbKey(DbCacheKey.FOLLOWERS_COUNT, userId));
  await del(dbKey(DbCacheKey.FOLLOWING_COUNT, userId));
  await invalidatePattern(`${DbCacheKey.USER_STATS}:${userId}*`);

  logger.debug("Invalidated social cache", { userId });
}

/**
 * Invalidate forum category cache
 */
export async function invalidateForumCategoryCache(
  categoryId: string
): Promise<void> {
  await del(dbKey(DbCacheKey.FORUM_CATEGORY_COUNT, categoryId));

  logger.debug("Invalidated forum category cache", { categoryId });
}

// ============================================================================
// Exported Module
// ============================================================================

export const dbCache = {
  // User
  getUserById,
  getUserByClerkId,
  getUserStats,

  // Books
  getUserBooksCount,
  getBookById,

  // Flashcards
  getDueFlashcardsCount,
  getFlashcardsCount,

  // Social
  getFollowersCount,
  getFollowingCount,

  // Achievements
  getUserAchievementsCount,

  // Forum
  getForumCategoryPostCount,

  // Invalidation
  invalidateUserCache,
  invalidateBookCache,
  invalidateUserBooksCache,
  invalidateFlashcardsCache,
  invalidateSocialCache,
  invalidateForumCategoryCache,
};

export default dbCache;
