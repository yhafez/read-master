/**
 * @read-master/shared
 *
 * The main entry point for the shared package. This module provides centralized
 * access to all shared types, schemas, utilities, and constants used across
 * the Read Master platform.
 *
 * ## Import Patterns
 *
 * ### Main Entry Point (this module)
 * Use for convenient access to commonly used utilities:
 * ```typescript
 * import {
 *   // String utilities
 *   truncate, slugify, capitalize,
 *
 *   // Moderation utilities
 *   containsProfanity, validateNoProfanity,
 *
 *   // SRS utilities
 *   calculateNextReview, createDefaultSrsState, formatInterval,
 *
 *   // Date utilities
 *   formatRelativeTime, timeAgo, formatDuration,
 *
 *   // Bloom's taxonomy
 *   categorizeQuestion, calculateBloomsBreakdown,
 *
 *   // Lexile/reading level
 *   estimateTextDifficulty, getReadingLevelRecommendation
 * } from '@read-master/shared';
 * ```
 *
 * ### Subpath Imports (recommended for large imports)
 * Use subpaths for organized imports when you need many items:
 *
 * ```typescript
 * // Types (database models and API types)
 * import type { User, Book, ApiResponse, BookDetailResponse } from '@read-master/shared/types';
 *
 * // Validation schemas
 * import { createBookSchema, bookQuerySchema, bookSchemas } from '@read-master/shared/schemas';
 * import { createAnnotationSchema, annotationSchemas } from '@read-master/shared/schemas';
 * import { reviewFlashcardSchema, flashcardSchemas } from '@read-master/shared/schemas';
 *
 * // Environment validation
 * import { validateEnv, envSchema } from '@read-master/shared/env';
 *
 * // Constants
 * import { TIER_LIMITS, ACHIEVEMENTS, SUPPORTED_LANGUAGES } from '@read-master/shared/constants';
 * ```
 *
 * ## Module Organization
 *
 * - **types**: Database models (Prisma) and API request/response types
 * - **schemas**: Zod validation schemas for all API operations
 * - **utils**: Utility functions (string, moderation, SRS, dates, blooms, lexile)
 * - **constants**: Tier limits, achievements, language configuration
 * - **env**: Environment variable validation
 *
 * @packageDocumentation
 */

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * String manipulation utilities
 * @example
 * ```typescript
 * import { truncate, slugify, capitalize } from '@read-master/shared';
 * ```
 */
export * from "./utils/string";

/**
 * Content moderation utilities (profanity filtering)
 * @example
 * ```typescript
 * import { containsProfanity, validateNoProfanity } from '@read-master/shared';
 * ```
 */
export * from "./utils/moderation";

/**
 * SM-2 Spaced Repetition System utilities
 * @example
 * ```typescript
 * import { calculateNextReview, createDefaultSrsState, formatInterval } from '@read-master/shared';
 * ```
 */
export * from "./utils/srs";

/**
 * Date and timezone utilities
 * @example
 * ```typescript
 * import { formatRelativeTime, timeAgo, formatDuration, nowUTC } from '@read-master/shared';
 * ```
 */
export * from "./utils/dates";

/**
 * Bloom's Taxonomy utilities for educational assessments
 * @example
 * ```typescript
 * import { categorizeQuestion, calculateBloomsBreakdown, BLOOMS_LEVELS } from '@read-master/shared';
 * ```
 */
export * from "./utils/blooms";

/**
 * Reading level and Lexile estimation utilities
 * @example
 * ```typescript
 * import { estimateTextDifficulty, getReadingLevelRecommendation } from '@read-master/shared';
 * ```
 */
export * from "./utils/lexile";

// ============================================================================
// TYPE RE-EXPORTS
// ============================================================================

/**
 * Database types (Prisma models and enums)
 *
 * These are re-exported for convenience. For full type access,
 * import from '@read-master/shared/types'.
 *
 * @example
 * ```typescript
 * import type { User, Book, ReadingStatus } from '@read-master/shared';
 * ```
 */
export type {
  // User types
  User,
  UserTier,

  // Book types
  Book,
  Chapter,
  BookSource,
  FileType,
  ReadingStatus,

  // Reading types
  ReadingProgress,
  Annotation,
  AnnotationType,
  PreReadingGuide,

  // Assessment types
  Assessment,
  AssessmentType,

  // Flashcard types
  Flashcard,
  FlashcardReview,
  FlashcardType,
  FlashcardStatus,

  // Gamification types
  UserStats,
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,

  // Curriculum types
  Curriculum,
  CurriculumItem,
  CurriculumFollow,
  Visibility,

  // Social types
  Follow,
  ReadingGroup,
  ReadingGroupMember,
  GroupDiscussion,
  DiscussionReply,
  GroupRole,

  // Forum types
  ForumCategory,
  ForumPost,
  ForumReply,
  ForumVote,

  // System types
  AIUsageLog,
  AuditLog,
} from "./types/database";

/**
 * API types (request/response types)
 *
 * These are re-exported for convenience. For full type access,
 * import from '@read-master/shared/types'.
 *
 * @example
 * ```typescript
 * import type { ApiResponse, BookDetailResponse, FlashcardResponse } from '@read-master/shared';
 * ```
 */
export type {
  // Common API types
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  SortParams,

  // User API types
  UserProfileResponse,
  UserStatsResponse,
  UserAchievementResponse,
  UserActivityItem,
  UpdateUserPreferencesRequest,

  // Book API types
  BookListParams,
  BookSummaryResponse,
  BookDetailResponse,
  ChapterResponse,
  ReadingProgressResponse,
  PreReadingGuideResponse,
  VocabularyItem,
  KeyArgumentItem,
  ChapterSummaryItem,
  BookUploadRequest,
  BookImportUrlRequest,
  BookPasteRequest,
  BookUpdateRequest,

  // Annotation API types
  AnnotationResponse,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,

  // Flashcard API types
  FlashcardResponse,
  CreateFlashcardRequest,
  UpdateFlashcardRequest,
  ReviewFlashcardRequest,
  ReviewFlashcardResponse,
  FlashcardStatsResponse,

  // Assessment API types
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentResponse,
  BloomsBreakdown,
  GenerateAssessmentRequest,
  SubmitAssessmentRequest,

  // AI API types
  AiExplainRequest,
  AiAskRequest,
  AiComprehensionCheckRequest,
  AiGenerateFlashcardsRequest,
  AiGradeAnswerRequest,
  AiGradeAnswerResponse,

  // Social API types
  FollowUserRequest,
  UserFollowResponse,
  ActivityFeedItem,
  ReadingGroupResponse,
  CreateReadingGroupRequest,
  GroupDiscussionResponse,

  // Forum API types
  ForumCategoryResponse,
  ForumPostResponse,
  ForumReplyResponse,
  CreateForumPostRequest,
  CreateForumReplyRequest,
  ForumVoteRequest,

  // Curriculum API types
  CurriculumResponse,
  CurriculumItemResponse,
  CurriculumProgressResponse,
  CreateCurriculumRequest,
  AddCurriculumItemRequest,

  // Leaderboard API types
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardParams,

  // TTS API types
  TtsSpeakRequest,
  TtsVoicesResponse,
  TtsVoice,
  TtsDownloadRequest,
  TtsDownloadStatusResponse,
} from "./types/api";

// ============================================================================
// SCHEMA RE-EXPORTS
// ============================================================================

/**
 * Book validation schemas
 *
 * For full schema access, import from '@read-master/shared/schemas'.
 *
 * @example
 * ```typescript
 * import { createBookUploadSchema, bookQuerySchema, bookSchemas } from '@read-master/shared';
 * ```
 */
export {
  // Core book schemas
  createBookUploadSchema,
  createBookUrlSchema,
  createBookPasteSchema,
  createBookGoogleBooksSchema,
  createBookOpenLibrarySchema,
  updateBookSchema,
  bookQuerySchema,
  bookIdSchema,
  externalBookSearchSchema,
  addFromLibrarySchema,
  updateReadingProgressSchema,
  // Collection object
  bookSchemas,
} from "./schemas/books";

/**
 * Annotation validation schemas
 *
 * @example
 * ```typescript
 * import { createAnnotationSchema, annotationQuerySchema, annotationSchemas } from '@read-master/shared';
 * ```
 */
export {
  createAnnotationSchema,
  updateAnnotationSchema,
  annotationQuerySchema,
  annotationIdParamsSchema,
  bookAnnotationIdParamsSchema,
  bulkDeleteAnnotationsSchema,
  exportAnnotationsSchema,
  annotationSchemas,
} from "./schemas/annotations";

/**
 * Flashcard validation schemas
 *
 * @example
 * ```typescript
 * import { createFlashcardSchema, reviewFlashcardSchema, flashcardSchemas } from '@read-master/shared';
 * ```
 */
export {
  createFlashcardSchema,
  createFlashcardsSchema,
  updateFlashcardSchema,
  reviewFlashcardSchema,
  flashcardQuerySchema,
  dueFlashcardsQuerySchema,
  flashcardIdParamsSchema,
  bookFlashcardIdParamsSchema,
  bulkUpdateFlashcardStatusSchema,
  bulkDeleteFlashcardsSchema,
  flashcardStatsSchema,
  generateFlashcardsSchema,
  flashcardSchemas,
} from "./schemas/flashcards";

/**
 * Forum validation schemas
 *
 * @example
 * ```typescript
 * import { createForumPostSchema, forumVoteSchema, forumSchemas } from '@read-master/shared';
 * ```
 */
export {
  createForumPostSchema,
  createForumReplySchema,
  forumPostQuerySchema,
  forumReplyQuerySchema,
  voteOnPostSchema,
  voteOnReplySchema,
  reportContentSchema,
  forumSchemas,
} from "./schemas/forum";

/**
 * Assessment validation schemas
 *
 * @example
 * ```typescript
 * import { generateAssessmentSchema, submitAssessmentSchema, assessmentSchemas } from '@read-master/shared';
 * ```
 */
export {
  generateAssessmentSchema,
  submitAssessmentSchema,
  gradeAnswerSchema,
  assessmentQuerySchema,
  assessmentSchemas,
} from "./schemas/assessments";

/**
 * Curriculum validation schemas
 *
 * @example
 * ```typescript
 * import { createCurriculumSchema, curriculumSchemas } from '@read-master/shared';
 * ```
 */
export {
  createCurriculumSchema,
  updateCurriculumSchema,
  addCurriculumItemSchema,
  updateCurriculumItemSchema,
  curriculumQuerySchema,
  browseCurriculumsQuerySchema,
  curriculumSchemas,
} from "./schemas/curriculums";

// ============================================================================
// CONSTANTS RE-EXPORTS
// ============================================================================

/**
 * Tier limits and subscription configuration
 *
 * @example
 * ```typescript
 * import { TIER_LIMITS, getTierLimits, canPerformAction } from '@read-master/shared';
 * ```
 */
export {
  // Constants
  TIER_LIMITS,
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  SCHOLAR_TIER_LIMITS,
  SUBSCRIPTION_PRICING,
  AI_CREDITS_PRICING,
  MAX_UPLOAD_SIZE_BYTES,
  // Functions
  getTierLimits,
  canPerformAction,
  isWithinLimit,
  getRemainingQuota,
  isTierHigherOrEqual,
  getMinimumTierForAction,
  // Types
  type TierLimits,
  type TierAction,
  // Utility object
  limitUtils,
} from "./constants/limits";

/**
 * Achievement definitions and gamification
 *
 * @example
 * ```typescript
 * import { ACHIEVEMENTS, calculateLevel, checkAchievementCriteria } from '@read-master/shared';
 * ```
 */
export {
  // Achievement collections
  ACHIEVEMENTS,
  READING_ACHIEVEMENTS,
  STREAK_ACHIEVEMENTS,
  LEARNING_ACHIEVEMENTS,
  SOCIAL_ACHIEVEMENTS,
  MILESTONE_ACHIEVEMENTS,
  ACHIEVEMENT_COUNTS,
  // Level system
  LEVEL_THRESHOLDS,
  XP_PER_LEVEL_AFTER_10,
  GRAND_MASTER_TITLE,
  XP_REWARDS,
  // Functions
  getAchievementByCode,
  getAchievementsByCategory,
  getAchievementsByTier,
  getActiveAchievements,
  calculateLevel,
  getXPForLevel,
  getTitleForLevel,
  checkAchievementCriteria,
  getUnlockableAchievements,
  calculateTotalXP,
  // Types
  type AchievementCriteriaType,
  type AchievementCriterion,
  type TimeBasedCriterion,
  type AchievementDefinition,
  type AchievementCheckStats,
  // Utility object
  achievementUtils,
} from "./constants/achievements";

/**
 * Language and internationalization configuration
 *
 * @example
 * ```typescript
 * import { SUPPORTED_LANGUAGES, isRtlLanguage, getLanguageInfo } from '@read-master/shared';
 * ```
 */
export {
  // Language collections
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  LANGUAGES_BY_CODE,
  RTL_LANGUAGE_CODES,
  // Defaults
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_LOCALE,
  // Individual languages
  ENGLISH,
  ARABIC,
  SPANISH,
  JAPANESE,
  CHINESE,
  TAGALOG,
  // Formatting
  DATE_FORMAT_STYLES,
  TIME_FORMAT_STYLES,
  NUMBER_LOCALES,
  FONT_STACKS,
  DYSLEXIA_FONT,
  // Functions
  isSupportedLanguage,
  getLanguageInfo,
  isRtlLanguage,
  getTextDirection,
  getFullLocale,
  getEnabledLanguages,
  getLanguageOptions,
  parseLanguageCode,
  getFontStack,
  formatNumber,
  formatLocalizedDate,
  formatLocalizedTime,
  // Types
  type SupportedLanguageCode,
  type LanguageInfo,
  type TextDirection,
  // Utility object
  languageUtils,
} from "./constants/languages";

// ============================================================================
// NOTES ON SUBPATH EXPORTS
// ============================================================================

/**
 * This package also provides subpath exports for more organized imports:
 *
 * - `@read-master/shared/types` - All database and API types
 * - `@read-master/shared/schemas` - All Zod validation schemas
 * - `@read-master/shared/constants` - All constants and configuration
 * - `@read-master/shared/env` - Environment variable validation
 *
 * Use subpath imports when you need:
 * - Many items from one category
 * - Items not re-exported in this main module
 * - Better tree-shaking in your bundler
 */
