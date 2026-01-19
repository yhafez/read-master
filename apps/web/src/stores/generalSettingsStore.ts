/**
 * General Settings store for Read Master
 *
 * Manages user's general preferences with localStorage persistence.
 * Controls language, timezone, display name, and email notification settings.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const GENERAL_SETTINGS_STORAGE_KEY = "read-master-general-settings";

/**
 * Supported languages
 * Keep in sync with apps/web/src/i18n/index.ts
 */
export const supportedLanguages = ["en", "ar", "es", "ja", "zh", "tl"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/**
 * Language display names
 */
export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  ja: "日本語",
  zh: "中文",
  tl: "Tagalog",
};

/**
 * Common timezone options
 * A curated list of common timezones for user selection
 */
export const commonTimezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Stockholm",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Manila",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "UTC",
] as const;

export type CommonTimezone = (typeof commonTimezones)[number];

/**
 * Get user's browser timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Email notification settings
 */
export interface EmailNotificationSettings {
  /** Receive daily SRS reminder emails */
  srsReminders: boolean;
  /** Receive weekly reading progress summaries */
  weeklyProgress: boolean;
  /** Receive achievement notifications */
  achievements: boolean;
  /** Receive group activity notifications */
  groupActivity: boolean;
  /** Receive forum reply notifications */
  forumReplies: boolean;
  /** Receive marketing and product updates */
  marketing: boolean;
}

/**
 * General settings interface
 */
export interface GeneralSettings {
  /** User's preferred language */
  language: SupportedLanguage;
  /** User's timezone for date/time display */
  timezone: string;
  /** User's display name (for social features) */
  displayName: string;
  /** Email notification preferences */
  emailNotifications: EmailNotificationSettings;
}

/**
 * Default email notification settings
 */
export const DEFAULT_EMAIL_NOTIFICATIONS: EmailNotificationSettings = {
  srsReminders: true,
  weeklyProgress: true,
  achievements: true,
  groupActivity: true,
  forumReplies: true,
  marketing: false,
};

/**
 * Default general settings
 */
export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  language: "en",
  timezone: getBrowserTimezone(),
  displayName: "",
  emailNotifications: DEFAULT_EMAIL_NOTIFICATIONS,
};

/**
 * Validate language
 */
export function validateLanguage(lang: string): SupportedLanguage {
  return supportedLanguages.includes(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : "en";
}

/**
 * Validate timezone string
 * Checks if the timezone is valid by attempting to use it
 */
export function validateTimezone(tz: string): string {
  if (!tz || typeof tz !== "string") {
    return getBrowserTimezone();
  }

  try {
    // Test if the timezone is valid
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return getBrowserTimezone();
  }
}

/**
 * Validate display name
 * Trims whitespace and enforces max length
 */
export function validateDisplayName(name: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }

  // Trim and limit to 50 characters
  return name.trim().substring(0, 50);
}

/**
 * Sanitize email notification settings
 */
export function sanitizeEmailNotifications(
  notifications: Partial<EmailNotificationSettings>
): Partial<EmailNotificationSettings> {
  const sanitized: Partial<EmailNotificationSettings> = {};

  if (typeof notifications.srsReminders === "boolean") {
    sanitized.srsReminders = notifications.srsReminders;
  }

  if (typeof notifications.weeklyProgress === "boolean") {
    sanitized.weeklyProgress = notifications.weeklyProgress;
  }

  if (typeof notifications.achievements === "boolean") {
    sanitized.achievements = notifications.achievements;
  }

  if (typeof notifications.groupActivity === "boolean") {
    sanitized.groupActivity = notifications.groupActivity;
  }

  if (typeof notifications.forumReplies === "boolean") {
    sanitized.forumReplies = notifications.forumReplies;
  }

  if (typeof notifications.marketing === "boolean") {
    sanitized.marketing = notifications.marketing;
  }

  return sanitized;
}

/**
 * Sanitize general settings
 */
export function sanitizeGeneralSettings(
  settings: Partial<GeneralSettings>
): Partial<GeneralSettings> {
  const sanitized: Partial<GeneralSettings> = {};

  if (typeof settings.language === "string") {
    sanitized.language = validateLanguage(settings.language);
  }

  if (typeof settings.timezone === "string") {
    sanitized.timezone = validateTimezone(settings.timezone);
  }

  if (typeof settings.displayName === "string") {
    sanitized.displayName = validateDisplayName(settings.displayName);
  }

  if (settings.emailNotifications) {
    sanitized.emailNotifications = {
      ...DEFAULT_EMAIL_NOTIFICATIONS,
      ...sanitizeEmailNotifications(settings.emailNotifications),
    };
  }

  return sanitized;
}

/**
 * Format timezone for display
 * Returns a human-readable timezone string with offset
 */
export function formatTimezoneDisplay(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";

    // Get offset
    const offsetFormatter = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const offsetParts = offsetFormatter.formatToParts(now);
    const offset =
      offsetParts.find((p) => p.type === "timeZoneName")?.value ?? "";

    // Format: "America/New_York (EST, GMT-05:00)"
    return `${tz.replace(/_/g, " ")} (${tzName}, ${offset})`;
  } catch {
    return tz;
  }
}

interface GeneralSettingsState extends GeneralSettings {
  /** Set language */
  setLanguage: (language: SupportedLanguage) => void;
  /** Set timezone */
  setTimezone: (timezone: string) => void;
  /** Set display name */
  setDisplayName: (name: string) => void;
  /** Update a specific email notification setting */
  setEmailNotification: (
    key: keyof EmailNotificationSettings,
    enabled: boolean
  ) => void;
  /** Update multiple email notification settings */
  updateEmailNotifications: (
    notifications: Partial<EmailNotificationSettings>
  ) => void;
  /** Enable all email notifications */
  enableAllEmailNotifications: () => void;
  /** Disable all email notifications */
  disableAllEmailNotifications: () => void;
  /** Update multiple settings at once */
  updateSettings: (settings: Partial<GeneralSettings>) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
}

export const useGeneralSettingsStore = create<GeneralSettingsState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_GENERAL_SETTINGS,

      // Actions
      setLanguage: (language) =>
        set(() => ({
          language: validateLanguage(language),
        })),

      setTimezone: (timezone) =>
        set(() => ({
          timezone: validateTimezone(timezone),
        })),

      setDisplayName: (name) =>
        set(() => ({
          displayName: validateDisplayName(name),
        })),

      setEmailNotification: (key, enabled) =>
        set((state) => ({
          emailNotifications: {
            ...state.emailNotifications,
            [key]: enabled,
          },
        })),

      updateEmailNotifications: (notifications) =>
        set((state) => ({
          emailNotifications: {
            ...state.emailNotifications,
            ...sanitizeEmailNotifications(notifications),
          },
        })),

      enableAllEmailNotifications: () =>
        set(() => ({
          emailNotifications: {
            srsReminders: true,
            weeklyProgress: true,
            achievements: true,
            groupActivity: true,
            forumReplies: true,
            marketing: true,
          },
        })),

      disableAllEmailNotifications: () =>
        set(() => ({
          emailNotifications: {
            srsReminders: false,
            weeklyProgress: false,
            achievements: false,
            groupActivity: false,
            forumReplies: false,
            marketing: false,
          },
        })),

      updateSettings: (settings) =>
        set((state) => ({
          ...state,
          ...sanitizeGeneralSettings(settings),
        })),

      resetSettings: () =>
        set(() => ({
          ...DEFAULT_GENERAL_SETTINGS,
          timezone: getBrowserTimezone(), // Reset to current browser timezone
        })),
    }),
    {
      name: GENERAL_SETTINGS_STORAGE_KEY,
    }
  )
);
