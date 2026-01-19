/**
 * Tests for generalSettingsStore
 *
 * Tests cover:
 * - Constants and defaults
 * - Validation functions
 * - Sanitization functions
 * - Utility functions
 * - Store actions
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  GENERAL_SETTINGS_STORAGE_KEY,
  supportedLanguages,
  languageNames,
  commonTimezones,
  getBrowserTimezone,
  DEFAULT_EMAIL_NOTIFICATIONS,
  DEFAULT_GENERAL_SETTINGS,
  validateLanguage,
  validateTimezone,
  validateDisplayName,
  sanitizeEmailNotifications,
  sanitizeGeneralSettings,
  formatTimezoneDisplay,
  useGeneralSettingsStore,
} from "./generalSettingsStore";
import type {
  SupportedLanguage,
  EmailNotificationSettings,
  GeneralSettings,
} from "./generalSettingsStore";

describe("generalSettingsStore", () => {
  // Reset store before each test
  beforeEach(() => {
    useGeneralSettingsStore.setState({
      ...DEFAULT_GENERAL_SETTINGS,
      timezone: getBrowserTimezone(),
    });
  });

  describe("Constants", () => {
    it("should have correct storage key", () => {
      expect(GENERAL_SETTINGS_STORAGE_KEY).toBe("read-master-general-settings");
    });

    it("should have all supported languages", () => {
      expect(supportedLanguages).toContain("en");
      expect(supportedLanguages).toContain("ar");
      expect(supportedLanguages).toContain("es");
      expect(supportedLanguages).toContain("ja");
      expect(supportedLanguages).toContain("zh");
      expect(supportedLanguages).toContain("tl");
      expect(supportedLanguages.length).toBe(6);
    });

    it("should have language names for all supported languages", () => {
      supportedLanguages.forEach((lang) => {
        expect(languageNames[lang]).toBeDefined();
        expect(typeof languageNames[lang]).toBe("string");
        expect(languageNames[lang].length).toBeGreaterThan(0);
      });
    });

    it("should have common timezones", () => {
      expect(commonTimezones.length).toBeGreaterThan(30);
      expect(commonTimezones).toContain("America/New_York");
      expect(commonTimezones).toContain("Europe/London");
      expect(commonTimezones).toContain("Asia/Tokyo");
      expect(commonTimezones).toContain("UTC");
    });
  });

  describe("Default Settings", () => {
    it("should have correct default email notification settings", () => {
      expect(DEFAULT_EMAIL_NOTIFICATIONS).toEqual({
        srsReminders: true,
        weeklyProgress: true,
        achievements: true,
        groupActivity: true,
        forumReplies: true,
        marketing: false,
      });
    });

    it("should have correct default general settings", () => {
      expect(DEFAULT_GENERAL_SETTINGS.language).toBe("en");
      expect(DEFAULT_GENERAL_SETTINGS.displayName).toBe("");
      expect(DEFAULT_GENERAL_SETTINGS.emailNotifications).toEqual(
        DEFAULT_EMAIL_NOTIFICATIONS
      );
      // Timezone is dynamic based on browser
      expect(typeof DEFAULT_GENERAL_SETTINGS.timezone).toBe("string");
    });
  });

  describe("getBrowserTimezone", () => {
    it("should return a string", () => {
      const tz = getBrowserTimezone();
      expect(typeof tz).toBe("string");
      expect(tz.length).toBeGreaterThan(0);
    });

    it("should return a valid timezone", () => {
      const tz = getBrowserTimezone();
      // Should not throw when used
      expect(() => {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
      }).not.toThrow();
    });
  });

  describe("validateLanguage", () => {
    it("should return valid language unchanged", () => {
      supportedLanguages.forEach((lang) => {
        expect(validateLanguage(lang)).toBe(lang);
      });
    });

    it("should return 'en' for invalid language", () => {
      expect(validateLanguage("invalid")).toBe("en");
      expect(validateLanguage("fr")).toBe("en");
      expect(validateLanguage("")).toBe("en");
    });

    it("should handle non-string input gracefully", () => {
      // @ts-expect-error Testing invalid input
      expect(validateLanguage(123)).toBe("en");
      // @ts-expect-error Testing invalid input
      expect(validateLanguage(null)).toBe("en");
      // @ts-expect-error Testing invalid input
      expect(validateLanguage(undefined)).toBe("en");
    });
  });

  describe("validateTimezone", () => {
    it("should return valid timezone unchanged", () => {
      expect(validateTimezone("America/New_York")).toBe("America/New_York");
      expect(validateTimezone("Europe/London")).toBe("Europe/London");
      expect(validateTimezone("UTC")).toBe("UTC");
    });

    it("should return browser timezone for invalid timezone", () => {
      const browserTz = getBrowserTimezone();
      expect(validateTimezone("Invalid/Timezone")).toBe(browserTz);
      expect(validateTimezone("NotATimezone")).toBe(browserTz);
    });

    it("should return browser timezone for empty string", () => {
      const browserTz = getBrowserTimezone();
      expect(validateTimezone("")).toBe(browserTz);
    });

    it("should handle non-string input gracefully", () => {
      const browserTz = getBrowserTimezone();
      // @ts-expect-error Testing invalid input
      expect(validateTimezone(123)).toBe(browserTz);
      // @ts-expect-error Testing invalid input
      expect(validateTimezone(null)).toBe(browserTz);
      // @ts-expect-error Testing invalid input
      expect(validateTimezone(undefined)).toBe(browserTz);
    });
  });

  describe("validateDisplayName", () => {
    it("should return trimmed name", () => {
      expect(validateDisplayName("  John Doe  ")).toBe("John Doe");
      expect(validateDisplayName("Alice")).toBe("Alice");
    });

    it("should truncate names longer than 50 characters", () => {
      const longName = "A".repeat(100);
      const result = validateDisplayName(longName);
      expect(result.length).toBe(50);
      expect(result).toBe("A".repeat(50));
    });

    it("should return empty string for invalid input", () => {
      expect(validateDisplayName("")).toBe("");
      // @ts-expect-error Testing invalid input
      expect(validateDisplayName(null)).toBe("");
      // @ts-expect-error Testing invalid input
      expect(validateDisplayName(undefined)).toBe("");
      // @ts-expect-error Testing invalid input
      expect(validateDisplayName(123)).toBe("");
    });

    it("should handle whitespace-only names", () => {
      expect(validateDisplayName("   ")).toBe("");
      expect(validateDisplayName("\t\n")).toBe("");
    });
  });

  describe("sanitizeEmailNotifications", () => {
    it("should keep valid boolean values", () => {
      const notifications: Partial<EmailNotificationSettings> = {
        srsReminders: false,
        weeklyProgress: true,
        achievements: false,
      };

      const result = sanitizeEmailNotifications(notifications);
      expect(result.srsReminders).toBe(false);
      expect(result.weeklyProgress).toBe(true);
      expect(result.achievements).toBe(false);
    });

    it("should ignore non-boolean values", () => {
      const notifications = {
        srsReminders: "true",
        weeklyProgress: 1,
        achievements: null,
      } as unknown as Partial<EmailNotificationSettings>;

      const result = sanitizeEmailNotifications(notifications);
      expect(result.srsReminders).toBeUndefined();
      expect(result.weeklyProgress).toBeUndefined();
      expect(result.achievements).toBeUndefined();
    });

    it("should handle empty object", () => {
      const result = sanitizeEmailNotifications({});
      expect(result).toEqual({});
    });

    it("should handle all notification types", () => {
      const notifications: EmailNotificationSettings = {
        srsReminders: true,
        weeklyProgress: false,
        achievements: true,
        groupActivity: false,
        forumReplies: true,
        marketing: false,
      };

      const result = sanitizeEmailNotifications(notifications);
      expect(result).toEqual(notifications);
    });
  });

  describe("sanitizeGeneralSettings", () => {
    it("should sanitize valid settings", () => {
      const settings: Partial<GeneralSettings> = {
        language: "es",
        timezone: "Europe/London",
        displayName: "Test User",
      };

      const result = sanitizeGeneralSettings(settings);
      expect(result.language).toBe("es");
      expect(result.timezone).toBe("Europe/London");
      expect(result.displayName).toBe("Test User");
    });

    it("should validate language", () => {
      const settings: Partial<GeneralSettings> = {
        language: "invalid" as SupportedLanguage,
      };

      const result = sanitizeGeneralSettings(settings);
      expect(result.language).toBe("en");
    });

    it("should validate timezone", () => {
      const settings: Partial<GeneralSettings> = {
        timezone: "Invalid/Timezone",
      };

      const result = sanitizeGeneralSettings(settings);
      expect(result.timezone).toBe(getBrowserTimezone());
    });

    it("should validate and trim display name", () => {
      const settings: Partial<GeneralSettings> = {
        displayName: "  Trimmed Name  ",
      };

      const result = sanitizeGeneralSettings(settings);
      expect(result.displayName).toBe("Trimmed Name");
    });

    it("should merge email notifications with defaults", () => {
      const settings: Partial<GeneralSettings> = {
        emailNotifications: {
          srsReminders: false,
          weeklyProgress: false,
          achievements: false,
          groupActivity: false,
          forumReplies: false,
          marketing: false,
        },
      };

      const result = sanitizeGeneralSettings(settings);
      expect(result.emailNotifications).toBeDefined();
      expect(result.emailNotifications?.srsReminders).toBe(false);
      expect(result.emailNotifications?.weeklyProgress).toBe(false);
    });

    it("should handle empty settings", () => {
      const result = sanitizeGeneralSettings({});
      expect(result).toEqual({});
    });
  });

  describe("formatTimezoneDisplay", () => {
    it("should format valid timezone", () => {
      const result = formatTimezoneDisplay("America/New_York");
      expect(result).toContain("America/New York");
      expect(result).toContain("GMT");
    });

    it("should handle UTC", () => {
      const result = formatTimezoneDisplay("UTC");
      expect(result).toContain("UTC");
    });

    it("should handle invalid timezone gracefully", () => {
      const result = formatTimezoneDisplay("Invalid/Timezone");
      // Should return the input if invalid
      expect(result).toBe("Invalid/Timezone");
    });

    it("should replace underscores with spaces", () => {
      const result = formatTimezoneDisplay("America/New_York");
      expect(result).toContain("America/New York");
    });
  });

  describe("Store Initial State", () => {
    it("should have correct initial language", () => {
      expect(useGeneralSettingsStore.getState().language).toBe("en");
    });

    it("should have a timezone set", () => {
      const tz = useGeneralSettingsStore.getState().timezone;
      expect(typeof tz).toBe("string");
      expect(tz.length).toBeGreaterThan(0);
    });

    it("should have empty display name", () => {
      expect(useGeneralSettingsStore.getState().displayName).toBe("");
    });

    it("should have default email notifications", () => {
      expect(useGeneralSettingsStore.getState().emailNotifications).toEqual(
        DEFAULT_EMAIL_NOTIFICATIONS
      );
    });
  });

  describe("Store Actions - setLanguage", () => {
    it("should set valid language", () => {
      useGeneralSettingsStore.getState().setLanguage("es");
      expect(useGeneralSettingsStore.getState().language).toBe("es");

      useGeneralSettingsStore.getState().setLanguage("ja");
      expect(useGeneralSettingsStore.getState().language).toBe("ja");
    });

    it("should fall back to 'en' for invalid language", () => {
      useGeneralSettingsStore
        .getState()
        .setLanguage("invalid" as SupportedLanguage);
      expect(useGeneralSettingsStore.getState().language).toBe("en");
    });
  });

  describe("Store Actions - setTimezone", () => {
    it("should set valid timezone", () => {
      useGeneralSettingsStore.getState().setTimezone("Europe/London");
      expect(useGeneralSettingsStore.getState().timezone).toBe("Europe/London");
    });

    it("should fall back to browser timezone for invalid", () => {
      const browserTz = getBrowserTimezone();
      useGeneralSettingsStore.getState().setTimezone("Invalid/Timezone");
      expect(useGeneralSettingsStore.getState().timezone).toBe(browserTz);
    });
  });

  describe("Store Actions - setDisplayName", () => {
    it("should set display name", () => {
      useGeneralSettingsStore.getState().setDisplayName("Test User");
      expect(useGeneralSettingsStore.getState().displayName).toBe("Test User");
    });

    it("should trim display name", () => {
      useGeneralSettingsStore.getState().setDisplayName("  Spaced Name  ");
      expect(useGeneralSettingsStore.getState().displayName).toBe(
        "Spaced Name"
      );
    });

    it("should truncate long names", () => {
      const longName = "A".repeat(100);
      useGeneralSettingsStore.getState().setDisplayName(longName);
      expect(useGeneralSettingsStore.getState().displayName.length).toBe(50);
    });
  });

  describe("Store Actions - setEmailNotification", () => {
    it("should set individual notification setting", () => {
      useGeneralSettingsStore
        .getState()
        .setEmailNotification("srsReminders", false);
      expect(
        useGeneralSettingsStore.getState().emailNotifications.srsReminders
      ).toBe(false);

      useGeneralSettingsStore
        .getState()
        .setEmailNotification("marketing", true);
      expect(
        useGeneralSettingsStore.getState().emailNotifications.marketing
      ).toBe(true);
    });

    it("should not affect other notification settings", () => {
      useGeneralSettingsStore
        .getState()
        .setEmailNotification("srsReminders", false);
      expect(
        useGeneralSettingsStore.getState().emailNotifications.weeklyProgress
      ).toBe(true);
      expect(
        useGeneralSettingsStore.getState().emailNotifications.achievements
      ).toBe(true);
    });
  });

  describe("Store Actions - updateEmailNotifications", () => {
    it("should update multiple notifications", () => {
      useGeneralSettingsStore.getState().updateEmailNotifications({
        srsReminders: false,
        weeklyProgress: false,
      });

      const notifications =
        useGeneralSettingsStore.getState().emailNotifications;
      expect(notifications.srsReminders).toBe(false);
      expect(notifications.weeklyProgress).toBe(false);
      expect(notifications.achievements).toBe(true); // unchanged
    });
  });

  describe("Store Actions - enableAllEmailNotifications", () => {
    it("should enable all notifications", () => {
      // First disable all
      useGeneralSettingsStore.getState().disableAllEmailNotifications();

      // Then enable all
      useGeneralSettingsStore.getState().enableAllEmailNotifications();

      const notifications =
        useGeneralSettingsStore.getState().emailNotifications;
      expect(notifications.srsReminders).toBe(true);
      expect(notifications.weeklyProgress).toBe(true);
      expect(notifications.achievements).toBe(true);
      expect(notifications.groupActivity).toBe(true);
      expect(notifications.forumReplies).toBe(true);
      expect(notifications.marketing).toBe(true);
    });
  });

  describe("Store Actions - disableAllEmailNotifications", () => {
    it("should disable all notifications", () => {
      useGeneralSettingsStore.getState().disableAllEmailNotifications();

      const notifications =
        useGeneralSettingsStore.getState().emailNotifications;
      expect(notifications.srsReminders).toBe(false);
      expect(notifications.weeklyProgress).toBe(false);
      expect(notifications.achievements).toBe(false);
      expect(notifications.groupActivity).toBe(false);
      expect(notifications.forumReplies).toBe(false);
      expect(notifications.marketing).toBe(false);
    });
  });

  describe("Store Actions - updateSettings", () => {
    it("should update multiple settings at once", () => {
      useGeneralSettingsStore.getState().updateSettings({
        language: "es",
        timezone: "Europe/Madrid",
        displayName: "Spanish User",
      });

      const state = useGeneralSettingsStore.getState();
      expect(state.language).toBe("es");
      expect(state.timezone).toBe("Europe/Madrid");
      expect(state.displayName).toBe("Spanish User");
    });

    it("should validate settings during update", () => {
      useGeneralSettingsStore.getState().updateSettings({
        language: "invalid" as SupportedLanguage,
        displayName: "  Trimmed  ",
      });

      const state = useGeneralSettingsStore.getState();
      expect(state.language).toBe("en"); // validated
      expect(state.displayName).toBe("Trimmed"); // trimmed
    });
  });

  describe("Store Actions - resetSettings", () => {
    it("should reset all settings to defaults", () => {
      // Change settings
      useGeneralSettingsStore.getState().updateSettings({
        language: "ja",
        displayName: "Changed Name",
      });
      useGeneralSettingsStore.getState().disableAllEmailNotifications();

      // Reset
      useGeneralSettingsStore.getState().resetSettings();

      const state = useGeneralSettingsStore.getState();
      expect(state.language).toBe("en");
      expect(state.displayName).toBe("");
      expect(state.emailNotifications).toEqual(DEFAULT_EMAIL_NOTIFICATIONS);
    });

    it("should reset timezone to current browser timezone", () => {
      // Change timezone
      useGeneralSettingsStore.getState().setTimezone("Europe/London");

      // Reset
      useGeneralSettingsStore.getState().resetSettings();

      // Should be browser timezone (may or may not equal Europe/London)
      const tz = useGeneralSettingsStore.getState().timezone;
      expect(typeof tz).toBe("string");
      expect(tz.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid sequential updates", () => {
      useGeneralSettingsStore.getState().setLanguage("es");
      useGeneralSettingsStore.getState().setLanguage("ja");
      useGeneralSettingsStore.getState().setLanguage("zh");
      expect(useGeneralSettingsStore.getState().language).toBe("zh");
    });

    it("should handle mixed valid/invalid notification updates", () => {
      const mixed = {
        srsReminders: false,
        weeklyProgress: "invalid",
        achievements: true,
      } as unknown as Partial<EmailNotificationSettings>;

      useGeneralSettingsStore.getState().updateEmailNotifications(mixed);

      const notifications =
        useGeneralSettingsStore.getState().emailNotifications;
      expect(notifications.srsReminders).toBe(false);
      expect(notifications.weeklyProgress).toBe(true); // unchanged (invalid was ignored)
      expect(notifications.achievements).toBe(true);
    });

    it("should preserve other state when updating single field", () => {
      useGeneralSettingsStore.getState().updateSettings({
        language: "es",
        displayName: "Initial Name",
      });

      useGeneralSettingsStore.getState().setLanguage("ja");

      expect(useGeneralSettingsStore.getState().displayName).toBe(
        "Initial Name"
      );
      expect(useGeneralSettingsStore.getState().language).toBe("ja");
    });
  });
});
