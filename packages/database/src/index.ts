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
 * import type { Follow, ReadingGroup, ReadingGroupMember, GroupRole } from '@read-master/database';
 * import type { GroupDiscussion, DiscussionReply } from '@read-master/database';
 * import type { AIUsageLog, AuditLog } from '@read-master/database';
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
 *
 * // ========================================================================
 * // SOCIAL FEATURES - Following, Reading Groups, Discussions
 * // ========================================================================
 *
 * // Follow another user
 * const follow = await prisma.follow.create({
 *   data: {
 *     followerId: 'user_123', // The user who is following
 *     followingId: 'user_456' // The user being followed
 *   }
 * });
 *
 * // Get a user's followers
 * const followers = await prisma.follow.findMany({
 *   where: { followingId: 'user_123' },
 *   include: { follower: { select: { username: true, displayName: true, avatarUrl: true } } }
 * });
 *
 * // Get users that a user is following
 * const following = await prisma.follow.findMany({
 *   where: { followerId: 'user_123' },
 *   include: { following: { select: { username: true, displayName: true, avatarUrl: true } } }
 * });
 *
 * // Unfollow a user
 * await prisma.follow.delete({
 *   where: { followerId_followingId: { followerId: 'user_123', followingId: 'user_456' } }
 * });
 *
 * // Create a reading group
 * const group = await prisma.readingGroup.create({
 *   data: {
 *     userId: 'user_123',
 *     name: 'Philosophy Book Club',
 *     description: 'Weekly discussions of classic and modern philosophy',
 *     isPublic: true,
 *     maxMembers: 25
 *   }
 * });
 *
 * // Create a private group with invite code
 * const privateGroup = await prisma.readingGroup.create({
 *   data: {
 *     userId: 'user_123',
 *     name: 'Private Study Group',
 *     isPublic: false,
 *     inviteCode: 'ABC123XYZ' // Generated unique code
 *   }
 * });
 *
 * // Add a member to a group (member joins)
 * const membership = await prisma.readingGroupMember.create({
 *   data: {
 *     groupId: 'group_123',
 *     userId: 'user_456',
 *     role: 'MEMBER'
 *   }
 * });
 *
 * // Promote member to admin
 * await prisma.readingGroupMember.update({
 *   where: { groupId_userId: { groupId: 'group_123', userId: 'user_456' } },
 *   data: { role: 'ADMIN' }
 * });
 *
 * // List members of a group by role
 * const admins = await prisma.readingGroupMember.findMany({
 *   where: { groupId: 'group_123', role: { in: ['OWNER', 'ADMIN'] } },
 *   include: { user: { select: { username: true, displayName: true, avatarUrl: true } } }
 * });
 *
 * // Create a discussion in a group
 * const discussion = await prisma.groupDiscussion.create({
 *   data: {
 *     groupId: 'group_123',
 *     userId: 'user_123',
 *     title: 'What did everyone think of Chapter 5?',
 *     content: 'I found the argument about knowledge to be fascinating...',
 *     bookId: 'book_123' // Optional: link to specific book
 *   }
 * });
 *
 * // Pin a discussion to the top of the group
 * await prisma.groupDiscussion.update({
 *   where: { id: 'discussion_123' },
 *   data: { isPinned: true }
 * });
 *
 * // Fetch discussions in a group (pinned first, then by recent activity)
 * const discussions = await prisma.groupDiscussion.findMany({
 *   where: { groupId: 'group_123', deletedAt: null },
 *   include: {
 *     user: { select: { username: true, displayName: true, avatarUrl: true } },
 *     book: { select: { title: true, author: true } }
 *   },
 *   orderBy: [{ isPinned: 'desc' }, { lastReplyAt: 'desc' }]
 * });
 *
 * // Reply to a discussion (top-level reply)
 * const reply = await prisma.discussionReply.create({
 *   data: {
 *     discussionId: 'discussion_123',
 *     userId: 'user_456',
 *     content: 'I agree! The author makes a compelling case...'
 *   }
 * });
 *
 * // Reply to another reply (nested reply)
 * const nestedReply = await prisma.discussionReply.create({
 *   data: {
 *     discussionId: 'discussion_123',
 *     userId: 'user_789',
 *     parentReplyId: 'reply_123', // Creates nested thread
 *     content: 'Great point! Have you considered...'
 *   }
 * });
 *
 * // Fetch replies with nested structure
 * const replies = await prisma.discussionReply.findMany({
 *   where: { discussionId: 'discussion_123', parentReplyId: null, deletedAt: null },
 *   include: {
 *     user: { select: { username: true, displayName: true, avatarUrl: true } },
 *     childReplies: {
 *       where: { deletedAt: null },
 *       include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
 *       orderBy: { createdAt: 'asc' }
 *     }
 *   },
 *   orderBy: { createdAt: 'asc' }
 * });
 *
 * // Browse public reading groups
 * const publicGroups = await prisma.readingGroup.findMany({
 *   where: { isPublic: true, deletedAt: null },
 *   include: {
 *     user: { select: { displayName: true, username: true } },
 *     currentBook: { select: { title: true, author: true, coverImage: true } }
 *   },
 *   orderBy: { membersCount: 'desc' }
 * });
 *
 * // ========================================================================
 * // SYSTEM LOGGING - AI Usage & Audit Logs
 * // ========================================================================
 *
 * // Log an AI API call (for cost monitoring and rate limiting)
 * const aiLog = await prisma.aIUsageLog.create({
 *   data: {
 *     userId: 'user_123',
 *     operation: 'pre_reading_guide',
 *     model: 'claude-3-5-sonnet-20241022',
 *     provider: 'anthropic',
 *     promptTokens: 1500,
 *     completionTokens: 2000,
 *     totalTokens: 3500,
 *     cost: 0.0105, // Decimal type for precision
 *     durationMs: 3200,
 *     success: true,
 *     bookId: 'book_123',
 *     requestId: 'req_abc123'
 *   }
 * });
 *
 * // Log a failed AI call
 * const failedLog = await prisma.aIUsageLog.create({
 *   data: {
 *     userId: 'user_123',
 *     operation: 'explain',
 *     model: 'claude-3-5-sonnet-20241022',
 *     provider: 'anthropic',
 *     promptTokens: 500,
 *     completionTokens: 0,
 *     totalTokens: 500,
 *     cost: 0.0015,
 *     durationMs: 1500,
 *     success: false,
 *     errorCode: 'RATE_LIMIT_EXCEEDED',
 *     errorMessage: 'Too many requests'
 *   }
 * });
 *
 * // Get user's AI usage for today (for rate limiting)
 * const today = new Date();
 * today.setHours(0, 0, 0, 0);
 * const todayUsage = await prisma.aIUsageLog.count({
 *   where: {
 *     userId: 'user_123',
 *     createdAt: { gte: today },
 *     success: true
 *   }
 * });
 *
 * // Get total AI costs for a user this month
 * const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
 * const monthlyCost = await prisma.aIUsageLog.aggregate({
 *   where: {
 *     userId: 'user_123',
 *     createdAt: { gte: monthStart },
 *     success: true
 *   },
 *   _sum: { cost: true }
 * });
 *
 * // Create an audit log entry (for security and compliance)
 * const auditLog = await prisma.auditLog.create({
 *   data: {
 *     userId: 'user_123',
 *     action: 'UPDATE',
 *     entityType: 'Book',
 *     entityId: 'book_123',
 *     previousValue: { title: 'Old Title' },
 *     newValue: { title: 'New Title' },
 *     ipAddress: '192.168.1.1',
 *     userAgent: 'Mozilla/5.0...',
 *     requestId: 'req_abc123'
 *   }
 * });
 *
 * // Log a delete action with previous state
 * const deleteLog = await prisma.auditLog.create({
 *   data: {
 *     userId: 'user_123',
 *     action: 'DELETE',
 *     entityType: 'Flashcard',
 *     entityId: 'card_123',
 *     previousValue: { front: 'Question?', back: 'Answer' }
 *   }
 * });
 *
 * // Query audit logs for a specific entity
 * const entityHistory = await prisma.auditLog.findMany({
 *   where: {
 *     entityType: 'Book',
 *     entityId: 'book_123'
 *   },
 *   orderBy: { createdAt: 'desc' }
 * });
 *
 * // Query recent user actions (for security review)
 * const recentActions = await prisma.auditLog.findMany({
 *   where: {
 *     userId: 'user_123',
 *     createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
 *   },
 *   orderBy: { createdAt: 'desc' }
 * });
 *
 * // Get all DELETE actions (for compliance auditing)
 * const deletions = await prisma.auditLog.findMany({
 *   where: { action: 'DELETE' },
 *   orderBy: { createdAt: 'desc' },
 *   take: 100
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
  Follow,
  ReadingGroup,
  ReadingGroupMember,
  GroupDiscussion,
  DiscussionReply,
  AIUsageLog,
  AuditLog,
} from "@prisma/client";
