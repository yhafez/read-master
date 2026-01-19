/**
 * Tests for Achievement Notification types and constants
 */

import { describe, it, expect } from "vitest";

import type { AchievementNotificationProps } from "./AchievementNotification";
import type { Achievement } from "@/stores/achievementsStore";

// ============================================================================
// Mock Data
// ============================================================================

const mockAchievement: Achievement = {
  id: "first_book",
  nameKey: "achievements.firstBook.name",
  descriptionKey: "achievements.firstBook.description",
  category: "reading",
  tier: "bronze",
  icon: "MenuBook",
  threshold: 1,
  xpReward: 50,
};

// ============================================================================
// Tests
// ============================================================================

describe("AchievementNotification types", () => {
  describe("AchievementNotificationProps", () => {
    it("should accept required props", () => {
      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss: () => {},
      };

      expect(props.achievement).toBeDefined();
      expect(props.onDismiss).toBeDefined();
    });

    it("should accept optional autoDismiss prop", () => {
      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss: () => {},
        autoDismiss: true,
      };

      expect(props.autoDismiss).toBe(true);
    });

    it("should accept optional autoDismissDelay prop", () => {
      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss: () => {},
        autoDismissDelay: 3000,
      };

      expect(props.autoDismissDelay).toBe(3000);
    });

    it("should accept optional show prop", () => {
      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss: () => {},
        show: false,
      };

      expect(props.show).toBe(false);
    });

    it("should accept all props together", () => {
      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss: () => {},
        autoDismiss: true,
        autoDismissDelay: 2000,
        show: true,
      };

      expect(props.achievement.id).toBe("first_book");
      expect(props.autoDismiss).toBe(true);
      expect(props.autoDismissDelay).toBe(2000);
      expect(props.show).toBe(true);
    });
  });

  describe("Achievement tiers", () => {
    it("should support bronze achievements", () => {
      const bronze: Achievement = {
        ...mockAchievement,
        tier: "bronze",
        xpReward: 50,
      };

      expect(bronze.tier).toBe("bronze");
      expect(bronze.xpReward).toBe(50);
    });

    it("should support silver achievements", () => {
      const silver: Achievement = {
        ...mockAchievement,
        tier: "silver",
        xpReward: 200,
      };

      expect(silver.tier).toBe("silver");
      expect(silver.xpReward).toBe(200);
    });

    it("should support gold achievements", () => {
      const gold: Achievement = {
        ...mockAchievement,
        tier: "gold",
        xpReward: 500,
      };

      expect(gold.tier).toBe("gold");
      expect(gold.xpReward).toBe(500);
    });

    it("should support platinum achievements", () => {
      const platinum: Achievement = {
        ...mockAchievement,
        tier: "platinum",
        xpReward: 1000,
      };

      expect(platinum.tier).toBe("platinum");
      expect(platinum.xpReward).toBe(1000);
    });
  });

  describe("Callback props", () => {
    it("should accept onDismiss callback", () => {
      let dismissed = false;
      const onDismiss = () => {
        dismissed = true;
      };

      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss,
      };

      props.onDismiss();
      expect(dismissed).toBe(true);
    });

    it("should call onDismiss when invoked", () => {
      let callCount = 0;
      const onDismiss = () => {
        callCount++;
      };

      const props: AchievementNotificationProps = {
        achievement: mockAchievement,
        onDismiss,
      };

      props.onDismiss();
      props.onDismiss();

      expect(callCount).toBe(2);
    });
  });

  describe("Achievement data", () => {
    it("should have required achievement fields", () => {
      const achievement: Achievement = {
        id: "test",
        nameKey: "test.name",
        descriptionKey: "test.description",
        category: "reading",
        tier: "bronze",
        icon: "Test",
        threshold: 1,
        xpReward: 50,
      };

      expect(achievement.id).toBe("test");
      expect(achievement.nameKey).toBe("test.name");
      expect(achievement.descriptionKey).toBe("test.description");
      expect(achievement.category).toBe("reading");
      expect(achievement.tier).toBe("bronze");
      expect(achievement.icon).toBe("Test");
      expect(achievement.threshold).toBe(1);
      expect(achievement.xpReward).toBe(50);
    });

    it("should support different categories", () => {
      const readingAchievement: Achievement = {
        ...mockAchievement,
        category: "reading",
      };
      const streakAchievement: Achievement = {
        ...mockAchievement,
        category: "streak",
      };
      const flashcardAchievement: Achievement = {
        ...mockAchievement,
        category: "flashcards",
      };

      expect(readingAchievement.category).toBe("reading");
      expect(streakAchievement.category).toBe("streak");
      expect(flashcardAchievement.category).toBe("flashcards");
    });
  });
});
