/**
 * Prisma Client Singleton
 *
 * Creates a single Prisma client instance for the entire application.
 * In development, the client is stored on globalThis to prevent
 * multiple instances during hot reloading.
 *
 * @see https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma Client instance
 *
 * Use this for all database operations:
 * ```typescript
 * import { prisma } from '@read-master/database/client';
 *
 * const users = await prisma.user.findMany();
 * ```
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Disconnect from the database
 * Use this during graceful shutdown
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Connect to the database
 * Usually not needed as Prisma connects lazily
 */
export async function connect(): Promise<void> {
  await prisma.$connect();
}

// Re-export PrismaClient for type usage
export { PrismaClient };
