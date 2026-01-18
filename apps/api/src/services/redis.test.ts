/**
 * Redis Cache Service Tests
 *
 * Tests for the Redis cache service functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @upstash/redis before importing the module
const mockRedisInstance = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  mget: vi.fn(),
  mset: vi.fn(),
  incr: vi.fn(),
  incrby: vi.fn(),
  decr: vi.fn(),
  decrby: vi.fn(),
  scan: vi.fn(),
  pipeline: vi.fn(() => ({
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
};

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => mockRedisInstance),
}));

// Mock the logger
vi.mock("../utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
  },
}));

// Import after mocking
import {
  cache,
  cacheUtils,
  CacheKeyPrefix,
  CacheTTL,
  get,
  set,
  del,
  delMany,
  exists,
  expire,
  ttl,
  getOrSet,
  mget,
  mset,
  incr,
  decr,
  invalidatePattern,
  invalidateUserCache,
  invalidateBookCache,
  buildKey,
  userKey,
  bookKey,
  progressKey,
  guideKey,
  searchKey,
  leaderboardKey,
  getRedisClient,
  isRedisAvailable,
  resetRedisClient,
  withCache,
  withInvalidation,
  type CacheSetOptions,
  type CacheGetOptions,
  type CacheResult,
  type CacheKeyPrefixType,
  type CacheTTLType,
} from "./redis.js";

describe("Redis Cache Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    // Reset the client
    resetRedisClient();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetRedisClient();
  });

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe("Type Exports", () => {
    it("should export CacheSetOptions type", () => {
      const options: CacheSetOptions = {
        ttl: 3600,
        nx: true,
        xx: false,
      };
      expect(options.ttl).toBe(3600);
    });

    it("should export CacheGetOptions type", () => {
      const options: CacheGetOptions = {
        refreshTtl: 600,
      };
      expect(options.refreshTtl).toBe(600);
    });

    it("should export CacheResult type", () => {
      const result: CacheResult<string> = {
        success: true,
        value: "test",
      };
      expect(result.success).toBe(true);
    });

    it("should export CacheKeyPrefixType type", () => {
      const prefix: CacheKeyPrefixType = CacheKeyPrefix.USER;
      expect(prefix).toBe("user");
    });

    it("should export CacheTTLType type", () => {
      const ttlValue: CacheTTLType = CacheTTL.LONG;
      expect(ttlValue).toBe(3600);
    });
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe("CacheKeyPrefix", () => {
    it("should have USER prefix", () => {
      expect(CacheKeyPrefix.USER).toBe("user");
    });

    it("should have BOOK prefix", () => {
      expect(CacheKeyPrefix.BOOK).toBe("book");
    });

    it("should have PROGRESS prefix", () => {
      expect(CacheKeyPrefix.PROGRESS).toBe("progress");
    });

    it("should have GUIDE prefix", () => {
      expect(CacheKeyPrefix.GUIDE).toBe("guide");
    });

    it("should have FLASHCARD prefix", () => {
      expect(CacheKeyPrefix.FLASHCARD).toBe("flashcard");
    });

    it("should have ASSESSMENT prefix", () => {
      expect(CacheKeyPrefix.ASSESSMENT).toBe("assessment");
    });

    it("should have SEARCH prefix", () => {
      expect(CacheKeyPrefix.SEARCH).toBe("search");
    });

    it("should have API prefix", () => {
      expect(CacheKeyPrefix.API).toBe("api");
    });

    it("should have LEADERBOARD prefix", () => {
      expect(CacheKeyPrefix.LEADERBOARD).toBe("leaderboard");
    });

    it("should have FORUM prefix", () => {
      expect(CacheKeyPrefix.FORUM).toBe("forum");
    });

    it("should have SESSION prefix", () => {
      expect(CacheKeyPrefix.SESSION).toBe("session");
    });
  });

  describe("CacheTTL", () => {
    it("should have VERY_SHORT as 60 seconds", () => {
      expect(CacheTTL.VERY_SHORT).toBe(60);
    });

    it("should have SHORT as 300 seconds (5 min)", () => {
      expect(CacheTTL.SHORT).toBe(300);
    });

    it("should have MEDIUM as 900 seconds (15 min)", () => {
      expect(CacheTTL.MEDIUM).toBe(900);
    });

    it("should have LONG as 3600 seconds (1 hour)", () => {
      expect(CacheTTL.LONG).toBe(3600);
    });

    it("should have VERY_LONG as 21600 seconds (6 hours)", () => {
      expect(CacheTTL.VERY_LONG).toBe(21600);
    });

    it("should have DAY as 86400 seconds", () => {
      expect(CacheTTL.DAY).toBe(86400);
    });

    it("should have WEEK as 604800 seconds", () => {
      expect(CacheTTL.WEEK).toBe(604800);
    });

    it("should have MONTH as 2592000 seconds", () => {
      expect(CacheTTL.MONTH).toBe(2592000);
    });
  });

  // ============================================================================
  // Client Management Tests
  // ============================================================================

  describe("Client Management", () => {
    it("should get Redis client when configured", () => {
      const client = getRedisClient();
      expect(client).not.toBeNull();
    });

    it("should return null when Redis is not configured", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      resetRedisClient();

      const client = getRedisClient();
      expect(client).toBeNull();
    });

    it("should return null when URL is missing", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const client = getRedisClient();
      expect(client).toBeNull();
    });

    it("should return null when token is missing", () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      resetRedisClient();

      const client = getRedisClient();
      expect(client).toBeNull();
    });

    it("should check if Redis is available", () => {
      expect(isRedisAvailable()).toBe(true);
    });

    it("should return false for isRedisAvailable when not configured", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      expect(isRedisAvailable()).toBe(false);
    });

    it("should reset the client", () => {
      // Get client first to initialize
      getRedisClient();
      expect(isRedisAvailable()).toBe(true);

      // Reset
      resetRedisClient();
      // Client is re-initialized on next access
      expect(getRedisClient()).not.toBeNull();
    });
  });

  // ============================================================================
  // Core Cache Operations Tests
  // ============================================================================

  describe("get()", () => {
    it("should get a value from cache", async () => {
      mockRedisInstance.get.mockResolvedValue({ id: "123", name: "Test" });

      const result = await get<{ id: string; name: string }>("user:123");

      expect(result).toEqual({ id: "123", name: "Test" });
      expect(mockRedisInstance.get).toHaveBeenCalledWith("user:123");
    });

    it("should return null for missing key", async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await get("nonexistent");

      expect(result).toBeNull();
    });

    it("should refresh TTL on access when option is set", async () => {
      mockRedisInstance.get.mockResolvedValue("value");
      mockRedisInstance.expire.mockResolvedValue(1);

      await get("key", { refreshTtl: 600 });

      expect(mockRedisInstance.expire).toHaveBeenCalledWith("key", 600);
    });

    it("should not refresh TTL when value is null", async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      await get("key", { refreshTtl: 600 });

      expect(mockRedisInstance.expire).not.toHaveBeenCalled();
    });

    it("should return null when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await get("key");

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      mockRedisInstance.get.mockRejectedValue(new Error("Connection error"));

      const result = await get("key");

      expect(result).toBeNull();
    });
  });

  describe("set()", () => {
    it("should set a value in cache", async () => {
      mockRedisInstance.set.mockResolvedValue("OK");

      const result = await set("key", { data: "test" });

      expect(result).toBe(true);
      expect(mockRedisInstance.set).toHaveBeenCalledWith("key", {
        data: "test",
      });
    });

    it("should set value with TTL", async () => {
      mockRedisInstance.set.mockResolvedValue("OK");

      await set("key", "value", { ttl: 3600 });

      expect(mockRedisInstance.set).toHaveBeenCalledWith("key", "value", {
        ex: 3600,
      });
    });

    it("should set value with NX option", async () => {
      mockRedisInstance.set.mockResolvedValue("OK");

      await set("key", "value", { nx: true });

      expect(mockRedisInstance.set).toHaveBeenCalledWith("key", "value", {
        nx: true,
      });
    });

    it("should set value with XX option", async () => {
      mockRedisInstance.set.mockResolvedValue("OK");

      await set("key", "value", { xx: true });

      expect(mockRedisInstance.set).toHaveBeenCalledWith("key", "value", {
        xx: true,
      });
    });

    it("should return false when NX fails", async () => {
      mockRedisInstance.set.mockResolvedValue(null);

      const result = await set("key", "value", { nx: true });

      expect(result).toBe(false);
    });

    it("should return false when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await set("key", "value");

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      mockRedisInstance.set.mockRejectedValue(new Error("Write error"));

      const result = await set("key", "value");

      expect(result).toBe(false);
    });

    it("should ignore invalid TTL of 0", async () => {
      mockRedisInstance.set.mockResolvedValue("OK");

      await set("key", "value", { ttl: 0 });

      expect(mockRedisInstance.set).toHaveBeenCalledWith("key", "value");
    });
  });

  describe("del()", () => {
    it("should delete a key", async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await del("key");

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith("key");
    });

    it("should return false when key doesn't exist", async () => {
      mockRedisInstance.del.mockResolvedValue(0);

      const result = await del("nonexistent");

      expect(result).toBe(false);
    });

    it("should return false when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await del("key");

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      mockRedisInstance.del.mockRejectedValue(new Error("Delete error"));

      const result = await del("key");

      expect(result).toBe(false);
    });
  });

  describe("delMany()", () => {
    it("should delete multiple keys", async () => {
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await delMany(["key1", "key2", "key3"]);

      expect(result).toBe(3);
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        "key1",
        "key2",
        "key3"
      );
    });

    it("should return 0 for empty array", async () => {
      const result = await delMany([]);

      expect(result).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it("should return 0 when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await delMany(["key1"]);

      expect(result).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      mockRedisInstance.del.mockRejectedValue(new Error("Delete error"));

      const result = await delMany(["key1"]);

      expect(result).toBe(0);
    });
  });

  describe("exists()", () => {
    it("should return true when key exists", async () => {
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await exists("key");

      expect(result).toBe(true);
    });

    it("should return false when key doesn't exist", async () => {
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await exists("nonexistent");

      expect(result).toBe(false);
    });

    it("should return false when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await exists("key");

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      mockRedisInstance.exists.mockRejectedValue(new Error("Check error"));

      const result = await exists("key");

      expect(result).toBe(false);
    });
  });

  describe("expire()", () => {
    it("should set TTL on a key", async () => {
      mockRedisInstance.expire.mockResolvedValue(1);

      const result = await expire("key", 3600);

      expect(result).toBe(true);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith("key", 3600);
    });

    it("should return false when key doesn't exist", async () => {
      mockRedisInstance.expire.mockResolvedValue(0);

      const result = await expire("nonexistent", 3600);

      expect(result).toBe(false);
    });

    it("should return false when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await expire("key", 3600);

      expect(result).toBe(false);
    });
  });

  describe("ttl()", () => {
    it("should get TTL of a key", async () => {
      mockRedisInstance.ttl.mockResolvedValue(3540);

      const result = await ttl("key");

      expect(result).toBe(3540);
    });

    it("should return -1 for key without expiry", async () => {
      mockRedisInstance.ttl.mockResolvedValue(-1);

      const result = await ttl("key");

      expect(result).toBe(-1);
    });

    it("should return -2 for nonexistent key", async () => {
      mockRedisInstance.ttl.mockResolvedValue(-2);

      const result = await ttl("nonexistent");

      expect(result).toBe(-2);
    });

    it("should return -2 when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await ttl("key");

      expect(result).toBe(-2);
    });
  });

  // ============================================================================
  // Advanced Cache Operations Tests
  // ============================================================================

  describe("getOrSet()", () => {
    it("should return cached value when present", async () => {
      mockRedisInstance.get.mockResolvedValue("cached-value");
      const fetcher = vi.fn().mockResolvedValue("fetched-value");

      const result = await getOrSet("key", fetcher);

      expect(result).toBe("cached-value");
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("should fetch and cache when not present", async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.set.mockResolvedValue("OK");
      const fetcher = vi.fn().mockResolvedValue("fetched-value");

      const result = await getOrSet("key", fetcher, { ttl: 3600 });

      expect(result).toBe("fetched-value");
      expect(fetcher).toHaveBeenCalled();
    });

    it("should call fetcher when Redis returns null", async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.set.mockResolvedValue("OK");
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });

      const result = await getOrSet("key", fetcher);

      expect(result).toEqual({ id: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("mget()", () => {
    it("should get multiple values", async () => {
      mockRedisInstance.mget.mockResolvedValue(["value1", "value2", null]);

      const result = await mget<string>(["key1", "key2", "key3"]);

      expect(result).toEqual(["value1", "value2", null]);
    });

    it("should return array of nulls for empty array", async () => {
      const result = await mget<string>([]);

      expect(result).toEqual([]);
    });

    it("should return array of nulls when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await mget<string>(["key1", "key2"]);

      expect(result).toEqual([null, null]);
    });
  });

  describe("mset()", () => {
    it("should set multiple values", async () => {
      mockRedisInstance.mset.mockResolvedValue("OK");

      const result = await mset<string>([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);

      expect(result).toBe(true);
      expect(mockRedisInstance.mset).toHaveBeenCalled();
    });

    it("should return false for empty entries", async () => {
      const result = await mset<string>([]);

      expect(result).toBe(false);
    });

    it("should return false when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await mset<string>([["key1", "value1"]]);

      expect(result).toBe(false);
    });
  });

  describe("incr()", () => {
    it("should increment by 1", async () => {
      mockRedisInstance.incr.mockResolvedValue(5);

      const result = await incr("counter");

      expect(result).toBe(5);
      expect(mockRedisInstance.incr).toHaveBeenCalledWith("counter");
    });

    it("should increment by custom amount", async () => {
      mockRedisInstance.incrby.mockResolvedValue(10);

      const result = await incr("counter", 5);

      expect(result).toBe(10);
      expect(mockRedisInstance.incrby).toHaveBeenCalledWith("counter", 5);
    });

    it("should return null when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await incr("counter");

      expect(result).toBeNull();
    });
  });

  describe("decr()", () => {
    it("should decrement by 1", async () => {
      mockRedisInstance.decr.mockResolvedValue(4);

      const result = await decr("counter");

      expect(result).toBe(4);
      expect(mockRedisInstance.decr).toHaveBeenCalledWith("counter");
    });

    it("should decrement by custom amount", async () => {
      mockRedisInstance.decrby.mockResolvedValue(0);

      const result = await decr("counter", 5);

      expect(result).toBe(0);
      expect(mockRedisInstance.decrby).toHaveBeenCalledWith("counter", 5);
    });

    it("should return null when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await decr("counter");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Cache Invalidation Tests
  // ============================================================================

  describe("invalidatePattern()", () => {
    it("should delete keys matching pattern", async () => {
      mockRedisInstance.scan.mockResolvedValue(["0", ["key1", "key2", "key3"]]);
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await invalidatePattern("user:*");

      expect(result).toBe(3);
    });

    it("should return 0 when no keys match", async () => {
      mockRedisInstance.scan.mockResolvedValue(["0", []]);

      const result = await invalidatePattern("nonexistent:*");

      expect(result).toBe(0);
    });

    it("should return 0 when Redis is not available", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      resetRedisClient();

      const result = await invalidatePattern("user:*");

      expect(result).toBe(0);
    });

    it("should handle multiple scan iterations", async () => {
      mockRedisInstance.scan
        .mockResolvedValueOnce(["100", ["key1", "key2"]])
        .mockResolvedValueOnce(["0", ["key3"]]);
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await invalidatePattern("user:*");

      expect(result).toBe(3);
      expect(mockRedisInstance.scan).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidateUserCache()", () => {
    it("should invalidate user cache", async () => {
      mockRedisInstance.scan.mockResolvedValue(["0", ["user:123:books"]]);
      mockRedisInstance.del
        .mockResolvedValueOnce(1) // For pattern
        .mockResolvedValueOnce(1); // For user:123

      const result = await invalidateUserCache("123");

      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe("invalidateBookCache()", () => {
    it("should invalidate book cache", async () => {
      mockRedisInstance.scan.mockResolvedValue(["0", ["book:abc:chapters"]]);
      mockRedisInstance.del
        .mockResolvedValueOnce(1) // For pattern
        .mockResolvedValueOnce(1); // For book:abc

      const result = await invalidateBookCache("abc");

      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Cache Key Builder Tests
  // ============================================================================

  describe("buildKey()", () => {
    it("should build a key with prefix and parts", () => {
      const key = buildKey(CacheKeyPrefix.USER, "123", "books");

      expect(key).toBe("user:123:books");
    });

    it("should handle numeric parts", () => {
      const key = buildKey(CacheKeyPrefix.LEADERBOARD, "weekly", 1);

      expect(key).toBe("leaderboard:weekly:1");
    });

    it("should handle single part", () => {
      const key = buildKey(CacheKeyPrefix.BOOK, "abc");

      expect(key).toBe("book:abc");
    });
  });

  describe("userKey()", () => {
    it("should build user key", () => {
      expect(userKey("123")).toBe("user:123");
    });

    it("should build user key with parts", () => {
      expect(userKey("123", "books")).toBe("user:123:books");
    });
  });

  describe("bookKey()", () => {
    it("should build book key", () => {
      expect(bookKey("abc")).toBe("book:abc");
    });

    it("should build book key with parts", () => {
      expect(bookKey("abc", "chapters")).toBe("book:abc:chapters");
    });
  });

  describe("progressKey()", () => {
    it("should build progress key", () => {
      expect(progressKey("user123", "book456")).toBe(
        "progress:user123:book456"
      );
    });
  });

  describe("guideKey()", () => {
    it("should build guide key", () => {
      expect(guideKey("book123")).toBe("guide:book123");
    });
  });

  describe("searchKey()", () => {
    it("should build search key", () => {
      expect(searchKey("test query")).toBe("search:test_query");
    });

    it("should normalize spaces", () => {
      expect(searchKey("  multiple   spaces  ")).toBe("search:multiple_spaces");
    });

    it("should include filters", () => {
      expect(searchKey("query", "fiction", "2024")).toBe(
        "search:query:fiction:2024"
      );
    });
  });

  describe("leaderboardKey()", () => {
    it("should build leaderboard key", () => {
      expect(leaderboardKey("xp", "weekly")).toBe("leaderboard:xp:weekly:0");
    });

    it("should include page number", () => {
      expect(leaderboardKey("xp", "monthly", 5)).toBe(
        "leaderboard:xp:monthly:5"
      );
    });
  });

  // ============================================================================
  // Higher-Order Utility Tests
  // ============================================================================

  describe("withCache()", () => {
    it("should create a cached function", async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.set.mockResolvedValue("OK");

      const fetchUser = vi.fn().mockResolvedValue({ id: "123", name: "Test" });
      const cachedFetchUser = withCache(
        (id: string) => `user:${id}`,
        fetchUser,
        { ttl: 3600 }
      );

      const result = await cachedFetchUser("123");

      expect(result).toEqual({ id: "123", name: "Test" });
      expect(fetchUser).toHaveBeenCalledWith("123");
    });

    it("should return cached value on subsequent calls", async () => {
      mockRedisInstance.get.mockResolvedValue({ id: "123", name: "Cached" });

      const fetchUser = vi.fn().mockResolvedValue({ id: "123", name: "Fresh" });
      const cachedFetchUser = withCache(
        (id: string) => `user:${id}`,
        fetchUser
      );

      const result = await cachedFetchUser("123");

      expect(result).toEqual({ id: "123", name: "Cached" });
      expect(fetchUser).not.toHaveBeenCalled();
    });
  });

  describe("withInvalidation()", () => {
    it("should call function and invalidate keys", async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const updateUser = vi.fn().mockResolvedValue({ success: true });
      const invalidatingUpdate = withInvalidation(
        (id: string) => [`user:${id}`, `user:${id}:profile`],
        updateUser
      );

      const result = await invalidatingUpdate("123");

      expect(result).toEqual({ success: true });
      expect(updateUser).toHaveBeenCalledWith("123");
      // Wait for background invalidation
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it("should accept static key array", async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const clearCache = vi.fn().mockResolvedValue(true);
      const invalidatingClear = withInvalidation(["cache:all"], clearCache);

      const result = await invalidatingClear();

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Cache Object Tests
  // ============================================================================

  describe("cache object", () => {
    it("should export all core operations", () => {
      expect(cache.get).toBeDefined();
      expect(cache.set).toBeDefined();
      expect(cache.del).toBeDefined();
      expect(cache.delMany).toBeDefined();
      expect(cache.exists).toBeDefined();
      expect(cache.expire).toBeDefined();
      expect(cache.ttl).toBeDefined();
    });

    it("should export advanced operations", () => {
      expect(cache.getOrSet).toBeDefined();
      expect(cache.mget).toBeDefined();
      expect(cache.mset).toBeDefined();
      expect(cache.incr).toBeDefined();
      expect(cache.decr).toBeDefined();
    });

    it("should export invalidation functions", () => {
      expect(cache.invalidatePattern).toBeDefined();
      expect(cache.invalidateUserCache).toBeDefined();
      expect(cache.invalidateBookCache).toBeDefined();
    });

    it("should export key builders", () => {
      expect(cache.buildKey).toBeDefined();
      expect(cache.userKey).toBeDefined();
      expect(cache.bookKey).toBeDefined();
      expect(cache.progressKey).toBeDefined();
      expect(cache.guideKey).toBeDefined();
      expect(cache.searchKey).toBeDefined();
      expect(cache.leaderboardKey).toBeDefined();
    });
  });

  describe("cacheUtils object", () => {
    it("should export client management functions", () => {
      expect(cacheUtils.getRedisClient).toBeDefined();
      expect(cacheUtils.isRedisAvailable).toBeDefined();
      expect(cacheUtils.resetRedisClient).toBeDefined();
    });

    it("should export higher-order utilities", () => {
      expect(cacheUtils.withCache).toBeDefined();
      expect(cacheUtils.withInvalidation).toBeDefined();
    });

    it("should export constants", () => {
      expect(cacheUtils.CacheKeyPrefix).toBeDefined();
      expect(cacheUtils.CacheTTL).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle complex objects in cache", async () => {
      const complexObject = {
        id: "123",
        nested: {
          array: [1, 2, 3],
          date: "2024-01-01T00:00:00Z",
        },
        nullField: null,
      };

      mockRedisInstance.get.mockResolvedValue(complexObject);

      const result = await get<typeof complexObject>("key");

      expect(result).toEqual(complexObject);
    });

    it("should handle empty string values", async () => {
      mockRedisInstance.get.mockResolvedValue("");
      mockRedisInstance.set.mockResolvedValue("OK");

      const getResult = await get("key");
      expect(getResult).toBe("");

      const setResult = await set("key", "");
      expect(setResult).toBe(true);
    });

    it("should handle boolean false values", async () => {
      mockRedisInstance.get.mockResolvedValue(false);

      const result = await get<boolean>("key");

      // Note: In Redis, false may be stored as string or boolean
      expect(result).toBe(false);
    });

    it("should handle zero values", async () => {
      mockRedisInstance.get.mockResolvedValue(0);

      const result = await get<number>("counter");

      expect(result).toBe(0);
    });

    it("should handle arrays", async () => {
      mockRedisInstance.get.mockResolvedValue([1, 2, 3]);

      const result = await get<number[]>("array");

      expect(result).toEqual([1, 2, 3]);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle incr errors", async () => {
      mockRedisInstance.incr.mockRejectedValue(new Error("Incr failed"));

      const result = await incr("counter");

      expect(result).toBeNull();
    });

    it("should handle decr errors", async () => {
      mockRedisInstance.decr.mockRejectedValue(new Error("Decr failed"));

      const result = await decr("counter");

      expect(result).toBeNull();
    });

    it("should handle mget errors", async () => {
      mockRedisInstance.mget.mockRejectedValue(new Error("Mget failed"));

      const result = await mget<string>(["key1", "key2"]);

      expect(result).toEqual([null, null]);
    });

    it("should handle mset errors", async () => {
      mockRedisInstance.mset.mockRejectedValue(new Error("Mset failed"));

      const result = await mset<string>([["key1", "value1"]]);

      expect(result).toBe(false);
    });

    it("should handle invalidatePattern errors", async () => {
      mockRedisInstance.scan.mockRejectedValue(new Error("Scan failed"));

      const result = await invalidatePattern("user:*");

      expect(result).toBe(0);
    });

    it("should handle expire errors", async () => {
      mockRedisInstance.expire.mockRejectedValue(new Error("Expire failed"));

      const result = await expire("key", 3600);

      expect(result).toBe(false);
    });

    it("should handle ttl errors", async () => {
      mockRedisInstance.ttl.mockRejectedValue(new Error("TTL failed"));

      const result = await ttl("key");

      expect(result).toBe(-2);
    });
  });
});
