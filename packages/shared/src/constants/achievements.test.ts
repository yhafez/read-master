import { describe, it, expect } from "vitest";
import {
  READING_ACHIEVEMENTS,
  STREAK_ACHIEVEMENTS,
  LEARNING_ACHIEVEMENTS,
  SOCIAL_ACHIEVEMENTS,
  MILESTONE_ACHIEVEMENTS,
  ACHIEVEMENTS,
  ACHIEVEMENT_COUNTS,
  LEVEL_THRESHOLDS,
  XP_PER_LEVEL_AFTER_10,
  GRAND_MASTER_TITLE,
  XP_REWARDS,
  getAchievementByCode,
  getAchievementsByCategory,
  getAchievementsByTier,
  getActiveAchievements,
  calculateLevel,
  getXPForLevel,
  getTitleForLevel,
  checkAchievementCriteria,
  getUnlockableAchievements,
  calculateTotalXP,
  achievementUtils,
  type AchievementDefinition,
  type AchievementCheckStats,
} from "./achievements";

describe("Achievement Constants", () => {
  describe("READING_ACHIEVEMENTS", () => {
    it("should have 8 reading achievements", () => {
      expect(READING_ACHIEVEMENTS.length).toBe(8);
    });

    it("should include first_book achievement", () => {
      const firstBook = READING_ACHIEVEMENTS.find(
        (a) => a.code === "first_book"
      );
      expect(firstBook).toBeDefined();
      expect(firstBook?.name).toBe("First Chapter");
      expect(firstBook?.xpReward).toBe(100);
    });

    it("should include bookworm achievement", () => {
      const bookworm = READING_ACHIEVEMENTS.find((a) => a.code === "bookworm");
      expect(bookworm).toBeDefined();
      expect(bookworm?.xpReward).toBe(500);
    });

    it("should include bibliophile achievement", () => {
      const bibliophile = READING_ACHIEVEMENTS.find(
        (a) => a.code === "bibliophile"
      );
      expect(bibliophile).toBeDefined();
      expect(bibliophile?.xpReward).toBe(2000);
      expect(bibliophile?.tier).toBe("RARE");
    });

    it("should include scholar achievement", () => {
      const scholar = READING_ACHIEVEMENTS.find((a) => a.code === "scholar");
      expect(scholar).toBeDefined();
      expect(scholar?.xpReward).toBe(5000);
      expect(scholar?.tier).toBe("EPIC");
    });

    it("should include speed_reader achievement", () => {
      const speedReader = READING_ACHIEVEMENTS.find(
        (a) => a.code === "speed_reader"
      );
      expect(speedReader).toBeDefined();
      expect(speedReader?.xpReward).toBe(300);
    });

    it("should include marathon achievement", () => {
      const marathon = READING_ACHIEVEMENTS.find((a) => a.code === "marathon");
      expect(marathon).toBeDefined();
      expect(marathon?.xpReward).toBe(250);
    });

    it("should include night_owl achievement", () => {
      const nightOwl = READING_ACHIEVEMENTS.find((a) => a.code === "night_owl");
      expect(nightOwl).toBeDefined();
      expect(nightOwl?.xpReward).toBe(50);
    });

    it("should include early_bird achievement", () => {
      const earlyBird = READING_ACHIEVEMENTS.find(
        (a) => a.code === "early_bird"
      );
      expect(earlyBird).toBeDefined();
      expect(earlyBird?.xpReward).toBe(50);
    });

    it("should have all achievements in READING category", () => {
      READING_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe("READING");
      });
    });
  });

  describe("STREAK_ACHIEVEMENTS", () => {
    it("should have 4 streak achievements", () => {
      expect(STREAK_ACHIEVEMENTS.length).toBe(4);
    });

    it("should include streak_7 (On Fire)", () => {
      const streak7 = STREAK_ACHIEVEMENTS.find((a) => a.code === "streak_7");
      expect(streak7).toBeDefined();
      expect(streak7?.name).toBe("On Fire");
      expect(streak7?.xpReward).toBe(100);
    });

    it("should include streak_30 (Dedicated)", () => {
      const streak30 = STREAK_ACHIEVEMENTS.find((a) => a.code === "streak_30");
      expect(streak30).toBeDefined();
      expect(streak30?.name).toBe("Dedicated");
      expect(streak30?.xpReward).toBe(500);
    });

    it("should include streak_100 (Unstoppable)", () => {
      const streak100 = STREAK_ACHIEVEMENTS.find(
        (a) => a.code === "streak_100"
      );
      expect(streak100).toBeDefined();
      expect(streak100?.name).toBe("Unstoppable");
      expect(streak100?.xpReward).toBe(2000);
      expect(streak100?.tier).toBe("RARE");
    });

    it("should include streak_365 (Legendary)", () => {
      const streak365 = STREAK_ACHIEVEMENTS.find(
        (a) => a.code === "streak_365"
      );
      expect(streak365).toBeDefined();
      expect(streak365?.name).toBe("Legendary");
      expect(streak365?.xpReward).toBe(10000);
      expect(streak365?.tier).toBe("LEGENDARY");
    });

    it("should have all achievements in STREAK category", () => {
      STREAK_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe("STREAK");
      });
    });
  });

  describe("LEARNING_ACHIEVEMENTS", () => {
    it("should have 7 learning achievements", () => {
      expect(LEARNING_ACHIEVEMENTS.length).toBe(7);
    });

    it("should include first_review (Memory Spark)", () => {
      const firstReview = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "first_review"
      );
      expect(firstReview).toBeDefined();
      expect(firstReview?.name).toBe("Memory Spark");
      expect(firstReview?.xpReward).toBe(25);
    });

    it("should include cards_100 (Card Collector)", () => {
      const cards100 = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "cards_100"
      );
      expect(cards100).toBeDefined();
      expect(cards100?.xpReward).toBe(200);
    });

    it("should include cards_1000 (Memory Master)", () => {
      const cards1000 = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "cards_1000"
      );
      expect(cards1000).toBeDefined();
      expect(cards1000?.xpReward).toBe(1000);
      expect(cards1000?.tier).toBe("RARE");
    });

    it("should include mastered_50 (Getting Sharp)", () => {
      const mastered50 = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "mastered_50"
      );
      expect(mastered50).toBeDefined();
      expect(mastered50?.xpReward).toBe(300);
    });

    it("should include mastered_500 (Steel Trap)", () => {
      const mastered500 = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "mastered_500"
      );
      expect(mastered500).toBeDefined();
      expect(mastered500?.xpReward).toBe(1500);
      expect(mastered500?.tier).toBe("EPIC");
    });

    it("should include retention_90 (Excellent Recall)", () => {
      const retention90 = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "retention_90"
      );
      expect(retention90).toBeDefined();
      expect(retention90?.xpReward).toBe(500);
    });

    it("should include perfect_day (Perfect Day)", () => {
      const perfectDay = LEARNING_ACHIEVEMENTS.find(
        (a) => a.code === "perfect_day"
      );
      expect(perfectDay).toBeDefined();
      expect(perfectDay?.xpReward).toBe(150);
      expect(perfectDay?.criteria.length).toBe(2);
    });

    it("should have all achievements in LEARNING category", () => {
      LEARNING_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe("LEARNING");
      });
    });
  });

  describe("SOCIAL_ACHIEVEMENTS", () => {
    it("should have 7 social achievements", () => {
      expect(SOCIAL_ACHIEVEMENTS.length).toBe(7);
    });

    it("should include first_highlight (Highlighter)", () => {
      const firstHighlight = SOCIAL_ACHIEVEMENTS.find(
        (a) => a.code === "first_highlight"
      );
      expect(firstHighlight).toBeDefined();
      expect(firstHighlight?.xpReward).toBe(25);
    });

    it("should include annotator", () => {
      const annotator = SOCIAL_ACHIEVEMENTS.find((a) => a.code === "annotator");
      expect(annotator).toBeDefined();
      expect(annotator?.xpReward).toBe(300);
    });

    it("should include social_butterfly", () => {
      const socialButterfly = SOCIAL_ACHIEVEMENTS.find(
        (a) => a.code === "social_butterfly"
      );
      expect(socialButterfly).toBeDefined();
      expect(socialButterfly?.xpReward).toBe(200);
    });

    it("should include influencer", () => {
      const influencer = SOCIAL_ACHIEVEMENTS.find(
        (a) => a.code === "influencer"
      );
      expect(influencer).toBeDefined();
      expect(influencer?.xpReward).toBe(1000);
      expect(influencer?.tier).toBe("EPIC");
    });

    it("should include group_founder", () => {
      const groupFounder = SOCIAL_ACHIEVEMENTS.find(
        (a) => a.code === "group_founder"
      );
      expect(groupFounder).toBeDefined();
      expect(groupFounder?.xpReward).toBe(150);
    });

    it("should include curriculum_creator", () => {
      const curriculumCreator = SOCIAL_ACHIEVEMENTS.find(
        (a) => a.code === "curriculum_creator"
      );
      expect(curriculumCreator).toBeDefined();
      expect(curriculumCreator?.xpReward).toBe(200);
    });

    it("should include helpful", () => {
      const helpful = SOCIAL_ACHIEVEMENTS.find((a) => a.code === "helpful");
      expect(helpful).toBeDefined();
      expect(helpful?.xpReward).toBe(500);
      expect(helpful?.tier).toBe("RARE");
    });

    it("should have all achievements in SOCIAL category", () => {
      SOCIAL_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe("SOCIAL");
      });
    });
  });

  describe("MILESTONE_ACHIEVEMENTS", () => {
    it("should have 4 milestone achievements", () => {
      expect(MILESTONE_ACHIEVEMENTS.length).toBe(4);
    });

    it("should include first_assessment (Pop Quiz)", () => {
      const firstAssessment = MILESTONE_ACHIEVEMENTS.find(
        (a) => a.code === "first_assessment"
      );
      expect(firstAssessment).toBeDefined();
      expect(firstAssessment?.name).toBe("Pop Quiz");
      expect(firstAssessment?.xpReward).toBe(50);
    });

    it("should include ace", () => {
      const ace = MILESTONE_ACHIEVEMENTS.find((a) => a.code === "ace");
      expect(ace).toBeDefined();
      expect(ace?.xpReward).toBe(200);
    });

    it("should include consistent", () => {
      const consistent = MILESTONE_ACHIEVEMENTS.find(
        (a) => a.code === "consistent"
      );
      expect(consistent).toBeDefined();
      expect(consistent?.xpReward).toBe(400);
      expect(consistent?.tier).toBe("RARE");
    });

    it("should include blooms_master (Deep Thinker)", () => {
      const bloomsMaster = MILESTONE_ACHIEVEMENTS.find(
        (a) => a.code === "blooms_master"
      );
      expect(bloomsMaster).toBeDefined();
      expect(bloomsMaster?.name).toBe("Deep Thinker");
      expect(bloomsMaster?.xpReward).toBe(1000);
      expect(bloomsMaster?.tier).toBe("LEGENDARY");
    });

    it("should have all achievements in MILESTONE category", () => {
      MILESTONE_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe("MILESTONE");
      });
    });
  });

  describe("ACHIEVEMENTS", () => {
    it("should contain all achievements from all categories", () => {
      const expectedLength =
        READING_ACHIEVEMENTS.length +
        STREAK_ACHIEVEMENTS.length +
        LEARNING_ACHIEVEMENTS.length +
        SOCIAL_ACHIEVEMENTS.length +
        MILESTONE_ACHIEVEMENTS.length;
      expect(ACHIEVEMENTS.length).toBe(expectedLength);
    });

    it("should have 30 total achievements", () => {
      expect(ACHIEVEMENTS.length).toBe(30);
    });

    it("should have unique codes for all achievements", () => {
      const codes = ACHIEVEMENTS.map((a) => a.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should have all achievements active by default", () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(a.isActive).toBe(true);
      });
    });

    it("should have valid badge colors (hex format)", () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(a.badgeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have at least one criterion per achievement", () => {
      ACHIEVEMENTS.forEach((a) => {
        expect(a.criteria.length).toBeGreaterThan(0);
      });
    });
  });

  describe("ACHIEVEMENT_COUNTS", () => {
    it("should have correct count for each category", () => {
      expect(ACHIEVEMENT_COUNTS.READING).toBe(8);
      expect(ACHIEVEMENT_COUNTS.STREAK).toBe(4);
      expect(ACHIEVEMENT_COUNTS.LEARNING).toBe(7);
      expect(ACHIEVEMENT_COUNTS.SOCIAL).toBe(7);
      expect(ACHIEVEMENT_COUNTS.MILESTONE).toBe(4);
      expect(ACHIEVEMENT_COUNTS.SPECIAL).toBe(0);
    });

    it("should have correct total", () => {
      expect(ACHIEVEMENT_COUNTS.TOTAL).toBe(30);
    });
  });

  describe("LEVEL_THRESHOLDS", () => {
    it("should have 10 levels defined", () => {
      expect(LEVEL_THRESHOLDS.length).toBe(10);
    });

    it("should start at level 1 with 0 XP", () => {
      const first = LEVEL_THRESHOLDS[0];
      expect(first).toBeDefined();
      expect(first?.level).toBe(1);
      expect(first?.xpRequired).toBe(0);
      expect(first?.title).toBe("Novice Reader");
    });

    it("should have correct XP thresholds", () => {
      expect(LEVEL_THRESHOLDS[1]?.xpRequired).toBe(100);
      expect(LEVEL_THRESHOLDS[2]?.xpRequired).toBe(300);
      expect(LEVEL_THRESHOLDS[3]?.xpRequired).toBe(600);
      expect(LEVEL_THRESHOLDS[4]?.xpRequired).toBe(1000);
      expect(LEVEL_THRESHOLDS[5]?.xpRequired).toBe(1500);
      expect(LEVEL_THRESHOLDS[6]?.xpRequired).toBe(2500);
      expect(LEVEL_THRESHOLDS[7]?.xpRequired).toBe(4000);
      expect(LEVEL_THRESHOLDS[8]?.xpRequired).toBe(6000);
      expect(LEVEL_THRESHOLDS[9]?.xpRequired).toBe(10000);
    });

    it("should have correct titles", () => {
      expect(LEVEL_THRESHOLDS[9]?.title).toBe("Master Reader");
    });
  });

  describe("XP_PER_LEVEL_AFTER_10", () => {
    it("should be 5000", () => {
      expect(XP_PER_LEVEL_AFTER_10).toBe(5000);
    });
  });

  describe("GRAND_MASTER_TITLE", () => {
    it("should be Grand Master", () => {
      expect(GRAND_MASTER_TITLE).toBe("Grand Master");
    });
  });

  describe("XP_REWARDS", () => {
    it("should have correct values for book completion", () => {
      expect(XP_REWARDS.BOOK_COMPLETED).toBe(100);
    });

    it("should have correct values for flashcard reviews", () => {
      expect(XP_REWARDS.FLASHCARD_CORRECT).toBe(5);
      expect(XP_REWARDS.DAILY_REVIEW_COMPLETE).toBe(25);
    });

    it("should have correct values for assessments", () => {
      expect(XP_REWARDS.ASSESSMENT_COMPLETED).toBe(50);
      expect(XP_REWARDS.ASSESSMENT_SCORE_BONUS).toBe(10);
    });

    it("should have correct values for daily activity", () => {
      expect(XP_REWARDS.DAILY_ACTIVITY).toBe(10);
    });

    it("should have correct values for streak bonus", () => {
      expect(XP_REWARDS.STREAK_BONUS_PER_DAY).toBe(5);
      expect(XP_REWARDS.MAX_STREAK_BONUS).toBe(35);
    });
  });
});

describe("Achievement Functions", () => {
  describe("getAchievementByCode", () => {
    it("should return achievement for valid code", () => {
      const achievement = getAchievementByCode("first_book");
      expect(achievement).toBeDefined();
      expect(achievement?.name).toBe("First Chapter");
    });

    it("should return undefined for invalid code", () => {
      const achievement = getAchievementByCode("nonexistent");
      expect(achievement).toBeUndefined();
    });

    it("should return correct achievement details", () => {
      const achievement = getAchievementByCode("streak_365");
      expect(achievement?.xpReward).toBe(10000);
      expect(achievement?.tier).toBe("LEGENDARY");
    });
  });

  describe("getAchievementsByCategory", () => {
    it("should return all READING achievements", () => {
      const reading = getAchievementsByCategory("READING");
      expect(reading.length).toBe(8);
    });

    it("should return all STREAK achievements", () => {
      const streak = getAchievementsByCategory("STREAK");
      expect(streak.length).toBe(4);
    });

    it("should return all LEARNING achievements", () => {
      const learning = getAchievementsByCategory("LEARNING");
      expect(learning.length).toBe(7);
    });

    it("should return all SOCIAL achievements", () => {
      const social = getAchievementsByCategory("SOCIAL");
      expect(social.length).toBe(7);
    });

    it("should return all MILESTONE achievements", () => {
      const milestone = getAchievementsByCategory("MILESTONE");
      expect(milestone.length).toBe(4);
    });

    it("should return empty array for SPECIAL category", () => {
      const special = getAchievementsByCategory("SPECIAL");
      expect(special.length).toBe(0);
    });
  });

  describe("getAchievementsByTier", () => {
    it("should return COMMON achievements", () => {
      const common = getAchievementsByTier("COMMON");
      expect(common.length).toBeGreaterThan(0);
      common.forEach((a) => expect(a.tier).toBe("COMMON"));
    });

    it("should return UNCOMMON achievements", () => {
      const uncommon = getAchievementsByTier("UNCOMMON");
      expect(uncommon.length).toBeGreaterThan(0);
      uncommon.forEach((a) => expect(a.tier).toBe("UNCOMMON"));
    });

    it("should return RARE achievements", () => {
      const rare = getAchievementsByTier("RARE");
      expect(rare.length).toBeGreaterThan(0);
      rare.forEach((a) => expect(a.tier).toBe("RARE"));
    });

    it("should return EPIC achievements", () => {
      const epic = getAchievementsByTier("EPIC");
      expect(epic.length).toBeGreaterThan(0);
      epic.forEach((a) => expect(a.tier).toBe("EPIC"));
    });

    it("should return LEGENDARY achievements", () => {
      const legendary = getAchievementsByTier("LEGENDARY");
      expect(legendary.length).toBe(2); // streak_365 and blooms_master
      legendary.forEach((a) => expect(a.tier).toBe("LEGENDARY"));
    });
  });

  describe("getActiveAchievements", () => {
    it("should return all active achievements", () => {
      const active = getActiveAchievements();
      expect(active.length).toBe(30);
    });

    it("should only include active achievements", () => {
      const active = getActiveAchievements();
      active.forEach((a) => expect(a.isActive).toBe(true));
    });
  });

  describe("calculateLevel", () => {
    it("should return level 1 for 0 XP", () => {
      const result = calculateLevel(0);
      expect(result.level).toBe(1);
      expect(result.title).toBe("Novice Reader");
    });

    it("should return level 2 for 100 XP", () => {
      const result = calculateLevel(100);
      expect(result.level).toBe(2);
      expect(result.title).toBe("Apprentice");
    });

    it("should return level 10 for 10000 XP", () => {
      const result = calculateLevel(10000);
      expect(result.level).toBe(10);
      expect(result.title).toBe("Master Reader");
    });

    it("should return level 11 for 15000 XP", () => {
      const result = calculateLevel(15000);
      expect(result.level).toBe(11);
      expect(result.title).toBe("Grand Master");
    });

    it("should return level 12 for 20000 XP", () => {
      const result = calculateLevel(20000);
      expect(result.level).toBe(12);
      expect(result.title).toBe("Grand Master");
    });

    it("should calculate progress percentage correctly", () => {
      const result = calculateLevel(50);
      expect(result.progressPercent).toBe(50);
    });

    it("should return current and next level XP", () => {
      const result = calculateLevel(500);
      expect(result.level).toBe(3);
      expect(result.currentLevelXP).toBe(300);
      expect(result.nextLevelXP).toBe(600);
    });
  });

  describe("getXPForLevel", () => {
    it("should return 0 for level 1", () => {
      expect(getXPForLevel(1)).toBe(0);
    });

    it("should return correct XP for levels 1-10", () => {
      expect(getXPForLevel(2)).toBe(100);
      expect(getXPForLevel(5)).toBe(1000);
      expect(getXPForLevel(10)).toBe(10000);
    });

    it("should calculate XP for levels above 10", () => {
      expect(getXPForLevel(11)).toBe(15000);
      expect(getXPForLevel(12)).toBe(20000);
      expect(getXPForLevel(15)).toBe(35000);
    });

    it("should return 0 for level 0 or negative", () => {
      expect(getXPForLevel(0)).toBe(0);
      expect(getXPForLevel(-1)).toBe(0);
    });
  });

  describe("getTitleForLevel", () => {
    it("should return correct titles for levels 1-10", () => {
      expect(getTitleForLevel(1)).toBe("Novice Reader");
      expect(getTitleForLevel(5)).toBe("Avid Reader");
      expect(getTitleForLevel(10)).toBe("Master Reader");
    });

    it("should return Grand Master for levels above 10", () => {
      expect(getTitleForLevel(11)).toBe("Grand Master");
      expect(getTitleForLevel(50)).toBe("Grand Master");
    });

    it("should return Novice Reader for level 0", () => {
      expect(getTitleForLevel(0)).toBe("Novice Reader");
    });
  });

  describe("checkAchievementCriteria", () => {
    it("should return true when criteria is met", () => {
      const achievement = getAchievementByCode("first_book");
      expect(achievement).toBeDefined();
      if (!achievement) return;
      const stats: AchievementCheckStats = { booksCompleted: 1 };
      expect(checkAchievementCriteria(achievement, stats)).toBe(true);
    });

    it("should return false when criteria is not met", () => {
      const achievement = getAchievementByCode("bookworm");
      expect(achievement).toBeDefined();
      if (!achievement) return;
      const stats: AchievementCheckStats = { booksCompleted: 5 };
      expect(checkAchievementCriteria(achievement, stats)).toBe(false);
    });

    it("should handle multiple criteria (perfect_day)", () => {
      const achievement = getAchievementByCode("perfect_day");
      expect(achievement).toBeDefined();
      if (!achievement) return;
      const stats: AchievementCheckStats = {
        sessionAccuracy: 1.0,
        sessionCards: 15,
      };
      expect(checkAchievementCriteria(achievement, stats)).toBe(true);
    });

    it("should fail when any criterion is not met", () => {
      const achievement = getAchievementByCode("perfect_day");
      expect(achievement).toBeDefined();
      if (!achievement) return;
      const stats: AchievementCheckStats = {
        sessionAccuracy: 1.0,
        sessionCards: 5, // Not enough cards
      };
      expect(checkAchievementCriteria(achievement, stats)).toBe(false);
    });

    it("should handle retention rate criteria", () => {
      const achievement = getAchievementByCode("retention_90");
      expect(achievement).toBeDefined();
      if (!achievement) return;
      const statsPass: AchievementCheckStats = { retentionRate: 0.95 };
      const statsFail: AchievementCheckStats = { retentionRate: 0.85 };
      expect(checkAchievementCriteria(achievement, statsPass)).toBe(true);
      expect(checkAchievementCriteria(achievement, statsFail)).toBe(false);
    });

    it("should handle time-based criteria (early_bird)", () => {
      const achievement = getAchievementByCode("early_bird");
      expect(achievement).toBeDefined();
      if (!achievement) return;
      const statsPass: AchievementCheckStats = { readingSessionHour: 5 };
      const statsFail: AchievementCheckStats = { readingSessionHour: 10 };
      expect(checkAchievementCriteria(achievement, statsPass)).toBe(true);
      expect(checkAchievementCriteria(achievement, statsFail)).toBe(false);
    });
  });

  describe("getUnlockableAchievements", () => {
    it("should return achievements that can be unlocked", () => {
      const stats: AchievementCheckStats = {
        booksCompleted: 10,
        cardsReviewed: 100,
      };
      const unlockable = getUnlockableAchievements(stats);
      expect(unlockable.length).toBeGreaterThan(0);
      expect(unlockable.some((a) => a.code === "first_book")).toBe(true);
      expect(unlockable.some((a) => a.code === "bookworm")).toBe(true);
      expect(unlockable.some((a) => a.code === "first_review")).toBe(true);
      expect(unlockable.some((a) => a.code === "cards_100")).toBe(true);
    });

    it("should exclude already unlocked achievements", () => {
      const stats: AchievementCheckStats = { booksCompleted: 10 };
      const alreadyUnlocked = ["first_book", "bookworm"];
      const unlockable = getUnlockableAchievements(stats, alreadyUnlocked);
      expect(unlockable.some((a) => a.code === "first_book")).toBe(false);
      expect(unlockable.some((a) => a.code === "bookworm")).toBe(false);
    });

    it("should return empty array when no new achievements can be unlocked", () => {
      const stats: AchievementCheckStats = {};
      const unlockable = getUnlockableAchievements(stats);
      expect(unlockable.length).toBe(0);
    });
  });

  describe("calculateTotalXP", () => {
    it("should calculate total XP from achievement codes", () => {
      const codes = ["first_book", "bookworm"]; // 100 + 500 = 600
      expect(calculateTotalXP(codes)).toBe(600);
    });

    it("should return 0 for empty array", () => {
      expect(calculateTotalXP([])).toBe(0);
    });

    it("should ignore invalid codes", () => {
      const codes = ["first_book", "invalid_code"];
      expect(calculateTotalXP(codes)).toBe(100);
    });

    it("should calculate correctly for many achievements", () => {
      const codes = [
        "first_book", // 100
        "streak_7", // 100
        "first_review", // 25
        "first_highlight", // 25
        "first_assessment", // 50
      ];
      expect(calculateTotalXP(codes)).toBe(300);
    });
  });
});

describe("achievementUtils", () => {
  it("should export all utility functions", () => {
    expect(achievementUtils.getAchievementByCode).toBe(getAchievementByCode);
    expect(achievementUtils.getAchievementsByCategory).toBe(
      getAchievementsByCategory
    );
    expect(achievementUtils.getAchievementsByTier).toBe(getAchievementsByTier);
    expect(achievementUtils.getActiveAchievements).toBe(getActiveAchievements);
    expect(achievementUtils.calculateLevel).toBe(calculateLevel);
    expect(achievementUtils.getXPForLevel).toBe(getXPForLevel);
    expect(achievementUtils.getTitleForLevel).toBe(getTitleForLevel);
    expect(achievementUtils.checkAchievementCriteria).toBe(
      checkAchievementCriteria
    );
    expect(achievementUtils.getUnlockableAchievements).toBe(
      getUnlockableAchievements
    );
    expect(achievementUtils.calculateTotalXP).toBe(calculateTotalXP);
  });
});

describe("Type exports", () => {
  it("should have AchievementDefinition type with correct structure", () => {
    const achievement: AchievementDefinition = {
      code: "test",
      name: "Test Achievement",
      description: "A test achievement",
      category: "READING",
      tier: "COMMON",
      xpReward: 100,
      badgeIcon: "test",
      badgeColor: "#FFFFFF",
      sortOrder: 1,
      criteria: [{ type: "booksCompleted", operator: ">=", value: 1 }],
      isActive: true,
    };
    expect(achievement).toBeDefined();
  });

  it("should have AchievementCheckStats type with optional fields", () => {
    const stats: AchievementCheckStats = {
      booksCompleted: 5,
    };
    expect(stats.booksCompleted).toBe(5);
    expect(stats.cardsReviewed).toBeUndefined();
  });
});
