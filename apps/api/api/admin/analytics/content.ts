/**
 * Admin Content Analytics Endpoint
 *
 * GET /api/admin/analytics/content
 *
 * Returns content library and moderation metrics.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

export type ContentAnalytics = {
  // Books
  books: {
    total: number;
    byStatus: {
      WANT_TO_READ: number;
      READING: number;
      COMPLETED: number;
    };
    bySource: {
      UPLOAD: number;
      PASTE: number;
      URL_IMPORT: number;
      OPEN_LIBRARY: number;
      GUTENBERG: number;
    };
    averageWordCount: number;
    totalWordCount: number;
  };

  // Annotations
  annotations: {
    total: number;
    byType: {
      HIGHLIGHT: number;
      NOTE: number;
      QUESTION: number;
      BOOKMARK: number;
    };
    publicAnnotations: number;
    privateAnnotations: number;
  };

  // Flashcards
  flashcards: {
    total: number;
    byType: {
      BASIC: number;
      CLOZE: number;
      REVERSE: number;
    };
    byStatus: {
      NEW: number;
      LEARNING: number;
      REVIEW: number;
      RELEARNING: number;
      SUSPENDED: number;
      MASTERED: number;
    };
    totalReviews: number;
  };

  // Curriculums
  curriculums: {
    total: number;
    byVisibility: {
      PRIVATE: number;
      UNLISTED: number;
      PUBLIC: number;
    };
    totalFollows: number;
    averageItemsPerCurriculum: number;
  };

  // Forum content
  forum: {
    totalPosts: number;
    totalReplies: number;
    totalVotes: number;
    activeCategories: number;
  };

  // Reading groups
  groups: {
    total: number;
    totalMembers: number;
    totalDiscussions: number;
    averageMembersPerGroup: number;
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
    // Get books metrics
    const [totalBooks, booksByStatus, booksBySource, booksWordCount] =
      await Promise.all([
        prisma.book.count({ where: { deletedAt: null } }),
        prisma.book.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          _count: true,
        }),
        prisma.book.groupBy({
          by: ["source"],
          where: { deletedAt: null },
          _count: true,
        }),
        prisma.book.aggregate({
          where: { deletedAt: null },
          _avg: { wordCount: true },
          _sum: { wordCount: true },
        }),
      ]);

    // Get annotations metrics
    const [
      totalAnnotations,
      annotationsByType,
      publicAnnotations,
      privateAnnotations,
    ] = await Promise.all([
      prisma.annotation.count({ where: { deletedAt: null } }),
      prisma.annotation.groupBy({
        by: ["type"],
        where: { deletedAt: null },
        _count: true,
      }),
      prisma.annotation.count({
        where: { deletedAt: null, isPublic: true },
      }),
      prisma.annotation.count({
        where: { deletedAt: null, isPublic: false },
      }),
    ]);

    // Get flashcards metrics
    const [totalFlashcards, flashcardsByStatus, totalReviews] =
      await Promise.all([
        prisma.flashcard.count({ where: { deletedAt: null } }),
        prisma.flashcard.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          _count: true,
        }),
        prisma.flashcardReview.count(),
      ]);

    // Get curriculums metrics
    const [
      totalCurriculums,
      curriculumsByVisibility,
      totalFollows,
      curriculumsWithItems,
    ] = await Promise.all([
      prisma.curriculum.count({ where: { deletedAt: null } }),
      prisma.curriculum.groupBy({
        by: ["visibility"],
        where: { deletedAt: null },
        _count: true,
      }),
      prisma.curriculumFollow.count(),
      prisma.curriculumItem.groupBy({
        by: ["curriculumId"],
        _count: true,
      }),
    ]);

    // Get forum metrics
    const [totalPosts, totalReplies, totalVotes, activeCategories] =
      await Promise.all([
        prisma.forumPost.count({ where: { deletedAt: null } }),
        prisma.forumReply.count({ where: { deletedAt: null } }),
        prisma.forumVote.count(),
        prisma.forumCategory.count({ where: { isActive: true } }),
      ]);

    // Get groups metrics
    const [totalGroups, totalMembers, totalDiscussions] = await Promise.all([
      prisma.readingGroup.count({ where: { deletedAt: null } }),
      prisma.readingGroupMember.count(),
      prisma.groupDiscussion.count({ where: { deletedAt: null } }),
    ]);

    const analytics: ContentAnalytics = {
      // Books
      books: {
        total: totalBooks,
        byStatus: {
          WANT_TO_READ:
            booksByStatus.find((s) => s.status === "WANT_TO_READ")?._count ?? 0,
          READING:
            booksByStatus.find((s) => s.status === "READING")?._count ?? 0,
          COMPLETED:
            booksByStatus.find((s) => s.status === "COMPLETED")?._count ?? 0,
        },
        bySource: {
          UPLOAD: booksBySource.find((s) => s.source === "UPLOAD")?._count ?? 0,
          PASTE: booksBySource.find((s) => s.source === "PASTE")?._count ?? 0,
          URL_IMPORT: 0, // TODO: Add URL_IMPORT to BookSource enum
          OPEN_LIBRARY:
            booksBySource.find((s) => s.source === "OPEN_LIBRARY")?._count ?? 0,
          GUTENBERG: 0, // TODO: Add GUTENBERG to BookSource enum
        },
        averageWordCount: Math.round(booksWordCount._avg.wordCount ?? 0),
        totalWordCount: booksWordCount._sum.wordCount ?? 0,
      },

      // Annotations
      annotations: {
        total: totalAnnotations,
        byType: {
          HIGHLIGHT:
            annotationsByType.find((t) => t.type === "HIGHLIGHT")?._count ?? 0,
          NOTE: annotationsByType.find((t) => t.type === "NOTE")?._count ?? 0,
          QUESTION: 0, // TODO: Add QUESTION to AnnotationType enum
          BOOKMARK:
            annotationsByType.find((t) => t.type === "BOOKMARK")?._count ?? 0,
        },
        publicAnnotations,
        privateAnnotations,
      },

      // Flashcards
      flashcards: {
        total: totalFlashcards,
        byType: {
          BASIC: 0, // TODO: Add BASIC to FlashcardType enum
          CLOZE: 0, // TODO: Add CLOZE to FlashcardType enum
          REVERSE: 0, // TODO: Add REVERSE to FlashcardType enum
        },
        byStatus: {
          NEW: flashcardsByStatus.find((s) => s.status === "NEW")?._count ?? 0,
          LEARNING:
            flashcardsByStatus.find((s) => s.status === "LEARNING")?._count ??
            0,
          REVIEW:
            flashcardsByStatus.find((s) => s.status === "REVIEW")?._count ?? 0,
          RELEARNING: 0, // TODO: Add RELEARNING to FlashcardStatus enum
          SUSPENDED:
            flashcardsByStatus.find((s) => s.status === "SUSPENDED")?._count ??
            0,
          MASTERED: 0, // TODO: Add MASTERED to FlashcardStatus enum
        },
        totalReviews,
      },

      // Curriculums
      curriculums: {
        total: totalCurriculums,
        byVisibility: {
          PRIVATE:
            curriculumsByVisibility.find((v) => v.visibility === "PRIVATE")
              ?._count ?? 0,
          UNLISTED:
            curriculumsByVisibility.find((v) => v.visibility === "UNLISTED")
              ?._count ?? 0,
          PUBLIC:
            curriculumsByVisibility.find((v) => v.visibility === "PUBLIC")
              ?._count ?? 0,
        },
        totalFollows,
        averageItemsPerCurriculum:
          curriculumsWithItems.length > 0
            ? Math.round(
                curriculumsWithItems.reduce((sum, c) => sum + c._count, 0) /
                  curriculumsWithItems.length
              )
            : 0,
      },

      // Forum
      forum: {
        totalPosts,
        totalReplies,
        totalVotes,
        activeCategories,
      },

      // Groups
      groups: {
        total: totalGroups,
        totalMembers,
        totalDiscussions,
        averageMembersPerGroup:
          totalGroups > 0 ? Math.round(totalMembers / totalGroups) : 0,
      },
    };

    logger.info("Admin content analytics fetched", {
      totalBooks,
      totalAnnotations,
      totalFlashcards,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch content analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch content analytics",
      },
    });
  }
}

export default requireAdmin(handler);
