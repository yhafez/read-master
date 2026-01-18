/**
 * Tests for GET /api/stats - Gamification stats endpoint
 */

import { describe, it, expect } from "vitest";
import {
  LEVEL_THRESHOLDS,
  XP_PER_LEVEL_AFTER_10,
  GRAND_MASTER_TITLE,
  MAX_DEFINED_LEVEL,
  getXPRequiredForLevel,
  getTitleForLevel,
  calculateLevelFromXP,
  formatDateOrNull,
} from "./index.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  describe("LEVEL_THRESHOLDS", () => {
    it("should have exactly 10 predefined levels", () => {
      expect(LEVEL_THRESHOLDS).toHaveLength(10);
    });

    it("should start at level 1 with 0 XP", () => {
      expect(LEVEL_THRESHOLDS[0]).toEqual({
        level: 1,
        xpRequired: 0,
        title: "Novice Reader",
      });
    });

    it("should end at level 10 with 10000 XP", () => {
      expect(LEVEL_THRESHOLDS[9]).toEqual({
        level: 10,
        xpRequired: 10000,
        title: "Master Reader",
      });
    });

    it("should have XP thresholds in ascending order", () => {
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        const current = LEVEL_THRESHOLDS[i];
        const previous = LEVEL_THRESHOLDS[i - 1];
        if (current && previous) {
          expect(current.xpRequired).toBeGreaterThan(previous.xpRequired);
        }
      }
    });

    it("should have levels in ascending order", () => {
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        const current = LEVEL_THRESHOLDS[i];
        const previous = LEVEL_THRESHOLDS[i - 1];
        if (current && previous) {
          expect(current.level).toBe(previous.level + 1);
        }
      }
    });

    it("should have unique titles for each level", () => {
      const titles = LEVEL_THRESHOLDS.map((t) => t.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it("should match specifications for each level", () => {
      const expectedThresholds = [
        { level: 1, xpRequired: 0, title: "Novice Reader" },
        { level: 2, xpRequired: 100, title: "Apprentice" },
        { level: 3, xpRequired: 300, title: "Page Turner" },
        { level: 4, xpRequired: 600, title: "Bookworm" },
        { level: 5, xpRequired: 1000, title: "Avid Reader" },
        { level: 6, xpRequired: 1500, title: "Literature Lover" },
        { level: 7, xpRequired: 2500, title: "Scholar" },
        { level: 8, xpRequired: 4000, title: "Bibliophile" },
        { level: 9, xpRequired: 6000, title: "Sage" },
        { level: 10, xpRequired: 10000, title: "Master Reader" },
      ];
      expect(LEVEL_THRESHOLDS).toEqual(expectedThresholds);
    });
  });

  describe("XP_PER_LEVEL_AFTER_10", () => {
    it("should be 5000", () => {
      expect(XP_PER_LEVEL_AFTER_10).toBe(5000);
    });
  });

  describe("GRAND_MASTER_TITLE", () => {
    it("should be 'Grand Master'", () => {
      expect(GRAND_MASTER_TITLE).toBe("Grand Master");
    });
  });

  describe("MAX_DEFINED_LEVEL", () => {
    it("should be 10", () => {
      expect(MAX_DEFINED_LEVEL).toBe(10);
    });
  });
});

// ============================================================================
// getXPRequiredForLevel Tests
// ============================================================================

describe("getXPRequiredForLevel", () => {
  it("should return 0 for level 0", () => {
    expect(getXPRequiredForLevel(0)).toBe(0);
  });

  it("should return 0 for negative levels", () => {
    expect(getXPRequiredForLevel(-1)).toBe(0);
    expect(getXPRequiredForLevel(-100)).toBe(0);
  });

  it("should return correct XP for level 1", () => {
    expect(getXPRequiredForLevel(1)).toBe(0);
  });

  it("should return correct XP for level 2", () => {
    expect(getXPRequiredForLevel(2)).toBe(100);
  });

  it("should return correct XP for level 5", () => {
    expect(getXPRequiredForLevel(5)).toBe(1000);
  });

  it("should return correct XP for level 10", () => {
    expect(getXPRequiredForLevel(10)).toBe(10000);
  });

  it("should return correct XP for level 11", () => {
    // Level 10 (10000) + 1 * 5000 = 15000
    expect(getXPRequiredForLevel(11)).toBe(15000);
  });

  it("should return correct XP for level 12", () => {
    // Level 10 (10000) + 2 * 5000 = 20000
    expect(getXPRequiredForLevel(12)).toBe(20000);
  });

  it("should return correct XP for level 15", () => {
    // Level 10 (10000) + 5 * 5000 = 35000
    expect(getXPRequiredForLevel(15)).toBe(35000);
  });

  it("should return correct XP for level 20", () => {
    // Level 10 (10000) + 10 * 5000 = 60000
    expect(getXPRequiredForLevel(20)).toBe(60000);
  });

  it("should handle very high levels", () => {
    // Level 10 (10000) + 90 * 5000 = 460000
    expect(getXPRequiredForLevel(100)).toBe(460000);
  });
});

// ============================================================================
// getTitleForLevel Tests
// ============================================================================

describe("getTitleForLevel", () => {
  it("should return 'Novice Reader' for level 0", () => {
    expect(getTitleForLevel(0)).toBe("Novice Reader");
  });

  it("should return 'Novice Reader' for negative levels", () => {
    expect(getTitleForLevel(-1)).toBe("Novice Reader");
    expect(getTitleForLevel(-100)).toBe("Novice Reader");
  });

  it("should return 'Novice Reader' for level 1", () => {
    expect(getTitleForLevel(1)).toBe("Novice Reader");
  });

  it("should return 'Apprentice' for level 2", () => {
    expect(getTitleForLevel(2)).toBe("Apprentice");
  });

  it("should return 'Bookworm' for level 4", () => {
    expect(getTitleForLevel(4)).toBe("Bookworm");
  });

  it("should return 'Master Reader' for level 10", () => {
    expect(getTitleForLevel(10)).toBe("Master Reader");
  });

  it("should return 'Grand Master' for level 11", () => {
    expect(getTitleForLevel(11)).toBe("Grand Master");
  });

  it("should return 'Grand Master' for level 12", () => {
    expect(getTitleForLevel(12)).toBe("Grand Master");
  });

  it("should return 'Grand Master' for very high levels", () => {
    expect(getTitleForLevel(50)).toBe("Grand Master");
    expect(getTitleForLevel(100)).toBe("Grand Master");
  });

  it("should return correct titles for all predefined levels", () => {
    expect(getTitleForLevel(1)).toBe("Novice Reader");
    expect(getTitleForLevel(2)).toBe("Apprentice");
    expect(getTitleForLevel(3)).toBe("Page Turner");
    expect(getTitleForLevel(4)).toBe("Bookworm");
    expect(getTitleForLevel(5)).toBe("Avid Reader");
    expect(getTitleForLevel(6)).toBe("Literature Lover");
    expect(getTitleForLevel(7)).toBe("Scholar");
    expect(getTitleForLevel(8)).toBe("Bibliophile");
    expect(getTitleForLevel(9)).toBe("Sage");
    expect(getTitleForLevel(10)).toBe("Master Reader");
  });
});

// ============================================================================
// calculateLevelFromXP Tests
// ============================================================================

describe("calculateLevelFromXP", () => {
  describe("level 1 (0-99 XP)", () => {
    it("should return level 1 for 0 XP", () => {
      const result = calculateLevelFromXP(0);
      expect(result.level).toBe(1);
      expect(result.title).toBe("Novice Reader");
      expect(result.currentXP).toBe(0);
      expect(result.xpForCurrentLevel).toBe(0);
      expect(result.xpForNextLevel).toBe(100);
      expect(result.xpNeededForNextLevel).toBe(100);
      expect(result.progressToNextLevel).toBe(0);
    });

    it("should return level 1 for 50 XP with 50% progress", () => {
      const result = calculateLevelFromXP(50);
      expect(result.level).toBe(1);
      expect(result.progressToNextLevel).toBe(50);
      expect(result.xpNeededForNextLevel).toBe(50);
    });

    it("should return level 1 for 99 XP with 99% progress", () => {
      const result = calculateLevelFromXP(99);
      expect(result.level).toBe(1);
      expect(result.progressToNextLevel).toBe(99);
      expect(result.xpNeededForNextLevel).toBe(1);
    });

    it("should handle negative XP by treating as 0", () => {
      const result = calculateLevelFromXP(-100);
      expect(result.level).toBe(1);
      expect(result.currentXP).toBe(0);
      expect(result.progressToNextLevel).toBe(0);
    });
  });

  describe("level 2 (100-299 XP)", () => {
    it("should return level 2 for exactly 100 XP", () => {
      const result = calculateLevelFromXP(100);
      expect(result.level).toBe(2);
      expect(result.title).toBe("Apprentice");
      expect(result.currentXP).toBe(100);
      expect(result.xpForCurrentLevel).toBe(100);
      expect(result.xpForNextLevel).toBe(300);
      expect(result.progressToNextLevel).toBe(0);
      expect(result.xpNeededForNextLevel).toBe(200);
    });

    it("should return level 2 for 200 XP with 50% progress", () => {
      const result = calculateLevelFromXP(200);
      expect(result.level).toBe(2);
      expect(result.progressToNextLevel).toBe(50);
      expect(result.xpNeededForNextLevel).toBe(100);
    });

    it("should return level 2 for 299 XP", () => {
      const result = calculateLevelFromXP(299);
      expect(result.level).toBe(2);
      expect(result.progressToNextLevel).toBe(100); // (199/200)*100 = 99.5, rounded to 100
      expect(result.xpNeededForNextLevel).toBe(1);
    });
  });

  describe("level 5 (1000-1499 XP)", () => {
    it("should return level 5 for 1000 XP", () => {
      const result = calculateLevelFromXP(1000);
      expect(result.level).toBe(5);
      expect(result.title).toBe("Avid Reader");
      expect(result.xpForCurrentLevel).toBe(1000);
      expect(result.xpForNextLevel).toBe(1500);
    });

    it("should return level 5 for 1250 XP with 50% progress", () => {
      const result = calculateLevelFromXP(1250);
      expect(result.level).toBe(5);
      expect(result.progressToNextLevel).toBe(50);
    });
  });

  describe("level 10 (10000 XP)", () => {
    it("should return level 10 for exactly 10000 XP", () => {
      const result = calculateLevelFromXP(10000);
      expect(result.level).toBe(10);
      expect(result.title).toBe("Master Reader");
      expect(result.xpForCurrentLevel).toBe(10000);
      expect(result.xpForNextLevel).toBe(15000); // Level 11 threshold
    });

    it("should return level 10 for 12500 XP with 50% progress to 11", () => {
      const result = calculateLevelFromXP(12500);
      expect(result.level).toBe(10);
      expect(result.progressToNextLevel).toBe(50);
      expect(result.xpNeededForNextLevel).toBe(2500);
    });

    it("should return level 10 for 14999 XP", () => {
      const result = calculateLevelFromXP(14999);
      expect(result.level).toBe(10);
      expect(result.xpNeededForNextLevel).toBe(1);
    });
  });

  describe("level 11+ (beyond 10)", () => {
    it("should return level 11 for 15000 XP", () => {
      const result = calculateLevelFromXP(15000);
      expect(result.level).toBe(11);
      expect(result.title).toBe("Grand Master");
      expect(result.xpForCurrentLevel).toBe(15000);
      expect(result.xpForNextLevel).toBe(20000);
      expect(result.progressToNextLevel).toBe(0);
    });

    it("should return level 12 for 20000 XP", () => {
      const result = calculateLevelFromXP(20000);
      expect(result.level).toBe(12);
      expect(result.title).toBe("Grand Master");
      expect(result.xpForCurrentLevel).toBe(20000);
      expect(result.xpForNextLevel).toBe(25000);
    });

    it("should return level 15 for 35000 XP", () => {
      const result = calculateLevelFromXP(35000);
      expect(result.level).toBe(15);
      expect(result.title).toBe("Grand Master");
    });

    it("should return level 20 for 60000 XP", () => {
      const result = calculateLevelFromXP(60000);
      expect(result.level).toBe(20);
    });

    it("should handle very high XP values", () => {
      // 460000 XP = level 100 (10000 + 90 * 5000)
      const result = calculateLevelFromXP(460000);
      expect(result.level).toBe(100);
      expect(result.title).toBe("Grand Master");
    });

    it("should calculate progress correctly for level 11", () => {
      const result = calculateLevelFromXP(17500);
      expect(result.level).toBe(11);
      expect(result.progressToNextLevel).toBe(50); // (17500 - 15000) / 5000 = 50%
    });
  });

  describe("boundary cases", () => {
    it("should handle all level boundary transitions", () => {
      // Test each level boundary
      const boundaries = [
        { xp: 99, level: 1 },
        { xp: 100, level: 2 },
        { xp: 299, level: 2 },
        { xp: 300, level: 3 },
        { xp: 599, level: 3 },
        { xp: 600, level: 4 },
        { xp: 999, level: 4 },
        { xp: 1000, level: 5 },
        { xp: 1499, level: 5 },
        { xp: 1500, level: 6 },
        { xp: 2499, level: 6 },
        { xp: 2500, level: 7 },
        { xp: 3999, level: 7 },
        { xp: 4000, level: 8 },
        { xp: 5999, level: 8 },
        { xp: 6000, level: 9 },
        { xp: 9999, level: 9 },
        { xp: 10000, level: 10 },
        { xp: 14999, level: 10 },
        { xp: 15000, level: 11 },
      ];

      for (const { xp, level } of boundaries) {
        const result = calculateLevelFromXP(xp);
        expect(result.level).toBe(level);
      }
    });

    it("should never return progressToNextLevel > 100", () => {
      // Test various XP values
      const xpValues = [0, 50, 100, 500, 1000, 5000, 10000, 15000, 50000];
      for (const xp of xpValues) {
        const result = calculateLevelFromXP(xp);
        expect(result.progressToNextLevel).toBeLessThanOrEqual(100);
        expect(result.progressToNextLevel).toBeGreaterThanOrEqual(0);
      }
    });

    it("should always have xpNeededForNextLevel >= 0", () => {
      const xpValues = [0, 100, 299, 300, 10000, 14999, 15000, 100000];
      for (const xp of xpValues) {
        const result = calculateLevelFromXP(xp);
        expect(result.xpNeededForNextLevel).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

// ============================================================================
// formatDateOrNull Tests
// ============================================================================

describe("formatDateOrNull", () => {
  it("should return null for null input", () => {
    expect(formatDateOrNull(null)).toBeNull();
  });

  it("should return ISO string for valid date", () => {
    const date = new Date("2024-01-15T12:30:00.000Z");
    expect(formatDateOrNull(date)).toBe("2024-01-15T12:30:00.000Z");
  });

  it("should handle dates at midnight", () => {
    const date = new Date("2024-01-15T00:00:00.000Z");
    expect(formatDateOrNull(date)).toBe("2024-01-15T00:00:00.000Z");
  });

  it("should handle dates at end of day", () => {
    const date = new Date("2024-01-15T23:59:59.999Z");
    expect(formatDateOrNull(date)).toBe("2024-01-15T23:59:59.999Z");
  });

  it("should handle epoch date", () => {
    const date = new Date(0);
    expect(formatDateOrNull(date)).toBe("1970-01-01T00:00:00.000Z");
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration Tests", () => {
  describe("Level progression simulation", () => {
    it("should correctly track XP progression from 0 to level 15", () => {
      const progressionSteps = [
        { xp: 0, expectedLevel: 1 },
        { xp: 50, expectedLevel: 1 },
        { xp: 100, expectedLevel: 2 },
        { xp: 300, expectedLevel: 3 },
        { xp: 600, expectedLevel: 4 },
        { xp: 1000, expectedLevel: 5 },
        { xp: 2000, expectedLevel: 6 },
        { xp: 2500, expectedLevel: 7 },
        { xp: 4500, expectedLevel: 8 },
        { xp: 6000, expectedLevel: 9 },
        { xp: 8000, expectedLevel: 9 },
        { xp: 10000, expectedLevel: 10 },
        { xp: 12000, expectedLevel: 10 },
        { xp: 15000, expectedLevel: 11 },
        { xp: 20000, expectedLevel: 12 },
        { xp: 25000, expectedLevel: 13 },
        { xp: 30000, expectedLevel: 14 },
        { xp: 35000, expectedLevel: 15 },
      ];

      for (const { xp, expectedLevel } of progressionSteps) {
        const result = calculateLevelFromXP(xp);
        expect(result.level).toBe(expectedLevel);
      }
    });
  });

  describe("XP requirements consistency", () => {
    it("should have consistent XP requirements between calculateLevelFromXP and getXPRequiredForLevel", () => {
      for (let level = 1; level <= 20; level++) {
        const xpRequired = getXPRequiredForLevel(level);
        const result = calculateLevelFromXP(xpRequired);
        expect(result.level).toBe(level);
        expect(result.xpForCurrentLevel).toBe(xpRequired);
      }
    });

    it("should correctly calculate xpForNextLevel", () => {
      for (let level = 1; level <= 15; level++) {
        const xpRequired = getXPRequiredForLevel(level);
        const result = calculateLevelFromXP(xpRequired);
        const expectedNextLevelXP = getXPRequiredForLevel(level + 1);
        expect(result.xpForNextLevel).toBe(expectedNextLevelXP);
      }
    });
  });

  describe("Edge case handling", () => {
    it("should handle XP exactly at each level threshold", () => {
      for (const threshold of LEVEL_THRESHOLDS) {
        const result = calculateLevelFromXP(threshold.xpRequired);
        expect(result.level).toBe(threshold.level);
        expect(result.title).toBe(threshold.title);
        expect(result.progressToNextLevel).toBe(0);
      }
    });

    it("should handle XP one below each level threshold", () => {
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        const threshold = LEVEL_THRESHOLDS[i];
        if (threshold) {
          const result = calculateLevelFromXP(threshold.xpRequired - 1);
          const prevThreshold = LEVEL_THRESHOLDS[i - 1];
          if (prevThreshold) {
            expect(result.level).toBe(prevThreshold.level);
            expect(result.xpNeededForNextLevel).toBe(1);
          }
        }
      }
    });
  });
});
