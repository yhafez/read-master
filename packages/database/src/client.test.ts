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
