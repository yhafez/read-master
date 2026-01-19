/**
 * Tests for SRS Settings store
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clampNumber,
  validateDailyReviewLimit,
  validateDailyNewCardLimit,
  validateReminderTime,
  validateCardOrder,
  validateRatingStyle,
  validateAutoAdvanceDelay,
  sanitizeLimits,
  sanitizeNotifications,
  sanitizeReviewPreferences,
  sanitizeSRSSettings,
  formatReminderTime,
  getCardOrderLabelKey,
  getRatingStyleLabelKey,
  hasAnyNotificationsEnabled,
  DEFAULT_SRS_LIMITS,
  DEFAULT_SRS_NOTIFICATIONS,
  DEFAULT_SRS_REVIEW_PREFERENCES,
  DEFAULT_SRS_SETTINGS,
  DAILY_REVIEW_LIMIT_RANGE,
  DAILY_NEW_CARD_LIMIT_RANGE,
  AUTO_ADVANCE_DELAY_RANGE,
  useSRSSettingsStore,
} from "./srsSettingsStore";
import type { ReminderTime, CardOrder, RatingStyle } from "./srsSettingsStore";

describe("srsSettingsStore", () => {
  describe("clampNumber", () => {
    it("should return the value when within range", () => {
      expect(clampNumber(50, 0, 100)).toBe(50);
    });

    it("should return min when value is below range", () => {
      expect(clampNumber(-10, 0, 100)).toBe(0);
    });

    it("should return max when value is above range", () => {
      expect(clampNumber(150, 0, 100)).toBe(100);
    });

    it("should handle edge cases at boundaries", () => {
      expect(clampNumber(0, 0, 100)).toBe(0);
      expect(clampNumber(100, 0, 100)).toBe(100);
    });
  });

  describe("validateDailyReviewLimit", () => {
    it("should return valid limit unchanged", () => {
      expect(validateDailyReviewLimit(50)).toBe(50);
    });

    it("should clamp values below minimum", () => {
      expect(validateDailyReviewLimit(-10)).toBe(DAILY_REVIEW_LIMIT_RANGE.min);
    });

    it("should clamp values above maximum", () => {
      expect(validateDailyReviewLimit(1000)).toBe(DAILY_REVIEW_LIMIT_RANGE.max);
    });

    it("should round decimal values", () => {
      expect(validateDailyReviewLimit(50.7)).toBe(51);
      expect(validateDailyReviewLimit(50.3)).toBe(50);
    });

    it("should return default for NaN", () => {
      expect(validateDailyReviewLimit(NaN)).toBe(
        DAILY_REVIEW_LIMIT_RANGE.default
      );
    });

    it("should return default for non-number types", () => {
      expect(validateDailyReviewLimit("100" as unknown as number)).toBe(
        DAILY_REVIEW_LIMIT_RANGE.default
      );
    });
  });

  describe("validateDailyNewCardLimit", () => {
    it("should return valid limit unchanged", () => {
      expect(validateDailyNewCardLimit(20)).toBe(20);
    });

    it("should clamp values below minimum", () => {
      expect(validateDailyNewCardLimit(-5)).toBe(
        DAILY_NEW_CARD_LIMIT_RANGE.min
      );
    });

    it("should clamp values above maximum", () => {
      expect(validateDailyNewCardLimit(200)).toBe(
        DAILY_NEW_CARD_LIMIT_RANGE.max
      );
    });

    it("should round decimal values", () => {
      expect(validateDailyNewCardLimit(20.9)).toBe(21);
    });

    it("should return default for NaN", () => {
      expect(validateDailyNewCardLimit(NaN)).toBe(
        DAILY_NEW_CARD_LIMIT_RANGE.default
      );
    });
  });

  describe("validateReminderTime", () => {
    it("should return valid time unchanged", () => {
      expect(validateReminderTime("09:00")).toBe("09:00");
      expect(validateReminderTime("18:00")).toBe("18:00");
    });

    it("should return default for invalid time", () => {
      expect(validateReminderTime("invalid")).toBe("09:00");
      expect(validateReminderTime("25:00")).toBe("09:00");
      expect(validateReminderTime("05:00")).toBe("09:00"); // Not in the list
    });

    it("should handle empty string", () => {
      expect(validateReminderTime("")).toBe("09:00");
    });
  });

  describe("validateCardOrder", () => {
    it("should return valid order unchanged", () => {
      expect(validateCardOrder("due_date")).toBe("due_date");
      expect(validateCardOrder("random")).toBe("random");
      expect(validateCardOrder("difficulty")).toBe("difficulty");
      expect(validateCardOrder("added_date")).toBe("added_date");
    });

    it("should return default for invalid order", () => {
      expect(validateCardOrder("invalid")).toBe("due_date");
      expect(validateCardOrder("")).toBe("due_date");
    });
  });

  describe("validateRatingStyle", () => {
    it("should return valid style unchanged", () => {
      expect(validateRatingStyle("buttons")).toBe("buttons");
      expect(validateRatingStyle("keyboard")).toBe("keyboard");
      expect(validateRatingStyle("swipe")).toBe("swipe");
    });

    it("should return default for invalid style", () => {
      expect(validateRatingStyle("invalid")).toBe("buttons");
      expect(validateRatingStyle("")).toBe("buttons");
    });
  });

  describe("validateAutoAdvanceDelay", () => {
    it("should return valid delay unchanged (rounded to step)", () => {
      expect(validateAutoAdvanceDelay(1000)).toBe(1000);
      expect(validateAutoAdvanceDelay(1500)).toBe(1500);
    });

    it("should round to nearest step", () => {
      expect(validateAutoAdvanceDelay(1123)).toBe(1000);
      expect(validateAutoAdvanceDelay(1200)).toBe(1250);
    });

    it("should clamp below minimum", () => {
      expect(validateAutoAdvanceDelay(100)).toBe(AUTO_ADVANCE_DELAY_RANGE.min);
    });

    it("should clamp above maximum", () => {
      expect(validateAutoAdvanceDelay(5000)).toBe(AUTO_ADVANCE_DELAY_RANGE.max);
    });

    it("should return default for NaN", () => {
      expect(validateAutoAdvanceDelay(NaN)).toBe(
        AUTO_ADVANCE_DELAY_RANGE.default
      );
    });
  });

  describe("sanitizeLimits", () => {
    it("should sanitize valid limits", () => {
      const result = sanitizeLimits({
        dailyReviewLimit: 50,
        dailyNewCardLimit: 10,
      });
      expect(result.dailyReviewLimit).toBe(50);
      expect(result.dailyNewCardLimit).toBe(10);
    });

    it("should only include defined properties", () => {
      const result = sanitizeLimits({ dailyReviewLimit: 50 });
      expect(result.dailyReviewLimit).toBe(50);
      expect(result.dailyNewCardLimit).toBeUndefined();
    });

    it("should validate values", () => {
      const result = sanitizeLimits({
        dailyReviewLimit: 1000,
        dailyNewCardLimit: -5,
      });
      expect(result.dailyReviewLimit).toBe(DAILY_REVIEW_LIMIT_RANGE.max);
      expect(result.dailyNewCardLimit).toBe(DAILY_NEW_CARD_LIMIT_RANGE.min);
    });

    it("should handle empty object", () => {
      const result = sanitizeLimits({});
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("sanitizeNotifications", () => {
    it("should sanitize all notification properties", () => {
      const result = sanitizeNotifications({
        enabled: true,
        pushEnabled: false,
        emailEnabled: true,
        reminderTime: "18:00",
        onlyWhenDue: false,
      });
      expect(result.enabled).toBe(true);
      expect(result.pushEnabled).toBe(false);
      expect(result.emailEnabled).toBe(true);
      expect(result.reminderTime).toBe("18:00");
      expect(result.onlyWhenDue).toBe(false);
    });

    it("should only include defined boolean properties", () => {
      const result = sanitizeNotifications({ enabled: false });
      expect(result.enabled).toBe(false);
      expect(result.pushEnabled).toBeUndefined();
    });

    it("should validate reminder time", () => {
      const result = sanitizeNotifications({
        reminderTime: "invalid" as ReminderTime,
      });
      expect(result.reminderTime).toBe("09:00");
    });

    it("should ignore non-boolean values for boolean fields", () => {
      const result = sanitizeNotifications({
        enabled: "true" as unknown as boolean,
      });
      expect(result.enabled).toBeUndefined();
    });
  });

  describe("sanitizeReviewPreferences", () => {
    it("should sanitize all review preferences", () => {
      const result = sanitizeReviewPreferences({
        cardOrder: "random",
        ratingStyle: "keyboard",
        autoPlayAudio: true,
        showProgress: false,
        enableUndo: false,
        autoAdvance: true,
        autoAdvanceDelay: 2000,
      });
      expect(result.cardOrder).toBe("random");
      expect(result.ratingStyle).toBe("keyboard");
      expect(result.autoPlayAudio).toBe(true);
      expect(result.showProgress).toBe(false);
      expect(result.enableUndo).toBe(false);
      expect(result.autoAdvance).toBe(true);
      expect(result.autoAdvanceDelay).toBe(2000);
    });

    it("should validate card order", () => {
      const result = sanitizeReviewPreferences({
        cardOrder: "invalid" as CardOrder,
      });
      expect(result.cardOrder).toBe("due_date");
    });

    it("should validate rating style", () => {
      const result = sanitizeReviewPreferences({
        ratingStyle: "invalid" as RatingStyle,
      });
      expect(result.ratingStyle).toBe("buttons");
    });

    it("should validate auto-advance delay", () => {
      const result = sanitizeReviewPreferences({ autoAdvanceDelay: 10000 });
      expect(result.autoAdvanceDelay).toBe(AUTO_ADVANCE_DELAY_RANGE.max);
    });
  });

  describe("sanitizeSRSSettings", () => {
    it("should sanitize full settings object", () => {
      const result = sanitizeSRSSettings({
        limits: { dailyReviewLimit: 200 },
        notifications: { enabled: false },
        reviewPreferences: { cardOrder: "random" },
      });

      expect(result.limits?.dailyReviewLimit).toBe(200);
      expect(result.limits?.dailyNewCardLimit).toBe(
        DEFAULT_SRS_LIMITS.dailyNewCardLimit
      );
      expect(result.notifications?.enabled).toBe(false);
      expect(result.reviewPreferences?.cardOrder).toBe("random");
    });

    it("should handle empty object", () => {
      const result = sanitizeSRSSettings({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should merge with defaults for each section", () => {
      const result = sanitizeSRSSettings({
        limits: { dailyReviewLimit: 50 },
      });
      expect(result.limits?.dailyReviewLimit).toBe(50);
      expect(result.limits?.dailyNewCardLimit).toBe(
        DEFAULT_SRS_LIMITS.dailyNewCardLimit
      );
    });
  });

  describe("formatReminderTime", () => {
    it("should format morning times correctly", () => {
      expect(formatReminderTime("06:00")).toBe("6:00 AM");
      expect(formatReminderTime("09:00")).toBe("9:00 AM");
      expect(formatReminderTime("11:00")).toBe("11:00 AM");
    });

    it("should format noon correctly", () => {
      expect(formatReminderTime("12:00")).toBe("12:00 PM");
    });

    it("should format afternoon/evening times correctly", () => {
      expect(formatReminderTime("13:00")).toBe("1:00 PM");
      expect(formatReminderTime("18:00")).toBe("6:00 PM");
      expect(formatReminderTime("22:00")).toBe("10:00 PM");
    });
  });

  describe("getCardOrderLabelKey", () => {
    it("should return correct label keys", () => {
      expect(getCardOrderLabelKey("due_date")).toBe(
        "settings.srs.reviewPreferences.cardOrder.dueDate"
      );
      expect(getCardOrderLabelKey("random")).toBe(
        "settings.srs.reviewPreferences.cardOrder.random"
      );
      expect(getCardOrderLabelKey("difficulty")).toBe(
        "settings.srs.reviewPreferences.cardOrder.difficulty"
      );
      expect(getCardOrderLabelKey("added_date")).toBe(
        "settings.srs.reviewPreferences.cardOrder.addedDate"
      );
    });
  });

  describe("getRatingStyleLabelKey", () => {
    it("should return correct label keys", () => {
      expect(getRatingStyleLabelKey("buttons")).toBe(
        "settings.srs.reviewPreferences.ratingStyle.buttons"
      );
      expect(getRatingStyleLabelKey("keyboard")).toBe(
        "settings.srs.reviewPreferences.ratingStyle.keyboard"
      );
      expect(getRatingStyleLabelKey("swipe")).toBe(
        "settings.srs.reviewPreferences.ratingStyle.swipe"
      );
    });
  });

  describe("hasAnyNotificationsEnabled", () => {
    it("should return true when push is enabled", () => {
      expect(
        hasAnyNotificationsEnabled({
          ...DEFAULT_SRS_NOTIFICATIONS,
          enabled: true,
          pushEnabled: true,
          emailEnabled: false,
        })
      ).toBe(true);
    });

    it("should return true when email is enabled", () => {
      expect(
        hasAnyNotificationsEnabled({
          ...DEFAULT_SRS_NOTIFICATIONS,
          enabled: true,
          pushEnabled: false,
          emailEnabled: true,
        })
      ).toBe(true);
    });

    it("should return false when global notifications is disabled", () => {
      expect(
        hasAnyNotificationsEnabled({
          ...DEFAULT_SRS_NOTIFICATIONS,
          enabled: false,
          pushEnabled: true,
          emailEnabled: true,
        })
      ).toBe(false);
    });

    it("should return false when no notification types are enabled", () => {
      expect(
        hasAnyNotificationsEnabled({
          ...DEFAULT_SRS_NOTIFICATIONS,
          enabled: true,
          pushEnabled: false,
          emailEnabled: false,
        })
      ).toBe(false);
    });
  });

  describe("defaults", () => {
    it("should have valid default limits", () => {
      expect(DEFAULT_SRS_LIMITS.dailyReviewLimit).toBe(100);
      expect(DEFAULT_SRS_LIMITS.dailyNewCardLimit).toBe(20);
    });

    it("should have valid default notifications", () => {
      expect(DEFAULT_SRS_NOTIFICATIONS.enabled).toBe(true);
      expect(DEFAULT_SRS_NOTIFICATIONS.pushEnabled).toBe(false);
      expect(DEFAULT_SRS_NOTIFICATIONS.emailEnabled).toBe(true);
      expect(DEFAULT_SRS_NOTIFICATIONS.reminderTime).toBe("09:00");
      expect(DEFAULT_SRS_NOTIFICATIONS.onlyWhenDue).toBe(true);
    });

    it("should have valid default review preferences", () => {
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.cardOrder).toBe("due_date");
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.ratingStyle).toBe("buttons");
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.autoPlayAudio).toBe(false);
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.showProgress).toBe(true);
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.enableUndo).toBe(true);
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.autoAdvance).toBe(false);
      expect(DEFAULT_SRS_REVIEW_PREFERENCES.autoAdvanceDelay).toBe(1000);
    });

    it("should have valid default settings", () => {
      expect(DEFAULT_SRS_SETTINGS.limits).toEqual(DEFAULT_SRS_LIMITS);
      expect(DEFAULT_SRS_SETTINGS.notifications).toEqual(
        DEFAULT_SRS_NOTIFICATIONS
      );
      expect(DEFAULT_SRS_SETTINGS.reviewPreferences).toEqual(
        DEFAULT_SRS_REVIEW_PREFERENCES
      );
    });
  });

  describe("useSRSSettingsStore", () => {
    beforeEach(() => {
      useSRSSettingsStore.setState(DEFAULT_SRS_SETTINGS);
    });

    it("should initialize with default values", () => {
      const state = useSRSSettingsStore.getState();
      expect(state.limits).toEqual(DEFAULT_SRS_LIMITS);
      expect(state.notifications).toEqual(DEFAULT_SRS_NOTIFICATIONS);
      expect(state.reviewPreferences).toEqual(DEFAULT_SRS_REVIEW_PREFERENCES);
    });

    describe("limits actions", () => {
      it("should set daily review limit", () => {
        useSRSSettingsStore.getState().setDailyReviewLimit(200);
        expect(useSRSSettingsStore.getState().limits.dailyReviewLimit).toBe(
          200
        );
      });

      it("should validate daily review limit", () => {
        useSRSSettingsStore.getState().setDailyReviewLimit(1000);
        expect(useSRSSettingsStore.getState().limits.dailyReviewLimit).toBe(
          DAILY_REVIEW_LIMIT_RANGE.max
        );
      });

      it("should set daily new card limit", () => {
        useSRSSettingsStore.getState().setDailyNewCardLimit(30);
        expect(useSRSSettingsStore.getState().limits.dailyNewCardLimit).toBe(
          30
        );
      });

      it("should update limits with partial object", () => {
        useSRSSettingsStore.getState().updateLimits({ dailyReviewLimit: 150 });
        const state = useSRSSettingsStore.getState();
        expect(state.limits.dailyReviewLimit).toBe(150);
        expect(state.limits.dailyNewCardLimit).toBe(
          DEFAULT_SRS_LIMITS.dailyNewCardLimit
        );
      });
    });

    describe("notification actions", () => {
      it("should toggle notifications enabled", () => {
        useSRSSettingsStore.getState().setNotificationsEnabled(false);
        expect(useSRSSettingsStore.getState().notifications.enabled).toBe(
          false
        );
      });

      it("should toggle push enabled", () => {
        useSRSSettingsStore.getState().setPushEnabled(true);
        expect(useSRSSettingsStore.getState().notifications.pushEnabled).toBe(
          true
        );
      });

      it("should toggle email enabled", () => {
        useSRSSettingsStore.getState().setEmailEnabled(false);
        expect(useSRSSettingsStore.getState().notifications.emailEnabled).toBe(
          false
        );
      });

      it("should set reminder time", () => {
        useSRSSettingsStore.getState().setReminderTime("18:00");
        expect(useSRSSettingsStore.getState().notifications.reminderTime).toBe(
          "18:00"
        );
      });

      it("should validate reminder time", () => {
        useSRSSettingsStore.getState().setReminderTime("invalid" as "09:00");
        expect(useSRSSettingsStore.getState().notifications.reminderTime).toBe(
          "09:00"
        );
      });

      it("should toggle only when due", () => {
        useSRSSettingsStore.getState().setOnlyWhenDue(false);
        expect(useSRSSettingsStore.getState().notifications.onlyWhenDue).toBe(
          false
        );
      });

      it("should update notifications with partial object", () => {
        useSRSSettingsStore.getState().updateNotifications({
          pushEnabled: true,
          emailEnabled: false,
        });
        const state = useSRSSettingsStore.getState();
        expect(state.notifications.pushEnabled).toBe(true);
        expect(state.notifications.emailEnabled).toBe(false);
        expect(state.notifications.enabled).toBe(
          DEFAULT_SRS_NOTIFICATIONS.enabled
        );
      });
    });

    describe("review preference actions", () => {
      it("should set card order", () => {
        useSRSSettingsStore.getState().setCardOrder("random");
        expect(useSRSSettingsStore.getState().reviewPreferences.cardOrder).toBe(
          "random"
        );
      });

      it("should validate card order", () => {
        useSRSSettingsStore.getState().setCardOrder("invalid" as "due_date");
        expect(useSRSSettingsStore.getState().reviewPreferences.cardOrder).toBe(
          "due_date"
        );
      });

      it("should set rating style", () => {
        useSRSSettingsStore.getState().setRatingStyle("keyboard");
        expect(
          useSRSSettingsStore.getState().reviewPreferences.ratingStyle
        ).toBe("keyboard");
      });

      it("should toggle auto-play audio", () => {
        useSRSSettingsStore.getState().setAutoPlayAudio(true);
        expect(
          useSRSSettingsStore.getState().reviewPreferences.autoPlayAudio
        ).toBe(true);
      });

      it("should toggle show progress", () => {
        useSRSSettingsStore.getState().setShowProgress(false);
        expect(
          useSRSSettingsStore.getState().reviewPreferences.showProgress
        ).toBe(false);
      });

      it("should toggle enable undo", () => {
        useSRSSettingsStore.getState().setEnableUndo(false);
        expect(
          useSRSSettingsStore.getState().reviewPreferences.enableUndo
        ).toBe(false);
      });

      it("should toggle auto-advance", () => {
        useSRSSettingsStore.getState().setAutoAdvance(true);
        expect(
          useSRSSettingsStore.getState().reviewPreferences.autoAdvance
        ).toBe(true);
      });

      it("should set auto-advance delay", () => {
        useSRSSettingsStore.getState().setAutoAdvanceDelay(2000);
        expect(
          useSRSSettingsStore.getState().reviewPreferences.autoAdvanceDelay
        ).toBe(2000);
      });

      it("should validate auto-advance delay", () => {
        useSRSSettingsStore.getState().setAutoAdvanceDelay(10000);
        expect(
          useSRSSettingsStore.getState().reviewPreferences.autoAdvanceDelay
        ).toBe(AUTO_ADVANCE_DELAY_RANGE.max);
      });

      it("should update review preferences with partial object", () => {
        useSRSSettingsStore.getState().updateReviewPreferences({
          cardOrder: "difficulty",
          autoAdvance: true,
        });
        const state = useSRSSettingsStore.getState();
        expect(state.reviewPreferences.cardOrder).toBe("difficulty");
        expect(state.reviewPreferences.autoAdvance).toBe(true);
        expect(state.reviewPreferences.ratingStyle).toBe(
          DEFAULT_SRS_REVIEW_PREFERENCES.ratingStyle
        );
      });
    });

    describe("reset actions", () => {
      it("should reset all settings", () => {
        useSRSSettingsStore.getState().setDailyReviewLimit(200);
        useSRSSettingsStore.getState().setNotificationsEnabled(false);
        useSRSSettingsStore.getState().setCardOrder("random");

        useSRSSettingsStore.getState().resetSettings();

        const state = useSRSSettingsStore.getState();
        expect(state.limits).toEqual(DEFAULT_SRS_LIMITS);
        expect(state.notifications).toEqual(DEFAULT_SRS_NOTIFICATIONS);
        expect(state.reviewPreferences).toEqual(DEFAULT_SRS_REVIEW_PREFERENCES);
      });

      it("should reset limits only", () => {
        useSRSSettingsStore.getState().setDailyReviewLimit(200);
        useSRSSettingsStore.getState().setNotificationsEnabled(false);

        useSRSSettingsStore.getState().resetLimits();

        const state = useSRSSettingsStore.getState();
        expect(state.limits).toEqual(DEFAULT_SRS_LIMITS);
        expect(state.notifications.enabled).toBe(false);
      });

      it("should reset notifications only", () => {
        useSRSSettingsStore.getState().setDailyReviewLimit(200);
        useSRSSettingsStore.getState().setNotificationsEnabled(false);

        useSRSSettingsStore.getState().resetNotifications();

        const state = useSRSSettingsStore.getState();
        expect(state.limits.dailyReviewLimit).toBe(200);
        expect(state.notifications).toEqual(DEFAULT_SRS_NOTIFICATIONS);
      });

      it("should reset review preferences only", () => {
        useSRSSettingsStore.getState().setCardOrder("random");
        useSRSSettingsStore.getState().setDailyReviewLimit(200);

        useSRSSettingsStore.getState().resetReviewPreferences();

        const state = useSRSSettingsStore.getState();
        expect(state.limits.dailyReviewLimit).toBe(200);
        expect(state.reviewPreferences).toEqual(DEFAULT_SRS_REVIEW_PREFERENCES);
      });
    });
  });
});
