/**
 * Tests for GET /api/users/:username endpoint
 *
 * Tests cover:
 * - Query parameter parsing
 * - Public user info mapping
 * - Stats mapping
 * - Achievement mapping
 * - Activity item creation
 * - Level calculation
 * - Cache key building
 * - Privacy settings
 * - Social status
 */

import { describe, it, expect } from "vitest";
import {
  parseQueryParams,
  buildProfileCacheKey,
  formatDate,
  mapTierToString,
  mapToPublicUserInfo,
  mapToPublicStats,
  mapToAchievementInfo,
  createBookCompletedActivity,
  createAchievementActivity,
  getTitleForLevel,
  calculateLevelInfo,
  MAX_ACTIVITY_ITEMS,
  MAX_ACHIEVEMENTS,
  PROFILE_CACHE_TTL,
  type ProfileQueryParams,
  type PublicUserInfo,
  type PublicStats,
  type LevelInfo,
  type ActivityItem,
  type AchievementInfo,
  type SocialStatus,
  type ProfileResponse,
} from "./[username].js";

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type exports", () => {
  it("should export ProfileQueryParams type", () => {
    const params: ProfileQueryParams = {
      includeActivity: true,
      includeAchievements: false,
    };
    expect(params.includeActivity).toBe(true);
    expect(params.includeAchievements).toBe(false);
  });

  it("should export PublicUserInfo type", () => {
    const user: PublicUserInfo = {
      id: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      bio: "A test bio",
      createdAt: "2024-01-01T00:00:00.000Z",
      tier: "Pro",
    };
    expect(user.id).toBe("user-123");
    expect(user.username).toBe("testuser");
  });

  it("should export LevelInfo type", () => {
    const levelInfo: LevelInfo = {
      level: 5,
      title: "Avid Reader",
      totalXP: 1200,
    };
    expect(levelInfo.level).toBe(5);
    expect(levelInfo.title).toBe("Avid Reader");
  });

  it("should export PublicStats type", () => {
    const stats: PublicStats = {
      levelInfo: { level: 3, title: "Page Turner", totalXP: 500 },
      booksCompleted: 10,
      totalReadingTime: 36000,
      currentStreak: 7,
      longestStreak: 14,
      followersCount: 100,
      followingCount: 50,
    };
    expect(stats.booksCompleted).toBe(10);
    expect(stats.levelInfo.level).toBe(3);
  });

  it("should export ActivityItem type", () => {
    const activity: ActivityItem = {
      type: "book_completed",
      title: 'Completed "Test Book"',
      description: null,
      timestamp: "2024-01-01T00:00:00.000Z",
    };
    expect(activity.type).toBe("book_completed");
  });

  it("should export AchievementInfo type", () => {
    const achievement: AchievementInfo = {
      id: "ach-123",
      name: "First Steps",
      description: "Complete your first book",
      icon: "book",
      rarity: "common",
      earnedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(achievement.id).toBe("ach-123");
    expect(achievement.rarity).toBe("common");
  });

  it("should allow null icon in AchievementInfo", () => {
    const achievement: AchievementInfo = {
      id: "ach-123",
      name: "First Steps",
      description: "Complete your first book",
      icon: null,
      rarity: "common",
      earnedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(achievement.icon).toBeNull();
  });

  it("should export SocialStatus type", () => {
    const social: SocialStatus = {
      isFollowing: true,
      isFollowedBy: false,
      isOwnProfile: false,
    };
    expect(social.isFollowing).toBe(true);
    expect(social.isOwnProfile).toBe(false);
  });

  it("should export ProfileResponse type", () => {
    const response: ProfileResponse = {
      user: {
        id: "user-123",
        username: "testuser",
        displayName: null,
        avatarUrl: null,
        bio: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        tier: "Free",
      },
      stats: null,
      activity: null,
      achievements: null,
      social: {
        isFollowing: false,
        isFollowedBy: false,
        isOwnProfile: true,
      },
    };
    expect(response.user.username).toBe("testuser");
    expect(response.social.isOwnProfile).toBe(true);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct MAX_ACTIVITY_ITEMS", () => {
    expect(MAX_ACTIVITY_ITEMS).toBe(10);
  });

  it("should have correct MAX_ACHIEVEMENTS", () => {
    expect(MAX_ACHIEVEMENTS).toBe(50);
  });

  it("should have correct PROFILE_CACHE_TTL", () => {
    expect(PROFILE_CACHE_TTL).toBe(900); // 15 minutes = 900 seconds
  });
});

// ============================================================================
// parseQueryParams Tests
// ============================================================================

describe("parseQueryParams", () => {
  it("should default includeActivity to false", () => {
    const result = parseQueryParams({});
    expect(result.includeActivity).toBe(false);
  });

  it("should default includeAchievements to true", () => {
    const result = parseQueryParams({});
    expect(result.includeAchievements).toBe(true);
  });

  it("should parse includeActivity=true", () => {
    const result = parseQueryParams({ includeActivity: "true" });
    expect(result.includeActivity).toBe(true);
  });

  it("should parse includeActivity=false", () => {
    const result = parseQueryParams({ includeActivity: "false" });
    expect(result.includeActivity).toBe(false);
  });

  it("should parse includeAchievements=true", () => {
    const result = parseQueryParams({ includeAchievements: "true" });
    expect(result.includeAchievements).toBe(true);
  });

  it("should parse includeAchievements=false", () => {
    const result = parseQueryParams({ includeAchievements: "false" });
    expect(result.includeAchievements).toBe(false);
  });

  it("should handle undefined values with defaults", () => {
    const result = parseQueryParams({
      includeActivity: undefined,
      includeAchievements: undefined,
    });
    expect(result.includeActivity).toBe(false);
    expect(result.includeAchievements).toBe(true);
  });

  it("should handle array values by treating as falsy", () => {
    const result = parseQueryParams({
      includeActivity: ["true", "false"],
      includeAchievements: ["false"],
    });
    // Arrays are not equal to "true" or "false" strings
    expect(result.includeActivity).toBe(false);
    expect(result.includeAchievements).toBe(true);
  });

  it("should handle invalid string values", () => {
    const result = parseQueryParams({
      includeActivity: "yes",
      includeAchievements: "no",
    });
    expect(result.includeActivity).toBe(false);
    expect(result.includeAchievements).toBe(true);
  });
});

// ============================================================================
// buildProfileCacheKey Tests
// ============================================================================

describe("buildProfileCacheKey", () => {
  it("should build cache key with activity and achievements", () => {
    const params: ProfileQueryParams = {
      includeActivity: true,
      includeAchievements: true,
    };
    const key = buildProfileCacheKey("TestUser", params);
    expect(key).toBe("user:profile:testuser:activity:achievements");
  });

  it("should build cache key without activity", () => {
    const params: ProfileQueryParams = {
      includeActivity: false,
      includeAchievements: true,
    };
    const key = buildProfileCacheKey("TestUser", params);
    expect(key).toBe("user:profile:testuser:no-activity:achievements");
  });

  it("should build cache key without achievements", () => {
    const params: ProfileQueryParams = {
      includeActivity: true,
      includeAchievements: false,
    };
    const key = buildProfileCacheKey("TestUser", params);
    expect(key).toBe("user:profile:testuser:activity:no-achievements");
  });

  it("should build cache key without activity or achievements", () => {
    const params: ProfileQueryParams = {
      includeActivity: false,
      includeAchievements: false,
    };
    const key = buildProfileCacheKey("TestUser", params);
    expect(key).toBe("user:profile:testuser:no-activity:no-achievements");
  });

  it("should lowercase username for cache key", () => {
    const params: ProfileQueryParams = {
      includeActivity: false,
      includeAchievements: false,
    };
    const key1 = buildProfileCacheKey("TestUser", params);
    const key2 = buildProfileCacheKey("testuser", params);
    const key3 = buildProfileCacheKey("TESTUSER", params);

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  it("should handle special characters in username", () => {
    const params: ProfileQueryParams = {
      includeActivity: false,
      includeAchievements: false,
    };
    const key = buildProfileCacheKey("user_123-test", params);
    expect(key).toContain("user_123-test");
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

  it("should handle date at epoch", () => {
    const date = new Date(0);
    const result = formatDate(date);
    expect(result).toBe("1970-01-01T00:00:00.000Z");
  });

  it("should preserve milliseconds", () => {
    const date = new Date("2024-06-15T12:34:56.789Z");
    const result = formatDate(date);
    expect(result).toBe("2024-06-15T12:34:56.789Z");
  });
});

// ============================================================================
// mapTierToString Tests
// ============================================================================

describe("mapTierToString", () => {
  it("should map FREE to Free", () => {
    expect(mapTierToString("FREE")).toBe("Free");
  });

  it("should map PRO to Pro", () => {
    expect(mapTierToString("PRO")).toBe("Pro");
  });

  it("should map SCHOLAR to Scholar", () => {
    expect(mapTierToString("SCHOLAR")).toBe("Scholar");
  });

  it("should return unknown tier as-is", () => {
    expect(mapTierToString("UNKNOWN")).toBe("UNKNOWN");
  });

  it("should handle empty string", () => {
    expect(mapTierToString("")).toBe("");
  });
});

// ============================================================================
// mapToPublicUserInfo Tests
// ============================================================================

describe("mapToPublicUserInfo", () => {
  it("should map user to public info", () => {
    const user = {
      id: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      bio: "A test bio",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      tier: "PRO",
    };

    const result = mapToPublicUserInfo(user);

    expect(result.id).toBe("user-123");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.avatarUrl).toBe("https://example.com/avatar.png");
    expect(result.bio).toBe("A test bio");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.tier).toBe("Pro");
  });

  it("should handle null username", () => {
    const user = {
      id: "user-123",
      username: null,
      displayName: null,
      avatarUrl: null,
      bio: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      tier: "FREE",
    };

    const result = mapToPublicUserInfo(user);

    expect(result.username).toBe("anonymous");
  });

  it("should preserve null values for optional fields", () => {
    const user = {
      id: "user-123",
      username: "testuser",
      displayName: null,
      avatarUrl: null,
      bio: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      tier: "FREE",
    };

    const result = mapToPublicUserInfo(user);

    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.bio).toBeNull();
  });
});

// ============================================================================
// getTitleForLevel Tests
// ============================================================================

describe("getTitleForLevel", () => {
  it("should return Novice Reader for level 1", () => {
    expect(getTitleForLevel(1)).toBe("Novice Reader");
  });

  it("should return Apprentice for level 2", () => {
    expect(getTitleForLevel(2)).toBe("Apprentice");
  });

  it("should return Page Turner for level 3", () => {
    expect(getTitleForLevel(3)).toBe("Page Turner");
  });

  it("should return Bookworm for level 4", () => {
    expect(getTitleForLevel(4)).toBe("Bookworm");
  });

  it("should return Avid Reader for level 5", () => {
    expect(getTitleForLevel(5)).toBe("Avid Reader");
  });

  it("should return Literature Lover for level 6", () => {
    expect(getTitleForLevel(6)).toBe("Literature Lover");
  });

  it("should return Scholar for level 7", () => {
    expect(getTitleForLevel(7)).toBe("Scholar");
  });

  it("should return Bibliophile for level 8", () => {
    expect(getTitleForLevel(8)).toBe("Bibliophile");
  });

  it("should return Sage for level 9", () => {
    expect(getTitleForLevel(9)).toBe("Sage");
  });

  it("should return Master Reader for level 10", () => {
    expect(getTitleForLevel(10)).toBe("Master Reader");
  });

  it("should return Grand Master for levels above 10", () => {
    expect(getTitleForLevel(11)).toBe("Grand Master");
    expect(getTitleForLevel(15)).toBe("Grand Master");
    expect(getTitleForLevel(100)).toBe("Grand Master");
  });

  it("should return Novice Reader for level 0 or negative", () => {
    expect(getTitleForLevel(0)).toBe("Novice Reader");
    expect(getTitleForLevel(-1)).toBe("Novice Reader");
    expect(getTitleForLevel(-100)).toBe("Novice Reader");
  });
});

// ============================================================================
// calculateLevelInfo Tests
// ============================================================================

describe("calculateLevelInfo", () => {
  it("should return level 1 for 0 XP", () => {
    const result = calculateLevelInfo(0);
    expect(result.level).toBe(1);
    expect(result.title).toBe("Novice Reader");
    expect(result.totalXP).toBe(0);
  });

  it("should return level 1 for 50 XP", () => {
    const result = calculateLevelInfo(50);
    expect(result.level).toBe(1);
    expect(result.totalXP).toBe(50);
  });

  it("should return level 2 for 100 XP", () => {
    const result = calculateLevelInfo(100);
    expect(result.level).toBe(2);
    expect(result.title).toBe("Apprentice");
  });

  it("should return level 3 for 300 XP", () => {
    const result = calculateLevelInfo(300);
    expect(result.level).toBe(3);
    expect(result.title).toBe("Page Turner");
  });

  it("should return level 5 for 1000 XP", () => {
    const result = calculateLevelInfo(1000);
    expect(result.level).toBe(5);
    expect(result.title).toBe("Avid Reader");
  });

  it("should return level 10 for 10000 XP", () => {
    const result = calculateLevelInfo(10000);
    expect(result.level).toBe(10);
    expect(result.title).toBe("Master Reader");
  });

  it("should return level 11 for 15000 XP", () => {
    const result = calculateLevelInfo(15000);
    expect(result.level).toBe(11);
    expect(result.title).toBe("Grand Master");
  });

  it("should return level 12 for 20000 XP", () => {
    const result = calculateLevelInfo(20000);
    expect(result.level).toBe(12);
    expect(result.title).toBe("Grand Master");
  });

  it("should handle negative XP by treating as 0", () => {
    const result = calculateLevelInfo(-100);
    expect(result.level).toBe(1);
    expect(result.totalXP).toBe(0);
  });

  it("should handle very large XP values", () => {
    const result = calculateLevelInfo(1000000);
    expect(result.level).toBeGreaterThan(10);
    expect(result.title).toBe("Grand Master");
    expect(result.totalXP).toBe(1000000);
  });

  it("should calculate correct level for edge case at threshold", () => {
    // Right at level 5 threshold
    const atThreshold = calculateLevelInfo(1000);
    expect(atThreshold.level).toBe(5);

    // Just below level 5 threshold
    const belowThreshold = calculateLevelInfo(999);
    expect(belowThreshold.level).toBe(4);
  });
});

// ============================================================================
// mapToPublicStats Tests
// ============================================================================

describe("mapToPublicStats", () => {
  it("should map stats correctly", () => {
    const stats = {
      totalXP: 1500,
      level: 6,
      booksCompleted: 15,
      totalReadingTime: 72000,
      currentStreak: 14,
      longestStreak: 30,
      followersCount: 200,
      followingCount: 100,
    };

    const result = mapToPublicStats(stats);

    expect(result.levelInfo.level).toBe(6);
    expect(result.levelInfo.title).toBe("Literature Lover");
    expect(result.levelInfo.totalXP).toBe(1500);
    expect(result.booksCompleted).toBe(15);
    expect(result.totalReadingTime).toBe(72000);
    expect(result.currentStreak).toBe(14);
    expect(result.longestStreak).toBe(30);
    expect(result.followersCount).toBe(200);
    expect(result.followingCount).toBe(100);
  });

  it("should calculate level from XP, not use stored level", () => {
    const stats = {
      totalXP: 1500, // Should be level 6
      level: 3, // Stored level is wrong
      booksCompleted: 0,
      totalReadingTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      followersCount: 0,
      followingCount: 0,
    };

    const result = mapToPublicStats(stats);

    // Should calculate from XP, not use stored level
    expect(result.levelInfo.level).toBe(6);
  });

  it("should handle zero stats", () => {
    const stats = {
      totalXP: 0,
      level: 1,
      booksCompleted: 0,
      totalReadingTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      followersCount: 0,
      followingCount: 0,
    };

    const result = mapToPublicStats(stats);

    expect(result.levelInfo.level).toBe(1);
    expect(result.booksCompleted).toBe(0);
    expect(result.followersCount).toBe(0);
  });
});

// ============================================================================
// mapToAchievementInfo Tests
// ============================================================================

describe("mapToAchievementInfo", () => {
  it("should map achievement correctly", () => {
    const achievement = {
      achievementId: "ach-123",
      earnedAt: new Date("2024-06-15T12:00:00.000Z"),
      achievement: {
        name: "First Steps",
        description: "Complete your first book",
        badgeIcon: "book",
        tier: "COMMON",
      },
    };

    const result = mapToAchievementInfo(achievement);

    expect(result.id).toBe("ach-123");
    expect(result.name).toBe("First Steps");
    expect(result.description).toBe("Complete your first book");
    expect(result.icon).toBe("book");
    expect(result.rarity).toBe("common");
    expect(result.earnedAt).toBe("2024-06-15T12:00:00.000Z");
  });

  it("should handle different tier values and lowercase them", () => {
    const tiers = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];

    for (const tier of tiers) {
      const achievement = {
        achievementId: "ach-123",
        earnedAt: new Date(),
        achievement: {
          name: "Test",
          description: "Test description",
          badgeIcon: "star",
          tier,
        },
      };

      const result = mapToAchievementInfo(achievement);
      expect(result.rarity).toBe(tier.toLowerCase());
    }
  });

  it("should handle null badgeIcon", () => {
    const achievement = {
      achievementId: "ach-123",
      earnedAt: new Date("2024-06-15T12:00:00.000Z"),
      achievement: {
        name: "First Steps",
        description: "Complete your first book",
        badgeIcon: null,
        tier: "COMMON",
      },
    };

    const result = mapToAchievementInfo(achievement);
    expect(result.icon).toBeNull();
  });
});

// ============================================================================
// createBookCompletedActivity Tests
// ============================================================================

describe("createBookCompletedActivity", () => {
  it("should create activity item for completed book", () => {
    const book = {
      title: "The Great Gatsby",
      completedAt: new Date("2024-06-15T12:00:00.000Z"),
    };

    const result = createBookCompletedActivity(book);

    expect(result.type).toBe("book_completed");
    expect(result.title).toBe('Completed "The Great Gatsby"');
    expect(result.description).toBeNull();
    expect(result.timestamp).toBe("2024-06-15T12:00:00.000Z");
  });

  it("should handle book with special characters in title", () => {
    const book = {
      title: 'War & Peace: "A Novel"',
      completedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    const result = createBookCompletedActivity(book);

    expect(result.title).toBe('Completed "War & Peace: "A Novel""');
  });

  it("should handle empty book title", () => {
    const book = {
      title: "",
      completedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    const result = createBookCompletedActivity(book);

    expect(result.title).toBe('Completed ""');
  });
});

// ============================================================================
// createAchievementActivity Tests
// ============================================================================

describe("createAchievementActivity", () => {
  it("should create activity item for earned achievement", () => {
    const achievement = {
      name: "Bookworm",
      earnedAt: new Date("2024-06-15T12:00:00.000Z"),
    };

    const result = createAchievementActivity(achievement);

    expect(result.type).toBe("achievement_earned");
    expect(result.title).toBe('Earned "Bookworm"');
    expect(result.description).toBeNull();
    expect(result.timestamp).toBe("2024-06-15T12:00:00.000Z");
  });

  it("should handle achievement with special characters", () => {
    const achievement = {
      name: "Speed Reader: Level 1",
      earnedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    const result = createAchievementActivity(achievement);

    expect(result.title).toBe('Earned "Speed Reader: Level 1"');
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge cases", () => {
  describe("parseQueryParams edge cases", () => {
    it("should handle empty object", () => {
      const result = parseQueryParams({});
      expect(result.includeActivity).toBe(false);
      expect(result.includeAchievements).toBe(true);
    });

    it("should handle case sensitivity", () => {
      // Only exact "true" and "false" strings work
      const result1 = parseQueryParams({ includeActivity: "TRUE" });
      const result2 = parseQueryParams({ includeActivity: "True" });
      const result3 = parseQueryParams({ includeAchievements: "FALSE" });

      expect(result1.includeActivity).toBe(false);
      expect(result2.includeActivity).toBe(false);
      expect(result3.includeAchievements).toBe(true);
    });
  });

  describe("calculateLevelInfo edge cases", () => {
    it("should handle XP just below threshold", () => {
      const result = calculateLevelInfo(99);
      expect(result.level).toBe(1);
    });

    it("should handle XP exactly at threshold", () => {
      const result = calculateLevelInfo(100);
      expect(result.level).toBe(2);
    });

    it("should handle XP just above threshold", () => {
      const result = calculateLevelInfo(101);
      expect(result.level).toBe(2);
    });
  });

  describe("mapToPublicUserInfo edge cases", () => {
    it("should handle very long bio", () => {
      const longBio = "A".repeat(10000);
      const user = {
        id: "user-123",
        username: "testuser",
        displayName: null,
        avatarUrl: null,
        bio: longBio,
        createdAt: new Date(),
        tier: "FREE",
      };

      const result = mapToPublicUserInfo(user);
      expect(result.bio).toBe(longBio);
    });

    it("should handle unicode in username", () => {
      const user = {
        id: "user-123",
        username: null, // Should become "anonymous"
        displayName: "Test \u00E9\u00E0\u00FC",
        avatarUrl: null,
        bio: null,
        createdAt: new Date(),
        tier: "FREE",
      };

      const result = mapToPublicUserInfo(user);
      expect(result.displayName).toBe("Test \u00E9\u00E0\u00FC");
    });
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration scenarios", () => {
  it("should handle full profile workflow for public user", () => {
    // Parse params
    const params = parseQueryParams({
      includeActivity: "true",
      includeAchievements: "true",
    });
    expect(params.includeActivity).toBe(true);
    expect(params.includeAchievements).toBe(true);

    // Build cache key
    const cacheKey = buildProfileCacheKey("testuser", params);
    expect(cacheKey).toContain("testuser");
    expect(cacheKey).toContain("activity");
    expect(cacheKey).toContain("achievements");

    // Map user info
    const user = {
      id: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      bio: "Hello!",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      tier: "PRO",
    };
    const publicInfo = mapToPublicUserInfo(user);
    expect(publicInfo.username).toBe("testuser");
    expect(publicInfo.tier).toBe("Pro");

    // Map stats
    const stats = {
      totalXP: 2500,
      level: 7,
      booksCompleted: 25,
      totalReadingTime: 180000,
      currentStreak: 30,
      longestStreak: 45,
      followersCount: 500,
      followingCount: 200,
    };
    const publicStats = mapToPublicStats(stats);
    expect(publicStats.levelInfo.level).toBe(7);
    expect(publicStats.levelInfo.title).toBe("Scholar");

    // Map achievements
    const achievement = {
      achievementId: "ach-001",
      earnedAt: new Date("2024-06-01T00:00:00.000Z"),
      achievement: {
        name: "Dedicated Reader",
        description: "Read for 7 consecutive days",
        badgeIcon: "calendar",
        tier: "RARE",
      },
    };
    const achievementInfo = mapToAchievementInfo(achievement);
    expect(achievementInfo.name).toBe("Dedicated Reader");
    expect(achievementInfo.rarity).toBe("rare");

    // Create activity
    const bookActivity = createBookCompletedActivity({
      title: "1984",
      completedAt: new Date("2024-06-15T00:00:00.000Z"),
    });
    expect(bookActivity.type).toBe("book_completed");

    const achActivity = createAchievementActivity({
      name: "Dedicated Reader",
      earnedAt: new Date("2024-06-01T00:00:00.000Z"),
    });
    expect(achActivity.type).toBe("achievement_earned");
  });

  it("should handle minimal profile (private settings)", () => {
    const params = parseQueryParams({
      includeActivity: "false",
      includeAchievements: "false",
    });
    expect(params.includeActivity).toBe(false);
    expect(params.includeAchievements).toBe(false);

    const user = {
      id: "user-456",
      username: "private_user",
      displayName: null,
      avatarUrl: null,
      bio: null,
      createdAt: new Date(),
      tier: "FREE",
    };
    const publicInfo = mapToPublicUserInfo(user);
    expect(publicInfo.displayName).toBeNull();
    expect(publicInfo.bio).toBeNull();
  });

  it("should handle high-level user profile", () => {
    const stats = {
      totalXP: 100000, // Very high XP
      level: 28, // Should be recalculated
      booksCompleted: 500,
      totalReadingTime: 3600000,
      currentStreak: 365,
      longestStreak: 400,
      followersCount: 10000,
      followingCount: 500,
    };

    const publicStats = mapToPublicStats(stats);

    // Level should be calculated from XP: 10000 + (level - 10) * 5000 = 100000
    // So (100000 - 10000) / 5000 = 18 additional levels
    // Level = 10 + 18 = 28
    expect(publicStats.levelInfo.level).toBe(28);
    expect(publicStats.levelInfo.title).toBe("Grand Master");
  });

  it("should correctly build different cache keys for same user", () => {
    const key1 = buildProfileCacheKey("user1", {
      includeActivity: true,
      includeAchievements: true,
    });
    const key2 = buildProfileCacheKey("user1", {
      includeActivity: false,
      includeAchievements: true,
    });
    const key3 = buildProfileCacheKey("user1", {
      includeActivity: true,
      includeAchievements: false,
    });
    const key4 = buildProfileCacheKey("user1", {
      includeActivity: false,
      includeAchievements: false,
    });

    // All keys should be different
    const uniqueKeys = new Set([key1, key2, key3, key4]);
    expect(uniqueKeys.size).toBe(4);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response structure validation", () => {
  it("should create valid ProfileResponse with all data", () => {
    const response: ProfileResponse = {
      user: {
        id: "user-123",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
        bio: "Test bio",
        createdAt: "2024-01-01T00:00:00.000Z",
        tier: "Pro",
      },
      stats: {
        levelInfo: { level: 5, title: "Avid Reader", totalXP: 1200 },
        booksCompleted: 10,
        totalReadingTime: 36000,
        currentStreak: 7,
        longestStreak: 14,
        followersCount: 100,
        followingCount: 50,
      },
      activity: [
        {
          type: "book_completed",
          title: 'Completed "Test Book"',
          description: null,
          timestamp: "2024-06-15T00:00:00.000Z",
        },
      ],
      achievements: [
        {
          id: "ach-123",
          name: "First Steps",
          description: "Complete your first book",
          icon: "book", // badgeIcon is mapped to icon
          rarity: "common", // tier is lowercased to rarity
          earnedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
      social: {
        isFollowing: true,
        isFollowedBy: false,
        isOwnProfile: false,
      },
    };

    expect(response.user).toBeDefined();
    expect(response.stats).toBeDefined();
    expect(response.activity).toHaveLength(1);
    expect(response.achievements).toHaveLength(1);
    expect(response.social.isFollowing).toBe(true);
  });

  it("should create valid ProfileResponse with minimal data", () => {
    const response: ProfileResponse = {
      user: {
        id: "user-123",
        username: "testuser",
        displayName: null,
        avatarUrl: null,
        bio: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        tier: "Free",
      },
      stats: null,
      activity: null,
      achievements: null,
      social: {
        isFollowing: false,
        isFollowedBy: false,
        isOwnProfile: true,
      },
    };

    expect(response.user).toBeDefined();
    expect(response.stats).toBeNull();
    expect(response.activity).toBeNull();
    expect(response.achievements).toBeNull();
    expect(response.social.isOwnProfile).toBe(true);
  });
});
