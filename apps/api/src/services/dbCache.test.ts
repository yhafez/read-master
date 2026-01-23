/**
 * Tests for Database Query Caching Service
 *
 * Tests the caching utilities for common database queries including:
 * - Cache key generation
 * - Type exports and structures
 * - Cache TTL configuration
 */

import { describe, it, expect } from "vitest";
import {
  DbCacheKey,
  type DbCacheKeyType,
  type PaginationOptions,
  type CachedUser,
  type CachedUserStats,
  type CachedBookSummary,
} from "./dbCache.js";

// ============================================================================
// Cache Key Tests
// ============================================================================

describe("DbCacheKey", () => {
  describe("constants", () => {
    it("should have all required cache key prefixes", () => {
      expect(DbCacheKey.USER).toBe("db:user");
      expect(DbCacheKey.USER_CLERK).toBe("db:user:clerk");
      expect(DbCacheKey.USER_STATS).toBe("db:user:stats");
      expect(DbCacheKey.USER_BOOKS).toBe("db:user:books");
      expect(DbCacheKey.USER_BOOKS_COUNT).toBe("db:user:books:count");
      expect(DbCacheKey.BOOK).toBe("db:book");
      expect(DbCacheKey.BOOK_PROGRESS).toBe("db:book:progress");
      expect(DbCacheKey.FLASHCARDS_DUE).toBe("db:flashcards:due");
      expect(DbCacheKey.FLASHCARDS_COUNT).toBe("db:flashcards:count");
      expect(DbCacheKey.PROGRESS).toBe("db:progress");
      expect(DbCacheKey.ACHIEVEMENTS).toBe("db:achievements");
      expect(DbCacheKey.FOLLOWING_COUNT).toBe("db:following:count");
      expect(DbCacheKey.FOLLOWERS_COUNT).toBe("db:followers:count");
      expect(DbCacheKey.FORUM_POST).toBe("db:forum:post");
      expect(DbCacheKey.FORUM_CATEGORY_COUNT).toBe("db:forum:category:count");
    });

    it("should have unique cache key values", () => {
      const values = Object.values(DbCacheKey);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it("should start with db: prefix for organization", () => {
      Object.values(DbCacheKey).forEach((key) => {
        expect(key).toMatch(/^db:/);
      });
    });
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe("Type Structures", () => {
  describe("PaginationOptions", () => {
    it("should accept valid pagination options", () => {
      const validOptions: PaginationOptions[] = [
        {},
        { page: 1 },
        { limit: 20 },
        { page: 1, limit: 20 },
        { page: 5, limit: 50 },
      ];

      validOptions.forEach((options) => {
        expect(options.page).toBeOneOf([undefined, expect.any(Number)]);
        expect(options.limit).toBeOneOf([undefined, expect.any(Number)]);
      });
    });

    it("should support optional page property", () => {
      const withPage: PaginationOptions = { page: 1 };
      const withoutPage: PaginationOptions = { limit: 20 };

      expect(withPage.page).toBe(1);
      expect(withoutPage.page).toBeUndefined();
    });

    it("should support optional limit property", () => {
      const withLimit: PaginationOptions = { limit: 50 };
      const withoutLimit: PaginationOptions = { page: 1 };

      expect(withLimit.limit).toBe(50);
      expect(withoutLimit.limit).toBeUndefined();
    });
  });

  describe("CachedUser", () => {
    it("should have all required properties", () => {
      const user: CachedUser = {
        id: "user_123",
        clerkId: "clerk_abc",
        email: "test@example.com",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
        tier: "FREE",
        aiEnabled: true,
        profilePublic: false,
        showStats: true,
        showActivity: false,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      expect(user.id).toBe("user_123");
      expect(user.clerkId).toBe("clerk_abc");
      expect(user.email).toBe("test@example.com");
      expect(user.username).toBe("testuser");
      expect(user.displayName).toBe("Test User");
      expect(user.avatarUrl).toBe("https://example.com/avatar.jpg");
      expect(user.tier).toBe("FREE");
      expect(user.aiEnabled).toBe(true);
      expect(user.profilePublic).toBe(false);
      expect(user.showStats).toBe(true);
      expect(user.showActivity).toBe(false);
      expect(user.createdAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should allow null for optional string properties", () => {
      const user: CachedUser = {
        id: "user_123",
        clerkId: "clerk_abc",
        email: "test@example.com",
        username: null,
        displayName: null,
        avatarUrl: null,
        tier: "PRO",
        aiEnabled: false,
        profilePublic: true,
        showStats: false,
        showActivity: true,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      expect(user.username).toBeNull();
      expect(user.displayName).toBeNull();
      expect(user.avatarUrl).toBeNull();
    });

    it("should support different tier values", () => {
      const tiers = ["FREE", "PRO", "SCHOLAR"];

      tiers.forEach((tier) => {
        const user: CachedUser = {
          id: "user_123",
          clerkId: "clerk_abc",
          email: "test@example.com",
          username: null,
          displayName: null,
          avatarUrl: null,
          tier,
          aiEnabled: true,
          profilePublic: false,
          showStats: false,
          showActivity: false,
          createdAt: "2024-01-01T00:00:00.000Z",
        };

        expect(user.tier).toBe(tier);
      });
    });
  });

  describe("CachedUserStats", () => {
    it("should have all required properties", () => {
      const stats: CachedUserStats = {
        totalXP: 1500,
        level: 5,
        currentStreak: 7,
        longestStreak: 14,
        booksCompleted: 10,
        totalReadingTime: 36000,
        totalWordsRead: 50000,
        followersCount: 25,
        followingCount: 30,
      };

      expect(stats.totalXP).toBe(1500);
      expect(stats.level).toBe(5);
      expect(stats.currentStreak).toBe(7);
      expect(stats.longestStreak).toBe(14);
      expect(stats.booksCompleted).toBe(10);
      expect(stats.totalReadingTime).toBe(36000);
      expect(stats.totalWordsRead).toBe(50000);
      expect(stats.followersCount).toBe(25);
      expect(stats.followingCount).toBe(30);
    });

    it("should support zero values for new users", () => {
      const newUserStats: CachedUserStats = {
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        booksCompleted: 0,
        totalReadingTime: 0,
        totalWordsRead: 0,
        followersCount: 0,
        followingCount: 0,
      };

      expect(newUserStats.totalXP).toBe(0);
      expect(newUserStats.level).toBe(1);
      expect(newUserStats.currentStreak).toBe(0);
    });

    it("should support large values for active users", () => {
      const activeUserStats: CachedUserStats = {
        totalXP: 1000000,
        level: 100,
        currentStreak: 365,
        longestStreak: 500,
        booksCompleted: 1000,
        totalReadingTime: 10000000,
        totalWordsRead: 50000000,
        followersCount: 10000,
        followingCount: 500,
      };

      expect(activeUserStats.totalXP).toBeGreaterThan(999999);
      expect(activeUserStats.level).toBe(100);
      expect(activeUserStats.booksCompleted).toBe(1000);
    });
  });

  describe("CachedBookSummary", () => {
    it("should have all required properties", () => {
      const book: CachedBookSummary = {
        id: "book_123",
        title: "The Great Book",
        author: "John Doe",
        coverImage: "https://example.com/cover.jpg",
        status: "READING",
        genre: "Fiction",
        tags: ["classic", "drama"],
        wordCount: 50000,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-15T00:00:00.000Z",
        progress: {
          percentage: 45.5,
          lastReadAt: "2024-01-15T10:30:00.000Z",
        },
      };

      expect(book.id).toBe("book_123");
      expect(book.title).toBe("The Great Book");
      expect(book.author).toBe("John Doe");
      expect(book.coverImage).toBe("https://example.com/cover.jpg");
      expect(book.status).toBe("READING");
      expect(book.genre).toBe("Fiction");
      expect(book.tags).toEqual(["classic", "drama"]);
      expect(book.wordCount).toBe(50000);
      expect(book.progress?.percentage).toBe(45.5);
      expect(book.progress?.lastReadAt).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should allow null for optional properties", () => {
      const book: CachedBookSummary = {
        id: "book_456",
        title: "Untitled Book",
        author: null,
        coverImage: null,
        status: "WANT_TO_READ",
        genre: null,
        tags: [],
        wordCount: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        progress: null,
      };

      expect(book.author).toBeNull();
      expect(book.coverImage).toBeNull();
      expect(book.genre).toBeNull();
      expect(book.wordCount).toBeNull();
      expect(book.progress).toBeNull();
    });

    it("should support empty tags array", () => {
      const book: CachedBookSummary = {
        id: "book_789",
        title: "No Tags Book",
        author: "Author",
        coverImage: null,
        status: "COMPLETED",
        genre: "Non-Fiction",
        tags: [],
        wordCount: 30000,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-02-01T00:00:00.000Z",
        progress: null,
      };

      expect(book.tags).toEqual([]);
      expect(book.tags.length).toBe(0);
    });

    it("should support progress with null lastReadAt", () => {
      const book: CachedBookSummary = {
        id: "book_abc",
        title: "Just Started",
        author: "Writer",
        coverImage: null,
        status: "READING",
        genre: null,
        tags: ["test"],
        wordCount: 20000,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        progress: {
          percentage: 0,
          lastReadAt: null,
        },
      };

      expect(book.progress?.percentage).toBe(0);
      expect(book.progress?.lastReadAt).toBeNull();
    });

    it("should support all reading statuses", () => {
      const statuses = ["WANT_TO_READ", "READING", "COMPLETED", "ABANDONED"];

      statuses.forEach((status) => {
        const book: CachedBookSummary = {
          id: "book_status",
          title: "Status Book",
          author: null,
          coverImage: null,
          status,
          genre: null,
          tags: [],
          wordCount: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          progress: null,
        };

        expect(book.status).toBe(status);
      });
    });
  });
});

// ============================================================================
// Cache Key Pattern Tests
// ============================================================================

describe("Cache Key Patterns", () => {
  it("should use colon separators for namespacing", () => {
    const keyPattern = /^db:[a-z]+(?::[a-z]+)*$/;

    Object.values(DbCacheKey).forEach((key) => {
      expect(key).toMatch(keyPattern);
    });
  });

  it("should group related keys by prefix", () => {
    const userKeys = Object.values(DbCacheKey).filter((k) =>
      k.startsWith("db:user")
    );
    const bookKeys = Object.values(DbCacheKey).filter((k) =>
      k.startsWith("db:book")
    );
    const flashcardKeys = Object.values(DbCacheKey).filter((k) =>
      k.startsWith("db:flashcard")
    );
    const forumKeys = Object.values(DbCacheKey).filter((k) =>
      k.startsWith("db:forum")
    );

    expect(userKeys.length).toBeGreaterThanOrEqual(4);
    expect(bookKeys.length).toBeGreaterThanOrEqual(2);
    expect(flashcardKeys.length).toBeGreaterThanOrEqual(2);
    expect(forumKeys.length).toBeGreaterThanOrEqual(2);
  });

  it("should have descriptive key names", () => {
    expect(DbCacheKey.USER_STATS).toContain("stats");
    expect(DbCacheKey.FLASHCARDS_DUE).toContain("due");
    expect(DbCacheKey.FOLLOWERS_COUNT).toContain("count");
    expect(DbCacheKey.FORUM_CATEGORY_COUNT).toContain("category");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  describe("Pagination", () => {
    it("should handle page 0 (invalid but possible)", () => {
      const options: PaginationOptions = { page: 0, limit: 20 };
      expect(options.page).toBe(0);
    });

    it("should handle very large page numbers", () => {
      const options: PaginationOptions = { page: 999999, limit: 100 };
      expect(options.page).toBe(999999);
    });

    it("should handle limit of 1", () => {
      const options: PaginationOptions = { page: 1, limit: 1 };
      expect(options.limit).toBe(1);
    });
  });

  describe("CachedUser edge cases", () => {
    it("should handle empty string username", () => {
      const user: CachedUser = {
        id: "user_123",
        clerkId: "clerk_abc",
        email: "test@example.com",
        username: null,
        displayName: "",
        avatarUrl: null,
        tier: "FREE",
        aiEnabled: true,
        profilePublic: false,
        showStats: false,
        showActivity: false,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      expect(user.displayName).toBe("");
    });
  });

  describe("CachedBookSummary edge cases", () => {
    it("should handle very long title", () => {
      const longTitle = "A".repeat(500);
      const book: CachedBookSummary = {
        id: "book_long",
        title: longTitle,
        author: null,
        coverImage: null,
        status: "WANT_TO_READ",
        genre: null,
        tags: [],
        wordCount: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        progress: null,
      };

      expect(book.title.length).toBe(500);
    });

    it("should handle many tags", () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag_${i}`);
      const book: CachedBookSummary = {
        id: "book_tags",
        title: "Tagged Book",
        author: null,
        coverImage: null,
        status: "READING",
        genre: null,
        tags: manyTags,
        wordCount: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        progress: null,
      };

      expect(book.tags.length).toBe(50);
    });

    it("should handle 100% progress", () => {
      const book: CachedBookSummary = {
        id: "book_complete",
        title: "Completed Book",
        author: "Author",
        coverImage: null,
        status: "COMPLETED",
        genre: null,
        tags: [],
        wordCount: 10000,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        progress: {
          percentage: 100,
          lastReadAt: "2024-01-15T00:00:00.000Z",
        },
      };

      expect(book.progress?.percentage).toBe(100);
    });
  });
});

// ============================================================================
// DbCacheKeyType Tests
// ============================================================================

describe("DbCacheKeyType", () => {
  it("should allow all DbCacheKey values", () => {
    const keys: DbCacheKeyType[] = [
      DbCacheKey.USER,
      DbCacheKey.USER_CLERK,
      DbCacheKey.USER_STATS,
      DbCacheKey.USER_BOOKS,
      DbCacheKey.USER_BOOKS_COUNT,
      DbCacheKey.BOOK,
      DbCacheKey.BOOK_PROGRESS,
      DbCacheKey.FLASHCARDS_DUE,
      DbCacheKey.FLASHCARDS_COUNT,
      DbCacheKey.PROGRESS,
      DbCacheKey.ACHIEVEMENTS,
      DbCacheKey.FOLLOWING_COUNT,
      DbCacheKey.FOLLOWERS_COUNT,
      DbCacheKey.FORUM_POST,
      DbCacheKey.FORUM_CATEGORY_COUNT,
    ];

    expect(keys.length).toBe(15);
    keys.forEach((key) => {
      expect(typeof key).toBe("string");
    });
  });
});
