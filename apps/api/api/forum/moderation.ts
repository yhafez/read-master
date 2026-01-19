/**
 * Forum Moderation API
 *
 * GET /api/forum/moderation - Get moderation queue (pending reports)
 *   - Moderator/Admin only
 *   - Lists pending content reports
 *   - Supports pagination and filtering by status/type
 *
 * PUT /api/forum/moderation/:reportId - Update report status
 *   - Moderator/Admin only
 *   - Mark report as reviewed, dismissed, or action taken
 *
 * @example
 * ```bash
 * # List pending reports
 * curl "/api/forum/moderation?status=PENDING" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Mark report as reviewed
 * curl -X PUT "/api/forum/moderation?reportId=cuid123" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"status":"ACTION_TAKEN","moderatorNote":"User warned"}'
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
import { z } from "zod";
import { REPORT_ACTION, REPORT_STATUS, type ReportStatus } from "./report.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default page size for moderation queue
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum page size for moderation queue
 */
export const MAX_LIMIT = 100;

/**
 * User roles allowed to access moderation
 */
export const MODERATOR_ROLES = ["MODERATOR", "ADMIN"] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Report item in moderation queue
 */
export type ModerationReportItem = {
  id: string;
  reporterId: string;
  reporterUsername: string | null;
  targetType: "post" | "reply";
  targetId: string;
  contentAuthorId: string;
  contentAuthorUsername: string | null;
  contentPreview: string;
  reportType: string;
  reason: string | null;
  status: ReportStatus;
  moderatorNote: string | null;
  reviewedById: string | null;
  reviewedByUsername: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

/**
 * List moderation queue response
 */
export type ListModerationResponse = {
  reports: ModerationReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

/**
 * Update report status response
 */
export type UpdateReportResponse = {
  report: ModerationReportItem;
};

// ============================================================================
// Schemas
// ============================================================================

/**
 * Status filter schema
 */
export const reportStatusSchema = z.enum([
  "PENDING",
  "REVIEWED",
  "DISMISSED",
  "ACTION_TAKEN",
]);

/**
 * Query params schema for GET
 */
export const listModerationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT),
  status: reportStatusSchema.optional(),
  targetType: z.enum(["post", "reply"]).optional(),
});
export type ListModerationQuery = z.infer<typeof listModerationQuerySchema>;

/**
 * Update report body schema
 */
export const updateReportBodySchema = z.object({
  status: reportStatusSchema,
  moderatorNote: z.string().max(1000).trim().optional(),
});
export type UpdateReportBody = z.infer<typeof updateReportBodySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse page number
 */
export function parsePage(value: unknown): number {
  if (typeof value === "string" || typeof value === "number") {
    const num = Number(value);
    if (!isNaN(num) && num > 0 && Number.isInteger(num)) {
      return num;
    }
  }
  return 1;
}

/**
 * Parse limit
 */
export function parseLimit(value: unknown): number {
  if (typeof value === "string" || typeof value === "number") {
    const num = Number(value);
    if (!isNaN(num) && num > 0 && Number.isInteger(num)) {
      return Math.min(num, MAX_LIMIT);
    }
  }
  return DEFAULT_LIMIT;
}

/**
 * Parse status filter
 */
export function parseStatus(value: unknown): ReportStatus | undefined {
  if (typeof value === "string") {
    const result = reportStatusSchema.safeParse(value);
    if (result.success) {
      return result.data as ReportStatus;
    }
  }
  return undefined;
}

/**
 * Parse target type filter
 */
export function parseTargetType(value: unknown): "post" | "reply" | undefined {
  if (value === "post" || value === "reply") {
    return value;
  }
  return undefined;
}

/**
 * Parse report ID from query
 */
export function parseReportId(value: unknown): string | null {
  if (typeof value === "string" && value.match(/^c[a-z0-9]+$/)) {
    return value;
  }
  return null;
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format date or null
 */
export function formatDateOptional(
  date: Date | null | undefined
): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Check if user is a moderator
 */
export function isModerator(user: { role?: string | null }): boolean {
  const role = user.role ?? "USER";
  return MODERATOR_ROLES.includes(role as (typeof MODERATOR_ROLES)[number]);
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get user with preferences for role checking
 * Note: Role is stored in user.preferences.role as the User model
 * doesn't have a dedicated role field
 */
async function getUserWithRole(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      preferences: true,
    },
  });
}

/**
 * Extract role from user preferences
 */
export function getRoleFromPreferences(preferences: unknown): string | null {
  if (
    preferences &&
    typeof preferences === "object" &&
    "role" in preferences &&
    typeof (preferences as { role: unknown }).role === "string"
  ) {
    return (preferences as { role: string }).role;
  }
  return null;
}

/**
 * Get usernames for a list of user IDs
 */
async function getUsernames(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(userIds)];
  const users = await db.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, username: true },
  });
  const map = new Map<string, string | null>();
  users.forEach((u) => map.set(u.id, u.username));
  return map;
}

/**
 * Count reports matching filters
 */
async function countReports(
  status?: ReportStatus,
  targetType?: "post" | "reply"
) {
  const whereClause: {
    action: string;
    metadata?: { path: string[]; equals?: string };
  } = {
    action: REPORT_ACTION,
  };

  // Note: Prisma JSON filtering is limited, we filter in memory for complex cases
  // For status, we can use JSON path filtering
  if (status) {
    whereClause.metadata = {
      path: ["status"],
      equals: status,
    };
  }

  const count = await db.auditLog.count({
    where: whereClause,
  });

  // If targetType filter is needed, we need to fetch and filter
  if (targetType) {
    const reports = await db.auditLog.findMany({
      where: whereClause,
      select: { metadata: true },
    });
    return reports.filter((r) => {
      const meta = r.metadata as { contentType?: string } | null;
      return meta?.contentType === targetType;
    }).length;
  }

  return count;
}

/**
 * List reports with pagination
 */
async function listReports(
  page: number,
  limit: number,
  status?: ReportStatus,
  targetType?: "post" | "reply"
) {
  const whereClause: {
    action: string;
    metadata?: { path: string[]; equals?: string };
  } = {
    action: REPORT_ACTION,
  };

  if (status) {
    whereClause.metadata = {
      path: ["status"],
      equals: status,
    };
  }

  let reports = await db.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit * 2, // Fetch extra to filter for targetType
    select: {
      id: true,
      userId: true,
      entityType: true,
      entityId: true,
      newValue: true,
      metadata: true,
      createdAt: true,
    },
  });

  // Filter by targetType if needed
  if (targetType) {
    reports = reports.filter((r) => {
      const meta = r.metadata as { contentType?: string } | null;
      return meta?.contentType === targetType;
    });
  }

  // Limit to requested page size
  return reports.slice(0, limit);
}

/**
 * Get report by ID
 */
async function getReportById(reportId: string) {
  return db.auditLog.findFirst({
    where: {
      id: reportId,
      action: REPORT_ACTION,
    },
  });
}

/**
 * Update report status
 */
async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  moderatorId: string,
  moderatorNote?: string
) {
  const report = await getReportById(reportId);
  if (!report) return null;

  const currentMetadata = report.metadata as Record<string, unknown> | null;

  return db.auditLog.update({
    where: { id: reportId },
    data: {
      metadata: {
        ...currentMetadata,
        status,
        moderatorNote: moderatorNote ?? null,
        reviewedById: moderatorId,
        reviewedAt: new Date().toISOString(),
      },
    },
  });
}

// ============================================================================
// Mappers
// ============================================================================

/**
 * Map report to response item
 */
export async function mapToReportItem(
  report: {
    id: string;
    userId: string | null;
    entityType: string;
    entityId: string | null;
    newValue: unknown;
    metadata: unknown;
    createdAt: Date;
  },
  usernameMap: Map<string, string | null>
): Promise<ModerationReportItem> {
  const newValue = report.newValue as {
    reportType?: string;
    reason?: string | null;
    contentPreview?: string;
    contentAuthorId?: string;
  } | null;

  const metadata = report.metadata as {
    status?: ReportStatus;
    contentType?: string;
    moderatorNote?: string | null;
    reviewedById?: string | null;
    reviewedAt?: string | null;
  } | null;

  const reporterId = report.userId ?? "";
  const contentAuthorId = newValue?.contentAuthorId ?? "";
  const reviewedById = metadata?.reviewedById ?? null;

  return {
    id: report.id,
    reporterId,
    reporterUsername: usernameMap.get(reporterId) ?? null,
    targetType: (metadata?.contentType ?? "post") as "post" | "reply",
    targetId: report.entityId ?? "",
    contentAuthorId,
    contentAuthorUsername: usernameMap.get(contentAuthorId) ?? null,
    contentPreview: newValue?.contentPreview ?? "",
    reportType: newValue?.reportType ?? "OTHER",
    reason: newValue?.reason ?? null,
    status: (metadata?.status ?? REPORT_STATUS.PENDING) as ReportStatus,
    moderatorNote: metadata?.moderatorNote ?? null,
    reviewedById,
    reviewedByUsername: reviewedById
      ? (usernameMap.get(reviewedById) ?? null)
      : null,
    createdAt: formatDate(report.createdAt),
    reviewedAt: metadata?.reviewedAt ?? null,
  };
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle GET /api/forum/moderation
 * List moderation queue
 */
async function handleListReports(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string }
): Promise<void> {
  try {
    // Check moderator role
    const userWithPrefs = await getUserWithRole(user.id);
    if (!userWithPrefs) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }
    const userRole = getRoleFromPreferences(userWithPrefs.preferences);
    if (!isModerator({ role: userRole })) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Access denied. Moderator role required.",
        403
      );
      return;
    }

    // Parse query params
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const status = parseStatus(req.query.status);
    const targetType = parseTargetType(req.query.targetType);

    // Get total count
    const total = await countReports(status, targetType);

    // Get reports
    const reports = await listReports(page, limit, status, targetType);

    // Get all user IDs for username lookup
    const userIds = new Set<string>();
    reports.forEach((r) => {
      if (r.userId) userIds.add(r.userId);
      const newValue = r.newValue as { contentAuthorId?: string } | null;
      if (newValue?.contentAuthorId) userIds.add(newValue.contentAuthorId);
      const meta = r.metadata as { reviewedById?: string } | null;
      if (meta?.reviewedById) userIds.add(meta.reviewedById);
    });

    const usernameMap = await getUsernames([...userIds]);

    // Map reports
    const mappedReports = await Promise.all(
      reports.map((r) => mapToReportItem(r, usernameMap))
    );

    const totalPages = Math.ceil(total / limit);

    const response: ListModerationResponse = {
      reports: mappedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };

    logger.info("Moderation queue retrieved", {
      userId: user.id,
      page,
      limit,
      status,
      targetType,
      total,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing moderation queue", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to load moderation queue. Please try again.",
      500
    );
  }
}

/**
 * Handle PUT /api/forum/moderation
 * Update report status
 */
async function handleUpdateReport(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string }
): Promise<void> {
  try {
    // Check moderator role
    const userWithPrefs = await getUserWithRole(user.id);
    if (!userWithPrefs) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }
    const userRole = getRoleFromPreferences(userWithPrefs.preferences);
    if (!isModerator({ role: userRole })) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Access denied. Moderator role required.",
        403
      );
      return;
    }

    // Parse report ID from query
    const reportId = parseReportId(req.query.reportId);
    if (!reportId) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid report ID", 400);
      return;
    }

    // Validate request body
    const parseResult = updateReportBodySchema.safeParse(req.body);
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

    const { status, moderatorNote } = parseResult.data;

    // Check report exists
    const existingReport = await getReportById(reportId);
    if (!existingReport) {
      sendError(res, ErrorCodes.NOT_FOUND, "Report not found", 404);
      return;
    }

    // Update report
    const updatedReport = await updateReportStatus(
      reportId,
      status as ReportStatus,
      user.id,
      moderatorNote
    );

    if (!updatedReport) {
      sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to update report", 500);
      return;
    }

    // Get usernames for response
    const userIds = new Set<string>();
    if (updatedReport.userId) userIds.add(updatedReport.userId);
    const newValue = updatedReport.newValue as {
      contentAuthorId?: string;
    } | null;
    if (newValue?.contentAuthorId) userIds.add(newValue.contentAuthorId);
    userIds.add(user.id);

    const usernameMap = await getUsernames([...userIds]);

    const mappedReport = await mapToReportItem(updatedReport, usernameMap);

    const response: UpdateReportResponse = {
      report: mappedReport,
    };

    logger.info("Report status updated", {
      userId: user.id,
      reportId,
      newStatus: status,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error updating report status", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update report. Please try again.",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/forum/moderation
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
    case "GET":
      await handleListReports(req, res, user);
      break;
    case "PUT":
      await handleUpdateReport(req, res, user);
      break;
    default:
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Method not allowed. Use GET or PUT.",
        405
      );
  }
}

export default withAuth(handler);
