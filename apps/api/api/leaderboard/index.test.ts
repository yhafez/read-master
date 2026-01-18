/**
 * Tests for GET /api/leaderboard endpoint
 *
 * Tests cover:
 * - Query parameter parsing and validation
 * - Metric column mapping
 * - Timeframe date calculation
 * - Cache key building
 * - Row to entry mapping
 * - Pagination building
 * - Response structure validation
 */

import { describe, it, expect } from "vitest";
import type { LeaderboardEntry } from "@read-master/shared";
import {
  parseQueryParams,
  getMetricColumn,
  getTimeframeStartDate,
  buildLeaderboardCacheKey,
  mapRowToEntry,
  buildPagination,
  VALID_TIMEFRAMES,
  VALID_METRICS,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_PAGE,
  CACHE_TTL_BY_TIMEFRAME,
  type LeaderboardQueryParams,
  type LeaderboardRow,
  type FullLeaderboardResponse,
} from "./index.js";

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type exports", () => {
  it("should export LeaderboardQueryParams type", () => {
    const params: LeaderboardQueryParams = {
      timeframe: "weekly",
      metric: "xp",
      friendsOnly: false,
      page: 1,
      limit: 50,
    };
    expect(params.timeframe).toBe("weekly");
    expect(params.metric).toBe("xp");
    expect(params.friendsOnly).toBe(false);
    expect(params.page).toBe(1);
    expect(params.limit).toBe(50);
  });

  it("should export LeaderboardRow type", () => {
    const row: LeaderboardRow = {
      userId: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      value: 1000,
    };
    expect(row.userId).toBe("user-123");
    expect(row.value).toBe(1000);
  });

  it("should export FullLeaderboardResponse type", () => {
    const response: FullLeaderboardResponse = {
      entries: [],
      currentUserRank: 5,
      timeframe: "weekly",
      metric: "xp",
      pagination: {
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };
    expect(response.currentUserRank).toBe(5);
    expect(response.pagination.totalPages).toBe(2);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have valid timeframes", () => {
    expect(VALID_TIMEFRAMES).toContain("weekly");
    expect(VALID_TIMEFRAMES).toContain("monthly");
    expect(VALID_TIMEFRAMES).toContain("all_time");
    expect(VALID_TIMEFRAMES.length).toBe(3);
  });

  it("should have valid metrics", () => {
    expect(VALID_METRICS).toContain("xp");
    expect(VALID_METRICS).toContain("books");
    expect(VALID_METRICS).toContain("streak");
    expect(VALID_METRICS).toContain("reading_time");
    expect(VALID_METRICS.length).toBe(4);
  });

  it("should have correct pagination defaults", () => {
    expect(DEFAULT_LIMIT).toBe(50);
    expect(MAX_LIMIT).toBe(100);
    expect(DEFAULT_PAGE).toBe(1);
  });

  it("should have cache TTLs for all timeframes", () => {
    expect(CACHE_TTL_BY_TIMEFRAME.weekly).toBe(300); // 5 minutes
    expect(CACHE_TTL_BY_TIMEFRAME.monthly).toBe(900); // 15 minutes
    expect(CACHE_TTL_BY_TIMEFRAME.all_time).toBe(3600); // 1 hour
  });
});

// ============================================================================
// parseQueryParams Tests
// ============================================================================

describe("parseQueryParams", () => {
  describe("timeframe parsing", () => {
    it("should default to weekly when no timeframe provided", () => {
      const result = parseQueryParams({});
      expect(result.timeframe).toBe("weekly");
    });

    it("should parse valid weekly timeframe", () => {
      const result = parseQueryParams({ timeframe: "weekly" });
      expect(result.timeframe).toBe("weekly");
    });

    it("should parse valid monthly timeframe", () => {
      const result = parseQueryParams({ timeframe: "monthly" });
      expect(result.timeframe).toBe("monthly");
    });

    it("should parse valid all_time timeframe", () => {
      const result = parseQueryParams({ timeframe: "all_time" });
      expect(result.timeframe).toBe("all_time");
    });

    it("should default to weekly for invalid timeframe", () => {
      const result = parseQueryParams({ timeframe: "invalid" });
      expect(result.timeframe).toBe("weekly");
    });

    it("should handle array timeframe by defaulting to weekly", () => {
      const result = parseQueryParams({ timeframe: ["weekly", "monthly"] });
      expect(result.timeframe).toBe("weekly");
    });
  });

  describe("metric parsing", () => {
    it("should default to xp when no metric provided", () => {
      const result = parseQueryParams({});
      expect(result.metric).toBe("xp");
    });

    it("should parse valid xp metric", () => {
      const result = parseQueryParams({ metric: "xp" });
      expect(result.metric).toBe("xp");
    });

    it("should parse valid books metric", () => {
      const result = parseQueryParams({ metric: "books" });
      expect(result.metric).toBe("books");
    });

    it("should parse valid streak metric", () => {
      const result = parseQueryParams({ metric: "streak" });
      expect(result.metric).toBe("streak");
    });

    it("should parse valid reading_time metric", () => {
      const result = parseQueryParams({ metric: "reading_time" });
      expect(result.metric).toBe("reading_time");
    });

    it("should default to xp for invalid metric", () => {
      const result = parseQueryParams({ metric: "invalid_metric" });
      expect(result.metric).toBe("xp");
    });
  });

  describe("friendsOnly parsing", () => {
    it("should default to false when not provided", () => {
      const result = parseQueryParams({});
      expect(result.friendsOnly).toBe(false);
    });

    it("should be true when friendsOnly=true", () => {
      const result = parseQueryParams({ friendsOnly: "true" });
      expect(result.friendsOnly).toBe(true);
    });

    it("should be false when friendsOnly=false", () => {
      const result = parseQueryParams({ friendsOnly: "false" });
      expect(result.friendsOnly).toBe(false);
    });

    it("should be false for any other string", () => {
      const result = parseQueryParams({ friendsOnly: "yes" });
      expect(result.friendsOnly).toBe(false);
    });
  });

  describe("page parsing", () => {
    it("should default to 1 when not provided", () => {
      const result = parseQueryParams({});
      expect(result.page).toBe(1);
    });

    it("should parse valid page number", () => {
      const result = parseQueryParams({ page: "5" });
      expect(result.page).toBe(5);
    });

    it("should default to 1 for invalid page", () => {
      const result = parseQueryParams({ page: "invalid" });
      expect(result.page).toBe(1);
    });

    it("should default to 1 for negative page", () => {
      const result = parseQueryParams({ page: "-1" });
      expect(result.page).toBe(1);
    });

    it("should default to 1 for zero page", () => {
      const result = parseQueryParams({ page: "0" });
      expect(result.page).toBe(1);
    });
  });

  describe("limit parsing", () => {
    it("should default to DEFAULT_LIMIT when not provided", () => {
      const result = parseQueryParams({});
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("should parse valid limit", () => {
      const result = parseQueryParams({ limit: "25" });
      expect(result.limit).toBe(25);
    });

    it("should cap limit at MAX_LIMIT", () => {
      const result = parseQueryParams({ limit: "200" });
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it("should default to DEFAULT_LIMIT for invalid limit", () => {
      const result = parseQueryParams({ limit: "invalid" });
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("should default to DEFAULT_LIMIT for negative limit", () => {
      const result = parseQueryParams({ limit: "-10" });
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("should default to DEFAULT_LIMIT for zero limit", () => {
      const result = parseQueryParams({ limit: "0" });
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });
  });

  describe("combined parameters", () => {
    it("should parse all parameters correctly", () => {
      const result = parseQueryParams({
        timeframe: "monthly",
        metric: "books",
        friendsOnly: "true",
        page: "3",
        limit: "25",
      });
      expect(result).toEqual({
        timeframe: "monthly",
        metric: "books",
        friendsOnly: true,
        page: 3,
        limit: 25,
      });
    });
  });
});

// ============================================================================
// getMetricColumn Tests
// ============================================================================

describe("getMetricColumn", () => {
  it("should return totalXP for xp metric", () => {
    expect(getMetricColumn("xp")).toBe("totalXP");
  });

  it("should return booksCompleted for books metric", () => {
    expect(getMetricColumn("books")).toBe("booksCompleted");
  });

  it("should return currentStreak for streak metric", () => {
    expect(getMetricColumn("streak")).toBe("currentStreak");
  });

  it("should return totalReadingTime for reading_time metric", () => {
    expect(getMetricColumn("reading_time")).toBe("totalReadingTime");
  });

  it("should default to totalXP for unknown metric", () => {
    // @ts-expect-error Testing invalid input
    expect(getMetricColumn("unknown")).toBe("totalXP");
  });
});

// ============================================================================
// getTimeframeStartDate Tests
// ============================================================================

describe("getTimeframeStartDate", () => {
  it("should return null for all_time", () => {
    const result = getTimeframeStartDate("all_time");
    expect(result).toBeNull();
  });

  it("should return a date 7 days ago for weekly", () => {
    const result = getTimeframeStartDate("weekly");
    expect(result).toBeInstanceOf(Date);

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Allow 1 second tolerance for test execution time
    if (result) {
      expect(Math.abs(result.getTime() - sevenDaysAgo.getTime())).toBeLessThan(
        1000
      );
    }
  });

  it("should return a date 30 days ago for monthly", () => {
    const result = getTimeframeStartDate("monthly");
    expect(result).toBeInstanceOf(Date);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Allow 1 second tolerance
    if (result) {
      expect(Math.abs(result.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(
        1000
      );
    }
  });

  it("should return date with time set to midnight", () => {
    const weeklyResult = getTimeframeStartDate("weekly");
    expect(weeklyResult).not.toBeNull();
    if (weeklyResult) {
      expect(weeklyResult.getHours()).toBe(0);
      expect(weeklyResult.getMinutes()).toBe(0);
      expect(weeklyResult.getSeconds()).toBe(0);
      expect(weeklyResult.getMilliseconds()).toBe(0);
    }

    const monthlyResult = getTimeframeStartDate("monthly");
    expect(monthlyResult).not.toBeNull();
    if (monthlyResult) {
      expect(monthlyResult.getHours()).toBe(0);
      expect(monthlyResult.getMinutes()).toBe(0);
      expect(monthlyResult.getSeconds()).toBe(0);
      expect(monthlyResult.getMilliseconds()).toBe(0);
    }
  });

  it("should return null for unknown timeframe", () => {
    // @ts-expect-error Testing invalid input
    const result = getTimeframeStartDate("unknown");
    expect(result).toBeNull();
  });
});

// ============================================================================
// buildLeaderboardCacheKey Tests
// ============================================================================

describe("buildLeaderboardCacheKey", () => {
  it("should build global cache key correctly", () => {
    const params: LeaderboardQueryParams = {
      timeframe: "weekly",
      metric: "xp",
      friendsOnly: false,
      page: 1,
      limit: 50,
    };
    const key = buildLeaderboardCacheKey(params);
    expect(key).toBe("leaderboard:xp:weekly:global:page:1:limit:50");
  });

  it("should build friends cache key with userId", () => {
    const params: LeaderboardQueryParams = {
      timeframe: "monthly",
      metric: "books",
      friendsOnly: true,
      page: 2,
      limit: 25,
    };
    const key = buildLeaderboardCacheKey(params, "user-123");
    expect(key).toBe(
      "leaderboard:books:monthly:friends:user-123:page:2:limit:25"
    );
  });

  it("should include page and limit in key", () => {
    const params: LeaderboardQueryParams = {
      timeframe: "all_time",
      metric: "streak",
      friendsOnly: false,
      page: 5,
      limit: 100,
    };
    const key = buildLeaderboardCacheKey(params);
    expect(key).toContain("page:5");
    expect(key).toContain("limit:100");
  });

  it("should differentiate between different metrics", () => {
    const baseParams: Omit<LeaderboardQueryParams, "metric"> = {
      timeframe: "weekly",
      friendsOnly: false,
      page: 1,
      limit: 50,
    };

    const xpKey = buildLeaderboardCacheKey({ ...baseParams, metric: "xp" });
    const booksKey = buildLeaderboardCacheKey({
      ...baseParams,
      metric: "books",
    });
    const streakKey = buildLeaderboardCacheKey({
      ...baseParams,
      metric: "streak",
    });
    const timeKey = buildLeaderboardCacheKey({
      ...baseParams,
      metric: "reading_time",
    });

    expect(xpKey).not.toBe(booksKey);
    expect(booksKey).not.toBe(streakKey);
    expect(streakKey).not.toBe(timeKey);
  });

  it("should differentiate between timeframes", () => {
    const baseParams: Omit<LeaderboardQueryParams, "timeframe"> = {
      metric: "xp",
      friendsOnly: false,
      page: 1,
      limit: 50,
    };

    const weeklyKey = buildLeaderboardCacheKey({
      ...baseParams,
      timeframe: "weekly",
    });
    const monthlyKey = buildLeaderboardCacheKey({
      ...baseParams,
      timeframe: "monthly",
    });
    const allTimeKey = buildLeaderboardCacheKey({
      ...baseParams,
      timeframe: "all_time",
    });

    expect(weeklyKey).not.toBe(monthlyKey);
    expect(monthlyKey).not.toBe(allTimeKey);
  });
});

// ============================================================================
// mapRowToEntry Tests
// ============================================================================

describe("mapRowToEntry", () => {
  const baseRow: LeaderboardRow = {
    userId: "user-123",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    value: 1000,
  };

  it("should map row to entry correctly", () => {
    const entry = mapRowToEntry(baseRow, 1, "other-user");

    expect(entry.rank).toBe(1);
    expect(entry.user.id).toBe("user-123");
    expect(entry.user.username).toBe("testuser");
    expect(entry.user.displayName).toBe("Test User");
    expect(entry.user.avatarUrl).toBe("https://example.com/avatar.png");
    expect(entry.value).toBe(1000);
    expect(entry.isCurrentUser).toBe(false);
  });

  it("should set isCurrentUser to true when matching", () => {
    const entry = mapRowToEntry(baseRow, 1, "user-123");
    expect(entry.isCurrentUser).toBe(true);
  });

  it("should set isCurrentUser to false when not matching", () => {
    const entry = mapRowToEntry(baseRow, 1, "different-user");
    expect(entry.isCurrentUser).toBe(false);
  });

  it("should use 'Anonymous' for null username", () => {
    const rowWithNullUsername: LeaderboardRow = {
      ...baseRow,
      username: null,
    };
    const entry = mapRowToEntry(rowWithNullUsername, 1, "other-user");
    expect(entry.user.username).toBe("Anonymous");
  });

  it("should preserve null displayName", () => {
    const rowWithNullDisplayName: LeaderboardRow = {
      ...baseRow,
      displayName: null,
    };
    const entry = mapRowToEntry(rowWithNullDisplayName, 1, "other-user");
    expect(entry.user.displayName).toBeNull();
  });

  it("should preserve null avatarUrl", () => {
    const rowWithNullAvatar: LeaderboardRow = {
      ...baseRow,
      avatarUrl: null,
    };
    const entry = mapRowToEntry(rowWithNullAvatar, 1, "other-user");
    expect(entry.user.avatarUrl).toBeNull();
  });

  it("should handle zero value", () => {
    const rowWithZeroValue: LeaderboardRow = {
      ...baseRow,
      value: 0,
    };
    const entry = mapRowToEntry(rowWithZeroValue, 1, "other-user");
    expect(entry.value).toBe(0);
  });

  it("should handle large rank numbers", () => {
    const entry = mapRowToEntry(baseRow, 999999, "other-user");
    expect(entry.rank).toBe(999999);
  });
});

// ============================================================================
// buildPagination Tests
// ============================================================================

describe("buildPagination", () => {
  it("should build pagination for first page", () => {
    const pagination = buildPagination(1, 50, 100);
    expect(pagination).toEqual({
      page: 1,
      limit: 50,
      total: 100,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("should build pagination for last page", () => {
    const pagination = buildPagination(2, 50, 100);
    expect(pagination).toEqual({
      page: 2,
      limit: 50,
      total: 100,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("should build pagination for middle page", () => {
    const pagination = buildPagination(2, 10, 50);
    expect(pagination).toEqual({
      page: 2,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("should handle single page", () => {
    const pagination = buildPagination(1, 50, 30);
    expect(pagination).toEqual({
      page: 1,
      limit: 50,
      total: 30,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("should handle empty results", () => {
    const pagination = buildPagination(1, 50, 0);
    expect(pagination).toEqual({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("should calculate totalPages correctly with partial pages", () => {
    const pagination = buildPagination(1, 10, 25);
    expect(pagination.totalPages).toBe(3); // 25/10 = 2.5 -> ceil = 3
  });

  it("should calculate totalPages correctly for exact division", () => {
    const pagination = buildPagination(1, 10, 100);
    expect(pagination.totalPages).toBe(10);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response structure", () => {
  it("should create valid LeaderboardEntry structure", () => {
    const entry: LeaderboardEntry = {
      rank: 1,
      user: {
        id: "user-123",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
      },
      value: 5000,
      isCurrentUser: true,
    };

    expect(entry.rank).toBeTypeOf("number");
    expect(entry.user.id).toBeTypeOf("string");
    expect(entry.user.username).toBeTypeOf("string");
    expect(entry.value).toBeTypeOf("number");
    expect(entry.isCurrentUser).toBeTypeOf("boolean");
  });

  it("should create valid FullLeaderboardResponse structure", () => {
    const response: FullLeaderboardResponse = {
      entries: [
        {
          rank: 1,
          user: {
            id: "user-1",
            username: "user1",
            displayName: "User One",
            avatarUrl: null,
          },
          value: 10000,
          isCurrentUser: false,
        },
        {
          rank: 2,
          user: {
            id: "user-2",
            username: "user2",
            displayName: "User Two",
            avatarUrl: null,
          },
          value: 9000,
          isCurrentUser: true,
        },
      ],
      currentUserRank: 2,
      timeframe: "weekly",
      metric: "xp",
      pagination: {
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    expect(response.entries).toHaveLength(2);
    expect(response.currentUserRank).toBe(2);
    expect(response.timeframe).toBe("weekly");
    expect(response.metric).toBe("xp");
    expect(response.pagination).toBeDefined();
  });

  it("should allow null currentUserRank", () => {
    const response: FullLeaderboardResponse = {
      entries: [],
      currentUserRank: null,
      timeframe: "weekly",
      metric: "xp",
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    expect(response.currentUserRank).toBeNull();
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge cases", () => {
  describe("parseQueryParams edge cases", () => {
    it("should handle empty query object", () => {
      const result = parseQueryParams({});
      expect(result).toEqual({
        timeframe: "weekly",
        metric: "xp",
        friendsOnly: false,
        page: 1,
        limit: 50,
      });
    });

    it("should handle undefined values", () => {
      const result = parseQueryParams({
        timeframe: undefined,
        metric: undefined,
        page: undefined,
        limit: undefined,
      });
      expect(result.timeframe).toBe("weekly");
      expect(result.metric).toBe("xp");
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it("should handle numeric strings with spaces", () => {
      const result = parseQueryParams({
        page: " 5 ",
        limit: " 25 ",
      });
      // parseInt handles leading/trailing spaces
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });

    it("should handle float strings by truncating", () => {
      const result = parseQueryParams({
        page: "2.7",
        limit: "10.9",
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe("mapRowToEntry edge cases", () => {
    it("should handle empty string username", () => {
      const row: LeaderboardRow = {
        userId: "user-123",
        username: "",
        displayName: null,
        avatarUrl: null,
        value: 100,
      };
      const entry = mapRowToEntry(row, 1, "other-user");
      // Empty string is falsy, so it becomes "Anonymous"
      expect(entry.user.username).toBe("Anonymous");
    });

    it("should handle very large values", () => {
      const row: LeaderboardRow = {
        userId: "user-123",
        username: "user",
        displayName: null,
        avatarUrl: null,
        value: Number.MAX_SAFE_INTEGER,
      };
      const entry = mapRowToEntry(row, 1, "other-user");
      expect(entry.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle negative values", () => {
      const row: LeaderboardRow = {
        userId: "user-123",
        username: "user",
        displayName: null,
        avatarUrl: null,
        value: -100,
      };
      const entry = mapRowToEntry(row, 1, "other-user");
      expect(entry.value).toBe(-100);
    });
  });

  describe("buildPagination edge cases", () => {
    it("should handle large total with small limit", () => {
      const pagination = buildPagination(1, 10, 1000000);
      expect(pagination.totalPages).toBe(100000);
      expect(pagination.hasNextPage).toBe(true);
    });

    it("should handle limit of 1", () => {
      const pagination = buildPagination(5, 1, 10);
      expect(pagination.totalPages).toBe(10);
      expect(pagination.hasNextPage).toBe(true);
      expect(pagination.hasPreviousPage).toBe(true);
    });
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration scenarios", () => {
  it("should handle full workflow for global XP leaderboard", () => {
    // Parse params
    const params = parseQueryParams({
      timeframe: "weekly",
      metric: "xp",
      friendsOnly: "false",
      page: "1",
      limit: "10",
    });

    expect(params.timeframe).toBe("weekly");
    expect(params.metric).toBe("xp");

    // Get metric column
    const column = getMetricColumn(params.metric);
    expect(column).toBe("totalXP");

    // Build cache key
    const cacheKey = buildLeaderboardCacheKey(params);
    expect(cacheKey).toContain("leaderboard");
    expect(cacheKey).toContain("xp");
    expect(cacheKey).toContain("weekly");
    expect(cacheKey).toContain("global");

    // Simulate mapping rows
    const rows: LeaderboardRow[] = [
      {
        userId: "u1",
        username: "alice",
        displayName: "Alice",
        avatarUrl: null,
        value: 5000,
      },
      {
        userId: "u2",
        username: "bob",
        displayName: "Bob",
        avatarUrl: null,
        value: 4500,
      },
      {
        userId: "u3",
        username: "charlie",
        displayName: "Charlie",
        avatarUrl: null,
        value: 4000,
      },
    ];

    const currentUserId = "u2";
    const entries = rows.map((row, idx) =>
      mapRowToEntry(row, idx + 1, currentUserId)
    );

    expect(entries[0]?.rank).toBe(1);
    expect(entries[0]?.isCurrentUser).toBe(false);
    expect(entries[1]?.rank).toBe(2);
    expect(entries[1]?.isCurrentUser).toBe(true);
    expect(entries[2]?.rank).toBe(3);
    expect(entries[2]?.isCurrentUser).toBe(false);

    // Build pagination
    const pagination = buildPagination(1, 10, 3);
    expect(pagination.totalPages).toBe(1);
    expect(pagination.hasNextPage).toBe(false);
  });

  it("should handle full workflow for friends books leaderboard", () => {
    const params = parseQueryParams({
      timeframe: "monthly",
      metric: "books",
      friendsOnly: "true",
      page: "2",
      limit: "5",
    });

    expect(params.friendsOnly).toBe(true);
    expect(params.metric).toBe("books");

    const column = getMetricColumn(params.metric);
    expect(column).toBe("booksCompleted");

    const cacheKey = buildLeaderboardCacheKey(params, "current-user-id");
    expect(cacheKey).toContain("friends:current-user-id");

    const pagination = buildPagination(2, 5, 15);
    expect(pagination.totalPages).toBe(3);
    expect(pagination.hasNextPage).toBe(true);
    expect(pagination.hasPreviousPage).toBe(true);
  });

  it("should handle all_time streak leaderboard", () => {
    const params = parseQueryParams({
      timeframe: "all_time",
      metric: "streak",
    });

    expect(params.timeframe).toBe("all_time");
    expect(params.metric).toBe("streak");

    const startDate = getTimeframeStartDate(params.timeframe);
    expect(startDate).toBeNull();

    const column = getMetricColumn(params.metric);
    expect(column).toBe("currentStreak");
  });

  it("should handle reading_time metric", () => {
    const params = parseQueryParams({
      metric: "reading_time",
    });

    expect(params.metric).toBe("reading_time");

    const column = getMetricColumn(params.metric);
    expect(column).toBe("totalReadingTime");
  });
});
