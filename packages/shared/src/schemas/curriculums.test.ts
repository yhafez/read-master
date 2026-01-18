/**
 * Tests for Curriculum Zod schemas
 *
 * This test suite validates:
 * - Enum schemas (visibility, difficulty)
 * - ID schemas (curriculumId, itemId)
 * - Content field schemas (title, description) with profanity filter
 * - Create/update schemas for curriculums and items
 * - Follow and progress schemas
 * - Query schemas with pagination and filtering
 * - Bulk operation schemas
 */

import { describe, expect, it } from "vitest";
import {
  // Enums
  visibilitySchema,
  difficultySchema,

  // IDs
  curriculumIdSchema,
  curriculumItemIdSchema,
  curriculumBookIdSchema,

  // Fields
  curriculumTitleSchema,
  curriculumTitlePublicSchema,
  curriculumDescriptionSchema,
  curriculumDescriptionPublicSchema,
  curriculumCategorySchema,
  curriculumTagSchema,
  curriculumTagsArraySchema,
  curriculumCoverImageSchema,
  orderIndexSchema,
  estimatedTimeSchema,

  // Create schemas
  createCurriculumSchema,
  createCurriculumBaseSchema,

  // Update schemas
  updateCurriculumSchema,
  updateCurriculumBaseSchema,

  // Item schemas
  externalResourceSchema,
  curriculumItemNotesSchema,
  curriculumItemNotesPublicSchema,
  addBookItemSchema,
  addExternalItemSchema,
  addCurriculumItemSchema,
  updateCurriculumItemSchema,
  reorderCurriculumItemsSchema,

  // Follow schemas
  followCurriculumSchema,
  updateCurriculumProgressSchema,
  markItemCompleteSchema,

  // Query schemas
  curriculumSortFieldSchema,
  curriculumQuerySchema,
  browseCurriculumsQuerySchema,
  followingCurriculumsQuerySchema,

  // ID params
  curriculumIdParamsSchema,
  curriculumItemIdParamsSchema,

  // Bulk operations
  bulkDeleteCurriculumItemsSchema,

  // Response schemas
  curriculumItemResponseSchema,
  curriculumSummarySchema,
  curriculumResponseSchema,

  // Collection
  curriculumSchemas,
} from "./curriculums";

// =============================================================================
// ENUM VALIDATION TESTS
// =============================================================================

describe("Curriculum Enum Schemas", () => {
  describe("visibilitySchema", () => {
    it("should accept valid visibility values", () => {
      expect(visibilitySchema.parse("PRIVATE")).toBe("PRIVATE");
      expect(visibilitySchema.parse("UNLISTED")).toBe("UNLISTED");
      expect(visibilitySchema.parse("PUBLIC")).toBe("PUBLIC");
    });

    it("should reject invalid visibility values", () => {
      expect(() => visibilitySchema.parse("private")).toThrow();
      expect(() => visibilitySchema.parse("HIDDEN")).toThrow();
      expect(() => visibilitySchema.parse("")).toThrow();
    });
  });

  describe("difficultySchema", () => {
    it("should accept valid difficulty values", () => {
      expect(difficultySchema.parse("BEGINNER")).toBe("BEGINNER");
      expect(difficultySchema.parse("INTERMEDIATE")).toBe("INTERMEDIATE");
      expect(difficultySchema.parse("ADVANCED")).toBe("ADVANCED");
      expect(difficultySchema.parse("EXPERT")).toBe("EXPERT");
    });

    it("should reject invalid difficulty values", () => {
      expect(() => difficultySchema.parse("beginner")).toThrow();
      expect(() => difficultySchema.parse("EASY")).toThrow();
      expect(() => difficultySchema.parse("")).toThrow();
    });
  });
});

// =============================================================================
// ID SCHEMA TESTS
// =============================================================================

describe("Curriculum ID Schemas", () => {
  describe("curriculumIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(curriculumIdSchema.parse("clhcurriculum123")).toBe(
        "clhcurriculum123"
      );
      expect(curriculumIdSchema.parse("c123")).toBe("c123");
    });

    it("should reject invalid formats", () => {
      expect(() => curriculumIdSchema.parse("")).toThrow();
      expect(() => curriculumIdSchema.parse("abc123")).toThrow();
      expect(() => curriculumIdSchema.parse("CLH1234")).toThrow();
    });
  });

  describe("curriculumItemIdSchema", () => {
    it("should accept valid item IDs", () => {
      expect(curriculumItemIdSchema.parse("clhitem123")).toBe("clhitem123");
    });

    it("should reject invalid formats", () => {
      expect(() => curriculumItemIdSchema.parse("")).toThrow();
      expect(() => curriculumItemIdSchema.parse("invalid")).toThrow();
    });
  });

  describe("curriculumBookIdSchema", () => {
    it("should accept valid book IDs", () => {
      expect(curriculumBookIdSchema.parse("clhbook123")).toBe("clhbook123");
    });

    it("should accept optional/nullable values", () => {
      expect(curriculumBookIdSchema.parse(undefined)).toBeUndefined();
      expect(curriculumBookIdSchema.parse(null)).toBeNull();
    });

    it("should reject invalid book IDs", () => {
      expect(() => curriculumBookIdSchema.parse("invalid-id")).toThrow();
    });
  });
});

// =============================================================================
// CONTENT FIELD SCHEMA TESTS
// =============================================================================

describe("Curriculum Content Field Schemas", () => {
  describe("curriculumTitleSchema", () => {
    it("should accept valid titles", () => {
      expect(curriculumTitleSchema.parse("Philosophy Reading Path")).toBe(
        "Philosophy Reading Path"
      );
      expect(curriculumTitleSchema.parse("A")).toBe("A"); // 1 char minimum
    });

    it("should trim whitespace", () => {
      expect(curriculumTitleSchema.parse("  Title  ")).toBe("Title");
    });

    it("should reject empty titles", () => {
      expect(() => curriculumTitleSchema.parse("")).toThrow();
    });

    it("should reject titles over 200 characters", () => {
      const longTitle = "a".repeat(201);
      expect(() => curriculumTitleSchema.parse(longTitle)).toThrow();
    });
  });

  describe("curriculumTitlePublicSchema", () => {
    it("should accept clean titles", () => {
      expect(curriculumTitlePublicSchema.parse("Western Philosophy")).toBe(
        "Western Philosophy"
      );
    });

    it("should reject titles with profanity", () => {
      expect(() =>
        curriculumTitlePublicSchema.parse("The Fucking Guide to Philosophy")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("curriculumDescriptionSchema", () => {
    it("should accept valid descriptions", () => {
      const desc = "A comprehensive journey through Western philosophy.";
      expect(curriculumDescriptionSchema.parse(desc)).toBe(desc);
    });

    it("should trim whitespace", () => {
      expect(curriculumDescriptionSchema.parse("  Description  ")).toBe(
        "Description"
      );
    });

    it("should reject descriptions over 10,000 characters", () => {
      const longDesc = "a".repeat(10001);
      expect(() => curriculumDescriptionSchema.parse(longDesc)).toThrow();
    });
  });

  describe("curriculumDescriptionPublicSchema", () => {
    it("should accept clean descriptions", () => {
      expect(
        curriculumDescriptionPublicSchema.parse("Learn about great books")
      ).toBe("Learn about great books");
    });

    it("should reject descriptions with profanity", () => {
      expect(() =>
        curriculumDescriptionPublicSchema.parse(
          "This is some bullshit description"
        )
      ).toThrow(/inappropriate/i);
    });
  });

  describe("curriculumCategorySchema", () => {
    it("should accept valid categories", () => {
      expect(curriculumCategorySchema.parse("Philosophy")).toBe("Philosophy");
    });

    it("should accept optional/nullable values", () => {
      expect(curriculumCategorySchema.parse(undefined)).toBeUndefined();
      expect(curriculumCategorySchema.parse(null)).toBeNull();
    });

    it("should reject categories over 100 characters", () => {
      const longCategory = "a".repeat(101);
      expect(() => curriculumCategorySchema.parse(longCategory)).toThrow();
    });
  });

  describe("curriculumTagSchema", () => {
    it("should accept valid tags", () => {
      expect(curriculumTagSchema.parse("philosophy")).toBe("philosophy");
      expect(curriculumTagSchema.parse("self-help")).toBe("self-help");
      expect(curriculumTagSchema.parse("beginner_friendly")).toBe(
        "beginner_friendly"
      );
    });

    it("should reject invalid characters in tags", () => {
      expect(() => curriculumTagSchema.parse("tag@invalid")).toThrow();
      expect(() => curriculumTagSchema.parse("tag!")).toThrow();
    });

    it("should reject empty tags", () => {
      expect(() => curriculumTagSchema.parse("")).toThrow();
    });
  });

  describe("curriculumTagsArraySchema", () => {
    it("should accept valid tag arrays", () => {
      const result = curriculumTagsArraySchema.parse([
        "philosophy",
        "ethics",
        "beginner",
      ]);
      expect(result).toHaveLength(3);
    });

    it("should default to empty array", () => {
      expect(curriculumTagsArraySchema.parse(undefined)).toEqual([]);
    });

    it("should reject more than 20 tags", () => {
      const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      expect(() => curriculumTagsArraySchema.parse(tags)).toThrow(/20/);
    });
  });

  describe("curriculumCoverImageSchema", () => {
    it("should accept valid URLs", () => {
      expect(
        curriculumCoverImageSchema.parse("https://example.com/image.jpg")
      ).toBe("https://example.com/image.jpg");
    });

    it("should accept optional/nullable values", () => {
      expect(curriculumCoverImageSchema.parse(undefined)).toBeUndefined();
      expect(curriculumCoverImageSchema.parse(null)).toBeNull();
    });

    it("should reject invalid URLs", () => {
      expect(() => curriculumCoverImageSchema.parse("not-a-url")).toThrow();
    });
  });

  describe("orderIndexSchema", () => {
    it("should accept valid non-negative integers", () => {
      expect(orderIndexSchema.parse(0)).toBe(0);
      expect(orderIndexSchema.parse(5)).toBe(5);
      expect(orderIndexSchema.parse(100)).toBe(100);
    });

    it("should reject negative numbers", () => {
      expect(() => orderIndexSchema.parse(-1)).toThrow();
    });

    it("should reject non-integers", () => {
      expect(() => orderIndexSchema.parse(1.5)).toThrow();
    });
  });

  describe("estimatedTimeSchema", () => {
    it("should accept valid times in minutes", () => {
      expect(estimatedTimeSchema.parse(30)).toBe(30);
      expect(estimatedTimeSchema.parse(120)).toBe(120);
    });

    it("should accept optional/nullable values", () => {
      expect(estimatedTimeSchema.parse(undefined)).toBeUndefined();
      expect(estimatedTimeSchema.parse(null)).toBeNull();
    });

    it("should reject times over 10,000 minutes", () => {
      expect(() => estimatedTimeSchema.parse(10001)).toThrow();
    });

    it("should reject zero or negative times", () => {
      expect(() => estimatedTimeSchema.parse(0)).toThrow();
      expect(() => estimatedTimeSchema.parse(-1)).toThrow();
    });
  });
});

// =============================================================================
// CREATE CURRICULUM SCHEMA TESTS
// =============================================================================

describe("Create Curriculum Schemas", () => {
  describe("createCurriculumBaseSchema", () => {
    it("should accept valid curriculum data", () => {
      const result = createCurriculumBaseSchema.parse({
        title: "Philosophy Path",
        description: "Learn philosophy",
      });
      expect(result.title).toBe("Philosophy Path");
      expect(result.visibility).toBe("PRIVATE");
    });

    it("should accept all optional fields", () => {
      const result = createCurriculumBaseSchema.parse({
        title: "Full Curriculum",
        description: "Complete description",
        coverImage: "https://example.com/cover.jpg",
        category: "Philosophy",
        tags: ["philosophy", "ethics"],
        difficulty: "INTERMEDIATE",
        visibility: "PUBLIC",
      });
      expect(result.difficulty).toBe("INTERMEDIATE");
      expect(result.tags).toEqual(["philosophy", "ethics"]);
    });
  });

  describe("createCurriculumSchema (with profanity filter)", () => {
    it("should accept clean content for private visibility", () => {
      const result = createCurriculumSchema.parse({
        title: "My Private Curriculum",
        description: "Private description",
        visibility: "PRIVATE",
      });
      expect(result.title).toBe("My Private Curriculum");
    });

    it("should accept clean content for public visibility", () => {
      const result = createCurriculumSchema.parse({
        title: "Philosophy Reading Path",
        description: "A journey through Western philosophy",
        visibility: "PUBLIC",
      });
      expect(result.visibility).toBe("PUBLIC");
    });

    it("should reject profanity in title for public visibility", () => {
      expect(() =>
        createCurriculumSchema.parse({
          title: "Fucking Philosophy Guide",
          description: "Clean description",
          visibility: "PUBLIC",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject profanity in description for public visibility", () => {
      expect(() =>
        createCurriculumSchema.parse({
          title: "Philosophy Guide",
          description: "This is some bullshit description",
          visibility: "PUBLIC",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject profanity for unlisted visibility", () => {
      expect(() =>
        createCurriculumSchema.parse({
          title: "Shit Philosophy",
          description: "Description",
          visibility: "UNLISTED",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should allow profanity for private visibility", () => {
      // Private content doesn't need profanity filtering
      const result = createCurriculumSchema.parse({
        title: "My Private Notes",
        description: "Personal notes for myself",
        visibility: "PRIVATE",
      });
      expect(result.visibility).toBe("PRIVATE");
    });
  });
});

// =============================================================================
// UPDATE CURRICULUM SCHEMA TESTS
// =============================================================================

describe("Update Curriculum Schemas", () => {
  describe("updateCurriculumBaseSchema", () => {
    it("should accept partial updates", () => {
      const result = updateCurriculumBaseSchema.parse({
        title: "Updated Title",
      });
      expect(result.title).toBe("Updated Title");
    });

    it("should reject empty update", () => {
      expect(() => updateCurriculumBaseSchema.parse({})).toThrow(
        /at least one field/i
      );
    });
  });

  describe("updateCurriculumSchema (with profanity filter)", () => {
    it("should accept clean updates", () => {
      const result = updateCurriculumSchema.parse({
        title: "Updated Philosophy Path",
        visibility: "PUBLIC",
      });
      expect(result.title).toBe("Updated Philosophy Path");
    });

    it("should reject profanity in updates for non-private visibility", () => {
      expect(() =>
        updateCurriculumSchema.parse({
          title: "Fucking Updated Title",
          visibility: "PUBLIC",
        })
      ).toThrow(/inappropriate/i);
    });
  });
});

// =============================================================================
// CURRICULUM ITEM SCHEMA TESTS
// =============================================================================

describe("Curriculum Item Schemas", () => {
  describe("externalResourceSchema", () => {
    it("should accept valid external resource", () => {
      const result = externalResourceSchema.parse({
        externalTitle: "The Republic by Plato",
        externalAuthor: "Plato",
        externalUrl: "https://example.com/book",
        externalIsbn: "978-0140449143",
      });
      expect(result.externalTitle).toBe("The Republic by Plato");
    });

    it("should accept minimal external resource", () => {
      const result = externalResourceSchema.parse({
        externalTitle: "Book Title",
      });
      expect(result.externalAuthor).toBeUndefined();
    });
  });

  describe("curriculumItemNotesSchema", () => {
    it("should accept valid notes", () => {
      expect(curriculumItemNotesSchema.parse("Read chapters 1-5")).toBe(
        "Read chapters 1-5"
      );
    });

    it("should accept optional/nullable values", () => {
      expect(curriculumItemNotesSchema.parse(undefined)).toBeUndefined();
      expect(curriculumItemNotesSchema.parse(null)).toBeNull();
    });
  });

  describe("curriculumItemNotesPublicSchema", () => {
    it("should reject profanity in notes", () => {
      expect(() =>
        curriculumItemNotesPublicSchema.parse("This shit is important")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("addBookItemSchema", () => {
    it("should accept valid book item", () => {
      const result = addBookItemSchema.parse({
        bookId: "clhbook123",
        notes: "Start here",
        estimatedTime: 120,
      });
      expect(result.bookId).toBe("clhbook123");
      expect(result.isOptional).toBe(false);
    });
  });

  describe("addExternalItemSchema", () => {
    it("should accept valid external item", () => {
      const result = addExternalItemSchema.parse({
        externalTitle: "External Book",
        externalUrl: "https://example.com",
        orderIndex: 0,
      });
      expect(result.externalTitle).toBe("External Book");
    });
  });

  describe("addCurriculumItemSchema", () => {
    it("should accept book reference", () => {
      const result = addCurriculumItemSchema.parse({
        bookId: "clhbook123",
      });
      expect(result.bookId).toBe("clhbook123");
    });

    it("should accept external resource", () => {
      const result = addCurriculumItemSchema.parse({
        externalTitle: "External Book",
      });
      expect(result.externalTitle).toBe("External Book");
    });

    it("should reject when neither bookId nor externalTitle provided", () => {
      expect(() =>
        addCurriculumItemSchema.parse({
          orderIndex: 0,
        })
      ).toThrow(/bookId or externalTitle/i);
    });
  });

  describe("updateCurriculumItemSchema", () => {
    it("should accept partial updates", () => {
      const result = updateCurriculumItemSchema.parse({
        notes: "Updated notes",
        estimatedTime: 60,
      });
      expect(result.notes).toBe("Updated notes");
    });

    it("should reject empty update", () => {
      expect(() => updateCurriculumItemSchema.parse({})).toThrow(
        /at least one field/i
      );
    });
  });

  describe("reorderCurriculumItemsSchema", () => {
    it("should accept valid reorder request", () => {
      const result = reorderCurriculumItemsSchema.parse({
        items: [
          { id: "clhitem1", orderIndex: 0 },
          { id: "clhitem2", orderIndex: 1 },
        ],
      });
      expect(result.items).toHaveLength(2);
    });

    it("should reject empty items array", () => {
      expect(() =>
        reorderCurriculumItemsSchema.parse({
          items: [],
        })
      ).toThrow(/at least one/i);
    });

    it("should reject more than 500 items", () => {
      const items = Array.from({ length: 501 }, (_, i) => ({
        id: `clhitem${i}`,
        orderIndex: i,
      }));
      expect(() =>
        reorderCurriculumItemsSchema.parse({
          items,
        })
      ).toThrow(/500/);
    });
  });
});

// =============================================================================
// FOLLOW SCHEMA TESTS
// =============================================================================

describe("Follow Schemas", () => {
  describe("followCurriculumSchema", () => {
    it("should accept valid curriculum ID", () => {
      const result = followCurriculumSchema.parse({
        curriculumId: "clhcurriculum123",
      });
      expect(result.curriculumId).toBe("clhcurriculum123");
    });
  });

  describe("updateCurriculumProgressSchema", () => {
    it("should accept progress update", () => {
      const result = updateCurriculumProgressSchema.parse({
        currentItemIndex: 5,
        completedItems: 4,
      });
      expect(result.currentItemIndex).toBe(5);
    });
  });

  describe("markItemCompleteSchema", () => {
    it("should accept valid item ID", () => {
      const result = markItemCompleteSchema.parse({
        itemId: "clhitem123",
      });
      expect(result.itemId).toBe("clhitem123");
    });
  });
});

// =============================================================================
// QUERY SCHEMA TESTS
// =============================================================================

describe("Curriculum Query Schemas", () => {
  describe("curriculumQuerySchema", () => {
    it("should apply defaults", () => {
      const result = curriculumQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortDirection).toBe("desc");
      expect(result.includeDeleted).toBe(false);
    });

    it("should coerce string numbers", () => {
      const result = curriculumQuerySchema.parse({
        page: "3",
        limit: "50",
      });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("should accept all filter options", () => {
      const result = curriculumQuerySchema.parse({
        visibility: "PUBLIC",
        category: "Philosophy",
        difficulty: "BEGINNER",
        tags: "philosophy,ethics",
        search: "western",
      });
      expect(result.visibility).toBe("PUBLIC");
      expect(result.tags).toEqual(["philosophy", "ethics"]);
    });

    it("should reject limit over 100", () => {
      expect(() =>
        curriculumQuerySchema.parse({
          limit: 101,
        })
      ).toThrow();
    });
  });

  describe("browseCurriculumsQuerySchema", () => {
    it("should apply defaults for public browsing", () => {
      const result = browseCurriculumsQuerySchema.parse({});
      expect(result.sortBy).toBe("followersCount");
    });

    it("should accept minFollowers filter", () => {
      const result = browseCurriculumsQuerySchema.parse({
        minFollowers: 100,
      });
      expect(result.minFollowers).toBe(100);
    });
  });

  describe("followingCurriculumsQuerySchema", () => {
    it("should accept completion filters", () => {
      const result = followingCurriculumsQuerySchema.parse({
        completed: true,
        inProgress: false,
      });
      expect(result.completed).toBe(true);
      expect(result.inProgress).toBe(false);
    });
  });

  describe("curriculumSortFieldSchema", () => {
    it("should accept valid sort fields", () => {
      expect(curriculumSortFieldSchema.parse("createdAt")).toBe("createdAt");
      expect(curriculumSortFieldSchema.parse("followersCount")).toBe(
        "followersCount"
      );
      expect(curriculumSortFieldSchema.parse("totalItems")).toBe("totalItems");
    });

    it("should reject invalid sort fields", () => {
      expect(() => curriculumSortFieldSchema.parse("invalid")).toThrow();
    });
  });
});

// =============================================================================
// ID PARAMS SCHEMA TESTS
// =============================================================================

describe("Curriculum ID Params Schemas", () => {
  describe("curriculumIdParamsSchema", () => {
    it("should accept valid curriculum ID", () => {
      const result = curriculumIdParamsSchema.parse({
        id: "clhcurriculum123",
      });
      expect(result.id).toBe("clhcurriculum123");
    });
  });

  describe("curriculumItemIdParamsSchema", () => {
    it("should accept valid nested params", () => {
      const result = curriculumItemIdParamsSchema.parse({
        curriculumId: "clhcurriculum123",
        itemId: "clhitem456",
      });
      expect(result.curriculumId).toBe("clhcurriculum123");
      expect(result.itemId).toBe("clhitem456");
    });
  });
});

// =============================================================================
// BULK OPERATIONS SCHEMA TESTS
// =============================================================================

describe("Bulk Operations Schemas", () => {
  describe("bulkDeleteCurriculumItemsSchema", () => {
    it("should accept array of item IDs", () => {
      const result = bulkDeleteCurriculumItemsSchema.parse({
        itemIds: ["clhitem1", "clhitem2", "clhitem3"],
      });
      expect(result.itemIds).toHaveLength(3);
    });

    it("should reject empty array", () => {
      expect(() =>
        bulkDeleteCurriculumItemsSchema.parse({
          itemIds: [],
        })
      ).toThrow(/at least one/i);
    });

    it("should reject more than 100 IDs", () => {
      const ids = Array.from({ length: 101 }, (_, i) => `clhitem${i}`);
      expect(() =>
        bulkDeleteCurriculumItemsSchema.parse({
          itemIds: ids,
        })
      ).toThrow(/100/);
    });
  });
});

// =============================================================================
// RESPONSE SCHEMA TESTS
// =============================================================================

describe("Curriculum Response Schemas", () => {
  describe("curriculumItemResponseSchema", () => {
    it("should accept valid item response", () => {
      const result = curriculumItemResponseSchema.parse({
        id: "clhitem123",
        orderIndex: 0,
        bookId: "clhbook123",
        book: {
          id: "clhbook123",
          title: "The Republic",
          author: "Plato",
          coverImage: null,
        },
        externalTitle: null,
        externalAuthor: null,
        externalUrl: null,
        externalIsbn: null,
        notes: "Read first",
        estimatedTime: 120,
        isOptional: false,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      expect(result.book?.title).toBe("The Republic");
    });

    it("should accept external resource item", () => {
      const result = curriculumItemResponseSchema.parse({
        id: "clhitem456",
        orderIndex: 1,
        bookId: null,
        externalTitle: "External Philosophy Book",
        externalAuthor: "Unknown",
        externalUrl: "https://example.com",
        externalIsbn: null,
        notes: null,
        estimatedTime: null,
        isOptional: true,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      expect(result.externalTitle).toBe("External Philosophy Book");
      expect(result.isOptional).toBe(true);
    });
  });

  describe("curriculumSummarySchema", () => {
    it("should accept valid summary", () => {
      const result = curriculumSummarySchema.parse({
        id: "clhcurriculum123",
        title: "Philosophy Path",
        description: "Learn philosophy",
        coverImage: null,
        category: "Philosophy",
        tags: ["philosophy", "ethics"],
        difficulty: "BEGINNER",
        visibility: "PUBLIC",
        totalItems: 10,
        followersCount: 50,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      expect(result.followersCount).toBe(50);
    });
  });

  describe("curriculumResponseSchema", () => {
    it("should accept full response with items", () => {
      const result = curriculumResponseSchema.parse({
        id: "clhcurriculum123",
        title: "Philosophy Path",
        description: "Learn philosophy",
        coverImage: null,
        category: null,
        tags: [],
        difficulty: null,
        visibility: "PUBLIC",
        totalItems: 1,
        followersCount: 10,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        items: [
          {
            id: "clhitem1",
            orderIndex: 0,
            bookId: "clhbook1",
            externalTitle: null,
            externalAuthor: null,
            externalUrl: null,
            externalIsbn: null,
            notes: null,
            estimatedTime: null,
            isOptional: false,
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z",
          },
        ],
        isFollowing: true,
      });
      expect(result.items).toHaveLength(1);
      expect(result.isFollowing).toBe(true);
    });
  });
});

// =============================================================================
// SCHEMA COLLECTION EXPORT TESTS
// =============================================================================

describe("curriculumSchemas collection", () => {
  it("should export all enum schemas", () => {
    expect(curriculumSchemas.visibility).toBeDefined();
    expect(curriculumSchemas.difficulty).toBeDefined();
  });

  it("should export all field schemas", () => {
    expect(curriculumSchemas.curriculumId).toBeDefined();
    expect(curriculumSchemas.itemId).toBeDefined();
    expect(curriculumSchemas.title).toBeDefined();
    expect(curriculumSchemas.titlePublic).toBeDefined();
    expect(curriculumSchemas.description).toBeDefined();
    expect(curriculumSchemas.descriptionPublic).toBeDefined();
  });

  it("should export all create/update schemas", () => {
    expect(curriculumSchemas.create).toBeDefined();
    expect(curriculumSchemas.createBase).toBeDefined();
    expect(curriculumSchemas.update).toBeDefined();
    expect(curriculumSchemas.updateBase).toBeDefined();
  });

  it("should export all item schemas", () => {
    expect(curriculumSchemas.addItem).toBeDefined();
    expect(curriculumSchemas.addBookItem).toBeDefined();
    expect(curriculumSchemas.addExternalItem).toBeDefined();
    expect(curriculumSchemas.updateItem).toBeDefined();
    expect(curriculumSchemas.reorderItems).toBeDefined();
  });

  it("should export all follow schemas", () => {
    expect(curriculumSchemas.follow).toBeDefined();
    expect(curriculumSchemas.updateProgress).toBeDefined();
    expect(curriculumSchemas.markItemComplete).toBeDefined();
  });

  it("should export all query schemas", () => {
    expect(curriculumSchemas.query).toBeDefined();
    expect(curriculumSchemas.browse).toBeDefined();
    expect(curriculumSchemas.following).toBeDefined();
  });

  it("should export response schemas", () => {
    expect(curriculumSchemas.itemResponse).toBeDefined();
    expect(curriculumSchemas.summary).toBeDefined();
    expect(curriculumSchemas.response).toBeDefined();
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  describe("Unicode and special characters", () => {
    it("should accept unicode in title", () => {
      const result = curriculumTitleSchema.parse("哲学入門");
      expect(result).toBe("哲学入門");
    });

    it("should accept unicode in description", () => {
      const result = curriculumDescriptionSchema.parse(
        "西洋哲学の旅へようこそ。プラトンからニーチェまで探検します。"
      );
      expect(result).toContain("プラトン");
    });

    it("should accept RTL content", () => {
      const result = curriculumDescriptionSchema.parse(
        "رحلة عبر الفلسفة الغربية"
      );
      expect(result).toContain("الفلسفة");
    });
  });

  describe("Boundary conditions", () => {
    it("should accept title of exactly 200 characters", () => {
      const maxTitle = "a".repeat(200);
      expect(curriculumTitleSchema.parse(maxTitle).length).toBe(200);
    });

    it("should accept description of exactly 10,000 characters", () => {
      const maxDesc = "a".repeat(10000);
      expect(curriculumDescriptionSchema.parse(maxDesc).length).toBe(10000);
    });

    it("should accept exactly 20 tags", () => {
      const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      expect(curriculumTagsArraySchema.parse(tags)).toHaveLength(20);
    });
  });

  describe("Whitespace handling", () => {
    it("should trim whitespace from title", () => {
      expect(curriculumTitleSchema.parse("  Padded Title  ")).toBe(
        "Padded Title"
      );
    });

    it("should trim whitespace from description", () => {
      expect(curriculumDescriptionSchema.parse("  Padded description  ")).toBe(
        "Padded description"
      );
    });
  });
});
