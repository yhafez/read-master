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

// Redis cache service
export {
  // Core cache operations
  cache,
  get as cacheGet,
  set as cacheSet,
  del as cacheDel,
  delMany as cacheDelMany,
  exists as cacheExists,
  expire as cacheExpire,
  ttl as cacheTtl,

  // Advanced cache operations
  getOrSet,
  mget,
  mset,
  incr,
  decr,

  // Cache invalidation
  invalidatePattern,
  invalidateUserCache,
  invalidateBookCache,

  // Cache key builders
  buildKey,
  userKey,
  bookKey,
  progressKey,
  guideKey,
  searchKey,
  leaderboardKey,

  // Client management
  getRedisClient,
  isRedisAvailable,
  resetRedisClient,

  // Higher-order utilities
  withCache,
  withInvalidation,

  // Utilities object
  cacheUtils,

  // Constants
  CacheKeyPrefix,
  CacheTTL,

  // Types
  type CacheSetOptions,
  type CacheGetOptions,
  type CacheResult,
  type CacheKeyPrefixType,
  type CacheTTLType,
} from "./redis.js";

// R2 Storage service
export {
  // Core storage operations
  storage,
  uploadFile,
  getFile,
  deleteFile,
  deleteFiles,
  getFileInfo,
  fileExists,
  listFiles,
  copyFile,

  // Signed URL generation
  getSignedDownloadUrl,
  getSignedUploadUrl,
  getSignedUrl,

  // Key builders
  buildBookKey,
  buildCoverKey,
  buildAudioKey,
  buildAvatarKey,
  buildTempKey,
  getFilenameFromKey,
  getExtension,
  inferContentType,

  // Client management
  getStorageClient,
  getBucketName,
  getPublicUrlBase,
  isStorageAvailable,
  resetStorageClient,

  // Validation helpers
  isValidFileSize,
  hasAllowedExtension,

  // Utilities object
  storageUtils,

  // Constants
  StorageNamespace,
  MaxFileSize,
  ContentTypes,
  BookExtensions,
  ImageExtensions,
  AudioExtensions,

  // Types
  type UploadOptions,
  type SignedUrlOptions,
  type ListOptions,
  type UploadResult,
  type GetFileResult,
  type FileInfo,
  type ListResult,
  type StorageNamespaceType,
} from "./storage.js";
