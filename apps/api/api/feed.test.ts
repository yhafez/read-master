/**
 * Tests for GET /api/feed - Activity feed endpoint
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  FEED_CACHE_TTL,
  MAX_HIGHLIGHT_PREVIEW_LENGTH,
  // Types
  type FeedQueryParams,
  type ActivityType,
  type FeedUserInfo,
  type FeedBookInfo,
  type FeedAchievementInfo,
  type FeedHighlightInfo,
  type FeedActivityItem,
  type FeedPaginationInfo,
  type FeedResponse,
  // Functions
  parsePage,
  parseLimit,
  parseFeedQueryParams,
  buildFeedCacheKey,
  formatDate,
  mapTierToRarity,
  truncateText,
  mapToFeedUserInfo,
  mapToFeedBookInfo,
  mapToFeedAchievementInfo,
  mapToFeedHighlightInfo,
  createBookCompletedActivity,
  createAchievementActivity,
  createHighlightActivity,
  calculatePagination,
} from "./feed.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Feed Constants", () => {
  it("should export DEFAULT_PAGE as 1", () => {
    expect(DEFAULT_PAGE).toBe(1);
  });

  it("should export DEFAULT_LIMIT as 20", () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it("should export MAX_LIMIT as 50", () => {
    expect(MAX_LIMIT).toBe(50);
  });

  it("should export MIN_LIMIT as 1", () => {
    expect(MIN_LIMIT).toBe(1);
  });

  it("should export FEED_CACHE_TTL as a positive number", () => {
    expect(FEED_CACHE_TTL).toBeGreaterThan(0);
  });

  it("should export MAX_HIGHLIGHT_PREVIEW_LENGTH as 200", () => {
    expect(MAX_HIGHLIGHT_PREVIEW_LENGTH).toBe(200);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Feed Type Exports", () => {
  it("should export FeedQueryParams type with correct structure", () => {
    const params: FeedQueryParams = {
      page: 1,
      limit: 20,
    };
    expect(params).toHaveProperty("page");
    expect(params).toHaveProperty("limit");
  });

  it("should export ActivityType type", () => {
    const types: ActivityType[] = [
      "book_completed",
      "achievement_earned",
      "highlight_shared",
    ];
    expect(types).toHaveLength(3);
  });

  it("should export FeedUserInfo type with correct structure", () => {
    const userInfo: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(userInfo).toHaveProperty("id");
    expect(userInfo).toHaveProperty("username");
    expect(userInfo).toHaveProperty("displayName");
    expect(userInfo).toHaveProperty("avatarUrl");
  });

  it("should export FeedBookInfo type with correct structure", () => {
    const bookInfo: FeedBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImageUrl: "https://example.com/cover.jpg",
    };
    expect(bookInfo).toHaveProperty("id");
    expect(bookInfo).toHaveProperty("title");
    expect(bookInfo).toHaveProperty("author");
    expect(bookInfo).toHaveProperty("coverImageUrl");
  });

  it("should export FeedAchievementInfo type with correct structure", () => {
    const achievementInfo: FeedAchievementInfo = {
      id: "achievement-1",
      name: "First Book",
      description: "Complete your first book",
      icon: "book-icon",
      rarity: "bronze",
    };
    expect(achievementInfo).toHaveProperty("id");
    expect(achievementInfo).toHaveProperty("name");
    expect(achievementInfo).toHaveProperty("description");
    expect(achievementInfo).toHaveProperty("icon");
    expect(achievementInfo).toHaveProperty("rarity");
  });

  it("should export FeedHighlightInfo type with correct structure", () => {
    const highlightInfo: FeedHighlightInfo = {
      id: "highlight-1",
      selectedText: "This is a highlight",
      note: "My note",
      color: "#FFFF00",
    };
    expect(highlightInfo).toHaveProperty("id");
    expect(highlightInfo).toHaveProperty("selectedText");
    expect(highlightInfo).toHaveProperty("note");
    expect(highlightInfo).toHaveProperty("color");
  });

  it("should export FeedActivityItem type with book_completed structure", () => {
    const item: FeedActivityItem = {
      id: "activity-1",
      type: "book_completed",
      user: {
        id: "user-1",
        username: "johndoe",
        displayName: "John",
        avatarUrl: null,
      },
      timestamp: new Date().toISOString(),
      book: {
        id: "book-1",
        title: "Test Book",
        author: "Author",
        coverImageUrl: null,
      },
    };
    expect(item.type).toBe("book_completed");
    expect(item.book).toBeDefined();
  });

  it("should export FeedActivityItem type with achievement_earned structure", () => {
    const item: FeedActivityItem = {
      id: "activity-2",
      type: "achievement_earned",
      user: {
        id: "user-1",
        username: "johndoe",
        displayName: "John",
        avatarUrl: null,
      },
      timestamp: new Date().toISOString(),
      achievement: {
        id: "achievement-1",
        name: "First Book",
        description: "Complete your first book",
        icon: null,
        rarity: "bronze",
      },
    };
    expect(item.type).toBe("achievement_earned");
    expect(item.achievement).toBeDefined();
  });

  it("should export FeedActivityItem type with highlight_shared structure", () => {
    const item: FeedActivityItem = {
      id: "activity-3",
      type: "highlight_shared",
      user: {
        id: "user-1",
        username: "johndoe",
        displayName: "John",
        avatarUrl: null,
      },
      timestamp: new Date().toISOString(),
      book: {
        id: "book-1",
        title: "Test Book",
        author: "Author",
        coverImageUrl: null,
      },
      highlight: {
        id: "highlight-1",
        selectedText: "Some text",
        note: null,
        color: "#FFFF00",
      },
    };
    expect(item.type).toBe("highlight_shared");
    expect(item.highlight).toBeDefined();
    expect(item.book).toBeDefined();
  });

  it("should export FeedPaginationInfo type with correct structure", () => {
    const pagination: FeedPaginationInfo = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    };
    expect(pagination).toHaveProperty("page");
    expect(pagination).toHaveProperty("limit");
    expect(pagination).toHaveProperty("total");
    expect(pagination).toHaveProperty("totalPages");
    expect(pagination).toHaveProperty("hasMore");
  });

  it("should export FeedResponse type with correct structure", () => {
    const response: FeedResponse = {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("pagination");
  });
});

// ============================================================================
// parsePage Tests
// ============================================================================

describe("parsePage", () => {
  it("should return DEFAULT_PAGE for undefined", () => {
    expect(parsePage(undefined)).toBe(DEFAULT_PAGE);
  });

  it("should return DEFAULT_PAGE for null", () => {
    expect(parsePage(null as unknown as undefined)).toBe(DEFAULT_PAGE);
  });

  it("should return DEFAULT_PAGE for empty string", () => {
    expect(parsePage("")).toBe(DEFAULT_PAGE);
  });

  it("should parse valid page number", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("5")).toBe(5);
    expect(parsePage("100")).toBe(100);
  });

  it("should return DEFAULT_PAGE for non-numeric string", () => {
    expect(parsePage("abc")).toBe(DEFAULT_PAGE);
    expect(parsePage("one")).toBe(DEFAULT_PAGE);
  });

  it("should return DEFAULT_PAGE for zero", () => {
    expect(parsePage("0")).toBe(DEFAULT_PAGE);
  });

  it("should return DEFAULT_PAGE for negative numbers", () => {
    expect(parsePage("-1")).toBe(DEFAULT_PAGE);
    expect(parsePage("-10")).toBe(DEFAULT_PAGE);
  });

  it("should handle array input and use first element", () => {
    expect(parsePage(["3", "5"])).toBe(3);
  });

  it("should return DEFAULT_PAGE for empty array", () => {
    expect(parsePage([])).toBe(DEFAULT_PAGE);
  });

  it("should parse decimal strings by truncating", () => {
    expect(parsePage("2.5")).toBe(2);
    expect(parsePage("3.9")).toBe(3);
  });
});

// ============================================================================
// parseLimit Tests
// ============================================================================

describe("parseLimit", () => {
  it("should return DEFAULT_LIMIT for undefined", () => {
    expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
  });

  it("should return DEFAULT_LIMIT for null", () => {
    expect(parseLimit(null as unknown as undefined)).toBe(DEFAULT_LIMIT);
  });

  it("should return DEFAULT_LIMIT for empty string", () => {
    expect(parseLimit("")).toBe(DEFAULT_LIMIT);
  });

  it("should parse valid limit number", () => {
    expect(parseLimit("10")).toBe(10);
    expect(parseLimit("25")).toBe(25);
    expect(parseLimit("50")).toBe(50);
  });

  it("should return DEFAULT_LIMIT for non-numeric string", () => {
    expect(parseLimit("abc")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("twenty")).toBe(DEFAULT_LIMIT);
  });

  it("should clamp to MIN_LIMIT for values below minimum", () => {
    expect(parseLimit("0")).toBe(MIN_LIMIT);
    expect(parseLimit("-5")).toBe(MIN_LIMIT);
  });

  it("should clamp to MAX_LIMIT for values above maximum", () => {
    expect(parseLimit("100")).toBe(MAX_LIMIT);
    expect(parseLimit("1000")).toBe(MAX_LIMIT);
  });

  it("should handle array input and use first element", () => {
    expect(parseLimit(["15", "30"])).toBe(15);
  });

  it("should return DEFAULT_LIMIT for empty array", () => {
    expect(parseLimit([])).toBe(DEFAULT_LIMIT);
  });

  it("should parse decimal strings by truncating", () => {
    expect(parseLimit("10.5")).toBe(10);
    expect(parseLimit("25.9")).toBe(25);
  });
});

// ============================================================================
// parseFeedQueryParams Tests
// ============================================================================

describe("parseFeedQueryParams", () => {
  it("should return defaults for empty query", () => {
    const result = parseFeedQueryParams({});
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("should parse page correctly", () => {
    const result = parseFeedQueryParams({ page: "3" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("should parse limit correctly", () => {
    const result = parseFeedQueryParams({ limit: "25" });
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(25);
  });

  it("should parse both page and limit", () => {
    const result = parseFeedQueryParams({ page: "2", limit: "30" });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
  });

  it("should handle invalid values gracefully", () => {
    const result = parseFeedQueryParams({ page: "invalid", limit: "abc" });
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });
});

// ============================================================================
// buildFeedCacheKey Tests
// ============================================================================

describe("buildFeedCacheKey", () => {
  it("should build cache key with user ID and params", () => {
    const key = buildFeedCacheKey("user-123", { page: 1, limit: 20 });
    expect(key).toContain("user-123");
    expect(key).toContain("page1");
    expect(key).toContain("limit20");
  });

  it("should build different keys for different pages", () => {
    const key1 = buildFeedCacheKey("user-123", { page: 1, limit: 20 });
    const key2 = buildFeedCacheKey("user-123", { page: 2, limit: 20 });
    expect(key1).not.toBe(key2);
  });

  it("should build different keys for different limits", () => {
    const key1 = buildFeedCacheKey("user-123", { page: 1, limit: 20 });
    const key2 = buildFeedCacheKey("user-123", { page: 1, limit: 30 });
    expect(key1).not.toBe(key2);
  });

  it("should build different keys for different users", () => {
    const key1 = buildFeedCacheKey("user-123", { page: 1, limit: 20 });
    const key2 = buildFeedCacheKey("user-456", { page: 1, limit: 20 });
    expect(key1).not.toBe(key2);
  });

  it("should include feed identifier in key", () => {
    const key = buildFeedCacheKey("user-123", { page: 1, limit: 20 });
    expect(key).toContain("feed");
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = formatDate(date);
    expect(result).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle dates at midnight", () => {
    const date = new Date("2024-06-01T00:00:00.000Z");
    const result = formatDate(date);
    expect(result).toBe("2024-06-01T00:00:00.000Z");
  });

  it("should handle dates at end of day", () => {
    const date = new Date("2024-12-31T23:59:59.999Z");
    const result = formatDate(date);
    expect(result).toBe("2024-12-31T23:59:59.999Z");
  });
});

// ============================================================================
// mapTierToRarity Tests
// ============================================================================

describe("mapTierToRarity", () => {
  it("should map BRONZE to bronze", () => {
    expect(mapTierToRarity("BRONZE")).toBe("bronze");
  });

  it("should map SILVER to silver", () => {
    expect(mapTierToRarity("SILVER")).toBe("silver");
  });

  it("should map GOLD to gold", () => {
    expect(mapTierToRarity("GOLD")).toBe("gold");
  });

  it("should map PLATINUM to platinum", () => {
    expect(mapTierToRarity("PLATINUM")).toBe("platinum");
  });

  it("should convert unknown tiers to lowercase", () => {
    expect(mapTierToRarity("DIAMOND")).toBe("diamond");
    expect(mapTierToRarity("LEGENDARY")).toBe("legendary");
  });

  it("should handle already lowercase input", () => {
    expect(mapTierToRarity("bronze")).toBe("bronze");
  });
});

// ============================================================================
// truncateText Tests
// ============================================================================

describe("truncateText", () => {
  it("should not truncate text shorter than max length", () => {
    const text = "Short text";
    expect(truncateText(text, 200)).toBe("Short text");
  });

  it("should not truncate text equal to max length", () => {
    const text = "A".repeat(200);
    expect(truncateText(text, 200)).toBe(text);
  });

  it("should truncate text longer than max length", () => {
    const text = "A".repeat(250);
    const result = truncateText(text, 200);
    expect(result.length).toBeLessThanOrEqual(203); // 200 + "..."
    expect(result).toContain("...");
  });

  it("should truncate at word boundary when possible", () => {
    const text =
      "This is a very long sentence that needs to be truncated at a reasonable point";
    const result = truncateText(text, 30);
    expect(result).toContain("...");
    expect(result.length).toBeLessThanOrEqual(33); // max + "..."
  });

  it("should handle empty string", () => {
    expect(truncateText("", 200)).toBe("");
  });

  it("should handle single word longer than max", () => {
    const text = "Supercalifragilisticexpialidocious";
    const result = truncateText(text, 10);
    expect(result).toBe("Supercalif...");
  });
});

// ============================================================================
// mapToFeedUserInfo Tests
// ============================================================================

describe("mapToFeedUserInfo", () => {
  it("should map user data correctly", () => {
    const user = {
      id: "user-123",
      username: "johndoe",
      displayName: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const result = mapToFeedUserInfo(user);
    expect(result.id).toBe("user-123");
    expect(result.username).toBe("johndoe");
    expect(result.displayName).toBe("John Doe");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("should default null username to 'anonymous'", () => {
    const user = {
      id: "user-123",
      username: null,
      displayName: "John",
      avatarUrl: null,
    };
    const result = mapToFeedUserInfo(user);
    expect(result.username).toBe("anonymous");
  });

  it("should preserve null values for optional fields", () => {
    const user = {
      id: "user-123",
      username: "johndoe",
      displayName: null,
      avatarUrl: null,
    };
    const result = mapToFeedUserInfo(user);
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToFeedBookInfo Tests
// ============================================================================

describe("mapToFeedBookInfo", () => {
  it("should map book data correctly", () => {
    // Input uses coverImage (database field name)
    const book = {
      id: "book-123",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    };
    const result = mapToFeedBookInfo(book);
    expect(result.id).toBe("book-123");
    expect(result.title).toBe("Test Book");
    expect(result.author).toBe("Test Author");
    // Output uses coverImageUrl (public API field name)
    expect(result.coverImageUrl).toBe("https://example.com/cover.jpg");
  });

  it("should preserve null values for optional fields", () => {
    const book = {
      id: "book-123",
      title: "Test Book",
      author: null,
      coverImage: null,
    };
    const result = mapToFeedBookInfo(book);
    expect(result.author).toBeNull();
    expect(result.coverImageUrl).toBeNull();
  });
});

// ============================================================================
// mapToFeedAchievementInfo Tests
// ============================================================================

describe("mapToFeedAchievementInfo", () => {
  it("should map achievement data correctly", () => {
    const achievement = {
      id: "achievement-123",
      name: "First Book",
      description: "Complete your first book",
      badgeIcon: "book-icon",
      tier: "BRONZE",
    };
    const result = mapToFeedAchievementInfo(achievement);
    expect(result.id).toBe("achievement-123");
    expect(result.name).toBe("First Book");
    expect(result.description).toBe("Complete your first book");
    expect(result.icon).toBe("book-icon");
    expect(result.rarity).toBe("bronze");
  });

  it("should convert tier to lowercase rarity", () => {
    const achievement = {
      id: "achievement-123",
      name: "Book Master",
      description: "Complete 100 books",
      badgeIcon: null,
      tier: "PLATINUM",
    };
    const result = mapToFeedAchievementInfo(achievement);
    expect(result.rarity).toBe("platinum");
  });

  it("should preserve null icon", () => {
    const achievement = {
      id: "achievement-123",
      name: "First Book",
      description: "Complete your first book",
      badgeIcon: null,
      tier: "BRONZE",
    };
    const result = mapToFeedAchievementInfo(achievement);
    expect(result.icon).toBeNull();
  });
});

// ============================================================================
// mapToFeedHighlightInfo Tests
// ============================================================================

describe("mapToFeedHighlightInfo", () => {
  it("should map highlight data correctly", () => {
    const annotation = {
      id: "highlight-123",
      selectedText: "This is some highlighted text",
      note: "My note about this",
      color: "#FFFF00",
    };
    const result = mapToFeedHighlightInfo(annotation);
    expect(result.id).toBe("highlight-123");
    expect(result.selectedText).toBe("This is some highlighted text");
    expect(result.note).toBe("My note about this");
    expect(result.color).toBe("#FFFF00");
  });

  it("should truncate long selected text", () => {
    const longText = "A".repeat(300);
    const annotation = {
      id: "highlight-123",
      selectedText: longText,
      note: null,
      color: null,
    };
    const result = mapToFeedHighlightInfo(annotation);
    expect(result.selectedText.length).toBeLessThanOrEqual(203);
    expect(result.selectedText).toContain("...");
  });

  it("should handle null selected text", () => {
    const annotation = {
      id: "highlight-123",
      selectedText: null,
      note: "Just a note",
      color: "#00FF00",
    };
    const result = mapToFeedHighlightInfo(annotation);
    expect(result.selectedText).toBe("");
  });

  it("should preserve null values for optional fields", () => {
    const annotation = {
      id: "highlight-123",
      selectedText: "Some text",
      note: null,
      color: null,
    };
    const result = mapToFeedHighlightInfo(annotation);
    expect(result.note).toBeNull();
    expect(result.color).toBeNull();
  });
});

// ============================================================================
// createBookCompletedActivity Tests
// ============================================================================

describe("createBookCompletedActivity", () => {
  it("should create book completed activity item", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: "John",
      avatarUrl: null,
    };
    const book: FeedBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Author",
      coverImageUrl: null,
    };
    const timestamp = new Date("2024-01-15T10:00:00.000Z");

    const result = createBookCompletedActivity(
      "activity-1",
      user,
      timestamp,
      book
    );

    expect(result.id).toBe("activity-1");
    expect(result.type).toBe("book_completed");
    expect(result.user).toEqual(user);
    expect(result.timestamp).toBe("2024-01-15T10:00:00.000Z");
    expect(result.book).toEqual(book);
  });

  it("should not include achievement or highlight fields", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: null,
      avatarUrl: null,
    };
    const book: FeedBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: null,
      coverImageUrl: null,
    };
    const result = createBookCompletedActivity(
      "activity-1",
      user,
      new Date(),
      book
    );
    expect(result.achievement).toBeUndefined();
    expect(result.highlight).toBeUndefined();
  });
});

// ============================================================================
// createAchievementActivity Tests
// ============================================================================

describe("createAchievementActivity", () => {
  it("should create achievement activity item", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: "John",
      avatarUrl: null,
    };
    const achievement: FeedAchievementInfo = {
      id: "achievement-1",
      name: "First Book",
      description: "Complete your first book",
      icon: null,
      rarity: "bronze",
    };
    const timestamp = new Date("2024-01-15T10:00:00.000Z");

    const result = createAchievementActivity(
      "activity-1",
      user,
      timestamp,
      achievement
    );

    expect(result.id).toBe("activity-1");
    expect(result.type).toBe("achievement_earned");
    expect(result.user).toEqual(user);
    expect(result.timestamp).toBe("2024-01-15T10:00:00.000Z");
    expect(result.achievement).toEqual(achievement);
  });

  it("should not include book or highlight fields", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: null,
      avatarUrl: null,
    };
    const achievement: FeedAchievementInfo = {
      id: "achievement-1",
      name: "First Book",
      description: "Complete your first book",
      icon: null,
      rarity: "bronze",
    };
    const result = createAchievementActivity(
      "activity-1",
      user,
      new Date(),
      achievement
    );
    expect(result.book).toBeUndefined();
    expect(result.highlight).toBeUndefined();
  });
});

// ============================================================================
// createHighlightActivity Tests
// ============================================================================

describe("createHighlightActivity", () => {
  it("should create highlight activity item", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: "John",
      avatarUrl: null,
    };
    const book: FeedBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Author",
      coverImageUrl: null,
    };
    const highlight: FeedHighlightInfo = {
      id: "highlight-1",
      selectedText: "Some important text",
      note: "My note",
      color: "#FFFF00",
    };
    const timestamp = new Date("2024-01-15T10:00:00.000Z");

    const result = createHighlightActivity(
      "activity-1",
      user,
      timestamp,
      book,
      highlight
    );

    expect(result.id).toBe("activity-1");
    expect(result.type).toBe("highlight_shared");
    expect(result.user).toEqual(user);
    expect(result.timestamp).toBe("2024-01-15T10:00:00.000Z");
    expect(result.book).toEqual(book);
    expect(result.highlight).toEqual(highlight);
  });

  it("should not include achievement field", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "johndoe",
      displayName: null,
      avatarUrl: null,
    };
    const book: FeedBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: null,
      coverImageUrl: null,
    };
    const highlight: FeedHighlightInfo = {
      id: "highlight-1",
      selectedText: "Text",
      note: null,
      color: null,
    };
    const result = createHighlightActivity(
      "activity-1",
      user,
      new Date(),
      book,
      highlight
    );
    expect(result.achievement).toBeUndefined();
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate pagination for first page", () => {
    const result = calculatePagination(100, 1, 20);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it("should calculate pagination for middle page", () => {
    const result = calculatePagination(100, 3, 20);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(100, 5, 20);
    expect(result.page).toBe(5);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  it("should handle empty results", () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.page).toBe(1);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(45, 1, 20);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it("should handle single item", () => {
    const result = calculatePagination(1, 1, 20);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it("should handle page beyond total pages", () => {
    const result = calculatePagination(20, 5, 20);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Feed Edge Cases", () => {
  it("should handle unicode in user display name", () => {
    const user = {
      id: "user-123",
      username: "用户",
      displayName: "日本語ユーザー",
      avatarUrl: null,
    };
    const result = mapToFeedUserInfo(user);
    expect(result.username).toBe("用户");
    expect(result.displayName).toBe("日本語ユーザー");
  });

  it("should handle emoji in text", () => {
    const annotation = {
      id: "highlight-123",
      selectedText: "This is great! 👍",
      note: "Love this passage 💖",
      color: "#FF0000",
    };
    const result = mapToFeedHighlightInfo(annotation);
    expect(result.selectedText).toBe("This is great! 👍");
    expect(result.note).toBe("Love this passage 💖");
  });

  it("should handle very long user IDs", () => {
    const userId = "a".repeat(100);
    const key = buildFeedCacheKey(userId, { page: 1, limit: 20 });
    expect(key).toContain(userId);
  });

  it("should handle special characters in username", () => {
    const user = {
      id: "user-123",
      username: "user_name-123",
      displayName: "User Name!",
      avatarUrl: null,
    };
    const result = mapToFeedUserInfo(user);
    expect(result.username).toBe("user_name-123");
  });

  it("should handle whitespace in selected text", () => {
    const annotation = {
      id: "highlight-123",
      selectedText: "   Text with   spaces   ",
      note: null,
      color: null,
    };
    const result = mapToFeedHighlightInfo(annotation);
    expect(result.selectedText).toBe("   Text with   spaces   ");
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Feed Response Structure", () => {
  it("should have correct structure for empty feed", () => {
    const response: FeedResponse = {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };

    expect(Array.isArray(response.items)).toBe(true);
    expect(response.items).toHaveLength(0);
    expect(response.pagination).toBeDefined();
    expect(response.pagination.hasMore).toBe(false);
  });

  it("should have correct structure for populated feed", () => {
    const items: FeedActivityItem[] = [
      {
        id: "activity-1",
        type: "book_completed",
        user: {
          id: "u1",
          username: "user1",
          displayName: null,
          avatarUrl: null,
        },
        timestamp: new Date().toISOString(),
        book: { id: "b1", title: "Book 1", author: null, coverImageUrl: null },
      },
      {
        id: "activity-2",
        type: "achievement_earned",
        user: {
          id: "u2",
          username: "user2",
          displayName: null,
          avatarUrl: null,
        },
        timestamp: new Date().toISOString(),
        achievement: {
          id: "a1",
          name: "First",
          description: "Desc",
          icon: null,
          rarity: "bronze",
        },
      },
    ];

    const response: FeedResponse = {
      items,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasMore: false,
      },
    };

    expect(response.items).toHaveLength(2);
    expect(response.items[0]?.type).toBe("book_completed");
    expect(response.items[1]?.type).toBe("achievement_earned");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Feed Integration Scenarios", () => {
  it("should handle complete workflow of creating feed items", () => {
    // Parse query params
    const params = parseFeedQueryParams({ page: "1", limit: "10" });
    expect(params.page).toBe(1);
    expect(params.limit).toBe(10);

    // Build cache key
    const cacheKey = buildFeedCacheKey("user-123", params);
    expect(cacheKey).toContain("user-123");

    // Create activity items
    const user: FeedUserInfo = mapToFeedUserInfo({
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: null,
    });

    const book: FeedBookInfo = mapToFeedBookInfo({
      id: "book-1",
      title: "Test Book",
      author: "Author",
      coverImage: null,
    });

    const item = createBookCompletedActivity(
      "activity-1",
      user,
      new Date("2024-01-15T10:00:00.000Z"),
      book
    );

    // Calculate pagination
    const pagination = calculatePagination(1, params.page, params.limit);

    // Build response
    const response: FeedResponse = {
      items: [item],
      pagination,
    };

    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.type).toBe("book_completed");
    expect(response.pagination.total).toBe(1);
  });

  it("should handle mixed activity types in feed", () => {
    const user: FeedUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: null,
      avatarUrl: null,
    };

    const book: FeedBookInfo = {
      id: "book-1",
      title: "Book",
      author: null,
      coverImageUrl: null,
    };

    const achievement: FeedAchievementInfo = {
      id: "achievement-1",
      name: "First",
      description: "Desc",
      icon: null,
      rarity: "bronze",
    };

    const highlight: FeedHighlightInfo = {
      id: "highlight-1",
      selectedText: "Text",
      note: null,
      color: null,
    };

    const items: FeedActivityItem[] = [
      createBookCompletedActivity("a1", user, new Date(), book),
      createAchievementActivity("a2", user, new Date(), achievement),
      createHighlightActivity("a3", user, new Date(), book, highlight),
    ];

    expect(items).toHaveLength(3);
    expect(items[0]?.type).toBe("book_completed");
    expect(items[1]?.type).toBe("achievement_earned");
    expect(items[2]?.type).toBe("highlight_shared");
  });

  it("should support multiple pages", () => {
    const page1 = calculatePagination(100, 1, 20);
    const page2 = calculatePagination(100, 2, 20);
    const page5 = calculatePagination(100, 5, 20);

    expect(page1.hasMore).toBe(true);
    expect(page2.hasMore).toBe(true);
    expect(page5.hasMore).toBe(false);
  });

  it("should have different cache keys for different pages", () => {
    const key1 = buildFeedCacheKey("user-123", { page: 1, limit: 20 });
    const key2 = buildFeedCacheKey("user-123", { page: 2, limit: 20 });
    const key3 = buildFeedCacheKey("user-456", { page: 1, limit: 20 });

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });
});
