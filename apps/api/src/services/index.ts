/**
 * Services Index
 *
 * Re-exports all services for convenient imports.
 */

// Database service
export {
  // Singleton client
  db,
  getDb,

  // Connection management
  ensureConnection,
  gracefulShutdown,
  isDbConnected,
  connect,
  disconnect,

  // Query helpers
  getUserByClerkId,
  getUserById,
  getBookById,
  getBookWithChapters,
  getReadingProgress,
  upsertReadingProgress,

  // Soft delete helpers
  withSoftDeleteFilter,
  softDeleteUser,
  softDeleteBook,

  // Transaction helpers
  withTransaction,
  batchTransaction,

  // Utilities object
  dbUtils,

  // Types
  type GetUserOptions,
  type GetBookOptions,
  type TransactionClient,
  type SoftDeletableModel,
} from "./db.js";
