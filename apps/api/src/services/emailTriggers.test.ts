/**
 * Email Triggers Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as emailTriggers from "./emailTriggers.js";
import * as emailService from "./emailService.js";
import { db } from "./db.js";

// Mock dependencies
vi.mock("./emailService.js");
vi.mock("../utils/logger.js");

// Mock db with all necessary methods
vi.mock("./db.js", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    book: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    readingProgress: {
      findFirst: vi.fn(),
    },
    annotation: {
      count: vi.fn(),
    },
    email: {
      findFirst: vi.fn(),
    },
    emailTemplate: {
      findMany: vi.fn(),
    },
  },
}));

describe("Email Triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendWelcomeEmail", () => {
    it("should send welcome email to new user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        displayName: "John Doe",
        clerkId: "clerk-123",
        username: null,
        avatarUrl: null,
        tier: "FREE",
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendWelcomeEmail("user-123");

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "welcome",
        "test@example.com",
        expect.objectContaining({
          firstName: "John",
          appUrl: expect.any(String),
          year: expect.any(Number),
        }),
        expect.objectContaining({
          toName: "John Doe",
          tags: ["onboarding", "welcome"],
        })
      );
    });

    it("should handle user not found", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const result = await emailTriggers.sendWelcomeEmail("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });

    it("should use fallback name if firstName is missing", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: null,
        lastName: null,
        displayName: "TestUser",
        clerkId: "clerk-123",
        username: null,
        avatarUrl: null,
        tier: "FREE",
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      await emailTriggers.sendWelcomeEmail("user-123");

      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "welcome",
        "test@example.com",
        expect.objectContaining({
          firstName: "TestUser",
        }),
        expect.any(Object)
      );
    });
  });

  describe("sendOnboardingEmail", () => {
    it("should send onboarding email for day 1", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        displayName: "John Doe",
        clerkId: "clerk-123",
        username: null,
        avatarUrl: null,
        tier: "FREE",
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendOnboardingEmail("user-123", 1);

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "onboarding_day1",
        "test@example.com",
        expect.any(Object),
        expect.objectContaining({
          tags: ["onboarding", "day1"],
        })
      );
    });

    it("should return error for non-configured day", async () => {
      const result = await emailTriggers.sendOnboardingEmail("user-123", 99);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No onboarding step");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe("processOnboardingSequence", () => {
    it("should process users for onboarding day 1", async () => {
      // Mock users who signed up 1 day ago
      const mockUsers = [
        {
          id: "user-1",
          email: "user1@example.com",
          firstName: "User",
          displayName: "User One",
        },
        {
          id: "user-2",
          email: "user2@example.com",
          firstName: "User",
          displayName: "User Two",
        },
      ];

      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as never);
      vi.mocked(db.email.findFirst).mockResolvedValue(null);
      vi.mocked(db.emailTemplate.findMany).mockResolvedValue([
        { id: "template-1" },
      ] as never);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const results = await emailTriggers.processOnboardingSequence();

      // Check that emails were sent via sendTemplateEmail
      expect(emailService.sendTemplateEmail).toHaveBeenCalledTimes(2);
      expect(results.processed).toBe(2);
      expect(results.sent).toBe(2);
      expect(results.failed).toBe(0);
    });

    it("should skip users who already received the email", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "user1@example.com",
          firstName: "User",
          displayName: "User One",
        },
      ];

      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as never);
      // Mock that email was already sent
      vi.mocked(db.email.findFirst).mockResolvedValue({
        id: "existing-email",
      } as never);
      vi.mocked(db.emailTemplate.findMany).mockResolvedValue([
        { id: "template-1" },
      ] as never);

      const sendOnboardingEmailSpy = vi.spyOn(
        emailTriggers,
        "sendOnboardingEmail"
      );

      const _results = await emailTriggers.processOnboardingSequence();

      // User processed but email not sent (already sent)
      expect(sendOnboardingEmailSpy).not.toHaveBeenCalled();
    });
  });

  describe("sendStreakEmail", () => {
    it("should send streak email for 7-day milestone", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        stats: {
          id: "stats-1",
          userId: "user-123",
          totalXP: 1000,
          level: 5,
          currentStreak: 7,
          longestStreak: 10,
          lastActivityDate: new Date(),
          booksCompleted: 3,
          totalReadingTime: 30240, // 8.4 hours
          totalWordsRead: 50000,
          averageWpm: 200,
          totalCardsReviewed: 50,
          totalCardsCreated: 30,
          averageRetention: 0.85,
          assessmentsCompleted: 2,
          averageScore: 85,
          followersCount: 5,
          followingCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        tier: "PRO",
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.book.count).mockResolvedValue(2);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendStreakEmail("user-123", 7);

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "streak_7_days",
        "test@example.com",
        expect.objectContaining({
          firstName: "John",
          booksInProgress: "2",
          booksCompleted: "3",
          userLevel: "5",
        }),
        expect.objectContaining({
          tags: ["engagement", "streak", "streak_7"],
        })
      );
    });

    it("should not send for non-milestone streaks", async () => {
      const result = await emailTriggers.sendStreakEmail("user-123", 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not a streak milestone");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendBookCompletionEmail", () => {
    it("should send book completion email", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        tier: "FREE",
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      const mockBook = {
        id: "book-123",
        userId: "user-123",
        title: "Test Book",
        author: "Test Author",
        pageCount: 300,
        wordCount: 80000,
        description: null,
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: null,
        fileType: null,
        language: "en",
        estimatedReadingTime: 240,
        difficulty: "INTERMEDIATE",
        genres: [],
        tags: [],
        status: "COMPLETED",
        progress: 100,
        aiEnabled: true,
        publicationYear: 2023,
        isbn: null,
        publisher: null,
        edition: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        completedAt: new Date(),
      };

      const mockProgress = {
        id: "progress-1",
        userId: "user-123",
        bookId: "book-123",
        currentPage: 300,
        currentChapter: 20,
        progress: 100,
        totalReadingTime: 14400, // 4 hours
        lastReadAt: new Date(),
        averageWpm: 250,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.book.findUnique).mockResolvedValue(mockBook);
      vi.mocked(db.readingProgress.findFirst).mockResolvedValue(mockProgress);
      vi.mocked(db.annotation.count).mockResolvedValue(15);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendBookCompletionEmail(
        "user-123",
        "book-123"
      );

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "book_completed",
        "test@example.com",
        expect.objectContaining({
          bookTitle: "Test Book",
          bookAuthor: "Test Author",
          annotationCount: "15",
        }),
        expect.any(Object)
      );
    });
  });

  describe("sendLibraryLimitEmail", () => {
    it("should send library limit email to free user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        tier: "FREE",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.book.count).mockResolvedValue(3);
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendLibraryLimitEmail("user-123");

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "upgrade_library_limit",
        "test@example.com",
        expect.objectContaining({
          bookCount: "3",
        }),
        expect.objectContaining({
          tags: ["conversion", "library_limit"],
        })
      );
    });

    it("should not send to Pro users", async () => {
      const mockUser = {
        id: "user-123",
        tier: "PRO",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const result = await emailTriggers.sendLibraryLimitEmail("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User is not on free tier");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe("ONBOARDING_SEQUENCE", () => {
    it("should have at least one onboarding step", () => {
      expect(emailTriggers.ONBOARDING_SEQUENCE.length).toBeGreaterThan(0);
    });

    it("should have all required fields for each step", () => {
      emailTriggers.ONBOARDING_SEQUENCE.forEach((step) => {
        expect(step).toHaveProperty("day");
        expect(step).toHaveProperty("templateName");
        expect(step).toHaveProperty("subject");
        expect(step).toHaveProperty("description");

        expect(step.day).toBeGreaterThan(0);
        expect(step.templateName).toBeTruthy();
        expect(step.subject).toBeTruthy();
        expect(step.description).toBeTruthy();
      });
    });

    it("should have day 1 onboarding step", () => {
      const day1Step = emailTriggers.ONBOARDING_SEQUENCE.find(
        (s) => s.day === 1
      );

      expect(day1Step).toBeDefined();
      expect(day1Step?.templateName).toBe("onboarding_day1");
    });
  });

  describe("sendInactiveUserEmail", () => {
    it("should send inactive user email for 3 days", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        tier: "FREE",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
        stats: {
          id: "stats-123",
          userId: "user-123",
          booksCompleted: 5,
          currentStreak: 0,
          longestStreak: 7,
          totalXP: 500,
          level: 3,
          pagesRead: 1000,
          totalWordsRead: 250000,
          totalReadingTime: 18000,
          averageRetention: 0.85,
          totalCardsCreated: 50,
          totalCardsReviewed: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        books: [
          {
            id: "book-123",
            title: "Test Book",
            author: "Test Author",
            progress: 45,
            status: "IN_PROGRESS",
            userId: "user-123",
            filePath: "/test.epub",
            fileFormat: "EPUB",
            fileSize: 1024,
            language: "en",
            genres: [],
            tags: [],
            notes: null,
            annotations: [],
            source: "UPLOAD",
            coverUrl: null,
            wordCount: null,
            pageCount: null,
            currentPage: null,
            totalPages: null,
            lastOpenedAt: null,
            startedAt: null,
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.book.count).mockResolvedValue(2);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: true,
        conversion: true,
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendInactiveUserEmail("user-123", 3);

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "inactive_3_days",
        "test@example.com",
        expect.objectContaining({
          userName: "John",
          booksInProgress: 2,
          booksCompleted: 5,
          lastStreak: 7,
          totalXP: 500,
          level: 3,
          currentBook: expect.objectContaining({
            id: "book-123",
            title: "Test Book",
            progress: 45,
          }),
        }),
        expect.objectContaining({
          tags: ["engagement", "re-engagement", "inactive_3_days"],
        })
      );
    });

    it("should send inactive user email for 7 days", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Jane",
        displayName: "Jane Doe",
        tier: "PRO",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
        stats: {
          id: "stats-123",
          userId: "user-123",
          booksCompleted: 10,
          currentStreak: 0,
          longestStreak: 14,
          totalXP: 1000,
          level: 5,
          pagesRead: 2000,
          totalWordsRead: 500000,
          totalReadingTime: 36000,
          averageRetention: 0.9,
          totalCardsCreated: 100,
          totalCardsReviewed: 400,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        books: [],
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.book.count).mockResolvedValue(0);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: true,
        conversion: true,
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendInactiveUserEmail("user-123", 7);

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "inactive_7_days",
        "test@example.com",
        expect.objectContaining({
          userName: "Jane",
          showUpgradeOffer: false, // Pro user, no upgrade offer
        }),
        expect.any(Object)
      );
    });

    it("should send inactive user email for 30 days with upgrade offer for free users", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Bob",
        displayName: "Bob Smith",
        tier: "FREE",
        clerkId: "clerk-123",
        lastName: "Smith",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
        stats: {
          id: "stats-123",
          userId: "user-123",
          booksCompleted: 2,
          currentStreak: 0,
          longestStreak: 3,
          totalXP: 200,
          level: 2,
          pagesRead: 400,
          totalWordsRead: 100000,
          totalReadingTime: 7200,
          averageRetention: 0.75,
          totalCardsCreated: 20,
          totalCardsReviewed: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        books: [],
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.book.count).mockResolvedValue(1);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: true,
        conversion: true,
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendInactiveUserEmail("user-123", 30);

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "inactive_30_days",
        "test@example.com",
        expect.objectContaining({
          userName: "Bob",
          showUpgradeOffer: true, // Free user at 30 days
        }),
        expect.any(Object)
      );
    });

    it("should not send if user opted out of engagement emails", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        tier: "FREE",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
        stats: null,
        books: [],
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: false, // Opted out
        conversion: true,
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await emailTriggers.sendInactiveUserEmail("user-123", 3);

      expect(result.success).toBe(false);
      expect(result.error).toBe("User opted out");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendAIUpgradeEmail", () => {
    it("should send AI upgrade email to free user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        displayName: "John Doe",
        tier: "FREE",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: true,
        conversion: true,
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendAIUpgradeEmail("user-123", {
        aiQuestionsUsed: 5,
        feature: "AI Chat",
      });

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "upgrade_ai_features",
        "test@example.com",
        expect.objectContaining({
          userName: "John",
          trigger: {
            aiQuestionsUsed: 5,
            feature: "AI Chat",
          },
        }),
        expect.objectContaining({
          tags: ["conversion", "upgrade", "ai_features"],
        })
      );
    });

    it("should not send to Pro users", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        tier: "PRO",
        firstName: "John",
        displayName: "John Doe",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const result = await emailTriggers.sendAIUpgradeEmail("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not on free tier");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });

    it("should not send if user opted out of conversion emails", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        tier: "FREE",
        firstName: "John",
        displayName: "John Doe",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: true,
        conversion: false, // Opted out
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await emailTriggers.sendAIUpgradeEmail("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User opted out");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendTTSUpgradeEmail", () => {
    it("should send TTS upgrade email to free user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "Jane",
        displayName: "Jane Doe",
        tier: "FREE",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(emailService.getEmailPreferences).mockResolvedValue({
        userId: "user-123",
        welcome: true,
        onboarding: true,
        engagement: true,
        conversion: true,
        digest: true,
        unsubscribedAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(emailService.sendTemplateEmail).mockResolvedValue({
        success: true,
        emailId: "email-123",
      });

      const result = await emailTriggers.sendTTSUpgradeEmail("user-123", {
        downloadsUsed: 3,
        downloadsLimit: 3,
        feature: "TTS Downloads",
      });

      expect(result.success).toBe(true);
      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        "user-123",
        "upgrade_tts_features",
        "test@example.com",
        expect.objectContaining({
          userName: "Jane",
          trigger: {
            downloadsUsed: 3,
            downloadsLimit: 3,
            feature: "TTS Downloads",
          },
        }),
        expect.objectContaining({
          tags: ["conversion", "upgrade", "tts_features"],
        })
      );
    });

    it("should not send to Scholar users", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        tier: "SCHOLAR",
        firstName: "Jane",
        displayName: "Jane Doe",
        clerkId: "clerk-123",
        lastName: "Doe",
        username: null,
        avatarUrl: null,
        role: "USER",
        preferences: {},
        readingLevel: null,
        preferredLang: "en",
        timezone: "UTC",
        profilePublic: false,
        showStats: false,
        showActivity: false,
        aiEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tierExpiresAt: null,
        stripeCustomerId: null,
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const result = await emailTriggers.sendTTSUpgradeEmail("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not on free tier");
      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });
});
