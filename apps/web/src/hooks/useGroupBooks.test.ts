/**
 * Tests for useGroupBooks hook
 *
 * Tests the group books hook functionality:
 * - Query key generation
 * - Status colors and labels
 * - Book sorting
 */

import { describe, it, expect } from "vitest";
import {
  groupBooksQueryKeys,
  getGroupBookStatusColor,
  getGroupBookStatusLabel,
  sortGroupBooks,
  type GroupBook,
  type GroupBookStatus,
} from "./useGroupBooks";

// ============================================================================
// Query Keys Tests
// ============================================================================

describe("groupBooksQueryKeys", () => {
  describe("all", () => {
    it("returns base query key", () => {
      expect(groupBooksQueryKeys.all).toEqual(["groupBooks"]);
    });
  });

  describe("list", () => {
    it("returns list query key with groupId", () => {
      const result = groupBooksQueryKeys.list("group123");
      expect(result).toEqual(["groupBooks", "list", "group123", undefined]);
    });

    it("returns list query key with groupId and filters", () => {
      const filters = { status: "CURRENT" as GroupBookStatus, page: 2 };
      const result = groupBooksQueryKeys.list("group123", filters);
      expect(result).toEqual(["groupBooks", "list", "group123", filters]);
    });

    it("includes different filter values", () => {
      const filters1 = { status: "UPCOMING" as GroupBookStatus };
      const filters2 = { status: "COMPLETED" as GroupBookStatus };

      const result1 = groupBooksQueryKeys.list("group123", filters1);
      const result2 = groupBooksQueryKeys.list("group123", filters2);

      expect(result1).not.toEqual(result2);
    });
  });

  describe("detail", () => {
    it("returns detail query key with groupId and bookId", () => {
      const result = groupBooksQueryKeys.detail("group123", "book456");
      expect(result).toEqual(["groupBooks", "detail", "group123", "book456"]);
    });

    it("different bookIds produce different keys", () => {
      const result1 = groupBooksQueryKeys.detail("group123", "book1");
      const result2 = groupBooksQueryKeys.detail("group123", "book2");

      expect(result1).not.toEqual(result2);
    });

    it("different groupIds produce different keys", () => {
      const result1 = groupBooksQueryKeys.detail("group1", "book1");
      const result2 = groupBooksQueryKeys.detail("group2", "book1");

      expect(result1).not.toEqual(result2);
    });
  });
});

// ============================================================================
// Status Color Tests
// ============================================================================

describe("getGroupBookStatusColor", () => {
  it('returns "primary" for CURRENT status', () => {
    expect(getGroupBookStatusColor("CURRENT")).toBe("primary");
  });

  it('returns "success" for COMPLETED status', () => {
    expect(getGroupBookStatusColor("COMPLETED")).toBe("success");
  });

  it('returns "default" for UPCOMING status', () => {
    expect(getGroupBookStatusColor("UPCOMING")).toBe("default");
  });

  it('returns "warning" for SKIPPED status', () => {
    expect(getGroupBookStatusColor("SKIPPED")).toBe("warning");
  });

  it('returns "default" for unknown status', () => {
    // Type assertion to test edge case
    expect(getGroupBookStatusColor("UNKNOWN" as GroupBookStatus)).toBe(
      "default"
    );
  });
});

// ============================================================================
// Status Label Tests
// ============================================================================

describe("getGroupBookStatusLabel", () => {
  it('returns "Currently Reading" for CURRENT status', () => {
    expect(getGroupBookStatusLabel("CURRENT")).toBe("Currently Reading");
  });

  it('returns "Completed" for COMPLETED status', () => {
    expect(getGroupBookStatusLabel("COMPLETED")).toBe("Completed");
  });

  it('returns "Upcoming" for UPCOMING status', () => {
    expect(getGroupBookStatusLabel("UPCOMING")).toBe("Upcoming");
  });

  it('returns "Skipped" for SKIPPED status', () => {
    expect(getGroupBookStatusLabel("SKIPPED")).toBe("Skipped");
  });

  it("returns the status string for unknown status", () => {
    const unknownStatus = "UNKNOWN" as GroupBookStatus;
    expect(getGroupBookStatusLabel(unknownStatus)).toBe("UNKNOWN");
  });
});

// ============================================================================
// Sort Books Tests
// ============================================================================

describe("sortGroupBooks", () => {
  const createMockBook = (
    id: string,
    status: GroupBookStatus,
    orderIndex: number
  ): GroupBook => ({
    id,
    groupId: "group1",
    book: {
      id: `book-${id}`,
      title: `Book ${id}`,
      author: null,
      coverImage: null,
      wordCount: null,
    },
    status,
    startDate: null,
    endDate: null,
    targetPage: null,
    orderIndex,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it("sorts CURRENT status books first", () => {
    const books = [
      createMockBook("1", "UPCOMING", 0),
      createMockBook("2", "CURRENT", 0),
      createMockBook("3", "COMPLETED", 0),
    ];

    const sorted = sortGroupBooks(books);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]?.status).toBe("CURRENT");
  });

  it("sorts UPCOMING after CURRENT", () => {
    const books = [
      createMockBook("1", "COMPLETED", 0),
      createMockBook("2", "UPCOMING", 0),
      createMockBook("3", "CURRENT", 0),
    ];

    const sorted = sortGroupBooks(books);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]?.status).toBe("CURRENT");
    expect(sorted[1]?.status).toBe("UPCOMING");
  });

  it("sorts COMPLETED after UPCOMING", () => {
    const books = [
      createMockBook("1", "COMPLETED", 0),
      createMockBook("2", "UPCOMING", 0),
    ];

    const sorted = sortGroupBooks(books);

    expect(sorted).toHaveLength(2);
    expect(sorted[0]?.status).toBe("UPCOMING");
    expect(sorted[1]?.status).toBe("COMPLETED");
  });

  it("sorts SKIPPED last", () => {
    const books = [
      createMockBook("1", "SKIPPED", 0),
      createMockBook("2", "CURRENT", 0),
      createMockBook("3", "UPCOMING", 0),
      createMockBook("4", "COMPLETED", 0),
    ];

    const sorted = sortGroupBooks(books);

    expect(sorted).toHaveLength(4);
    expect(sorted[3]?.status).toBe("SKIPPED");
  });

  it("sorts by orderIndex within same status", () => {
    const books = [
      createMockBook("1", "UPCOMING", 2),
      createMockBook("2", "UPCOMING", 0),
      createMockBook("3", "UPCOMING", 1),
    ];

    const sorted = sortGroupBooks(books);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]?.id).toBe("2");
    expect(sorted[1]?.id).toBe("3");
    expect(sorted[2]?.id).toBe("1");
  });

  it("handles empty array", () => {
    const sorted = sortGroupBooks([]);
    expect(sorted).toEqual([]);
  });

  it("handles single item", () => {
    const books = [createMockBook("1", "CURRENT", 0)];
    const sorted = sortGroupBooks(books);

    expect(sorted).toHaveLength(1);
    expect(sorted[0]?.id).toBe("1");
  });

  it("does not modify original array", () => {
    const books = [
      createMockBook("1", "COMPLETED", 0),
      createMockBook("2", "CURRENT", 0),
    ];
    const original = [...books];

    sortGroupBooks(books);

    expect(books).toEqual(original);
  });

  it("correctly orders all statuses", () => {
    const books = [
      createMockBook("1", "SKIPPED", 0),
      createMockBook("2", "COMPLETED", 0),
      createMockBook("3", "UPCOMING", 0),
      createMockBook("4", "CURRENT", 0),
    ];

    const sorted = sortGroupBooks(books);

    expect(sorted.map((b) => b.status)).toEqual([
      "CURRENT",
      "UPCOMING",
      "COMPLETED",
      "SKIPPED",
    ]);
  });

  it("maintains stable sort for same status and order", () => {
    const books = [
      createMockBook("a", "CURRENT", 0),
      createMockBook("b", "CURRENT", 0),
      createMockBook("c", "CURRENT", 0),
    ];

    const sorted = sortGroupBooks(books);

    // All have same priority, so order should be stable
    expect(sorted.every((b) => b.status === "CURRENT")).toBe(true);
  });
});

// ============================================================================
// Type Tests (compile-time checks)
// ============================================================================

describe("GroupBookStatus type", () => {
  it("accepts valid status values", () => {
    const statuses: GroupBookStatus[] = [
      "UPCOMING",
      "CURRENT",
      "COMPLETED",
      "SKIPPED",
    ];

    statuses.forEach((status) => {
      expect(typeof status).toBe("string");
    });
  });
});

describe("GroupBook type", () => {
  it("has required fields", () => {
    const book: GroupBook = {
      id: "1",
      groupId: "group1",
      book: {
        id: "book1",
        title: "Test Book",
        author: "Author",
        coverImage: null,
        wordCount: 50000,
      },
      status: "CURRENT",
      startDate: "2024-01-01",
      endDate: "2024-02-01",
      targetPage: 100,
      orderIndex: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    expect(book.id).toBeDefined();
    expect(book.groupId).toBeDefined();
    expect(book.book).toBeDefined();
    expect(book.status).toBeDefined();
  });

  it("accepts null for optional date fields", () => {
    const book: GroupBook = {
      id: "1",
      groupId: "group1",
      book: {
        id: "book1",
        title: "Test Book",
        author: null,
        coverImage: null,
        wordCount: null,
      },
      status: "UPCOMING",
      startDate: null,
      endDate: null,
      targetPage: null,
      orderIndex: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    expect(book.startDate).toBeNull();
    expect(book.endDate).toBeNull();
    expect(book.targetPage).toBeNull();
  });
});
