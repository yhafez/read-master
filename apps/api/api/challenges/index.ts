/**
 * GET /api/challenges - List challenges
 * POST /api/challenges - Create challenge (admin only for official challenges)
 *
 * GET endpoint:
 * - Returns available challenges (active, upcoming)
 * - Supports filtering by type, status
 * - Shows user's participation status
 * - Public endpoint (no auth required for viewing)
 *
 * POST endpoint:
 * - Create personal challenges (any user)
 * - Create official challenges (admin only)
 *
 * @example
 * ```bash
 * # List challenges
 * curl -X GET "/api/challenges?type=OFFICIAL&status=active"
 *
 * # Create personal challenge
 * curl -X POST /api/challenges \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"Read 10 books","type":"PERSONAL","goalType":"BOOKS_READ","goalValue":10}'
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { Prisma } from "@read-master/database";

import {
  withAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";

// ============================================================================
// Validation Schemas
// ============================================================================

const listChallengesSchema = z.object({
  type: z.enum(["OFFICIAL", "COMMUNITY", "PERSONAL", "SEASONAL"]).optional(),
  status: z.enum(["active", "upcoming", "past"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const createChallengeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  icon: z.string().max(50).optional(),
  badgeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  type: z.enum(["OFFICIAL", "COMMUNITY", "PERSONAL", "SEASONAL"]),
  goalType: z.enum([
    "BOOKS_READ",
    "PAGES_READ",
    "TIME_READING",
    "WORDS_READ",
    "STREAK_DAYS",
    "BOOKS_IN_GENRE",
    "FLASHCARDS_CREATED",
    "ASSESSMENTS_COMPLETED",
  ]),
  goalValue: z.number().int().positive(),
  goalUnit: z.string().max(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  xpReward: z.number().int().nonnegative().default(0),
  badgeIcon: z.string().optional(),
  tier: z
    .enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"])
    .default("COMMON"),
  visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]).default("PUBLIC"),
});

type ListChallengesQuery = z.infer<typeof listChallengesSchema>;

// ============================================================================
// Types
// ============================================================================

export interface ChallengeResponse {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  badgeColor: string | null;
  type: string;
  goalType: string;
  goalValue: number;
  goalUnit: string;
  startDate: string | null;
  endDate: string | null;
  duration: number | null;
  xpReward: number;
  badgeIcon: string | null;
  isOfficial: boolean;
  isRecurring: boolean;
  tier: string;
  visibility: string;
  participantCount: number;
  isParticipating: boolean;
  userProgress: number | null;
  isCompleted: boolean;
  createdAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildWhereClause(
  query: ListChallengesQuery,
  userId?: string
): Prisma.ChallengeWhereInput {
  const where: Prisma.ChallengeWhereInput = {
    isActive: true,
  };

  // Filter by type
  if (query.type) {
    where.type = query.type;
  }

  // Filter by status (active, upcoming, past)
  const now = new Date();
  if (query.status === "active") {
    where.OR = [
      { startDate: null, endDate: null }, // Always active
      { startDate: { lte: now }, endDate: { gte: now } }, // Within date range
      { startDate: { lte: now }, endDate: null }, // Started, no end
    ];
  } else if (query.status === "upcoming") {
    where.startDate = { gt: now };
  } else if (query.status === "past") {
    where.endDate = { lt: now };
  }

  // Personal challenges are only visible to their creator
  if (!userId) {
    where.type = { not: "PERSONAL" };
  }

  return where;
}

async function formatChallengeResponse(
  challenge: Prisma.ChallengeGetPayload<{
    include: { participants: true };
  }>,
  userId?: string
): Promise<ChallengeResponse> {
  const participantCount = challenge.participants.length;
  const userParticipation = userId
    ? challenge.participants.find((p) => p.userId === userId)
    : null;

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    icon: challenge.icon,
    badgeColor: challenge.badgeColor,
    type: challenge.type,
    goalType: challenge.goalType,
    goalValue: challenge.goalValue,
    goalUnit: challenge.goalUnit,
    startDate: challenge.startDate ? challenge.startDate.toISOString() : null,
    endDate: challenge.endDate ? challenge.endDate.toISOString() : null,
    duration: challenge.duration,
    xpReward: challenge.xpReward,
    badgeIcon: challenge.badgeIcon,
    isOfficial: challenge.isOfficial,
    isRecurring: challenge.isRecurring,
    tier: challenge.tier,
    visibility: challenge.visibility,
    participantCount,
    isParticipating: !!userParticipation,
    userProgress: userParticipation ? userParticipation.progress : null,
    isCompleted: userParticipation ? userParticipation.isCompleted : false,
    createdAt: challenge.createdAt.toISOString(),
  };
}

// ============================================================================
// Handlers
// ============================================================================

async function handleGet(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Validate query parameters
  const validation = listChallengesSchema.safeParse(req.query);
  if (!validation.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid query parameters",
      400,
      validation.error.flatten()
    );
    return;
  }

  const query = validation.data;
  const userId = req.auth?.userId;

  // Get user if authenticated
  let user = null;
  if (userId) {
    user = await getUserByClerkId(userId);
  }

  try {
    // Build where clause
    const where = buildWhereClause(query, user?.id);

    // Get challenges with pagination
    const [challenges, total] = await Promise.all([
      db.challenge.findMany({
        where,
        include: {
          participants: true,
        },
        orderBy: [
          { isOfficial: "desc" },
          { tier: "desc" },
          { createdAt: "desc" },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.challenge.count({ where }),
    ]);

    // Format responses
    const formattedChallenges = await Promise.all(
      challenges.map((c) => formatChallengeResponse(c, user?.id))
    );

    logger.info("Challenges listed", {
      userId: user?.id,
      count: challenges.length,
      total,
    });

    sendSuccess(res, {
      challenges: formattedChallenges,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    logger.error("Failed to list challenges", {
      userId: user?.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to list challenges", 500);
  }
}

async function handlePost(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  // Get user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Validate request body
  const validation = createChallengeSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request body",
      400,
      validation.error.flatten()
    );
    return;
  }

  const input = validation.data;

  // Check if user can create official challenges (admin only)
  if (
    (input.type === "OFFICIAL" || input.type === "SEASONAL") &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "Only admins can create official challenges",
      403
    );
    return;
  }

  try {
    // Create challenge
    const challenge = await db.challenge.create({
      data: {
        title: input.title,
        description: input.description,
        icon: input.icon ?? null,
        badgeColor: input.badgeColor ?? null,
        type: input.type,
        goalType: input.goalType,
        goalValue: input.goalValue,
        goalUnit: input.goalUnit,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        duration: input.duration ?? null,
        xpReward: input.xpReward,
        badgeIcon: input.badgeIcon ?? null,
        isOfficial: input.type === "OFFICIAL" || input.type === "SEASONAL",
        tier: input.tier,
        visibility: input.visibility,
      },
      include: {
        participants: true,
      },
    });

    logger.info("Challenge created", {
      userId: user.id,
      challengeId: challenge.id,
      type: input.type,
    });

    const response = await formatChallengeResponse(challenge, user.id);
    sendSuccess(res, response, 201);
  } catch (error) {
    logger.error("Failed to create challenge", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create challenge",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === "GET") {
    await handleGet(req, res);
  } else if (req.method === "POST") {
    await handlePost(req, res);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET or POST.",
      405
    );
  }
}

// Export with conditional auth (GET with optional auth, POST requires auth)
export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    // GET requests support optional auth
    const authReq = await optionalAuth(req);
    return handler(authReq as AuthenticatedRequest, res);
  } else {
    // POST requests require authentication
    return withAuth(handler)(req, res);
  }
}
