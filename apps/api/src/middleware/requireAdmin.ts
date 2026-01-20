import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import type { UserRole } from "@read-master/shared/types";
import { authenticateRequest, type AuthenticatedRequest } from "./auth.js";
import { logger } from "../utils/logger.js";

/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides middleware functions to restrict API endpoints based on user roles:
 * - requireAdmin: ADMIN and SUPER_ADMIN only
 * - requireModerator: MODERATOR, ADMIN, and SUPER_ADMIN
 * - requireRole: Custom role requirements
 */

/**
 * Role hierarchy for permission checks
 * Higher numbers have more permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Extended request with user and role info
 */
export type RoleAuthenticatedRequest = AuthenticatedRequest & {
  userRole: UserRole;
  userDbId: string;
};

/**
 * Check if a user's role meets the minimum required role
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user has sufficient permissions
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get user from database with role info
 *
 * @param clerkId - Clerk user ID
 * @returns User with role or null if not found
 */
async function getUserWithRole(clerkId: string) {
  const user = await prisma.user.findFirst({
    where: {
      clerkId,
      deletedAt: null,
    },
    select: {
      id: true,
      clerkId: true,
      email: true,
      username: true,
      role: true,
      tier: true,
    },
  });

  return user;
}

/**
 * Log admin access attempt
 *
 * For now, this logs to the application logger.
 * TODO: Store in database audit log table when available.
 *
 * @param userId - Database user ID
 * @param clerkId - Clerk user ID
 * @param role - User's role
 * @param action - Action being performed
 * @param endpoint - API endpoint being accessed
 * @param success - Whether access was granted
 * @param metadata - Additional metadata
 */
async function logAdminAccess(
  userId: string,
  clerkId: string,
  role: UserRole,
  action: string,
  endpoint: string,
  success: boolean,
  metadata?: Record<string, unknown>
) {
  logger.info("Admin access attempt", {
    userId,
    clerkId,
    role,
    action,
    endpoint,
    success,
    ...metadata,
  });
}

/**
 * Higher-order function that requires a specific minimum role
 *
 * Usage:
 * ```ts
 * export default requireRole('ADMIN', async (req, res) => {
 *   const { userId, userRole } = req;
 *   // Handler logic here - user is guaranteed to have ADMIN or higher
 * });
 * ```
 *
 * @param minimumRole - Minimum required role (USER, MODERATOR, ADMIN, SUPER_ADMIN)
 * @param handler - The handler function to wrap
 * @returns Wrapped handler that requires the specified role
 */
export function requireRole(
  minimumRole: UserRole,
  handler: (
    req: RoleAuthenticatedRequest,
    res: VercelResponse
  ) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    // First, authenticate the user
    const authResult = await authenticateRequest(req);

    if (!authResult.success) {
      res.status(authResult.statusCode).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: authResult.error,
        },
      });
      return;
    }

    const { userId: clerkId } = authResult.user;

    // Get user with role from database
    const user = await getUserWithRole(clerkId);

    if (!user) {
      // User exists in Clerk but not in our database
      logger.warn("User not found in database", { clerkId });

      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "User not found in system",
        },
      });
      return;
    }

    // Check if user has sufficient role
    const hasPermission = hasRole(user.role, minimumRole);

    // Log the access attempt
    await logAdminAccess(
      user.id,
      clerkId,
      user.role,
      `ACCESS_${minimumRole}_ENDPOINT`,
      req.url ?? "unknown",
      hasPermission,
      {
        method: req.method,
        requiredRole: minimumRole,
        userRole: user.role,
      }
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `This endpoint requires ${minimumRole} role or higher. Your current role: ${user.role}`,
        },
      });
      return;
    }

    // Attach user info to request
    const roleAuthReq = req as RoleAuthenticatedRequest;
    roleAuthReq.auth = authResult.user;
    roleAuthReq.userRole = user.role;
    roleAuthReq.userDbId = user.id;

    await handler(roleAuthReq, res);
  };
}

/**
 * Require ADMIN or SUPER_ADMIN role
 *
 * Usage:
 * ```ts
 * export default requireAdmin(async (req, res) => {
 *   const { userId, userRole } = req;
 *   // Handler logic here - user is guaranteed to be ADMIN or SUPER_ADMIN
 * });
 * ```
 *
 * @param handler - The handler function to wrap
 * @returns Wrapped handler that requires ADMIN role
 */
export function requireAdmin(
  handler: (
    req: RoleAuthenticatedRequest,
    res: VercelResponse
  ) => Promise<void> | void
) {
  return requireRole("ADMIN", handler);
}

/**
 * Require MODERATOR, ADMIN, or SUPER_ADMIN role
 *
 * Usage:
 * ```ts
 * export default requireModerator(async (req, res) => {
 *   const { userId, userRole } = req;
 *   // Handler logic here - user is at least a MODERATOR
 * });
 * ```
 *
 * @param handler - The handler function to wrap
 * @returns Wrapped handler that requires MODERATOR role
 */
export function requireModerator(
  handler: (
    req: RoleAuthenticatedRequest,
    res: VercelResponse
  ) => Promise<void> | void
) {
  return requireRole("MODERATOR", handler);
}

/**
 * Require SUPER_ADMIN role only
 *
 * Use this for the most sensitive operations like:
 * - Deleting users
 * - Modifying system settings
 * - Accessing sensitive logs
 *
 * Usage:
 * ```ts
 * export default requireSuperAdmin(async (req, res) => {
 *   const { userId, userRole } = req;
 *   // Handler logic here - user is guaranteed to be SUPER_ADMIN
 * });
 * ```
 *
 * @param handler - The handler function to wrap
 * @returns Wrapped handler that requires SUPER_ADMIN role
 */
export function requireSuperAdmin(
  handler: (
    req: RoleAuthenticatedRequest,
    res: VercelResponse
  ) => Promise<void> | void
) {
  return requireRole("SUPER_ADMIN", handler);
}

/**
 * Check if a user has a specific role (utility function for use in handlers)
 *
 * @param clerkId - Clerk user ID
 * @param minimumRole - Minimum required role
 * @returns true if user has the role, false otherwise
 */
export async function checkUserRole(
  clerkId: string,
  minimumRole: UserRole
): Promise<boolean> {
  const user = await getUserWithRole(clerkId);
  if (!user) {
    return false;
  }
  return hasRole(user.role, minimumRole);
}
