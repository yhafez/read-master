/**
 * @read-master/database
 *
 * Prisma ORM and database utilities for Read Master.
 *
 * @example
 * ```typescript
 * import { prisma } from '@read-master/database';
 * import type { User, UserTier } from '@read-master/database';
 *
 * const user = await prisma.user.findUnique({
 *   where: { clerkId: 'user_123' }
 * });
 * ```
 */

// Re-export Prisma client and utilities
export { prisma, disconnect, connect, PrismaClient } from "./client";

// Re-export all generated Prisma types
export * from "@prisma/client";

// Export common type aliases for convenience
export type { User } from "@prisma/client";
