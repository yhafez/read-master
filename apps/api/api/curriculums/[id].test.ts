/**
 * Tests for Curriculum API - Get, Update, Delete
 *
 * Tests cover:
 * - Type exports
 * - Validation schema for updates
 * - Helper functions (validateCurriculumId, formatDate, mapTo*, etc.)
 * - Access control (canAccessCurriculum, isOwner)
 * - Cache key generation
 * - Profanity filtering via schema
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import type { Visibility } from "@read-master/database";
import {
  // Constants
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  VISIBILITY_OPTIONS,
  DIFFICULTY_OPTIONS,
  // Types
  type CurriculumUserInfo,
  type CurriculumBookInfo,
  type CurriculumItemDetailInfo,
  type CurriculumDetailResponse,
  type UpdateCurriculumInput,
  // Schema
  updateCurriculumSchema,
  // Helper functions
  validateCurriculumId,
  formatDate,
  mapToCurriculumUserInfo,
  mapToCurriculumBookInfo,
  mapToCurriculumItemDetailInfo,
  canAccessCurriculum,
  isOwner,
  buildCurriculumCacheKey,
} from "./[id].js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct MAX_TITLE_LENGTH", () => {
    expect(MAX_TITLE_LENGTH).toBe(200);
  });

  it("should have correct MAX_DESCRIPTION_LENGTH", () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(5000);
  });

  it("should have correct MAX_CATEGORY_LENGTH", () => {
    expect(MAX_CATEGORY_LENGTH).toBe(100);
  });

  it("should have correct MAX_TAGS", () => {
    expect(MAX_TAGS).toBe(10);
  });

  it("should have correct MAX_TAG_LENGTH", () => {
    expect(MAX_TAG_LENGTH).toBe(50);
  });

  it("should have correct VISIBILITY_OPTIONS", () => {
    expect(VISIBILITY_OPTIONS).toEqual(["PUBLIC", "PRIVATE", "UNLISTED"]);
  });

  it("should have correct DIFFICULTY_OPTIONS", () => {
    expect(DIFFICULTY_OPTIONS).toEqual([
      "Beginner",
      "Intermediate",
      "Advanced",
    ]);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export CurriculumUserInfo type", () => {
    const user: CurriculumUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(user.id).toBe("user-1");
    expect(user.username).toBe("testuser");
  });

  it("should export CurriculumBookInfo type", () => {
    const book: CurriculumBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Author Name",
      coverImage: "https://example.com/cover.jpg",
    };
    expect(book.id).toBe("book-1");
    expect(book.title).toBe("Test Book");
  });

  it("should export CurriculumItemDetailInfo type", () => {
    const item: CurriculumItemDetailInfo = {
      id: "item-1",
      orderIndex: 0,
      bookId: "book-1",
      book: {
        id: "book-1",
        title: "Test Book",
        author: "Author",
        coverImage: null,
      },
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: "Read carefully",
      estimatedTime: 60,
      isOptional: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(item.id).toBe("item-1");
    expect(item.book?.title).toBe("Test Book");
  });

  it("should export CurriculumDetailResponse type", () => {
    const response: CurriculumDetailResponse = {
      id: "curriculum-1",
      title: "Test Curriculum",
      description: "A test curriculum",
      coverImage: null,
      category: "Science",
      tags: ["science"],
      difficulty: "Beginner",
      visibility: "PUBLIC",
      totalItems: 2,
      followersCount: 5,
      creator: {
        id: "user-1",
        username: "creator",
        displayName: null,
        avatarUrl: null,
      },
      isOwner: true,
      isFollowing: false,
      items: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(response.isOwner).toBe(true);
    expect(response.items).toEqual([]);
  });

  it("should export UpdateCurriculumInput type", () => {
    const input: UpdateCurriculumInput = {
      title: "Updated Title",
      description: "Updated description",
      visibility: "PRIVATE",
    };
    expect(input.title).toBe("Updated Title");
  });
});

// ============================================================================
// updateCurriculumSchema Tests
// ============================================================================

describe("updateCurriculumSchema", () => {
  it("should validate partial update with title only", () => {
    const result = updateCurriculumSchema.safeParse({
      title: "New Title",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("New Title");
    }
  });

  it("should validate partial update with description only", () => {
    const result = updateCurriculumSchema.safeParse({
      description: "New description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("New description");
    }
  });

  it("should validate complete update", () => {
    const result = updateCurriculumSchema.safeParse({
      title: "Updated Title",
      description: "Updated description",
      coverImage: "https://example.com/new-cover.jpg",
      category: "Technology",
      tags: ["tech", "programming"],
      difficulty: "Advanced",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty object (no updates)", () => {
    const result = updateCurriculumSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject empty title", () => {
    const result = updateCurriculumSchema.safeParse({
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty description", () => {
    const result = updateCurriculumSchema.safeParse({
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject title exceeding MAX_TITLE_LENGTH", () => {
    const result = updateCurriculumSchema.safeParse({
      title: "x".repeat(MAX_TITLE_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding MAX_DESCRIPTION_LENGTH", () => {
    const result = updateCurriculumSchema.safeParse({
      description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject profane title", () => {
    const result = updateCurriculumSchema.safeParse({
      title: "What the fuck title",
    });
    expect(result.success).toBe(false);
  });

  it("should reject profane description", () => {
    const result = updateCurriculumSchema.safeParse({
      description: "This bullshit description",
    });
    expect(result.success).toBe(false);
  });

  it("should reject profane category", () => {
    const result = updateCurriculumSchema.safeParse({
      category: "Shit category",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid cover image URL", () => {
    const result = updateCurriculumSchema.safeParse({
      coverImage: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should accept null cover image", () => {
    const result = updateCurriculumSchema.safeParse({
      coverImage: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject too many tags", () => {
    const result = updateCurriculumSchema.safeParse({
      tags: Array(MAX_TAGS + 1).fill("tag"),
    });
    expect(result.success).toBe(false);
  });

  it("should reject tag exceeding MAX_TAG_LENGTH", () => {
    const result = updateCurriculumSchema.safeParse({
      tags: ["x".repeat(MAX_TAG_LENGTH + 1)],
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid difficulty", () => {
    const result = updateCurriculumSchema.safeParse({
      difficulty: "Expert",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid visibility", () => {
    const result = updateCurriculumSchema.safeParse({
      visibility: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should accept all valid difficulty options", () => {
    for (const difficulty of DIFFICULTY_OPTIONS) {
      const result = updateCurriculumSchema.safeParse({ difficulty });
      expect(result.success).toBe(true);
    }
  });

  it("should accept null difficulty", () => {
    const result = updateCurriculumSchema.safeParse({
      difficulty: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept all valid visibility options", () => {
    for (const visibility of VISIBILITY_OPTIONS) {
      const result = updateCurriculumSchema.safeParse({ visibility });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// validateCurriculumId Tests
// ============================================================================

describe("validateCurriculumId", () => {
  it("should return trimmed id for valid string", () => {
    expect(validateCurriculumId("curriculum-123")).toBe("curriculum-123");
  });

  it("should trim whitespace from id", () => {
    expect(validateCurriculumId("  curriculum-123  ")).toBe("curriculum-123");
  });

  it("should return null for empty string", () => {
    expect(validateCurriculumId("")).toBeNull();
  });

  it("should return null for whitespace-only string", () => {
    expect(validateCurriculumId("   ")).toBeNull();
  });

  it("should return null for null input", () => {
    expect(validateCurriculumId(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(validateCurriculumId(undefined)).toBeNull();
  });

  it("should return null for number input", () => {
    expect(validateCurriculumId(123)).toBeNull();
  });

  it("should return null for object input", () => {
    expect(validateCurriculumId({ id: "test" })).toBeNull();
  });

  it("should return null for array input", () => {
    expect(validateCurriculumId(["curriculum-123"])).toBeNull();
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(formatDate(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle dates with milliseconds", () => {
    const date = new Date("2024-06-20T15:45:30.123Z");
    expect(formatDate(date)).toBe("2024-06-20T15:45:30.123Z");
  });

  it("should return consistent format for unix epoch", () => {
    const date = new Date(0);
    expect(formatDate(date)).toBe("1970-01-01T00:00:00.000Z");
  });
});

// ============================================================================
// mapToCurriculumUserInfo Tests
// ============================================================================

describe("mapToCurriculumUserInfo", () => {
  it("should map user with all fields", () => {
    const result = mapToCurriculumUserInfo({
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
    expect(result).toEqual({
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("should default username to 'anonymous' when null", () => {
    const result = mapToCurriculumUserInfo({
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    });
    expect(result.username).toBe("anonymous");
  });
});

// ============================================================================
// mapToCurriculumBookInfo Tests
// ============================================================================

describe("mapToCurriculumBookInfo", () => {
  it("should return null for null book", () => {
    expect(mapToCurriculumBookInfo(null)).toBeNull();
  });

  it("should map book with all fields", () => {
    const result = mapToCurriculumBookInfo({
      id: "book-1",
      title: "Test Book",
      author: "Author Name",
      coverImage: "https://example.com/cover.jpg",
    });
    expect(result).toEqual({
      id: "book-1",
      title: "Test Book",
      author: "Author Name",
      coverImage: "https://example.com/cover.jpg",
    });
  });

  it("should handle null optional fields", () => {
    const result = mapToCurriculumBookInfo({
      id: "book-1",
      title: "Test Book",
      author: null,
      coverImage: null,
    });
    expect(result?.author).toBeNull();
    expect(result?.coverImage).toBeNull();
  });
});

// ============================================================================
// mapToCurriculumItemDetailInfo Tests
// ============================================================================

describe("mapToCurriculumItemDetailInfo", () => {
  it("should map item with book", () => {
    const result = mapToCurriculumItemDetailInfo({
      id: "item-1",
      orderIndex: 0,
      bookId: "book-1",
      book: {
        id: "book-1",
        title: "Test Book",
        author: "Author",
        coverImage: "https://example.com/cover.jpg",
      },
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: "Read chapter 1",
      estimatedTime: 60,
      isOptional: false,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-15T00:00:00.000Z"),
    });
    expect(result.id).toBe("item-1");
    expect(result.book?.title).toBe("Test Book");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should map item with external resource", () => {
    const result = mapToCurriculumItemDetailInfo({
      id: "item-2",
      orderIndex: 1,
      bookId: null,
      book: null,
      externalTitle: "External Book",
      externalAuthor: "External Author",
      externalUrl: "https://example.com/book",
      externalIsbn: "978-0-123456-78-9",
      notes: "External resource",
      estimatedTime: 120,
      isOptional: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    expect(result.book).toBeNull();
    expect(result.externalTitle).toBe("External Book");
    expect(result.externalIsbn).toBe("978-0-123456-78-9");
    expect(result.isOptional).toBe(true);
  });

  it("should preserve all null values", () => {
    const result = mapToCurriculumItemDetailInfo({
      id: "item-3",
      orderIndex: 2,
      bookId: null,
      book: null,
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: null,
      estimatedTime: null,
      isOptional: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.book).toBeNull();
    expect(result.externalTitle).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.estimatedTime).toBeNull();
  });
});

// ============================================================================
// canAccessCurriculum Tests
// ============================================================================

describe("canAccessCurriculum", () => {
  it("should allow access to PUBLIC curriculum for any user", () => {
    const curriculum = {
      visibility: "PUBLIC" as Visibility,
      userId: "user-1",
      followers: [],
    };
    expect(canAccessCurriculum(curriculum, "user-2")).toBe(true);
  });

  it("should allow access to UNLISTED curriculum for any user", () => {
    const curriculum = {
      visibility: "UNLISTED" as Visibility,
      userId: "user-1",
      followers: [],
    };
    expect(canAccessCurriculum(curriculum, "user-2")).toBe(true);
  });

  it("should allow owner to access PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "user-1",
      followers: [],
    };
    expect(canAccessCurriculum(curriculum, "user-1")).toBe(true);
  });

  it("should allow follower to access PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "user-1",
      followers: [{ userId: "user-2" }],
    };
    expect(canAccessCurriculum(curriculum, "user-2")).toBe(true);
  });

  it("should deny non-follower access to PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "user-1",
      followers: [{ userId: "user-3" }],
    };
    expect(canAccessCurriculum(curriculum, "user-2")).toBe(false);
  });

  it("should deny access to PRIVATE curriculum with no followers", () => {
    const curriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "user-1",
      followers: [],
    };
    expect(canAccessCurriculum(curriculum, "user-2")).toBe(false);
  });

  it("should handle missing followers array (owner access)", () => {
    const curriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "user-1",
    };
    // Owner can always access
    expect(canAccessCurriculum(curriculum, "user-1")).toBe(true);
  });

  it("should handle missing followers array (non-owner access)", () => {
    const curriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "user-1",
    };
    // Non-owner cannot access private without followers array
    expect(canAccessCurriculum(curriculum, "user-2")).toBe(false);
  });
});

// ============================================================================
// isOwner Tests
// ============================================================================

describe("isOwner", () => {
  it("should return true when user is owner", () => {
    expect(isOwner("user-1", "user-1")).toBe(true);
  });

  it("should return false when user is not owner", () => {
    expect(isOwner("user-1", "user-2")).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(isOwner("", "")).toBe(true);
    expect(isOwner("", "user-1")).toBe(false);
    expect(isOwner("user-1", "")).toBe(false);
  });
});

// ============================================================================
// buildCurriculumCacheKey Tests
// ============================================================================

describe("buildCurriculumCacheKey", () => {
  it("should build cache key with curriculum id", () => {
    const key = buildCurriculumCacheKey("curriculum-123");
    expect(key).toContain("curriculum");
    expect(key).toContain("curriculum-123");
  });

  it("should produce different keys for different ids", () => {
    const key1 = buildCurriculumCacheKey("curriculum-1");
    const key2 = buildCurriculumCacheKey("curriculum-2");
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("Boundary values for updateCurriculumSchema", () => {
    it("should accept title at MAX_TITLE_LENGTH", () => {
      const result = updateCurriculumSchema.safeParse({
        title: "x".repeat(MAX_TITLE_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should accept description at MAX_DESCRIPTION_LENGTH", () => {
      const result = updateCurriculumSchema.safeParse({
        description: "x".repeat(MAX_DESCRIPTION_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should accept category at MAX_CATEGORY_LENGTH", () => {
      const result = updateCurriculumSchema.safeParse({
        category: "x".repeat(MAX_CATEGORY_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should accept exactly MAX_TAGS tags", () => {
      const result = updateCurriculumSchema.safeParse({
        tags: Array(MAX_TAGS).fill("tag"),
      });
      expect(result.success).toBe(true);
    });

    it("should accept tag at MAX_TAG_LENGTH", () => {
      const result = updateCurriculumSchema.safeParse({
        tags: ["x".repeat(MAX_TAG_LENGTH)],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Unicode and special characters", () => {
    it("should accept unicode in title", () => {
      const result = updateCurriculumSchema.safeParse({
        title: "日本語タイトル",
      });
      expect(result.success).toBe(true);
    });

    it("should accept unicode in description", () => {
      const result = updateCurriculumSchema.safeParse({
        description: "العربية الوصف",
      });
      expect(result.success).toBe(true);
    });

    it("should accept unicode in category", () => {
      const result = updateCurriculumSchema.safeParse({
        category: "科学",
      });
      expect(result.success).toBe(true);
    });

    it("should accept emojis in tags", () => {
      const result = updateCurriculumSchema.safeParse({
        tags: ["📚", "🎓", "💻"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("mapToCurriculumItemDetailInfo edge cases", () => {
    it("should handle item with zero orderIndex", () => {
      const result = mapToCurriculumItemDetailInfo({
        id: "item-1",
        orderIndex: 0,
        bookId: null,
        book: null,
        externalTitle: null,
        externalAuthor: null,
        externalUrl: null,
        externalIsbn: null,
        notes: null,
        estimatedTime: null,
        isOptional: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.orderIndex).toBe(0);
    });

    it("should handle item with large orderIndex", () => {
      const result = mapToCurriculumItemDetailInfo({
        id: "item-1",
        orderIndex: 999999,
        bookId: null,
        book: null,
        externalTitle: null,
        externalAuthor: null,
        externalUrl: null,
        externalIsbn: null,
        notes: null,
        estimatedTime: null,
        isOptional: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.orderIndex).toBe(999999);
    });

    it("should handle zero estimated time", () => {
      const result = mapToCurriculumItemDetailInfo({
        id: "item-1",
        orderIndex: 0,
        bookId: null,
        book: null,
        externalTitle: null,
        externalAuthor: null,
        externalUrl: null,
        externalIsbn: null,
        notes: null,
        estimatedTime: 0,
        isOptional: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.estimatedTime).toBe(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration Tests", () => {
  it("should validate and map curriculum data correctly", () => {
    // Validate update input
    const updateInput = updateCurriculumSchema.safeParse({
      title: "Updated Curriculum",
      description: "Updated description",
      category: "Science",
      difficulty: "Advanced",
      visibility: "PUBLIC",
    });

    expect(updateInput.success).toBe(true);

    // Map a curriculum item
    const item = mapToCurriculumItemDetailInfo({
      id: "item-1",
      orderIndex: 0,
      bookId: "book-1",
      book: {
        id: "book-1",
        title: "Science Book",
        author: "Author",
        coverImage: null,
      },
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: "Required reading",
      estimatedTime: 120,
      isOptional: false,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    });

    expect(item.book?.title).toBe("Science Book");
    expect(item.notes).toBe("Required reading");
  });

  it("should correctly evaluate access for various scenarios", () => {
    const publicCurriculum = {
      visibility: "PUBLIC" as Visibility,
      userId: "owner-1",
      followers: [],
    };

    const privateCurriculum = {
      visibility: "PRIVATE" as Visibility,
      userId: "owner-1",
      followers: [{ userId: "follower-1" }],
    };

    // Anyone can access public
    expect(canAccessCurriculum(publicCurriculum, "random-user")).toBe(true);

    // Owner can access private
    expect(canAccessCurriculum(privateCurriculum, "owner-1")).toBe(true);
    expect(isOwner("owner-1", "owner-1")).toBe(true);

    // Follower can access private
    expect(canAccessCurriculum(privateCurriculum, "follower-1")).toBe(true);

    // Non-follower cannot access private
    expect(canAccessCurriculum(privateCurriculum, "random-user")).toBe(false);
    expect(isOwner("owner-1", "random-user")).toBe(false);
  });
});
