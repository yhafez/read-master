/**
 * Tests for User Zod schemas
 *
 * This test suite validates:
 * - Enum schemas (userTier, themePreference, fontPreference, languagePreference)
 * - ID schemas (userId, clerkId)
 * - Profile field schemas with profanity filter
 * - Privacy settings schemas
 * - Preferences schemas
 * - Profile update schemas
 * - Query schemas
 * - Clerk webhook schemas
 * - GDPR compliance schemas
 */

import { describe, expect, it } from "vitest";
import {
  // Enums
  userTierSchema,
  themePreferenceSchema,
  fontPreferenceSchema,
  languagePreferenceSchema,

  // IDs
  userIdSchema,
  clerkIdSchema,

  // Fields
  usernameSchema,
  emailSchema,
  displayNameSchema,
  displayNamePublicSchema,
  bioSchema,
  bioPublicSchema,
  avatarUrlSchema,
  timezoneSchema,
  readingLevelSchema,

  // Privacy
  privacySettingsSchema,
  updatePrivacySettingsSchema,

  // Preferences
  readingPreferencesSchema,
  notificationPreferencesSchema,
  aiPreferencesSchema,
  userPreferencesSchema,
  updateUserPreferencesSchema,

  // Profile
  updateUserProfileBaseSchema,
  updateUserProfileSchema,
  completeProfileSetupSchema,

  // Query
  userSortFieldSchema,
  userSearchQuerySchema,

  // ID params
  userIdParamsSchema,
  usernameParamsSchema,

  // Clerk webhooks
  clerkUserCreatedSchema,
  clerkUserDeletedSchema,

  // Response schemas
  userSummarySchema,
  publicUserProfileSchema,
  privateUserProfileSchema,

  // GDPR
  requestDataExportSchema,
  deleteAccountSchema,

  // Collection
  userSchemas,
} from "./users";

// =============================================================================
// ENUM VALIDATION TESTS
// =============================================================================

describe("User Enum Schemas", () => {
  describe("userTierSchema", () => {
    it("should accept valid user tiers", () => {
      expect(userTierSchema.parse("FREE")).toBe("FREE");
      expect(userTierSchema.parse("PRO")).toBe("PRO");
      expect(userTierSchema.parse("SCHOLAR")).toBe("SCHOLAR");
    });

    it("should reject invalid user tiers", () => {
      expect(() => userTierSchema.parse("free")).toThrow();
      expect(() => userTierSchema.parse("PREMIUM")).toThrow();
      expect(() => userTierSchema.parse("")).toThrow();
    });
  });

  describe("themePreferenceSchema", () => {
    it("should accept valid themes", () => {
      expect(themePreferenceSchema.parse("LIGHT")).toBe("LIGHT");
      expect(themePreferenceSchema.parse("DARK")).toBe("DARK");
      expect(themePreferenceSchema.parse("SEPIA")).toBe("SEPIA");
      expect(themePreferenceSchema.parse("HIGH_CONTRAST")).toBe(
        "HIGH_CONTRAST"
      );
      expect(themePreferenceSchema.parse("SYSTEM")).toBe("SYSTEM");
    });

    it("should reject invalid themes", () => {
      expect(() => themePreferenceSchema.parse("dark")).toThrow();
      expect(() => themePreferenceSchema.parse("AUTO")).toThrow();
    });
  });

  describe("fontPreferenceSchema", () => {
    it("should accept valid fonts", () => {
      expect(fontPreferenceSchema.parse("SYSTEM")).toBe("SYSTEM");
      expect(fontPreferenceSchema.parse("SERIF")).toBe("SERIF");
      expect(fontPreferenceSchema.parse("SANS_SERIF")).toBe("SANS_SERIF");
      expect(fontPreferenceSchema.parse("OPENDYSLEXIC")).toBe("OPENDYSLEXIC");
    });

    it("should reject invalid fonts", () => {
      expect(() => fontPreferenceSchema.parse("Arial")).toThrow();
    });
  });

  describe("languagePreferenceSchema", () => {
    it("should accept valid languages", () => {
      expect(languagePreferenceSchema.parse("en")).toBe("en");
      expect(languagePreferenceSchema.parse("ar")).toBe("ar");
      expect(languagePreferenceSchema.parse("es")).toBe("es");
      expect(languagePreferenceSchema.parse("ja")).toBe("ja");
      expect(languagePreferenceSchema.parse("zh")).toBe("zh");
      expect(languagePreferenceSchema.parse("tl")).toBe("tl");
    });

    it("should reject invalid languages", () => {
      expect(() => languagePreferenceSchema.parse("EN")).toThrow();
      expect(() => languagePreferenceSchema.parse("english")).toThrow();
      expect(() => languagePreferenceSchema.parse("fr")).toThrow();
    });
  });
});

// =============================================================================
// ID SCHEMA TESTS
// =============================================================================

describe("User ID Schemas", () => {
  describe("userIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(userIdSchema.parse("clhuser123")).toBe("clhuser123");
      expect(userIdSchema.parse("c123")).toBe("c123");
    });

    it("should reject invalid formats", () => {
      expect(() => userIdSchema.parse("")).toThrow();
      expect(() => userIdSchema.parse("abc123")).toThrow();
      expect(() => userIdSchema.parse("CLH1234")).toThrow();
    });
  });

  describe("clerkIdSchema", () => {
    it("should accept valid Clerk IDs", () => {
      expect(clerkIdSchema.parse("user_2abc123")).toBe("user_2abc123");
      expect(clerkIdSchema.parse("clerk123")).toBe("clerk123");
    });

    it("should reject empty strings", () => {
      expect(() => clerkIdSchema.parse("")).toThrow();
    });

    it("should reject IDs over 100 characters", () => {
      expect(() => clerkIdSchema.parse("a".repeat(101))).toThrow();
    });
  });
});

// =============================================================================
// FIELD SCHEMA TESTS
// =============================================================================

describe("User Field Schemas", () => {
  describe("usernameSchema", () => {
    it("should accept valid usernames", () => {
      expect(usernameSchema.parse("john_doe")).toBe("john_doe");
      expect(usernameSchema.parse("Reader123")).toBe("Reader123");
      expect(usernameSchema.parse("book-lover")).toBe("book-lover");
    });

    it("should trim whitespace", () => {
      expect(usernameSchema.parse("  username  ")).toBe("username");
    });

    it("should reject usernames starting with non-letter", () => {
      expect(() => usernameSchema.parse("123user")).toThrow();
      expect(() => usernameSchema.parse("_user")).toThrow();
    });

    it("should reject usernames under 3 characters", () => {
      expect(() => usernameSchema.parse("ab")).toThrow();
    });

    it("should reject usernames over 30 characters", () => {
      expect(() => usernameSchema.parse("a" + "b".repeat(30))).toThrow();
    });

    it("should reject invalid characters", () => {
      expect(() => usernameSchema.parse("user@name")).toThrow();
      expect(() => usernameSchema.parse("user name")).toThrow();
    });
  });

  describe("emailSchema", () => {
    it("should accept valid emails", () => {
      expect(emailSchema.parse("test@example.com")).toBe("test@example.com");
      expect(emailSchema.parse("user.name@domain.co.uk")).toBe(
        "user.name@domain.co.uk"
      );
    });

    it("should convert to lowercase", () => {
      expect(emailSchema.parse("TEST@EXAMPLE.COM")).toBe("test@example.com");
    });

    it("should reject invalid emails", () => {
      expect(() => emailSchema.parse("not-an-email")).toThrow();
      expect(() => emailSchema.parse("@domain.com")).toThrow();
    });
  });

  describe("displayNameSchema", () => {
    it("should accept valid display names", () => {
      expect(displayNameSchema.parse("John Doe")).toBe("John Doe");
    });

    it("should accept optional/nullable values", () => {
      expect(displayNameSchema.parse(undefined)).toBeUndefined();
      expect(displayNameSchema.parse(null)).toBeNull();
    });

    it("should reject names over 100 characters", () => {
      expect(() => displayNameSchema.parse("a".repeat(101))).toThrow();
    });
  });

  describe("displayNamePublicSchema", () => {
    it("should accept clean display names", () => {
      expect(displayNamePublicSchema.parse("Book Lover")).toBe("Book Lover");
    });

    it("should reject profanity", () => {
      expect(() => displayNamePublicSchema.parse("Fucking Reader")).toThrow(
        /inappropriate/i
      );
    });
  });

  describe("bioSchema", () => {
    it("should accept valid bios", () => {
      expect(bioSchema.parse("I love reading")).toBe("I love reading");
    });

    it("should accept optional/nullable values", () => {
      expect(bioSchema.parse(undefined)).toBeUndefined();
      expect(bioSchema.parse(null)).toBeNull();
    });

    it("should reject bios over 500 characters", () => {
      expect(() => bioSchema.parse("a".repeat(501))).toThrow();
    });
  });

  describe("bioPublicSchema", () => {
    it("should accept clean bios", () => {
      expect(bioPublicSchema.parse("Avid reader and bookworm")).toBe(
        "Avid reader and bookworm"
      );
    });

    it("should reject profanity", () => {
      expect(() => bioPublicSchema.parse("I love fucking books")).toThrow(
        /inappropriate/i
      );
    });
  });

  describe("avatarUrlSchema", () => {
    it("should accept valid URLs", () => {
      expect(avatarUrlSchema.parse("https://example.com/avatar.jpg")).toBe(
        "https://example.com/avatar.jpg"
      );
    });

    it("should accept optional/nullable values", () => {
      expect(avatarUrlSchema.parse(undefined)).toBeUndefined();
      expect(avatarUrlSchema.parse(null)).toBeNull();
    });

    it("should reject invalid URLs", () => {
      expect(() => avatarUrlSchema.parse("not-a-url")).toThrow();
    });
  });

  describe("timezoneSchema", () => {
    it("should accept valid timezones", () => {
      expect(timezoneSchema.parse("America/New_York")).toBe("America/New_York");
      expect(timezoneSchema.parse("Europe/London")).toBe("Europe/London");
    });

    it("should default to UTC", () => {
      expect(timezoneSchema.parse(undefined)).toBe("UTC");
    });
  });

  describe("readingLevelSchema", () => {
    it("should accept valid Lexile formats", () => {
      expect(readingLevelSchema.parse("1200L")).toBe("1200L");
      expect(readingLevelSchema.parse("850L")).toBe("850L");
      expect(readingLevelSchema.parse("BR100L")).toBe("BR100L");
    });

    it("should accept optional/nullable values", () => {
      expect(readingLevelSchema.parse(undefined)).toBeUndefined();
      expect(readingLevelSchema.parse(null)).toBeNull();
    });

    it("should reject invalid Lexile formats", () => {
      expect(() => readingLevelSchema.parse("12000L")).toThrow();
      expect(() => readingLevelSchema.parse("advanced")).toThrow();
    });
  });
});

// =============================================================================
// PRIVACY SETTINGS SCHEMA TESTS
// =============================================================================

describe("Privacy Settings Schemas", () => {
  describe("privacySettingsSchema", () => {
    it("should apply defaults", () => {
      const result = privacySettingsSchema.parse({});
      expect(result.profilePublic).toBe(false);
      expect(result.showStats).toBe(false);
      expect(result.showActivity).toBe(false);
    });

    it("should accept custom settings", () => {
      const result = privacySettingsSchema.parse({
        profilePublic: true,
        showStats: true,
        showActivity: false,
      });
      expect(result.profilePublic).toBe(true);
      expect(result.showStats).toBe(true);
    });
  });

  describe("updatePrivacySettingsSchema", () => {
    it("should accept partial updates", () => {
      const result = updatePrivacySettingsSchema.parse({
        profilePublic: true,
      });
      expect(result.profilePublic).toBe(true);
    });

    it("should reject empty update", () => {
      expect(() => updatePrivacySettingsSchema.parse({})).toThrow(
        /at least one field/i
      );
    });
  });
});

// =============================================================================
// PREFERENCES SCHEMA TESTS
// =============================================================================

describe("Preferences Schemas", () => {
  describe("readingPreferencesSchema", () => {
    it("should apply defaults", () => {
      const result = readingPreferencesSchema.parse({});
      expect(result.theme).toBe("SYSTEM");
      expect(result.font).toBe("SYSTEM");
      expect(result.fontSize).toBe(16);
      expect(result.lineHeight).toBe(1.6);
      expect(result.dailyCardLimit).toBe(50);
    });

    it("should accept custom preferences", () => {
      const result = readingPreferencesSchema.parse({
        theme: "DARK",
        font: "OPENDYSLEXIC",
        fontSize: 20,
        lineHeight: 2.0,
        dailyCardLimit: 100,
      });
      expect(result.theme).toBe("DARK");
      expect(result.font).toBe("OPENDYSLEXIC");
      expect(result.fontSize).toBe(20);
    });

    it("should reject fontSize outside range", () => {
      expect(() => readingPreferencesSchema.parse({ fontSize: 7 })).toThrow();
      expect(() => readingPreferencesSchema.parse({ fontSize: 49 })).toThrow();
    });

    it("should reject lineHeight outside range", () => {
      expect(() =>
        readingPreferencesSchema.parse({ lineHeight: 0.5 })
      ).toThrow();
      expect(() => readingPreferencesSchema.parse({ lineHeight: 4 })).toThrow();
    });

    it("should validate highlight color format", () => {
      const result = readingPreferencesSchema.parse({
        defaultHighlightColor: "#FF0000",
      });
      expect(result.defaultHighlightColor).toBe("#FF0000");

      expect(() =>
        readingPreferencesSchema.parse({ defaultHighlightColor: "red" })
      ).toThrow();
    });
  });

  describe("notificationPreferencesSchema", () => {
    it("should apply defaults", () => {
      const result = notificationPreferencesSchema.parse({});
      expect(result.emailReminders).toBe(true);
      expect(result.srsReminders).toBe(true);
      expect(result.weeklyDigest).toBe(true);
    });

    it("should accept custom preferences", () => {
      const result = notificationPreferencesSchema.parse({
        emailReminders: false,
        srsReminders: false,
      });
      expect(result.emailReminders).toBe(false);
      expect(result.srsReminders).toBe(false);
    });
  });

  describe("aiPreferencesSchema", () => {
    it("should apply defaults", () => {
      const result = aiPreferencesSchema.parse({});
      expect(result.aiEnabled).toBe(true);
      expect(result.autoGenerateFlashcards).toBe(false);
      expect(result.comprehensionChecks).toBe(true);
    });

    it("should accept custom preferences", () => {
      const result = aiPreferencesSchema.parse({
        aiEnabled: false,
        aiResponseLanguage: "es",
      });
      expect(result.aiEnabled).toBe(false);
      expect(result.aiResponseLanguage).toBe("es");
    });
  });

  describe("userPreferencesSchema", () => {
    it("should accept partial preferences", () => {
      const result = userPreferencesSchema.parse({
        reading: { theme: "DARK" },
      });
      expect(result.reading?.theme).toBe("DARK");
    });
  });

  describe("updateUserPreferencesSchema", () => {
    it("should accept nested partial updates", () => {
      const result = updateUserPreferencesSchema.parse({
        reading: { fontSize: 18 },
        notifications: { emailReminders: false },
      });
      expect(result.reading?.fontSize).toBe(18);
      expect(result.notifications?.emailReminders).toBe(false);
    });
  });
});

// =============================================================================
// PROFILE SCHEMA TESTS
// =============================================================================

describe("Profile Schemas", () => {
  describe("updateUserProfileBaseSchema", () => {
    it("should accept partial updates", () => {
      const result = updateUserProfileBaseSchema.parse({
        displayName: "New Name",
      });
      expect(result.displayName).toBe("New Name");
    });

    it("should reject empty update", () => {
      expect(() => updateUserProfileBaseSchema.parse({})).toThrow(
        /at least one field/i
      );
    });
  });

  describe("updateUserProfileSchema (with profanity filter)", () => {
    it("should accept clean profile updates", () => {
      const result = updateUserProfileSchema.parse({
        displayName: "Book Lover",
        bio: "I love reading classical literature",
      });
      expect(result.displayName).toBe("Book Lover");
    });

    it("should reject profanity in displayName", () => {
      expect(() =>
        updateUserProfileSchema.parse({
          displayName: "Fucking Reader",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject profanity in bio", () => {
      expect(() =>
        updateUserProfileSchema.parse({
          bio: "I love fucking books",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("completeProfileSetupSchema", () => {
    it("should accept valid profile setup", () => {
      const result = completeProfileSetupSchema.parse({
        username: "newuser",
        displayName: "New User",
        timezone: "America/New_York",
      });
      expect(result.username).toBe("newuser");
      expect(result.preferredLang).toBe("en");
      expect(result.profilePublic).toBe(false);
    });

    it("should accept all optional fields", () => {
      const result = completeProfileSetupSchema.parse({
        username: "fulluser",
        displayName: "Full User",
        timezone: "UTC",
        bio: "I love reading",
        theme: "DARK",
        font: "SERIF",
      });
      expect(result.theme).toBe("DARK");
      expect(result.font).toBe("SERIF");
    });

    it("should reject profanity in public fields", () => {
      expect(() =>
        completeProfileSetupSchema.parse({
          username: "newuser",
          displayName: "Fucking User",
          timezone: "UTC",
        })
      ).toThrow(/inappropriate/i);
    });
  });
});

// =============================================================================
// QUERY SCHEMA TESTS
// =============================================================================

describe("User Query Schemas", () => {
  describe("userSearchQuerySchema", () => {
    it("should apply defaults", () => {
      const result = userSearchQuerySchema.parse({
        search: "john",
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("username");
      expect(result.sortDirection).toBe("asc");
    });

    it("should accept all options", () => {
      const result = userSearchQuerySchema.parse({
        search: "reader",
        page: "2",
        limit: "50",
        sortBy: "displayName",
        tier: "PRO",
      });
      expect(result.page).toBe(2);
      expect(result.tier).toBe("PRO");
    });

    it("should reject search under 2 characters", () => {
      expect(() =>
        userSearchQuerySchema.parse({
          search: "a",
        })
      ).toThrow();
    });
  });

  describe("userSortFieldSchema", () => {
    it("should accept valid sort fields", () => {
      expect(userSortFieldSchema.parse("createdAt")).toBe("createdAt");
      expect(userSortFieldSchema.parse("username")).toBe("username");
      expect(userSortFieldSchema.parse("displayName")).toBe("displayName");
    });

    it("should reject invalid sort fields", () => {
      expect(() => userSortFieldSchema.parse("email")).toThrow();
    });
  });
});

// =============================================================================
// ID PARAMS SCHEMA TESTS
// =============================================================================

describe("User ID Params Schemas", () => {
  describe("userIdParamsSchema", () => {
    it("should accept valid user ID", () => {
      const result = userIdParamsSchema.parse({
        id: "clhuser123",
      });
      expect(result.id).toBe("clhuser123");
    });
  });

  describe("usernameParamsSchema", () => {
    it("should accept valid username", () => {
      const result = usernameParamsSchema.parse({
        username: "book_reader",
      });
      expect(result.username).toBe("book_reader");
    });
  });
});

// =============================================================================
// CLERK WEBHOOK SCHEMA TESTS
// =============================================================================

describe("Clerk Webhook Schemas", () => {
  describe("clerkUserCreatedSchema", () => {
    it("should accept valid webhook data", () => {
      const result = clerkUserCreatedSchema.parse({
        id: "user_2abc123",
        email_addresses: [
          {
            email_address: "test@example.com",
            id: "email_123",
            verification: { status: "verified" },
          },
        ],
        first_name: "John",
        last_name: "Doe",
        image_url: "https://example.com/avatar.jpg",
        username: "johndoe",
        created_at: 1704067200000,
      });
      expect(result.id).toBe("user_2abc123");
      expect(result.email_addresses[0]?.email_address).toBe("test@example.com");
    });

    it("should accept nullable fields", () => {
      const result = clerkUserCreatedSchema.parse({
        id: "user_xyz",
        email_addresses: [],
        first_name: null,
        last_name: null,
        image_url: null,
        username: null,
        created_at: 1704067200000,
      });
      expect(result.first_name).toBeNull();
    });
  });

  describe("clerkUserDeletedSchema", () => {
    it("should accept valid delete webhook data", () => {
      const result = clerkUserDeletedSchema.parse({
        id: "user_abc123",
        deleted: true,
      });
      expect(result.deleted).toBe(true);
    });
  });
});

// =============================================================================
// RESPONSE SCHEMA TESTS
// =============================================================================

describe("User Response Schemas", () => {
  describe("userSummarySchema", () => {
    it("should accept valid user summary", () => {
      const result = userSummarySchema.parse({
        id: "clhuser123",
        username: "reader",
        displayName: "Book Reader",
        avatarUrl: null,
        tier: "FREE",
        createdAt: "2024-01-15T10:00:00Z",
      });
      expect(result.tier).toBe("FREE");
    });
  });

  describe("publicUserProfileSchema", () => {
    it("should accept valid public profile", () => {
      const result = publicUserProfileSchema.parse({
        id: "clhuser123",
        username: "reader",
        displayName: "Book Reader",
        bio: "I love reading",
        avatarUrl: null,
        tier: "PRO",
        createdAt: "2024-01-15T10:00:00Z",
      });
      expect(result.bio).toBe("I love reading");
    });

    it("should accept optional stats and achievements", () => {
      const result = publicUserProfileSchema.parse({
        id: "clhuser123",
        username: "reader",
        displayName: "Book Reader",
        bio: null,
        avatarUrl: null,
        tier: "SCHOLAR",
        createdAt: "2024-01-15T10:00:00Z",
        stats: {
          booksCompleted: 50,
          totalReadingTime: 36000,
          currentStreak: 30,
          totalXP: 5000,
          level: 10,
        },
        achievements: [
          {
            code: "first_book",
            name: "First Book",
            earnedAt: "2024-01-10T10:00:00Z",
          },
        ],
      });
      expect(result.stats?.booksCompleted).toBe(50);
      expect(result.achievements?.[0]?.code).toBe("first_book");
    });
  });

  describe("privateUserProfileSchema", () => {
    it("should accept valid private profile", () => {
      const result = privateUserProfileSchema.parse({
        id: "clhuser123",
        username: "reader",
        displayName: "Book Reader",
        bio: null,
        avatarUrl: null,
        tier: "PRO",
        createdAt: "2024-01-15T10:00:00Z",
        email: "reader@example.com",
        firstName: "John",
        lastName: "Doe",
        preferredLang: "en",
        timezone: "America/New_York",
        readingLevel: "1200L",
        aiEnabled: true,
        profilePublic: true,
        showStats: true,
        showActivity: false,
        tierExpiresAt: null,
        stats: {
          totalXP: 5000,
          level: 10,
          currentStreak: 30,
          longestStreak: 60,
          booksCompleted: 50,
          totalReadingTime: 36000,
          totalWordsRead: 500000,
          totalCardsReviewed: 1000,
          totalCardsCreated: 200,
          assessmentsCompleted: 25,
          averageScore: 85.5,
          followersCount: 100,
          followingCount: 50,
        },
      });
      expect(result.email).toBe("reader@example.com");
      expect(result.stats.totalWordsRead).toBe(500000);
    });
  });
});

// =============================================================================
// GDPR COMPLIANCE SCHEMA TESTS
// =============================================================================

describe("GDPR Compliance Schemas", () => {
  describe("requestDataExportSchema", () => {
    it("should apply defaults", () => {
      const result = requestDataExportSchema.parse({});
      expect(result.format).toBe("json");
      expect(result.includeBooks).toBe(true);
      expect(result.includeAnnotations).toBe(true);
      expect(result.includeFlashcards).toBe(true);
    });

    it("should accept custom export options", () => {
      const result = requestDataExportSchema.parse({
        format: "csv",
        includeBooks: false,
        includeActivity: false,
      });
      expect(result.format).toBe("csv");
      expect(result.includeBooks).toBe(false);
    });
  });

  describe("deleteAccountSchema", () => {
    it("should accept valid confirmation", () => {
      const result = deleteAccountSchema.parse({
        confirmation: "DELETE MY ACCOUNT",
      });
      expect(result.confirmation).toBe("DELETE MY ACCOUNT");
    });

    it("should accept optional reason", () => {
      const result = deleteAccountSchema.parse({
        confirmation: "DELETE MY ACCOUNT",
        reason: "No longer using the service",
      });
      expect(result.reason).toBe("No longer using the service");
    });

    it("should reject wrong confirmation text", () => {
      expect(() =>
        deleteAccountSchema.parse({
          confirmation: "delete my account",
        })
      ).toThrow();
      expect(() =>
        deleteAccountSchema.parse({
          confirmation: "DELETE",
        })
      ).toThrow();
    });

    it("should reject reason over 1000 characters", () => {
      expect(() =>
        deleteAccountSchema.parse({
          confirmation: "DELETE MY ACCOUNT",
          reason: "a".repeat(1001),
        })
      ).toThrow();
    });
  });
});

// =============================================================================
// SCHEMA COLLECTION EXPORT TESTS
// =============================================================================

describe("userSchemas collection", () => {
  it("should export all enum schemas", () => {
    expect(userSchemas.userTier).toBeDefined();
    expect(userSchemas.themePreference).toBeDefined();
    expect(userSchemas.fontPreference).toBeDefined();
    expect(userSchemas.languagePreference).toBeDefined();
  });

  it("should export all field schemas", () => {
    expect(userSchemas.userId).toBeDefined();
    expect(userSchemas.clerkId).toBeDefined();
    expect(userSchemas.username).toBeDefined();
    expect(userSchemas.email).toBeDefined();
    expect(userSchemas.displayName).toBeDefined();
    expect(userSchemas.displayNamePublic).toBeDefined();
    expect(userSchemas.bio).toBeDefined();
    expect(userSchemas.bioPublic).toBeDefined();
  });

  it("should export all privacy schemas", () => {
    expect(userSchemas.privacySettings).toBeDefined();
    expect(userSchemas.updatePrivacySettings).toBeDefined();
  });

  it("should export all preference schemas", () => {
    expect(userSchemas.readingPreferences).toBeDefined();
    expect(userSchemas.notificationPreferences).toBeDefined();
    expect(userSchemas.aiPreferences).toBeDefined();
    expect(userSchemas.userPreferences).toBeDefined();
    expect(userSchemas.updatePreferences).toBeDefined();
  });

  it("should export all profile schemas", () => {
    expect(userSchemas.updateProfile).toBeDefined();
    expect(userSchemas.updateProfileBase).toBeDefined();
    expect(userSchemas.completeProfileSetup).toBeDefined();
  });

  it("should export all query schemas", () => {
    expect(userSchemas.searchQuery).toBeDefined();
    expect(userSchemas.sortField).toBeDefined();
    expect(userSchemas.sortDirection).toBeDefined();
  });

  it("should export all Clerk webhook schemas", () => {
    expect(userSchemas.clerkUserCreated).toBeDefined();
    expect(userSchemas.clerkUserUpdated).toBeDefined();
    expect(userSchemas.clerkUserDeleted).toBeDefined();
  });

  it("should export all response schemas", () => {
    expect(userSchemas.summary).toBeDefined();
    expect(userSchemas.publicProfile).toBeDefined();
    expect(userSchemas.privateProfile).toBeDefined();
  });

  it("should export all GDPR schemas", () => {
    expect(userSchemas.requestDataExport).toBeDefined();
    expect(userSchemas.deleteAccount).toBeDefined();
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  describe("Unicode and special characters", () => {
    it("should accept unicode in display name", () => {
      const result = displayNameSchema.parse("读者");
      expect(result).toBe("读者");
    });

    it("should accept unicode in bio", () => {
      const result = bioSchema.parse("私は本を読むのが大好きです。");
      expect(result).toContain("本");
    });

    it("should accept RTL content", () => {
      const result = bioSchema.parse("أنا أحب القراءة");
      expect(result).toContain("القراءة");
    });
  });

  describe("Boundary conditions", () => {
    it("should accept username of exactly 3 characters", () => {
      expect(usernameSchema.parse("abc")).toBe("abc");
    });

    it("should accept username of exactly 30 characters", () => {
      const maxUsername = "a" + "b".repeat(29);
      expect(usernameSchema.parse(maxUsername).length).toBe(30);
    });

    it("should accept bio of exactly 500 characters", () => {
      const maxBio = "a".repeat(500);
      const result = bioSchema.parse(maxBio);
      expect(result?.length).toBe(500);
    });

    it("should accept display name of exactly 100 characters", () => {
      const maxName = "a".repeat(100);
      const result = displayNameSchema.parse(maxName);
      expect(result?.length).toBe(100);
    });
  });

  describe("Whitespace handling", () => {
    it("should trim whitespace from username", () => {
      expect(usernameSchema.parse("  username  ")).toBe("username");
    });

    it("should trim whitespace from display name", () => {
      expect(displayNameSchema.parse("  Display Name  ")).toBe("Display Name");
    });

    it("should trim whitespace from bio", () => {
      expect(bioSchema.parse("  My bio  ")).toBe("My bio");
    });
  });

  describe("Email normalization", () => {
    it("should convert email to lowercase", () => {
      expect(emailSchema.parse("Test@EXAMPLE.com")).toBe("test@example.com");
    });
  });
});
