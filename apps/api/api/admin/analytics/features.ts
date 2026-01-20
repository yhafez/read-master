/**
 * Admin Feature Usage Analytics Endpoint
 *
 * GET /api/admin/analytics/features
 *
 * Returns feature adoption and usage metrics.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

export type FeaturesAnalytics = {
  // Reading features
  readingFeatures: {
    totalBooks: number;
    readingProgressTracked: number;
    annotationsCreated: number;
    ttsUsage: number; // TODO: Track TTS usage
  };

  // Learning features
  learningFeatures: {
    flashcardsCreated: number;
    flashcardsReviewed: number;
    assessmentsTaken: number;
    preReadingGuidesGenerated: number;
  };

  // Social features
  socialFeatures: {
    groupsCreated: number;
    forumPostsCreated: number;
    forumRepliesCreated: number;
    curriculumsCreated: number;
    curriculumsFollowed: number;
  };

  // AI features
  aiFeatures: {
    totalAIRequests: number;
    aiEnabledUsers: number;
    aiDisabledUsers: number;
    explanationsGenerated: number;
    assessmentsGenerated: number;
  };

  // Feature adoption rates (%)
  adoptionRates: {
    annotationsAdoption: number; // % of users who created annotations
    flashcardsAdoption: number;
    assessmentsAdoption: number;
    curriculumsAdoption: number;
    groupsAdoption: number;
    forumAdoption: number;
    aiAdoption: number;
  };
};

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only GET requests allowed",
      },
    });
    return;
  }

  try {
    // Get total users for adoption rate calculations
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });

    // Get reading features usage
    const [
      totalBooks,
      readingProgressCount,
      annotationsCount,
      annotationsUsers,
    ] = await Promise.all([
      prisma.book.count({ where: { deletedAt: null } }),
      prisma.readingProgress.count(),
      prisma.annotation.count({ where: { deletedAt: null } }),
      prisma.annotation.groupBy({
        by: ["userId"],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    // Get learning features usage
    const [
      flashcardsCount,
      flashcardsReviewedCount,
      assessmentsCount,
      preReadingGuidesCount,
      flashcardsUsers,
      assessmentsUsers,
    ] = await Promise.all([
      prisma.flashcard.count({ where: { deletedAt: null } }),
      prisma.flashcardReview.count(),
      prisma.assessment.count(),
      prisma.preReadingGuide.count(),
      prisma.flashcard.groupBy({
        by: ["userId"],
        where: { deletedAt: null },
        _count: true,
      }),
      prisma.assessment.groupBy({
        by: ["userId"],
        _count: true,
      }),
    ]);

    // Get social features usage
    const [
      groupsCount,
      forumPostsCount,
      forumRepliesCount,
      curriculumsCount,
      curriculumsFollowedCount,
    ] = await Promise.all([
      prisma.readingGroup.count({ where: { deletedAt: null } }),
      prisma.forumPost.count({ where: { deletedAt: null } }),
      prisma.forumReply.count({ where: { deletedAt: null } }),
      prisma.curriculum.count({ where: { deletedAt: null } }),
      prisma.curriculumFollow.count(),
    ]);

    // Simplified: Count users who created at least one item (approximation)
    const [curriculumsUsers, groupsUsers, forumUsers] = [
      Math.min(curriculumsCount, totalUsers),
      Math.min(groupsCount, totalUsers),
      Math.min(forumPostsCount, totalUsers),
    ];

    // Get AI features usage
    const [
      aiRequestsCount,
      aiEnabledUsers,
      aiDisabledUsers,
      explanationsCount,
      aiAssessmentsCount,
    ] = await Promise.all([
      prisma.dailyAnalytics.aggregate({
        _sum: { aiRequestsCount: true },
      }),
      prisma.user.count({
        where: { deletedAt: null, aiEnabled: true },
      }),
      prisma.user.count({
        where: { deletedAt: null, aiEnabled: false },
      }),
      prisma.dailyAnalytics.aggregate({
        _sum: { explanationsGen: true },
      }),
      prisma.dailyAnalytics.aggregate({
        _sum: { assessmentsGen: true },
      }),
    ]);

    // Calculate adoption rates
    const adoptionRates = {
      annotationsAdoption:
        totalUsers > 0
          ? Math.round((annotationsUsers.length / totalUsers) * 100)
          : 0,
      flashcardsAdoption:
        totalUsers > 0
          ? Math.round((flashcardsUsers.length / totalUsers) * 100)
          : 0,
      assessmentsAdoption:
        totalUsers > 0
          ? Math.round((assessmentsUsers.length / totalUsers) * 100)
          : 0,
      curriculumsAdoption:
        totalUsers > 0 ? Math.round((curriculumsUsers / totalUsers) * 100) : 0,
      groupsAdoption:
        totalUsers > 0 ? Math.round((groupsUsers / totalUsers) * 100) : 0,
      forumAdoption:
        totalUsers > 0 ? Math.round((forumUsers / totalUsers) * 100) : 0,
      aiAdoption:
        totalUsers > 0 ? Math.round((aiEnabledUsers / totalUsers) * 100) : 0,
    };

    const analytics: FeaturesAnalytics = {
      // Reading features
      readingFeatures: {
        totalBooks,
        readingProgressTracked: readingProgressCount,
        annotationsCreated: annotationsCount,
        ttsUsage: 0, // TODO: Implement TTS usage tracking
      },

      // Learning features
      learningFeatures: {
        flashcardsCreated: flashcardsCount,
        flashcardsReviewed: flashcardsReviewedCount,
        assessmentsTaken: assessmentsCount,
        preReadingGuidesGenerated: preReadingGuidesCount,
      },

      // Social features
      socialFeatures: {
        groupsCreated: groupsCount,
        forumPostsCreated: forumPostsCount,
        forumRepliesCreated: forumRepliesCount,
        curriculumsCreated: curriculumsCount,
        curriculumsFollowed: curriculumsFollowedCount,
      },

      // AI features
      aiFeatures: {
        totalAIRequests: aiRequestsCount._sum.aiRequestsCount ?? 0,
        aiEnabledUsers,
        aiDisabledUsers,
        explanationsGenerated: explanationsCount._sum.explanationsGen ?? 0,
        assessmentsGenerated: aiAssessmentsCount._sum.assessmentsGen ?? 0,
      },

      // Adoption rates
      adoptionRates,
    };

    logger.info("Admin features analytics fetched", {
      totalBooks,
      totalUsers,
      adoptionRates,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch features analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch features analytics",
      },
    });
  }
}

export default requireAdmin(handler);
