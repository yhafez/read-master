/**
 * Tests for Prisma client singleton
 *
 * These tests verify the client module exports correctly.
 * Note: Actual database operations require a running database,
 * so we test exports and module structure here.
 */

import { describe, it, expect } from "vitest";
import { prisma, disconnect, connect, PrismaClient } from "./client";

describe("Prisma Client Singleton", () => {
  describe("prisma export", () => {
    it("should export a Prisma client instance", () => {
      expect(prisma).toBeDefined();
      expect(prisma).not.toBeNull();
      // Verify it has expected Prisma client shape
      expect(typeof prisma.$connect).toBe("function");
    });

    it("should have common Prisma methods", () => {
      expect(typeof prisma.$connect).toBe("function");
      expect(typeof prisma.$disconnect).toBe("function");
      expect(typeof prisma.$transaction).toBe("function");
    });

    it("should have user model accessor", () => {
      expect(prisma.user).toBeDefined();
      expect(typeof prisma.user.findMany).toBe("function");
      expect(typeof prisma.user.findUnique).toBe("function");
      expect(typeof prisma.user.create).toBe("function");
      expect(typeof prisma.user.update).toBe("function");
      expect(typeof prisma.user.delete).toBe("function");
    });

    it("should have user model with expected query methods", () => {
      expect(typeof prisma.user.findFirst).toBe("function");
      expect(typeof prisma.user.findFirstOrThrow).toBe("function");
      expect(typeof prisma.user.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.user.createMany).toBe("function");
      expect(typeof prisma.user.updateMany).toBe("function");
      expect(typeof prisma.user.deleteMany).toBe("function");
      expect(typeof prisma.user.count).toBe("function");
      expect(typeof prisma.user.aggregate).toBe("function");
    });

    it("should have book model accessor", () => {
      expect(prisma.book).toBeDefined();
      expect(typeof prisma.book.findMany).toBe("function");
      expect(typeof prisma.book.findUnique).toBe("function");
      expect(typeof prisma.book.create).toBe("function");
      expect(typeof prisma.book.update).toBe("function");
      expect(typeof prisma.book.delete).toBe("function");
    });

    it("should have book model with expected query methods", () => {
      expect(typeof prisma.book.findFirst).toBe("function");
      expect(typeof prisma.book.findFirstOrThrow).toBe("function");
      expect(typeof prisma.book.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.book.createMany).toBe("function");
      expect(typeof prisma.book.updateMany).toBe("function");
      expect(typeof prisma.book.deleteMany).toBe("function");
      expect(typeof prisma.book.count).toBe("function");
      expect(typeof prisma.book.aggregate).toBe("function");
    });

    it("should have chapter model accessor", () => {
      expect(prisma.chapter).toBeDefined();
      expect(typeof prisma.chapter.findMany).toBe("function");
      expect(typeof prisma.chapter.findUnique).toBe("function");
      expect(typeof prisma.chapter.create).toBe("function");
      expect(typeof prisma.chapter.update).toBe("function");
      expect(typeof prisma.chapter.delete).toBe("function");
    });

    it("should have chapter model with expected query methods", () => {
      expect(typeof prisma.chapter.findFirst).toBe("function");
      expect(typeof prisma.chapter.findFirstOrThrow).toBe("function");
      expect(typeof prisma.chapter.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.chapter.createMany).toBe("function");
      expect(typeof prisma.chapter.updateMany).toBe("function");
      expect(typeof prisma.chapter.deleteMany).toBe("function");
      expect(typeof prisma.chapter.count).toBe("function");
      expect(typeof prisma.chapter.aggregate).toBe("function");
    });

    it("should have readingProgress model accessor", () => {
      expect(prisma.readingProgress).toBeDefined();
      expect(typeof prisma.readingProgress.findMany).toBe("function");
      expect(typeof prisma.readingProgress.findUnique).toBe("function");
      expect(typeof prisma.readingProgress.create).toBe("function");
      expect(typeof prisma.readingProgress.update).toBe("function");
      expect(typeof prisma.readingProgress.delete).toBe("function");
      expect(typeof prisma.readingProgress.upsert).toBe("function");
    });

    it("should have readingProgress model with expected query methods", () => {
      expect(typeof prisma.readingProgress.findFirst).toBe("function");
      expect(typeof prisma.readingProgress.findFirstOrThrow).toBe("function");
      expect(typeof prisma.readingProgress.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.readingProgress.createMany).toBe("function");
      expect(typeof prisma.readingProgress.updateMany).toBe("function");
      expect(typeof prisma.readingProgress.deleteMany).toBe("function");
      expect(typeof prisma.readingProgress.count).toBe("function");
      expect(typeof prisma.readingProgress.aggregate).toBe("function");
    });

    it("should have annotation model accessor", () => {
      expect(prisma.annotation).toBeDefined();
      expect(typeof prisma.annotation.findMany).toBe("function");
      expect(typeof prisma.annotation.findUnique).toBe("function");
      expect(typeof prisma.annotation.create).toBe("function");
      expect(typeof prisma.annotation.update).toBe("function");
      expect(typeof prisma.annotation.delete).toBe("function");
    });

    it("should have annotation model with expected query methods", () => {
      expect(typeof prisma.annotation.findFirst).toBe("function");
      expect(typeof prisma.annotation.findFirstOrThrow).toBe("function");
      expect(typeof prisma.annotation.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.annotation.createMany).toBe("function");
      expect(typeof prisma.annotation.updateMany).toBe("function");
      expect(typeof prisma.annotation.deleteMany).toBe("function");
      expect(typeof prisma.annotation.count).toBe("function");
      expect(typeof prisma.annotation.aggregate).toBe("function");
    });

    it("should have preReadingGuide model accessor", () => {
      expect(prisma.preReadingGuide).toBeDefined();
      expect(typeof prisma.preReadingGuide.findMany).toBe("function");
      expect(typeof prisma.preReadingGuide.findUnique).toBe("function");
      expect(typeof prisma.preReadingGuide.create).toBe("function");
      expect(typeof prisma.preReadingGuide.update).toBe("function");
      expect(typeof prisma.preReadingGuide.delete).toBe("function");
      expect(typeof prisma.preReadingGuide.upsert).toBe("function");
    });

    it("should have preReadingGuide model with expected query methods", () => {
      expect(typeof prisma.preReadingGuide.findFirst).toBe("function");
      expect(typeof prisma.preReadingGuide.findFirstOrThrow).toBe("function");
      expect(typeof prisma.preReadingGuide.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.preReadingGuide.createMany).toBe("function");
      expect(typeof prisma.preReadingGuide.updateMany).toBe("function");
      expect(typeof prisma.preReadingGuide.deleteMany).toBe("function");
      expect(typeof prisma.preReadingGuide.count).toBe("function");
      expect(typeof prisma.preReadingGuide.aggregate).toBe("function");
    });

    it("should have assessment model accessor", () => {
      expect(prisma.assessment).toBeDefined();
      expect(typeof prisma.assessment.findMany).toBe("function");
      expect(typeof prisma.assessment.findUnique).toBe("function");
      expect(typeof prisma.assessment.create).toBe("function");
      expect(typeof prisma.assessment.update).toBe("function");
      expect(typeof prisma.assessment.delete).toBe("function");
    });

    it("should have assessment model with expected query methods", () => {
      expect(typeof prisma.assessment.findFirst).toBe("function");
      expect(typeof prisma.assessment.findFirstOrThrow).toBe("function");
      expect(typeof prisma.assessment.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.assessment.createMany).toBe("function");
      expect(typeof prisma.assessment.updateMany).toBe("function");
      expect(typeof prisma.assessment.deleteMany).toBe("function");
      expect(typeof prisma.assessment.count).toBe("function");
      expect(typeof prisma.assessment.aggregate).toBe("function");
    });

    it("should have flashcard model accessor", () => {
      expect(prisma.flashcard).toBeDefined();
      expect(typeof prisma.flashcard.findMany).toBe("function");
      expect(typeof prisma.flashcard.findUnique).toBe("function");
      expect(typeof prisma.flashcard.create).toBe("function");
      expect(typeof prisma.flashcard.update).toBe("function");
      expect(typeof prisma.flashcard.delete).toBe("function");
    });

    it("should have flashcard model with expected query methods", () => {
      expect(typeof prisma.flashcard.findFirst).toBe("function");
      expect(typeof prisma.flashcard.findFirstOrThrow).toBe("function");
      expect(typeof prisma.flashcard.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.flashcard.createMany).toBe("function");
      expect(typeof prisma.flashcard.updateMany).toBe("function");
      expect(typeof prisma.flashcard.deleteMany).toBe("function");
      expect(typeof prisma.flashcard.count).toBe("function");
      expect(typeof prisma.flashcard.aggregate).toBe("function");
    });

    it("should have flashcardReview model accessor", () => {
      expect(prisma.flashcardReview).toBeDefined();
      expect(typeof prisma.flashcardReview.findMany).toBe("function");
      expect(typeof prisma.flashcardReview.findUnique).toBe("function");
      expect(typeof prisma.flashcardReview.create).toBe("function");
      expect(typeof prisma.flashcardReview.update).toBe("function");
      expect(typeof prisma.flashcardReview.delete).toBe("function");
    });

    it("should have flashcardReview model with expected query methods", () => {
      expect(typeof prisma.flashcardReview.findFirst).toBe("function");
      expect(typeof prisma.flashcardReview.findFirstOrThrow).toBe("function");
      expect(typeof prisma.flashcardReview.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.flashcardReview.createMany).toBe("function");
      expect(typeof prisma.flashcardReview.updateMany).toBe("function");
      expect(typeof prisma.flashcardReview.deleteMany).toBe("function");
      expect(typeof prisma.flashcardReview.count).toBe("function");
      expect(typeof prisma.flashcardReview.aggregate).toBe("function");
    });

    it("should have userStats model accessor", () => {
      expect(prisma.userStats).toBeDefined();
      expect(typeof prisma.userStats.findMany).toBe("function");
      expect(typeof prisma.userStats.findUnique).toBe("function");
      expect(typeof prisma.userStats.create).toBe("function");
      expect(typeof prisma.userStats.update).toBe("function");
      expect(typeof prisma.userStats.delete).toBe("function");
      expect(typeof prisma.userStats.upsert).toBe("function");
    });

    it("should have userStats model with expected query methods", () => {
      expect(typeof prisma.userStats.findFirst).toBe("function");
      expect(typeof prisma.userStats.findFirstOrThrow).toBe("function");
      expect(typeof prisma.userStats.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.userStats.createMany).toBe("function");
      expect(typeof prisma.userStats.updateMany).toBe("function");
      expect(typeof prisma.userStats.deleteMany).toBe("function");
      expect(typeof prisma.userStats.count).toBe("function");
      expect(typeof prisma.userStats.aggregate).toBe("function");
    });

    it("should have achievement model accessor", () => {
      expect(prisma.achievement).toBeDefined();
      expect(typeof prisma.achievement.findMany).toBe("function");
      expect(typeof prisma.achievement.findUnique).toBe("function");
      expect(typeof prisma.achievement.create).toBe("function");
      expect(typeof prisma.achievement.update).toBe("function");
      expect(typeof prisma.achievement.delete).toBe("function");
    });

    it("should have achievement model with expected query methods", () => {
      expect(typeof prisma.achievement.findFirst).toBe("function");
      expect(typeof prisma.achievement.findFirstOrThrow).toBe("function");
      expect(typeof prisma.achievement.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.achievement.createMany).toBe("function");
      expect(typeof prisma.achievement.updateMany).toBe("function");
      expect(typeof prisma.achievement.deleteMany).toBe("function");
      expect(typeof prisma.achievement.count).toBe("function");
      expect(typeof prisma.achievement.aggregate).toBe("function");
    });

    it("should have userAchievement model accessor", () => {
      expect(prisma.userAchievement).toBeDefined();
      expect(typeof prisma.userAchievement.findMany).toBe("function");
      expect(typeof prisma.userAchievement.findUnique).toBe("function");
      expect(typeof prisma.userAchievement.create).toBe("function");
      expect(typeof prisma.userAchievement.update).toBe("function");
      expect(typeof prisma.userAchievement.delete).toBe("function");
    });

    it("should have userAchievement model with expected query methods", () => {
      expect(typeof prisma.userAchievement.findFirst).toBe("function");
      expect(typeof prisma.userAchievement.findFirstOrThrow).toBe("function");
      expect(typeof prisma.userAchievement.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.userAchievement.createMany).toBe("function");
      expect(typeof prisma.userAchievement.updateMany).toBe("function");
      expect(typeof prisma.userAchievement.deleteMany).toBe("function");
      expect(typeof prisma.userAchievement.count).toBe("function");
      expect(typeof prisma.userAchievement.aggregate).toBe("function");
    });

    it("should have curriculum model accessor", () => {
      expect(prisma.curriculum).toBeDefined();
      expect(typeof prisma.curriculum.findMany).toBe("function");
      expect(typeof prisma.curriculum.findUnique).toBe("function");
      expect(typeof prisma.curriculum.create).toBe("function");
      expect(typeof prisma.curriculum.update).toBe("function");
      expect(typeof prisma.curriculum.delete).toBe("function");
    });

    it("should have curriculum model with expected query methods", () => {
      expect(typeof prisma.curriculum.findFirst).toBe("function");
      expect(typeof prisma.curriculum.findFirstOrThrow).toBe("function");
      expect(typeof prisma.curriculum.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.curriculum.createMany).toBe("function");
      expect(typeof prisma.curriculum.updateMany).toBe("function");
      expect(typeof prisma.curriculum.deleteMany).toBe("function");
      expect(typeof prisma.curriculum.count).toBe("function");
      expect(typeof prisma.curriculum.aggregate).toBe("function");
    });

    it("should have curriculumItem model accessor", () => {
      expect(prisma.curriculumItem).toBeDefined();
      expect(typeof prisma.curriculumItem.findMany).toBe("function");
      expect(typeof prisma.curriculumItem.findUnique).toBe("function");
      expect(typeof prisma.curriculumItem.create).toBe("function");
      expect(typeof prisma.curriculumItem.update).toBe("function");
      expect(typeof prisma.curriculumItem.delete).toBe("function");
    });

    it("should have curriculumItem model with expected query methods", () => {
      expect(typeof prisma.curriculumItem.findFirst).toBe("function");
      expect(typeof prisma.curriculumItem.findFirstOrThrow).toBe("function");
      expect(typeof prisma.curriculumItem.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.curriculumItem.createMany).toBe("function");
      expect(typeof prisma.curriculumItem.updateMany).toBe("function");
      expect(typeof prisma.curriculumItem.deleteMany).toBe("function");
      expect(typeof prisma.curriculumItem.count).toBe("function");
      expect(typeof prisma.curriculumItem.aggregate).toBe("function");
    });

    it("should have curriculumFollow model accessor", () => {
      expect(prisma.curriculumFollow).toBeDefined();
      expect(typeof prisma.curriculumFollow.findMany).toBe("function");
      expect(typeof prisma.curriculumFollow.findUnique).toBe("function");
      expect(typeof prisma.curriculumFollow.create).toBe("function");
      expect(typeof prisma.curriculumFollow.update).toBe("function");
      expect(typeof prisma.curriculumFollow.delete).toBe("function");
    });

    it("should have curriculumFollow model with expected query methods", () => {
      expect(typeof prisma.curriculumFollow.findFirst).toBe("function");
      expect(typeof prisma.curriculumFollow.findFirstOrThrow).toBe("function");
      expect(typeof prisma.curriculumFollow.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.curriculumFollow.createMany).toBe("function");
      expect(typeof prisma.curriculumFollow.updateMany).toBe("function");
      expect(typeof prisma.curriculumFollow.deleteMany).toBe("function");
      expect(typeof prisma.curriculumFollow.count).toBe("function");
      expect(typeof prisma.curriculumFollow.aggregate).toBe("function");
    });

    // Social Models - Follow, ReadingGroup, ReadingGroupMember, GroupDiscussion, DiscussionReply

    it("should have follow model accessor", () => {
      expect(prisma.follow).toBeDefined();
      expect(typeof prisma.follow.findMany).toBe("function");
      expect(typeof prisma.follow.findUnique).toBe("function");
      expect(typeof prisma.follow.create).toBe("function");
      expect(typeof prisma.follow.update).toBe("function");
      expect(typeof prisma.follow.delete).toBe("function");
    });

    it("should have follow model with expected query methods", () => {
      expect(typeof prisma.follow.findFirst).toBe("function");
      expect(typeof prisma.follow.findFirstOrThrow).toBe("function");
      expect(typeof prisma.follow.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.follow.createMany).toBe("function");
      expect(typeof prisma.follow.updateMany).toBe("function");
      expect(typeof prisma.follow.deleteMany).toBe("function");
      expect(typeof prisma.follow.count).toBe("function");
      expect(typeof prisma.follow.aggregate).toBe("function");
    });

    it("should have readingGroup model accessor", () => {
      expect(prisma.readingGroup).toBeDefined();
      expect(typeof prisma.readingGroup.findMany).toBe("function");
      expect(typeof prisma.readingGroup.findUnique).toBe("function");
      expect(typeof prisma.readingGroup.create).toBe("function");
      expect(typeof prisma.readingGroup.update).toBe("function");
      expect(typeof prisma.readingGroup.delete).toBe("function");
    });

    it("should have readingGroup model with expected query methods", () => {
      expect(typeof prisma.readingGroup.findFirst).toBe("function");
      expect(typeof prisma.readingGroup.findFirstOrThrow).toBe("function");
      expect(typeof prisma.readingGroup.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.readingGroup.createMany).toBe("function");
      expect(typeof prisma.readingGroup.updateMany).toBe("function");
      expect(typeof prisma.readingGroup.deleteMany).toBe("function");
      expect(typeof prisma.readingGroup.count).toBe("function");
      expect(typeof prisma.readingGroup.aggregate).toBe("function");
    });

    it("should have readingGroupMember model accessor", () => {
      expect(prisma.readingGroupMember).toBeDefined();
      expect(typeof prisma.readingGroupMember.findMany).toBe("function");
      expect(typeof prisma.readingGroupMember.findUnique).toBe("function");
      expect(typeof prisma.readingGroupMember.create).toBe("function");
      expect(typeof prisma.readingGroupMember.update).toBe("function");
      expect(typeof prisma.readingGroupMember.delete).toBe("function");
    });

    it("should have readingGroupMember model with expected query methods", () => {
      expect(typeof prisma.readingGroupMember.findFirst).toBe("function");
      expect(typeof prisma.readingGroupMember.findFirstOrThrow).toBe(
        "function"
      );
      expect(typeof prisma.readingGroupMember.findUniqueOrThrow).toBe(
        "function"
      );
      expect(typeof prisma.readingGroupMember.createMany).toBe("function");
      expect(typeof prisma.readingGroupMember.updateMany).toBe("function");
      expect(typeof prisma.readingGroupMember.deleteMany).toBe("function");
      expect(typeof prisma.readingGroupMember.count).toBe("function");
      expect(typeof prisma.readingGroupMember.aggregate).toBe("function");
    });

    it("should have groupDiscussion model accessor", () => {
      expect(prisma.groupDiscussion).toBeDefined();
      expect(typeof prisma.groupDiscussion.findMany).toBe("function");
      expect(typeof prisma.groupDiscussion.findUnique).toBe("function");
      expect(typeof prisma.groupDiscussion.create).toBe("function");
      expect(typeof prisma.groupDiscussion.update).toBe("function");
      expect(typeof prisma.groupDiscussion.delete).toBe("function");
    });

    it("should have groupDiscussion model with expected query methods", () => {
      expect(typeof prisma.groupDiscussion.findFirst).toBe("function");
      expect(typeof prisma.groupDiscussion.findFirstOrThrow).toBe("function");
      expect(typeof prisma.groupDiscussion.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.groupDiscussion.createMany).toBe("function");
      expect(typeof prisma.groupDiscussion.updateMany).toBe("function");
      expect(typeof prisma.groupDiscussion.deleteMany).toBe("function");
      expect(typeof prisma.groupDiscussion.count).toBe("function");
      expect(typeof prisma.groupDiscussion.aggregate).toBe("function");
    });

    it("should have discussionReply model accessor", () => {
      expect(prisma.discussionReply).toBeDefined();
      expect(typeof prisma.discussionReply.findMany).toBe("function");
      expect(typeof prisma.discussionReply.findUnique).toBe("function");
      expect(typeof prisma.discussionReply.create).toBe("function");
      expect(typeof prisma.discussionReply.update).toBe("function");
      expect(typeof prisma.discussionReply.delete).toBe("function");
    });

    it("should have discussionReply model with expected query methods", () => {
      expect(typeof prisma.discussionReply.findFirst).toBe("function");
      expect(typeof prisma.discussionReply.findFirstOrThrow).toBe("function");
      expect(typeof prisma.discussionReply.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.discussionReply.createMany).toBe("function");
      expect(typeof prisma.discussionReply.updateMany).toBe("function");
      expect(typeof prisma.discussionReply.deleteMany).toBe("function");
      expect(typeof prisma.discussionReply.count).toBe("function");
      expect(typeof prisma.discussionReply.aggregate).toBe("function");
    });

    // Forum Models - ForumCategory, ForumPost, ForumReply, ForumVote

    it("should have forumCategory model accessor", () => {
      expect(prisma.forumCategory).toBeDefined();
      expect(typeof prisma.forumCategory.findMany).toBe("function");
      expect(typeof prisma.forumCategory.findUnique).toBe("function");
      expect(typeof prisma.forumCategory.create).toBe("function");
      expect(typeof prisma.forumCategory.update).toBe("function");
      expect(typeof prisma.forumCategory.delete).toBe("function");
    });

    it("should have forumCategory model with expected query methods", () => {
      expect(typeof prisma.forumCategory.findFirst).toBe("function");
      expect(typeof prisma.forumCategory.findFirstOrThrow).toBe("function");
      expect(typeof prisma.forumCategory.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.forumCategory.createMany).toBe("function");
      expect(typeof prisma.forumCategory.updateMany).toBe("function");
      expect(typeof prisma.forumCategory.deleteMany).toBe("function");
      expect(typeof prisma.forumCategory.count).toBe("function");
      expect(typeof prisma.forumCategory.aggregate).toBe("function");
    });

    it("should have forumPost model accessor", () => {
      expect(prisma.forumPost).toBeDefined();
      expect(typeof prisma.forumPost.findMany).toBe("function");
      expect(typeof prisma.forumPost.findUnique).toBe("function");
      expect(typeof prisma.forumPost.create).toBe("function");
      expect(typeof prisma.forumPost.update).toBe("function");
      expect(typeof prisma.forumPost.delete).toBe("function");
    });

    it("should have forumPost model with expected query methods", () => {
      expect(typeof prisma.forumPost.findFirst).toBe("function");
      expect(typeof prisma.forumPost.findFirstOrThrow).toBe("function");
      expect(typeof prisma.forumPost.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.forumPost.createMany).toBe("function");
      expect(typeof prisma.forumPost.updateMany).toBe("function");
      expect(typeof prisma.forumPost.deleteMany).toBe("function");
      expect(typeof prisma.forumPost.count).toBe("function");
      expect(typeof prisma.forumPost.aggregate).toBe("function");
    });

    it("should have forumReply model accessor", () => {
      expect(prisma.forumReply).toBeDefined();
      expect(typeof prisma.forumReply.findMany).toBe("function");
      expect(typeof prisma.forumReply.findUnique).toBe("function");
      expect(typeof prisma.forumReply.create).toBe("function");
      expect(typeof prisma.forumReply.update).toBe("function");
      expect(typeof prisma.forumReply.delete).toBe("function");
    });

    it("should have forumReply model with expected query methods", () => {
      expect(typeof prisma.forumReply.findFirst).toBe("function");
      expect(typeof prisma.forumReply.findFirstOrThrow).toBe("function");
      expect(typeof prisma.forumReply.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.forumReply.createMany).toBe("function");
      expect(typeof prisma.forumReply.updateMany).toBe("function");
      expect(typeof prisma.forumReply.deleteMany).toBe("function");
      expect(typeof prisma.forumReply.count).toBe("function");
      expect(typeof prisma.forumReply.aggregate).toBe("function");
    });

    it("should have forumVote model accessor", () => {
      expect(prisma.forumVote).toBeDefined();
      expect(typeof prisma.forumVote.findMany).toBe("function");
      expect(typeof prisma.forumVote.findUnique).toBe("function");
      expect(typeof prisma.forumVote.create).toBe("function");
      expect(typeof prisma.forumVote.update).toBe("function");
      expect(typeof prisma.forumVote.delete).toBe("function");
    });

    it("should have forumVote model with expected query methods", () => {
      expect(typeof prisma.forumVote.findFirst).toBe("function");
      expect(typeof prisma.forumVote.findFirstOrThrow).toBe("function");
      expect(typeof prisma.forumVote.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.forumVote.createMany).toBe("function");
      expect(typeof prisma.forumVote.updateMany).toBe("function");
      expect(typeof prisma.forumVote.deleteMany).toBe("function");
      expect(typeof prisma.forumVote.count).toBe("function");
      expect(typeof prisma.forumVote.aggregate).toBe("function");
    });

    // System Models - AIUsageLog, AuditLog

    it("should have aIUsageLog model accessor", () => {
      expect(prisma.aIUsageLog).toBeDefined();
      expect(typeof prisma.aIUsageLog.findMany).toBe("function");
      expect(typeof prisma.aIUsageLog.findUnique).toBe("function");
      expect(typeof prisma.aIUsageLog.create).toBe("function");
      expect(typeof prisma.aIUsageLog.update).toBe("function");
      expect(typeof prisma.aIUsageLog.delete).toBe("function");
    });

    it("should have aIUsageLog model with expected query methods", () => {
      expect(typeof prisma.aIUsageLog.findFirst).toBe("function");
      expect(typeof prisma.aIUsageLog.findFirstOrThrow).toBe("function");
      expect(typeof prisma.aIUsageLog.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.aIUsageLog.createMany).toBe("function");
      expect(typeof prisma.aIUsageLog.updateMany).toBe("function");
      expect(typeof prisma.aIUsageLog.deleteMany).toBe("function");
      expect(typeof prisma.aIUsageLog.count).toBe("function");
      expect(typeof prisma.aIUsageLog.aggregate).toBe("function");
    });

    it("should have auditLog model accessor", () => {
      expect(prisma.auditLog).toBeDefined();
      expect(typeof prisma.auditLog.findMany).toBe("function");
      expect(typeof prisma.auditLog.findUnique).toBe("function");
      expect(typeof prisma.auditLog.create).toBe("function");
      expect(typeof prisma.auditLog.update).toBe("function");
      expect(typeof prisma.auditLog.delete).toBe("function");
    });

    it("should have auditLog model with expected query methods", () => {
      expect(typeof prisma.auditLog.findFirst).toBe("function");
      expect(typeof prisma.auditLog.findFirstOrThrow).toBe("function");
      expect(typeof prisma.auditLog.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.auditLog.createMany).toBe("function");
      expect(typeof prisma.auditLog.updateMany).toBe("function");
      expect(typeof prisma.auditLog.deleteMany).toBe("function");
      expect(typeof prisma.auditLog.count).toBe("function");
      expect(typeof prisma.auditLog.aggregate).toBe("function");
    });

    // Analytics Models - DailyAnalytics

    it("should have dailyAnalytics model accessor", () => {
      expect(prisma.dailyAnalytics).toBeDefined();
      expect(typeof prisma.dailyAnalytics.findMany).toBe("function");
      expect(typeof prisma.dailyAnalytics.findUnique).toBe("function");
      expect(typeof prisma.dailyAnalytics.create).toBe("function");
      expect(typeof prisma.dailyAnalytics.update).toBe("function");
      expect(typeof prisma.dailyAnalytics.delete).toBe("function");
      expect(typeof prisma.dailyAnalytics.upsert).toBe("function");
    });

    it("should have dailyAnalytics model with expected query methods", () => {
      expect(typeof prisma.dailyAnalytics.findFirst).toBe("function");
      expect(typeof prisma.dailyAnalytics.findFirstOrThrow).toBe("function");
      expect(typeof prisma.dailyAnalytics.findUniqueOrThrow).toBe("function");
      expect(typeof prisma.dailyAnalytics.createMany).toBe("function");
      expect(typeof prisma.dailyAnalytics.updateMany).toBe("function");
      expect(typeof prisma.dailyAnalytics.deleteMany).toBe("function");
      expect(typeof prisma.dailyAnalytics.count).toBe("function");
      expect(typeof prisma.dailyAnalytics.aggregate).toBe("function");
    });
  });

  describe("utility functions", () => {
    it("should export disconnect function", () => {
      expect(typeof disconnect).toBe("function");
    });

    it("should export connect function", () => {
      expect(typeof connect).toBe("function");
    });
  });

  describe("PrismaClient export", () => {
    it("should export PrismaClient class", () => {
      expect(PrismaClient).toBeDefined();
      expect(typeof PrismaClient).toBe("function");
    });
  });

  describe("singleton behavior", () => {
    it("should return the same instance on multiple imports", async () => {
      // Import again to verify singleton
      const { prisma: prisma2 } = await import("./client");
      expect(prisma).toBe(prisma2);
    });
  });
});
