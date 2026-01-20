/**
 * Database types re-exported from @read-master/database
 *
 * This file re-exports all Prisma-generated types from the database package
 * so that they can be used throughout the application without directly
 * depending on @prisma/client.
 *
 * @example
 * ```typescript
 * import type { User, Book, ReadingStatus } from '@read-master/shared/types';
 *
 * const getUser = (user: User): string => user.username;
 * ```
 */

// Re-export all Prisma types from the database package
export type {
  // User and authentication
  User,
  UserTier,
  UserRole,

  // Book and content
  Book,
  Chapter,
  BookSource,
  FileType,
  ReadingStatus,

  // Reading progress and annotations
  ReadingProgress,
  Annotation,
  AnnotationType,

  // AI-generated content
  PreReadingGuide,
  Assessment,
  AssessmentType,

  // Flashcards and SRS
  Flashcard,
  FlashcardReview,
  FlashcardType,
  FlashcardStatus,

  // Gamification
  UserStats,
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementTier,

  // Curriculums
  Curriculum,
  CurriculumItem,
  CurriculumFollow,
  Visibility,

  // Social features
  Follow,
  ReadingGroup,
  ReadingGroupMember,
  GroupRole,
  GroupDiscussion,
  DiscussionReply,

  // Forum
  ForumCategory,
  ForumPost,
  ForumReply,
  ForumVote,

  // System logging
  AIUsageLog,
  AuditLog,
} from "@read-master/database";
