/**
 * Live Reading Sessions API
 *
 * GET /api/sessions - List available sessions
 *   - Supports pagination, filtering by status
 *   - Returns public sessions and user's own sessions
 *
 * POST /api/sessions - Create a new reading session
 *   - Only authenticated users can create sessions
 *   - Creates the user as host and first participant
 *
 * @example
 * ```bash
 * # List sessions
 * curl -X GET "/api/sessions?status=active&limit=20" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Create session
 * curl -X POST "/api/sessions" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"Chapter 1 Reading","bookId":"abc123","isPublic":true}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import type { VercelRequest } from "@vercel/node";
import { authenticateRequest } from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../src/services/redis.js";
import { nanoid } from "nanoid";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default page for pagination
 */
export const DEFAULT_PAGE = 1;

/**
 * Default limit for pagination
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum limit for pagination
 */
export const MAX_LIMIT = 50;

/**
 * Minimum limit for pagination
 */
export const MIN_LIMIT = 1;

/**
 * Maximum title length
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Maximum participants per session
 */
export const MAX_PARTICIPANTS = 100;

/**
 * Cache TTL for sessions data (2 minutes)
 */
export const SESSIONS_CACHE_TTL = 60 * 2;

/**
 * Session status options
 */
export const SessionStatusOptions = {
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ENDED: "ENDED",
  CANCELLED: "CANCELLED",
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for listing sessions
 */
export type SessionListQueryParams = {
  page: number;
  limit: number;
  status?: string | undefined;
  bookId?: string | undefined;
  hostId?: string | undefined;
  includeEnded?: boolean;
};

/**
 * Host info in response
 */
export type SessionHostInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Book info in response
 */
export type SessionBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Session summary for list response
 */
export type SessionSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currentPage: number;
  isPublic: boolean;
  allowChat: boolean;
  syncEnabled: boolean;
  maxParticipants: number;
  participantCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  host: SessionHostInfo;
  book: SessionBookInfo;
  createdAt: string;
};

/**
 * Pagination info
 */
export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * Session list response
 */
export type SessionListResponse = {
  sessions: SessionSummary[];
  pagination: PaginationInfo;
};

/**
 * Create session input
 */
export type CreateSessionInput = {
  title: string;
  description?: string | null | undefined;
  bookId: string;
  isPublic?: boolean;
  maxParticipants?: number;
  allowChat?: boolean;
  syncEnabled?: boolean;
  scheduledAt?: string | null | undefined;
};

/**
 * Create session response
 */
export type CreateSessionResponse = {
  success: boolean;
  message: string;
  session: SessionSummary;
  inviteCode: string | null;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for creating a session
 */
export const createSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be at most ${MAX_TITLE_LENGTH} characters`
    ),
  description: z
    .string()
    .trim()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .optional()
    .nullable(),
  bookId: z.string().regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  isPublic: z.boolean().optional().default(true),
  maxParticipants: z
    .number()
    .int()
    .min(2, "Must allow at least 2 participants")
    .max(MAX_PARTICIPANTS, `Maximum ${MAX_PARTICIPANTS} participants`)
    .optional()
    .default(50),
  allowChat: z.boolean().optional().default(true),
  syncEnabled: z.boolean().optional().default(true),
  scheduledAt: z
    .string()
    .datetime({ message: "Invalid date format. Use ISO 8601 format." })
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return date > new Date();
      },
      { message: "Scheduled date must be in the future" }
    ),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date as ISO string
 */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Format required date as ISO string
 */
export function formatDateRequired(date: Date): string {
  return date.toISOString();
}

/**
 * Parse page number from query
 */
export function parsePage(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      return num;
    }
  }
  if (typeof value === "number" && value >= 1) {
    return Math.floor(value);
  }
  return DEFAULT_PAGE;
}

/**
 * Parse limit from query
 */
export function parseLimit(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= MIN_LIMIT && num <= MAX_LIMIT) {
      return num;
    }
  }
  if (typeof value === "number" && value >= MIN_LIMIT && value <= MAX_LIMIT) {
    return Math.floor(value);
  }
  return DEFAULT_LIMIT;
}

/**
 * Parse status from query
 */
export function parseStatus(value: unknown): string | undefined {
  if (typeof value === "string") {
    const upper = value.toUpperCase().trim();
    if (
      Object.values(SessionStatusOptions).includes(
        upper as "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED"
      )
    ) {
      return upper;
    }
  }
  return undefined;
}

/**
 * Parse boolean value from query
 */
export function parseBoolean(value: unknown): boolean | undefined {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

/**
 * Parse ID from query
 */
export function parseId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^c[a-z0-9]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse all query parameters for listing sessions
 */
export function parseListSessionsQuery(query: {
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  bookId?: unknown;
  hostId?: unknown;
  includeEnded?: unknown;
}): SessionListQueryParams {
  return {
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
    status: parseStatus(query.status),
    bookId: parseId(query.bookId),
    hostId: parseId(query.hostId),
    includeEnded: parseBoolean(query.includeEnded) ?? false,
  };
}

/**
 * Build cache key for sessions list
 */
export function buildSessionsCacheKey(
  params: SessionListQueryParams,
  userId?: string
): string {
  const parts = [
    `${CacheKeyPrefix.USER}:sessions`,
    `p${params.page}`,
    `l${params.limit}`,
  ];
  if (params.status) parts.push(`s${params.status}`);
  if (params.bookId) parts.push(`b${params.bookId}`);
  if (params.hostId) parts.push(`h${params.hostId}`);
  if (params.includeEnded) parts.push("ended");
  if (userId) parts.push(`u${userId}`);
  return parts.join(":");
}

/**
 * Map host user to response format
 */
export function mapToSessionHostInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): SessionHostInfo {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map book to response format
 */
export function mapToSessionBookInfo(book: {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
}): SessionBookInfo {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Map database session to response format
 */
export function mapToSessionSummary(session: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currentPage: number;
  isPublic: boolean;
  allowChat: boolean;
  syncEnabled: boolean;
  maxParticipants: number;
  participantCount: number;
  scheduledAt: Date | null;
  startedAt: Date | null;
  host: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  };
  createdAt: Date;
}): SessionSummary {
  return {
    id: session.id,
    title: session.title,
    description: session.description,
    status: session.status,
    currentPage: session.currentPage,
    isPublic: session.isPublic,
    allowChat: session.allowChat,
    syncEnabled: session.syncEnabled,
    maxParticipants: session.maxParticipants,
    participantCount: session.participantCount,
    scheduledAt: formatDate(session.scheduledAt),
    startedAt: formatDate(session.startedAt),
    host: mapToSessionHostInfo(session.host),
    book: mapToSessionBookInfo(session.book),
    createdAt: formatDateRequired(session.createdAt),
  };
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Generate unique invite code
 */
export function generateInviteCode(): string {
  return nanoid(10);
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get sessions with filters
 */
async function getSessions(
  params: SessionListQueryParams,
  userId?: string
): Promise<{ sessions: SessionSummary[]; total: number }> {
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  // Filter by status
  if (params.status) {
    where.status = params.status;
  } else if (!params.includeEnded) {
    // By default, exclude ended and cancelled sessions
    where.status = {
      in: ["SCHEDULED", "ACTIVE", "PAUSED"],
    };
  }

  // Filter by book
  if (params.bookId) {
    where.bookId = params.bookId;
  }

  // Filter by host
  if (params.hostId) {
    where.hostId = params.hostId;
  }

  // Show public sessions OR user's own sessions
  if (userId) {
    where.OR = [{ isPublic: true }, { hostId: userId }];
  } else {
    where.isPublic = true;
  }

  const [sessions, total] = await Promise.all([
    db.readingSession.findMany({
      where,
      orderBy: [
        { status: "asc" }, // Active first
        { scheduledAt: "asc" },
        { createdAt: "desc" },
      ],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        currentPage: true,
        isPublic: true,
        allowChat: true,
        syncEnabled: true,
        maxParticipants: true,
        participantCount: true,
        scheduledAt: true,
        startedAt: true,
        createdAt: true,
        host: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
          },
        },
      },
    }),
    db.readingSession.count({ where }),
  ]);

  return {
    sessions: sessions.map(mapToSessionSummary),
    total,
  };
}

/**
 * Create a new reading session
 */
async function createSession(
  hostId: string,
  input: CreateSessionInput,
  _book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  }
): Promise<{ session: SessionSummary; inviteCode: string | null }> {
  const inviteCode = input.isPublic ? null : generateInviteCode();
  const status = input.scheduledAt ? "SCHEDULED" : "ACTIVE";
  const startedAt = input.scheduledAt ? null : new Date();

  const session = await db.readingSession.create({
    data: {
      hostId,
      bookId: input.bookId,
      title: input.title,
      description: input.description ?? null,
      status,
      isPublic: input.isPublic ?? true,
      maxParticipants: input.maxParticipants ?? 50,
      allowChat: input.allowChat ?? true,
      syncEnabled: input.syncEnabled ?? true,
      inviteCode,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      startedAt,
      participantCount: 1,
      peakParticipants: 1,
      participants: {
        create: {
          userId: hostId,
          isHost: true,
          isModerator: true,
          isActive: startedAt !== null,
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      currentPage: true,
      isPublic: true,
      allowChat: true,
      syncEnabled: true,
      maxParticipants: true,
      participantCount: true,
      scheduledAt: true,
      startedAt: true,
      createdAt: true,
      host: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
    },
  });

  return {
    session: mapToSessionSummary(session),
    inviteCode,
  };
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle GET requests - List sessions
 */
async function handleGet(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();

  try {
    // Try to authenticate (optional)
    let userId: string | undefined;
    const authResult = await authenticateRequest(req);
    if (authResult.success) {
      const user = await getUserByClerkId(authResult.user.userId);
      userId = user?.id;
    }

    // Parse query parameters
    const params = parseListSessionsQuery(req.query as Record<string, unknown>);

    // Check cache
    const cacheKey = buildSessionsCacheKey(params, userId);
    const cached = await cache.get<SessionListResponse>(cacheKey);
    if (cached) {
      logger.debug("Sessions list cache hit", { cacheKey });
      sendSuccess(res, cached);
      return;
    }

    // Get sessions from database
    const { sessions, total } = await getSessions(params, userId);
    const pagination = calculatePagination(params.page, params.limit, total);

    const response: SessionListResponse = {
      sessions,
      pagination,
    };

    // Cache the response
    await cache.set(cacheKey, response, { ttl: SESSIONS_CACHE_TTL });

    logger.info("Sessions listed", {
      userId,
      count: sessions.length,
      total,
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to list sessions", {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to list sessions", 500);
  }
}

/**
 * Handle POST requests - Create a new session
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();

  // Require authentication for POST
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    sendError(res, ErrorCodes.UNAUTHORIZED, "Authentication required", 401);
    return;
  }

  try {
    // Get user
    const user = await getUserByClerkId(authResult.user.userId);
    if (!user) {
      sendError(res, ErrorCodes.UNAUTHORIZED, "User not found", 401);
      return;
    }

    // Parse and validate request body
    const parseResult = createSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        firstError?.message ?? "Invalid input",
        400
      );
      return;
    }

    const input = parseResult.data;

    // Check that the book exists and belongs to the user (or is public)
    const book = await db.book.findFirst({
      where: {
        id: input.bookId,
        deletedAt: null,
        OR: [{ userId: user.id }, { isPublic: true }],
      },
      select: {
        id: true,
        title: true,
        author: true,
        coverImage: true,
      },
    });

    if (!book) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "Book not found or not accessible",
        404
      );
      return;
    }

    // Create the session
    const { session, inviteCode } = await createSession(user.id, input, book);

    // Invalidate cache for sessions list
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:sessions:*`);

    logger.info("Session created", {
      userId: user.id,
      sessionId: session.id,
      bookId: input.bookId,
      isPublic: input.isPublic,
      durationMs: Date.now() - startTime,
    });

    const response: CreateSessionResponse = {
      success: true,
      message: "Session created successfully",
      session,
      inviteCode,
    };

    sendSuccess(res, response, 201);
  } catch (error) {
    logger.error("Failed to create session", {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to create session", 500);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/sessions
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  switch (req.method) {
    case "GET":
      await handleGet(req, res);
      return;
    case "POST":
      await handlePost(req, res);
      return;
    default:
      sendError(
        res,
        ErrorCodes.METHOD_NOT_ALLOWED,
        `Method ${req.method} not allowed`,
        405
      );
  }
}

export default handler;
