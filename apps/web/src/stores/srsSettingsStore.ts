/**
 * SRS Settings store for Read Master
 *
 * Manages spaced repetition system preferences with localStorage persistence.
 * Controls daily limits, new card limits, notifications, reminder times, and auto-play.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SRS_SETTINGS_STORAGE_KEY = "read-master-srs-settings";

/**
 * Reminder time options (24-hour format)
 */
export const reminderTimes = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
] as const;
export type ReminderTime = (typeof reminderTimes)[number];

/**
 * Card order options for review sessions
 */
export const cardOrderOptions = [
  "due_date",
  "random",
  "difficulty",
  "added_date",
] as const;
export type CardOrder = (typeof cardOrderOptions)[number];

/**
 * Review rating style options
 */
export const ratingStyleOptions = ["buttons", "keyboard", "swipe"] as const;
export type RatingStyle = (typeof ratingStyleOptions)[number];

/**
 * Limits configuration
 */
export interface SRSLimits {
  /** Maximum reviews per day (0 = unlimited) */
  dailyReviewLimit: number;
  /** Maximum new cards per day */
  dailyNewCardLimit: number;
}

/**
 * Notification settings for SRS
 */
export interface SRSNotifications {
  /** Enable SRS notifications */
  enabled: boolean;
  /** Enable browser push notifications */
  pushEnabled: boolean;
  /** Enable email reminders */
  emailEnabled: boolean;
  /** Reminder time (24-hour format) */
  reminderTime: ReminderTime;
  /** Remind only when cards are due */
  onlyWhenDue: boolean;
}

/**
 * Review session preferences
 */
export interface SRSReviewPreferences {
  /** Order of cards in review session */
  cardOrder: CardOrder;
  /** Preferred rating style */
  ratingStyle: RatingStyle;
  /** Auto-play audio on card reveal */
  autoPlayAudio: boolean;
  /** Show progress during review */
  showProgress: boolean;
  /** Enable review undo feature */
  enableUndo: boolean;
  /** Auto-advance to next card after rating */
  autoAdvance: boolean;
  /** Auto-advance delay in milliseconds */
  autoAdvanceDelay: number;
}

/**
 * SRS settings interface
 */
export interface SRSSettings {
  /** Daily and new card limits */
  limits: SRSLimits;
  /** Notification settings */
  notifications: SRSNotifications;
  /** Review session preferences */
  reviewPreferences: SRSReviewPreferences;
}

/**
 * Deep partial type for SRS settings input
 */
export type DeepPartialSRSSettings = {
  limits?: Partial<SRSLimits>;
  notifications?: Partial<SRSNotifications>;
  reviewPreferences?: Partial<SRSReviewPreferences>;
};

/**
 * Limits range constants
 */
export const DAILY_REVIEW_LIMIT_RANGE = {
  min: 0,
  max: 500,
  default: 100,
} as const;

export const DAILY_NEW_CARD_LIMIT_RANGE = {
  min: 0,
  max: 100,
  default: 20,
} as const;

export const AUTO_ADVANCE_DELAY_RANGE = {
  min: 500,
  max: 3000,
  step: 250,
  default: 1000,
} as const;

/**
 * Default limits
 */
export const DEFAULT_SRS_LIMITS: SRSLimits = {
  dailyReviewLimit: DAILY_REVIEW_LIMIT_RANGE.default,
  dailyNewCardLimit: DAILY_NEW_CARD_LIMIT_RANGE.default,
};

/**
 * Default notification settings
 */
export const DEFAULT_SRS_NOTIFICATIONS: SRSNotifications = {
  enabled: true,
  pushEnabled: false,
  emailEnabled: true,
  reminderTime: "09:00",
  onlyWhenDue: true,
};

/**
 * Default review preferences
 */
export const DEFAULT_SRS_REVIEW_PREFERENCES: SRSReviewPreferences = {
  cardOrder: "due_date",
  ratingStyle: "buttons",
  autoPlayAudio: false,
  showProgress: true,
  enableUndo: true,
  autoAdvance: false,
  autoAdvanceDelay: AUTO_ADVANCE_DELAY_RANGE.default,
};

/**
 * Default SRS settings
 */
export const DEFAULT_SRS_SETTINGS: SRSSettings = {
  limits: DEFAULT_SRS_LIMITS,
  notifications: DEFAULT_SRS_NOTIFICATIONS,
  reviewPreferences: DEFAULT_SRS_REVIEW_PREFERENCES,
};

/**
 * Clamp a numeric value within a range
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate daily review limit
 */
export function validateDailyReviewLimit(limit: number): number {
  if (typeof limit !== "number" || isNaN(limit)) {
    return DAILY_REVIEW_LIMIT_RANGE.default;
  }
  return clampNumber(
    Math.round(limit),
    DAILY_REVIEW_LIMIT_RANGE.min,
    DAILY_REVIEW_LIMIT_RANGE.max
  );
}

/**
 * Validate daily new card limit
 */
export function validateDailyNewCardLimit(limit: number): number {
  if (typeof limit !== "number" || isNaN(limit)) {
    return DAILY_NEW_CARD_LIMIT_RANGE.default;
  }
  return clampNumber(
    Math.round(limit),
    DAILY_NEW_CARD_LIMIT_RANGE.min,
    DAILY_NEW_CARD_LIMIT_RANGE.max
  );
}

/**
 * Validate reminder time
 */
export function validateReminderTime(time: string): ReminderTime {
  return reminderTimes.includes(time as ReminderTime)
    ? (time as ReminderTime)
    : "09:00";
}

/**
 * Validate card order option
 */
export function validateCardOrder(order: string): CardOrder {
  return cardOrderOptions.includes(order as CardOrder)
    ? (order as CardOrder)
    : "due_date";
}

/**
 * Validate rating style option
 */
export function validateRatingStyle(style: string): RatingStyle {
  return ratingStyleOptions.includes(style as RatingStyle)
    ? (style as RatingStyle)
    : "buttons";
}

/**
 * Validate auto-advance delay
 */
export function validateAutoAdvanceDelay(delay: number): number {
  if (typeof delay !== "number" || isNaN(delay)) {
    return AUTO_ADVANCE_DELAY_RANGE.default;
  }
  return clampNumber(
    Math.round(delay / AUTO_ADVANCE_DELAY_RANGE.step) *
      AUTO_ADVANCE_DELAY_RANGE.step,
    AUTO_ADVANCE_DELAY_RANGE.min,
    AUTO_ADVANCE_DELAY_RANGE.max
  );
}

/**
 * Sanitize limits
 */
export function sanitizeLimits(limits: Partial<SRSLimits>): Partial<SRSLimits> {
  const sanitized: Partial<SRSLimits> = {};

  if (limits.dailyReviewLimit !== undefined) {
    sanitized.dailyReviewLimit = validateDailyReviewLimit(
      limits.dailyReviewLimit
    );
  }

  if (limits.dailyNewCardLimit !== undefined) {
    sanitized.dailyNewCardLimit = validateDailyNewCardLimit(
      limits.dailyNewCardLimit
    );
  }

  return sanitized;
}

/**
 * Sanitize notification settings
 */
export function sanitizeNotifications(
  notifications: Partial<SRSNotifications>
): Partial<SRSNotifications> {
  const sanitized: Partial<SRSNotifications> = {};

  if (typeof notifications.enabled === "boolean") {
    sanitized.enabled = notifications.enabled;
  }

  if (typeof notifications.pushEnabled === "boolean") {
    sanitized.pushEnabled = notifications.pushEnabled;
  }

  if (typeof notifications.emailEnabled === "boolean") {
    sanitized.emailEnabled = notifications.emailEnabled;
  }

  if (typeof notifications.reminderTime === "string") {
    sanitized.reminderTime = validateReminderTime(notifications.reminderTime);
  }

  if (typeof notifications.onlyWhenDue === "boolean") {
    sanitized.onlyWhenDue = notifications.onlyWhenDue;
  }

  return sanitized;
}

/**
 * Sanitize review preferences
 */
export function sanitizeReviewPreferences(
  prefs: Partial<SRSReviewPreferences>
): Partial<SRSReviewPreferences> {
  const sanitized: Partial<SRSReviewPreferences> = {};

  if (typeof prefs.cardOrder === "string") {
    sanitized.cardOrder = validateCardOrder(prefs.cardOrder);
  }

  if (typeof prefs.ratingStyle === "string") {
    sanitized.ratingStyle = validateRatingStyle(prefs.ratingStyle);
  }

  if (typeof prefs.autoPlayAudio === "boolean") {
    sanitized.autoPlayAudio = prefs.autoPlayAudio;
  }

  if (typeof prefs.showProgress === "boolean") {
    sanitized.showProgress = prefs.showProgress;
  }

  if (typeof prefs.enableUndo === "boolean") {
    sanitized.enableUndo = prefs.enableUndo;
  }

  if (typeof prefs.autoAdvance === "boolean") {
    sanitized.autoAdvance = prefs.autoAdvance;
  }

  if (prefs.autoAdvanceDelay !== undefined) {
    sanitized.autoAdvanceDelay = validateAutoAdvanceDelay(
      prefs.autoAdvanceDelay
    );
  }

  return sanitized;
}

/**
 * Sanitize full SRS settings
 */
export function sanitizeSRSSettings(
  settings: DeepPartialSRSSettings
): Partial<SRSSettings> {
  const sanitized: Partial<SRSSettings> = {};

  if (settings.limits) {
    sanitized.limits = {
      ...DEFAULT_SRS_LIMITS,
      ...sanitizeLimits(settings.limits),
    };
  }

  if (settings.notifications) {
    sanitized.notifications = {
      ...DEFAULT_SRS_NOTIFICATIONS,
      ...sanitizeNotifications(settings.notifications),
    };
  }

  if (settings.reviewPreferences) {
    sanitized.reviewPreferences = {
      ...DEFAULT_SRS_REVIEW_PREFERENCES,
      ...sanitizeReviewPreferences(settings.reviewPreferences),
    };
  }

  return sanitized;
}

/**
 * Format reminder time for display (12-hour format)
 */
export function formatReminderTime(time: ReminderTime): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get label key for card order option
 */
export function getCardOrderLabelKey(order: CardOrder): string {
  const keyMap: Record<CardOrder, string> = {
    due_date: "settings.srs.reviewPreferences.cardOrder.dueDate",
    random: "settings.srs.reviewPreferences.cardOrder.random",
    difficulty: "settings.srs.reviewPreferences.cardOrder.difficulty",
    added_date: "settings.srs.reviewPreferences.cardOrder.addedDate",
  };
  return keyMap[order];
}

/**
 * Get label key for rating style option
 */
export function getRatingStyleLabelKey(style: RatingStyle): string {
  const keyMap: Record<RatingStyle, string> = {
    buttons: "settings.srs.reviewPreferences.ratingStyle.buttons",
    keyboard: "settings.srs.reviewPreferences.ratingStyle.keyboard",
    swipe: "settings.srs.reviewPreferences.ratingStyle.swipe",
  };
  return keyMap[style];
}

/**
 * Check if any notifications are enabled
 */
export function hasAnyNotificationsEnabled(
  notifications: SRSNotifications
): boolean {
  return (
    notifications.enabled &&
    (notifications.pushEnabled || notifications.emailEnabled)
  );
}

/**
 * Store state interface
 */
interface SRSSettingsState extends SRSSettings {
  /** Update daily review limit */
  setDailyReviewLimit: (limit: number) => void;
  /** Update daily new card limit */
  setDailyNewCardLimit: (limit: number) => void;
  /** Update full limits object */
  updateLimits: (limits: Partial<SRSLimits>) => void;
  /** Toggle notifications enabled */
  setNotificationsEnabled: (enabled: boolean) => void;
  /** Toggle push notifications */
  setPushEnabled: (enabled: boolean) => void;
  /** Toggle email notifications */
  setEmailEnabled: (enabled: boolean) => void;
  /** Set reminder time */
  setReminderTime: (time: ReminderTime) => void;
  /** Toggle only when due */
  setOnlyWhenDue: (onlyWhenDue: boolean) => void;
  /** Update full notifications object */
  updateNotifications: (notifications: Partial<SRSNotifications>) => void;
  /** Set card order */
  setCardOrder: (order: CardOrder) => void;
  /** Set rating style */
  setRatingStyle: (style: RatingStyle) => void;
  /** Toggle auto-play audio */
  setAutoPlayAudio: (enabled: boolean) => void;
  /** Toggle show progress */
  setShowProgress: (enabled: boolean) => void;
  /** Toggle undo feature */
  setEnableUndo: (enabled: boolean) => void;
  /** Toggle auto-advance */
  setAutoAdvance: (enabled: boolean) => void;
  /** Set auto-advance delay */
  setAutoAdvanceDelay: (delay: number) => void;
  /** Update full review preferences object */
  updateReviewPreferences: (prefs: Partial<SRSReviewPreferences>) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
  /** Reset limits to defaults */
  resetLimits: () => void;
  /** Reset notifications to defaults */
  resetNotifications: () => void;
  /** Reset review preferences to defaults */
  resetReviewPreferences: () => void;
}

export const useSRSSettingsStore = create<SRSSettingsState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_SRS_SETTINGS,

      // Limits actions
      setDailyReviewLimit: (limit) =>
        set((state) => ({
          limits: {
            ...state.limits,
            dailyReviewLimit: validateDailyReviewLimit(limit),
          },
        })),

      setDailyNewCardLimit: (limit) =>
        set((state) => ({
          limits: {
            ...state.limits,
            dailyNewCardLimit: validateDailyNewCardLimit(limit),
          },
        })),

      updateLimits: (limits) =>
        set((state) => ({
          limits: {
            ...state.limits,
            ...sanitizeLimits(limits),
          },
        })),

      // Notification actions
      setNotificationsEnabled: (enabled) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            enabled,
          },
        })),

      setPushEnabled: (enabled) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            pushEnabled: enabled,
          },
        })),

      setEmailEnabled: (enabled) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            emailEnabled: enabled,
          },
        })),

      setReminderTime: (time) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            reminderTime: validateReminderTime(time),
          },
        })),

      setOnlyWhenDue: (onlyWhenDue) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            onlyWhenDue,
          },
        })),

      updateNotifications: (notifications) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            ...sanitizeNotifications(notifications),
          },
        })),

      // Review preference actions
      setCardOrder: (order) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            cardOrder: validateCardOrder(order),
          },
        })),

      setRatingStyle: (style) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            ratingStyle: validateRatingStyle(style),
          },
        })),

      setAutoPlayAudio: (enabled) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            autoPlayAudio: enabled,
          },
        })),

      setShowProgress: (enabled) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            showProgress: enabled,
          },
        })),

      setEnableUndo: (enabled) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            enableUndo: enabled,
          },
        })),

      setAutoAdvance: (enabled) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            autoAdvance: enabled,
          },
        })),

      setAutoAdvanceDelay: (delay) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            autoAdvanceDelay: validateAutoAdvanceDelay(delay),
          },
        })),

      updateReviewPreferences: (prefs) =>
        set((state) => ({
          reviewPreferences: {
            ...state.reviewPreferences,
            ...sanitizeReviewPreferences(prefs),
          },
        })),

      // Reset actions
      resetSettings: () =>
        set(() => ({
          ...DEFAULT_SRS_SETTINGS,
        })),

      resetLimits: () =>
        set(() => ({
          limits: DEFAULT_SRS_LIMITS,
        })),

      resetNotifications: () =>
        set(() => ({
          notifications: DEFAULT_SRS_NOTIFICATIONS,
        })),

      resetReviewPreferences: () =>
        set(() => ({
          reviewPreferences: DEFAULT_SRS_REVIEW_PREFERENCES,
        })),
    }),
    {
      name: SRS_SETTINGS_STORAGE_KEY,
    }
  )
);
