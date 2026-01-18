/**
 * Tests for POST /api/books/paste endpoint
 */

import { describe, it, expect } from "vitest";

import {
  pasteTextSchema,
  generateExcerpt,
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_GENRE_LENGTH,
  MAX_TAGS_COUNT,
  MAX_TAG_LENGTH,
} from "./paste.js";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("pasteTextSchema", () => {
  describe("text validation", () => {
    it("should accept valid text with minimum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe("a".repeat(MIN_TEXT_LENGTH));
      }
    });

    it("should accept longer text content", () => {
      const result = pasteTextSchema.safeParse({
        text: "This is a longer piece of text content for testing.",
        title: "My Book",
      });
      expect(result.success).toBe(true);
    });

    it("should reject text shorter than minimum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH - 1),
        title: "My Book",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.text).toBeDefined();
      }
    });

    it("should reject empty text", () => {
      const result = pasteTextSchema.safeParse({
        text: "",
        title: "My Book",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing text field", () => {
      const result = pasteTextSchema.safeParse({
        title: "My Book",
      });
      expect(result.success).toBe(false);
    });

    it("should accept text at maximum length boundary", () => {
      // Test with a reasonable chunk, not actual MAX (5MB would be slow)
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(10000),
        title: "My Book",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("title validation", () => {
    it("should accept valid title", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book Title",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Book Title");
      }
    });

    it("should trim title whitespace", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "  My Book Title  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Book Title");
      }
    });

    it("should reject empty title", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing title", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
      });
      expect(result.success).toBe(false);
    });

    it("should reject title exceeding maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "a".repeat(MAX_TITLE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
      }
    });

    it("should accept title at maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "a".repeat(MAX_TITLE_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should reject whitespace-only title", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "   ",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("author validation", () => {
    it("should accept valid author", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        author: "John Doe",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.author).toBe("John Doe");
      }
    });

    it("should trim author whitespace", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        author: "  John Doe  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.author).toBe("John Doe");
      }
    });

    it("should allow null author", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        author: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.author).toBeNull();
      }
    });

    it("should allow undefined author", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.author).toBeUndefined();
      }
    });

    it("should reject author exceeding maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        author: "a".repeat(MAX_AUTHOR_LENGTH + 1),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.author).toBeDefined();
      }
    });

    it("should accept author at maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        author: "a".repeat(MAX_AUTHOR_LENGTH),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("description validation", () => {
    it("should accept valid description", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        description: "This is a description of my book.",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(
          "This is a description of my book."
        );
      }
    });

    it("should allow null description", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        description: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it("should allow undefined description", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });

    it("should reject description exceeding maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toBeDefined();
      }
    });
  });

  describe("genre validation", () => {
    it("should accept valid genre", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        genre: "Science Fiction",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.genre).toBe("Science Fiction");
      }
    });

    it("should allow null genre", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        genre: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.genre).toBeNull();
      }
    });

    it("should reject genre exceeding maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        genre: "a".repeat(MAX_GENRE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.genre).toBeDefined();
      }
    });

    it("should accept genre at maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        genre: "a".repeat(MAX_GENRE_LENGTH),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("tags validation", () => {
    it("should accept valid tags array", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        tags: ["fiction", "adventure", "fantasy"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["fiction", "adventure", "fantasy"]);
      }
    });

    it("should accept empty tags array", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        tags: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it("should allow undefined tags", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toBeUndefined();
      }
    });

    it("should reject too many tags", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        tags: Array(MAX_TAGS_COUNT + 1).fill("tag"),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.tags).toBeDefined();
      }
    });

    it("should accept maximum number of tags", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        tags: Array(MAX_TAGS_COUNT).fill("tag"),
      });
      expect(result.success).toBe(true);
    });

    it("should reject tag exceeding maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        tags: ["a".repeat(MAX_TAG_LENGTH + 1)],
      });
      expect(result.success).toBe(false);
    });

    it("should accept tag at maximum length", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        tags: ["a".repeat(MAX_TAG_LENGTH)],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("language validation", () => {
    it("should accept valid 2-character language code", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        language: "en",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("en");
      }
    });

    it("should accept other 2-character language codes", () => {
      const codes = ["es", "fr", "de", "ja", "zh", "ar", "ru"];
      for (const code of codes) {
        const result = pasteTextSchema.safeParse({
          text: "a".repeat(MIN_TEXT_LENGTH),
          title: "My Book",
          language: code,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject 1-character language code", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        language: "e",
      });
      expect(result.success).toBe(false);
    });

    it("should reject 3-character language code", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        language: "eng",
      });
      expect(result.success).toBe(false);
    });

    it("should allow undefined language", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
      });
      expect(result.success).toBe(true);
      // Language has a default, but it's only applied when the field is present
      if (result.success) {
        expect(result.data.language).toBeUndefined();
      }
    });
  });

  describe("isPublic validation", () => {
    it("should accept true", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        isPublic: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBe(true);
      }
    });

    it("should accept false", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        isPublic: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBe(false);
      }
    });

    it("should allow undefined isPublic", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBeUndefined();
      }
    });

    it("should reject non-boolean isPublic", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "My Book",
        isPublic: "true",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("combined validation", () => {
    it("should accept complete valid input", () => {
      const result = pasteTextSchema.safeParse({
        text: "This is a complete book content with multiple sentences and paragraphs.",
        title: "Complete Book Title",
        author: "John Doe",
        description: "A comprehensive description of the book.",
        genre: "Non-Fiction",
        tags: ["educational", "technical"],
        language: "en",
        isPublic: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe(
          "This is a complete book content with multiple sentences and paragraphs."
        );
        expect(result.data.title).toBe("Complete Book Title");
        expect(result.data.author).toBe("John Doe");
        expect(result.data.description).toBe(
          "A comprehensive description of the book."
        );
        expect(result.data.genre).toBe("Non-Fiction");
        expect(result.data.tags).toEqual(["educational", "technical"]);
        expect(result.data.language).toBe("en");
        expect(result.data.isPublic).toBe(true);
      }
    });

    it("should accept minimal valid input", () => {
      const result = pasteTextSchema.safeParse({
        text: "Minimal text",
        title: "Minimal",
      });
      expect(result.success).toBe(true);
    });

    it("should reject when both required fields are missing", () => {
      const result = pasteTextSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.text).toBeDefined();
        expect(errors.title).toBeDefined();
      }
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("generateExcerpt", () => {
  it("should return full text if under max length", () => {
    const text = "This is a short text.";
    const excerpt = generateExcerpt(text, 500);
    expect(excerpt).toBe("This is a short text.");
  });

  it("should truncate text at word boundary", () => {
    const text =
      "This is a longer piece of text that exceeds the maximum length and needs to be truncated at a word boundary.";
    const excerpt = generateExcerpt(text, 50);
    expect(excerpt).not.toBe(text);
    expect(excerpt.endsWith("...")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + "..."
  });

  it("should handle text with no word boundaries gracefully", () => {
    const text = "a".repeat(100);
    const excerpt = generateExcerpt(text, 50);
    expect(excerpt.endsWith("...")).toBe(true);
  });

  it("should return empty string for empty input", () => {
    const excerpt = generateExcerpt("");
    expect(excerpt).toBe("");
  });

  it("should use default max length of 500", () => {
    const text = "a".repeat(600);
    const excerpt = generateExcerpt(text);
    expect(excerpt.length).toBeLessThanOrEqual(503); // 500 + "..."
  });

  it("should preserve text exactly at boundary", () => {
    const text = "Exactly fifty characters long sentence for test.";
    const excerpt = generateExcerpt(text, 50);
    expect(excerpt).toBe(text);
  });

  it("should cut at last space when close to boundary", () => {
    const text = "Hello world this is a test of the excerpt function.";
    const excerpt = generateExcerpt(text, 30);
    // Should cut at a word boundary near 30 characters
    expect(excerpt.endsWith("...")).toBe(true);
    expect(excerpt.includes(" ")).toBe(true);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("constants", () => {
  it("should have reasonable MIN_TEXT_LENGTH", () => {
    expect(MIN_TEXT_LENGTH).toBe(10);
    expect(MIN_TEXT_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_TEXT_LENGTH (5MB)", () => {
    expect(MAX_TEXT_LENGTH).toBe(5 * 1024 * 1024);
    expect(MAX_TEXT_LENGTH).toBeGreaterThan(MIN_TEXT_LENGTH);
  });

  it("should have reasonable MAX_TITLE_LENGTH", () => {
    expect(MAX_TITLE_LENGTH).toBe(500);
    expect(MAX_TITLE_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_AUTHOR_LENGTH", () => {
    expect(MAX_AUTHOR_LENGTH).toBe(200);
    expect(MAX_AUTHOR_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_DESCRIPTION_LENGTH", () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(50000);
    expect(MAX_DESCRIPTION_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_GENRE_LENGTH", () => {
    expect(MAX_GENRE_LENGTH).toBe(100);
    expect(MAX_GENRE_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_TAGS_COUNT", () => {
    expect(MAX_TAGS_COUNT).toBe(20);
    expect(MAX_TAGS_COUNT).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_TAG_LENGTH", () => {
    expect(MAX_TAG_LENGTH).toBe(50);
    expect(MAX_TAG_LENGTH).toBeGreaterThan(0);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
  describe("text content variations", () => {
    it("should handle text with newlines", () => {
      const result = pasteTextSchema.safeParse({
        text: "Line 1\nLine 2\nLine 3",
        title: "Multi-line Book",
      });
      expect(result.success).toBe(true);
    });

    it("should handle text with tabs", () => {
      const result = pasteTextSchema.safeParse({
        text: "Indented\ttext\twith\ttabs",
        title: "Tabbed Book",
      });
      expect(result.success).toBe(true);
    });

    it("should handle text with unicode characters", () => {
      const result = pasteTextSchema.safeParse({
        text: "日本語のテキスト with English and émojis 🎉",
        title: "Unicode Book",
      });
      expect(result.success).toBe(true);
    });

    it("should handle text with HTML tags", () => {
      const result = pasteTextSchema.safeParse({
        text: "<p>HTML content</p><br/><strong>Bold</strong>",
        title: "HTML Book",
      });
      expect(result.success).toBe(true);
    });

    it("should handle text with special characters", () => {
      const result = pasteTextSchema.safeParse({
        text: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
        title: "Special Chars Book",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("title variations", () => {
    it("should handle title with numbers", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "Book 2024: Part 1",
      });
      expect(result.success).toBe(true);
    });

    it("should handle title with special punctuation", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "The Book: A Story - Part One (Revised)",
      });
      expect(result.success).toBe(true);
    });

    it("should handle title with unicode", () => {
      const result = pasteTextSchema.safeParse({
        text: "a".repeat(MIN_TEXT_LENGTH),
        title: "日本語のタイトル",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("generateExcerpt edge cases", () => {
    it("should handle text with only whitespace", () => {
      const excerpt = generateExcerpt("     ");
      expect(excerpt).toBe("     ");
    });

    it("should handle very long words", () => {
      const longWord = "a".repeat(100);
      const text = `Short ${longWord} end`;
      const excerpt = generateExcerpt(text, 20);
      expect(excerpt.length).toBeLessThanOrEqual(23);
    });

    it("should handle text ending at boundary", () => {
      const text = "Exactly";
      const excerpt = generateExcerpt(text, 7);
      expect(excerpt).toBe("Exactly");
    });

    it("should handle single character", () => {
      const excerpt = generateExcerpt("a", 1);
      expect(excerpt).toBe("a");
    });
  });
});

// ============================================================================
// Comprehensive Validation Scenarios
// ============================================================================

describe("comprehensive validation scenarios", () => {
  it("should validate a realistic book paste request", () => {
    const result = pasteTextSchema.safeParse({
      text: `Chapter 1: The Beginning

It was a dark and stormy night. The wind howled through the trees, and rain
pelted against the windows of the old mansion. Sarah pulled her coat tighter
around her shoulders as she approached the massive oak door.

"Hello?" she called out, her voice barely audible above the storm. "Is anyone
there?"

The door creaked open, revealing a dimly lit hallway that seemed to stretch
on forever. Cobwebs hung from the chandelier, and dust motes danced in the
faint light of the candles that lined the walls.`,
      title: "The Haunted Mansion",
      author: "Jane Smith",
      description: "A thrilling mystery novel set in a Victorian-era mansion.",
      genre: "Mystery",
      tags: ["thriller", "mystery", "gothic", "victorian"],
      language: "en",
      isPublic: false,
    });
    expect(result.success).toBe(true);
  });

  it("should validate a technical document paste request", () => {
    const result = pasteTextSchema.safeParse({
      text: `# API Documentation

## Introduction

This document describes the REST API for our service.

### Authentication

All requests must include an Authorization header with a Bearer token.

### Endpoints

#### GET /api/users

Returns a list of users.

**Parameters:**
- page (optional): Page number for pagination
- limit (optional): Number of items per page

**Response:**
\`\`\`json
{
  "users": [...],
  "total": 100,
  "page": 1
}
\`\`\``,
      title: "API Documentation v1.0",
      author: "Engineering Team",
      description: "REST API documentation for the user service.",
      genre: "Technical",
      tags: ["api", "documentation", "technical", "rest"],
      language: "en",
      isPublic: true,
    });
    expect(result.success).toBe(true);
  });

  it("should validate a poetry paste request", () => {
    const result = pasteTextSchema.safeParse({
      text: `Roses are red,
Violets are blue,
This is a poem,
Written for you.

The moon shines bright,
In the dark of night,
Stars twinkle above,
Spreading their light.`,
      title: "Simple Verses",
      author: "Anonymous",
      genre: "Poetry",
      tags: ["poetry", "verses", "simple"],
      language: "en",
    });
    expect(result.success).toBe(true);
  });

  it("should handle JSON-like content as text", () => {
    const result = pasteTextSchema.safeParse({
      text: `{
  "name": "example",
  "version": "1.0.0",
  "description": "An example JSON file"
}`,
      title: "Example Configuration",
    });
    expect(result.success).toBe(true);
  });

  it("should handle code content as text", () => {
    const result = pasteTextSchema.safeParse({
      text: `function helloWorld() {
  print("Hello, World!");
}

helloWorld();`,
      title: "JavaScript Example",
      tags: ["code", "javascript"],
    });
    expect(result.success).toBe(true);
  });
});
