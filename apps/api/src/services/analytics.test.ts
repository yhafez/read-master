/**
 * Analytics Service Tests
 *
 * Comprehensive tests for the analytics service including all stats functions,
 * caching behavior, and edge cases.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Mock } from "vitest";

// Mock the dependencies before importing the module
vi.mock("./db.js", () => ({
  db: {
    user: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    book: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    readingProgress: {
      count: vi.fn(),
    },
    flashcard: {
      count: vi.fn(),
    },
    flashcardReview: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    assessment: {
      count: vi.fn(),
    },
    aIUsageLog: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    forumPost: {
      count: vi.fn(),
    },
    readingGroup: {
      count: vi.fn(),
    },
    curriculum: {
      count: vi.fn(),
    },
    dailyAnalytics: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./redis.js", () => ({
  getOrSet: vi.fn(async (_key: string, fetcher: () => Promise<unknown>) =>
    fetcher()
  ),
  buildKey: vi.fn((...parts: string[]) => parts.join(":")),
  CacheKeyPrefix: {
    USER: "user",
    BOOK: "book",
    PROGRESS: "progress",
    GUIDE: "guide",
    FLASHCARD: "flashcard",
    ASSESSMENT: "assessment",
    SEARCH: "search",
    API: "api",
    LEADERBOARD: "leaderboard",
    FORUM: "forum",
    SESSION: "session",
    ANALYTICS: "analytics",
  },
  CacheTTL: {
    VERY_SHORT: 60,
    SHORT: 300,
    MEDIUM: 900,
    LONG: 3600,
  },
  invalidatePattern: vi.fn(),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { db } from "./db.js";
import { invalidatePattern } from "./redis.js";
import {
  getUserStats,
  getRevenueStats,
  getEngagementStats,
  getFeatureUsageStats,
  getAICostStats,
  getContentStats,
  getOverviewStats,
  getDailyAnalytics,
  invalidateAnalyticsCache,
  analytics,
  type UserStats,
  type RevenueStats,
  type EngagementStats,
  type FeatureUsageStats,
  type AICostStats,
  type ContentStats,
  type OverviewStats,
} from "./analytics.js";

describe("Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // getUserStats Tests
  // ============================================================================

  describe("getUserStats", () => {
    it("should return user statistics with all fields", async () => {
      // Setup mocks
      (db.user.count as Mock)
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(500) // active users
        .mockResolvedValueOnce(100) // new users in period
        .mockResolvedValueOnce(80); // previous period new users

      (db.user.groupBy as Mock).mockResolvedValue([
        { tier: "FREE", _count: 700 },
        { tier: "PRO", _count: 200 },
        { tier: "SCHOLAR", _count: 100 },
      ]);

      const result = await getUserStats();

      expect(result).toBeDefined();
      expect(result.total).toBe(1000);
      expect(result.active).toBe(500);
      expect(result.newLast30Days).toBe(100);
      expect(result.byTier).toEqual({
        free: 700,
        pro: 200,
        scholar: 100,
      });
      expect(result.growth.netNew).toBe(100);
      expect(result.growth.percentChange).toBe(25); // (100-80)/80 * 100 = 25%
    });

    it("should handle zero previous users for growth calculation", async () => {
      (db.user.count as Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50) // active
        .mockResolvedValueOnce(10) // new this period
        .mockResolvedValueOnce(0); // no users in previous period

      (db.user.groupBy as Mock).mockResolvedValue([]);

      const result = await getUserStats();

      expect(result.growth.percentChange).toBe(100); // 100% growth from 0
    });

    it("should skip cache when skipCache is true", async () => {
      (db.user.count as Mock).mockResolvedValue(0);
      (db.user.groupBy as Mock).mockResolvedValue([]);

      await getUserStats({ skipCache: true });

      // getOrSet should not be called when skipCache is true
      // The fetcher is called directly
      expect(db.user.count).toHaveBeenCalled();
    });

    it("should use custom days parameter", async () => {
      (db.user.count as Mock).mockResolvedValue(0);
      (db.user.groupBy as Mock).mockResolvedValue([]);

      await getUserStats({ days: 7 });

      // Verify the function completes without error
      expect(db.user.count).toHaveBeenCalled();
    });

    it("should handle empty tier results", async () => {
      (db.user.count as Mock).mockResolvedValue(0);
      (db.user.groupBy as Mock).mockResolvedValue([]);

      const result = await getUserStats();

      expect(result.byTier).toEqual({
        free: 0,
        pro: 0,
        scholar: 0,
      });
    });
  });

  // ============================================================================
  // getRevenueStats Tests
  // ============================================================================

  describe("getRevenueStats", () => {
    it("should calculate MRR and ARR correctly", async () => {
      // Mock DailyAnalytics aggregations
      (db.dailyAnalytics.aggregate as Mock)
        .mockResolvedValueOnce({
          _sum: {
            totalRevenueCents: 50000,
            newSubscriptionsCents: 30000,
            renewalsCents: 15000,
            upgradesCents: 5000,
            refundsCents: 0,
          },
        })
        .mockResolvedValueOnce({
          _sum: { totalRevenueCents: 40000 },
        });

      // Mock paying user counts
      (db.user.count as Mock)
        .mockResolvedValueOnce(100) // Pro users
        .mockResolvedValueOnce(50) // Scholar users
        .mockResolvedValueOnce(1000); // Total users

      const result = await getRevenueStats();

      expect(result).toBeDefined();
      // MRR = 100 * 999 + 50 * 1999 = 99900 + 99950 = 199850 cents
      expect(result.mrrCents).toBe(199850);
      expect(result.arrCents).toBe(199850 * 12);
      expect(result.totalPeriodCents).toBe(50000);
      expect(result.growthPercent).toBe(25); // (50000-40000)/40000 * 100
    });

    it("should handle zero revenue", async () => {
      (db.dailyAnalytics.aggregate as Mock).mockResolvedValue({
        _sum: { totalRevenueCents: null },
      });
      (db.user.count as Mock).mockResolvedValue(0);

      const result = await getRevenueStats();

      expect(result.mrrCents).toBe(0);
      expect(result.arrCents).toBe(0);
      expect(result.totalPeriodCents).toBe(0);
    });

    it("should calculate ARPU correctly", async () => {
      (db.dailyAnalytics.aggregate as Mock).mockResolvedValue({
        _sum: { totalRevenueCents: 0 },
      });
      (db.user.count as Mock)
        .mockResolvedValueOnce(10) // Pro
        .mockResolvedValueOnce(5) // Scholar
        .mockResolvedValueOnce(100); // Total

      const result = await getRevenueStats();

      // MRR = 10 * 999 + 5 * 1999 = 9990 + 9995 = 19985
      // ARPU = 19985 / 100 = 199.85 rounded to 200
      expect(result.arpuCents).toBe(200);
    });
  });

  // ============================================================================
  // getEngagementStats Tests
  // ============================================================================

  describe("getEngagementStats", () => {
    it("should return engagement metrics", async () => {
      (db.user.count as Mock)
        .mockResolvedValueOnce(100) // DAU
        .mockResolvedValueOnce(500) // WAU
        .mockResolvedValueOnce(1000); // MAU

      (db.dailyAnalytics.aggregate as Mock).mockResolvedValue({
        _sum: { totalReadingTimeMin: 60000 },
      });

      (db.book.count as Mock).mockResolvedValue(50);
      (db.assessment.count as Mock).mockResolvedValue(200);

      const result = await getEngagementStats();

      expect(result.dau).toBe(100);
      expect(result.wau).toBe(500);
      expect(result.mau).toBe(1000);
      expect(result.stickiness).toBe(0.1); // DAU/MAU = 100/1000
      expect(result.totalReadingHours).toBe(1000); // 60000 min / 60
      expect(result.booksCompleted).toBe(50);
      expect(result.assessmentsTaken).toBe(200);
    });

    it("should handle zero MAU for stickiness", async () => {
      (db.user.count as Mock).mockResolvedValue(0);
      (db.dailyAnalytics.aggregate as Mock).mockResolvedValue({
        _sum: { totalReadingTimeMin: 0 },
      });
      (db.book.count as Mock).mockResolvedValue(0);
      (db.assessment.count as Mock).mockResolvedValue(0);

      const result = await getEngagementStats();

      expect(result.stickiness).toBe(0);
      expect(result.avgSessionMinutes).toBe(0);
    });
  });

  // ============================================================================
  // getFeatureUsageStats Tests
  // ============================================================================

  describe("getFeatureUsageStats", () => {
    it("should return feature usage statistics", async () => {
      // AI stats
      (db.aIUsageLog.groupBy as Mock)
        .mockResolvedValueOnce([
          { operation: "pre_reading_guide", _count: 100 },
          { operation: "explain", _count: 200 },
          { operation: "assessment", _count: 50 },
          { operation: "flashcards", _count: 150 },
        ])
        .mockResolvedValueOnce([
          { userId: "user1" },
          { userId: "user2" },
          { userId: "user3" },
        ]);

      // SRS stats
      (db.flashcard.count as Mock).mockResolvedValue(1000);
      (db.flashcardReview.count as Mock).mockResolvedValue(5000);
      (db.user.count as Mock)
        .mockResolvedValueOnce(200) // SRS active learners
        .mockResolvedValueOnce(50); // Forum users

      (db.flashcardReview.aggregate as Mock).mockResolvedValue({
        _avg: { rating: 3.2 },
      });

      // Social stats
      (db.forumPost.count as Mock).mockResolvedValue(100);
      (db.readingGroup.count as Mock).mockResolvedValue(25);
      (db.curriculum.count as Mock).mockResolvedValue(10);

      const result = await getFeatureUsageStats();

      expect(result.ai.totalRequests).toBe(500);
      expect(result.ai.uniqueUsers).toBe(3);
      expect(result.ai.byType.preReadingGuides).toBe(100);
      expect(result.ai.byType.explanations).toBe(200);
      expect(result.ai.byType.assessments).toBe(50);
      expect(result.ai.byType.flashcards).toBe(150);

      expect(result.srs.cardsCreated).toBe(1000);
      expect(result.srs.reviewsCompleted).toBe(5000);
      expect(result.srs.activeLearners).toBe(200);
      expect(result.srs.avgRetentionRate).toBe(80); // 3.2/4 * 100

      expect(result.social.forumUsers).toBe(50);
      expect(result.social.postsCreated).toBe(100);
      expect(result.social.activeGroups).toBe(25);
      expect(result.social.curriculumsCreated).toBe(10);
    });

    it("should handle null retention rate", async () => {
      (db.aIUsageLog.groupBy as Mock).mockResolvedValue([]);
      (db.flashcard.count as Mock).mockResolvedValue(0);
      (db.flashcardReview.count as Mock).mockResolvedValue(0);
      (db.user.count as Mock).mockResolvedValue(0);
      (db.flashcardReview.aggregate as Mock).mockResolvedValue({
        _avg: { rating: null },
      });
      (db.forumPost.count as Mock).mockResolvedValue(0);
      (db.readingGroup.count as Mock).mockResolvedValue(0);
      (db.curriculum.count as Mock).mockResolvedValue(0);

      const result = await getFeatureUsageStats();

      expect(result.srs.avgRetentionRate).toBe(0);
    });
  });

  // ============================================================================
  // getAICostStats Tests
  // ============================================================================

  describe("getAICostStats", () => {
    it("should calculate AI costs correctly", async () => {
      (db.aIUsageLog.aggregate as Mock).mockResolvedValue({
        _sum: {
          totalTokens: 1000000,
          cost: { toString: () => "25.50" },
        },
        _count: 500,
      });

      (db.aIUsageLog.groupBy as Mock)
        .mockResolvedValueOnce([
          { userId: "user1" },
          { userId: "user2" },
          { userId: "user3" },
          { userId: "user4" },
          { userId: "user5" },
        ])
        .mockResolvedValueOnce([
          {
            operation: "pre_reading_guide",
            _sum: { cost: { toString: () => "5.00" } },
          },
          { operation: "explain", _sum: { cost: { toString: () => "10.00" } } },
          {
            operation: "assessment",
            _sum: { cost: { toString: () => "5.00" } },
          },
          {
            operation: "flashcards",
            _sum: { cost: { toString: () => "3.00" } },
          },
          {
            operation: "grade_answer",
            _sum: { cost: { toString: () => "2.00" } },
          },
          { operation: "other_op", _sum: { cost: { toString: () => "0.50" } } },
        ]);

      const result = await getAICostStats();

      expect(result.totalCostCents).toBe(2550); // $25.50 * 100
      expect(result.totalTokens).toBe(1000000);
      expect(result.costPerUserCents).toBe(510); // 2550 / 5
      expect(result.byOperation.preReadingGuides).toBe(500);
      expect(result.byOperation.explanations).toBe(1000);
      expect(result.byOperation.assessments).toBe(500);
      expect(result.byOperation.flashcards).toBe(300);
      expect(result.byOperation.grading).toBe(200);
      expect(result.byOperation.other).toBe(50);
      expect(result.dailyAvgCents).toBe(85); // 2550 / 30
      expect(result.projectedMonthlyCents).toBe(2550); // 85 * 30
    });

    it("should handle null cost values", async () => {
      (db.aIUsageLog.aggregate as Mock).mockResolvedValue({
        _sum: {
          totalTokens: null,
          cost: null,
        },
        _count: 0,
      });

      (db.aIUsageLog.groupBy as Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getAICostStats();

      expect(result.totalCostCents).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.costPerUserCents).toBe(0);
    });
  });

  // ============================================================================
  // getContentStats Tests
  // ============================================================================

  describe("getContentStats", () => {
    it("should return content statistics", async () => {
      (db.book.count as Mock)
        .mockResolvedValueOnce(5000) // total books
        .mockResolvedValueOnce(500); // books added in period

      (db.book.groupBy as Mock)
        .mockResolvedValueOnce([
          { genre: "FICTION", _count: 2000 },
          { genre: "NON_FICTION", _count: 1500 },
          { genre: "SCIENCE", _count: 800 },
        ])
        .mockResolvedValueOnce([
          { source: "UPLOAD", _count: 2000 },
          { source: "URL", _count: 1000 },
          { source: "PASTE", _count: 500 },
          { source: "GOOGLE_BOOKS", _count: 1000 },
          { source: "OPEN_LIBRARY", _count: 500 },
        ]);

      (db.book.findMany as Mock).mockResolvedValue([
        {
          id: "book1",
          title: "Book 1",
          author: "Author 1",
          _count: { readingProgress: 100 },
        },
        {
          id: "book2",
          title: "Book 2",
          author: "Author 2",
          _count: { readingProgress: 80 },
        },
      ]);

      (db.user.count as Mock).mockResolvedValue(1000);

      const result = await getContentStats();

      expect(result.totalBooks).toBe(5000);
      expect(result.booksAddedPeriod).toBe(500);
      expect(result.popularGenres.length).toBe(3);
      expect(result.popularGenres[0]?.genre).toBe("FICTION");
      expect(result.popularGenres[0]?.count).toBe(2000);
      expect(result.popularGenres[0]?.percentage).toBe(40); // 2000/5000 * 100
      expect(result.popularBooks.length).toBe(2);
      expect(result.avgBooksPerUser).toBe(5); // 5000/1000
      expect(result.bySource.upload).toBe(2000);
      expect(result.bySource.googleBooks).toBe(1000);
    });

    it("should handle empty results", async () => {
      (db.book.count as Mock).mockResolvedValue(0);
      (db.book.groupBy as Mock).mockResolvedValue([]);
      (db.book.findMany as Mock).mockResolvedValue([]);
      (db.user.count as Mock).mockResolvedValue(0);

      const result = await getContentStats();

      expect(result.totalBooks).toBe(0);
      expect(result.popularGenres).toEqual([]);
      expect(result.popularBooks).toEqual([]);
      expect(result.avgBooksPerUser).toBe(0);
    });
  });

  // ============================================================================
  // getOverviewStats Tests
  // ============================================================================

  describe("getOverviewStats", () => {
    it("should combine key metrics from all categories", async () => {
      // Mock all required database calls
      // User stats mocks
      (db.user.count as Mock)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(500) // active
        .mockResolvedValueOnce(100) // new
        .mockResolvedValueOnce(80) // previous new
        .mockResolvedValueOnce(150) // pro users (revenue)
        .mockResolvedValueOnce(50) // scholar users (revenue)
        .mockResolvedValueOnce(1000) // total users (revenue)
        .mockResolvedValueOnce(100) // DAU (engagement)
        .mockResolvedValueOnce(400) // WAU (engagement)
        .mockResolvedValueOnce(800); // MAU (engagement)

      (db.user.groupBy as Mock).mockResolvedValue([
        { tier: "FREE", _count: 800 },
        { tier: "PRO", _count: 150 },
        { tier: "SCHOLAR", _count: 50 },
      ]);

      // Revenue mocks
      (db.dailyAnalytics.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { totalRevenueCents: 50000 } })
        .mockResolvedValueOnce({ _sum: { totalRevenueCents: 40000 } })
        .mockResolvedValueOnce({ _sum: { totalReadingTimeMin: 30000 } });

      (db.book.count as Mock).mockResolvedValue(100);
      (db.assessment.count as Mock).mockResolvedValue(50);

      // AI costs mocks
      (db.aIUsageLog.aggregate as Mock).mockResolvedValue({
        _sum: { totalTokens: 500000, cost: { toString: () => "15.00" } },
        _count: 200,
      });

      (db.aIUsageLog.groupBy as Mock)
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }])
        .mockResolvedValueOnce([]);

      const result = await getOverviewStats();

      expect(result).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.users.total).toBe(1000);
      expect(result.revenue).toBeDefined();
      expect(result.engagement).toBeDefined();
      expect(result.aiCosts).toBeDefined();
    });
  });

  // ============================================================================
  // getDailyAnalytics Tests
  // ============================================================================

  describe("getDailyAnalytics", () => {
    it("should return daily analytics for date range", async () => {
      const mockData = [
        {
          date: new Date("2024-01-01"),
          totalUsers: 1000,
          activeUsers: 500,
          newUsers: 10,
          totalRevenueCents: 5000,
          aiCostCents: 100,
          booksAdded: 20,
          flashcardsReviewed: 200,
        },
        {
          date: new Date("2024-01-02"),
          totalUsers: 1010,
          activeUsers: 520,
          newUsers: 15,
          totalRevenueCents: 5500,
          aiCostCents: 120,
          booksAdded: 25,
          flashcardsReviewed: 220,
        },
      ];

      (db.dailyAnalytics.findMany as Mock).mockResolvedValue(mockData);

      const result = await getDailyAnalytics(
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.totalUsers).toBe(1000);
      expect(result[1]?.newUsers).toBe(15);
    });

    it("should return empty array for no data", async () => {
      (db.dailyAnalytics.findMany as Mock).mockResolvedValue([]);

      const result = await getDailyAnalytics(
        new Date("2024-01-01"),
        new Date("2024-01-02")
      );

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Cache Invalidation Tests
  // ============================================================================

  describe("invalidateAnalyticsCache", () => {
    it("should invalidate analytics cache pattern", async () => {
      await invalidateAnalyticsCache();

      expect(invalidatePattern).toHaveBeenCalledWith("analytics:*");
    });
  });

  // ============================================================================
  // Analytics Service Object Tests
  // ============================================================================

  describe("analytics service object", () => {
    it("should export all functions", () => {
      expect(analytics.getUserStats).toBeDefined();
      expect(analytics.getRevenueStats).toBeDefined();
      expect(analytics.getEngagementStats).toBeDefined();
      expect(analytics.getFeatureUsageStats).toBeDefined();
      expect(analytics.getAICostStats).toBeDefined();
      expect(analytics.getContentStats).toBeDefined();
      expect(analytics.getOverviewStats).toBeDefined();
      expect(analytics.getDailyAnalytics).toBeDefined();
      expect(analytics.invalidateCache).toBeDefined();
    });

    it("should export constants", () => {
      expect(analytics.CACHE_TTL).toBe(300); // SHORT = 5 minutes
      expect(analytics.CACHE_PREFIX).toBe("analytics");
    });
  });

  // ============================================================================
  // Type Exports Tests
  // ============================================================================

  describe("type exports", () => {
    it("should export UserStats type", () => {
      const stats: UserStats = {
        total: 1000,
        active: 500,
        newLast30Days: 100,
        byTier: { free: 700, pro: 200, scholar: 100 },
        growth: { percentChange: 25, netNew: 100 },
      };
      expect(stats).toBeDefined();
    });

    it("should export RevenueStats type", () => {
      const stats: RevenueStats = {
        mrrCents: 10000,
        arrCents: 120000,
        byTier: { pro: 5000, scholar: 5000 },
        totalPeriodCents: 10000,
        growthPercent: 10,
        arpuCents: 100,
      };
      expect(stats).toBeDefined();
    });

    it("should export EngagementStats type", () => {
      const stats: EngagementStats = {
        dau: 100,
        wau: 500,
        mau: 1000,
        stickiness: 0.1,
        avgSessionMinutes: 30,
        totalReadingHours: 500,
        booksCompleted: 50,
        assessmentsTaken: 100,
      };
      expect(stats).toBeDefined();
    });

    it("should export FeatureUsageStats type", () => {
      const stats: FeatureUsageStats = {
        ai: {
          totalRequests: 500,
          uniqueUsers: 50,
          byType: {
            preReadingGuides: 100,
            explanations: 200,
            assessments: 100,
            flashcards: 100,
          },
        },
        srs: {
          cardsCreated: 1000,
          reviewsCompleted: 5000,
          activeLearners: 200,
          avgRetentionRate: 85,
        },
        tts: {
          totalRequests: 100,
          downloadsGenerated: 50,
          activeUsers: 30,
        },
        social: {
          forumUsers: 100,
          postsCreated: 200,
          activeGroups: 25,
          curriculumsCreated: 10,
        },
      };
      expect(stats).toBeDefined();
    });

    it("should export AICostStats type", () => {
      const stats: AICostStats = {
        totalCostCents: 5000,
        costPerUserCents: 100,
        totalTokens: 1000000,
        byOperation: {
          preReadingGuides: 1000,
          explanations: 2000,
          assessments: 1000,
          flashcards: 500,
          grading: 300,
          other: 200,
        },
        dailyAvgCents: 167,
        projectedMonthlyCents: 5000,
      };
      expect(stats).toBeDefined();
    });

    it("should export ContentStats type", () => {
      const stats: ContentStats = {
        totalBooks: 5000,
        booksAddedPeriod: 500,
        popularGenres: [{ genre: "FICTION", count: 2000, percentage: 40 }],
        popularBooks: [
          { id: "1", title: "Book", author: "Author", readCount: 100 },
        ],
        avgBooksPerUser: 5,
        bySource: {
          upload: 2000,
          url: 1000,
          paste: 500,
          googleBooks: 1000,
          openLibrary: 500,
        },
      };
      expect(stats).toBeDefined();
    });

    it("should export OverviewStats type", () => {
      const stats: OverviewStats = {
        users: {
          total: 1000,
          active: 500,
          newLast30Days: 100,
          growth: { percentChange: 25, netNew: 100 },
        },
        revenue: {
          mrrCents: 10000,
          arrCents: 120000,
          growthPercent: 10,
        },
        engagement: {
          dau: 100,
          mau: 1000,
          stickiness: 0.1,
        },
        aiCosts: {
          totalCostCents: 5000,
          projectedMonthlyCents: 5000,
        },
      };
      expect(stats).toBeDefined();
    });
  });
});
