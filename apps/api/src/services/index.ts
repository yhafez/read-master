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

// Book parsing service
export {
  // EPUB parsing functions
  parseEPUB,
  parseEPUBFromBuffer,
  isValidEPUB,
  getEPUBExtension,

  // PDF parsing functions
  parsePDF,
  parsePDFFromBuffer,
  isValidPDF,
  getPDFExtension,

  // DOCX parsing functions
  parseDOCX,
  parseDOCXFromBuffer,
  isValidDOCX,
  getDOCXExtension,

  // Utility functions
  countWords,
  stripHtmlTags,
  calculateReadingTime,
  generateContentHash,

  // Namespaced exports
  bookParser,
  bookUtils,
  pdfParser,
  docxParser,

  // Constants
  AVERAGE_READING_WPM,
  EPUB_MIME_TYPES,
  PDF_MIME_TYPES,
  DOCX_MIME_TYPES,
  DEFAULT_PARSE_OPTIONS,
  DEFAULT_PDF_PARSE_OPTIONS,
  DEFAULT_DOCX_PARSE_OPTIONS,

  // Types
  type BookMetadata,
  type ChapterInfo,
  type CoverImage,
  type ParsedBook,
  type ParseOptions,
  type ParseResult,
  type PDFMetadata,
  type PDFSection,
  type ParsedPDF,
  type PDFParseOptions,
  type DOCXMetadata,
  type DOCXSection,
  type ParsedDOCX,
  type DOCXParseOptions,
  type DOCXParseMessage,
} from "./books.js";

// Google Books API service
export {
  // Search functions
  searchBooks,
  searchByISBN,
  searchByAuthor,
  searchByTitle,

  // Details function
  getBookDetails,

  // Utility functions
  getBestImageUrl,
  isGoogleBooksConfigured,

  // Cache invalidation
  invalidateSearchCache,
  invalidateDetailsCache,

  // Service objects
  googleBooks,
  googleBooksUtils,

  // Error class
  GoogleBooksError,

  // Constants
  GOOGLE_BOOKS_API_BASE,
  DEFAULT_SEARCH_OPTIONS,
  MAX_RESULTS_LIMIT,
  SEARCH_CACHE_TTL,
  DETAILS_CACHE_TTL,

  // Types
  type GoogleBookMetadata,
  type GoogleBooksSearchOptions,
  type GoogleBooksSearchResult,
} from "./googleBooks.js";

// Open Library API service
export {
  // Search functions
  searchOpenLibrary,
  searchOpenLibraryByISBN,
  searchOpenLibraryByAuthor,
  searchOpenLibraryByTitle,

  // Details functions
  getOpenLibraryWork,
  getOpenLibraryEdition,
  getOpenLibraryBookContent,

  // Utility functions
  getOpenLibraryCoverUrl,
  getBestOpenLibraryCoverUrl,

  // Cache invalidation
  invalidateOpenLibrarySearchCache,
  invalidateOpenLibraryWorkCache,
  invalidateOpenLibraryEditionCache,

  // Service objects
  openLibrary,
  openLibraryUtils,

  // Error class
  OpenLibraryError,

  // Constants
  OPEN_LIBRARY_API_BASE,
  INTERNET_ARCHIVE_BASE,
  COVER_IMAGE_BASE,
  DEFAULT_OL_SEARCH_OPTIONS,
  MAX_OL_RESULTS_LIMIT,
  OL_SEARCH_CACHE_TTL,
  OL_DETAILS_CACHE_TTL,

  // Types
  type OpenLibraryBookMetadata,
  type OpenLibrarySearchOptions,
  type OpenLibrarySearchResult,
  type OpenLibraryBookContent,
} from "./openLibrary.js";

// AI service (Vercel AI SDK with Anthropic Claude)
export {
  // Core functions
  completion,
  streamCompletion,
  complete,
  stream,

  // Client management
  getAnthropicClient,
  getModel,
  isAIAvailable,
  resetClient,

  // Token and cost utilities
  extractUsage,
  calculateCost,
  estimateTokens,

  // Logging
  logAIOperation,
  logAIError,

  // Utility functions
  buildSystemPrompt,
  formatBookContext,

  // Service objects
  ai,

  // Constants
  CLAUDE_PRICING,

  // Types
  type AIOperation,
  type ReadingLevel,
  type AICompletionOptions,
  type TokenUsage,
  type CostCalculation,
  type AICompletionResult,
  type AIStreamResult,
} from "./ai.js";
