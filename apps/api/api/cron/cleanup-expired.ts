import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../src/utils/logger.js";
import { db } from "../../src/services/db.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Retention period for audit logs in days
 * Default: 90 days
 */
const AUDIT_LOG_RETENTION_DAYS = 90;

/**
 * Retention period for soft-deleted records in days
 * Default: 30 days (gives users time to recover deleted items)
 */
const SOFT_DELETE_RETENTION_DAYS = 30;

/**
 * Retention period for AI usage logs in days
 * Default: 365 days (for billing/analytics purposes)
 */
const AI_USAGE_LOG_RETENTION_DAYS = 365;

/**
 * Batch size for delete operations to avoid memory issues
 */
const BATCH_SIZE = 1000;

// ============================================================================
// Types
// ============================================================================

interface CleanupStats {
  oldAuditLogsDeleted: number;
  oldAILogsDeleted: number;
  softDeletedBooksDeleted: number;
  softDeletedFlashcardsDeleted: number;
  softDeletedAnnotationsDeleted: number;
  softDeletedCurriculumsDeleted: number;
  softDeletedForumPostsDeleted: number;
  softDeletedForumRepliesDeleted: number;
  errors: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify the cron request is authorized
 */
function verifyCronAuth(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  // If no secret is configured, allow the request (development mode)
  if (!cronSecret) {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Get cutoff date for a given retention period
 */
function getCutoffDate(retentionDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

/**
 * Clean up old audit logs beyond retention period
 */
async function cleanupAuditLogs(cutoffDate: Date): Promise<number> {
  const result = await db.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean up old AI usage logs beyond retention period
 */
async function cleanupAIUsageLogs(cutoffDate: Date): Promise<number> {
  const result = await db.aIUsageLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean up soft-deleted books and their related data
 * Books cascade delete to: chapters, reading progress, annotations, pre-reading guides, assessments, flashcards
 */
async function cleanupSoftDeletedBooks(cutoffDate: Date): Promise<number> {
  // First, get IDs of books to delete (to clean up related data)
  const booksToDelete = await db.book.findMany({
    where: {
      deletedAt: { lt: cutoffDate },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  if (booksToDelete.length === 0) {
    return 0;
  }

  const bookIds = booksToDelete.map((b) => b.id);

  // Delete related data in correct order (respecting foreign keys)
  // 1. Delete flashcard reviews for flashcards in these books
  await db.flashcardReview.deleteMany({
    where: {
      flashcard: { bookId: { in: bookIds } },
    },
  });

  // 2. Delete flashcards
  await db.flashcard.deleteMany({
    where: { bookId: { in: bookIds } },
  });

  // 3. Delete assessments
  await db.assessment.deleteMany({
    where: { bookId: { in: bookIds } },
  });

  // 4. Delete annotations
  await db.annotation.deleteMany({
    where: { bookId: { in: bookIds } },
  });

  // 5. Delete pre-reading guides
  await db.preReadingGuide.deleteMany({
    where: { bookId: { in: bookIds } },
  });

  // 6. Delete reading progress
  await db.readingProgress.deleteMany({
    where: { bookId: { in: bookIds } },
  });

  // 7. Delete chapters
  await db.chapter.deleteMany({
    where: { bookId: { in: bookIds } },
  });

  // 8. Finally delete the books themselves
  const result = await db.book.deleteMany({
    where: { id: { in: bookIds } },
  });

  return result.count;
}

/**
 * Clean up soft-deleted flashcards (not tied to deleted books)
 */
async function cleanupSoftDeletedFlashcards(cutoffDate: Date): Promise<number> {
  // First delete reviews for these flashcards
  const flashcardsToDelete = await db.flashcard.findMany({
    where: {
      deletedAt: { lt: cutoffDate },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  if (flashcardsToDelete.length === 0) {
    return 0;
  }

  const flashcardIds = flashcardsToDelete.map((f) => f.id);

  // Delete reviews first
  await db.flashcardReview.deleteMany({
    where: { flashcardId: { in: flashcardIds } },
  });

  // Then delete flashcards
  const result = await db.flashcard.deleteMany({
    where: { id: { in: flashcardIds } },
  });

  return result.count;
}

/**
 * Clean up soft-deleted annotations
 */
async function cleanupSoftDeletedAnnotations(
  cutoffDate: Date
): Promise<number> {
  const result = await db.annotation.deleteMany({
    where: {
      deletedAt: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean up soft-deleted curriculums and their items
 */
async function cleanupSoftDeletedCurriculums(
  cutoffDate: Date
): Promise<number> {
  // Get curriculums to delete
  const curriculumsToDelete = await db.curriculum.findMany({
    where: {
      deletedAt: { lt: cutoffDate },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  if (curriculumsToDelete.length === 0) {
    return 0;
  }

  const curriculumIds = curriculumsToDelete.map((c) => c.id);

  // Delete curriculum follows first
  await db.curriculumFollow.deleteMany({
    where: { curriculumId: { in: curriculumIds } },
  });

  // Delete curriculum items
  await db.curriculumItem.deleteMany({
    where: { curriculumId: { in: curriculumIds } },
  });

  // Delete curriculums
  const result = await db.curriculum.deleteMany({
    where: { id: { in: curriculumIds } },
  });

  return result.count;
}

/**
 * Clean up soft-deleted forum posts and their replies
 */
async function cleanupSoftDeletedForumPosts(cutoffDate: Date): Promise<number> {
  // Get posts to delete
  const postsToDelete = await db.forumPost.findMany({
    where: {
      deletedAt: { lt: cutoffDate },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  if (postsToDelete.length === 0) {
    return 0;
  }

  const postIds = postsToDelete.map((p) => p.id);

  // Delete votes on replies first
  await db.forumVote.deleteMany({
    where: {
      replyId: {
        in: (
          await db.forumReply.findMany({
            where: { postId: { in: postIds } },
            select: { id: true },
          })
        ).map((r) => r.id),
      },
    },
  });

  // Delete votes on posts
  await db.forumVote.deleteMany({
    where: { postId: { in: postIds } },
  });

  // Delete replies
  await db.forumReply.deleteMany({
    where: { postId: { in: postIds } },
  });

  // Delete posts
  const result = await db.forumPost.deleteMany({
    where: { id: { in: postIds } },
  });

  return result.count;
}

/**
 * Clean up soft-deleted forum replies
 */
async function cleanupSoftDeletedForumReplies(
  cutoffDate: Date
): Promise<number> {
  // Get replies to delete
  const repliesToDelete = await db.forumReply.findMany({
    where: {
      deletedAt: { lt: cutoffDate },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  if (repliesToDelete.length === 0) {
    return 0;
  }

  const replyIds = repliesToDelete.map((r) => r.id);

  // Delete votes on these replies
  await db.forumVote.deleteMany({
    where: { replyId: { in: replyIds } },
  });

  // Delete replies
  const result = await db.forumReply.deleteMany({
    where: { id: { in: replyIds } },
  });

  return result.count;
}

/**
 * Run all cleanup operations
 */
async function runCleanup(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    oldAuditLogsDeleted: 0,
    oldAILogsDeleted: 0,
    softDeletedBooksDeleted: 0,
    softDeletedFlashcardsDeleted: 0,
    softDeletedAnnotationsDeleted: 0,
    softDeletedCurriculumsDeleted: 0,
    softDeletedForumPostsDeleted: 0,
    softDeletedForumRepliesDeleted: 0,
    errors: [],
  };

  const auditLogCutoff = getCutoffDate(AUDIT_LOG_RETENTION_DAYS);
  const aiLogCutoff = getCutoffDate(AI_USAGE_LOG_RETENTION_DAYS);
  const softDeleteCutoff = getCutoffDate(SOFT_DELETE_RETENTION_DAYS);

  // Clean up audit logs
  try {
    stats.oldAuditLogsDeleted = await cleanupAuditLogs(auditLogCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Audit log cleanup failed: ${msg}`);
    logger.error("Audit log cleanup failed", { error: msg });
  }

  // Clean up AI usage logs
  try {
    stats.oldAILogsDeleted = await cleanupAIUsageLogs(aiLogCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`AI usage log cleanup failed: ${msg}`);
    logger.error("AI usage log cleanup failed", { error: msg });
  }

  // Clean up soft-deleted books (must be before flashcards since books own flashcards)
  try {
    stats.softDeletedBooksDeleted =
      await cleanupSoftDeletedBooks(softDeleteCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Soft-deleted books cleanup failed: ${msg}`);
    logger.error("Soft-deleted books cleanup failed", { error: msg });
  }

  // Clean up soft-deleted flashcards
  try {
    stats.softDeletedFlashcardsDeleted =
      await cleanupSoftDeletedFlashcards(softDeleteCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Soft-deleted flashcards cleanup failed: ${msg}`);
    logger.error("Soft-deleted flashcards cleanup failed", { error: msg });
  }

  // Clean up soft-deleted annotations
  try {
    stats.softDeletedAnnotationsDeleted =
      await cleanupSoftDeletedAnnotations(softDeleteCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Soft-deleted annotations cleanup failed: ${msg}`);
    logger.error("Soft-deleted annotations cleanup failed", { error: msg });
  }

  // Clean up soft-deleted curriculums
  try {
    stats.softDeletedCurriculumsDeleted =
      await cleanupSoftDeletedCurriculums(softDeleteCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Soft-deleted curriculums cleanup failed: ${msg}`);
    logger.error("Soft-deleted curriculums cleanup failed", { error: msg });
  }

  // Clean up soft-deleted forum posts
  try {
    stats.softDeletedForumPostsDeleted =
      await cleanupSoftDeletedForumPosts(softDeleteCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Soft-deleted forum posts cleanup failed: ${msg}`);
    logger.error("Soft-deleted forum posts cleanup failed", { error: msg });
  }

  // Clean up soft-deleted forum replies
  try {
    stats.softDeletedForumRepliesDeleted =
      await cleanupSoftDeletedForumReplies(softDeleteCutoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Soft-deleted forum replies cleanup failed: ${msg}`);
    logger.error("Soft-deleted forum replies cleanup failed", { error: msg });
  }

  return stats;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Cleanup Expired Data Cron Job
 *
 * Schedule: Weekly on Sundays at 3:00 AM UTC
 * Purpose: Clean up expired data including:
 * - Old audit logs (> 90 days)
 * - Old AI usage logs (> 365 days)
 * - Soft-deleted records past retention period (> 30 days)
 *
 * This endpoint is called by Vercel Cron.
 * It requires the CRON_SECRET header for authentication.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify cron secret to prevent unauthorized access
  if (!verifyCronAuth(req)) {
    logger.warn("Unauthorized cron job attempt", {
      endpoint: "/api/cron/cleanup-expired",
      ip: req.headers["x-forwarded-for"] ?? "unknown",
    });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const startTime = Date.now();

  try {
    logger.info("Starting cleanup cron job", {
      timestamp: new Date().toISOString(),
      auditLogRetentionDays: AUDIT_LOG_RETENTION_DAYS,
      aiLogRetentionDays: AI_USAGE_LOG_RETENTION_DAYS,
      softDeleteRetentionDays: SOFT_DELETE_RETENTION_DAYS,
    });

    const stats = await runCleanup();
    const duration = Date.now() - startTime;

    const totalDeleted =
      stats.oldAuditLogsDeleted +
      stats.oldAILogsDeleted +
      stats.softDeletedBooksDeleted +
      stats.softDeletedFlashcardsDeleted +
      stats.softDeletedAnnotationsDeleted +
      stats.softDeletedCurriculumsDeleted +
      stats.softDeletedForumPostsDeleted +
      stats.softDeletedForumRepliesDeleted;

    logger.info("Cleanup cron job completed", {
      duration,
      totalDeleted,
      ...stats,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: stats.errors.length === 0,
      message:
        stats.errors.length === 0
          ? "Cleanup job completed successfully"
          : "Cleanup job completed with some errors",
      duration,
      stats: {
        oldAuditLogsDeleted: stats.oldAuditLogsDeleted,
        oldAILogsDeleted: stats.oldAILogsDeleted,
        softDeletedBooksDeleted: stats.softDeletedBooksDeleted,
        softDeletedFlashcardsDeleted: stats.softDeletedFlashcardsDeleted,
        softDeletedAnnotationsDeleted: stats.softDeletedAnnotationsDeleted,
        softDeletedCurriculumsDeleted: stats.softDeletedCurriculumsDeleted,
        softDeletedForumPostsDeleted: stats.softDeletedForumPostsDeleted,
        softDeletedForumRepliesDeleted: stats.softDeletedForumRepliesDeleted,
        totalDeleted,
      },
      errors: stats.errors.length > 0 ? stats.errors : undefined,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Cleanup cron job failed", {
      error: errorMessage,
      duration,
    });

    res.status(500).json({
      success: false,
      error: "Failed to clean up expired data",
      message: errorMessage,
    });
  }
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  verifyCronAuth,
  getCutoffDate,
  cleanupAuditLogs,
  cleanupAIUsageLogs,
  cleanupSoftDeletedBooks,
  cleanupSoftDeletedFlashcards,
  cleanupSoftDeletedAnnotations,
  cleanupSoftDeletedCurriculums,
  cleanupSoftDeletedForumPosts,
  cleanupSoftDeletedForumReplies,
  runCleanup,
  AUDIT_LOG_RETENTION_DAYS,
  SOFT_DELETE_RETENTION_DAYS,
  AI_USAGE_LOG_RETENTION_DAYS,
  BATCH_SIZE,
};

export type { CleanupStats };
