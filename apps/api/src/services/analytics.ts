/**
 * Analytics Service for Read Master Admin Dashboard
 *
 * Provides comprehensive analytics and metrics calculation for the admin dashboard.
 * All functions implement caching for performance with configurable TTLs.
 *
 * @example
 * ```typescript
 * import { analytics, getUserStats, getRevenueStats } from './services/analytics';
 *
 * // Get user statistics
 * const userStats = await getUserStats();
 *
 * // Get revenue breakdown
 * const revenue = await getRevenueStats({ days: 30 });
 *
 * // Get engagement metrics
 * const engagement = await getEngagementStats();
 * ```
 */

import { db } from "./db.js";
import { getOrSet, buildKey, CacheTTL, CacheKeyPrefix } from "./redis.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * User statistics breakdown
 */
export type UserStats = {
  /** Total registered users */
  total: number;
  /** Active users (logged in within last 30 days) */
  active: number;
  /** New users in last 30 days */
  newLast30Days: number;
  /** Users by tier */
  byTier: {
    free: number;
    pro: number;
    scholar: number;
  };
  /** Growth metrics */
  growth: {
    /** User growth percentage compared to previous period */
    percentChange: number;
    /** Net new users */
    netNew: number;
  };
};

/**
 * Revenue statistics
 */
export type RevenueStats = {
  /** Monthly Recurring Revenue (in cents) */
  mrrCents: number;
  /** Annual Recurring Revenue (in cents) */
  arrCents: number;
  /** Revenue by tier (in cents) */
  byTier: {
    pro: number;
    scholar: number;
  };
  /** Total revenue in period (in cents) */
  totalPeriodCents: number;
  /** Revenue growth percentage */
  growthPercent: number;
  /** Average revenue per user (in cents) */
  arpuCents: number;
};

/**
 * Engagement statistics
 */
export type EngagementStats = {
  /** Daily Active Users */
  dau: number;
  /** Weekly Active Users */
  wau: number;
  /** Monthly Active Users */
  mau: number;
  /** DAU/MAU ratio (stickiness) */
  stickiness: number;
  /** Average session duration in minutes */
  avgSessionMinutes: number;
  /** Total reading time in hours for the period */
  totalReadingHours: number;
  /** Books completed in period */
  booksCompleted: number;
  /** Assessments taken in period */
  assessmentsTaken: number;
};

/**
 * Feature usage statistics
 */
export type FeatureUsageStats = {
  /** AI features */
  ai: {
    /** Total AI requests */
    totalRequests: number;
    /** Users who used AI features */
    uniqueUsers: number;
    /** Requests by type */
    byType: {
      preReadingGuides: number;
      explanations: number;
      assessments: number;
      flashcards: number;
    };
  };
  /** SRS flashcard features */
  srs: {
    /** Total flashcards created */
    cardsCreated: number;
    /** Total reviews completed */
    reviewsCompleted: number;
    /** Active learners (reviewed in last 7 days) */
    activeLearners: number;
    /** Average retention rate */
    avgRetentionRate: number;
  };
  /** TTS features */
  tts: {
    /** Total TTS requests */
    totalRequests: number;
    /** Downloads generated */
    downloadsGenerated: number;
    /** Active TTS users */
    activeUsers: number;
  };
  /** Social features */
  social: {
    /** Active forum users */
    forumUsers: number;
    /** Forum posts created */
    postsCreated: number;
    /** Reading groups active */
    activeGroups: number;
    /** Curriculums created */
    curriculumsCreated: number;
  };
};

/**
 * AI cost statistics
 */
export type AICostStats = {
  /** Total cost in cents for period */
  totalCostCents: number;
  /** Cost per user in cents */
  costPerUserCents: number;
  /** Total tokens used */
  totalTokens: number;
  /** Cost breakdown by operation */
  byOperation: {
    preReadingGuides: number;
    explanations: number;
    assessments: number;
    flashcards: number;
    grading: number;
    other: number;
  };
  /** Daily average cost in cents */
  dailyAvgCents: number;
  /** Projected monthly cost in cents */
  projectedMonthlyCents: number;
};

/**
 * Content statistics
 */
export type ContentStats = {
  /** Total books in system */
  totalBooks: number;
  /** Books added in period */
  booksAddedPeriod: number;
  /** Popular genres */
  popularGenres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  /** Popular books by reads */
  popularBooks: Array<{
    id: string;
    title: string;
    author: string | null;
    readCount: number;
  }>;
  /** Average books per user */
  avgBooksPerUser: number;
  /** Content by source */
  bySource: {
    upload: number;
    url: number;
    paste: number;
    googleBooks: number;
    openLibrary: number;
  };
};

/**
 * Options for stats retrieval
 */
export type StatsOptions = {
  /** Number of days for the period (default: 30) */
  days?: number;
  /** Skip cache and fetch fresh data */
  skipCache?: boolean;
};

/**
 * Overview dashboard stats combining key metrics
 */
export type OverviewStats = {
  users: Pick<UserStats, "total" | "active" | "newLast30Days" | "growth">;
  revenue: Pick<RevenueStats, "mrrCents" | "arrCents" | "growthPercent">;
  engagement: Pick<EngagementStats, "dau" | "mau" | "stickiness">;
  aiCosts: Pick<AICostStats, "totalCostCents" | "projectedMonthlyCents">;
};

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Cache key prefix for analytics
 */
const ANALYTICS_CACHE_PREFIX = CacheKeyPrefix.ANALYTICS;

/**
 * Build an analytics cache key
 */
function analyticsKey(metric: string, options?: StatsOptions): string {
  const days = options?.days ?? 30;
  return buildKey(ANALYTICS_CACHE_PREFIX, metric, `d${days}`);
}

/**
 * Default cache TTL for analytics (5 minutes for fresh data)
 */
const ANALYTICS_CACHE_TTL = CacheTTL.SHORT;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date N days ago from now
 */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get start of today (UTC)
 */
function startOfToday(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Get start of week (UTC, Monday)
 */
function startOfWeek(): Date {
  const date = new Date();
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Adjust for Monday start
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Calculate percentage change between two values
 */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// ============================================================================
// User Statistics
// ============================================================================

/**
 * Get user statistics including totals, activity, and growth metrics
 *
 * @param options - Stats options
 * @returns User statistics
 *
 * @example
 * ```typescript
 * const stats = await getUserStats();
 * // Access: stats.total, stats.active, stats.byTier
 * ```
 */
export async function getUserStats(
  options: StatsOptions = {}
): Promise<UserStats> {
  const { days = 30, skipCache = false } = options;
  const cacheKey = analyticsKey("users", options);

  const fetcher = async (): Promise<UserStats> => {
    const periodStart = daysAgo(days);
    const previousPeriodStart = daysAgo(days * 2);

    // Get total users (excluding soft-deleted)
    const total = await db.user.count({
      where: { deletedAt: null },
    });

    // Get active users (have reading progress or any activity in period)
    const active = await db.user.count({
      where: {
        deletedAt: null,
        OR: [
          {
            readingProgress: {
              some: {
                lastReadAt: { gte: periodStart },
              },
            },
          },
          {
            flashcards: {
              some: {
                reviews: {
                  some: {
                    reviewedAt: { gte: periodStart },
                  },
                },
              },
            },
          },
        ],
      },
    });

    // Get new users in period
    const newLast30Days = await db.user.count({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart },
      },
    });

    // Get users by tier
    const tierCounts = await db.user.groupBy({
      by: ["tier"],
      where: { deletedAt: null },
      _count: true,
    });

    const byTier = {
      free: 0,
      pro: 0,
      scholar: 0,
    };

    for (const tc of tierCounts) {
      const tierKey = tc.tier.toLowerCase() as keyof typeof byTier;
      if (tierKey in byTier) {
        byTier[tierKey] = tc._count;
      }
    }

    // Calculate growth (new users this period vs previous period)
    const previousPeriodNewUsers = await db.user.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: previousPeriodStart,
          lt: periodStart,
        },
      },
    });

    const growth = {
      percentChange: percentChange(newLast30Days, previousPeriodNewUsers),
      netNew: newLast30Days,
    };

    return {
      total,
      active,
      newLast30Days,
      byTier,
      growth,
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Revenue Statistics
// ============================================================================

/**
 * Get revenue statistics including MRR, ARR, and breakdowns
 *
 * Note: This implementation uses DailyAnalytics for historical data.
 * In a real implementation, this would integrate with Stripe for accurate billing data.
 *
 * @param options - Stats options
 * @returns Revenue statistics
 */
export async function getRevenueStats(
  options: StatsOptions = {}
): Promise<RevenueStats> {
  const { days = 30, skipCache = false } = options;
  const cacheKey = analyticsKey("revenue", options);

  const fetcher = async (): Promise<RevenueStats> => {
    const periodStart = daysAgo(days);
    const previousPeriodStart = daysAgo(days * 2);

    // Get revenue from DailyAnalytics for the period
    const periodAnalytics = await db.dailyAnalytics.aggregate({
      where: {
        date: { gte: periodStart },
      },
      _sum: {
        totalRevenueCents: true,
        newSubscriptionsCents: true,
        renewalsCents: true,
        upgradesCents: true,
        refundsCents: true,
      },
    });

    const previousAnalytics = await db.dailyAnalytics.aggregate({
      where: {
        date: {
          gte: previousPeriodStart,
          lt: periodStart,
        },
      },
      _sum: {
        totalRevenueCents: true,
      },
    });

    // Calculate current revenue
    const totalPeriodCents = periodAnalytics._sum.totalRevenueCents ?? 0;
    const previousPeriodCents = previousAnalytics._sum.totalRevenueCents ?? 0;

    // Count paying users by tier for MRR estimation
    const proUsers = await db.user.count({
      where: {
        deletedAt: null,
        tier: "PRO",
        tierExpiresAt: { gte: new Date() },
      },
    });

    const scholarUsers = await db.user.count({
      where: {
        deletedAt: null,
        tier: "SCHOLAR",
        tierExpiresAt: { gte: new Date() },
      },
    });

    // Tier prices in cents (from SPECIFICATIONS.md)
    const PRO_MONTHLY_CENTS = 999; // $9.99
    const SCHOLAR_MONTHLY_CENTS = 1999; // $19.99

    const mrrCents =
      proUsers * PRO_MONTHLY_CENTS + scholarUsers * SCHOLAR_MONTHLY_CENTS;
    const arrCents = mrrCents * 12;

    // Calculate ARPU
    const totalUsers = await db.user.count({ where: { deletedAt: null } });
    const arpuCents = totalUsers > 0 ? Math.round(mrrCents / totalUsers) : 0;

    return {
      mrrCents,
      arrCents,
      byTier: {
        pro: proUsers * PRO_MONTHLY_CENTS,
        scholar: scholarUsers * SCHOLAR_MONTHLY_CENTS,
      },
      totalPeriodCents,
      growthPercent: percentChange(totalPeriodCents, previousPeriodCents),
      arpuCents,
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Engagement Statistics
// ============================================================================

/**
 * Get engagement statistics including DAU, WAU, MAU, and activity metrics
 *
 * @param options - Stats options
 * @returns Engagement statistics
 */
export async function getEngagementStats(
  options: StatsOptions = {}
): Promise<EngagementStats> {
  const { days = 30, skipCache = false } = options;
  const cacheKey = analyticsKey("engagement", options);

  const fetcher = async (): Promise<EngagementStats> => {
    const today = startOfToday();
    const weekStart = startOfWeek();
    const monthStart = daysAgo(30);
    const periodStart = daysAgo(days);

    // Daily Active Users (users with reading activity today)
    const dau = await db.user.count({
      where: {
        deletedAt: null,
        readingProgress: {
          some: {
            lastReadAt: { gte: today },
          },
        },
      },
    });

    // Weekly Active Users
    const wau = await db.user.count({
      where: {
        deletedAt: null,
        readingProgress: {
          some: {
            lastReadAt: { gte: weekStart },
          },
        },
      },
    });

    // Monthly Active Users
    const mau = await db.user.count({
      where: {
        deletedAt: null,
        readingProgress: {
          some: {
            lastReadAt: { gte: monthStart },
          },
        },
      },
    });

    // Calculate stickiness (DAU/MAU ratio)
    const stickiness = mau > 0 ? Math.round((dau / mau) * 100) / 100 : 0;

    // Get aggregated reading time from DailyAnalytics
    const readingTimeAgg = await db.dailyAnalytics.aggregate({
      where: {
        date: { gte: periodStart },
      },
      _sum: {
        totalReadingTimeMin: true,
      },
    });

    const totalReadingMinutes = readingTimeAgg._sum.totalReadingTimeMin ?? 0;
    const totalReadingHours = Math.round((totalReadingMinutes / 60) * 10) / 10;

    // Average session duration (estimate from reading time / active users)
    const avgSessionMinutes =
      mau > 0 ? Math.round(totalReadingMinutes / mau / days) : 0;

    // Books completed in period
    const booksCompleted = await db.book.count({
      where: {
        deletedAt: null,
        status: "COMPLETED",
        readingProgress: {
          some: {
            completedAt: { gte: periodStart },
          },
        },
      },
    });

    // Assessments taken in period
    const assessmentsTaken = await db.assessment.count({
      where: {
        completedAt: { gte: periodStart },
      },
    });

    return {
      dau,
      wau,
      mau,
      stickiness,
      avgSessionMinutes,
      totalReadingHours,
      booksCompleted,
      assessmentsTaken,
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Feature Usage Statistics
// ============================================================================

/**
 * Get feature usage statistics for AI, SRS, TTS, and social features
 *
 * @param options - Stats options
 * @returns Feature usage statistics
 */
export async function getFeatureUsageStats(
  options: StatsOptions = {}
): Promise<FeatureUsageStats> {
  const { days = 30, skipCache = false } = options;
  const cacheKey = analyticsKey("features", options);

  const fetcher = async (): Promise<FeatureUsageStats> => {
    const periodStart = daysAgo(days);
    const weekStart = daysAgo(7);

    // AI feature usage from AIUsageLog
    const aiStats = await db.aIUsageLog.groupBy({
      by: ["operation"],
      where: {
        createdAt: { gte: periodStart },
        success: true,
      },
      _count: true,
    });

    const aiUniqueUsers = await db.aIUsageLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: periodStart },
        success: true,
        userId: { not: null },
      },
    });

    const aiByType = {
      preReadingGuides: 0,
      explanations: 0,
      assessments: 0,
      flashcards: 0,
    };

    let totalAIRequests = 0;
    for (const stat of aiStats) {
      totalAIRequests += stat._count;
      if (stat.operation === "pre_reading_guide") {
        aiByType.preReadingGuides = stat._count;
      } else if (stat.operation === "explain") {
        aiByType.explanations = stat._count;
      } else if (stat.operation === "assessment") {
        aiByType.assessments = stat._count;
      } else if (stat.operation === "flashcards") {
        aiByType.flashcards = stat._count;
      }
    }

    // SRS flashcard statistics
    const cardsCreated = await db.flashcard.count({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart },
      },
    });

    const reviewsCompleted = await db.flashcardReview.count({
      where: {
        reviewedAt: { gte: periodStart },
      },
    });

    // Active learners (reviewed flashcards in last 7 days)
    const activeLearners = await db.user.count({
      where: {
        deletedAt: null,
        flashcards: {
          some: {
            reviews: {
              some: {
                reviewedAt: { gte: weekStart },
              },
            },
          },
        },
      },
    });

    // Average retention rate (approximation based on review ratings)
    const reviewRatings = await db.flashcardReview.aggregate({
      where: {
        reviewedAt: { gte: periodStart },
      },
      _avg: {
        rating: true,
      },
    });

    // Rating 3+ is considered "remembered"
    const avgRetentionRate = reviewRatings._avg.rating
      ? Math.round((reviewRatings._avg.rating / 4) * 100)
      : 0;

    // TTS statistics (from DailyAnalytics as we don't have a dedicated TTS log yet)
    // For now, we'll use AI usage as a proxy for TTS requests
    const ttsStats = {
      totalRequests: 0, // Would come from TTS usage tracking
      downloadsGenerated: 0,
      activeUsers: 0,
    };

    // Social feature statistics
    const forumUsers = await db.user.count({
      where: {
        deletedAt: null,
        OR: [
          {
            forumPosts: {
              some: {
                createdAt: { gte: periodStart },
              },
            },
          },
          {
            forumReplies: {
              some: {
                createdAt: { gte: periodStart },
              },
            },
          },
        ],
      },
    });

    const postsCreated = await db.forumPost.count({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart },
      },
    });

    const activeGroups = await db.readingGroup.count({
      where: {
        deletedAt: null,
        OR: [
          { createdAt: { gte: periodStart } },
          {
            discussions: {
              some: {
                createdAt: { gte: periodStart },
              },
            },
          },
        ],
      },
    });

    const curriculumsCreated = await db.curriculum.count({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart },
      },
    });

    return {
      ai: {
        totalRequests: totalAIRequests,
        uniqueUsers: aiUniqueUsers.length,
        byType: aiByType,
      },
      srs: {
        cardsCreated,
        reviewsCompleted,
        activeLearners,
        avgRetentionRate,
      },
      tts: ttsStats,
      social: {
        forumUsers,
        postsCreated,
        activeGroups,
        curriculumsCreated,
      },
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// AI Cost Statistics
// ============================================================================

/**
 * Get AI cost statistics including total costs, per-user costs, and projections
 *
 * @param options - Stats options
 * @returns AI cost statistics
 */
export async function getAICostStats(
  options: StatsOptions = {}
): Promise<AICostStats> {
  const { days = 30, skipCache = false } = options;
  const cacheKey = analyticsKey("ai-costs", options);

  const fetcher = async (): Promise<AICostStats> => {
    const periodStart = daysAgo(days);

    // Get total AI usage and costs
    const costAgg = await db.aIUsageLog.aggregate({
      where: {
        createdAt: { gte: periodStart },
        success: true,
      },
      _sum: {
        totalTokens: true,
        cost: true,
      },
      _count: true,
    });

    // Convert cost from Decimal to cents (cost is stored in USD)
    const totalCostUSD = costAgg._sum.cost
      ? parseFloat(costAgg._sum.cost.toString())
      : 0;
    const totalCostCents = Math.round(totalCostUSD * 100);
    const totalTokens = costAgg._sum.totalTokens ?? 0;

    // Get unique AI users for cost per user calculation
    const uniqueAIUsers = await db.aIUsageLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: periodStart },
        success: true,
        userId: { not: null },
      },
    });

    const costPerUserCents =
      uniqueAIUsers.length > 0
        ? Math.round(totalCostCents / uniqueAIUsers.length)
        : 0;

    // Cost by operation
    const costByOp = await db.aIUsageLog.groupBy({
      by: ["operation"],
      where: {
        createdAt: { gte: periodStart },
        success: true,
      },
      _sum: {
        cost: true,
      },
    });

    const byOperation = {
      preReadingGuides: 0,
      explanations: 0,
      assessments: 0,
      flashcards: 0,
      grading: 0,
      other: 0,
    };

    for (const op of costByOp) {
      const costCents = op._sum.cost
        ? Math.round(parseFloat(op._sum.cost.toString()) * 100)
        : 0;

      switch (op.operation) {
        case "pre_reading_guide":
          byOperation.preReadingGuides = costCents;
          break;
        case "explain":
          byOperation.explanations = costCents;
          break;
        case "assessment":
          byOperation.assessments = costCents;
          break;
        case "flashcards":
          byOperation.flashcards = costCents;
          break;
        case "grade_answer":
          byOperation.grading = costCents;
          break;
        default:
          byOperation.other += costCents;
      }
    }

    // Calculate daily average and projected monthly cost
    const dailyAvgCents = days > 0 ? Math.round(totalCostCents / days) : 0;
    const projectedMonthlyCents = dailyAvgCents * 30;

    return {
      totalCostCents,
      costPerUserCents,
      totalTokens,
      byOperation,
      dailyAvgCents,
      projectedMonthlyCents,
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Content Statistics
// ============================================================================

/**
 * Get content statistics including book counts, genres, and popularity
 *
 * @param options - Stats options
 * @returns Content statistics
 */
export async function getContentStats(
  options: StatsOptions = {}
): Promise<ContentStats> {
  const { days = 30, skipCache = false } = options;
  const cacheKey = analyticsKey("content", options);

  const fetcher = async (): Promise<ContentStats> => {
    const periodStart = daysAgo(days);

    // Total books in system
    const totalBooks = await db.book.count({
      where: { deletedAt: null },
    });

    // Books added in period
    const booksAddedPeriod = await db.book.count({
      where: {
        deletedAt: null,
        createdAt: { gte: periodStart },
      },
    });

    // Popular genres
    const genreCounts = await db.book.groupBy({
      by: ["genre"],
      where: {
        deletedAt: null,
        genre: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          genre: "desc",
        },
      },
      take: 10,
    });

    const popularGenres = genreCounts.map((g) => ({
      genre: g.genre ?? "Unknown",
      count: g._count,
      percentage:
        totalBooks > 0
          ? Math.round((g._count / totalBooks) * 100 * 10) / 10
          : 0,
    }));

    // Popular books by read count (based on reading progress records)
    const popularBooksData = await db.book.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        author: true,
        _count: {
          select: {
            readingProgress: true,
          },
        },
      },
      orderBy: {
        readingProgress: {
          _count: "desc",
        },
      },
      take: 10,
    });

    const popularBooks = popularBooksData.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      readCount: book._count.readingProgress,
    }));

    // Average books per user
    const totalUsers = await db.user.count({ where: { deletedAt: null } });
    const avgBooksPerUser =
      totalUsers > 0 ? Math.round((totalBooks / totalUsers) * 10) / 10 : 0;

    // Books by source
    const sourceCounts = await db.book.groupBy({
      by: ["source"],
      where: { deletedAt: null },
      _count: true,
    });

    const bySource = {
      upload: 0,
      url: 0,
      paste: 0,
      googleBooks: 0,
      openLibrary: 0,
    };

    for (const sc of sourceCounts) {
      switch (sc.source) {
        case "UPLOAD":
          bySource.upload = sc._count;
          break;
        case "URL":
          bySource.url = sc._count;
          break;
        case "PASTE":
          bySource.paste = sc._count;
          break;
        case "GOOGLE_BOOKS":
          bySource.googleBooks = sc._count;
          break;
        case "OPEN_LIBRARY":
          bySource.openLibrary = sc._count;
          break;
      }
    }

    return {
      totalBooks,
      booksAddedPeriod,
      popularGenres,
      popularBooks,
      avgBooksPerUser,
      bySource,
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Overview Statistics
// ============================================================================

/**
 * Get overview statistics combining key metrics from all categories
 * Optimized for dashboard display with minimal data transfer
 *
 * @param options - Stats options
 * @returns Overview statistics
 */
export async function getOverviewStats(
  options: StatsOptions = {}
): Promise<OverviewStats> {
  const { skipCache = false } = options;
  const cacheKey = analyticsKey("overview", options);

  const fetcher = async (): Promise<OverviewStats> => {
    // Fetch all stats in parallel for performance
    const [userStats, revenueStats, engagementStats, aiCostStats] =
      await Promise.all([
        getUserStats({ ...options, skipCache: true }),
        getRevenueStats({ ...options, skipCache: true }),
        getEngagementStats({ ...options, skipCache: true }),
        getAICostStats({ ...options, skipCache: true }),
      ]);

    return {
      users: {
        total: userStats.total,
        active: userStats.active,
        newLast30Days: userStats.newLast30Days,
        growth: userStats.growth,
      },
      revenue: {
        mrrCents: revenueStats.mrrCents,
        arrCents: revenueStats.arrCents,
        growthPercent: revenueStats.growthPercent,
      },
      engagement: {
        dau: engagementStats.dau,
        mau: engagementStats.mau,
        stickiness: engagementStats.stickiness,
      },
      aiCosts: {
        totalCostCents: aiCostStats.totalCostCents,
        projectedMonthlyCents: aiCostStats.projectedMonthlyCents,
      },
    };
  };

  if (skipCache) {
    return fetcher();
  }

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Time Series Data
// ============================================================================

/**
 * Get daily analytics for a date range (for charts)
 *
 * @param startDate - Start date for the range
 * @param endDate - End date for the range
 * @returns Array of DailyAnalytics records
 */
export async function getDailyAnalytics(
  startDate: Date,
  endDate: Date
): Promise<
  Array<{
    date: Date;
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalRevenueCents: number;
    aiCostCents: number;
    booksAdded: number;
    flashcardsReviewed: number;
  }>
> {
  const startDateStr = startDate.toISOString().split("T")[0] ?? "unknown";
  const endDateStr = endDate.toISOString().split("T")[0] ?? "unknown";
  const cacheKey = buildKey(
    ANALYTICS_CACHE_PREFIX,
    "daily",
    startDateStr,
    endDateStr
  );

  const fetcher = async () => {
    const analytics = await db.dailyAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        totalUsers: true,
        activeUsers: true,
        newUsers: true,
        totalRevenueCents: true,
        aiCostCents: true,
        booksAdded: true,
        flashcardsReviewed: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return analytics;
  };

  return getOrSet(cacheKey, fetcher, { ttl: ANALYTICS_CACHE_TTL });
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate all analytics caches
 * Call this after bulk data changes that affect analytics
 */
export async function invalidateAnalyticsCache(): Promise<void> {
  const { invalidatePattern } = await import("./redis.js");
  await invalidatePattern(`${ANALYTICS_CACHE_PREFIX}:*`);
  logger.info("Analytics cache invalidated");
}

// ============================================================================
// Exported Service Object
// ============================================================================

/**
 * Analytics service object with all functions
 */
export const analytics = {
  // Stats functions
  getUserStats,
  getRevenueStats,
  getEngagementStats,
  getFeatureUsageStats,
  getAICostStats,
  getContentStats,
  getOverviewStats,
  getDailyAnalytics,

  // Cache management
  invalidateCache: invalidateAnalyticsCache,

  // Constants
  CACHE_TTL: ANALYTICS_CACHE_TTL,
  CACHE_PREFIX: ANALYTICS_CACHE_PREFIX,
} as const;
