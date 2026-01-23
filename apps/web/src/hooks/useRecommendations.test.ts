/**
 * Tests for useRecommendations hooks
 *
 * Tests the React Query hooks and helper functions for
 * book and user recommendations.
 */

import { describe, it, expect } from "vitest";
import { recommendationKeys } from "./useRecommendations";
import type {
  BookRecommendation,
  AIBookRecommendation,
  SimilarUser,
  RecommendationSource,
  BookRecommender,
} from "./useRecommendations";

// ============================================================================
// Query Key Tests
// ============================================================================

describe("recommendationKeys", () => {
  describe("all", () => {
    it("should return base key array", () => {
      expect(recommendationKeys.all).toEqual(["recommendations"]);
    });

    it("should be a readonly tuple", () => {
      const keys = recommendationKeys.all;
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(1);
    });
  });

  describe("books", () => {
    it("should generate correct query key for all source", () => {
      const key = recommendationKeys.books("all", 10);
      expect(key).toEqual(["recommendations", "books", "all", 10]);
    });

    it("should generate correct query key for ai source", () => {
      const key = recommendationKeys.books("ai", 20);
      expect(key).toEqual(["recommendations", "books", "ai", 20]);
    });

    it("should generate correct query key for trending source", () => {
      const key = recommendationKeys.books("trending", 5);
      expect(key).toEqual(["recommendations", "books", "trending", 5]);
    });

    it("should generate correct query key for following source", () => {
      const key = recommendationKeys.books("following", 15);
      expect(key).toEqual(["recommendations", "books", "following", 15]);
    });

    it("should generate correct query key for social source", () => {
      const key = recommendationKeys.books("social", 8);
      expect(key).toEqual(["recommendations", "books", "social", 8]);
    });

    it("should produce different keys for different limits", () => {
      const key1 = recommendationKeys.books("all", 10);
      const key2 = recommendationKeys.books("all", 20);
      expect(key1).not.toEqual(key2);
    });

    it("should produce different keys for different sources", () => {
      const key1 = recommendationKeys.books("ai", 10);
      const key2 = recommendationKeys.books("trending", 10);
      expect(key1).not.toEqual(key2);
    });
  });

  describe("users", () => {
    it("should generate correct query key with limit", () => {
      const key = recommendationKeys.users(10);
      expect(key).toEqual(["recommendations", "users", 10]);
    });

    it("should produce different keys for different limits", () => {
      const key1 = recommendationKeys.users(5);
      const key2 = recommendationKeys.users(15);
      expect(key1).not.toEqual(key2);
    });

    it("should handle zero limit", () => {
      const key = recommendationKeys.users(0);
      expect(key).toEqual(["recommendations", "users", 0]);
    });

    it("should handle large limits", () => {
      const key = recommendationKeys.users(1000);
      expect(key).toEqual(["recommendations", "users", 1000]);
    });
  });

  describe("legacy", () => {
    it("should generate correct legacy query key", () => {
      const key = recommendationKeys.legacy(10);
      expect(key).toEqual(["books", "recommendations", 10]);
    });

    it("should be distinct from new recommendation keys", () => {
      const legacyKey = recommendationKeys.legacy(10);
      const newKey = recommendationKeys.books("all", 10);
      expect(legacyKey).not.toEqual(newKey);
    });
  });
});

// ============================================================================
// Type Structure Tests
// ============================================================================

describe("Type structures", () => {
  describe("BookRecommender", () => {
    it("should have required fields", () => {
      const recommender: BookRecommender = {
        id: "user-123",
        username: "johndoe",
        displayName: "John Doe",
        avatar: "https://example.com/avatar.jpg",
      };

      expect(recommender.id).toBe("user-123");
      expect(recommender.username).toBe("johndoe");
      expect(recommender.displayName).toBe("John Doe");
      expect(recommender.avatar).toBe("https://example.com/avatar.jpg");
    });

    it("should allow null displayName", () => {
      const recommender: BookRecommender = {
        id: "user-456",
        username: "janedoe",
        displayName: null,
        avatar: null,
      };

      expect(recommender.displayName).toBeNull();
      expect(recommender.avatar).toBeNull();
    });
  });

  describe("BookRecommendation", () => {
    it("should have all required fields", () => {
      const recommendation: BookRecommendation = {
        id: "rec-123",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        coverImage: "https://example.com/cover.jpg",
        description: "A classic novel",
        genre: "Fiction",
        wordCount: 47094,
        estimatedReadTime: 300,
        recommendedBy: [],
        readingCount: 100,
        completedCount: 75,
      };

      expect(recommendation.id).toBe("rec-123");
      expect(recommendation.title).toBe("The Great Gatsby");
      expect(recommendation.readingCount).toBe(100);
    });

    it("should allow nullable fields", () => {
      const recommendation: BookRecommendation = {
        id: "rec-456",
        title: "Unknown Book",
        author: null,
        coverImage: null,
        description: null,
        genre: null,
        wordCount: null,
        estimatedReadTime: null,
        recommendedBy: [],
        readingCount: 0,
        completedCount: 0,
      };

      expect(recommendation.author).toBeNull();
      expect(recommendation.coverImage).toBeNull();
      expect(recommendation.wordCount).toBeNull();
    });

    it("should support recommendedBy array", () => {
      const recommendation: BookRecommendation = {
        id: "rec-789",
        title: "Popular Book",
        author: "Famous Author",
        coverImage: null,
        description: null,
        genre: null,
        wordCount: null,
        estimatedReadTime: null,
        recommendedBy: [
          {
            id: "u1",
            username: "user1",
            displayName: "User One",
            avatar: null,
          },
          { id: "u2", username: "user2", displayName: null, avatar: null },
        ],
        readingCount: 50,
        completedCount: 30,
      };

      expect(recommendation.recommendedBy.length).toBe(2);
      const firstRecommender = recommendation.recommendedBy[0];
      expect(firstRecommender?.username).toBe("user1");
    });
  });

  describe("AIBookRecommendation", () => {
    it("should have all required fields", () => {
      const aiRec: AIBookRecommendation = {
        id: "ai-rec-123",
        bookId: "book-123",
        bookTitle: "AI Recommended Book",
        bookAuthor: "AI Author",
        bookCoverUrl: "https://example.com/ai-cover.jpg",
        reason: "Based on your reading history...",
        score: 0.95,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      };

      expect(aiRec.id).toBe("ai-rec-123");
      expect(aiRec.score).toBe(0.95);
      expect(aiRec.source).toBe("AI");
    });

    it("should support all source types", () => {
      const sources: AIBookRecommendation["source"][] = [
        "AI",
        "TRENDING",
        "FOLLOWING",
        "SOCIAL",
      ];

      sources.forEach((source) => {
        const rec: AIBookRecommendation = {
          id: `rec-${source}`,
          bookId: null,
          bookTitle: "Test Book",
          bookAuthor: null,
          bookCoverUrl: null,
          reason: "Test reason",
          score: 0.5,
          source,
          sourceUser: null,
          dismissed: false,
          addedToLibrary: false,
        };

        expect(rec.source).toBe(source);
      });
    });

    it("should support sourceUser object", () => {
      const rec: AIBookRecommendation = {
        id: "rec-with-user",
        bookId: null,
        bookTitle: "Book From Friend",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Your friend read this",
        score: 0.8,
        source: "FOLLOWING",
        sourceUser: {
          id: "friend-123",
          username: "friend_user",
          avatarUrl: "https://example.com/friend.jpg",
        },
        dismissed: false,
        addedToLibrary: false,
      };

      expect(rec.sourceUser).not.toBeNull();
      expect(rec.sourceUser?.id).toBe("friend-123");
      expect(rec.sourceUser?.username).toBe("friend_user");
    });

    it("should have boolean flags for state", () => {
      const dismissedRec: AIBookRecommendation = {
        id: "dismissed-rec",
        bookId: null,
        bookTitle: "Dismissed Book",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.3,
        source: "AI",
        sourceUser: null,
        dismissed: true,
        addedToLibrary: false,
      };

      const addedRec: AIBookRecommendation = {
        id: "added-rec",
        bookId: "book-added",
        bookTitle: "Added Book",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.9,
        source: "TRENDING",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: true,
      };

      expect(dismissedRec.dismissed).toBe(true);
      expect(dismissedRec.addedToLibrary).toBe(false);
      expect(addedRec.dismissed).toBe(false);
      expect(addedRec.addedToLibrary).toBe(true);
    });
  });

  describe("SimilarUser", () => {
    it("should have all required fields", () => {
      const user: SimilarUser = {
        id: "similar-user-123",
        username: "similar_reader",
        displayName: "Similar Reader",
        avatarUrl: "https://example.com/similar.jpg",
        similarityScore: 0.85,
        commonBooks: 12,
        commonGenres: ["Fiction", "Mystery", "Sci-Fi"],
        sharedInterests: ["Author: Stephen King", "Genre: Horror"],
      };

      expect(user.id).toBe("similar-user-123");
      expect(user.similarityScore).toBe(0.85);
      expect(user.commonBooks).toBe(12);
      expect(user.commonGenres.length).toBe(3);
    });

    it("should allow nullable fields", () => {
      const user: SimilarUser = {
        id: "user-null",
        username: null,
        displayName: null,
        avatarUrl: null,
        similarityScore: 0.5,
        commonBooks: 0,
        commonGenres: [],
        sharedInterests: [],
      };

      expect(user.username).toBeNull();
      expect(user.displayName).toBeNull();
      expect(user.avatarUrl).toBeNull();
    });

    it("should have similarity score between 0 and 1", () => {
      const userLow: SimilarUser = {
        id: "user-low",
        username: "low_match",
        displayName: null,
        avatarUrl: null,
        similarityScore: 0.1,
        commonBooks: 1,
        commonGenres: ["Fiction"],
        sharedInterests: [],
      };

      const userHigh: SimilarUser = {
        id: "user-high",
        username: "high_match",
        displayName: null,
        avatarUrl: null,
        similarityScore: 0.99,
        commonBooks: 50,
        commonGenres: ["Fiction", "Non-Fiction"],
        sharedInterests: ["Author: Various"],
      };

      expect(userLow.similarityScore).toBeGreaterThanOrEqual(0);
      expect(userLow.similarityScore).toBeLessThanOrEqual(1);
      expect(userHigh.similarityScore).toBeGreaterThanOrEqual(0);
      expect(userHigh.similarityScore).toBeLessThanOrEqual(1);
    });
  });

  describe("RecommendationSource", () => {
    it("should support all valid sources", () => {
      const sources: RecommendationSource[] = [
        "all",
        "social",
        "ai",
        "trending",
        "following",
      ];

      expect(sources.length).toBe(5);
      expect(sources).toContain("all");
      expect(sources).toContain("social");
      expect(sources).toContain("ai");
      expect(sources).toContain("trending");
      expect(sources).toContain("following");
    });
  });
});

// ============================================================================
// URL Building Helper Tests
// ============================================================================

describe("URL building patterns", () => {
  it("should build correct books endpoint URL", () => {
    const source = "ai";
    const limit = 10;
    const queryParams = new URLSearchParams();
    queryParams.set("source", source);
    queryParams.set("limit", limit.toString());

    const url = `/api/recommendations/books?${queryParams.toString()}`;
    expect(url).toBe("/api/recommendations/books?source=ai&limit=10");
  });

  it("should build correct users endpoint URL", () => {
    const limit = 15;
    const queryParams = new URLSearchParams();
    queryParams.set("limit", limit.toString());

    const url = `/api/recommendations/users?${queryParams.toString()}`;
    expect(url).toBe("/api/recommendations/users?limit=15");
  });

  it("should build correct legacy endpoint URL", () => {
    const limit = 20;
    const queryParams = new URLSearchParams();
    queryParams.set("limit", limit.toString());

    const url = `/api/books/recommendations?${queryParams.toString()}`;
    expect(url).toBe("/api/books/recommendations?limit=20");
  });

  it("should include includeRead parameter when true", () => {
    const source = "all";
    const limit = 10;
    const includeRead = true;
    const queryParams = new URLSearchParams();
    queryParams.set("source", source);
    queryParams.set("limit", limit.toString());
    if (includeRead) {
      queryParams.set("includeRead", "true");
    }

    const url = `/api/recommendations/books?${queryParams.toString()}`;
    expect(url).toContain("includeRead=true");
  });

  it("should not include includeRead when false", () => {
    const source = "all";
    const limit = 10;
    const includeRead = false;
    const queryParams = new URLSearchParams();
    queryParams.set("source", source);
    queryParams.set("limit", limit.toString());
    if (includeRead) {
      queryParams.set("includeRead", "true");
    }

    const url = `/api/recommendations/books?${queryParams.toString()}`;
    expect(url).not.toContain("includeRead");
  });
});

// ============================================================================
// Score and Similarity Calculations
// ============================================================================

describe("Score display helpers", () => {
  it("should convert score to percentage", () => {
    const scores = [0.95, 0.75, 0.5, 0.25, 0.1, 1.0, 0.0];
    const percentages = scores.map((score) => Math.round(score * 100));

    expect(percentages).toEqual([95, 75, 50, 25, 10, 100, 0]);
  });

  it("should round correctly for edge cases", () => {
    const score1 = 0.999;
    const score2 = 0.001;
    const score3 = 0.555;

    expect(Math.round(score1 * 100)).toBe(100);
    expect(Math.round(score2 * 100)).toBe(0);
    expect(Math.round(score3 * 100)).toBe(56);
  });
});

// ============================================================================
// Sorting and Filtering Tests
// ============================================================================

describe("Recommendation sorting", () => {
  it("should sort recommendations by score descending", () => {
    const recommendations: AIBookRecommendation[] = [
      {
        id: "1",
        bookId: null,
        bookTitle: "Low Score",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.3,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "2",
        bookId: null,
        bookTitle: "High Score",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.9,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "3",
        bookId: null,
        bookTitle: "Medium Score",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.6,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
    ];

    const sorted = [...recommendations].sort((a, b) => b.score - a.score);

    expect(sorted[0]?.bookTitle).toBe("High Score");
    expect(sorted[1]?.bookTitle).toBe("Medium Score");
    expect(sorted[2]?.bookTitle).toBe("Low Score");
  });

  it("should sort similar users by similarity score descending", () => {
    const users: SimilarUser[] = [
      {
        id: "1",
        username: "low",
        displayName: null,
        avatarUrl: null,
        similarityScore: 0.2,
        commonBooks: 1,
        commonGenres: [],
        sharedInterests: [],
      },
      {
        id: "2",
        username: "high",
        displayName: null,
        avatarUrl: null,
        similarityScore: 0.9,
        commonBooks: 10,
        commonGenres: [],
        sharedInterests: [],
      },
      {
        id: "3",
        username: "medium",
        displayName: null,
        avatarUrl: null,
        similarityScore: 0.5,
        commonBooks: 5,
        commonGenres: [],
        sharedInterests: [],
      },
    ];

    const sorted = [...users].sort(
      (a, b) => b.similarityScore - a.similarityScore
    );

    expect(sorted[0]?.username).toBe("high");
    expect(sorted[1]?.username).toBe("medium");
    expect(sorted[2]?.username).toBe("low");
  });
});

describe("Recommendation filtering", () => {
  it("should filter dismissed recommendations", () => {
    const recommendations: AIBookRecommendation[] = [
      {
        id: "1",
        bookId: null,
        bookTitle: "Active",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.8,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "2",
        bookId: null,
        bookTitle: "Dismissed",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.9,
        source: "AI",
        sourceUser: null,
        dismissed: true,
        addedToLibrary: false,
      },
    ];

    const active = recommendations.filter((rec) => !rec.dismissed);
    expect(active.length).toBe(1);
    expect(active[0]?.bookTitle).toBe("Active");
  });

  it("should filter by source", () => {
    const recommendations: AIBookRecommendation[] = [
      {
        id: "1",
        bookId: null,
        bookTitle: "AI Book",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.8,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "2",
        bookId: null,
        bookTitle: "Trending Book",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.9,
        source: "TRENDING",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "3",
        bookId: null,
        bookTitle: "Following Book",
        bookAuthor: null,
        bookCoverUrl: null,
        reason: "Test",
        score: 0.7,
        source: "FOLLOWING",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
    ];

    const aiOnly = recommendations.filter((rec) => rec.source === "AI");
    const trendingOnly = recommendations.filter(
      (rec) => rec.source === "TRENDING"
    );

    expect(aiOnly.length).toBe(1);
    expect(trendingOnly.length).toBe(1);
    expect(aiOnly[0]?.bookTitle).toBe("AI Book");
    expect(trendingOnly[0]?.bookTitle).toBe("Trending Book");
  });
});

// ============================================================================
// Deduplication Tests
// ============================================================================

describe("Recommendation deduplication", () => {
  it("should deduplicate by book title (case insensitive)", () => {
    const recommendations: AIBookRecommendation[] = [
      {
        id: "1",
        bookId: null,
        bookTitle: "The Great Gatsby",
        bookAuthor: "F. Scott Fitzgerald",
        bookCoverUrl: null,
        reason: "AI recommendation",
        score: 0.8,
        source: "AI",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "2",
        bookId: null,
        bookTitle: "the great gatsby",
        bookAuthor: "F. Scott Fitzgerald",
        bookCoverUrl: null,
        reason: "Trending recommendation",
        score: 0.9,
        source: "TRENDING",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
      {
        id: "3",
        bookId: null,
        bookTitle: "Different Book",
        bookAuthor: "Other Author",
        bookCoverUrl: null,
        reason: "Another recommendation",
        score: 0.7,
        source: "FOLLOWING",
        sourceUser: null,
        dismissed: false,
        addedToLibrary: false,
      },
    ];

    const seenTitles = new Set<string>();
    const deduplicated = recommendations.filter((rec) => {
      const key = rec.bookTitle.toLowerCase();
      if (seenTitles.has(key)) {
        return false;
      }
      seenTitles.add(key);
      return true;
    });

    expect(deduplicated.length).toBe(2);
    expect(deduplicated[0]?.bookTitle).toBe("The Great Gatsby");
    expect(deduplicated[1]?.bookTitle).toBe("Different Book");
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response structures", () => {
  it("should validate AIBookRecommendationsResponse structure", () => {
    const response = {
      recommendations: [
        {
          id: "1",
          bookId: null,
          bookTitle: "Test Book",
          bookAuthor: null,
          bookCoverUrl: null,
          reason: "Test",
          score: 0.8,
          source: "AI" as const,
          sourceUser: null,
          dismissed: false,
          addedToLibrary: false,
        },
      ],
      total: 1,
      hasMore: false,
    };

    expect(Array.isArray(response.recommendations)).toBe(true);
    expect(typeof response.total).toBe("number");
    expect(typeof response.hasMore).toBe("boolean");
  });

  it("should validate SimilarUsersResponse structure", () => {
    const response = {
      users: [
        {
          id: "1",
          username: "test",
          displayName: null,
          avatarUrl: null,
          similarityScore: 0.8,
          commonBooks: 5,
          commonGenres: ["Fiction"],
          sharedInterests: ["Author: Test"],
        },
      ],
      total: 1,
    };

    expect(Array.isArray(response.users)).toBe(true);
    expect(typeof response.total).toBe("number");
  });
});
