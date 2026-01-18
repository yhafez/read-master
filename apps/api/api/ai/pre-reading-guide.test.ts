/**
 * Tests for POST /api/ai/pre-reading-guide
 */

import { describe, it, expect } from "vitest";

import {
  preReadingGuideRequestSchema,
  mapReadingLevel,
  convertOutputToDbFormat,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS,
} from "./pre-reading-guide.js";
import type { PreReadingGuideOutput } from "@read-master/ai";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("preReadingGuideRequestSchema", () => {
  it("should accept valid book ID", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "clxyz123abc456def789",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookId).toBe("clxyz123abc456def789");
      expect(result.data.regenerate).toBe(false);
    }
  });

  it("should accept book ID with regenerate flag", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "clxyz123abc456def789",
      regenerate: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regenerate).toBe(true);
    }
  });

  it("should reject empty book ID", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain("required");
    }
  });

  it("should reject invalid book ID format", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "invalid-id-format",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain(
        "Invalid book ID format"
      );
    }
  });

  it("should reject missing book ID", () => {
    const result = preReadingGuideRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should default regenerate to false", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "clxyz123abc456def789",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regenerate).toBe(false);
    }
  });

  it("should accept regenerate as boolean true", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "clxyz123abc456def789",
      regenerate: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regenerate).toBe(true);
    }
  });

  it("should accept regenerate as boolean false", () => {
    const result = preReadingGuideRequestSchema.safeParse({
      bookId: "clxyz123abc456def789",
      regenerate: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.regenerate).toBe(false);
    }
  });
});

// ============================================================================
// mapReadingLevel Tests
// ============================================================================

describe("mapReadingLevel", () => {
  it("should return middle_school for null input", () => {
    expect(mapReadingLevel(null)).toBe("middle_school");
  });

  it("should return middle_school for empty string", () => {
    expect(mapReadingLevel("")).toBe("middle_school");
  });

  it("should map beginner levels", () => {
    expect(mapReadingLevel("beginner")).toBe("beginner");
    expect(mapReadingLevel("K-2")).toBe("beginner");
    expect(mapReadingLevel("BEGINNER")).toBe("beginner");
  });

  it("should map elementary levels", () => {
    expect(mapReadingLevel("elementary")).toBe("elementary");
    expect(mapReadingLevel("3-5")).toBe("elementary");
    expect(mapReadingLevel("ELEMENTARY")).toBe("elementary");
  });

  it("should map middle school levels", () => {
    expect(mapReadingLevel("middle_school")).toBe("middle_school");
    expect(mapReadingLevel("middle school")).toBe("middle_school");
    expect(mapReadingLevel("6-8")).toBe("middle_school");
    expect(mapReadingLevel("MIDDLE")).toBe("middle_school");
  });

  it("should map high school levels", () => {
    expect(mapReadingLevel("high_school")).toBe("high_school");
    expect(mapReadingLevel("high school")).toBe("high_school");
    expect(mapReadingLevel("9-12")).toBe("high_school");
    expect(mapReadingLevel("HIGH")).toBe("high_school");
  });

  it("should map college levels", () => {
    expect(mapReadingLevel("college")).toBe("college");
    expect(mapReadingLevel("undergraduate")).toBe("college");
    expect(mapReadingLevel("COLLEGE")).toBe("college");
  });

  it("should map advanced levels", () => {
    expect(mapReadingLevel("advanced")).toBe("advanced");
    expect(mapReadingLevel("graduate")).toBe("advanced"); // graduate maps to advanced
    expect(mapReadingLevel("ADVANCED")).toBe("advanced");
  });

  describe("Lexile score mapping", () => {
    it("should map low Lexile to beginner", () => {
      expect(mapReadingLevel("200L")).toBe("beginner");
      expect(mapReadingLevel("300")).toBe("beginner");
      expect(mapReadingLevel("399L")).toBe("beginner");
    });

    it("should map elementary Lexile to elementary", () => {
      expect(mapReadingLevel("400L")).toBe("elementary");
      expect(mapReadingLevel("500")).toBe("elementary");
      expect(mapReadingLevel("699L")).toBe("elementary");
    });

    it("should map middle school Lexile to middle_school", () => {
      expect(mapReadingLevel("700L")).toBe("middle_school");
      expect(mapReadingLevel("850")).toBe("middle_school");
      expect(mapReadingLevel("999L")).toBe("middle_school");
    });

    it("should map high school Lexile to high_school", () => {
      expect(mapReadingLevel("1000L")).toBe("high_school");
      expect(mapReadingLevel("1100")).toBe("high_school");
      expect(mapReadingLevel("1199L")).toBe("high_school");
    });

    it("should map college Lexile to college", () => {
      expect(mapReadingLevel("1200L")).toBe("college");
      expect(mapReadingLevel("1300")).toBe("college");
      expect(mapReadingLevel("1399L")).toBe("college");
    });

    it("should map advanced Lexile to advanced", () => {
      expect(mapReadingLevel("1400L")).toBe("advanced");
      expect(mapReadingLevel("1500")).toBe("advanced");
      expect(mapReadingLevel("1600L")).toBe("advanced");
    });
  });
});

// ============================================================================
// convertOutputToDbFormat Tests
// ============================================================================

describe("convertOutputToDbFormat", () => {
  const sampleOutput: PreReadingGuideOutput = {
    overview: {
      summary: "A compelling novel about love and loss.",
      themes: ["love", "loss", "redemption"],
      targetAudience: "Adult readers who enjoy literary fiction",
    },
    keyConcepts: [
      {
        term: "Symbolism",
        definition: "The use of symbols to represent ideas or qualities",
        relevance: "Central to understanding the deeper meanings in the text",
      },
      {
        term: "Narrative Structure",
        definition: "The way a story is organized and told",
        relevance: "The non-linear structure mirrors the protagonist's memory",
      },
    ],
    context: {
      historicalContext: "Set during the post-war period of 1950s America",
      culturalContext: "Explores themes of cultural identity",
      authorContext: "Based on the author's personal experiences",
    },
    guidingQuestions: [
      "How does the setting influence the characters?",
      "What role does memory play in the narrative?",
    ],
    vocabulary: [
      {
        word: "melancholy",
        definition: "A feeling of pensive sadness",
        example: "The melancholy of autumn filled the air.",
      },
      {
        word: "ephemeral",
        definition: "Lasting for a very short time",
      },
    ],
    readingTips: [
      "Pay attention to recurring symbols",
      "Take notes on character relationships",
    ],
  };

  it("should convert vocabulary correctly", () => {
    const result = convertOutputToDbFormat(sampleOutput);
    const vocabulary = JSON.parse(result.vocabulary as string);

    expect(vocabulary).toHaveLength(2);
    expect(vocabulary[0]).toEqual({
      term: "melancholy",
      definition: "A feeling of pensive sadness",
      examples: ["The melancholy of autumn filled the air."],
    });
    expect(vocabulary[1]).toEqual({
      term: "ephemeral",
      definition: "Lasting for a very short time",
      examples: [],
    });
  });

  it("should convert key concepts to key arguments", () => {
    const result = convertOutputToDbFormat(sampleOutput);
    const keyArguments = JSON.parse(result.keyArguments as string);

    expect(keyArguments).toHaveLength(2);
    expect(keyArguments[0]?.argument).toBe("Symbolism");
    expect(keyArguments[0]?.explanation).toContain(
      "The use of symbols to represent ideas"
    );
    expect(keyArguments[0]?.explanation).toContain("Relevance:");
  });

  it("should create chapter summaries from overview", () => {
    const result = convertOutputToDbFormat(sampleOutput);
    const chapterSummaries = JSON.parse(result.chapterSummaries as string);

    expect(chapterSummaries).toHaveLength(1);
    expect(chapterSummaries[0]).toEqual({
      chapterIndex: 0,
      summary: "A compelling novel about love and loss.",
    });
  });

  it("should include context fields", () => {
    const result = convertOutputToDbFormat(sampleOutput);

    expect(result.historicalContext).toBe(
      "Set during the post-war period of 1950s America"
    );
    expect(result.authorContext).toBe(
      "Based on the author's personal experiences"
    );
    expect(result.intellectualContext).toBe(
      "Explores themes of cultural identity"
    );
  });

  it("should handle missing context fields", () => {
    const outputWithMissingContext: PreReadingGuideOutput = {
      ...sampleOutput,
      context: {},
    };

    const result = convertOutputToDbFormat(outputWithMissingContext);

    expect(result.historicalContext).toBeNull();
    expect(result.authorContext).toBeNull();
    expect(result.intellectualContext).toBeNull();
  });

  it("should convert themes to keyThemes", () => {
    const result = convertOutputToDbFormat(sampleOutput);
    const keyThemes = JSON.parse(result.keyThemes as string);

    expect(keyThemes).toEqual(["love", "loss", "redemption"]);
  });

  it("should convert reading tips", () => {
    const result = convertOutputToDbFormat(sampleOutput);
    const readingTips = JSON.parse(result.readingTips as string);

    expect(readingTips).toEqual([
      "Pay attention to recurring symbols",
      "Take notes on character relationships",
    ]);
  });

  it("should convert guiding questions to discussion topics", () => {
    const result = convertOutputToDbFormat(sampleOutput);
    const discussionTopics = JSON.parse(result.discussionTopics as string);

    expect(discussionTopics).toEqual([
      "How does the setting influence the characters?",
      "What role does memory play in the narrative?",
    ]);
  });

  it("should handle empty arrays gracefully", () => {
    const emptyOutput: PreReadingGuideOutput = {
      overview: {
        summary: "A book",
        themes: [],
        targetAudience: "Everyone",
      },
      keyConcepts: [],
      context: {},
      guidingQuestions: [],
      vocabulary: [],
      readingTips: [],
    };

    const result = convertOutputToDbFormat(emptyOutput);

    expect(JSON.parse(result.vocabulary as string)).toEqual([]);
    expect(JSON.parse(result.keyArguments as string)).toEqual([]);
    expect(JSON.parse(result.keyThemes as string)).toEqual([]);
    expect(JSON.parse(result.readingTips as string)).toEqual([]);
    expect(JSON.parse(result.discussionTopics as string)).toEqual([]);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have appropriate MIN_CONTENT_LENGTH", () => {
    expect(MIN_CONTENT_LENGTH).toBe(100);
    expect(MIN_CONTENT_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_CONTENT_LENGTH", () => {
    expect(MAX_CONTENT_LENGTH).toBe(50000);
    expect(MAX_CONTENT_LENGTH).toBeGreaterThan(MIN_CONTENT_LENGTH);
  });

  it("should have appropriate MAX_TOKENS", () => {
    expect(MAX_TOKENS).toBe(4096);
    expect(MAX_TOKENS).toBeGreaterThan(0);
  });
});

// ============================================================================
// Handler Tests (unit tests for helper functions and validation)
// ============================================================================

describe("Pre-reading guide handler", () => {
  describe("Request validation", () => {
    it("should validate required bookId field", () => {
      const result = preReadingGuideRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid CUID format", () => {
      // Valid CUID starts with 'c' followed by lowercase alphanumeric
      const validCUIDs = [
        "clxyz123abc456def789",
        "cm1abc2def3ghi4jkl",
        "c123456789abcdefghij",
      ];

      for (const cuid of validCUIDs) {
        const result = preReadingGuideRequestSchema.safeParse({ bookId: cuid });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid CUID formats", () => {
      const invalidCUIDs = [
        "not-a-cuid",
        "123abc",
        "C123abc", // uppercase C
        "cABC123", // uppercase in ID
        "", // empty
      ];

      for (const cuid of invalidCUIDs) {
        const result = preReadingGuideRequestSchema.safeParse({ bookId: cuid });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("Reading level mapping edge cases", () => {
    it("should handle mixed case input", () => {
      expect(mapReadingLevel("BeGiNnEr")).toBe("beginner");
      expect(mapReadingLevel("MIDDLE_SCHOOL")).toBe("middle_school");
      expect(mapReadingLevel("High School")).toBe("high_school");
    });

    it("should handle Lexile with different formats", () => {
      expect(mapReadingLevel("800L")).toBe("middle_school");
      expect(mapReadingLevel("800")).toBe("middle_school");
      expect(mapReadingLevel("800l")).toBe("middle_school");
    });

    it("should return default for unknown values", () => {
      expect(mapReadingLevel("unknown")).toBe("middle_school");
      expect(mapReadingLevel("gibberish")).toBe("middle_school");
      // level5 matches "5" as a Lexile score (< 400), returning beginner
      expect(mapReadingLevel("level5")).toBe("beginner");
      // Values with no numbers default to middle_school
      expect(mapReadingLevel("something")).toBe("middle_school");
    });
  });
});
