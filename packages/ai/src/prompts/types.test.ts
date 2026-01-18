/**
 * Tests for AI Prompt Types and Utilities
 */

import { describe, it, expect } from "vitest";
import {
  type ReadingLevel,
  type BloomLevel,
  type BookContext,
  type UserContext,
  READING_LEVEL_DESCRIPTIONS,
  BLOOM_LEVEL_DESCRIPTIONS,
  getReadingLevelDescription,
  getBloomLevelDescription,
  truncateContent,
  formatBookContext,
  validateRequired,
  validateLength,
} from "./types.js";

// =============================================================================
// READING LEVEL DESCRIPTIONS TESTS
// =============================================================================

describe("READING_LEVEL_DESCRIPTIONS", () => {
  it("should have descriptions for all reading levels", () => {
    const levels: ReadingLevel[] = [
      "beginner",
      "elementary",
      "middle_school",
      "high_school",
      "college",
      "advanced",
    ];

    for (const level of levels) {
      expect(READING_LEVEL_DESCRIPTIONS[level]).toBeDefined();
      expect(typeof READING_LEVEL_DESCRIPTIONS[level]).toBe("string");
      expect(READING_LEVEL_DESCRIPTIONS[level].length).toBeGreaterThan(10);
    }
  });

  it("should have appropriate content for each level", () => {
    expect(READING_LEVEL_DESCRIPTIONS.beginner).toContain("simple");
    expect(READING_LEVEL_DESCRIPTIONS.elementary).toContain("clear");
    expect(READING_LEVEL_DESCRIPTIONS.middle_school).toContain("accessible");
    expect(READING_LEVEL_DESCRIPTIONS.high_school).toContain("academic");
    expect(READING_LEVEL_DESCRIPTIONS.college).toContain("sophisticated");
    expect(READING_LEVEL_DESCRIPTIONS.advanced).toContain("technical");
  });
});

describe("getReadingLevelDescription", () => {
  it("should return correct description for each level", () => {
    expect(getReadingLevelDescription("beginner")).toBe(
      READING_LEVEL_DESCRIPTIONS.beginner
    );
    expect(getReadingLevelDescription("college")).toBe(
      READING_LEVEL_DESCRIPTIONS.college
    );
  });

  it("should include grade ranges in descriptions", () => {
    expect(getReadingLevelDescription("beginner")).toMatch(/K-2/);
    expect(getReadingLevelDescription("elementary")).toMatch(/3-5/);
    expect(getReadingLevelDescription("middle_school")).toMatch(/6-8/);
    expect(getReadingLevelDescription("high_school")).toMatch(/9-12/);
  });
});

// =============================================================================
// BLOOM'S LEVEL DESCRIPTIONS TESTS
// =============================================================================

describe("BLOOM_LEVEL_DESCRIPTIONS", () => {
  it("should have descriptions for all Bloom's levels", () => {
    const levels: BloomLevel[] = [
      "remember",
      "understand",
      "apply",
      "analyze",
      "evaluate",
      "create",
    ];

    for (const level of levels) {
      expect(BLOOM_LEVEL_DESCRIPTIONS[level]).toBeDefined();
      expect(typeof BLOOM_LEVEL_DESCRIPTIONS[level]).toBe("string");
    }
  });

  it("should have action verbs in descriptions", () => {
    expect(BLOOM_LEVEL_DESCRIPTIONS.remember).toMatch(/define|list|memorize/);
    expect(BLOOM_LEVEL_DESCRIPTIONS.understand).toMatch(
      /explain|describe|summarize/
    );
    expect(BLOOM_LEVEL_DESCRIPTIONS.apply).toMatch(/execute|implement|solve/);
    expect(BLOOM_LEVEL_DESCRIPTIONS.analyze).toMatch(
      /differentiate|organize|compare/
    );
    expect(BLOOM_LEVEL_DESCRIPTIONS.evaluate).toMatch(/argue|defend|critique/);
    expect(BLOOM_LEVEL_DESCRIPTIONS.create).toMatch(/design|construct|develop/);
  });
});

describe("getBloomLevelDescription", () => {
  it("should return correct description for each level", () => {
    expect(getBloomLevelDescription("remember")).toBe(
      BLOOM_LEVEL_DESCRIPTIONS.remember
    );
    expect(getBloomLevelDescription("create")).toBe(
      BLOOM_LEVEL_DESCRIPTIONS.create
    );
  });
});

// =============================================================================
// TRUNCATE CONTENT TESTS
// =============================================================================

describe("truncateContent", () => {
  it("should not truncate content shorter than max length", () => {
    const content = "Short content";
    expect(truncateContent(content, 100)).toBe(content);
  });

  it("should truncate content longer than max length", () => {
    const content = "A".repeat(200);
    const result = truncateContent(content, 100);
    expect(result.length).toBe(100);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should use default max length of 10000", () => {
    const content = "A".repeat(15000);
    const result = truncateContent(content);
    expect(result.length).toBe(10000);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle empty string", () => {
    expect(truncateContent("")).toBe("");
  });

  it("should handle content exactly at max length", () => {
    const content = "A".repeat(100);
    expect(truncateContent(content, 100)).toBe(content);
  });
});

// =============================================================================
// FORMAT BOOK CONTEXT TESTS
// =============================================================================

describe("formatBookContext", () => {
  it("should format basic book info", () => {
    const book: BookContext = {
      title: "Test Book",
      author: "Test Author",
      content: "Book content here",
    };

    const result = formatBookContext(book);
    expect(result).toContain('Title: "Test Book"');
    expect(result).toContain("Author: Test Author");
  });

  it("should include genre when present", () => {
    const book: BookContext = {
      title: "Test Book",
      author: "Test Author",
      genre: "Fiction",
      content: "Book content",
    };

    const result = formatBookContext(book);
    expect(result).toContain("Genre: Fiction");
  });

  it("should include description when present", () => {
    const book: BookContext = {
      title: "Test Book",
      author: "Test Author",
      description: "A great book",
      content: "Book content",
    };

    const result = formatBookContext(book);
    expect(result).toContain("Description: A great book");
  });

  it("should include reading progress when present", () => {
    const book: BookContext = {
      title: "Test Book",
      author: "Test Author",
      content: "Book content",
      progressPercentage: 0.75,
    };

    const result = formatBookContext(book);
    expect(result).toContain("Reading Progress: 75%");
  });

  it("should not include optional fields when absent", () => {
    const book: BookContext = {
      title: "Test Book",
      author: "Test Author",
      content: "Book content",
    };

    const result = formatBookContext(book);
    expect(result).not.toContain("Genre:");
    expect(result).not.toContain("Description:");
    expect(result).not.toContain("Reading Progress:");
  });
});

// =============================================================================
// VALIDATE REQUIRED TESTS
// =============================================================================

describe("validateRequired", () => {
  it("should pass when all required fields are present", () => {
    const input = { name: "Test", value: 42 };
    const result = validateRequired(input, ["name", "value"]);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should fail when a required field is missing", () => {
    const input: { name: string; value?: string } = { name: "Test" };
    const result = validateRequired(input, ["name", "value"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("value");
  });

  it("should fail when a required field is undefined", () => {
    const input = { name: "Test", value: undefined };
    const result = validateRequired(input, ["name", "value"]);
    expect(result.valid).toBe(false);
  });

  it("should fail when a required field is null", () => {
    const input = { name: "Test", value: null };
    const result = validateRequired(input, ["name", "value"]);
    expect(result.valid).toBe(false);
  });

  it("should fail when a required string field is empty", () => {
    const input = { name: "" };
    const result = validateRequired(input, ["name"]);
    expect(result.valid).toBe(false);
  });

  it("should pass with empty required array", () => {
    const input = { name: "Test" };
    const result = validateRequired(input, []);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// VALIDATE LENGTH TESTS
// =============================================================================

describe("validateLength", () => {
  it("should pass for string within range", () => {
    const result = validateLength("hello", 1, 10, "Test field");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should fail for string too short", () => {
    const result = validateLength("hi", 5, 10, "Test field");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least 5");
    expect(result.error).toContain("Test field");
  });

  it("should fail for string too long", () => {
    const result = validateLength("hello world", 1, 5, "Test field");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most 5");
    expect(result.error).toContain("Test field");
  });

  it("should pass for string at exact min length", () => {
    const result = validateLength("hi", 2, 10, "Test field");
    expect(result.valid).toBe(true);
  });

  it("should pass for string at exact max length", () => {
    const result = validateLength("hello", 1, 5, "Test field");
    expect(result.valid).toBe(true);
  });

  it("should handle empty string with min 0", () => {
    const result = validateLength("", 0, 10, "Test field");
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// TYPE TESTS
// =============================================================================

describe("Type definitions", () => {
  it("should allow valid ReadingLevel values", () => {
    const levels: ReadingLevel[] = [
      "beginner",
      "elementary",
      "middle_school",
      "high_school",
      "college",
      "advanced",
    ];
    expect(levels.length).toBe(6);
  });

  it("should allow valid BloomLevel values", () => {
    const levels: BloomLevel[] = [
      "remember",
      "understand",
      "apply",
      "analyze",
      "evaluate",
      "create",
    ];
    expect(levels.length).toBe(6);
  });

  it("should create valid BookContext", () => {
    const book: BookContext = {
      title: "Test",
      author: "Author",
      content: "Content",
    };
    expect(book.title).toBe("Test");
  });

  it("should create valid UserContext", () => {
    const user: UserContext = {
      readingLevel: "middle_school",
      language: "en",
      name: "Test User",
    };
    expect(user.readingLevel).toBe("middle_school");
  });
});
