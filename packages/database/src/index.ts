/**
 * @read-master/database
 *
 * Prisma ORM and database utilities for Read Master.
 *
 * @example
 * ```typescript
 * import { prisma } from '@read-master/database';
 * import type { User, Book, Chapter, ReadingProgress, Annotation } from '@read-master/database';
 * import type { PreReadingGuide, Assessment, AssessmentType } from '@read-master/database';
 * import type { Flashcard, FlashcardReview, FlashcardType, FlashcardStatus } from '@read-master/database';
 * import type { UserStats, Achievement, UserAchievement } from '@read-master/database';
 * import type { AchievementCategory, AchievementTier } from '@read-master/database';
 * import type { Curriculum, CurriculumItem, CurriculumFollow, Visibility } from '@read-master/database';
 * import type { BookSource, FileType, ReadingStatus, AnnotationType } from '@read-master/database';
 *
 * // Fetch user with books
 * const user = await prisma.user.findUnique({
 *   where: { clerkId: 'user_123' },
 *   include: { books: true }
 * });
 *
 * // Fetch book with chapters and pre-reading guide
 * const book = await prisma.book.findUnique({
 *   where: { id: 'book_123' },
 *   include: { chapters: true, preReadingGuide: true }
 * });
 *
 * // Upsert reading progress (unique per user+book)
 * const progress = await prisma.readingProgress.upsert({
 *   where: { userId_bookId: { userId: 'user_123', bookId: 'book_123' } },
 *   update: { currentPosition: 5000, percentage: 25.5 },
 *   create: { userId: 'user_123', bookId: 'book_123', currentPosition: 0 }
 * });
 *
 * // Create annotation (highlight, note, or bookmark)
 * const annotation = await prisma.annotation.create({
 *   data: {
 *     userId: 'user_123',
 *     bookId: 'book_123',
 *     type: 'HIGHLIGHT',
 *     startOffset: 100,
 *     endOffset: 200,
 *     selectedText: 'Important passage',
 *     color: '#FFFF00'
 *   }
 * });
 *
 * // Upsert pre-reading guide (unique per book)
 * const guide = await prisma.preReadingGuide.upsert({
 *   where: { bookId: 'book_123' },
 *   update: {
 *     vocabulary: [{ term: 'epistemology', definition: 'Theory of knowledge' }],
 *     historicalContext: 'Written during the Enlightenment...'
 *   },
 *   create: {
 *     bookId: 'book_123',
 *     vocabulary: [{ term: 'epistemology', definition: 'Theory of knowledge' }],
 *     keyArguments: [{ argument: 'Main thesis', explanation: 'The author argues...' }],
 *     historicalContext: 'Written during the Enlightenment...'
 *   }
 * });
 *
 * // Create assessment
 * const assessment = await prisma.assessment.create({
 *   data: {
 *     userId: 'user_123',
 *     bookId: 'book_123',
 *     type: 'BOOK_ASSESSMENT',
 *     questions: [
 *       { id: 'q1', type: 'multiple_choice', question: 'What is the main theme?', bloomsLevel: 'understand' }
 *     ],
 *     bloomsBreakdown: { remember: 20, understand: 30, apply: 20, analyze: 15, evaluate: 10, create: 5 }
 *   }
 * });
 *
 * // Create flashcard with SM-2 algorithm defaults
 * const flashcard = await prisma.flashcard.create({
 *   data: {
 *     userId: 'user_123',
 *     bookId: 'book_123',
 *     front: 'What is the main argument of Chapter 1?',
 *     back: 'The author argues that knowledge is inherently contextual...',
 *     type: 'COMPREHENSION',
 *     status: 'NEW',
 *     easeFactor: 2.5, // SM-2 default
 *     interval: 0,
 *     repetitions: 0,
 *     dueDate: new Date()
 *   }
 * });
 *
 * // Fetch due flashcards for review
 * const dueCards = await prisma.flashcard.findMany({
 *   where: {
 *     userId: 'user_123',
 *     dueDate: { lte: new Date() },
 *     status: { not: 'SUSPENDED' },
 *     deletedAt: null
 *   },
 *   orderBy: { dueDate: 'asc' }
 * });
 *
 * // Record a flashcard review
 * const review = await prisma.flashcardReview.create({
 *   data: {
 *     flashcardId: 'card_123',
 *     rating: 3, // 1=Again, 2=Hard, 3=Good, 4=Easy
 *     responseTimeMs: 3500,
 *     previousEaseFactor: 2.5,
 *     previousInterval: 1,
 *     previousRepetitions: 1,
 *     newEaseFactor: 2.5,
 *     newInterval: 6,
 *     newRepetitions: 2
 *   }
 * });
 *
 * // Upsert user stats (unique per user)
 * const stats = await prisma.userStats.upsert({
 *   where: { userId: 'user_123' },
 *   update: {
 *     totalXP: { increment: 100 },
 *     booksCompleted: { increment: 1 },
 *     currentStreak: 5,
 *     lastActivityDate: new Date()
 *   },
 *   create: {
 *     userId: 'user_123',
 *     totalXP: 100,
 *     level: 1
 *   }
 * });
 *
 * // Fetch XP leaderboard (top users by XP)
 * const leaderboard = await prisma.userStats.findMany({
 *   where: { user: { profilePublic: true, showStats: true, deletedAt: null } },
 *   orderBy: { totalXP: 'desc' },
 *   take: 100,
 *   include: { user: { select: { username: true, displayName: true, avatarUrl: true } } }
 * });
 *
 * // Create an achievement definition
 * const achievement = await prisma.achievement.create({
 *   data: {
 *     code: 'FIRST_BOOK',
 *     name: 'First Steps',
 *     description: 'Complete your first book',
 *     category: 'READING',
 *     tier: 'COMMON',
 *     xpReward: 50,
 *     criteria: { booksCompleted: 1 },
 *     badgeIcon: 'book-open',
 *     badgeColor: '#4CAF50'
 *   }
 * });
 *
 * // Award an achievement to a user
 * const userAchievement = await prisma.userAchievement.create({
 *   data: {
 *     userId: 'user_123',
 *     achievementId: 'achievement_123',
 *     earnedAt: new Date()
 *   }
 * });
 *
 * // Fetch user's achievements with details
 * const userAchievements = await prisma.userAchievement.findMany({
 *   where: { userId: 'user_123' },
 *   include: { achievement: true },
 *   orderBy: { earnedAt: 'desc' }
 * });
 *
 * // Create a curriculum (reading plan/learning path)
 * const curriculum = await prisma.curriculum.create({
 *   data: {
 *     userId: 'user_123',
 *     title: 'Introduction to Philosophy',
 *     description: 'A beginner-friendly path through major philosophical works',
 *     category: 'Philosophy',
 *     difficulty: 'Beginner',
 *     visibility: 'PUBLIC',
 *     tags: ['philosophy', 'classics', 'beginner']
 *   }
 * });
 *
 * // Add items to a curriculum with ordering
 * const curriculumItem = await prisma.curriculumItem.create({
 *   data: {
 *     curriculumId: 'curriculum_123',
 *     orderIndex: 0,
 *     bookId: 'book_123', // Reference to a book in the system
 *     notes: 'Start here - this book introduces key concepts',
 *     estimatedTime: 180, // 3 hours
 *     isOptional: false
 *   }
 * });
 *
 * // Add external resource (book not in system)
 * const externalItem = await prisma.curriculumItem.create({
 *   data: {
 *     curriculumId: 'curriculum_123',
 *     orderIndex: 1,
 *     externalTitle: 'The Republic',
 *     externalAuthor: 'Plato',
 *     externalIsbn: '9780140455113',
 *     notes: 'Classic foundational text',
 *     isOptional: false
 *   }
 * });
 *
 * // Follow a curriculum with progress tracking
 * const follow = await prisma.curriculumFollow.create({
 *   data: {
 *     userId: 'user_123',
 *     curriculumId: 'curriculum_123',
 *     currentItemIndex: 0,
 *     completedItems: 0
 *   }
 * });
 *
 * // Update curriculum progress
 * const progress = await prisma.curriculumFollow.update({
 *   where: { userId_curriculumId: { userId: 'user_123', curriculumId: 'curriculum_123' } },
 *   data: {
 *     currentItemIndex: 2,
 *     completedItems: 2,
 *     lastProgressAt: new Date()
 *   }
 * });
 *
 * // Browse public curriculums with filters
 * const publicCurriculums = await prisma.curriculum.findMany({
 *   where: {
 *     visibility: 'PUBLIC',
 *     deletedAt: null,
 *     category: 'Philosophy'
 *   },
 *   include: {
 *     items: { orderBy: { orderIndex: 'asc' } },
 *     user: { select: { displayName: true, username: true, avatarUrl: true } }
 *   },
 *   orderBy: { followersCount: 'desc' }
 * });
 * ```
 */

// Re-export Prisma client and utilities
export { prisma, disconnect, connect, PrismaClient } from "./client";

// Re-export all generated Prisma types
export * from "@prisma/client";

// Export common type aliases for convenience
export type {
  User,
  Book,
  Chapter,
  ReadingProgress,
  Annotation,
  PreReadingGuide,
  Assessment,
  Flashcard,
  FlashcardReview,
  UserStats,
  Achievement,
  UserAchievement,
  Curriculum,
  CurriculumItem,
  CurriculumFollow,
} from "@prisma/client";
