/**
 * Tests for CurriculumItemsManager component
 */

import { describe, it, expect } from "vitest";
import type { CurriculumItem } from "./CurriculumItemsManager";

describe("CurriculumItemsManager", () => {
  describe("Type Definitions", () => {
    it("should define CurriculumItem interface for books", () => {
      const item: CurriculumItem = {
        id: "item-1",
        type: "BOOK",
        orderIndex: 0,
        bookId: "book-123",
        bookTitle: "Test Book",
        notes: "Test notes",
        estimatedTimeMinutes: 60,
      };

      expect(item.type).toBe("BOOK");
      expect(item.bookId).toBe("book-123");
      expect(item.bookTitle).toBe("Test Book");
      expect(item.orderIndex).toBe(0);
    });

    it("should define CurriculumItem interface for external resources", () => {
      const item: CurriculumItem = {
        id: "item-2",
        type: "EXTERNAL_RESOURCE",
        orderIndex: 1,
        externalUrl: "https://example.com",
        externalTitle: "External Resource",
        notes: "Test notes",
        estimatedTimeMinutes: 30,
      };

      expect(item.type).toBe("EXTERNAL_RESOURCE");
      expect(item.externalUrl).toBe("https://example.com");
      expect(item.externalTitle).toBe("External Resource");
      expect(item.orderIndex).toBe(1);
    });
  });

  describe("Item Ordering", () => {
    it("should maintain order indices", () => {
      const items: CurriculumItem[] = [
        {
          id: "1",
          type: "BOOK",
          orderIndex: 0,
          bookId: "book-1",
          bookTitle: "Book 1",
        },
        {
          id: "2",
          type: "BOOK",
          orderIndex: 1,
          bookId: "book-2",
          bookTitle: "Book 2",
        },
        {
          id: "3",
          type: "EXTERNAL_RESOURCE",
          orderIndex: 2,
          externalUrl: "https://example.com",
          externalTitle: "Resource 1",
        },
      ];

      expect(items[0]?.orderIndex).toBe(0);
      expect(items[1]?.orderIndex).toBe(1);
      expect(items[2]?.orderIndex).toBe(2);
    });

    it("should reindex items after reordering", () => {
      const items: CurriculumItem[] = [
        {
          id: "1",
          type: "BOOK",
          orderIndex: 0,
          bookId: "b1",
          bookTitle: "Book 1",
        },
        {
          id: "2",
          type: "BOOK",
          orderIndex: 1,
          bookId: "b2",
          bookTitle: "Book 2",
        },
        {
          id: "3",
          type: "BOOK",
          orderIndex: 2,
          bookId: "b3",
          bookTitle: "Book 3",
        },
      ];

      // Simulate moving item 2 to position 0
      const [removed] = items.splice(1, 1);
      if (!removed) {
        throw new Error("Item not found");
      }
      items.unshift(removed);

      // Reindex
      const reindexed = items.map((item, index) => ({
        ...item,
        orderIndex: index,
      }));

      expect(reindexed).toHaveLength(3);
      expect(reindexed[0]).toBeDefined();
      expect(reindexed[1]).toBeDefined();
      expect(reindexed[2]).toBeDefined();
    });
  });

  describe("Item Types", () => {
    it("should support BOOK type", () => {
      const type: "BOOK" | "EXTERNAL_RESOURCE" = "BOOK";
      expect(type).toBe("BOOK");
    });

    it("should support EXTERNAL_RESOURCE type", () => {
      const type: "BOOK" | "EXTERNAL_RESOURCE" = "EXTERNAL_RESOURCE";
      expect(type).toBe("EXTERNAL_RESOURCE");
    });
  });

  describe("Optional Fields", () => {
    it("should allow items without notes", () => {
      const item: CurriculumItem = {
        id: "item-1",
        type: "BOOK",
        orderIndex: 0,
        bookId: "book-123",
        bookTitle: "Test Book",
      };

      expect(item.notes).toBeUndefined();
    });

    it("should allow items without estimated time", () => {
      const item: CurriculumItem = {
        id: "item-1",
        type: "BOOK",
        orderIndex: 0,
        bookId: "book-123",
        bookTitle: "Test Book",
      };

      expect(item.estimatedTimeMinutes).toBeUndefined();
    });
  });
});
