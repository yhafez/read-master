/**
 * Redis Cache Service for Read Master API
 *
 * Provides caching functionality using Upstash Redis with a REST-based
 * API that's optimized for serverless environments.
 *
 * @example
 * ```typescript
 * import { cache, cacheUtils } from './services/redis';
 *
 * // Simple get/set
 * await cache.set('user:123', userData, { ttl: 3600 });
 * const user = await cache.get<UserData>('user:123');
 *
 * // Delete a key
 * await cache.delete('user:123');
 *
 * // Use cache patterns
 * const book = await cacheUtils.getOrSet('book:abc', async () => fetchBook('abc'), { ttl: 600 });
 *
 * // Invalidate by pattern
 * await cacheUtils.invalidatePattern('book:*');
 * ```
 */

import { Redis } from "@upstash/redis";
import { logger } from "../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for cache set operations
 */
export type CacheSetOptions = {
  /** Time-to-live in seconds. If not set, the key never expires. */
  ttl?: number;
  /** Only set if the key doesn't exist */
  nx?: boolean;
  /** Only set if the key already exists */
  xx?: boolean;
};

/**
 * Options for cache get operations
 */
export type CacheGetOptions = {
  /** If true, also refreshes the TTL */
  refreshTtl?: number;
};

/**
 * Result of a cache operation
 */
export type CacheResult<T> = {
  /** Whether the operation succeeded */
  success: boolean;
  /** The cached value (for get operations) */
  value?: T;
  /** Error message if operation failed */
  error?: string;
};

/**
 * Cache key prefixes for organized namespacing
 */
export const CacheKeyPrefix = {
  /** User-related data */
  USER: "user",
  /** Book-related data */
  BOOK: "book",
  /** Reading progress data */
  PROGRESS: "progress",
  /** Pre-reading guides */
  GUIDE: "guide",
  /** Flashcard data */
  FLASHCARD: "flashcard",
  /** Assessment data */
  ASSESSMENT: "assessment",
  /** Search results */
  SEARCH: "search",
  /** API responses */
  API: "api",
  /** Leaderboard data */
  LEADERBOARD: "leaderboard",
  /** Forum data */
  FORUM: "forum",
  /** Session data */
  SESSION: "session",
} as const;

export type CacheKeyPrefixType =
  (typeof CacheKeyPrefix)[keyof typeof CacheKeyPrefix];

/**
 * Common TTL values in seconds
 */
export const CacheTTL = {
  /** 1 minute */
  VERY_SHORT: 60,
  /** 5 minutes */
  SHORT: 300,
  /** 15 minutes */
  MEDIUM: 900,
  /** 1 hour */
  LONG: 3600,
  /** 6 hours */
  VERY_LONG: 21600,
  /** 24 hours */
  DAY: 86400,
  /** 7 days */
  WEEK: 604800,
  /** 30 days */
  MONTH: 2592000,
} as const;

export type CacheTTLType = (typeof CacheTTL)[keyof typeof CacheTTL];

// ============================================================================
// Redis Client Singleton
// ============================================================================

/**
 * Lazy-initialized Redis client
 */
let redisClient: Redis | null = null;
let clientInitialized = false;

/**
 * Initialize the Redis client
 */
function initializeClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn("Redis not configured - caching disabled", {
      hasUrl: !!url,
      hasToken: !!token,
    });
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (error) {
    logger.error("Failed to initialize Redis client", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Get the Redis client instance
 * Returns null if Redis is not configured
 */
export function getRedisClient(): Redis | null {
  if (!clientInitialized) {
    redisClient = initializeClient();
    clientInitialized = true;
  }
  return redisClient;
}

/**
 * Check if Redis is available and connected
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

/**
 * Reset the Redis client (for testing)
 */
export function resetRedisClient(): void {
  redisClient = null;
  clientInitialized = false;
}

// ============================================================================
// Core Cache Operations
// ============================================================================

/**
 * Get a value from the cache
 *
 * @param key - The cache key
 * @param options - Get options
 * @returns The cached value or null if not found
 *
 * @example
 * ```typescript
 * const user = await get<User>('user:123');
 * if (user) {
 *   // Use cached user data
 * }
 * ```
 */
export async function get<T>(
  key: string,
  options: CacheGetOptions = {}
): Promise<T | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get<T>(key);

    // Optionally refresh TTL on access
    if (value !== null && options.refreshTtl) {
      await redis.expire(key, options.refreshTtl);
    }

    return value;
  } catch (error) {
    logger.error("Cache get failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Set a value in the cache
 *
 * @param key - The cache key
 * @param value - The value to cache (will be JSON serialized)
 * @param options - Set options including TTL
 * @returns Whether the operation succeeded
 *
 * @example
 * ```typescript
 * await set('user:123', userData, { ttl: CacheTTL.HOUR });
 * await set('session:abc', session, { ttl: CacheTTL.DAY, nx: true });
 * ```
 */
export async function set<T>(
  key: string,
  value: T,
  options: CacheSetOptions = {}
): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    // Upstash Redis set returns 'OK' for success, null for conditional failures
    // The type annotations are complex due to the get option, so we use a simpler approach
    let result: "OK" | null;

    if (options.ttl !== undefined && options.ttl > 0) {
      if (options.nx) {
        result = (await redis.set(key, value, {
          ex: options.ttl,
          nx: true,
        })) as "OK" | null;
      } else if (options.xx) {
        result = (await redis.set(key, value, {
          ex: options.ttl,
          xx: true,
        })) as "OK" | null;
      } else {
        result = (await redis.set(key, value, {
          ex: options.ttl,
        })) as "OK" | null;
      }
    } else if (options.nx) {
      result = (await redis.set(key, value, { nx: true })) as "OK" | null;
    } else if (options.xx) {
      result = (await redis.set(key, value, { xx: true })) as "OK" | null;
    } else {
      result = (await redis.set(key, value)) as "OK" | null;
    }

    // Upstash returns 'OK' for successful set, null for nx/xx failure
    return result === "OK";
  } catch (error) {
    logger.error("Cache set failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Delete a key from the cache
 *
 * @param key - The cache key to delete
 * @returns Whether the key was deleted
 *
 * @example
 * ```typescript
 * await del('user:123');
 * ```
 */
export async function del(key: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    logger.error("Cache delete failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Delete multiple keys from the cache
 *
 * @param keys - Array of cache keys to delete
 * @returns Number of keys deleted
 */
export async function delMany(keys: string[]): Promise<number> {
  const redis = getRedisClient();

  if (!redis || keys.length === 0) {
    return 0;
  }

  try {
    const result = await redis.del(...keys);
    return result;
  } catch (error) {
    logger.error("Cache delMany failed", {
      keyCount: keys.length,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return 0;
  }
}

/**
 * Check if a key exists in the cache
 *
 * @param key - The cache key to check
 * @returns Whether the key exists
 */
export async function exists(key: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    const result = await redis.exists(key);
    return result > 0;
  } catch (error) {
    logger.error("Cache exists check failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Set TTL on an existing key
 *
 * @param key - The cache key
 * @param ttl - Time-to-live in seconds
 * @returns Whether the TTL was set
 */
export async function expire(key: string, ttl: number): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    const result = await redis.expire(key, ttl);
    return result === 1;
  } catch (error) {
    logger.error("Cache expire failed", {
      key,
      ttl,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Get the remaining TTL of a key in seconds
 *
 * @param key - The cache key
 * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
 */
export async function ttl(key: string): Promise<number> {
  const redis = getRedisClient();

  if (!redis) {
    return -2;
  }

  try {
    return await redis.ttl(key);
  } catch (error) {
    logger.error("Cache TTL check failed", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return -2;
  }
}

// ============================================================================
// Advanced Cache Operations
// ============================================================================

/**
 * Get a value or set it if not present
 *
 * @param key - The cache key
 * @param fetcher - Function to fetch the value if not cached
 * @param options - Cache options including TTL
 * @returns The cached or fetched value
 *
 * @example
 * ```typescript
 * const user = await getOrSet(
 *   'user:123',
 *   async () => await db.user.findUnique({ where: { id: '123' } }),
 *   { ttl: CacheTTL.HOUR }
 * );
 * ```
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheSetOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = await get<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Fetch the value
  const value = await fetcher();

  // Cache it for next time (don't wait for this to complete)
  set(key, value, options).catch((error) => {
    logger.error("Cache set failed in getOrSet", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });

  return value;
}

/**
 * Get multiple values from cache
 *
 * @param keys - Array of cache keys
 * @returns Array of values (null for missing keys)
 */
export async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  const redis = getRedisClient();

  if (!redis || keys.length === 0) {
    return keys.map(() => null);
  }

  try {
    const values = await redis.mget<T[]>(...keys);
    return values;
  } catch (error) {
    logger.error("Cache mget failed", {
      keyCount: keys.length,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return keys.map(() => null);
  }
}

/**
 * Set multiple key-value pairs
 *
 * @param entries - Array of [key, value] pairs
 * @param options - Common cache options (TTL applies to all)
 * @returns Whether the operation succeeded
 */
export async function mset<T>(
  entries: [string, T][],
  options: CacheSetOptions = {}
): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis || entries.length === 0) {
    return false;
  }

  try {
    // Build the key-value pairs object
    const data: Record<string, T> = {};
    for (const [key, value] of entries) {
      data[key] = value;
    }

    await redis.mset(data);

    // Set TTL on each key if specified
    if (options.ttl !== undefined && options.ttl > 0) {
      const pipeline = redis.pipeline();
      for (const [key] of entries) {
        pipeline.expire(key, options.ttl);
      }
      await pipeline.exec();
    }

    return true;
  } catch (error) {
    logger.error("Cache mset failed", {
      entryCount: entries.length,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Increment a numeric value
 *
 * @param key - The cache key
 * @param amount - Amount to increment by (default: 1)
 * @returns The new value, or null if failed
 */
export async function incr(
  key: string,
  amount: number = 1
): Promise<number | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    if (amount === 1) {
      return await redis.incr(key);
    }
    return await redis.incrby(key, amount);
  } catch (error) {
    logger.error("Cache incr failed", {
      key,
      amount,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Decrement a numeric value
 *
 * @param key - The cache key
 * @param amount - Amount to decrement by (default: 1)
 * @returns The new value, or null if failed
 */
export async function decr(
  key: string,
  amount: number = 1
): Promise<number | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    if (amount === 1) {
      return await redis.decr(key);
    }
    return await redis.decrby(key, amount);
  } catch (error) {
    logger.error("Cache decr failed", {
      key,
      amount,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

/**
 * Delete all keys matching a pattern
 * Note: Use with caution in production as SCAN can be slow for large datasets
 *
 * @param pattern - Glob-style pattern (e.g., 'user:*', 'book:123:*')
 * @returns Number of keys deleted
 *
 * @example
 * ```typescript
 * // Invalidate all cached data for a user
 * await invalidatePattern('user:123:*');
 *
 * // Invalidate all book data
 * await invalidatePattern('book:*');
 * ```
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  const redis = getRedisClient();

  if (!redis) {
    return 0;
  }

  try {
    // Use SCAN to find keys matching the pattern
    // Upstash SCAN returns cursor as string
    let cursor = "0";
    const keysToDelete: string[] = [];

    do {
      const result = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = result[0] as unknown as string;
      keysToDelete.push(...result[1]);
    } while (cursor !== "0");

    if (keysToDelete.length === 0) {
      return 0;
    }

    // Delete all matching keys
    const deleted = await redis.del(...keysToDelete);

    logger.info("Cache invalidation completed", {
      pattern,
      keysDeleted: deleted,
    });

    return deleted;
  } catch (error) {
    logger.error("Cache pattern invalidation failed", {
      pattern,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return 0;
  }
}

/**
 * Invalidate cache for a specific user
 *
 * @param userId - The user ID
 * @returns Number of keys deleted
 */
export async function invalidateUserCache(userId: string): Promise<number> {
  const patternDeleted = await invalidatePattern(`*:${userId}:*`);
  const userKeyDeleted = (await del(`user:${userId}`)) ? 1 : 0;
  return patternDeleted + userKeyDeleted;
}

/**
 * Invalidate cache for a specific book
 *
 * @param bookId - The book ID
 * @returns Number of keys deleted
 */
export async function invalidateBookCache(bookId: string): Promise<number> {
  const patternDeleted = await invalidatePattern(`*:${bookId}:*`);
  const bookKeyDeleted = (await del(`book:${bookId}`)) ? 1 : 0;
  return patternDeleted + bookKeyDeleted;
}

// ============================================================================
// Cache Key Builders
// ============================================================================

/**
 * Build a cache key with a prefix
 *
 * @param prefix - The key prefix
 * @param parts - Additional key parts
 * @returns The full cache key
 *
 * @example
 * ```typescript
 * const key = buildKey(CacheKeyPrefix.USER, userId, 'books');
 * // Returns: 'user:123:books'
 * ```
 */
export function buildKey(
  prefix: CacheKeyPrefixType,
  ...parts: (string | number)[]
): string {
  return [prefix, ...parts].join(":");
}

/**
 * Build cache key for user data
 */
export function userKey(userId: string, ...parts: string[]): string {
  return buildKey(CacheKeyPrefix.USER, userId, ...parts);
}

/**
 * Build cache key for book data
 */
export function bookKey(bookId: string, ...parts: string[]): string {
  return buildKey(CacheKeyPrefix.BOOK, bookId, ...parts);
}

/**
 * Build cache key for reading progress
 */
export function progressKey(userId: string, bookId: string): string {
  return buildKey(CacheKeyPrefix.PROGRESS, userId, bookId);
}

/**
 * Build cache key for pre-reading guide
 */
export function guideKey(bookId: string): string {
  return buildKey(CacheKeyPrefix.GUIDE, bookId);
}

/**
 * Build cache key for search results
 */
export function searchKey(query: string, ...filters: string[]): string {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, "_");
  return buildKey(CacheKeyPrefix.SEARCH, normalizedQuery, ...filters);
}

/**
 * Build cache key for leaderboard
 */
export function leaderboardKey(
  type: string,
  timeframe: string,
  page: number = 0
): string {
  return buildKey(CacheKeyPrefix.LEADERBOARD, type, timeframe, String(page));
}

// ============================================================================
// Cache Wrapper Utilities
// ============================================================================

/**
 * Create a cached version of an async function
 *
 * @param keyFn - Function to generate cache key from arguments
 * @param fn - The function to cache
 * @param options - Cache options
 * @returns Cached version of the function
 *
 * @example
 * ```typescript
 * const cachedGetUser = withCache(
 *   (id: string) => `user:${id}`,
 *   async (id: string) => db.user.findUnique({ where: { id } }),
 *   { ttl: CacheTTL.HOUR }
 * );
 *
 * const user = await cachedGetUser('123');
 * ```
 */
export function withCache<TArgs extends unknown[], TResult>(
  keyFn: (...args: TArgs) => string,
  fn: (...args: TArgs) => Promise<TResult>,
  options: CacheSetOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyFn(...args);
    return getOrSet(key, () => fn(...args), options);
  };
}

/**
 * Wrap a function with cache invalidation
 *
 * @param invalidationKeys - Keys to invalidate after the function runs
 * @param fn - The function to wrap
 * @returns Wrapped function that invalidates cache after execution
 */
export function withInvalidation<TArgs extends unknown[], TResult>(
  invalidationKeys: ((...args: TArgs) => string[]) | string[],
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const result = await fn(...args);

    // Get keys to invalidate
    const keys =
      typeof invalidationKeys === "function"
        ? invalidationKeys(...args)
        : invalidationKeys;

    // Invalidate in background
    Promise.all(keys.map((key) => del(key))).catch((error) => {
      logger.error("Cache invalidation failed", {
        keys,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    return result;
  };
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Main cache object with all operations
 */
export const cache = {
  // Core operations
  get,
  set,
  del,
  delMany,
  exists,
  expire,
  ttl,

  // Advanced operations
  getOrSet,
  mget,
  mset,
  incr,
  decr,

  // Invalidation
  invalidatePattern,
  invalidateUserCache,
  invalidateBookCache,

  // Key builders
  buildKey,
  userKey,
  bookKey,
  progressKey,
  guideKey,
  searchKey,
  leaderboardKey,
} as const;

/**
 * Cache utilities for external use
 */
export const cacheUtils = {
  // Client management
  getRedisClient,
  isRedisAvailable,
  resetRedisClient,

  // Higher-order utilities
  withCache,
  withInvalidation,

  // Constants
  CacheKeyPrefix,
  CacheTTL,
} as const;
