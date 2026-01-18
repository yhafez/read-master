/**
 * Zod schemas for User operations
 *
 * These schemas validate user-related API requests for:
 * - User profile management
 * - Preferences and settings
 * - Privacy controls
 * - User search and listing
 *
 * Profanity filtering is applied to public-facing content (display name, bio).
 *
 * @example
 * ```typescript
 * import { updateUserProfileSchema, userPreferencesSchema } from '@read-master/shared/schemas';
 *
 * // Validate profile update
 * const result = updateUserProfileSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * ```
 */

import { z } from "zod";

import { containsProfanity } from "../utils/moderation";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * User tier enum
 */
export const userTierSchema = z.enum(["FREE", "PRO", "SCHOLAR"]);
export type UserTierSchema = z.infer<typeof userTierSchema>;

/**
 * Theme preference enum
 */
export const themePreferenceSchema = z.enum([
  "LIGHT",
  "DARK",
  "SEPIA",
  "HIGH_CONTRAST",
  "SYSTEM",
]);
export type ThemePreferenceSchema = z.infer<typeof themePreferenceSchema>;

/**
 * Font preference enum
 */
export const fontPreferenceSchema = z.enum([
  "SYSTEM",
  "SERIF",
  "SANS_SERIF",
  "OPENDYSLEXIC",
]);
export type FontPreferenceSchema = z.infer<typeof fontPreferenceSchema>;

/**
 * Language preference enum (supported languages)
 */
export const languagePreferenceSchema = z.enum([
  "en", // English
  "ar", // Arabic (RTL)
  "es", // Spanish
  "ja", // Japanese
  "zh", // Chinese (Simplified)
  "tl", // Tagalog
]);
export type LanguagePreferenceSchema = z.infer<typeof languagePreferenceSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * User ID validation (CUID format)
 */
export const userIdSchema = z
  .string()
  .min(1, "User ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid user ID format");
export type UserIdInput = z.infer<typeof userIdSchema>;

/**
 * Clerk ID validation
 */
export const clerkIdSchema = z
  .string()
  .min(1, "Clerk ID is required")
  .max(100, "Clerk ID must be at most 100 characters");
export type ClerkIdInput = z.infer<typeof clerkIdSchema>;

/**
 * Username validation
 * - 3-30 characters
 * - Letters, numbers, hyphens, underscores only
 * - Must start with a letter
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    "Username must start with a letter and contain only letters, numbers, hyphens, and underscores"
  );
export type UsernameInput = z.infer<typeof usernameSchema>;

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be at most 255 characters")
  .transform((val) => val.toLowerCase());
export type EmailInput = z.infer<typeof emailSchema>;

/**
 * Display name validation (1-100 chars)
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(100, "Display name must be at most 100 characters")
  .optional()
  .nullable();
export type DisplayNameInput = z.infer<typeof displayNameSchema>;

/**
 * Display name with profanity filter (for public profiles)
 */
export const displayNamePublicSchema = displayNameSchema.refine(
  (val) => !val || !containsProfanity(val),
  "Display name contains inappropriate language"
);

/**
 * First name validation
 */
export const firstNameSchema = z
  .string()
  .trim()
  .max(100, "First name must be at most 100 characters")
  .optional()
  .nullable();
export type FirstNameInput = z.infer<typeof firstNameSchema>;

/**
 * Last name validation
 */
export const lastNameSchema = z
  .string()
  .trim()
  .max(100, "Last name must be at most 100 characters")
  .optional()
  .nullable();
export type LastNameInput = z.infer<typeof lastNameSchema>;

/**
 * Bio validation (max 500 chars)
 */
export const bioSchema = z
  .string()
  .trim()
  .max(500, "Bio must be at most 500 characters")
  .optional()
  .nullable();
export type BioInput = z.infer<typeof bioSchema>;

/**
 * Bio with profanity filter (for public profiles)
 */
export const bioPublicSchema = bioSchema.refine(
  (val) => !val || !containsProfanity(val),
  "Bio contains inappropriate language"
);

/**
 * Avatar URL validation
 */
export const avatarUrlSchema = z
  .string()
  .url("Invalid avatar URL")
  .max(2000, "URL must be at most 2000 characters")
  .optional()
  .nullable();
export type AvatarUrlInput = z.infer<typeof avatarUrlSchema>;

/**
 * Timezone validation (IANA timezone format)
 */
export const timezoneSchema = z
  .string()
  .min(1, "Timezone is required")
  .max(100, "Timezone must be at most 100 characters")
  .default("UTC");
export type TimezoneInput = z.infer<typeof timezoneSchema>;

/**
 * Reading level validation (Lexile format like "1200L")
 */
export const readingLevelSchema = z
  .string()
  .regex(
    /^(\d{1,4}L|BR\d{0,4}L?)$/,
    "Reading level must be in Lexile format (e.g., '1200L' or 'BR100L')"
  )
  .optional()
  .nullable();
export type ReadingLevelInput = z.infer<typeof readingLevelSchema>;

// =============================================================================
// PRIVACY SETTINGS SCHEMAS
// =============================================================================

/**
 * Privacy settings schema
 */
export const privacySettingsSchema = z.object({
  profilePublic: z.boolean().default(false),
  showStats: z.boolean().default(false),
  showActivity: z.boolean().default(false),
});
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;

/**
 * Update privacy settings schema
 */
export const updatePrivacySettingsSchema = z
  .object({
    profilePublic: z.boolean().optional(),
    showStats: z.boolean().optional(),
    showActivity: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided for update",
  });
export type UpdatePrivacySettingsInput = z.infer<
  typeof updatePrivacySettingsSchema
>;

// =============================================================================
// PREFERENCES SCHEMAS
// =============================================================================

/**
 * Reading preferences schema (stored in user.preferences JSON)
 */
export const readingPreferencesSchema = z.object({
  // Display settings
  theme: themePreferenceSchema.default("SYSTEM"),
  font: fontPreferenceSchema.default("SYSTEM"),
  fontSize: z.number().int().min(8).max(48).default(16),
  lineHeight: z.number().min(1).max(3).default(1.6),

  // Reading behavior
  autoAdvance: z.boolean().default(false), // Auto-advance to next chapter
  showProgressBar: z.boolean().default(true),
  showRemainingTime: z.boolean().default(true),

  // Annotations
  defaultHighlightColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#FFFF00"),

  // SRS settings
  dailyCardLimit: z.number().int().min(1).max(500).default(50),
  newCardsPerDay: z.number().int().min(0).max(100).default(20),
});
export type ReadingPreferencesInput = z.infer<typeof readingPreferencesSchema>;

/**
 * Notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  emailReminders: z.boolean().default(true),
  srsReminders: z.boolean().default(true),
  groupNotifications: z.boolean().default(true),
  forumNotifications: z.boolean().default(true),
  achievementNotifications: z.boolean().default(true),
  streakReminders: z.boolean().default(true),
  weeklyDigest: z.boolean().default(true),
});
export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;

/**
 * AI preferences schema
 */
export const aiPreferencesSchema = z.object({
  aiEnabled: z.boolean().default(true),
  autoGenerateFlashcards: z.boolean().default(false),
  comprehensionChecks: z.boolean().default(true),
  aiResponseLanguage: languagePreferenceSchema.optional(), // null = use preferredLang
});
export type AiPreferencesInput = z.infer<typeof aiPreferencesSchema>;

/**
 * Combined user preferences schema
 */
export const userPreferencesSchema = z.object({
  reading: readingPreferencesSchema.optional(),
  notifications: notificationPreferencesSchema.optional(),
  ai: aiPreferencesSchema.optional(),
});
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;

/**
 * Update user preferences schema (partial)
 */
export const updateUserPreferencesSchema = z.object({
  reading: readingPreferencesSchema.partial().optional(),
  notifications: notificationPreferencesSchema.partial().optional(),
  ai: aiPreferencesSchema.partial().optional(),
});
export type UpdateUserPreferencesInput = z.infer<
  typeof updateUserPreferencesSchema
>;

// =============================================================================
// USER PROFILE SCHEMAS
// =============================================================================

/**
 * Update user profile schema (base, without profanity filter)
 */
export const updateUserProfileBaseSchema = z
  .object({
    username: usernameSchema.optional(),
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    displayName: displayNameSchema,
    bio: bioSchema,
    avatarUrl: avatarUrlSchema,
    timezone: timezoneSchema.optional(),
    preferredLang: languagePreferenceSchema.optional(),
    readingLevel: readingLevelSchema,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided for update",
  });
export type UpdateUserProfileBaseInput = z.infer<
  typeof updateUserProfileBaseSchema
>;

/**
 * Update user profile schema (with profanity filter for public content)
 */
export const updateUserProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    displayName: displayNameSchema,
    bio: bioSchema,
    avatarUrl: avatarUrlSchema,
    timezone: timezoneSchema.optional(),
    preferredLang: languagePreferenceSchema.optional(),
    readingLevel: readingLevelSchema,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided for update",
  })
  .refine(
    (data) => {
      const displayNameClean =
        !data.displayName || !containsProfanity(data.displayName);
      const bioClean = !data.bio || !containsProfanity(data.bio);
      return displayNameClean && bioClean;
    },
    {
      message: "Content contains inappropriate language",
      path: ["displayName"],
    }
  );
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

/**
 * Complete profile setup schema (for new users)
 */
export const completeProfileSetupSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    preferredLang: languagePreferenceSchema.default("en"),
    timezone: timezoneSchema,
    // Optional profile data
    bio: bioSchema,
    avatarUrl: avatarUrlSchema,
    // Initial preferences
    theme: themePreferenceSchema.optional(),
    font: fontPreferenceSchema.optional(),
    // Privacy settings
    profilePublic: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const displayNameClean =
        !data.displayName || !containsProfanity(data.displayName);
      const bioClean = !data.bio || !containsProfanity(data.bio);
      return displayNameClean && bioClean;
    },
    {
      message: "Content contains inappropriate language",
      path: ["displayName"],
    }
  );
export type CompleteProfileSetupInput = z.infer<
  typeof completeProfileSetupSchema
>;

// =============================================================================
// USER QUERY SCHEMAS
// =============================================================================

/**
 * Sort fields for users
 */
export const userSortFieldSchema = z.enum([
  "createdAt",
  "username",
  "displayName",
]);
export type UserSortField = z.infer<typeof userSortFieldSchema>;

/**
 * Sort direction
 */
export const userSortDirectionSchema = z.enum(["asc", "desc"]);
export type UserSortDirection = z.infer<typeof userSortDirectionSchema>;

/**
 * User search query parameters
 */
export const userSearchQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: userSortFieldSchema.default("username"),
  sortDirection: userSortDirectionSchema.default("asc"),

  // Search
  search: z
    .string()
    .min(2, "Search query must be at least 2 characters")
    .max(100)
    .trim(),

  // Filters
  tier: userTierSchema.optional(),
});
export type UserSearchQueryInput = z.infer<typeof userSearchQuerySchema>;

// =============================================================================
// USER ID PARAMS SCHEMAS
// =============================================================================

/**
 * User ID params schema (for route params)
 */
export const userIdParamsSchema = z.object({
  id: userIdSchema,
});
export type UserIdParamsInput = z.infer<typeof userIdParamsSchema>;

/**
 * Username params schema (for route params)
 */
export const usernameParamsSchema = z.object({
  username: usernameSchema,
});
export type UsernameParamsInput = z.infer<typeof usernameParamsSchema>;

// =============================================================================
// WEBHOOK SCHEMAS (Clerk integration)
// =============================================================================

/**
 * Clerk user created webhook data schema
 */
export const clerkUserCreatedSchema = z.object({
  id: clerkIdSchema,
  email_addresses: z.array(
    z.object({
      email_address: emailSchema,
      id: z.string(),
      verification: z.object({
        status: z.string(),
      }),
    })
  ),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  image_url: z.string().nullable(),
  username: z.string().nullable(),
  created_at: z.number(),
});
export type ClerkUserCreatedData = z.infer<typeof clerkUserCreatedSchema>;

/**
 * Clerk user updated webhook data schema
 */
export const clerkUserUpdatedSchema = clerkUserCreatedSchema;
export type ClerkUserUpdatedData = z.infer<typeof clerkUserUpdatedSchema>;

/**
 * Clerk user deleted webhook data schema
 */
export const clerkUserDeletedSchema = z.object({
  id: clerkIdSchema,
  deleted: z.boolean(),
});
export type ClerkUserDeletedData = z.infer<typeof clerkUserDeletedSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * User summary response schema (for lists and search results)
 */
export const userSummarySchema = z.object({
  id: userIdSchema,
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  tier: userTierSchema,
  createdAt: z.string().datetime(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

/**
 * Public user profile response schema
 */
export const publicUserProfileSchema = z.object({
  id: userIdSchema,
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  tier: userTierSchema,
  createdAt: z.string().datetime(),
  // Stats (only if showStats is true)
  stats: z
    .object({
      booksCompleted: z.number().int(),
      totalReadingTime: z.number().int(),
      currentStreak: z.number().int(),
      totalXP: z.number().int(),
      level: z.number().int(),
    })
    .optional(),
  // Achievements (public by default)
  achievements: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        earnedAt: z.string().datetime(),
      })
    )
    .optional(),
});
export type PublicUserProfile = z.infer<typeof publicUserProfileSchema>;

/**
 * Private user profile response schema (for authenticated user)
 */
export const privateUserProfileSchema = publicUserProfileSchema.extend({
  email: emailSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  preferredLang: languagePreferenceSchema,
  timezone: z.string(),
  readingLevel: z.string().nullable(),
  aiEnabled: z.boolean(),
  // Privacy settings
  profilePublic: z.boolean(),
  showStats: z.boolean(),
  showActivity: z.boolean(),
  // Subscription info
  tierExpiresAt: z.string().datetime().nullable(),
  // Full stats
  stats: z.object({
    totalXP: z.number().int(),
    level: z.number().int(),
    currentStreak: z.number().int(),
    longestStreak: z.number().int(),
    booksCompleted: z.number().int(),
    totalReadingTime: z.number().int(),
    totalWordsRead: z.number().int(),
    totalCardsReviewed: z.number().int(),
    totalCardsCreated: z.number().int(),
    assessmentsCompleted: z.number().int(),
    averageScore: z.number().nullable(),
    followersCount: z.number().int(),
    followingCount: z.number().int(),
  }),
  // Preferences
  preferences: userPreferencesSchema.optional(),
});
export type PrivateUserProfile = z.infer<typeof privateUserProfileSchema>;

// =============================================================================
// EXPORT/DELETE SCHEMAS (GDPR compliance)
// =============================================================================

/**
 * Request data export schema
 */
export const requestDataExportSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  includeBooks: z.boolean().default(true),
  includeAnnotations: z.boolean().default(true),
  includeFlashcards: z.boolean().default(true),
  includeAssessments: z.boolean().default(true),
  includeActivity: z.boolean().default(true),
});
export type RequestDataExportInput = z.infer<typeof requestDataExportSchema>;

/**
 * Delete account schema
 */
export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  reason: z.string().max(1000).optional(),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All user-related schemas for convenient importing
 */
export const userSchemas = {
  // Enums
  userTier: userTierSchema,
  themePreference: themePreferenceSchema,
  fontPreference: fontPreferenceSchema,
  languagePreference: languagePreferenceSchema,

  // Field schemas
  userId: userIdSchema,
  clerkId: clerkIdSchema,
  username: usernameSchema,
  email: emailSchema,
  displayName: displayNameSchema,
  displayNamePublic: displayNamePublicSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  bio: bioSchema,
  bioPublic: bioPublicSchema,
  avatarUrl: avatarUrlSchema,
  timezone: timezoneSchema,
  readingLevel: readingLevelSchema,

  // Privacy settings
  privacySettings: privacySettingsSchema,
  updatePrivacySettings: updatePrivacySettingsSchema,

  // Preferences
  readingPreferences: readingPreferencesSchema,
  notificationPreferences: notificationPreferencesSchema,
  aiPreferences: aiPreferencesSchema,
  userPreferences: userPreferencesSchema,
  updatePreferences: updateUserPreferencesSchema,

  // Profile schemas
  updateProfile: updateUserProfileSchema,
  updateProfileBase: updateUserProfileBaseSchema,
  completeProfileSetup: completeProfileSetupSchema,

  // Query schemas
  searchQuery: userSearchQuerySchema,
  sortField: userSortFieldSchema,
  sortDirection: userSortDirectionSchema,

  // ID params
  idParams: userIdParamsSchema,
  usernameParams: usernameParamsSchema,

  // Clerk webhooks
  clerkUserCreated: clerkUserCreatedSchema,
  clerkUserUpdated: clerkUserUpdatedSchema,
  clerkUserDeleted: clerkUserDeletedSchema,

  // Response schemas
  summary: userSummarySchema,
  publicProfile: publicUserProfileSchema,
  privateProfile: privateUserProfileSchema,

  // GDPR compliance
  requestDataExport: requestDataExportSchema,
  deleteAccount: deleteAccountSchema,
} as const;
