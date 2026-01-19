/**
 * Tests for /api/forum/categories endpoint
 */

import { describe, it, expect } from "vitest";
import {
  CATEGORIES_CACHE_TTL,
  CATEGORIES_CACHE_KEY,
  formatDate,
  formatDateRequired,
  mapToCategorySummary,
  type CategoryLastPostInfo,
  type ForumCategorySummary,
  type ForumCategoriesResponse,
} from "./categories.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct CATEGORIES_CACHE_TTL (5 minutes)", () => {
    expect(CATEGORIES_CACHE_TTL).toBe(300);
  });

  it("should have correct CATEGORIES_CACHE_KEY format", () => {
    expect(CATEGORIES_CACHE_KEY).toContain("forum:categories");
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export CategoryLastPostInfo type", () => {
    const lastPost: CategoryLastPostInfo = {
      id: "post-1",
      title: "Test Post",
      authorId: "user-1",
      authorUsername: "testuser",
      createdAt: "2026-01-18T00:00:00.000Z",
    };
    expect(lastPost.id).toBe("post-1");
    expect(lastPost.title).toBe("Test Post");
  });

  it("should allow null authorUsername in CategoryLastPostInfo", () => {
    const lastPost: CategoryLastPostInfo = {
      id: "post-1",
      title: "Test Post",
      authorId: "user-1",
      authorUsername: null,
      createdAt: "2026-01-18T00:00:00.000Z",
    };
    expect(lastPost.authorUsername).toBeNull();
  });

  it("should export ForumCategorySummary type", () => {
    const category: ForumCategorySummary = {
      id: "cat-1",
      slug: "general-discussion",
      name: "General Discussion",
      description: "A place for general discussions",
      icon: "chat",
      color: "#3B82F6",
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 42,
      lastPostAt: "2026-01-18T00:00:00.000Z",
      lastPost: null,
    };
    expect(category.slug).toBe("general-discussion");
    expect(category.isActive).toBe(true);
  });

  it("should export ForumCategorySummary with null optional fields", () => {
    const category: ForumCategorySummary = {
      id: "cat-1",
      slug: "general",
      name: "General",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPost: null,
    };
    expect(category.description).toBeNull();
    expect(category.icon).toBeNull();
    expect(category.color).toBeNull();
    expect(category.lastPostAt).toBeNull();
    expect(category.lastPost).toBeNull();
  });

  it("should export ForumCategoriesResponse type", () => {
    const response: ForumCategoriesResponse = {
      categories: [],
      total: 0,
    };
    expect(response.categories).toHaveLength(0);
    expect(response.total).toBe(0);
  });

  it("should export ForumCategoriesResponse with categories", () => {
    const response: ForumCategoriesResponse = {
      categories: [
        {
          id: "cat-1",
          slug: "general",
          name: "General",
          description: null,
          icon: null,
          color: null,
          sortOrder: 0,
          isActive: true,
          isLocked: false,
          minTierToPost: "FREE",
          postsCount: 10,
          lastPostAt: null,
          lastPost: null,
        },
      ],
      total: 1,
    };
    expect(response.categories).toHaveLength(1);
    expect(response.total).toBe(1);
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should return null for null input", () => {
    expect(formatDate(null)).toBeNull();
  });

  it("should return ISO string for valid date", () => {
    const date = new Date("2026-01-18T12:30:45.000Z");
    expect(formatDate(date)).toBe("2026-01-18T12:30:45.000Z");
  });

  it("should handle date at midnight", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(formatDate(date)).toBe("2026-01-01T00:00:00.000Z");
  });

  it("should handle date at end of day", () => {
    const date = new Date("2026-12-31T23:59:59.999Z");
    expect(formatDate(date)).toBe("2026-12-31T23:59:59.999Z");
  });
});

// ============================================================================
// formatDateRequired Tests
// ============================================================================

describe("formatDateRequired", () => {
  it("should return ISO string for valid date", () => {
    const date = new Date("2026-01-18T12:30:45.000Z");
    expect(formatDateRequired(date)).toBe("2026-01-18T12:30:45.000Z");
  });

  it("should handle date at epoch", () => {
    const date = new Date(0);
    expect(formatDateRequired(date)).toBe("1970-01-01T00:00:00.000Z");
  });

  it("should preserve milliseconds", () => {
    const date = new Date("2026-06-15T08:25:30.123Z");
    expect(formatDateRequired(date)).toBe("2026-06-15T08:25:30.123Z");
  });
});

// ============================================================================
// mapToCategorySummary Tests
// ============================================================================

describe("mapToCategorySummary", () => {
  it("should map category with no posts", () => {
    const category = {
      id: "cat-1",
      slug: "general",
      name: "General Discussion",
      description: "Talk about anything",
      icon: "chat",
      color: "#3B82F6",
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPostId: null,
      lastPostAuthorId: null,
      posts: [],
    };

    const result = mapToCategorySummary(category);

    expect(result.id).toBe("cat-1");
    expect(result.slug).toBe("general");
    expect(result.name).toBe("General Discussion");
    expect(result.description).toBe("Talk about anything");
    expect(result.icon).toBe("chat");
    expect(result.color).toBe("#3B82F6");
    expect(result.sortOrder).toBe(0);
    expect(result.isActive).toBe(true);
    expect(result.isLocked).toBe(false);
    expect(result.minTierToPost).toBe("FREE");
    expect(result.postsCount).toBe(0);
    expect(result.lastPostAt).toBeNull();
    expect(result.lastPost).toBeNull();
  });

  it("should map category with last post info", () => {
    const postDate = new Date("2026-01-18T10:30:00.000Z");
    const category = {
      id: "cat-1",
      slug: "books",
      name: "Book Discussions",
      description: null,
      icon: null,
      color: null,
      sortOrder: 1,
      isActive: true,
      isLocked: false,
      minTierToPost: "PRO",
      postsCount: 25,
      lastPostAt: postDate,
      lastPostId: "post-1",
      lastPostAuthorId: "user-1",
      posts: [
        {
          id: "post-1",
          title: "Great Book Review",
          user: {
            id: "user-1",
            username: "bookworm",
          },
          createdAt: postDate,
        },
      ],
    };

    const result = mapToCategorySummary(category);

    expect(result.postsCount).toBe(25);
    expect(result.lastPostAt).toBe("2026-01-18T10:30:00.000Z");
    expect(result.lastPost).not.toBeNull();
    if (result.lastPost) {
      expect(result.lastPost.id).toBe("post-1");
      expect(result.lastPost.title).toBe("Great Book Review");
      expect(result.lastPost.authorId).toBe("user-1");
      expect(result.lastPost.authorUsername).toBe("bookworm");
      expect(result.lastPost.createdAt).toBe("2026-01-18T10:30:00.000Z");
    }
  });

  it("should handle category with null user username", () => {
    const postDate = new Date("2026-01-18T10:30:00.000Z");
    const category = {
      id: "cat-1",
      slug: "qa",
      name: "Q&A",
      description: null,
      icon: null,
      color: null,
      sortOrder: 2,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 5,
      lastPostAt: postDate,
      lastPostId: "post-2",
      lastPostAuthorId: "user-2",
      posts: [
        {
          id: "post-2",
          title: "Question",
          user: {
            id: "user-2",
            username: null,
          },
          createdAt: postDate,
        },
      ],
    };

    const result = mapToCategorySummary(category);

    expect(result.lastPost).not.toBeNull();
    if (result.lastPost) {
      expect(result.lastPost.authorUsername).toBeNull();
    }
  });

  it("should map locked category", () => {
    const category = {
      id: "cat-3",
      slug: "announcements",
      name: "Announcements",
      description: "Official announcements",
      icon: "megaphone",
      color: "#EF4444",
      sortOrder: -1,
      isActive: true,
      isLocked: true,
      minTierToPost: "SCHOLAR",
      postsCount: 10,
      lastPostAt: null,
      lastPostId: null,
      lastPostAuthorId: null,
    };

    const result = mapToCategorySummary(category);

    expect(result.isLocked).toBe(true);
    expect(result.minTierToPost).toBe("SCHOLAR");
  });

  it("should map inactive category", () => {
    const category = {
      id: "cat-4",
      slug: "archived",
      name: "Archived",
      description: "Old discussions",
      icon: "archive",
      color: "#6B7280",
      sortOrder: 99,
      isActive: false,
      isLocked: true,
      minTierToPost: "FREE",
      postsCount: 500,
      lastPostAt: new Date("2025-06-01T00:00:00.000Z"),
      lastPostId: null,
      lastPostAuthorId: null,
    };

    const result = mapToCategorySummary(category);

    expect(result.isActive).toBe(false);
    expect(result.lastPostAt).toBe("2025-06-01T00:00:00.000Z");
    expect(result.lastPost).toBeNull();
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty posts array", () => {
    const category = {
      id: "cat-1",
      slug: "empty",
      name: "Empty Category",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPostId: null,
      lastPostAuthorId: null,
      posts: [],
    };

    const result = mapToCategorySummary(category);

    expect(result.lastPost).toBeNull();
  });

  it("should handle undefined posts", () => {
    const category = {
      id: "cat-1",
      slug: "no-posts",
      name: "No Posts",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPostId: null,
      lastPostAuthorId: null,
    };

    const result = mapToCategorySummary(category);

    expect(result.lastPost).toBeNull();
  });

  it("should handle category with high sort order", () => {
    const category = {
      id: "cat-1",
      slug: "last",
      name: "Last Category",
      description: null,
      icon: null,
      color: null,
      sortOrder: 999999,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPostId: null,
      lastPostAuthorId: null,
    };

    const result = mapToCategorySummary(category);

    expect(result.sortOrder).toBe(999999);
  });

  it("should handle category with negative sort order", () => {
    const category = {
      id: "cat-1",
      slug: "first",
      name: "First Category",
      description: null,
      icon: null,
      color: null,
      sortOrder: -10,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPostId: null,
      lastPostAuthorId: null,
    };

    const result = mapToCategorySummary(category);

    expect(result.sortOrder).toBe(-10);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should create valid empty response", () => {
    const response: ForumCategoriesResponse = {
      categories: [],
      total: 0,
    };

    expect(response).toHaveProperty("categories");
    expect(response).toHaveProperty("total");
    expect(Array.isArray(response.categories)).toBe(true);
    expect(typeof response.total).toBe("number");
  });

  it("should create valid response with multiple categories", () => {
    const categories: ForumCategorySummary[] = [
      {
        id: "cat-1",
        slug: "general",
        name: "General",
        description: null,
        icon: null,
        color: null,
        sortOrder: 0,
        isActive: true,
        isLocked: false,
        minTierToPost: "FREE",
        postsCount: 10,
        lastPostAt: null,
        lastPost: null,
      },
      {
        id: "cat-2",
        slug: "help",
        name: "Help",
        description: "Get help here",
        icon: "help",
        color: "#22C55E",
        sortOrder: 1,
        isActive: true,
        isLocked: false,
        minTierToPost: "FREE",
        postsCount: 50,
        lastPostAt: "2026-01-18T00:00:00.000Z",
        lastPost: {
          id: "post-1",
          title: "How do I use this?",
          authorId: "user-1",
          authorUsername: "newbie",
          createdAt: "2026-01-18T00:00:00.000Z",
        },
      },
    ];

    const response: ForumCategoriesResponse = {
      categories,
      total: categories.length,
    };

    expect(response.categories).toHaveLength(2);
    expect(response.total).toBe(2);
    expect(response.categories[0]?.slug).toBe("general");
    expect(response.categories[1]?.lastPost).not.toBeNull();
  });
});

// ============================================================================
// MinTierToPost Tests
// ============================================================================

describe("MinTierToPost Validation", () => {
  it("should handle FREE tier", () => {
    const category: ForumCategorySummary = {
      id: "cat-1",
      slug: "free",
      name: "Free",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "FREE",
      postsCount: 0,
      lastPostAt: null,
      lastPost: null,
    };
    expect(category.minTierToPost).toBe("FREE");
  });

  it("should handle PRO tier", () => {
    const category: ForumCategorySummary = {
      id: "cat-1",
      slug: "pro",
      name: "Pro",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "PRO",
      postsCount: 0,
      lastPostAt: null,
      lastPost: null,
    };
    expect(category.minTierToPost).toBe("PRO");
  });

  it("should handle SCHOLAR tier", () => {
    const category: ForumCategorySummary = {
      id: "cat-1",
      slug: "scholar",
      name: "Scholar",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      isActive: true,
      isLocked: false,
      minTierToPost: "SCHOLAR",
      postsCount: 0,
      lastPostAt: null,
      lastPost: null,
    };
    expect(category.minTierToPost).toBe("SCHOLAR");
  });
});
