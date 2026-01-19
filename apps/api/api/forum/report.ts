/**
 * Forum Content Report API
 *
 * POST /api/forum/report - Report a forum post or reply
 *   - Validates target exists and is not deleted
 *   - Prevents duplicate reports (same user, same content)
 *   - Stores report in AuditLog for moderator review
 *
 * @example
 * ```bash
 * # Report a post
 * curl -X POST "/api/forum/report" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"postId":"cuid123","type":"SPAM","reason":"Advertising links"}'
 *
 * # Report a reply
 * curl -X POST "/api/forum/report" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"replyId":"cuid456","type":"HARASSMENT"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { reportContentSchema } from "@read-master/shared/schemas";
import type { ReportType } from "@read-master/shared/schemas";
import type { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/**
 * Action type for forum content reports in AuditLog
 */
export const REPORT_ACTION = "FORUM_REPORT" as const;

/**
 * Entity types for reports
 */
export const REPORT_ENTITY_TYPES = {
  POST: "ForumPost",
  REPLY: "ForumReply",
} as const;

/**
 * Report status values stored in metadata
 */
export const REPORT_STATUS = {
  PENDING: "PENDING",
  REVIEWED: "REVIEWED",
  DISMISSED: "DISMISSED",
  ACTION_TAKEN: "ACTION_TAKEN",
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

// ============================================================================
// Types
// ============================================================================

/**
 * Report input type from schema
 */
export type ReportInput = z.infer<typeof reportContentSchema>;

/**
 * Reported content info
 */
export type ReportedContentInfo = {
  id: string;
  type: "post" | "reply";
  authorId: string;
  content: string;
  postId?: string;
};

/**
 * Report response
 */
export type CreateReportResponse = {
  reportId: string;
  targetType: "post" | "reply";
  targetId: string;
  reportType: ReportType;
  status: ReportStatus;
  createdAt: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Truncate content for preview (max 200 chars)
 */
export function truncateContent(content: string, maxLength = 200): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + "...";
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get post by ID for validation
 */
async function getPostById(postId: string) {
  return db.forumPost.findUnique({
    where: {
      id: postId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      content: true,
      category: {
        select: {
          isActive: true,
        },
      },
    },
  });
}

/**
 * Get reply by ID for validation
 */
async function getReplyById(replyId: string) {
  return db.forumReply.findUnique({
    where: {
      id: replyId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      content: true,
      postId: true,
      post: {
        select: {
          id: true,
          deletedAt: true,
          category: {
            select: {
              isActive: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Check if user has already reported this content
 * Reports are stored in AuditLog with FORUM_REPORT action
 */
async function hasUserAlreadyReported(
  userId: string,
  entityType: string,
  entityId: string
): Promise<boolean> {
  const existingReport = await db.auditLog.findFirst({
    where: {
      userId,
      action: REPORT_ACTION,
      entityType,
      entityId,
    },
    select: { id: true },
  });
  return existingReport !== null;
}

/**
 * Create a content report in AuditLog
 */
async function createReport(
  userId: string,
  entityType: string,
  entityId: string,
  reportType: ReportType,
  reason: string | undefined,
  contentInfo: ReportedContentInfo,
  requestContext: { ipAddress?: string; userAgent?: string }
) {
  return db.auditLog.create({
    data: {
      userId,
      action: REPORT_ACTION,
      entityType,
      entityId,
      newValue: {
        reportType,
        reason: reason ?? null,
        contentPreview: truncateContent(contentInfo.content),
        contentAuthorId: contentInfo.authorId,
        postId: contentInfo.postId ?? null,
      },
      metadata: {
        status: REPORT_STATUS.PENDING,
        contentType: contentInfo.type,
      },
      ipAddress: requestContext.ipAddress ?? null,
      userAgent: requestContext.userAgent ?? null,
    },
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle POST /api/forum/report
 * Create a content report
 */
async function handleCreateReport(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string }
): Promise<void> {
  try {
    // Validate request body
    const parseResult = reportContentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten();
      const errorMessages = [
        ...Object.values(errors.fieldErrors).flat(),
        ...errors.formErrors,
      ].filter(Boolean);
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        errorMessages[0] || "Validation failed",
        400
      );
      return;
    }

    const { postId, replyId, type: reportType, reason } = parseResult.data;

    // Determine entity type and get content
    let entityType: string;
    let entityId: string;
    let contentInfo: ReportedContentInfo;

    if (postId) {
      entityType = REPORT_ENTITY_TYPES.POST;
      entityId = postId;

      // Get post
      const post = await getPostById(postId);
      if (!post) {
        sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
        return;
      }

      // Check category is active
      if (!post.category.isActive) {
        sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
        return;
      }

      // Cannot report own content
      if (post.userId === user.id) {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "You cannot report your own content",
          400
        );
        return;
      }

      contentInfo = {
        id: post.id,
        type: "post",
        authorId: post.userId,
        content: post.title + "\n\n" + post.content,
      };
    } else if (replyId) {
      entityType = REPORT_ENTITY_TYPES.REPLY;
      entityId = replyId;

      // Get reply
      const reply = await getReplyById(replyId);
      if (!reply) {
        sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
        return;
      }

      // Check post is not deleted
      if (reply.post.deletedAt !== null) {
        sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
        return;
      }

      // Check category is active
      if (!reply.post.category.isActive) {
        sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
        return;
      }

      // Cannot report own content
      if (reply.userId === user.id) {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "You cannot report your own content",
          400
        );
        return;
      }

      contentInfo = {
        id: reply.id,
        type: "reply",
        authorId: reply.userId,
        content: reply.content,
        postId: reply.postId,
      };
    } else {
      // This shouldn't happen due to schema validation
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Either postId or replyId must be provided",
        400
      );
      return;
    }

    // Check for duplicate report
    const alreadyReported = await hasUserAlreadyReported(
      user.id,
      entityType,
      entityId
    );
    if (alreadyReported) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You have already reported this content",
        400
      );
      return;
    }

    // Get request context
    const forwardedFor = req.headers["x-forwarded-for"] as string | undefined;
    const ipAddress = forwardedFor?.split(",")[0];
    const userAgent = req.headers["user-agent"];
    const requestContext: { ipAddress?: string; userAgent?: string } = {};
    if (ipAddress) {
      requestContext.ipAddress = ipAddress;
    }
    if (userAgent) {
      requestContext.userAgent = userAgent;
    }

    // Create report
    const report = await createReport(
      user.id,
      entityType,
      entityId,
      reportType,
      reason,
      contentInfo,
      requestContext
    );

    const response: CreateReportResponse = {
      reportId: report.id,
      targetType: contentInfo.type,
      targetId: entityId,
      reportType,
      status: REPORT_STATUS.PENDING,
      createdAt: formatDate(report.createdAt),
    };

    logger.info("Forum content reported", {
      userId: user.id,
      reportId: report.id,
      entityType,
      entityId,
      reportType,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating forum content report", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to submit report. Please try again.",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/forum/report
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  // Get current user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  switch (req.method) {
    case "POST":
      await handleCreateReport(req, res, user);
      break;
    default:
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Method not allowed. Use POST.",
        405
      );
  }
}

export default withAuth(handler);
