/**
 * Tests for POST /api/ai/generate-flashcards endpoint
 *
 * Tests cover:
 * - Schema validation (request body, card types, content)
 * - Helper functions (mapReadingLevel, buildBookContext, etc.)
 * - Duplicate detection and filtering
 * - Summary calculation
 * - Edge cases and integration scenarios
 */

import { describe, it, expect } from "vitest";
import {
  generateFlashcardsRequestSchema,
  mapReadingLevel,
  buildBookContext,
  mapFlashcardTypeToDb,
  calculateSimilarity,
  isDuplicateCard,
  filterDuplicates,
  buildFlashcardForDb,
  calculateCardSummary,
  FLASHCARD_TYPES,
  DEFAULT_CARD_COUNT,
  MAX_CARD_COUNT,
  MIN_CARD_COUNT,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS,
  MAX_EXISTING_CARDS_CHECK,
  DUPLICATE_SIMILARITY_THRESHOLD,
} from "./generate-flashcards.js";
import type { FlashcardType } from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have all valid flashcard types", () => {
    expect(FLASHCARD_TYPES).toContain("vocabulary");
    expect(FLASHCARD_TYPES).toContain("concept");
    expect(FLASHCARD_TYPES).toContain("comprehension");
    expect(FLASHCARD_TYPES).toContain("quote");
    expect(FLASHCARD_TYPES).toHaveLength(4);
  });

  it("should have valid default card count", () => {
    expect(DEFAULT_CARD_COUNT).toBe(10);
    expect(DEFAULT_CARD_COUNT).toBeGreaterThanOrEqual(MIN_CARD_COUNT);
    expect(DEFAULT_CARD_COUNT).toBeLessThanOrEqual(MAX_CARD_COUNT);
  });

  it("should have valid card count limits", () => {
    expect(MIN_CARD_COUNT).toBe(1);
    expect(MAX_CARD_COUNT).toBe(30);
    expect(MIN_CARD_COUNT).toBeLessThan(MAX_CARD_COUNT);
  });

  it("should have valid content length limits", () => {
    expect(MIN_CONTENT_LENGTH).toBe(50);
    expect(MAX_CONTENT_LENGTH).toBe(50000);
    expect(MIN_CONTENT_LENGTH).toBeLessThan(MAX_CONTENT_LENGTH);
  });

  it("should have valid MAX_TOKENS", () => {
    expect(MAX_TOKENS).toBe(8192);
    expect(MAX_TOKENS).toBeGreaterThan(0);
  });

  it("should have valid MAX_EXISTING_CARDS_CHECK", () => {
    expect(MAX_EXISTING_CARDS_CHECK).toBe(100);
    expect(MAX_EXISTING_CARDS_CHECK).toBeGreaterThan(0);
  });

  it("should have valid DUPLICATE_SIMILARITY_THRESHOLD", () => {
    expect(DUPLICATE_SIMILARITY_THRESHOLD).toBe(0.8);
    expect(DUPLICATE_SIMILARITY_THRESHOLD).toBeGreaterThan(0);
    expect(DUPLICATE_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("generateFlashcardsRequestSchema", () => {
  describe("bookId validation", () => {
    it("should accept valid CUID", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty bookId", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid bookId format", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "invalid-id",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(false);
    });

    it("should reject bookId not starting with c", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "abcdef1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("content validation", () => {
    it("should accept valid content", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should reject content shorter than minimum", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH - 1),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.content).toBeDefined();
      }
    });

    it("should reject content longer than maximum", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MAX_CONTENT_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("should accept content at minimum boundary", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should accept content at maximum boundary", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MAX_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("cardTypes validation", () => {
    it("should use default card types when not provided", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cardTypes).toEqual(["vocabulary", "concept"]);
      }
    });

    it("should accept single card type", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardTypes: ["vocabulary"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept multiple card types", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardTypes: ["vocabulary", "concept", "comprehension"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept all card types", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardTypes: ["vocabulary", "concept", "comprehension", "quote"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty cardTypes array", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardTypes: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid card type", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardTypes: ["invalid_type"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cardCount validation", () => {
    it("should use default card count when not provided", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cardCount).toBe(DEFAULT_CARD_COUNT);
      }
    });

    it("should accept valid card count", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardCount: 15,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cardCount).toBe(15);
      }
    });

    it("should accept minimum card count", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardCount: MIN_CARD_COUNT,
      });
      expect(result.success).toBe(true);
    });

    it("should accept maximum card count", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardCount: MAX_CARD_COUNT,
      });
      expect(result.success).toBe(true);
    });

    it("should reject card count below minimum", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardCount: MIN_CARD_COUNT - 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject card count above maximum", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardCount: MAX_CARD_COUNT + 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer card count", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        cardCount: 10.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields validation", () => {
    it("should accept chapterId", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        chapterId: "clchapter123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chapterId).toBe("clchapter123");
      }
    });

    it("should accept sourceOffset", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        sourceOffset: 1000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceOffset).toBe(1000);
      }
    });

    it("should reject negative sourceOffset", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        sourceOffset: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should accept zero sourceOffset", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
        sourceOffset: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("full request validation", () => {
    it("should accept request with all fields", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content:
          "This is a test content for generating flashcards from the book.",
        cardTypes: ["vocabulary", "concept", "comprehension"],
        cardCount: 15,
        chapterId: "clchapter123",
        sourceOffset: 500,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz1234567890");
        expect(result.data.cardTypes).toEqual([
          "vocabulary",
          "concept",
          "comprehension",
        ]);
        expect(result.data.cardCount).toBe(15);
        expect(result.data.chapterId).toBe("clchapter123");
        expect(result.data.sourceOffset).toBe(500);
      }
    });

    it("should accept minimal valid request", () => {
      const result = generateFlashcardsRequestSchema.safeParse({
        bookId: "clxyz1234567890",
        content: "a".repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// mapReadingLevel Tests
// ============================================================================

describe("mapReadingLevel", () => {
  describe("null and empty handling", () => {
    it("should return middle_school for null", () => {
      expect(mapReadingLevel(null)).toBe("middle_school");
    });

    it("should return middle_school for empty string", () => {
      expect(mapReadingLevel("")).toBe("middle_school");
    });
  });

  describe("keyword-based mapping", () => {
    it("should map beginner to beginner", () => {
      expect(mapReadingLevel("beginner")).toBe("beginner");
      expect(mapReadingLevel("Beginner Level")).toBe("beginner");
    });

    it("should map k-2 to beginner", () => {
      expect(mapReadingLevel("k-2")).toBe("beginner");
      expect(mapReadingLevel("K-2")).toBe("beginner");
    });

    it("should map elementary to elementary", () => {
      expect(mapReadingLevel("elementary")).toBe("elementary");
      expect(mapReadingLevel("Elementary School")).toBe("elementary");
    });

    it("should map 3-5 to elementary", () => {
      expect(mapReadingLevel("3-5")).toBe("elementary");
      expect(mapReadingLevel("Grades 3-5")).toBe("elementary");
    });

    it("should map middle to middle_school", () => {
      expect(mapReadingLevel("middle")).toBe("middle_school");
      expect(mapReadingLevel("Middle School")).toBe("middle_school");
    });

    it("should map 6-8 to middle_school", () => {
      expect(mapReadingLevel("6-8")).toBe("middle_school");
      expect(mapReadingLevel("Grades 6-8")).toBe("middle_school");
    });

    it("should map high to high_school", () => {
      expect(mapReadingLevel("high")).toBe("high_school");
      expect(mapReadingLevel("High School")).toBe("high_school");
    });

    it("should map 9-12 to high_school", () => {
      expect(mapReadingLevel("9-12")).toBe("high_school");
      expect(mapReadingLevel("Grades 9-12")).toBe("high_school");
    });

    it("should map college to college", () => {
      expect(mapReadingLevel("college")).toBe("college");
      expect(mapReadingLevel("College Level")).toBe("college");
    });

    it("should map undergraduate to college", () => {
      expect(mapReadingLevel("undergraduate")).toBe("college");
    });

    it("should map advanced to advanced", () => {
      expect(mapReadingLevel("advanced")).toBe("advanced");
      expect(mapReadingLevel("Advanced Reader")).toBe("advanced");
    });

    it("should map graduate to advanced", () => {
      expect(mapReadingLevel("graduate")).toBe("advanced");
      expect(mapReadingLevel("Graduate Level")).toBe("advanced");
    });
  });

  describe("Lexile score mapping", () => {
    it("should map Lexile < 400 to beginner", () => {
      expect(mapReadingLevel("200L")).toBe("beginner");
      expect(mapReadingLevel("350L")).toBe("beginner");
    });

    it("should map Lexile 400-699 to elementary", () => {
      expect(mapReadingLevel("400L")).toBe("elementary");
      expect(mapReadingLevel("600L")).toBe("elementary");
    });

    it("should map Lexile 700-999 to middle_school", () => {
      expect(mapReadingLevel("700L")).toBe("middle_school");
      expect(mapReadingLevel("900L")).toBe("middle_school");
    });

    it("should map Lexile 1000-1199 to high_school", () => {
      expect(mapReadingLevel("1000L")).toBe("high_school");
      expect(mapReadingLevel("1100L")).toBe("high_school");
    });

    it("should map Lexile 1200-1399 to college", () => {
      expect(mapReadingLevel("1200L")).toBe("college");
      expect(mapReadingLevel("1300L")).toBe("college");
    });

    it("should map Lexile >= 1400 to advanced", () => {
      expect(mapReadingLevel("1400L")).toBe("advanced");
      expect(mapReadingLevel("1600L")).toBe("advanced");
    });

    it("should handle Lexile without L suffix", () => {
      expect(mapReadingLevel("1000")).toBe("high_school");
    });
  });

  describe("fallback", () => {
    it("should return middle_school for unknown level", () => {
      expect(mapReadingLevel("unknown level")).toBe("middle_school");
      expect(mapReadingLevel("xyz")).toBe("middle_school");
    });
  });
});

// ============================================================================
// buildBookContext Tests
// ============================================================================

describe("buildBookContext", () => {
  const createMockBook = (overrides: Partial<Book> = {}): Book =>
    ({
      id: "clbook123",
      userId: "cluser123",
      title: "Test Book",
      author: "Test Author",
      genre: "Fiction",
      description: "A test book description",
      ...overrides,
    }) as Book;

  it("should build context with all fields", () => {
    const book = createMockBook();
    const content = "Sample book content";
    const context = buildBookContext(book, content);

    expect(context.title).toBe("Test Book");
    expect(context.author).toBe("Test Author");
    expect(context.content).toBe("Sample book content");
    expect(context.genre).toBe("Fiction");
    expect(context.description).toBe("A test book description");
  });

  it("should handle null author", () => {
    const book = createMockBook({ author: null });
    const content = "Sample content";
    const context = buildBookContext(book, content);

    expect(context.author).toBe("Unknown Author");
  });

  it("should handle null genre", () => {
    const book = createMockBook({ genre: null });
    const content = "Sample content";
    const context = buildBookContext(book, content);

    expect(context.genre).toBeUndefined();
  });

  it("should handle null description", () => {
    const book = createMockBook({ description: null });
    const content = "Sample content";
    const context = buildBookContext(book, content);

    expect(context.description).toBeUndefined();
  });

  it("should use provided content field", () => {
    const book = createMockBook();
    const content = "This is the actual content to use";
    const context = buildBookContext(book, content);

    expect(context.content).toBe(content);
    expect(context.description).toBe("A test book description"); // Separate from content
  });
});

// ============================================================================
// mapFlashcardTypeToDb Tests
// ============================================================================

describe("mapFlashcardTypeToDb", () => {
  it("should map vocabulary to VOCABULARY", () => {
    expect(mapFlashcardTypeToDb("vocabulary")).toBe("VOCABULARY");
  });

  it("should map concept to CONCEPT", () => {
    expect(mapFlashcardTypeToDb("concept")).toBe("CONCEPT");
  });

  it("should map comprehension to COMPREHENSION", () => {
    expect(mapFlashcardTypeToDb("comprehension")).toBe("COMPREHENSION");
  });

  it("should map quote to QUOTE", () => {
    expect(mapFlashcardTypeToDb("quote")).toBe("QUOTE");
  });

  it("should return CUSTOM for unknown types", () => {
    expect(mapFlashcardTypeToDb("unknown" as FlashcardType)).toBe("CUSTOM");
  });
});

// ============================================================================
// calculateSimilarity Tests
// ============================================================================

describe("calculateSimilarity", () => {
  it("should return 1 for identical strings", () => {
    expect(calculateSimilarity("hello world", "hello world")).toBe(1);
  });

  it("should return 1 for both empty strings", () => {
    expect(calculateSimilarity("", "")).toBe(1);
  });

  it("should return 0 for one empty string", () => {
    expect(calculateSimilarity("hello", "")).toBe(0);
    expect(calculateSimilarity("", "world")).toBe(0);
  });

  it("should return 0 for completely different strings", () => {
    expect(calculateSimilarity("abc def", "xyz uvw")).toBe(0);
  });

  it("should calculate correct similarity for partial overlap", () => {
    // "hello world" has 2 words, "hello there" has 2 words
    // intersection: ["hello"] = 1
    // union: ["hello", "world", "there"] = 3
    // similarity = 1/3 ≈ 0.333
    const similarity = calculateSimilarity("hello world", "hello there");
    expect(similarity).toBeCloseTo(1 / 3, 2);
  });

  it("should be case insensitive", () => {
    expect(calculateSimilarity("Hello World", "hello world")).toBe(1);
  });

  it("should handle multiple shared words", () => {
    // "the quick brown fox" has 4 words
    // "the slow brown dog" has 4 words
    // intersection: ["the", "brown"] = 2
    // union: ["the", "quick", "brown", "fox", "slow", "dog"] = 6
    // similarity = 2/6 ≈ 0.333
    const similarity = calculateSimilarity(
      "the quick brown fox",
      "the slow brown dog"
    );
    expect(similarity).toBeCloseTo(2 / 6, 2);
  });

  it("should handle repeated words", () => {
    // Sets deduplicate words
    expect(calculateSimilarity("the the the", "the")).toBe(1);
  });

  it("should handle extra whitespace", () => {
    expect(calculateSimilarity("hello  world", "hello world")).toBe(1);
  });
});

// ============================================================================
// isDuplicateCard Tests
// ============================================================================

describe("isDuplicateCard", () => {
  const createMockCard = (
    front: string
  ): {
    type: FlashcardType;
    front: string;
    back: string;
    tags: string[];
    difficulty: number;
  } => ({
    type: "vocabulary",
    front,
    back: "Answer",
    tags: [],
    difficulty: 2,
  });

  it("should return true for identical front", () => {
    const card = createMockCard("What is photosynthesis?");
    const existing = ["What is photosynthesis?"];
    expect(isDuplicateCard(card, existing)).toBe(true);
  });

  it("should return true for very similar front", () => {
    // Testing with strings that have >80% word overlap
    // "define the term photosynthesis" has words: [define, the, term, photosynthesis] = 4 words
    // "define the word photosynthesis" has words: [define, the, word, photosynthesis] = 4 words
    // intersection: [define, the, photosynthesis] = 3 words
    // union: [define, the, term, word, photosynthesis] = 5 words
    // similarity = 3/5 = 0.6 (not enough)
    // Instead use something that shares 4 out of 5 words:
    // "what is photosynthesis?" = [what, is, photosynthesis?] - but "?" splits oddly
    // Let's use: "explain the process of photosynthesis" vs "explain the process of photosynthesis briefly"
    // First: [explain, the, process, of, photosynthesis] = 5 words
    // Second: [explain, the, process, of, photosynthesis, briefly] = 6 words
    // Intersection: 5, Union: 6, Similarity = 5/6 = 0.833 >= 0.8
    const card = createMockCard(
      "explain the process of photosynthesis briefly"
    );
    const existing = ["explain the process of photosynthesis"];
    expect(isDuplicateCard(card, existing)).toBe(true);
  });

  it("should return false for different front", () => {
    const card = createMockCard("What is photosynthesis?");
    const existing = ["Who discovered gravity?"];
    expect(isDuplicateCard(card, existing)).toBe(false);
  });

  it("should return false for empty existing list", () => {
    const card = createMockCard("What is photosynthesis?");
    expect(isDuplicateCard(card, [])).toBe(false);
  });

  it("should check against multiple existing cards", () => {
    const card = createMockCard("Define osmosis");
    const existing = [
      "What is photosynthesis?",
      "Define osmosis", // This should match
      "Who discovered gravity?",
    ];
    expect(isDuplicateCard(card, existing)).toBe(true);
  });
});

// ============================================================================
// filterDuplicates Tests
// ============================================================================

describe("filterDuplicates", () => {
  const createMockCards = (
    fronts: string[]
  ): {
    type: FlashcardType;
    front: string;
    back: string;
    tags: string[];
    difficulty: number;
  }[] =>
    fronts.map((front) => ({
      type: "vocabulary" as FlashcardType,
      front,
      back: "Answer",
      tags: [],
      difficulty: 2,
    }));

  it("should return all cards when no duplicates", () => {
    const cards = createMockCards(["Question 1", "Question 2", "Question 3"]);
    const existing: string[] = [];
    const result = filterDuplicates(cards, existing);

    expect(result.uniqueCards).toHaveLength(3);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("should remove cards that match existing", () => {
    const cards = createMockCards(["Question 1", "Question 2"]);
    const existing = ["Question 1"];
    const result = filterDuplicates(cards, existing);

    expect(result.uniqueCards).toHaveLength(1);
    expect(result.uniqueCards[0]?.front).toBe("Question 2");
    expect(result.duplicatesRemoved).toBe(1);
  });

  it("should remove internal duplicates", () => {
    const cards = createMockCards(["Question 1", "Question 1", "Question 2"]);
    const existing: string[] = [];
    const result = filterDuplicates(cards, existing);

    expect(result.uniqueCards).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it("should handle empty input", () => {
    const cards: {
      type: FlashcardType;
      front: string;
      back: string;
      tags: string[];
      difficulty: number;
    }[] = [];
    const existing = ["Existing question"];
    const result = filterDuplicates(cards, existing);

    expect(result.uniqueCards).toHaveLength(0);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("should handle all duplicates", () => {
    const cards = createMockCards(["Question 1", "Question 2"]);
    const existing = ["Question 1", "Question 2"];
    const result = filterDuplicates(cards, existing);

    expect(result.uniqueCards).toHaveLength(0);
    expect(result.duplicatesRemoved).toBe(2);
  });
});

// ============================================================================
// buildFlashcardForDb Tests
// ============================================================================

describe("buildFlashcardForDb", () => {
  const createMockCard = (
    overrides = {}
  ): {
    type: FlashcardType;
    front: string;
    back: string;
    context?: string;
    tags: string[];
    difficulty: number;
    sourceText?: string;
  } => ({
    type: "vocabulary",
    front: "What is photosynthesis?",
    back: "The process by which plants convert light to energy",
    tags: ["biology", "plants"],
    difficulty: 3,
    ...overrides,
  });

  it("should build flashcard with all required fields", () => {
    const card = createMockCard();
    const result = buildFlashcardForDb(card, "user123", "book123");

    expect(result.user).toEqual({ connect: { id: "user123" } });
    expect(result.book).toEqual({ connect: { id: "book123" } });
    expect(result.front).toBe("What is photosynthesis?");
    expect(result.back).toBe(
      "The process by which plants convert light to energy"
    );
    expect(result.type).toBe("VOCABULARY");
    expect(result.status).toBe("NEW");
    expect(result.tags).toEqual(["biology", "plants"]);
  });

  it("should include context in back when provided", () => {
    const card = createMockCard({ context: "This is additional context" });
    const result = buildFlashcardForDb(card, "user123", "book123");

    expect(result.back).toBe(
      "The process by which plants convert light to energy\n\nThis is additional context"
    );
  });

  it("should set default SM-2 values", () => {
    const card = createMockCard();
    const result = buildFlashcardForDb(card, "user123", "book123");

    expect(result.easeFactor).toBe(2.5);
    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.totalReviews).toBe(0);
    expect(result.correctReviews).toBe(0);
  });

  it("should set dueDate to current time", () => {
    const before = new Date();
    const card = createMockCard();
    const result = buildFlashcardForDb(card, "user123", "book123");
    const after = new Date();

    expect((result.dueDate as Date).getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect((result.dueDate as Date).getTime()).toBeLessThanOrEqual(
      after.getTime()
    );
  });

  it("should include chapterId when provided", () => {
    const card = createMockCard();
    const result = buildFlashcardForDb(
      card,
      "user123",
      "book123",
      "chapter456"
    );

    expect(result.sourceChapterId).toBe("chapter456");
  });

  it("should include sourceOffset when provided", () => {
    const card = createMockCard();
    const result = buildFlashcardForDb(
      card,
      "user123",
      "book123",
      undefined,
      1500
    );

    expect(result.sourceOffset).toBe(1500);
  });

  it("should not include optional fields when not provided", () => {
    const card = createMockCard();
    const result = buildFlashcardForDb(card, "user123", "book123");

    expect(result.sourceChapterId).toBeUndefined();
    expect(result.sourceOffset).toBeUndefined();
  });
});

// ============================================================================
// calculateCardSummary Tests
// ============================================================================

describe("calculateCardSummary", () => {
  const createMockCard = (
    type: FlashcardType,
    difficulty: number
  ): {
    type: FlashcardType;
    front: string;
    back: string;
    tags: string[];
    difficulty: number;
  } => ({
    type,
    front: "Question",
    back: "Answer",
    tags: [],
    difficulty,
  });

  it("should calculate summary correctly", () => {
    const cards = [
      createMockCard("vocabulary", 2),
      createMockCard("vocabulary", 3),
      createMockCard("concept", 4),
    ];
    const summary = calculateCardSummary(cards);

    expect(summary.totalCards).toBe(3);
    expect(summary.byType.vocabulary).toBe(2);
    expect(summary.byType.concept).toBe(1);
    expect(summary.averageDifficulty).toBeCloseTo(3, 1);
  });

  it("should handle empty array", () => {
    const summary = calculateCardSummary([]);

    expect(summary.totalCards).toBe(0);
    expect(summary.byType).toEqual({});
    expect(summary.averageDifficulty).toBe(0);
  });

  it("should handle single card", () => {
    const cards = [createMockCard("vocabulary", 5)];
    const summary = calculateCardSummary(cards);

    expect(summary.totalCards).toBe(1);
    expect(summary.byType.vocabulary).toBe(1);
    expect(summary.averageDifficulty).toBe(5);
  });

  it("should round average difficulty to one decimal", () => {
    const cards = [
      createMockCard("vocabulary", 1),
      createMockCard("vocabulary", 2),
      createMockCard("vocabulary", 3),
    ];
    const summary = calculateCardSummary(cards);

    // Average = (1 + 2 + 3) / 3 = 2.0
    expect(summary.averageDifficulty).toBe(2);
  });

  it("should count all card types correctly", () => {
    const cards = [
      createMockCard("vocabulary", 2),
      createMockCard("concept", 3),
      createMockCard("comprehension", 4),
      createMockCard("quote", 5),
    ];
    const summary = calculateCardSummary(cards);

    expect(summary.totalCards).toBe(4);
    expect(summary.byType.vocabulary).toBe(1);
    expect(summary.byType.concept).toBe(1);
    expect(summary.byType.comprehension).toBe(1);
    expect(summary.byType.quote).toBe(1);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration tests", () => {
  it("should handle complete request scenario", () => {
    const request = {
      bookId: "clbook12345678",
      content:
        "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
      cardTypes: ["vocabulary", "concept"],
      cardCount: 5,
    };

    const result = generateFlashcardsRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("should correctly map reading level and build book context", () => {
    const book = {
      id: "clbook123",
      userId: "cluser123",
      title: "Biology 101",
      author: "Dr. Smith",
      genre: "Science",
      description: "An introductory biology textbook",
    } as Book;

    const readingLevel = mapReadingLevel("college");
    expect(readingLevel).toBe("college");

    const context = buildBookContext(book, "Chapter content about cells...");
    expect(context.title).toBe("Biology 101");
    expect(context.author).toBe("Dr. Smith");
    expect(context.content).toBe("Chapter content about cells...");
  });

  it("should correctly filter and build cards for database", () => {
    const generatedCards = [
      {
        type: "vocabulary" as FlashcardType,
        front: "What is a cell?",
        back: "Basic unit of life",
        tags: ["biology"],
        difficulty: 2,
      },
      {
        type: "concept" as FlashcardType,
        front: "Explain mitosis",
        back: "Cell division process",
        tags: ["biology"],
        difficulty: 4,
      },
      {
        type: "vocabulary" as FlashcardType,
        front: "What is a cell?",
        back: "Different answer",
        tags: ["biology"],
        difficulty: 2,
      }, // Duplicate
    ];

    const existingFronts = ["What is DNA?"];
    const { uniqueCards, duplicatesRemoved } = filterDuplicates(
      generatedCards,
      existingFronts
    );

    expect(uniqueCards).toHaveLength(2);
    expect(duplicatesRemoved).toBe(1);

    const firstCard = uniqueCards[0];
    expect(firstCard).toBeDefined();
    if (firstCard) {
      const dbCard = buildFlashcardForDb(firstCard, "user123", "book123");
      expect(dbCard.type).toBe("VOCABULARY");
      expect(dbCard.status).toBe("NEW");
      expect(dbCard.user).toEqual({ connect: { id: "user123" } });
      expect(dbCard.book).toEqual({ connect: { id: "book123" } });
    }
  });

  it("should handle edge case with very long content", () => {
    const longContent = "a".repeat(MAX_CONTENT_LENGTH);
    const result = generateFlashcardsRequestSchema.safeParse({
      bookId: "clbook12345678",
      content: longContent,
    });
    expect(result.success).toBe(true);
  });

  it("should handle edge case with minimal valid request", () => {
    const result = generateFlashcardsRequestSchema.safeParse({
      bookId: "clbook12345678",
      content: "a".repeat(MIN_CONTENT_LENGTH),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cardTypes).toEqual(["vocabulary", "concept"]);
      expect(result.data.cardCount).toBe(DEFAULT_CARD_COUNT);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  it("should handle special characters in content", () => {
    const result = generateFlashcardsRequestSchema.safeParse({
      bookId: "clbook12345678",
      content: 'Content with "quotes" and <tags> and & symbols plus émojis 🎉',
    });
    expect(result.success).toBe(true);
  });

  it("should handle unicode in content", () => {
    const result = generateFlashcardsRequestSchema.safeParse({
      bookId: "clbook12345678",
      content:
        "Japanese: 日本語, Chinese: 中文, Arabic: العربية, Hebrew: עברית",
    });
    expect(result.success).toBe(true);
  });

  it("should handle whitespace-only content", () => {
    const result = generateFlashcardsRequestSchema.safeParse({
      bookId: "clbook12345678",
      content: "   ".repeat(20),
    });
    // This is valid by length but may produce poor results
    expect(result.success).toBe(true);
  });

  it("should calculate similarity correctly for unicode", () => {
    const similarity = calculateSimilarity("日本語の質問", "日本語の質問");
    expect(similarity).toBe(1);
  });

  it("should map all valid flashcard types", () => {
    const types: FlashcardType[] = [
      "vocabulary",
      "concept",
      "comprehension",
      "quote",
    ];
    for (const type of types) {
      const dbType = mapFlashcardTypeToDb(type);
      expect(dbType).not.toBe("CUSTOM");
    }
  });
});
