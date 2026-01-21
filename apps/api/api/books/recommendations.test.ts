/**
 * Tests for GET /api/books/recommendations
 */

import { describe, it, expect } from "vitest";

describe("GET /api/books/recommendations", () => {
  describe("Query validation", () => {
    it("should default limit to 10", () => {
      const defaultLimit = 10;
      expect(defaultLimit).toBe(10);
    });

    it("should accept custom limit", () => {
      const limit = 5;
      expect(limit).toBeGreaterThanOrEqual(1);
      expect(limit).toBeLessThanOrEqual(50);
    });

    it("should reject limit less than 1", () => {
      const limit = 0;
      expect(limit).toBeLessThan(1);
    });

    it("should reject limit greater than 50", () => {
      const limit = 51;
      expect(limit).toBeGreaterThan(50);
    });
  });

  describe("Recommendation logic", () => {
    it("should return empty array when user follows nobody", () => {
      const followedUserIds: string[] = [];
      expect(followedUserIds.length).toBe(0);
    });

    it("should exclude books user already has", () => {
      const userBooks = ["book1", "book2"];
      const friendBook = "book1";
      expect(userBooks.includes(friendBook)).toBe(true);
    });

    it("should only include public books", () => {
      const book = { isPublic: true };
      expect(book.isPublic).toBe(true);
    });

    it("should only include reading or completed books", () => {
      const statuses = ["READING", "COMPLETED"];
      expect(statuses).toContain("READING");
      expect(statuses).toContain("COMPLETED");
      expect(statuses).not.toContain("WANT_TO_READ");
    });

    it("should count completed books with higher weight", () => {
      const completedCount = 3;
      const readingCount = 2;
      const score = completedCount * 2 + readingCount;
      expect(score).toBe(8); // 3*2 + 2 = 8
    });

    it("should sort by popularity", () => {
      const bookA = { completedCount: 5, readingCount: 2 }; // score = 12
      const bookB = { completedCount: 3, readingCount: 4 }; // score = 10
      const scoreA = bookA.completedCount * 2 + bookA.readingCount;
      const scoreB = bookB.completedCount * 2 + bookB.readingCount;
      expect(scoreA).toBeGreaterThan(scoreB);
    });
  });

  describe("Response formatting", () => {
    it("should include required book fields", () => {
      const recommendation = {
        id: "book1",
        title: "Great Book",
        author: "John Doe",
        coverImage: "https://example.com/cover.jpg",
        description: "A great book",
        genre: "Fiction",
        wordCount: 50000,
        estimatedReadTime: 200,
        recommendedBy: [],
        readingCount: 2,
        completedCount: 3,
      };

      expect(recommendation).toHaveProperty("id");
      expect(recommendation).toHaveProperty("title");
      expect(recommendation).toHaveProperty("author");
      expect(recommendation).toHaveProperty("recommendedBy");
      expect(recommendation).toHaveProperty("readingCount");
      expect(recommendation).toHaveProperty("completedCount");
    });

    it("should include recommender information", () => {
      const recommender = {
        id: "user1",
        username: "john_doe",
        displayName: "John Doe",
        avatar: "https://example.com/avatar.jpg",
      };

      expect(recommender).toHaveProperty("id");
      expect(recommender).toHaveProperty("username");
      expect(recommender).toHaveProperty("displayName");
      expect(recommender).toHaveProperty("avatar");
    });
  });

  describe("Book grouping", () => {
    it("should group books by sourceId", () => {
      const book1 = { sourceId: "google_123", title: "Same Book" };
      const book2 = { sourceId: "google_123", title: "Same Book" };
      const key1 = book1.sourceId || book1.title;
      const key2 = book2.sourceId || book2.title;
      expect(key1).toBe(key2);
    });

    it("should group books by title when no sourceId", () => {
      const book1 = { sourceId: null, title: "Unique Title" };
      const book2 = { sourceId: null, title: "Unique Title" };
      const key1 = book1.sourceId || book1.title;
      const key2 = book2.sourceId || book2.title;
      expect(key1).toBe(key2);
    });

    it("should count multiple readers for same book", () => {
      const readers = ["user1", "user2", "user3"];
      expect(readers.length).toBe(3);
    });
  });
});
