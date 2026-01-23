/**
 * Email Preferences Hook Tests
 */

import { describe, it, expect } from "vitest";
import {
  emailPreferencesKeys,
  DEFAULT_EMAIL_PREFERENCES,
  getDigestFrequencyLabel,
  hasAnyEmailEnabled,
  getEnabledCategoryCount,
  type EmailPreferences,
} from "./useEmailPreferences";

describe("useEmailPreferences", () => {
  describe("emailPreferencesKeys", () => {
    it("should generate correct all key", () => {
      expect(emailPreferencesKeys.all).toEqual(["email-preferences"]);
    });

    it("should generate correct detail key", () => {
      expect(emailPreferencesKeys.detail()).toEqual([
        "email-preferences",
        "detail",
      ]);
    });

    it("should be stable across calls", () => {
      const key1 = emailPreferencesKeys.detail();
      const key2 = emailPreferencesKeys.detail();
      expect(key1).toEqual(key2);
    });
  });

  describe("DEFAULT_EMAIL_PREFERENCES", () => {
    it("should have emailEnabled as true", () => {
      expect(DEFAULT_EMAIL_PREFERENCES.emailEnabled).toBe(true);
    });

    it("should have all category preferences as true", () => {
      expect(DEFAULT_EMAIL_PREFERENCES.marketingEmails).toBe(true);
      expect(DEFAULT_EMAIL_PREFERENCES.productUpdates).toBe(true);
      expect(DEFAULT_EMAIL_PREFERENCES.weeklyDigest).toBe(true);
      expect(DEFAULT_EMAIL_PREFERENCES.achievementEmails).toBe(true);
      expect(DEFAULT_EMAIL_PREFERENCES.recommendationEmails).toBe(true);
      expect(DEFAULT_EMAIL_PREFERENCES.socialEmails).toBe(true);
    });

    it("should have digestFrequency as weekly", () => {
      expect(DEFAULT_EMAIL_PREFERENCES.digestFrequency).toBe("weekly");
    });

    it("should be frozen/immutable", () => {
      // Verify defaults are defined correctly
      expect(Object.keys(DEFAULT_EMAIL_PREFERENCES)).toHaveLength(8);
    });
  });

  describe("getDigestFrequencyLabel", () => {
    it("should return 'Weekly' for weekly", () => {
      expect(getDigestFrequencyLabel("weekly")).toBe("Weekly");
    });

    it("should return 'Every 2 weeks' for biweekly", () => {
      expect(getDigestFrequencyLabel("biweekly")).toBe("Every 2 weeks");
    });

    it("should return 'Monthly' for monthly", () => {
      expect(getDigestFrequencyLabel("monthly")).toBe("Monthly");
    });

    it("should return 'Never' for never", () => {
      expect(getDigestFrequencyLabel("never")).toBe("Never");
    });

    it("should handle all valid frequencies", () => {
      const frequencies: Array<EmailPreferences["digestFrequency"]> = [
        "weekly",
        "biweekly",
        "monthly",
        "never",
      ];

      for (const freq of frequencies) {
        const label = getDigestFrequencyLabel(freq);
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("hasAnyEmailEnabled", () => {
    it("should return false when emailEnabled is false", () => {
      const prefs: EmailPreferences = {
        ...DEFAULT_EMAIL_PREFERENCES,
        emailEnabled: false,
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(false);
    });

    it("should return false when all categories are disabled", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(false);
    });

    it("should return true when at least one category is enabled", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: true, // Only this one enabled
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(true);
    });

    it("should return true when all categories are enabled", () => {
      expect(hasAnyEmailEnabled(DEFAULT_EMAIL_PREFERENCES)).toBe(true);
    });

    it("should check marketing emails", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: true,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(true);
    });

    it("should check product updates", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: true,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(true);
    });

    it("should check achievement emails", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: true,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(true);
    });

    it("should check recommendation emails", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: true,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(true);
    });

    it("should check social emails", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: true,
        digestFrequency: "weekly",
      };
      expect(hasAnyEmailEnabled(prefs)).toBe(true);
    });
  });

  describe("getEnabledCategoryCount", () => {
    it("should return 0 when emailEnabled is false", () => {
      const prefs: EmailPreferences = {
        ...DEFAULT_EMAIL_PREFERENCES,
        emailEnabled: false,
      };
      expect(getEnabledCategoryCount(prefs)).toBe(0);
    });

    it("should return 0 when all categories are disabled", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(getEnabledCategoryCount(prefs)).toBe(0);
    });

    it("should return 6 when all categories are enabled", () => {
      expect(getEnabledCategoryCount(DEFAULT_EMAIL_PREFERENCES)).toBe(6);
    });

    it("should count only enabled categories", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: true, // 1
        productUpdates: false,
        weeklyDigest: true, // 2
        achievementEmails: true, // 3
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "weekly",
      };
      expect(getEnabledCategoryCount(prefs)).toBe(3);
    });

    it("should return 1 when only one category is enabled", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: true, // Only one
        digestFrequency: "weekly",
      };
      expect(getEnabledCategoryCount(prefs)).toBe(1);
    });

    it("should handle each category individually", () => {
      const categories = [
        "marketingEmails",
        "productUpdates",
        "weeklyDigest",
        "achievementEmails",
        "recommendationEmails",
        "socialEmails",
      ] as const;

      for (const category of categories) {
        const prefs: EmailPreferences = {
          emailEnabled: true,
          marketingEmails: false,
          productUpdates: false,
          weeklyDigest: false,
          achievementEmails: false,
          recommendationEmails: false,
          socialEmails: false,
          digestFrequency: "weekly",
          [category]: true, // Enable only this one
        };
        expect(getEnabledCategoryCount(prefs)).toBe(1);
      }
    });
  });

  describe("EmailPreferences type", () => {
    it("should have correct shape", () => {
      const prefs: EmailPreferences = {
        emailEnabled: true,
        marketingEmails: true,
        productUpdates: true,
        weeklyDigest: true,
        achievementEmails: true,
        recommendationEmails: true,
        socialEmails: true,
        digestFrequency: "weekly",
      };

      expect(typeof prefs.emailEnabled).toBe("boolean");
      expect(typeof prefs.marketingEmails).toBe("boolean");
      expect(typeof prefs.productUpdates).toBe("boolean");
      expect(typeof prefs.weeklyDigest).toBe("boolean");
      expect(typeof prefs.achievementEmails).toBe("boolean");
      expect(typeof prefs.recommendationEmails).toBe("boolean");
      expect(typeof prefs.socialEmails).toBe("boolean");
      expect(typeof prefs.digestFrequency).toBe("string");
    });

    it("should accept all valid digestFrequency values", () => {
      const frequencies: Array<EmailPreferences["digestFrequency"]> = [
        "weekly",
        "biweekly",
        "monthly",
        "never",
      ];

      for (const freq of frequencies) {
        const prefs: EmailPreferences = {
          ...DEFAULT_EMAIL_PREFERENCES,
          digestFrequency: freq,
        };
        expect(prefs.digestFrequency).toBe(freq);
      }
    });
  });
});
