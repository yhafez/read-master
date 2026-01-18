/**
 * Tests for shared types
 *
 * These tests verify that all types are correctly exported and can be imported.
 * Since TypeScript types are erased at runtime, we test the type exports
 * by verifying the module structure and type definitions.
 */

import { describe, expect, it } from "vitest";

// Import the index to ensure it re-exports correctly
import * as types from "./index";

// Type imports for testing - these are used in type annotations
import type {
  // Database model types
  User,
  Book,
  Chapter,
  ReadingProgress,
  Annotation,
  PreReadingGuide,
  Assessment,
  Flashcard,
  FlashcardReview,
  UserStats,
  Achievement,
  UserAchievement,
  Curriculum,
  CurriculumItem,
  CurriculumFollow,
  Follow,
  ReadingGroup,
  ReadingGroupMember,
  GroupDiscussion,
  DiscussionReply,
  ForumCategory,
  ForumPost,
  ForumReply,
  ForumVote,
  AIUsageLog,
  AuditLog,
  // Enum types
  UserTier,
  BookSource,
  FileType,
  ReadingStatus,
  AnnotationType,
  AssessmentType,
  FlashcardType,
  FlashcardStatus,
  AchievementCategory,
  AchievementTier,
  Visibility,
  GroupRole,
  // API types
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  SortDirection,
  SortParams,
  UserProfileResponse,
  UserStatsResponse,
  UserActivityItem,
  UpdateUserPreferencesRequest,
  BookListParams,
  BookSummaryResponse,
  BookUpdateRequest,
  VocabularyItem,
  FlashcardResponse,
  ReviewFlashcardRequest,
  FlashcardStatsResponse,
  AssessmentQuestion,
  BloomsBreakdown,
  AiExplainRequest,
  AiGradeAnswerResponse,
  ReadingGroupResponse,
  ForumVoteRequest,
  LeaderboardEntry,
  LeaderboardParams,
  TtsVoice,
  TtsDownloadStatusResponse,
} from "./index";

describe("Database Types", () => {
  describe("Model Types", () => {
    it("should export User type", () => {
      // Type check - if this compiles, the type exists
      const user: Partial<User> = {};
      expect(user).toBeDefined();
    });

    it("should export Book type", () => {
      const book: Partial<Book> = {};
      expect(book).toBeDefined();
    });

    it("should export Chapter type", () => {
      const chapter: Partial<Chapter> = {};
      expect(chapter).toBeDefined();
    });

    it("should export ReadingProgress type", () => {
      const progress: Partial<ReadingProgress> = {};
      expect(progress).toBeDefined();
    });

    it("should export Annotation type", () => {
      const annotation: Partial<Annotation> = {};
      expect(annotation).toBeDefined();
    });

    it("should export PreReadingGuide type", () => {
      const guide: Partial<PreReadingGuide> = {};
      expect(guide).toBeDefined();
    });

    it("should export Assessment type", () => {
      const assessment: Partial<Assessment> = {};
      expect(assessment).toBeDefined();
    });

    it("should export Flashcard type", () => {
      const flashcard: Partial<Flashcard> = {};
      expect(flashcard).toBeDefined();
    });

    it("should export FlashcardReview type", () => {
      const review: Partial<FlashcardReview> = {};
      expect(review).toBeDefined();
    });

    it("should export UserStats type", () => {
      const stats: Partial<UserStats> = {};
      expect(stats).toBeDefined();
    });

    it("should export Achievement type", () => {
      const achievement: Partial<Achievement> = {};
      expect(achievement).toBeDefined();
    });

    it("should export UserAchievement type", () => {
      const userAchievement: Partial<UserAchievement> = {};
      expect(userAchievement).toBeDefined();
    });

    it("should export Curriculum type", () => {
      const curriculum: Partial<Curriculum> = {};
      expect(curriculum).toBeDefined();
    });

    it("should export CurriculumItem type", () => {
      const item: Partial<CurriculumItem> = {};
      expect(item).toBeDefined();
    });

    it("should export CurriculumFollow type", () => {
      const follow: Partial<CurriculumFollow> = {};
      expect(follow).toBeDefined();
    });

    it("should export Follow type", () => {
      const follow: Partial<Follow> = {};
      expect(follow).toBeDefined();
    });

    it("should export ReadingGroup type", () => {
      const group: Partial<ReadingGroup> = {};
      expect(group).toBeDefined();
    });

    it("should export ReadingGroupMember type", () => {
      const member: Partial<ReadingGroupMember> = {};
      expect(member).toBeDefined();
    });

    it("should export GroupDiscussion type", () => {
      const discussion: Partial<GroupDiscussion> = {};
      expect(discussion).toBeDefined();
    });

    it("should export DiscussionReply type", () => {
      const reply: Partial<DiscussionReply> = {};
      expect(reply).toBeDefined();
    });

    it("should export ForumCategory type", () => {
      const category: Partial<ForumCategory> = {};
      expect(category).toBeDefined();
    });

    it("should export ForumPost type", () => {
      const post: Partial<ForumPost> = {};
      expect(post).toBeDefined();
    });

    it("should export ForumReply type", () => {
      const reply: Partial<ForumReply> = {};
      expect(reply).toBeDefined();
    });

    it("should export ForumVote type", () => {
      const vote: Partial<ForumVote> = {};
      expect(vote).toBeDefined();
    });

    it("should export AIUsageLog type", () => {
      const log: Partial<AIUsageLog> = {};
      expect(log).toBeDefined();
    });

    it("should export AuditLog type", () => {
      const log: Partial<AuditLog> = {};
      expect(log).toBeDefined();
    });
  });

  describe("Enum Types", () => {
    it("should export UserTier type", () => {
      const tier: UserTier = "FREE";
      expect(["FREE", "PRO", "SCHOLAR"]).toContain(tier);
    });

    it("should export BookSource type", () => {
      const source: BookSource = "UPLOAD";
      expect([
        "UPLOAD",
        "URL",
        "PASTE",
        "GOOGLE_BOOKS",
        "OPEN_LIBRARY",
      ]).toContain(source);
    });

    it("should export FileType type", () => {
      const fileType: FileType = "PDF";
      expect(["PDF", "EPUB", "DOC", "DOCX", "TXT", "HTML"]).toContain(fileType);
    });

    it("should export ReadingStatus type", () => {
      const status: ReadingStatus = "READING";
      expect(["WANT_TO_READ", "READING", "COMPLETED", "ABANDONED"]).toContain(
        status
      );
    });

    it("should export AnnotationType type", () => {
      const type: AnnotationType = "HIGHLIGHT";
      expect(["HIGHLIGHT", "NOTE", "BOOKMARK"]).toContain(type);
    });

    it("should export AssessmentType type", () => {
      const type: AssessmentType = "BOOK_ASSESSMENT";
      expect(["CHAPTER_CHECK", "BOOK_ASSESSMENT", "CUSTOM"]).toContain(type);
    });

    it("should export FlashcardType type", () => {
      const type: FlashcardType = "VOCABULARY";
      expect([
        "VOCABULARY",
        "CONCEPT",
        "COMPREHENSION",
        "QUOTE",
        "CUSTOM",
      ]).toContain(type);
    });

    it("should export FlashcardStatus type", () => {
      const status: FlashcardStatus = "NEW";
      expect(["NEW", "LEARNING", "REVIEW", "SUSPENDED"]).toContain(status);
    });

    it("should export AchievementCategory type", () => {
      const category: AchievementCategory = "READING";
      expect([
        "READING",
        "LEARNING",
        "SOCIAL",
        "STREAK",
        "MILESTONE",
        "SPECIAL",
      ]).toContain(category);
    });

    it("should export AchievementTier type", () => {
      const tier: AchievementTier = "COMMON";
      expect(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).toContain(
        tier
      );
    });

    it("should export Visibility type", () => {
      const visibility: Visibility = "PUBLIC";
      expect(["PRIVATE", "UNLISTED", "PUBLIC"]).toContain(visibility);
    });

    it("should export GroupRole type", () => {
      const role: GroupRole = "MEMBER";
      expect(["OWNER", "ADMIN", "MEMBER"]).toContain(role);
    });
  });
});

describe("API Types", () => {
  describe("Common API Types", () => {
    it("should export ApiResponse type", () => {
      const successResponse: ApiResponse<string> = {
        success: true,
        data: "test",
      };
      const errorResponse: ApiResponse<string> = {
        success: false,
        error: { code: "ERROR", message: "Test error" },
      };
      expect(successResponse.success).toBe(true);
      expect(errorResponse.success).toBe(false);
    });

    it("should export ApiError type", () => {
      const error: ApiError = {
        code: "NOT_FOUND",
        message: "Resource not found",
      };
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should export PaginatedResponse type", () => {
      const response: PaginatedResponse<string> = {
        items: ["a", "b"],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      expect(response.items).toHaveLength(2);
    });

    it("should export PaginationMeta type", () => {
      const meta: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      };
      expect(meta.totalPages).toBe(10);
    });

    it("should export PaginationParams type", () => {
      const params: PaginationParams = { page: 1, limit: 20 };
      expect(params.page).toBe(1);
    });

    it("should export SortDirection type", () => {
      const direction: SortDirection = "asc";
      expect(["asc", "desc"]).toContain(direction);
    });

    it("should export SortParams type", () => {
      const params: SortParams<"name" | "date"> = {
        sortBy: "name",
        sortDirection: "asc",
      };
      expect(params.sortBy).toBe("name");
    });
  });

  describe("User API Types", () => {
    it("should export UserProfileResponse type", () => {
      const profile: UserProfileResponse = {
        id: "1",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: null,
        bio: null,
        tier: "FREE",
        createdAt: "2024-01-01",
      };
      expect(profile.username).toBe("testuser");
    });

    it("should export UserStatsResponse type", () => {
      const stats: UserStatsResponse = {
        totalXP: 1000,
        level: 5,
        currentStreak: 7,
        longestStreak: 14,
        booksCompleted: 3,
        totalReadingTime: 36000,
        totalWordsRead: 50000,
        totalCardsReviewed: 200,
        averageRetention: 0.85,
        assessmentsCompleted: 10,
        averageScore: 80,
        followersCount: 10,
        followingCount: 15,
      };
      expect(stats.level).toBe(5);
    });

    it("should export UserActivityItem type", () => {
      const activity: UserActivityItem = {
        type: "book_completed",
        timestamp: "2024-01-01T00:00:00Z",
        data: { bookId: "123" },
      };
      expect(activity.type).toBe("book_completed");
    });

    it("should export UpdateUserPreferencesRequest type", () => {
      const request: UpdateUserPreferencesRequest = {
        preferredLang: "en",
        aiEnabled: true,
      };
      expect(request.preferredLang).toBe("en");
    });
  });

  describe("Book API Types", () => {
    it("should export BookListParams type", () => {
      const params: BookListParams = {
        page: 1,
        limit: 10,
        status: "READING",
        sortBy: "title",
      };
      expect(params.status).toBe("READING");
    });

    it("should export BookSummaryResponse type", () => {
      const book: BookSummaryResponse = {
        id: "1",
        title: "Test Book",
        author: "Test Author",
        coverImage: null,
        status: "READING",
        source: "UPLOAD",
        wordCount: 50000,
        progress: 25.5,
        lastReadAt: "2024-01-01",
        createdAt: "2024-01-01",
      };
      expect(book.title).toBe("Test Book");
    });

    it("should export BookUpdateRequest type", () => {
      const request: BookUpdateRequest = {
        title: "Updated Title",
        status: "COMPLETED",
      };
      expect(request.status).toBe("COMPLETED");
    });

    it("should export VocabularyItem type", () => {
      const item: VocabularyItem = {
        term: "epistemology",
        definition: "Theory of knowledge",
        examples: ["Example 1"],
      };
      expect(item.term).toBe("epistemology");
    });
  });

  describe("Flashcard API Types", () => {
    it("should export FlashcardResponse type", () => {
      const flashcard: FlashcardResponse = {
        id: "1",
        bookId: "book1",
        front: "Question?",
        back: "Answer",
        type: "VOCABULARY",
        status: "NEW",
        tags: ["vocab"],
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: "2024-01-01",
        totalReviews: 0,
        correctReviews: 0,
        createdAt: "2024-01-01",
      };
      expect(flashcard.type).toBe("VOCABULARY");
    });

    it("should export ReviewFlashcardRequest type", () => {
      const request: ReviewFlashcardRequest = {
        rating: 3,
        responseTimeMs: 2000,
      };
      expect(request.rating).toBe(3);
    });

    it("should export FlashcardStatsResponse type", () => {
      const stats: FlashcardStatsResponse = {
        total: 100,
        new: 20,
        learning: 30,
        review: 45,
        suspended: 5,
        dueToday: 15,
        retentionRate: 0.85,
        reviewsToday: 50,
        streakDays: 7,
      };
      expect(stats.retentionRate).toBe(0.85);
    });
  });

  describe("Assessment API Types", () => {
    it("should export AssessmentQuestion type", () => {
      const question: AssessmentQuestion = {
        id: "q1",
        type: "multiple_choice",
        question: "What is the main theme?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        bloomsLevel: "understand",
      };
      expect(question.bloomsLevel).toBe("understand");
    });

    it("should export BloomsBreakdown type", () => {
      const breakdown: BloomsBreakdown = {
        remember: 20,
        understand: 25,
        apply: 20,
        analyze: 15,
        evaluate: 10,
        create: 10,
      };
      expect(breakdown.remember + breakdown.understand).toBe(45);
    });
  });

  describe("AI API Types", () => {
    it("should export AiExplainRequest type", () => {
      const request: AiExplainRequest = {
        bookId: "book1",
        selectedText: "Some complex text",
      };
      expect(request.selectedText).toBe("Some complex text");
    });

    it("should export AiGradeAnswerResponse type", () => {
      const response: AiGradeAnswerResponse = {
        score: 85,
        isCorrect: true,
        feedback: "Good answer!",
        suggestions: ["Consider also mentioning..."],
      };
      expect(response.isCorrect).toBe(true);
    });
  });

  describe("Social API Types", () => {
    it("should export ReadingGroupResponse type", () => {
      const group: ReadingGroupResponse = {
        id: "1",
        name: "Book Club",
        description: "A fun book club",
        coverImage: null,
        isPublic: true,
        membersCount: 10,
        discussionsCount: 5,
        currentBook: null,
        owner: {
          id: "user1",
          username: "owner",
          displayName: "Owner",
          avatarUrl: null,
        },
        userRole: "MEMBER",
        createdAt: "2024-01-01",
      };
      expect(group.membersCount).toBe(10);
    });

    it("should export ForumVoteRequest type", () => {
      const request: ForumVoteRequest = { value: 1 };
      expect(request.value).toBe(1);
    });
  });

  describe("TTS API Types", () => {
    it("should export TtsVoice type", () => {
      const voice: TtsVoice = {
        id: "voice1",
        name: "Alloy",
        language: "en-US",
        gender: "neutral",
      };
      expect(voice.name).toBe("Alloy");
    });

    it("should export TtsDownloadStatusResponse type", () => {
      const status: TtsDownloadStatusResponse = {
        id: "download1",
        bookId: "book1",
        status: "processing",
        progress: 50,
        downloadUrl: null,
        expiresAt: null,
        createdAt: "2024-01-01",
      };
      expect(status.progress).toBe(50);
    });
  });

  describe("Leaderboard API Types", () => {
    it("should export LeaderboardEntry type", () => {
      const entry: LeaderboardEntry = {
        rank: 1,
        user: {
          id: "user1",
          username: "top_reader",
          displayName: "Top Reader",
          avatarUrl: null,
        },
        value: 10000,
        isCurrentUser: false,
      };
      expect(entry.rank).toBe(1);
    });

    it("should export LeaderboardParams type", () => {
      const params: LeaderboardParams = {
        timeframe: "weekly",
        metric: "xp",
        friendsOnly: true,
      };
      expect(params.timeframe).toBe("weekly");
    });
  });
});

describe("Index Re-exports", () => {
  it("should re-export database types from index", () => {
    // The types module should export everything
    expect(types).toBeDefined();
  });
});
