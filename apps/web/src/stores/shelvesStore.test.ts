/**
 * Tests for shelvesStore
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  useShelvesStore,
  SHELVES_STORAGE_KEY,
  shelfIcons,
  generateShelfId,
  validateShelfName,
  validateShelfIcon,
  sanitizeShelf,
  getShelvesForBook,
  getAllBookIds,
} from "./shelvesStore";
import type {
  Shelf,
  ShelfIcon,
  CreateShelfInput,
  UpdateShelfInput,
} from "./shelvesStore";

describe("shelvesStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useShelvesStore.getState().reset();
  });

  // ============================================================
  // Constants and Types
  // ============================================================

  describe("constants", () => {
    it("should have correct storage key", () => {
      expect(SHELVES_STORAGE_KEY).toBe("read-master-shelves");
    });

    it("should have 8 shelf icons", () => {
      expect(shelfIcons).toHaveLength(8);
      expect(shelfIcons).toContain("shelf");
      expect(shelfIcons).toContain("book");
      expect(shelfIcons).toContain("star");
      expect(shelfIcons).toContain("heart");
      expect(shelfIcons).toContain("bookmark");
      expect(shelfIcons).toContain("flag");
      expect(shelfIcons).toContain("tag");
      expect(shelfIcons).toContain("folder");
    });
  });

  // ============================================================
  // Utility Functions
  // ============================================================

  describe("generateShelfId", () => {
    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateShelfId());
      }
      expect(ids.size).toBe(100);
    });

    it("should have correct prefix", () => {
      const id = generateShelfId();
      expect(id).toMatch(/^shelf_\d+_[a-z0-9]+$/);
    });
  });

  describe("validateShelfName", () => {
    it("should accept valid names", () => {
      expect(validateShelfName("A")).toBe(true);
      expect(validateShelfName("My Shelf")).toBe(true);
      expect(validateShelfName("a".repeat(50))).toBe(true);
    });

    it("should reject empty names", () => {
      expect(validateShelfName("")).toBe(false);
      expect(validateShelfName("   ")).toBe(false);
    });

    it("should reject names over 50 chars", () => {
      expect(validateShelfName("a".repeat(51))).toBe(false);
    });

    it("should handle whitespace correctly", () => {
      expect(validateShelfName("  valid  ")).toBe(true);
    });
  });

  describe("validateShelfIcon", () => {
    it("should return valid icons unchanged", () => {
      expect(validateShelfIcon("book")).toBe("book");
      expect(validateShelfIcon("star")).toBe("star");
      expect(validateShelfIcon("shelf")).toBe("shelf");
    });

    it("should return default for invalid icons", () => {
      expect(validateShelfIcon("invalid")).toBe("shelf");
      expect(validateShelfIcon("")).toBe("shelf");
    });
  });

  describe("sanitizeShelf", () => {
    it("should sanitize valid shelf data", () => {
      const shelf: Partial<Shelf> = {
        id: "shelf_123",
        name: "Test Shelf",
        description: "A description",
        icon: "book",
        bookIds: ["book1", "book2"],
        order: 1,
        createdAt: 1000,
        updatedAt: 2000,
      };
      const sanitized = sanitizeShelf(shelf);
      expect(sanitized).toEqual(shelf);
    });

    it("should truncate long names", () => {
      const shelf: Partial<Shelf> = {
        name: "a".repeat(100),
      };
      const sanitized = sanitizeShelf(shelf);
      expect(sanitized.name).toHaveLength(50);
    });

    it("should truncate long descriptions", () => {
      const shelf: Partial<Shelf> = {
        description: "a".repeat(500),
      };
      const sanitized = sanitizeShelf(shelf);
      expect(sanitized.description).toHaveLength(200);
    });

    it("should filter invalid book IDs", () => {
      const shelf: Partial<Shelf> = {
        bookIds: [
          "valid",
          123 as unknown as string,
          "also-valid",
          null as unknown as string,
        ],
      };
      const sanitized = sanitizeShelf(shelf);
      expect(sanitized.bookIds).toEqual(["valid", "also-valid"]);
    });

    it("should validate icon", () => {
      const shelf: Partial<Shelf> = {
        icon: "invalid" as ShelfIcon,
      };
      const sanitized = sanitizeShelf(shelf);
      expect(sanitized.icon).toBe("shelf");
    });

    it("should ignore invalid order values", () => {
      const shelf1: Partial<Shelf> = { order: NaN };
      const shelf2: Partial<Shelf> = { order: Infinity };
      expect(sanitizeShelf(shelf1).order).toBeUndefined();
      expect(sanitizeShelf(shelf2).order).toBeUndefined();
    });
  });

  describe("getShelvesForBook", () => {
    it("should return shelves containing a book", () => {
      const shelves: Shelf[] = [
        {
          id: "s1",
          name: "Shelf 1",
          description: "",
          icon: "shelf",
          bookIds: ["book1", "book2"],
          order: 0,
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: "s2",
          name: "Shelf 2",
          description: "",
          icon: "shelf",
          bookIds: ["book2", "book3"],
          order: 1,
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: "s3",
          name: "Shelf 3",
          description: "",
          icon: "shelf",
          bookIds: ["book3"],
          order: 2,
          createdAt: 0,
          updatedAt: 0,
        },
      ];

      const result = getShelvesForBook(shelves, "book2");
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(["s1", "s2"]);
    });

    it("should return empty array if book not on any shelf", () => {
      const shelves: Shelf[] = [
        {
          id: "s1",
          name: "Shelf 1",
          description: "",
          icon: "shelf",
          bookIds: ["book1"],
          order: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      ];

      const result = getShelvesForBook(shelves, "book99");
      expect(result).toHaveLength(0);
    });
  });

  describe("getAllBookIds", () => {
    it("should return all unique book IDs", () => {
      const shelves: Shelf[] = [
        {
          id: "s1",
          name: "Shelf 1",
          description: "",
          icon: "shelf",
          bookIds: ["book1", "book2"],
          order: 0,
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: "s2",
          name: "Shelf 2",
          description: "",
          icon: "shelf",
          bookIds: ["book2", "book3"],
          order: 1,
          createdAt: 0,
          updatedAt: 0,
        },
      ];

      const result = getAllBookIds(shelves);
      expect(result).toHaveLength(3);
      expect(result).toContain("book1");
      expect(result).toContain("book2");
      expect(result).toContain("book3");
    });

    it("should return empty array for no shelves", () => {
      expect(getAllBookIds([])).toEqual([]);
    });
  });

  // ============================================================
  // Store - CRUD Operations
  // ============================================================

  describe("createShelf", () => {
    it("should create a shelf with defaults", () => {
      const input: CreateShelfInput = { name: "My Shelf" };
      const shelf = useShelvesStore.getState().createShelf(input);

      expect(shelf.name).toBe("My Shelf");
      expect(shelf.description).toBe("");
      expect(shelf.icon).toBe("shelf");
      expect(shelf.bookIds).toEqual([]);
      expect(shelf.order).toBe(0);
    });

    it("should create a shelf with all options", () => {
      const input: CreateShelfInput = {
        name: "Favorites",
        description: "My favorite books",
        icon: "star",
      };
      const shelf = useShelvesStore.getState().createShelf(input);

      expect(shelf.name).toBe("Favorites");
      expect(shelf.description).toBe("My favorite books");
      expect(shelf.icon).toBe("star");
    });

    it("should trim and limit name length", () => {
      const input: CreateShelfInput = {
        name: "  " + "a".repeat(100) + "  ",
      };
      const shelf = useShelvesStore.getState().createShelf(input);

      expect(shelf.name).toHaveLength(50);
    });

    it("should assign incremental order", () => {
      const shelf1 = useShelvesStore.getState().createShelf({ name: "First" });
      const shelf2 = useShelvesStore.getState().createShelf({ name: "Second" });
      const shelf3 = useShelvesStore.getState().createShelf({ name: "Third" });

      expect(shelf1.order).toBe(0);
      expect(shelf2.order).toBe(1);
      expect(shelf3.order).toBe(2);
    });

    it("should add shelf to store", () => {
      useShelvesStore.getState().createShelf({ name: "Test" });

      const shelves = useShelvesStore.getState().shelves;
      expect(shelves).toHaveLength(1);
    });
  });

  describe("updateShelf", () => {
    it("should update shelf name", () => {
      const shelf = useShelvesStore
        .getState()
        .createShelf({ name: "Original" });

      const result = useShelvesStore
        .getState()
        .updateShelf({ id: shelf.id, name: "Updated" });

      expect(result).toBe(true);
      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.name).toBe("Updated");
    });

    it("should update shelf icon", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });

      useShelvesStore.getState().updateShelf({ id: shelf.id, icon: "heart" });

      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.icon).toBe("heart");
    });

    it("should return false for non-existent shelf", () => {
      const result = useShelvesStore
        .getState()
        .updateShelf({ id: "nonexistent", name: "New" });

      expect(result).toBe(false);
    });

    it("should update timestamp", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      const originalUpdatedAt = shelf.updatedAt;

      useShelvesStore.getState().updateShelf({ id: shelf.id, name: "Updated" });

      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe("deleteShelf", () => {
    it("should delete a shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });

      const result = useShelvesStore.getState().deleteShelf(shelf.id);

      expect(result).toBe(true);
      expect(useShelvesStore.getState().shelves).toHaveLength(0);
    });

    it("should return false for non-existent shelf", () => {
      const result = useShelvesStore.getState().deleteShelf("nonexistent");

      expect(result).toBe(false);
    });

    it("should clear selectedShelfId if deleted", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().selectShelf(shelf.id);

      expect(useShelvesStore.getState().selectedShelfId).toBe(shelf.id);

      useShelvesStore.getState().deleteShelf(shelf.id);

      expect(useShelvesStore.getState().selectedShelfId).toBeNull();
    });
  });

  // ============================================================
  // Store - Book Management
  // ============================================================

  describe("addBookToShelf", () => {
    it("should add a book to a shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });

      const result = useShelvesStore
        .getState()
        .addBookToShelf(shelf.id, "book1");

      expect(result).toBe(true);
      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.bookIds).toContain("book1");
    });

    it("should return true if book already on shelf (idempotent)", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().addBookToShelf(shelf.id, "book1");

      const result = useShelvesStore
        .getState()
        .addBookToShelf(shelf.id, "book1");

      expect(result).toBe(true);
      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.bookIds.filter((id) => id === "book1")).toHaveLength(1);
    });

    it("should return false for non-existent shelf", () => {
      const result = useShelvesStore
        .getState()
        .addBookToShelf("nonexistent", "book1");

      expect(result).toBe(false);
    });
  });

  describe("removeBookFromShelf", () => {
    it("should remove a book from a shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().addBookToShelf(shelf.id, "book1");

      const result = useShelvesStore
        .getState()
        .removeBookFromShelf(shelf.id, "book1");

      expect(result).toBe(true);
      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.bookIds).not.toContain("book1");
    });

    it("should return false for non-existent shelf", () => {
      const result = useShelvesStore
        .getState()
        .removeBookFromShelf("nonexistent", "book1");

      expect(result).toBe(false);
    });
  });

  describe("addBookToShelves", () => {
    it("should add a book to multiple shelves", () => {
      const shelf1 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 1" });
      const shelf2 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 2" });
      const shelf3 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 3" });

      useShelvesStore
        .getState()
        .addBookToShelves([shelf1.id, shelf2.id], "book1");

      const s1 = useShelvesStore.getState().getShelf(shelf1.id);
      const s2 = useShelvesStore.getState().getShelf(shelf2.id);
      const s3 = useShelvesStore.getState().getShelf(shelf3.id);

      expect(s1?.bookIds).toContain("book1");
      expect(s2?.bookIds).toContain("book1");
      expect(s3?.bookIds).not.toContain("book1");
    });

    it("should not duplicate if already on shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().addBookToShelf(shelf.id, "book1");

      useShelvesStore.getState().addBookToShelves([shelf.id], "book1");

      const updated = useShelvesStore.getState().getShelf(shelf.id);
      expect(updated?.bookIds.filter((id) => id === "book1")).toHaveLength(1);
    });
  });

  describe("removeBookFromAllShelves", () => {
    it("should remove a book from all shelves", () => {
      const shelf1 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 1" });
      const shelf2 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 2" });
      useShelvesStore.getState().addBookToShelf(shelf1.id, "book1");
      useShelvesStore.getState().addBookToShelf(shelf2.id, "book1");

      useShelvesStore.getState().removeBookFromAllShelves("book1");

      const s1 = useShelvesStore.getState().getShelf(shelf1.id);
      const s2 = useShelvesStore.getState().getShelf(shelf2.id);

      expect(s1?.bookIds).not.toContain("book1");
      expect(s2?.bookIds).not.toContain("book1");
    });
  });

  // ============================================================
  // Store - Reordering
  // ============================================================

  describe("reorderShelves", () => {
    it("should reorder shelves", () => {
      const shelf1 = useShelvesStore.getState().createShelf({ name: "First" });
      const shelf2 = useShelvesStore.getState().createShelf({ name: "Second" });
      const shelf3 = useShelvesStore.getState().createShelf({ name: "Third" });

      useShelvesStore
        .getState()
        .reorderShelves([shelf3.id, shelf1.id, shelf2.id]);

      const shelves = useShelvesStore.getState().getShelves();
      expect(shelves[0]?.id).toBe(shelf3.id);
      expect(shelves[1]?.id).toBe(shelf1.id);
      expect(shelves[2]?.id).toBe(shelf2.id);
    });

    it("should ignore IDs not in the list", () => {
      const shelf1 = useShelvesStore.getState().createShelf({ name: "First" });
      const shelf2 = useShelvesStore.getState().createShelf({ name: "Second" });

      const originalOrder1 = shelf1.order;

      // Only reorder shelf2, shelf1 keeps original order
      useShelvesStore.getState().reorderShelves([shelf2.id]);

      const s1 = useShelvesStore.getState().getShelf(shelf1.id);
      expect(s1?.order).toBe(originalOrder1);
    });
  });

  // ============================================================
  // Store - Selection and Queries
  // ============================================================

  describe("selectShelf", () => {
    it("should select a shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });

      useShelvesStore.getState().selectShelf(shelf.id);

      expect(useShelvesStore.getState().selectedShelfId).toBe(shelf.id);
    });

    it("should clear selection with null", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().selectShelf(shelf.id);

      useShelvesStore.getState().selectShelf(null);

      expect(useShelvesStore.getState().selectedShelfId).toBeNull();
    });
  });

  describe("getShelves", () => {
    it("should return shelves sorted by order", () => {
      useShelvesStore.getState().createShelf({ name: "Third" });
      useShelvesStore.getState().createShelf({ name: "First" });
      useShelvesStore.getState().createShelf({ name: "Second" });

      const state = useShelvesStore.getState();
      // Reorder them
      state.reorderShelves([
        state.shelves[1]?.id ?? "",
        state.shelves[2]?.id ?? "",
        state.shelves[0]?.id ?? "",
      ]);

      const shelves = useShelvesStore.getState().getShelves();
      expect(shelves[0]?.name).toBe("First");
      expect(shelves[1]?.name).toBe("Second");
      expect(shelves[2]?.name).toBe("Third");
    });
  });

  describe("getShelf", () => {
    it("should return shelf by ID", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });

      const result = useShelvesStore.getState().getShelf(shelf.id);
      expect(result?.name).toBe("Test");
    });

    it("should return undefined for non-existent ID", () => {
      const result = useShelvesStore.getState().getShelf("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getShelvesForBook", () => {
    it("should return shelves containing a book", () => {
      const shelf1 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 1" });
      const shelf2 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 2" });
      const shelf3 = useShelvesStore
        .getState()
        .createShelf({ name: "Shelf 3" });
      useShelvesStore.getState().addBookToShelf(shelf1.id, "book1");
      useShelvesStore.getState().addBookToShelf(shelf2.id, "book1");

      const result = useShelvesStore.getState().getShelvesForBook("book1");
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toContain(shelf1.id);
      expect(result.map((s) => s.id)).toContain(shelf2.id);
      expect(result.map((s) => s.id)).not.toContain(shelf3.id);
    });
  });

  describe("isBookOnShelf", () => {
    it("should return true if book is on shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().addBookToShelf(shelf.id, "book1");

      const result = useShelvesStore
        .getState()
        .isBookOnShelf(shelf.id, "book1");
      expect(result).toBe(true);
    });

    it("should return false if book is not on shelf", () => {
      const shelf = useShelvesStore.getState().createShelf({ name: "Test" });

      const result = useShelvesStore
        .getState()
        .isBookOnShelf(shelf.id, "book1");
      expect(result).toBe(false);
    });

    it("should return false for non-existent shelf", () => {
      const result = useShelvesStore
        .getState()
        .isBookOnShelf("nonexistent", "book1");
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // Store - Reset
  // ============================================================

  describe("reset", () => {
    it("should reset to default state", () => {
      useShelvesStore.getState().createShelf({ name: "Test" });
      useShelvesStore.getState().selectShelf("some-id");

      useShelvesStore.getState().reset();

      const state = useShelvesStore.getState();
      expect(state.shelves).toHaveLength(0);
      expect(state.selectedShelfId).toBeNull();
    });
  });

  // ============================================================
  // Type Exports
  // ============================================================

  describe("type exports", () => {
    it("should export Shelf type", () => {
      const shelf: Shelf = {
        id: "test",
        name: "Test",
        description: "",
        icon: "shelf",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      };
      expect(shelf.id).toBe("test");
    });

    it("should export ShelfIcon type", () => {
      const icon: ShelfIcon = "book";
      expect(shelfIcons).toContain(icon);
    });

    it("should export CreateShelfInput type", () => {
      const input: CreateShelfInput = {
        name: "Test",
        description: "Desc",
        icon: "star",
      };
      expect(input.name).toBe("Test");
    });

    it("should export UpdateShelfInput type", () => {
      const input: UpdateShelfInput = {
        id: "test",
        name: "New Name",
      };
      expect(input.id).toBe("test");
    });
  });
});
