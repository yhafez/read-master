/**
 * Tests for Prisma migration validation
 *
 * These tests verify the migration structure and SQL content
 * without requiring a database connection.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(__dirname, "migrations");
const INITIAL_MIGRATION_DIR = join(
  MIGRATIONS_DIR,
  "00000000000000_initial_schema"
);
const MIGRATION_SQL_PATH = join(INITIAL_MIGRATION_DIR, "migration.sql");

describe("Prisma Migrations", () => {
  describe("migration directory structure", () => {
    it("should have migrations directory", () => {
      expect(existsSync(MIGRATIONS_DIR)).toBe(true);
    });

    it("should have initial migration directory", () => {
      expect(existsSync(INITIAL_MIGRATION_DIR)).toBe(true);
    });

    it("should have migration.sql file", () => {
      expect(existsSync(MIGRATION_SQL_PATH)).toBe(true);
    });
  });

  describe("migration SQL content", () => {
    // Read the migration file once
    const migrationSql = readFileSync(MIGRATION_SQL_PATH, "utf-8");

    describe("enum creation", () => {
      it("should create UserTier enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "UserTier"');
        expect(migrationSql).toContain("'FREE'");
        expect(migrationSql).toContain("'PRO'");
        expect(migrationSql).toContain("'SCHOLAR'");
      });

      it("should create BookSource enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "BookSource"');
        expect(migrationSql).toContain("'UPLOAD'");
        expect(migrationSql).toContain("'URL'");
        expect(migrationSql).toContain("'PASTE'");
        expect(migrationSql).toContain("'GOOGLE_BOOKS'");
        expect(migrationSql).toContain("'OPEN_LIBRARY'");
      });

      it("should create FileType enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "FileType"');
        expect(migrationSql).toContain("'PDF'");
        expect(migrationSql).toContain("'EPUB'");
        expect(migrationSql).toContain("'DOC'");
        expect(migrationSql).toContain("'DOCX'");
        expect(migrationSql).toContain("'TXT'");
        expect(migrationSql).toContain("'HTML'");
      });

      it("should create ReadingStatus enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "ReadingStatus"');
        expect(migrationSql).toContain("'WANT_TO_READ'");
        expect(migrationSql).toContain("'READING'");
        expect(migrationSql).toContain("'COMPLETED'");
        expect(migrationSql).toContain("'ABANDONED'");
      });

      it("should create AnnotationType enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "AnnotationType"');
        expect(migrationSql).toContain("'HIGHLIGHT'");
        expect(migrationSql).toContain("'NOTE'");
        expect(migrationSql).toContain("'BOOKMARK'");
      });

      it("should create AssessmentType enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "AssessmentType"');
        expect(migrationSql).toContain("'CHAPTER_CHECK'");
        expect(migrationSql).toContain("'BOOK_ASSESSMENT'");
        expect(migrationSql).toContain("'CUSTOM'");
      });

      it("should create FlashcardType enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "FlashcardType"');
        expect(migrationSql).toContain("'VOCABULARY'");
        expect(migrationSql).toContain("'CONCEPT'");
        expect(migrationSql).toContain("'COMPREHENSION'");
        expect(migrationSql).toContain("'QUOTE'");
      });

      it("should create FlashcardStatus enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "FlashcardStatus"');
        expect(migrationSql).toContain("'NEW'");
        expect(migrationSql).toContain("'LEARNING'");
        expect(migrationSql).toContain("'REVIEW'");
        expect(migrationSql).toContain("'SUSPENDED'");
      });

      it("should create AchievementCategory enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "AchievementCategory"');
        expect(migrationSql).toContain("'READING'");
        expect(migrationSql).toContain("'LEARNING'");
        expect(migrationSql).toContain("'SOCIAL'");
        expect(migrationSql).toContain("'STREAK'");
        expect(migrationSql).toContain("'MILESTONE'");
        expect(migrationSql).toContain("'SPECIAL'");
      });

      it("should create AchievementTier enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "AchievementTier"');
        expect(migrationSql).toContain("'COMMON'");
        expect(migrationSql).toContain("'UNCOMMON'");
        expect(migrationSql).toContain("'RARE'");
        expect(migrationSql).toContain("'EPIC'");
        expect(migrationSql).toContain("'LEGENDARY'");
      });

      it("should create Visibility enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "Visibility"');
        expect(migrationSql).toContain("'PRIVATE'");
        expect(migrationSql).toContain("'UNLISTED'");
        expect(migrationSql).toContain("'PUBLIC'");
      });

      it("should create GroupRole enum", () => {
        expect(migrationSql).toContain('CREATE TYPE "GroupRole"');
        expect(migrationSql).toContain("'OWNER'");
        expect(migrationSql).toContain("'ADMIN'");
        expect(migrationSql).toContain("'MEMBER'");
      });
    });

    describe("table creation", () => {
      it("should create User table", () => {
        expect(migrationSql).toContain('CREATE TABLE "User"');
        expect(migrationSql).toContain('"clerkId" TEXT NOT NULL');
        expect(migrationSql).toContain('"email" TEXT NOT NULL');
      });

      it("should create Book table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Book"');
        expect(migrationSql).toContain('"title" VARCHAR(500) NOT NULL');
        expect(migrationSql).toContain('"source" "BookSource" NOT NULL');
      });

      it("should create Chapter table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Chapter"');
        expect(migrationSql).toContain('"orderIndex" INTEGER NOT NULL');
      });

      it("should create ReadingProgress table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ReadingProgress"');
        expect(migrationSql).toContain(
          '"currentPosition" INTEGER NOT NULL DEFAULT 0'
        );
        expect(migrationSql).toContain(
          '"percentage" DOUBLE PRECISION NOT NULL DEFAULT 0'
        );
      });

      it("should create Annotation table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Annotation"');
        expect(migrationSql).toContain('"startOffset" INTEGER NOT NULL');
        expect(migrationSql).toContain('"endOffset" INTEGER NOT NULL');
      });

      it("should create PreReadingGuide table", () => {
        expect(migrationSql).toContain('CREATE TABLE "PreReadingGuide"');
        expect(migrationSql).toContain(
          "\"vocabulary\" JSONB NOT NULL DEFAULT '[]'"
        );
      });

      it("should create Assessment table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Assessment"');
        expect(migrationSql).toContain(
          "\"questions\" JSONB NOT NULL DEFAULT '[]'"
        );
        expect(migrationSql).toContain(
          "\"bloomsBreakdown\" JSONB NOT NULL DEFAULT '{}'"
        );
      });

      it("should create Flashcard table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Flashcard"');
        expect(migrationSql).toContain(
          '"easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5'
        );
        expect(migrationSql).toContain('"interval" INTEGER NOT NULL DEFAULT 0');
        expect(migrationSql).toContain(
          '"repetitions" INTEGER NOT NULL DEFAULT 0'
        );
      });

      it("should create FlashcardReview table", () => {
        expect(migrationSql).toContain('CREATE TABLE "FlashcardReview"');
        expect(migrationSql).toContain('"rating" INTEGER NOT NULL');
        expect(migrationSql).toContain(
          '"previousEaseFactor" DOUBLE PRECISION NOT NULL'
        );
        expect(migrationSql).toContain(
          '"newEaseFactor" DOUBLE PRECISION NOT NULL'
        );
      });

      it("should create UserStats table", () => {
        expect(migrationSql).toContain('CREATE TABLE "UserStats"');
        expect(migrationSql).toContain('"totalXP" INTEGER NOT NULL DEFAULT 0');
        expect(migrationSql).toContain('"level" INTEGER NOT NULL DEFAULT 1');
        expect(migrationSql).toContain(
          '"currentStreak" INTEGER NOT NULL DEFAULT 0'
        );
      });

      it("should create Achievement table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Achievement"');
        expect(migrationSql).toContain('"code" TEXT NOT NULL');
        expect(migrationSql).toContain('"xpReward" INTEGER NOT NULL DEFAULT 0');
      });

      it("should create UserAchievement table", () => {
        expect(migrationSql).toContain('CREATE TABLE "UserAchievement"');
        expect(migrationSql).toContain(
          '"earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
        );
      });

      it("should create Curriculum table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Curriculum"');
        expect(migrationSql).toContain(
          '"visibility" "Visibility" NOT NULL DEFAULT \'PRIVATE\''
        );
      });

      it("should create CurriculumItem table", () => {
        expect(migrationSql).toContain('CREATE TABLE "CurriculumItem"');
        expect(migrationSql).toContain('"orderIndex" INTEGER NOT NULL');
      });

      it("should create CurriculumFollow table", () => {
        expect(migrationSql).toContain('CREATE TABLE "CurriculumFollow"');
        expect(migrationSql).toContain(
          '"currentItemIndex" INTEGER NOT NULL DEFAULT 0'
        );
      });

      it("should create Follow table", () => {
        expect(migrationSql).toContain('CREATE TABLE "Follow"');
        expect(migrationSql).toContain('"followerId" TEXT NOT NULL');
        expect(migrationSql).toContain('"followingId" TEXT NOT NULL');
      });

      it("should create ReadingGroup table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ReadingGroup"');
        expect(migrationSql).toContain('"maxMembers" INTEGER DEFAULT 50');
      });

      it("should create ReadingGroupMember table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ReadingGroupMember"');
        expect(migrationSql).toContain(
          '"role" "GroupRole" NOT NULL DEFAULT \'MEMBER\''
        );
      });

      it("should create GroupDiscussion table", () => {
        expect(migrationSql).toContain('CREATE TABLE "GroupDiscussion"');
        expect(migrationSql).toContain(
          '"isPinned" BOOLEAN NOT NULL DEFAULT false'
        );
        expect(migrationSql).toContain(
          '"isLocked" BOOLEAN NOT NULL DEFAULT false'
        );
      });

      it("should create DiscussionReply table", () => {
        expect(migrationSql).toContain('CREATE TABLE "DiscussionReply"');
        expect(migrationSql).toContain('"parentReplyId" TEXT');
      });

      it("should create ForumCategory table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ForumCategory"');
        expect(migrationSql).toContain('"slug" TEXT NOT NULL');
        expect(migrationSql).toContain(
          '"minTierToPost" "UserTier" NOT NULL DEFAULT \'FREE\''
        );
      });

      it("should create ForumPost table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ForumPost"');
        expect(migrationSql).toContain(
          '"voteScore" INTEGER NOT NULL DEFAULT 0'
        );
        expect(migrationSql).toContain(
          '"viewCount" INTEGER NOT NULL DEFAULT 0'
        );
      });

      it("should create ForumReply table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ForumReply"');
        expect(migrationSql).toContain(
          '"isBestAnswer" BOOLEAN NOT NULL DEFAULT false'
        );
      });

      it("should create ForumVote table", () => {
        expect(migrationSql).toContain('CREATE TABLE "ForumVote"');
        expect(migrationSql).toContain('"value" INTEGER NOT NULL');
      });

      it("should create AIUsageLog table", () => {
        expect(migrationSql).toContain('CREATE TABLE "AIUsageLog"');
        expect(migrationSql).toContain('"cost" DECIMAL(10,6) NOT NULL');
        expect(migrationSql).toContain('"promptTokens" INTEGER NOT NULL');
        expect(migrationSql).toContain('"completionTokens" INTEGER NOT NULL');
      });

      it("should create AuditLog table", () => {
        expect(migrationSql).toContain('CREATE TABLE "AuditLog"');
        expect(migrationSql).toContain('"action" TEXT NOT NULL');
        expect(migrationSql).toContain('"entityType" TEXT NOT NULL');
      });
    });

    describe("unique constraints", () => {
      it("should have unique constraint on User.clerkId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "User_clerkId_key"'
        );
      });

      it("should have unique constraint on User.email", () => {
        expect(migrationSql).toContain('CREATE UNIQUE INDEX "User_email_key"');
      });

      it("should have unique constraint on User.username", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "User_username_key"'
        );
      });

      it("should have unique constraint on ReadingProgress userId+bookId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "ReadingProgress_userId_bookId_key"'
        );
      });

      it("should have unique constraint on PreReadingGuide.bookId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "PreReadingGuide_bookId_key"'
        );
      });

      it("should have unique constraint on UserStats.userId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "UserStats_userId_key"'
        );
      });

      it("should have unique constraint on Achievement.code", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "Achievement_code_key"'
        );
      });

      it("should have unique constraint on UserAchievement userId+achievementId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key"'
        );
      });

      it("should have unique constraint on CurriculumFollow userId+curriculumId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "CurriculumFollow_userId_curriculumId_key"'
        );
      });

      it("should have unique constraint on Follow followerId+followingId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "Follow_followerId_followingId_key"'
        );
      });

      it("should have unique constraint on ReadingGroup.inviteCode", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "ReadingGroup_inviteCode_key"'
        );
      });

      it("should have unique constraint on ReadingGroupMember groupId+userId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "ReadingGroupMember_groupId_userId_key"'
        );
      });

      it("should have unique constraint on ForumCategory.slug", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "ForumCategory_slug_key"'
        );
      });

      it("should have unique constraint on ForumVote userId+postId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "ForumVote_userId_postId_key"'
        );
      });

      it("should have unique constraint on ForumVote userId+replyId", () => {
        expect(migrationSql).toContain(
          'CREATE UNIQUE INDEX "ForumVote_userId_replyId_key"'
        );
      });
    });

    describe("indexes", () => {
      it("should have indexes on User for common queries", () => {
        expect(migrationSql).toContain('CREATE INDEX "User_clerkId_idx"');
        expect(migrationSql).toContain('CREATE INDEX "User_email_idx"');
        expect(migrationSql).toContain('CREATE INDEX "User_deletedAt_idx"');
        expect(migrationSql).toContain('CREATE INDEX "User_tier_idx"');
      });

      it("should have indexes on Book for common queries", () => {
        expect(migrationSql).toContain('CREATE INDEX "Book_userId_idx"');
        expect(migrationSql).toContain('CREATE INDEX "Book_userId_status_idx"');
        expect(migrationSql).toContain('CREATE INDEX "Book_deletedAt_idx"');
      });

      it("should have indexes on Flashcard for SRS queries", () => {
        expect(migrationSql).toContain(
          'CREATE INDEX "Flashcard_userId_dueDate_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "Flashcard_userId_status_idx"'
        );
        expect(migrationSql).toContain('CREATE INDEX "Flashcard_dueDate_idx"');
      });

      it("should have indexes on UserStats for leaderboard queries", () => {
        expect(migrationSql).toContain('CREATE INDEX "UserStats_totalXP_idx"');
        expect(migrationSql).toContain(
          'CREATE INDEX "UserStats_booksCompleted_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "UserStats_currentStreak_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "UserStats_longestStreak_idx"'
        );
      });

      it("should have indexes on ForumPost for sorting", () => {
        expect(migrationSql).toContain(
          'CREATE INDEX "ForumPost_categoryId_voteScore_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "ForumPost_categoryId_createdAt_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "ForumPost_voteScore_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "ForumPost_viewCount_idx"'
        );
      });

      it("should have indexes on AIUsageLog for analytics", () => {
        expect(migrationSql).toContain('CREATE INDEX "AIUsageLog_userId_idx"');
        expect(migrationSql).toContain(
          'CREATE INDEX "AIUsageLog_createdAt_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "AIUsageLog_operation_idx"'
        );
        expect(migrationSql).toContain(
          'CREATE INDEX "AIUsageLog_provider_idx"'
        );
      });

      it("should have indexes on AuditLog for security auditing", () => {
        expect(migrationSql).toContain('CREATE INDEX "AuditLog_userId_idx"');
        expect(migrationSql).toContain(
          'CREATE INDEX "AuditLog_entityType_idx"'
        );
        expect(migrationSql).toContain('CREATE INDEX "AuditLog_action_idx"');
        expect(migrationSql).toContain(
          'CREATE INDEX "AuditLog_entityType_entityId_idx"'
        );
      });
    });

    describe("foreign keys", () => {
      it("should have foreign key on Book to User", () => {
        expect(migrationSql).toContain(
          'ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE'
        );
      });

      it("should have foreign key on ReadingProgress to User and Book", () => {
        expect(migrationSql).toContain(
          'ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE'
        );
        expect(migrationSql).toContain(
          'ADD CONSTRAINT "ReadingProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE'
        );
      });

      it("should have foreign key on Flashcard with SET NULL for optional book", () => {
        expect(migrationSql).toContain(
          'ADD CONSTRAINT "Flashcard_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL'
        );
      });

      it("should have self-referential foreign key on DiscussionReply", () => {
        expect(migrationSql).toContain(
          'ADD CONSTRAINT "DiscussionReply_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "DiscussionReply"("id") ON DELETE CASCADE'
        );
      });

      it("should have self-referential foreign key on ForumReply", () => {
        expect(migrationSql).toContain(
          'ADD CONSTRAINT "ForumReply_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE'
        );
      });
    });
  });
});
