/**
 * Tests for daily analytics cron job
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import {
  calculateDailyMetrics,
  storeDailyMetrics,
  type DailyMetrics,
} from "./daily-analytics.js";
import { prisma } from "@read-master/database";

// Mock Prisma
vi.mock("@read-master/database", () => ({
  prisma: {
    user: {
      count: vi.fn(),
    },
    book: {
      count: vi.fn(),
    },
    assessment: {
      count: vi.fn(),
    },
    flashcard: {
      count: vi.fn(),
    },
    flashcardReview: {
      count: vi.fn(),
    },
    annotation: {
      count: vi.fn(),
    },
    forumPost: {
      count: vi.fn(),
    },
    forumReply: {
      count: vi.fn(),
    },
    readingGroup: {
      count: vi.fn(),
    },
    curriculum: {
      count: vi.fn(),
    },
    readingProgress: {
      aggregate: vi.fn(),
    },
    aIUsageLog: {
      findMany: vi.fn(),
    },
    dailyAnalytics: {
      upsert: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Daily Analytics Cron Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test_secret";
  });

  describe("calculateDailyMetrics", () => {
    it("should calculate all metrics for a given date", async () => {
      // Mock all Prisma queries
      vi.mocked(prisma.user.count).mockResolvedValue(100);
      vi.mocked(prisma.book.count).mockResolvedValue(50);
      vi.mocked(prisma.assessment.count).mockResolvedValue(20);
      vi.mocked(prisma.flashcard.count).mockResolvedValue(150);
      vi.mocked(prisma.flashcardReview.count).mockResolvedValue(300);
      vi.mocked(prisma.annotation.count).mockResolvedValue(80);
      vi.mocked(prisma.forumPost.count).mockResolvedValue(10);
      vi.mocked(prisma.forumReply.count).mockResolvedValue(25);
      vi.mocked(prisma.readingGroup.count).mockResolvedValue(5);
      vi.mocked(prisma.curriculum.count).mockResolvedValue(8);

      vi.mocked(prisma.readingProgress.aggregate).mockResolvedValue({
        _sum: { totalReadTime: 72000 }, // 1200 minutes in seconds
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      vi.mocked(prisma.aIUsageLog.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          operation: "pre_reading_guide",
          totalTokens: 1000,
          cost: new Decimal(0.1),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 500,
          completionTokens: 500,
          durationMs: 1000,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
        {
          id: "2",
          userId: "user2",
          operation: "explain",
          totalTokens: 500,
          cost: new Decimal(0.05),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 250,
          completionTokens: 250,
          durationMs: 800,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
      ]);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const metrics = await calculateDailyMetrics(yesterday);

      expect(metrics).toBeDefined();
      expect(metrics.date).toEqual(yesterday);
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.activeUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.newUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.booksAdded).toBeGreaterThanOrEqual(0);
      expect(metrics.totalReadingTimeMin).toBeGreaterThanOrEqual(0);
      expect(metrics.aiRequestsCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle zero metrics gracefully", async () => {
      // Mock all counts as zero
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.book.count).mockResolvedValue(0);
      vi.mocked(prisma.assessment.count).mockResolvedValue(0);
      vi.mocked(prisma.flashcard.count).mockResolvedValue(0);
      vi.mocked(prisma.flashcardReview.count).mockResolvedValue(0);
      vi.mocked(prisma.annotation.count).mockResolvedValue(0);
      vi.mocked(prisma.forumPost.count).mockResolvedValue(0);
      vi.mocked(prisma.forumReply.count).mockResolvedValue(0);
      vi.mocked(prisma.readingGroup.count).mockResolvedValue(0);
      vi.mocked(prisma.curriculum.count).mockResolvedValue(0);

      vi.mocked(prisma.readingProgress.aggregate).mockResolvedValue({
        _sum: { totalReadTime: 0 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      vi.mocked(prisma.aIUsageLog.findMany).mockResolvedValue([]);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const metrics = await calculateDailyMetrics(yesterday);

      expect(metrics.totalUsers).toBe(0);
      expect(metrics.activeUsers).toBe(0);
      expect(metrics.newUsers).toBe(0);
      expect(metrics.aiRequestsCount).toBe(0);
      expect(metrics.aiTokensUsed).toBe(0);
      expect(metrics.aiCostCents).toBe(0);
    });

    it("should correctly aggregate AI usage by feature", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.book.count).mockResolvedValue(0);
      vi.mocked(prisma.assessment.count).mockResolvedValue(0);
      vi.mocked(prisma.flashcard.count).mockResolvedValue(0);
      vi.mocked(prisma.flashcardReview.count).mockResolvedValue(0);
      vi.mocked(prisma.annotation.count).mockResolvedValue(0);
      vi.mocked(prisma.forumPost.count).mockResolvedValue(0);
      vi.mocked(prisma.forumReply.count).mockResolvedValue(0);
      vi.mocked(prisma.readingGroup.count).mockResolvedValue(0);
      vi.mocked(prisma.curriculum.count).mockResolvedValue(0);

      vi.mocked(prisma.readingProgress.aggregate).mockResolvedValue({
        _sum: { totalReadTime: 0 },
        _avg: {},
        _count: {},
        _max: {},
        _min: {},
      });

      vi.mocked(prisma.aIUsageLog.findMany).mockResolvedValue([
        {
          id: "1",
          userId: "user1",
          operation: "pre_reading_guide",
          totalTokens: 1000,
          cost: new Decimal(0.1),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 500,
          completionTokens: 500,
          durationMs: 1000,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
        {
          id: "2",
          userId: "user2",
          operation: "pre_reading_guide",
          totalTokens: 1200,
          cost: new Decimal(0.12),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 600,
          completionTokens: 600,
          durationMs: 1100,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
        {
          id: "3",
          userId: "user3",
          operation: "explain",
          totalTokens: 500,
          cost: new Decimal(0.05),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 250,
          completionTokens: 250,
          durationMs: 800,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
        {
          id: "4",
          userId: "user4",
          operation: "assessment",
          totalTokens: 800,
          cost: new Decimal(0.08),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 400,
          completionTokens: 400,
          durationMs: 1200,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
        {
          id: "5",
          userId: "user5",
          operation: "flashcards",
          totalTokens: 600,
          cost: new Decimal(0.06),
          model: "claude-3-5-sonnet",
          provider: "anthropic",
          promptTokens: 300,
          completionTokens: 300,
          durationMs: 900,
          success: true,
          createdAt: new Date(),
          bookId: null,
          requestId: null,
          errorMessage: null,
          errorCode: null,
          metadata: null,
        },
      ]);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const metrics = await calculateDailyMetrics(yesterday);

      expect(metrics.aiRequestsCount).toBe(5);
      expect(metrics.aiTokensUsed).toBe(4100);
      expect(metrics.aiCostCents).toBe(41);
      expect(metrics.preReadingGuidesGen).toBe(2);
      expect(metrics.explanationsGen).toBe(1);
      expect(metrics.assessmentsGen).toBe(1);
      expect(metrics.flashcardsGen).toBe(1);
    });
  });

  describe("storeDailyMetrics", () => {
    it("should store metrics in database", async () => {
      const mockMetrics: DailyMetrics = {
        date: new Date("2026-01-19"),
        totalUsers: 100,
        activeUsers: 50,
        newUsers: 10,
        churned: 2,
        freeUsers: 70,
        proUsers: 25,
        scholarUsers: 5,
        totalRevenueCents: 5000,
        newSubscriptionsCents: 2000,
        renewalsCents: 2500,
        upgradesCents: 500,
        refundsCents: 0,
        booksAdded: 20,
        booksCompleted: 15,
        totalReadingTimeMin: 1200,
        assessmentsTaken: 30,
        flashcardsCreated: 100,
        flashcardsReviewed: 250,
        annotationsCreated: 80,
        forumPostsCreated: 10,
        forumRepliesCreated: 25,
        groupsCreated: 2,
        curriculumsCreated: 3,
        aiRequestsCount: 50,
        aiTokensUsed: 25000,
        aiCostCents: 250,
        preReadingGuidesGen: 10,
        explanationsGen: 20,
        assessmentsGen: 15,
        flashcardsGen: 5,
        avgApiResponseMs: 150,
        errorCount: 5,
      };

      vi.mocked(prisma.dailyAnalytics.upsert).mockResolvedValue({
        id: "test-id",
        ...mockMetrics,
        avgPageLoadMs: null,
        p99ResponseMs: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await storeDailyMetrics(mockMetrics);

      expect(prisma.dailyAnalytics.upsert).toHaveBeenCalledWith({
        where: { date: mockMetrics.date },
        create: mockMetrics,
        update: mockMetrics,
      });
    });
  });

  describe("Endpoint Handler", () => {
    it("should export a default handler function", async () => {
      const module = await import("./daily-analytics.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });
  });
});
