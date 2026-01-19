/**
 * Tests for the collections store
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  useCollectionsStore,
  COLLECTIONS_STORAGE_KEY,
  collectionColors,
  generateCollectionId,
  validateCollectionName,
  validateCollectionColor,
  wouldCreateCycle,
  getDescendantIds,
  getCollectionPath,
  sanitizeCollection,
  type Collection,
  type CollectionColor,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "./collectionsStore";

describe("collectionsStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useCollectionsStore.getState().reset();
  });

  describe("COLLECTIONS_STORAGE_KEY", () => {
    it("should have correct storage key", () => {
      expect(COLLECTIONS_STORAGE_KEY).toBe("read-master-collections");
    });
  });

  describe("collectionColors", () => {
    it("should have all expected colors", () => {
      expect(collectionColors).toContain("default");
      expect(collectionColors).toContain("red");
      expect(collectionColors).toContain("orange");
      expect(collectionColors).toContain("yellow");
      expect(collectionColors).toContain("green");
      expect(collectionColors).toContain("blue");
      expect(collectionColors).toContain("purple");
      expect(collectionColors).toContain("pink");
    });

    it("should have 8 colors total", () => {
      expect(collectionColors.length).toBe(8);
    });
  });

  describe("generateCollectionId", () => {
    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCollectionId());
      }
      expect(ids.size).toBe(100);
    });

    it("should start with col_ prefix", () => {
      const id = generateCollectionId();
      expect(id.startsWith("col_")).toBe(true);
    });

    it("should have reasonable length", () => {
      const id = generateCollectionId();
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(40);
    });
  });

  describe("validateCollectionName", () => {
    it("should accept valid names", () => {
      expect(validateCollectionName("Fiction")).toBe(true);
      expect(validateCollectionName("a")).toBe(true);
      expect(validateCollectionName("My Collection")).toBe(true);
    });

    it("should reject empty names", () => {
      expect(validateCollectionName("")).toBe(false);
      expect(validateCollectionName("   ")).toBe(false);
    });

    it("should reject names over 100 characters", () => {
      const longName = "a".repeat(101);
      expect(validateCollectionName(longName)).toBe(false);
    });

    it("should accept names exactly 100 characters", () => {
      const exactName = "a".repeat(100);
      expect(validateCollectionName(exactName)).toBe(true);
    });

    it("should trim whitespace before validation", () => {
      expect(validateCollectionName("  valid  ")).toBe(true);
      expect(validateCollectionName("  ")).toBe(false);
    });
  });

  describe("validateCollectionColor", () => {
    it("should return valid colors unchanged", () => {
      expect(validateCollectionColor("default")).toBe("default");
      expect(validateCollectionColor("red")).toBe("red");
      expect(validateCollectionColor("blue")).toBe("blue");
    });

    it("should return default for invalid colors", () => {
      expect(validateCollectionColor("invalid")).toBe("default");
      expect(validateCollectionColor("")).toBe("default");
      expect(validateCollectionColor("rainbow")).toBe("default");
    });
  });

  describe("wouldCreateCycle", () => {
    const createTestCollections = (): Collection[] => [
      {
        id: "col1",
        name: "Root",
        description: "",
        parentId: null,
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "col2",
        name: "Child",
        description: "",
        parentId: "col1",
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "col3",
        name: "Grandchild",
        description: "",
        parentId: "col2",
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    it("should return false for null parent", () => {
      const collections = createTestCollections();
      expect(wouldCreateCycle(collections, "col3", null)).toBe(false);
    });

    it("should return true for self-reference", () => {
      const collections = createTestCollections();
      expect(wouldCreateCycle(collections, "col1", "col1")).toBe(true);
    });

    it("should detect cycle when moving parent to child", () => {
      const collections = createTestCollections();
      expect(wouldCreateCycle(collections, "col1", "col2")).toBe(true);
    });

    it("should detect cycle when moving grandparent to grandchild", () => {
      const collections = createTestCollections();
      expect(wouldCreateCycle(collections, "col1", "col3")).toBe(true);
    });

    it("should allow valid moves", () => {
      const collections = createTestCollections();
      // Moving col3 to col1 (sibling of col2) is valid
      expect(wouldCreateCycle(collections, "col3", "col1")).toBe(false);
    });
  });

  describe("getDescendantIds", () => {
    const createTestCollections = (): Collection[] => [
      {
        id: "root",
        name: "Root",
        description: "",
        parentId: null,
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "child1",
        name: "Child1",
        description: "",
        parentId: "root",
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "child2",
        name: "Child2",
        description: "",
        parentId: "root",
        color: "default",
        bookIds: [],
        order: 1,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "grandchild",
        name: "Grandchild",
        description: "",
        parentId: "child1",
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    it("should return all descendants", () => {
      const collections = createTestCollections();
      const descendants = getDescendantIds(collections, "root");
      expect(descendants).toContain("child1");
      expect(descendants).toContain("child2");
      expect(descendants).toContain("grandchild");
      expect(descendants.length).toBe(3);
    });

    it("should return only direct descendants children", () => {
      const collections = createTestCollections();
      const descendants = getDescendantIds(collections, "child1");
      expect(descendants).toContain("grandchild");
      expect(descendants.length).toBe(1);
    });

    it("should return empty array for leaf nodes", () => {
      const collections = createTestCollections();
      const descendants = getDescendantIds(collections, "grandchild");
      expect(descendants).toEqual([]);
    });

    it("should return empty array for non-existent collection", () => {
      const collections = createTestCollections();
      const descendants = getDescendantIds(collections, "nonexistent");
      expect(descendants).toEqual([]);
    });
  });

  describe("getCollectionPath", () => {
    const createTestCollections = (): Collection[] => [
      {
        id: "root",
        name: "Root",
        description: "",
        parentId: null,
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "child",
        name: "Child",
        description: "",
        parentId: "root",
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "grandchild",
        name: "Grandchild",
        description: "",
        parentId: "child",
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    it("should return path from root to collection", () => {
      const collections = createTestCollections();
      const path = getCollectionPath(collections, "grandchild");
      expect(path.length).toBe(3);
      expect(path[0]?.id).toBe("root");
      expect(path[1]?.id).toBe("child");
      expect(path[2]?.id).toBe("grandchild");
    });

    it("should return single item for root collection", () => {
      const collections = createTestCollections();
      const path = getCollectionPath(collections, "root");
      expect(path.length).toBe(1);
      expect(path[0]?.id).toBe("root");
    });

    it("should return empty array for non-existent collection", () => {
      const collections = createTestCollections();
      const path = getCollectionPath(collections, "nonexistent");
      expect(path).toEqual([]);
    });
  });

  describe("sanitizeCollection", () => {
    it("should sanitize valid collection data", () => {
      const input = {
        id: "col1",
        name: "  My Collection  ",
        description: "  Description  ",
        parentId: null,
        color: "red" as CollectionColor,
        bookIds: ["book1", "book2"],
        order: 5,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const result = sanitizeCollection(input);
      expect(result.id).toBe("col1");
      expect(result.name).toBe("My Collection");
      expect(result.description).toBe("Description");
      expect(result.parentId).toBeNull();
      expect(result.color).toBe("red");
      expect(result.bookIds).toEqual(["book1", "book2"]);
      expect(result.order).toBe(5);
      expect(result.createdAt).toBe(1000);
      expect(result.updatedAt).toBe(2000);
    });

    it("should truncate long names", () => {
      const longName = "a".repeat(150);
      const result = sanitizeCollection({ name: longName });
      expect(result.name?.length).toBe(100);
    });

    it("should truncate long descriptions", () => {
      const longDesc = "a".repeat(600);
      const result = sanitizeCollection({ description: longDesc });
      expect(result.description?.length).toBe(500);
    });

    it("should validate color", () => {
      const result = sanitizeCollection({
        color: "invalid" as CollectionColor,
      });
      expect(result.color).toBe("default");
    });

    it("should filter invalid book IDs", () => {
      const result = sanitizeCollection({
        bookIds: ["valid", 123 as unknown as string, "also-valid"],
      });
      expect(result.bookIds).toEqual(["valid", "also-valid"]);
    });

    it("should handle undefined values", () => {
      const result = sanitizeCollection({});
      expect(result).toEqual({});
    });
  });

  describe("store actions", () => {
    describe("createCollection", () => {
      it("should create a collection with minimum input", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        expect(collection.name).toBe("Test");
        expect(collection.description).toBe("");
        expect(collection.parentId).toBeNull();
        expect(collection.color).toBe("default");
        expect(collection.bookIds).toEqual([]);
        expect(collection.order).toBe(0);
        expect(collection.id).toMatch(/^col_/);
      });

      it("should create a collection with full input", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({
          name: "Test",
          description: "A test collection",
          color: "blue",
        });

        expect(collection.name).toBe("Test");
        expect(collection.description).toBe("A test collection");
        expect(collection.color).toBe("blue");
      });

      it("should trim and truncate name", () => {
        const store = useCollectionsStore.getState();
        const longName = "  " + "a".repeat(150) + "  ";
        const collection = store.createCollection({ name: longName });

        expect(collection.name.length).toBe(100);
        expect(collection.name.startsWith("a")).toBe(true);
      });

      it("should assign correct order to sibling collections", () => {
        const store = useCollectionsStore.getState();
        const col1 = store.createCollection({ name: "First" });
        const col2 = store.createCollection({ name: "Second" });
        const col3 = store.createCollection({ name: "Third" });

        expect(col1.order).toBe(0);
        expect(col2.order).toBe(1);
        expect(col3.order).toBe(2);
      });

      it("should assign correct order within parent", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child1 = store.createCollection({
          name: "Child1",
          parentId: parent.id,
        });
        const child2 = store.createCollection({
          name: "Child2",
          parentId: parent.id,
        });

        expect(child1.order).toBe(0);
        expect(child2.order).toBe(1);
      });

      it("should add collection to store", () => {
        const store = useCollectionsStore.getState();
        store.createCollection({ name: "Test" });

        expect(useCollectionsStore.getState().collections.length).toBe(1);
      });
    });

    describe("updateCollection", () => {
      it("should update collection name", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Original" });

        const result = store.updateCollection({
          id: collection.id,
          name: "Updated",
        });

        expect(result).toBe(true);
        expect(
          useCollectionsStore.getState().getCollection(collection.id)?.name
        ).toBe("Updated");
      });

      it("should update collection color", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        store.updateCollection({ id: collection.id, color: "red" });

        expect(
          useCollectionsStore.getState().getCollection(collection.id)?.color
        ).toBe("red");
      });

      it("should return false for non-existent collection", () => {
        const store = useCollectionsStore.getState();
        const result = store.updateCollection({
          id: "nonexistent",
          name: "Test",
        });

        expect(result).toBe(false);
      });

      it("should prevent cycle when updating parent", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child = store.createCollection({
          name: "Child",
          parentId: parent.id,
        });

        const result = store.updateCollection({
          id: parent.id,
          parentId: child.id,
        });

        expect(result).toBe(false);
      });

      it("should update updatedAt timestamp", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        const originalUpdatedAt = collection.updatedAt;

        // Wait a bit to ensure different timestamp
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            store.updateCollection({ id: collection.id, name: "Updated" });
            const updated = useCollectionsStore
              .getState()
              .getCollection(collection.id);
            expect(updated?.updatedAt).toBeGreaterThan(originalUpdatedAt);
            resolve();
          }, 10);
        });
      });
    });

    describe("deleteCollection", () => {
      it("should delete a collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        const result = store.deleteCollection(collection.id);

        expect(result).toBe(true);
        expect(useCollectionsStore.getState().collections.length).toBe(0);
      });

      it("should return false for non-existent collection", () => {
        const store = useCollectionsStore.getState();
        const result = store.deleteCollection("nonexistent");

        expect(result).toBe(false);
      });

      it("should move children to parent when not deleting children", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child = store.createCollection({
          name: "Child",
          parentId: parent.id,
        });
        const grandchild = store.createCollection({
          name: "Grandchild",
          parentId: child.id,
        });

        store.deleteCollection(child.id, false);

        const updatedGrandchild = useCollectionsStore
          .getState()
          .getCollection(grandchild.id);
        expect(updatedGrandchild?.parentId).toBe(parent.id);
      });

      it("should delete children when deleteChildren is true", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        store.createCollection({ name: "Child", parentId: parent.id });

        store.deleteCollection(parent.id, true);

        expect(useCollectionsStore.getState().collections.length).toBe(0);
      });

      it("should clear selection if deleted collection was selected", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        store.selectCollection(collection.id);

        store.deleteCollection(collection.id);

        expect(useCollectionsStore.getState().selectedCollectionId).toBeNull();
      });

      it("should remove from expanded IDs", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        store.toggleExpanded(collection.id);

        store.deleteCollection(collection.id);

        expect(useCollectionsStore.getState().expandedIds).not.toContain(
          collection.id
        );
      });
    });

    describe("addBookToCollection", () => {
      it("should add a book to a collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        const result = store.addBookToCollection(collection.id, "book1");

        expect(result).toBe(true);
        expect(
          useCollectionsStore.getState().getCollection(collection.id)?.bookIds
        ).toContain("book1");
      });

      it("should return true if book already in collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        store.addBookToCollection(collection.id, "book1");

        const result = store.addBookToCollection(collection.id, "book1");

        expect(result).toBe(true);
        // Should not have duplicates
        expect(
          useCollectionsStore.getState().getCollection(collection.id)?.bookIds
            .length
        ).toBe(1);
      });

      it("should return false for non-existent collection", () => {
        const store = useCollectionsStore.getState();
        const result = store.addBookToCollection("nonexistent", "book1");

        expect(result).toBe(false);
      });
    });

    describe("removeBookFromCollection", () => {
      it("should remove a book from a collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        store.addBookToCollection(collection.id, "book1");

        const result = store.removeBookFromCollection(collection.id, "book1");

        expect(result).toBe(true);
        expect(
          useCollectionsStore.getState().getCollection(collection.id)?.bookIds
        ).not.toContain("book1");
      });

      it("should return false for non-existent collection", () => {
        const store = useCollectionsStore.getState();
        const result = store.removeBookFromCollection("nonexistent", "book1");

        expect(result).toBe(false);
      });
    });

    describe("moveCollection", () => {
      it("should move a collection to a new parent", () => {
        const store = useCollectionsStore.getState();
        const parent1 = store.createCollection({ name: "Parent1" });
        const parent2 = store.createCollection({ name: "Parent2" });
        const child = store.createCollection({
          name: "Child",
          parentId: parent1.id,
        });

        const result = store.moveCollection(child.id, parent2.id);

        expect(result).toBe(true);
        expect(
          useCollectionsStore.getState().getCollection(child.id)?.parentId
        ).toBe(parent2.id);
      });

      it("should move a collection to root", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child = store.createCollection({
          name: "Child",
          parentId: parent.id,
        });

        const result = store.moveCollection(child.id, null);

        expect(result).toBe(true);
        expect(
          useCollectionsStore.getState().getCollection(child.id)?.parentId
        ).toBeNull();
      });

      it("should prevent cycles", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child = store.createCollection({
          name: "Child",
          parentId: parent.id,
        });

        const result = store.moveCollection(parent.id, child.id);

        expect(result).toBe(false);
      });

      it("should assign correct order in new parent", () => {
        const store = useCollectionsStore.getState();
        const parent1 = store.createCollection({ name: "Parent1" });
        const parent2 = store.createCollection({ name: "Parent2" });
        const existing = store.createCollection({
          name: "Existing",
          parentId: parent2.id,
        });
        const child = store.createCollection({
          name: "Child",
          parentId: parent1.id,
        });

        store.moveCollection(child.id, parent2.id);

        const movedChild = useCollectionsStore
          .getState()
          .getCollection(child.id);
        expect(movedChild?.order).toBe(existing.order + 1);
      });
    });

    describe("reorderCollections", () => {
      it("should reorder collections within a parent", () => {
        const store = useCollectionsStore.getState();
        const col1 = store.createCollection({ name: "First" });
        const col2 = store.createCollection({ name: "Second" });
        const col3 = store.createCollection({ name: "Third" });

        store.reorderCollections(null, [col3.id, col1.id, col2.id]);

        const state = useCollectionsStore.getState();
        expect(state.getCollection(col3.id)?.order).toBe(0);
        expect(state.getCollection(col1.id)?.order).toBe(1);
        expect(state.getCollection(col2.id)?.order).toBe(2);
      });

      it("should only affect collections in the specified parent", () => {
        const store = useCollectionsStore.getState();
        const root = store.createCollection({ name: "Root" });
        const child1 = store.createCollection({
          name: "Child1",
          parentId: root.id,
        });
        const child2 = store.createCollection({
          name: "Child2",
          parentId: root.id,
        });

        store.reorderCollections(root.id, [child2.id, child1.id]);

        const state = useCollectionsStore.getState();
        expect(state.getCollection(child2.id)?.order).toBe(0);
        expect(state.getCollection(child1.id)?.order).toBe(1);
        expect(state.getCollection(root.id)?.order).toBe(0); // Unchanged
      });
    });

    describe("selectCollection", () => {
      it("should select a collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        store.selectCollection(collection.id);

        expect(useCollectionsStore.getState().selectedCollectionId).toBe(
          collection.id
        );
      });

      it("should deselect when null is passed", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        store.selectCollection(collection.id);

        store.selectCollection(null);

        expect(useCollectionsStore.getState().selectedCollectionId).toBeNull();
      });
    });

    describe("toggleExpanded", () => {
      it("should expand a collapsed collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        store.toggleExpanded(collection.id);

        expect(useCollectionsStore.getState().expandedIds).toContain(
          collection.id
        );
      });

      it("should collapse an expanded collection", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });
        store.toggleExpanded(collection.id);

        store.toggleExpanded(collection.id);

        expect(useCollectionsStore.getState().expandedIds).not.toContain(
          collection.id
        );
      });
    });

    describe("setExpandedIds", () => {
      it("should set expanded IDs", () => {
        const store = useCollectionsStore.getState();
        const col1 = store.createCollection({ name: "Col1" });
        const col2 = store.createCollection({ name: "Col2" });

        store.setExpandedIds([col1.id, col2.id]);

        expect(useCollectionsStore.getState().expandedIds).toEqual([
          col1.id,
          col2.id,
        ]);
      });
    });

    describe("getRootCollections", () => {
      it("should return only root collections", () => {
        const store = useCollectionsStore.getState();
        const root1 = store.createCollection({ name: "Root1" });
        const root2 = store.createCollection({ name: "Root2" });
        store.createCollection({ name: "Child", parentId: root1.id });

        const roots = store.getRootCollections();

        expect(roots.length).toBe(2);
        expect(roots.map((r) => r.id)).toContain(root1.id);
        expect(roots.map((r) => r.id)).toContain(root2.id);
      });

      it("should return collections sorted by order", () => {
        const store = useCollectionsStore.getState();
        const col1 = store.createCollection({ name: "First" });
        const col2 = store.createCollection({ name: "Second" });
        const col3 = store.createCollection({ name: "Third" });

        store.reorderCollections(null, [col3.id, col1.id, col2.id]);

        const roots = useCollectionsStore.getState().getRootCollections();
        expect(roots[0]?.id).toBe(col3.id);
        expect(roots[1]?.id).toBe(col1.id);
        expect(roots[2]?.id).toBe(col2.id);
      });
    });

    describe("getChildCollections", () => {
      it("should return children of a collection", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child1 = store.createCollection({
          name: "Child1",
          parentId: parent.id,
        });
        const child2 = store.createCollection({
          name: "Child2",
          parentId: parent.id,
        });
        store.createCollection({ name: "Other" });

        const children = store.getChildCollections(parent.id);

        expect(children.length).toBe(2);
        expect(children.map((c) => c.id)).toContain(child1.id);
        expect(children.map((c) => c.id)).toContain(child2.id);
      });

      it("should return children sorted by order", () => {
        const store = useCollectionsStore.getState();
        const parent = store.createCollection({ name: "Parent" });
        const child1 = store.createCollection({
          name: "Child1",
          parentId: parent.id,
        });
        const child2 = store.createCollection({
          name: "Child2",
          parentId: parent.id,
        });

        store.reorderCollections(parent.id, [child2.id, child1.id]);

        const children = useCollectionsStore
          .getState()
          .getChildCollections(parent.id);
        expect(children[0]?.id).toBe(child2.id);
        expect(children[1]?.id).toBe(child1.id);
      });

      it("should return empty array for collection with no children", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        const children = store.getChildCollections(collection.id);

        expect(children).toEqual([]);
      });
    });

    describe("getCollection", () => {
      it("should return collection by ID", () => {
        const store = useCollectionsStore.getState();
        const collection = store.createCollection({ name: "Test" });

        const found = store.getCollection(collection.id);

        expect(found?.id).toBe(collection.id);
      });

      it("should return undefined for non-existent ID", () => {
        const store = useCollectionsStore.getState();
        const found = store.getCollection("nonexistent");

        expect(found).toBeUndefined();
      });
    });

    describe("getCollectionsForBook", () => {
      it("should return collections containing a book", () => {
        const store = useCollectionsStore.getState();
        const col1 = store.createCollection({ name: "Col1" });
        const col2 = store.createCollection({ name: "Col2" });
        store.createCollection({ name: "Col3" });
        store.addBookToCollection(col1.id, "book1");
        store.addBookToCollection(col2.id, "book1");

        const collections = store.getCollectionsForBook("book1");

        expect(collections.length).toBe(2);
        expect(collections.map((c) => c.id)).toContain(col1.id);
        expect(collections.map((c) => c.id)).toContain(col2.id);
      });

      it("should return empty array if book is in no collections", () => {
        const store = useCollectionsStore.getState();
        store.createCollection({ name: "Test" });

        const collections = store.getCollectionsForBook("book1");

        expect(collections).toEqual([]);
      });
    });

    describe("reset", () => {
      it("should reset to default state", () => {
        const store = useCollectionsStore.getState();
        store.createCollection({ name: "Test" });
        store.selectCollection("some-id");
        store.setExpandedIds(["id1", "id2"]);

        store.reset();

        const state = useCollectionsStore.getState();
        expect(state.collections).toEqual([]);
        expect(state.selectedCollectionId).toBeNull();
        expect(state.expandedIds).toEqual([]);
      });
    });
  });

  describe("type exports", () => {
    it("should export Collection type", () => {
      const collection: Collection = {
        id: "test",
        name: "Test",
        description: "",
        parentId: null,
        color: "default",
        bookIds: [],
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      };
      expect(collection).toBeDefined();
    });

    it("should export CollectionColor type", () => {
      const color: CollectionColor = "red";
      expect(color).toBe("red");
    });

    it("should export CreateCollectionInput type", () => {
      const input: CreateCollectionInput = {
        name: "Test",
        description: "Desc",
        parentId: null,
        color: "blue",
      };
      expect(input).toBeDefined();
    });

    it("should export UpdateCollectionInput type", () => {
      const input: UpdateCollectionInput = {
        id: "test",
        name: "Updated",
      };
      expect(input).toBeDefined();
    });
  });
});
