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
