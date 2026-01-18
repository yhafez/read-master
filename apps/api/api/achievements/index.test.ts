/**
 * Tests for achievements API endpoints
 *
 * Tests cover:
 * - Type exports and response structures
 * - mapAchievementToResponse helper function
 * - calculateLevelFromXP helper function
 * - Achievement mapping and status tracking
 * - Category statistics calculation
 * - XP awarding and level up logic
 */

import { describe, it, expect } from "vitest";
import type {
  AchievementDefinition,
  AchievementCriterion,
  TimeBasedCriterion,
} from "@read-master/shared";
import {
  type AchievementWithStatus,
  type AchievementsListResponse,
  type AchievementsCheckResponse,
  mapAchievementToResponse,
  calculateLevelFromXP,
} from "./index.js";

// ============================================================================
// Test Fixtures
// ============================================================================

const mockAchievementDefinition: AchievementDefinition = {
  code: "test_achievement",
  name: "Test Achievement",
  description: "A test achievement for unit tests",
  category: "READING",
  tier: "COMMON",
  xpReward: 100,
  badgeIcon: "test_icon",
  badgeColor: "#FF0000",
  sortOrder: 100,
  criteria: [{ type: "booksCompleted", operator: ">=", value: 1 }],
  isActive: true,
};

const mockUncommonAchievement: AchievementDefinition = {
  code: "uncommon_test",
  name: "Uncommon Test",
  description: "An uncommon test achievement",
  category: "STREAK",
  tier: "UNCOMMON",
  xpReward: 500,
  badgeIcon: "fire_icon",
  badgeColor: "#FF5722",
  sortOrder: 200,
  criteria: [{ type: "currentStreak", operator: ">=", value: 7 }],
  isActive: true,
};

// ============================================================================
// Type Tests
// ============================================================================

describe("Type Exports", () => {
  it("should have correct AchievementWithStatus structure", () => {
    const achievementWithStatus: AchievementWithStatus = {
      code: "test",
      name: "Test",
      description: "Test description",
      category: "READING",
      tier: "COMMON",
      xpReward: 100,
      badgeIcon: "icon",
      badgeColor: "#000000",
      sortOrder: 1,
      isActive: true,
      isUnlocked: false,
      unlockedAt: null,
    };

    expect(achievementWithStatus).toBeDefined();
    expect(achievementWithStatus.code).toBe("test");
    expect(achievementWithStatus.isUnlocked).toBe(false);
    expect(achievementWithStatus.unlockedAt).toBeNull();
  });

  it("should have correct AchievementsListResponse structure", () => {
    const response: AchievementsListResponse = {
      achievements: [],
      totalCount: 0,
      unlockedCount: 0,
      categories: [],
    };

    expect(response).toBeDefined();
    expect(Array.isArray(response.achievements)).toBe(true);
    expect(typeof response.totalCount).toBe("number");
    expect(typeof response.unlockedCount).toBe("number");
    expect(Array.isArray(response.categories)).toBe(true);
  });

  it("should have correct AchievementsCheckResponse structure", () => {
    const response: AchievementsCheckResponse = {
      newlyUnlocked: [],
      totalXpAwarded: 0,
      previousXp: 0,
      newXp: 0,
      previousLevel: 1,
      newLevel: 1,
      leveledUp: false,
    };

    expect(response).toBeDefined();
    expect(Array.isArray(response.newlyUnlocked)).toBe(true);
    expect(typeof response.totalXpAwarded).toBe("number");
    expect(typeof response.leveledUp).toBe("boolean");
  });

  it("should have correct category structure in AchievementsListResponse", () => {
    const response: AchievementsListResponse = {
      achievements: [],
      totalCount: 10,
      unlockedCount: 3,
      categories: [
        { name: "READING", total: 4, unlocked: 2 },
        { name: "STREAK", total: 3, unlocked: 1 },
        { name: "LEARNING", total: 3, unlocked: 0 },
      ],
    };

    expect(response.categories).toHaveLength(3);
    expect(response.categories[0]).toHaveProperty("name");
    expect(response.categories[0]).toHaveProperty("total");
    expect(response.categories[0]).toHaveProperty("unlocked");
  });
});

// ============================================================================
// mapAchievementToResponse Tests
// ============================================================================

describe("mapAchievementToResponse", () => {
  it("should map unlocked achievement correctly", () => {
    const unlockedDate = new Date("2024-01-15T10:30:00Z");
    const result = mapAchievementToResponse(
      mockAchievementDefinition,
      true,
      unlockedDate
    );

    expect(result.code).toBe("test_achievement");
    expect(result.name).toBe("Test Achievement");
    expect(result.description).toBe("A test achievement for unit tests");
    expect(result.category).toBe("READING");
    expect(result.tier).toBe("COMMON");
    expect(result.xpReward).toBe(100);
    expect(result.badgeIcon).toBe("test_icon");
    expect(result.badgeColor).toBe("#FF0000");
    expect(result.sortOrder).toBe(100);
    expect(result.isActive).toBe(true);
    expect(result.isUnlocked).toBe(true);
    expect(result.unlockedAt).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should map locked achievement correctly", () => {
    const result = mapAchievementToResponse(
      mockAchievementDefinition,
      false,
      null
    );

    expect(result.code).toBe("test_achievement");
    expect(result.isUnlocked).toBe(false);
    expect(result.unlockedAt).toBeNull();
  });

  it("should preserve all achievement properties", () => {
    const result = mapAchievementToResponse(
      mockUncommonAchievement,
      false,
      null
    );

    expect(result.code).toBe("uncommon_test");
    expect(result.name).toBe("Uncommon Test");
    expect(result.category).toBe("STREAK");
    expect(result.tier).toBe("UNCOMMON");
    expect(result.xpReward).toBe(500);
    expect(result.sortOrder).toBe(200);
  });

  it("should format date as ISO string", () => {
    const date = new Date("2024-06-15T23:59:59.999Z");
    const result = mapAchievementToResponse(
      mockAchievementDefinition,
      true,
      date
    );

    expect(result.unlockedAt).toBe("2024-06-15T23:59:59.999Z");
  });

  it("should handle inactive achievements", () => {
    const inactiveAchievement: AchievementDefinition = {
      ...mockAchievementDefinition,
      isActive: false,
    };

    const result = mapAchievementToResponse(inactiveAchievement, false, null);

    expect(result.isActive).toBe(false);
    expect(result.isUnlocked).toBe(false);
  });
});

// ============================================================================
// calculateLevelFromXP Tests
// ============================================================================

describe("calculateLevelFromXP", () => {
  describe("levels 1-10 (predefined thresholds)", () => {
    it("should return level 1 for 0 XP", () => {
      expect(calculateLevelFromXP(0)).toBe(1);
    });

    it("should return level 1 for 99 XP", () => {
      expect(calculateLevelFromXP(99)).toBe(1);
    });

    it("should return level 2 for 100 XP", () => {
      expect(calculateLevelFromXP(100)).toBe(2);
    });

    it("should return level 2 for 299 XP", () => {
      expect(calculateLevelFromXP(299)).toBe(2);
    });

    it("should return level 3 for 300 XP", () => {
      expect(calculateLevelFromXP(300)).toBe(3);
    });

    it("should return level 4 for 600 XP", () => {
      expect(calculateLevelFromXP(600)).toBe(4);
    });

    it("should return level 5 for 1000 XP", () => {
      expect(calculateLevelFromXP(1000)).toBe(5);
    });

    it("should return level 6 for 1500 XP", () => {
      expect(calculateLevelFromXP(1500)).toBe(6);
    });

    it("should return level 7 for 2500 XP", () => {
      expect(calculateLevelFromXP(2500)).toBe(7);
    });

    it("should return level 8 for 4000 XP", () => {
      expect(calculateLevelFromXP(4000)).toBe(8);
    });

    it("should return level 9 for 6000 XP", () => {
      expect(calculateLevelFromXP(6000)).toBe(9);
    });

    it("should return level 10 for 10000 XP", () => {
      expect(calculateLevelFromXP(10000)).toBe(10);
    });

    it("should return level 10 for 14999 XP", () => {
      expect(calculateLevelFromXP(14999)).toBe(10);
    });
  });

  describe("levels 11+ (dynamic calculation)", () => {
    it("should return level 11 for 15000 XP", () => {
      expect(calculateLevelFromXP(15000)).toBe(11);
    });

    it("should return level 11 for 19999 XP", () => {
      expect(calculateLevelFromXP(19999)).toBe(11);
    });

    it("should return level 12 for 20000 XP", () => {
      expect(calculateLevelFromXP(20000)).toBe(12);
    });

    it("should return level 13 for 25000 XP", () => {
      expect(calculateLevelFromXP(25000)).toBe(13);
    });

    it("should return level 20 for 60000 XP", () => {
      // Level 10 = 10000 XP, each level after = +5000
      // Level 20 = 10000 + (10 * 5000) = 60000
      expect(calculateLevelFromXP(60000)).toBe(20);
    });

    it("should handle very high XP values", () => {
      // Level 100 = 10000 + (90 * 5000) = 460000
      expect(calculateLevelFromXP(460000)).toBe(100);
    });
  });

  describe("edge cases", () => {
    it("should return level 1 for negative XP", () => {
      expect(calculateLevelFromXP(-100)).toBe(1);
    });

    it("should handle XP at exact thresholds", () => {
      expect(calculateLevelFromXP(0)).toBe(1);
      expect(calculateLevelFromXP(100)).toBe(2);
      expect(calculateLevelFromXP(300)).toBe(3);
      expect(calculateLevelFromXP(600)).toBe(4);
      expect(calculateLevelFromXP(1000)).toBe(5);
      expect(calculateLevelFromXP(1500)).toBe(6);
      expect(calculateLevelFromXP(2500)).toBe(7);
      expect(calculateLevelFromXP(4000)).toBe(8);
      expect(calculateLevelFromXP(6000)).toBe(9);
      expect(calculateLevelFromXP(10000)).toBe(10);
      expect(calculateLevelFromXP(15000)).toBe(11);
    });

    it("should handle XP just below thresholds", () => {
      expect(calculateLevelFromXP(99)).toBe(1);
      expect(calculateLevelFromXP(299)).toBe(2);
      expect(calculateLevelFromXP(599)).toBe(3);
      expect(calculateLevelFromXP(999)).toBe(4);
      expect(calculateLevelFromXP(1499)).toBe(5);
      expect(calculateLevelFromXP(2499)).toBe(6);
      expect(calculateLevelFromXP(3999)).toBe(7);
      expect(calculateLevelFromXP(5999)).toBe(8);
      expect(calculateLevelFromXP(9999)).toBe(9);
      expect(calculateLevelFromXP(14999)).toBe(10);
    });
  });
});

// ============================================================================
// Achievement Response Building Tests
// ============================================================================

describe("Achievement Response Building", () => {
  it("should build a complete list response", () => {
    const achievements: AchievementWithStatus[] = [
      mapAchievementToResponse(mockAchievementDefinition, true, new Date()),
      mapAchievementToResponse(mockUncommonAchievement, false, null),
    ];

    const response: AchievementsListResponse = {
      achievements,
      totalCount: achievements.length,
      unlockedCount: achievements.filter((a) => a.isUnlocked).length,
      categories: [
        { name: "READING", total: 1, unlocked: 1 },
        { name: "STREAK", total: 1, unlocked: 0 },
      ],
    };

    expect(response.totalCount).toBe(2);
    expect(response.unlockedCount).toBe(1);
    expect(response.categories).toHaveLength(2);
  });

  it("should build a complete check response with level up", () => {
    const newlyUnlocked: AchievementWithStatus[] = [
      mapAchievementToResponse(mockAchievementDefinition, true, new Date()),
    ];

    const response: AchievementsCheckResponse = {
      newlyUnlocked,
      totalXpAwarded: 100,
      previousXp: 50,
      newXp: 150,
      previousLevel: 1,
      newLevel: 2,
      leveledUp: true,
    };

    expect(response.newlyUnlocked).toHaveLength(1);
    expect(response.totalXpAwarded).toBe(100);
    expect(response.leveledUp).toBe(true);
    expect(response.newLevel).toBeGreaterThan(response.previousLevel);
  });

  it("should build a check response without level up", () => {
    const response: AchievementsCheckResponse = {
      newlyUnlocked: [],
      totalXpAwarded: 0,
      previousXp: 50,
      newXp: 50,
      previousLevel: 1,
      newLevel: 1,
      leveledUp: false,
    };

    expect(response.newlyUnlocked).toHaveLength(0);
    expect(response.totalXpAwarded).toBe(0);
    expect(response.leveledUp).toBe(false);
  });

  it("should handle multiple achievements unlocked at once", () => {
    const now = new Date();
    const newlyUnlocked: AchievementWithStatus[] = [
      mapAchievementToResponse(mockAchievementDefinition, true, now),
      mapAchievementToResponse(mockUncommonAchievement, true, now),
    ];

    const totalXp =
      mockAchievementDefinition.xpReward + mockUncommonAchievement.xpReward;

    const response: AchievementsCheckResponse = {
      newlyUnlocked,
      totalXpAwarded: totalXp,
      previousXp: 0,
      newXp: totalXp,
      previousLevel: 1,
      newLevel: calculateLevelFromXP(totalXp),
      leveledUp: calculateLevelFromXP(totalXp) > 1,
    };

    expect(response.newlyUnlocked).toHaveLength(2);
    expect(response.totalXpAwarded).toBe(600); // 100 + 500
    expect(response.newLevel).toBe(4); // 600 XP = level 4
    expect(response.leveledUp).toBe(true);
  });
});

// ============================================================================
// Category Statistics Tests
// ============================================================================

describe("Category Statistics", () => {
  it("should calculate category statistics correctly", () => {
    const achievements: AchievementWithStatus[] = [
      {
        ...mapAchievementToResponse(
          mockAchievementDefinition,
          true,
          new Date()
        ),
        category: "READING",
      },
      {
        ...mapAchievementToResponse(
          mockAchievementDefinition,
          true,
          new Date()
        ),
        category: "READING",
        code: "reading2",
      },
      {
        ...mapAchievementToResponse(mockAchievementDefinition, false, null),
        category: "READING",
        code: "reading3",
      },
      {
        ...mapAchievementToResponse(mockUncommonAchievement, true, new Date()),
        category: "STREAK",
      },
      {
        ...mapAchievementToResponse(mockUncommonAchievement, false, null),
        category: "STREAK",
        code: "streak2",
      },
    ];

    // Calculate category stats
    const categoryMap = new Map<string, { total: number; unlocked: number }>();
    for (const achievement of achievements) {
      const stats = categoryMap.get(achievement.category) ?? {
        total: 0,
        unlocked: 0,
      };
      stats.total++;
      if (achievement.isUnlocked) {
        stats.unlocked++;
      }
      categoryMap.set(achievement.category, stats);
    }

    const categories = Array.from(categoryMap.entries()).map(
      ([name, stats]) => ({
        name,
        total: stats.total,
        unlocked: stats.unlocked,
      })
    );

    expect(categories).toHaveLength(2);

    const readingCategory = categories.find((c) => c.name === "READING");
    expect(readingCategory?.total).toBe(3);
    expect(readingCategory?.unlocked).toBe(2);

    const streakCategory = categories.find((c) => c.name === "STREAK");
    expect(streakCategory?.total).toBe(2);
    expect(streakCategory?.unlocked).toBe(1);
  });

  it("should handle empty achievement list", () => {
    const achievements: AchievementWithStatus[] = [];

    const categoryMap = new Map<string, { total: number; unlocked: number }>();
    for (const achievement of achievements) {
      const stats = categoryMap.get(achievement.category) ?? {
        total: 0,
        unlocked: 0,
      };
      stats.total++;
      if (achievement.isUnlocked) {
        stats.unlocked++;
      }
      categoryMap.set(achievement.category, stats);
    }

    const categories = Array.from(categoryMap.entries());
    expect(categories).toHaveLength(0);
  });

  it("should handle all unlocked achievements", () => {
    const achievements: AchievementWithStatus[] = [
      mapAchievementToResponse(mockAchievementDefinition, true, new Date()),
      mapAchievementToResponse(mockUncommonAchievement, true, new Date()),
    ];

    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
    expect(unlockedCount).toBe(2);
  });

  it("should handle no unlocked achievements", () => {
    const achievements: AchievementWithStatus[] = [
      mapAchievementToResponse(mockAchievementDefinition, false, null),
      mapAchievementToResponse(mockUncommonAchievement, false, null),
    ];

    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
    expect(unlockedCount).toBe(0);
  });
});

// ============================================================================
// XP Awarding Logic Tests
// ============================================================================

describe("XP Awarding Logic", () => {
  it("should correctly calculate XP from single achievement", () => {
    const totalXp = mockAchievementDefinition.xpReward;
    expect(totalXp).toBe(100);
  });

  it("should correctly sum XP from multiple achievements", () => {
    const achievements: AchievementDefinition[] = [
      mockAchievementDefinition,
      mockUncommonAchievement,
    ];

    const totalXp = achievements.reduce((sum, a) => sum + a.xpReward, 0);
    expect(totalXp).toBe(600);
  });

  it("should detect level up correctly", () => {
    const previousXp = 50; // Level 1
    const xpAwarded = 100;
    const newXp = previousXp + xpAwarded; // 150 = Level 2

    const previousLevel = calculateLevelFromXP(previousXp);
    const newLevel = calculateLevelFromXP(newXp);
    const leveledUp = newLevel > previousLevel;

    expect(previousLevel).toBe(1);
    expect(newLevel).toBe(2);
    expect(leveledUp).toBe(true);
  });

  it("should not detect level up when within same level", () => {
    const previousXp = 110; // Level 2
    const xpAwarded = 50;
    const newXp = previousXp + xpAwarded; // 160 = still Level 2

    const previousLevel = calculateLevelFromXP(previousXp);
    const newLevel = calculateLevelFromXP(newXp);
    const leveledUp = newLevel > previousLevel;

    expect(previousLevel).toBe(2);
    expect(newLevel).toBe(2);
    expect(leveledUp).toBe(false);
  });

  it("should detect multiple level ups", () => {
    const previousXp = 0; // Level 1
    const xpAwarded = 1500; // Enough for level 6
    const newXp = previousXp + xpAwarded;

    const previousLevel = calculateLevelFromXP(previousXp);
    const newLevel = calculateLevelFromXP(newXp);
    const leveledUp = newLevel > previousLevel;

    expect(previousLevel).toBe(1);
    expect(newLevel).toBe(6);
    expect(leveledUp).toBe(true);
  });

  it("should handle level up past level 10", () => {
    const previousXp = 9500; // Level 9
    const xpAwarded = 6000;
    const newXp = previousXp + xpAwarded; // 15500 = Level 11

    const previousLevel = calculateLevelFromXP(previousXp);
    const newLevel = calculateLevelFromXP(newXp);
    const leveledUp = newLevel > previousLevel;

    expect(previousLevel).toBe(9);
    expect(newLevel).toBe(11);
    expect(leveledUp).toBe(true);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration Tests", () => {
  it("should correctly simulate full achievement check flow", () => {
    // Simulate a user who just completed their first book
    const stats = {
      booksCompleted: 1,
      currentStreak: 0,
      cardsReviewed: 0,
    };

    // Find achievements that would be unlocked
    const achievementsToCheck: AchievementDefinition[] = [
      mockAchievementDefinition, // Requires booksCompleted >= 1
      mockUncommonAchievement, // Requires currentStreak >= 7
    ];

    const unlocked = achievementsToCheck.filter((achievement) => {
      // Simple criteria check
      return achievement.criteria.every(
        (criterion: AchievementCriterion | TimeBasedCriterion) => {
          if ("type" in criterion && criterion.type === "booksCompleted") {
            return (stats.booksCompleted ?? 0) >= criterion.value;
          }
          if ("type" in criterion && criterion.type === "currentStreak") {
            return (stats.currentStreak ?? 0) >= criterion.value;
          }
          return false;
        }
      );
    });

    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.code).toBe("test_achievement");
  });

  it("should build correct response for newly unlocked achievements", () => {
    const now = new Date();
    const unlockedAchievement = mockAchievementDefinition;

    const achievementWithStatus = mapAchievementToResponse(
      unlockedAchievement,
      true,
      now
    );

    const previousXp = 0;
    const totalXpAwarded = unlockedAchievement.xpReward;
    const newXp = previousXp + totalXpAwarded;

    const response: AchievementsCheckResponse = {
      newlyUnlocked: [achievementWithStatus],
      totalXpAwarded,
      previousXp,
      newXp,
      previousLevel: calculateLevelFromXP(previousXp),
      newLevel: calculateLevelFromXP(newXp),
      leveledUp: calculateLevelFromXP(newXp) > calculateLevelFromXP(previousXp),
    };

    expect(response.newlyUnlocked).toHaveLength(1);
    expect(response.newlyUnlocked[0]?.code).toBe("test_achievement");
    expect(response.totalXpAwarded).toBe(100);
    expect(response.previousXp).toBe(0);
    expect(response.newXp).toBe(100);
    expect(response.previousLevel).toBe(1);
    expect(response.newLevel).toBe(2);
    expect(response.leveledUp).toBe(true);
  });

  it("should handle no achievements unlocked", () => {
    const response: AchievementsCheckResponse = {
      newlyUnlocked: [],
      totalXpAwarded: 0,
      previousXp: 500,
      newXp: 500,
      previousLevel: 4,
      newLevel: 4,
      leveledUp: false,
    };

    expect(response.newlyUnlocked).toHaveLength(0);
    expect(response.totalXpAwarded).toBe(0);
    expect(response.leveledUp).toBe(false);
  });

  it("should sort achievements by sortOrder", () => {
    const achievements: AchievementWithStatus[] = [
      {
        ...mapAchievementToResponse(mockUncommonAchievement, false, null),
        sortOrder: 200,
      },
      {
        ...mapAchievementToResponse(
          mockAchievementDefinition,
          true,
          new Date()
        ),
        sortOrder: 100,
      },
    ];

    // Sort by sortOrder
    const sorted = [...achievements].sort((a, b) => a.sortOrder - b.sortOrder);

    expect(sorted[0]?.sortOrder).toBe(100);
    expect(sorted[1]?.sortOrder).toBe(200);
    expect(sorted[0]?.code).toBe("test_achievement");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle achievement with zero XP reward", () => {
    const zeroXpAchievement: AchievementDefinition = {
      ...mockAchievementDefinition,
      xpReward: 0,
    };

    const result = mapAchievementToResponse(
      zeroXpAchievement,
      true,
      new Date()
    );
    expect(result.xpReward).toBe(0);
  });

  it("should handle achievement with very high XP reward", () => {
    const highXpAchievement: AchievementDefinition = {
      ...mockAchievementDefinition,
      xpReward: 100000,
    };

    const newXp = highXpAchievement.xpReward;
    const newLevel = calculateLevelFromXP(newXp);

    // 100000 XP = Level 10 + (90000 / 5000) = Level 10 + 18 = Level 28
    expect(newLevel).toBe(28);
  });

  it("should handle empty code and name", () => {
    const emptyAchievement: AchievementDefinition = {
      ...mockAchievementDefinition,
      code: "",
      name: "",
    };

    const result = mapAchievementToResponse(emptyAchievement, false, null);
    expect(result.code).toBe("");
    expect(result.name).toBe("");
  });

  it("should handle special characters in achievement fields", () => {
    const specialAchievement: AchievementDefinition = {
      ...mockAchievementDefinition,
      code: "special_achievement_123",
      name: "Special <Achievement> & More",
      description: "Description with 'quotes' and \"double quotes\"",
    };

    const result = mapAchievementToResponse(
      specialAchievement,
      true,
      new Date()
    );
    expect(result.code).toBe("special_achievement_123");
    expect(result.name).toBe("Special <Achievement> & More");
    expect(result.description).toBe(
      "Description with 'quotes' and \"double quotes\""
    );
  });

  it("should handle date at epoch", () => {
    const epochDate = new Date(0);
    const result = mapAchievementToResponse(
      mockAchievementDefinition,
      true,
      epochDate
    );
    expect(result.unlockedAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("should handle future unlock date", () => {
    const futureDate = new Date("2099-12-31T23:59:59.999Z");
    const result = mapAchievementToResponse(
      mockAchievementDefinition,
      true,
      futureDate
    );
    expect(result.unlockedAt).toBe("2099-12-31T23:59:59.999Z");
  });
});
