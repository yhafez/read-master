/**
 * Create Flashcard Types Tests
 *
 * Comprehensive tests for the createFlashcardTypes module.
 * Tests validation functions, form helpers, and utility functions.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  // Constants
  MIN_FRONT_LENGTH,
  MAX_FRONT_LENGTH,
  MIN_BACK_LENGTH,
  MAX_BACK_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  PREFERENCES_KEY,
  FLASHCARD_TYPE_CONFIGS,
  DEFAULT_FORM_DATA,
  DEFAULT_PREFERENCES,
  // Validation functions
  isValidFront,
  isValidBack,
  isValidTag,
  isValidTags,
  isValidType,
  validateFormData,
  getFieldError,
  hasFieldError,
  // Form helpers
  createFormData,
  updateFormField,
  addTag,
  removeTag,
  resetFormData,
  // Preference helpers
  loadPreferences,
  savePreferences,
  updateRecentTags,
  // API helpers
  buildCreateRequest,
  parseCreateApiError,
  // Display helpers
  getCharacterCount,
  isAtLimit,
  isNearLimit,
  getTypeConfig,
  formatTagsDisplay,
} from "./createFlashcardTypes";

import type {
  CreateFlashcardFormData,
  CreateFlashcardPreferences,
} from "./createFlashcardTypes";
import type { FlashcardType } from "./flashcardDeckTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should have valid front length constraints", () => {
    expect(MIN_FRONT_LENGTH).toBe(1);
    expect(MAX_FRONT_LENGTH).toBe(500);
    expect(MIN_FRONT_LENGTH).toBeLessThan(MAX_FRONT_LENGTH);
  });

  it("should have valid back length constraints", () => {
    expect(MIN_BACK_LENGTH).toBe(1);
    expect(MAX_BACK_LENGTH).toBe(2000);
    expect(MIN_BACK_LENGTH).toBeLessThan(MAX_BACK_LENGTH);
  });

  it("should have valid tag constraints", () => {
    expect(MAX_TAGS).toBe(10);
    expect(MAX_TAG_LENGTH).toBe(50);
    expect(MAX_TAGS).toBeGreaterThan(0);
    expect(MAX_TAG_LENGTH).toBeGreaterThan(0);
  });

  it("should have valid preferences key", () => {
    expect(PREFERENCES_KEY).toBe("flashcard-create-preferences");
  });

  it("should have 5 flashcard type configs", () => {
    expect(FLASHCARD_TYPE_CONFIGS).toHaveLength(5);
    const types = FLASHCARD_TYPE_CONFIGS.map((c) => c.value);
    expect(types).toContain("CUSTOM");
    expect(types).toContain("VOCABULARY");
    expect(types).toContain("CONCEPT");
    expect(types).toContain("COMPREHENSION");
    expect(types).toContain("QUOTE");
  });

  it("should have valid default form data", () => {
    expect(DEFAULT_FORM_DATA.front).toBe("");
    expect(DEFAULT_FORM_DATA.back).toBe("");
    expect(DEFAULT_FORM_DATA.type).toBe("CUSTOM");
    expect(DEFAULT_FORM_DATA.tags).toEqual([]);
    expect(DEFAULT_FORM_DATA.bookId).toBeNull();
  });

  it("should have valid default preferences", () => {
    expect(DEFAULT_PREFERENCES.defaultType).toBe("CUSTOM");
    expect(DEFAULT_PREFERENCES.recentTags).toEqual([]);
    expect(DEFAULT_PREFERENCES.lastBookId).toBeNull();
  });
});

// =============================================================================
// VALIDATION FUNCTION TESTS
// =============================================================================

describe("isValidFront", () => {
  it("should return true for valid front content", () => {
    expect(isValidFront("Hello")).toBe(true);
    expect(isValidFront("A")).toBe(true);
    expect(isValidFront("a".repeat(500))).toBe(true);
  });

  it("should return false for empty content", () => {
    expect(isValidFront("")).toBe(false);
    expect(isValidFront("   ")).toBe(false);
  });

  it("should return false for content exceeding max length", () => {
    expect(isValidFront("a".repeat(501))).toBe(false);
  });

  it("should trim content before validation", () => {
    expect(isValidFront("  hello  ")).toBe(true);
    expect(isValidFront("   ")).toBe(false);
  });
});

describe("isValidBack", () => {
  it("should return true for valid back content", () => {
    expect(isValidBack("Answer")).toBe(true);
    expect(isValidBack("A")).toBe(true);
    expect(isValidBack("a".repeat(2000))).toBe(true);
  });

  it("should return false for empty content", () => {
    expect(isValidBack("")).toBe(false);
    expect(isValidBack("   ")).toBe(false);
  });

  it("should return false for content exceeding max length", () => {
    expect(isValidBack("a".repeat(2001))).toBe(false);
  });
});

describe("isValidTag", () => {
  it("should return true for valid tags", () => {
    expect(isValidTag("javascript")).toBe(true);
    expect(isValidTag("A")).toBe(true);
    expect(isValidTag("a".repeat(50))).toBe(true);
  });

  it("should return false for empty tags", () => {
    expect(isValidTag("")).toBe(false);
    expect(isValidTag("   ")).toBe(false);
  });

  it("should return false for tags exceeding max length", () => {
    expect(isValidTag("a".repeat(51))).toBe(false);
  });
});

describe("isValidTags", () => {
  it("should return true for valid tags array", () => {
    expect(isValidTags([])).toBe(true);
    expect(isValidTags(["tag1"])).toBe(true);
    expect(isValidTags(["tag1", "tag2", "tag3"])).toBe(true);
    expect(isValidTags(Array(10).fill("tag"))).toBe(true);
  });

  it("should return false for too many tags", () => {
    expect(isValidTags(Array(11).fill("tag"))).toBe(false);
  });

  it("should return false if any tag is invalid", () => {
    expect(isValidTags(["valid", "", "also-valid"])).toBe(false);
    expect(isValidTags(["valid", "a".repeat(51)])).toBe(false);
  });
});

describe("isValidType", () => {
  it("should return true for valid types", () => {
    expect(isValidType("CUSTOM")).toBe(true);
    expect(isValidType("VOCABULARY")).toBe(true);
    expect(isValidType("CONCEPT")).toBe(true);
    expect(isValidType("COMPREHENSION")).toBe(true);
    expect(isValidType("QUOTE")).toBe(true);
  });

  it("should return false for invalid types", () => {
    expect(isValidType("")).toBe(false);
    expect(isValidType("INVALID")).toBe(false);
    expect(isValidType("custom")).toBe(false); // Case sensitive
  });
});

describe("validateFormData", () => {
  it("should return valid for correct form data", () => {
    const data: CreateFlashcardFormData = {
      front: "Question?",
      back: "Answer",
      type: "CUSTOM",
      tags: ["tag1"],
      bookId: null,
    };
    const result = validateFormData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return error for empty front", () => {
    const data: CreateFlashcardFormData = {
      ...DEFAULT_FORM_DATA,
      front: "",
      back: "Answer",
    };
    const result = validateFormData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "front")).toBe(true);
  });

  it("should return error for empty back", () => {
    const data: CreateFlashcardFormData = {
      ...DEFAULT_FORM_DATA,
      front: "Question",
      back: "",
    };
    const result = validateFormData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "back")).toBe(true);
  });

  it("should return error for front exceeding max length", () => {
    const data: CreateFlashcardFormData = {
      ...DEFAULT_FORM_DATA,
      front: "a".repeat(501),
      back: "Answer",
    };
    const result = validateFormData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "front")).toBe(true);
  });

  it("should return error for too many tags", () => {
    const data: CreateFlashcardFormData = {
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: Array(11).fill("tag"),
      bookId: null,
    };
    const result = validateFormData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "tags")).toBe(true);
  });

  it("should return multiple errors", () => {
    const data: CreateFlashcardFormData = {
      front: "",
      back: "",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    };
    const result = validateFormData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getFieldError", () => {
  it("should return error for field with error", () => {
    const result = validateFormData({
      ...DEFAULT_FORM_DATA,
      front: "",
      back: "Answer",
    });
    const error = getFieldError(result, "front");
    expect(error).toBeDefined();
    expect(error?.field).toBe("front");
  });

  it("should return undefined for field without error", () => {
    const result = validateFormData({
      ...DEFAULT_FORM_DATA,
      front: "Question",
      back: "Answer",
    });
    const error = getFieldError(result, "front");
    expect(error).toBeUndefined();
  });
});

describe("hasFieldError", () => {
  it("should return true for field with error", () => {
    const result = validateFormData({
      ...DEFAULT_FORM_DATA,
      front: "",
      back: "Answer",
    });
    expect(hasFieldError(result, "front")).toBe(true);
  });

  it("should return false for field without error", () => {
    const result = validateFormData({
      ...DEFAULT_FORM_DATA,
      front: "Question",
      back: "Answer",
    });
    expect(hasFieldError(result, "front")).toBe(false);
  });
});

// =============================================================================
// FORM HELPER TESTS
// =============================================================================

describe("createFormData", () => {
  it("should create default form data", () => {
    const data = createFormData();
    expect(data).toEqual(DEFAULT_FORM_DATA);
  });

  it("should merge with initial values", () => {
    const data = createFormData({
      front: "Hello",
      bookId: "book-123",
    });
    expect(data.front).toBe("Hello");
    expect(data.bookId).toBe("book-123");
    expect(data.back).toBe("");
    expect(data.type).toBe("CUSTOM");
  });
});

describe("updateFormField", () => {
  it("should update a single field", () => {
    const data = createFormData();
    const updated = updateFormField(data, "front", "New question");
    expect(updated.front).toBe("New question");
    expect(updated.back).toBe(data.back);
  });

  it("should not mutate original", () => {
    const data = createFormData();
    const updated = updateFormField(data, "front", "New question");
    expect(data.front).toBe("");
    expect(updated).not.toBe(data);
  });
});

describe("addTag", () => {
  it("should add a new tag", () => {
    const data = createFormData();
    const updated = addTag(data, "javascript");
    expect(updated.tags).toContain("javascript");
  });

  it("should trim the tag", () => {
    const data = createFormData();
    const updated = addTag(data, "  javascript  ");
    expect(updated.tags).toContain("javascript");
  });

  it("should not add empty tag", () => {
    const data = createFormData();
    const updated = addTag(data, "   ");
    expect(updated.tags).toHaveLength(0);
  });

  it("should not add duplicate tag", () => {
    const data = createFormData({ tags: ["javascript"] });
    const updated = addTag(data, "javascript");
    expect(updated.tags).toHaveLength(1);
  });

  it("should not exceed max tags", () => {
    const data = createFormData({
      tags: Array(10)
        .fill(0)
        .map((_, i) => `tag${i}`),
    });
    const updated = addTag(data, "newtag");
    expect(updated.tags).toHaveLength(10);
    expect(updated.tags).not.toContain("newtag");
  });
});

describe("removeTag", () => {
  it("should remove a tag", () => {
    const data = createFormData({ tags: ["javascript", "react"] });
    const updated = removeTag(data, "javascript");
    expect(updated.tags).not.toContain("javascript");
    expect(updated.tags).toContain("react");
  });

  it("should handle non-existent tag", () => {
    const data = createFormData({ tags: ["javascript"] });
    const updated = removeTag(data, "python");
    expect(updated.tags).toEqual(["javascript"]);
  });
});

describe("resetFormData", () => {
  it("should reset to defaults", () => {
    const data = resetFormData();
    expect(data.front).toBe("");
    expect(data.back).toBe("");
  });

  it("should use preferences for type and bookId", () => {
    const prefs: CreateFlashcardPreferences = {
      defaultType: "VOCABULARY",
      recentTags: [],
      lastBookId: "book-456",
    };
    const data = resetFormData(prefs);
    expect(data.type).toBe("VOCABULARY");
    expect(data.bookId).toBe("book-456");
  });
});

// =============================================================================
// PREFERENCE HELPER TESTS
// =============================================================================

describe("Preference helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("loadPreferences", () => {
    it("should return defaults when no stored preferences", () => {
      const prefs = loadPreferences();
      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });

    it("should load stored preferences", () => {
      const stored: CreateFlashcardPreferences = {
        defaultType: "VOCABULARY",
        recentTags: ["tag1", "tag2"],
        lastBookId: "book-123",
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(stored));
      const prefs = loadPreferences();
      expect(prefs).toEqual(stored);
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem(PREFERENCES_KEY, "invalid json");
      const prefs = loadPreferences();
      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });

    it("should merge partial preferences with defaults", () => {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ defaultType: "QUOTE" })
      );
      const prefs = loadPreferences();
      expect(prefs.defaultType).toBe("QUOTE");
      expect(prefs.recentTags).toEqual([]);
    });
  });

  describe("savePreferences", () => {
    it("should save preferences to localStorage", () => {
      const prefs: CreateFlashcardPreferences = {
        defaultType: "CONCEPT",
        recentTags: ["test"],
        lastBookId: "book-789",
      };
      savePreferences(prefs);
      const stored = localStorage.getItem(PREFERENCES_KEY);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored ?? "{}")).toEqual(prefs);
    });
  });

  describe("updateRecentTags", () => {
    it("should add new tags to the front", () => {
      const prefs: CreateFlashcardPreferences = {
        ...DEFAULT_PREFERENCES,
        recentTags: ["old1", "old2"],
      };
      const updated = updateRecentTags(prefs, ["new1", "new2"]);
      expect(updated.recentTags[0]).toBe("new1");
      expect(updated.recentTags[1]).toBe("new2");
    });

    it("should deduplicate tags", () => {
      const prefs: CreateFlashcardPreferences = {
        ...DEFAULT_PREFERENCES,
        recentTags: ["tag1", "tag2"],
      };
      const updated = updateRecentTags(prefs, ["tag1", "tag3"]);
      const tag1Count = updated.recentTags.filter((t) => t === "tag1").length;
      expect(tag1Count).toBe(1);
    });

    it("should limit to 20 tags", () => {
      const prefs: CreateFlashcardPreferences = {
        ...DEFAULT_PREFERENCES,
        recentTags: Array(20)
          .fill(0)
          .map((_, i) => `old${i}`),
      };
      const updated = updateRecentTags(prefs, ["new1", "new2"]);
      expect(updated.recentTags).toHaveLength(20);
    });
  });
});

// =============================================================================
// API HELPER TESTS
// =============================================================================

describe("buildCreateRequest", () => {
  it("should build request with all fields", () => {
    const data: CreateFlashcardFormData = {
      front: "  Question?  ",
      back: "  Answer  ",
      type: "VOCABULARY",
      tags: ["tag1", "tag2"],
      bookId: "book-123",
    };
    const request = buildCreateRequest(data);
    expect(request.front).toBe("Question?");
    expect(request.back).toBe("Answer");
    expect(request.type).toBe("VOCABULARY");
    expect(request.tags).toEqual(["tag1", "tag2"]);
    expect(request.bookId).toBe("book-123");
  });

  it("should trim front and back", () => {
    const data: CreateFlashcardFormData = {
      front: "  Q  ",
      back: "  A  ",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    };
    const request = buildCreateRequest(data);
    expect(request.front).toBe("Q");
    expect(request.back).toBe("A");
  });
});

describe("parseCreateApiError", () => {
  it("should handle 400 validation error", () => {
    const error = parseCreateApiError(400);
    expect(error.messageKey).toBe("flashcards.create.errors.validation");
    expect(error.retryable).toBe(false);
  });

  it("should handle 401 unauthorized error", () => {
    const error = parseCreateApiError(401);
    expect(error.messageKey).toBe("flashcards.create.errors.unauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should handle 403 forbidden error", () => {
    const error = parseCreateApiError(403);
    expect(error.messageKey).toBe("flashcards.create.errors.unauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should handle 429 rate limit error", () => {
    const error = parseCreateApiError(429);
    expect(error.messageKey).toBe("flashcards.create.errors.rateLimit");
    expect(error.retryable).toBe(true);
  });

  it("should handle 500 server error", () => {
    const error = parseCreateApiError(500);
    expect(error.messageKey).toBe("flashcards.create.errors.server");
    expect(error.retryable).toBe(true);
  });

  it("should handle unknown error with custom message", () => {
    const error = parseCreateApiError(404, "Custom error message");
    expect(error.messageKey).toBe("Custom error message");
    expect(error.retryable).toBe(true);
  });
});

// =============================================================================
// DISPLAY HELPER TESTS
// =============================================================================

describe("getCharacterCount", () => {
  it("should format character count", () => {
    expect(getCharacterCount("hello", 500)).toBe("5/500");
    expect(getCharacterCount("", 100)).toBe("0/100");
    expect(getCharacterCount("a".repeat(100), 100)).toBe("100/100");
  });
});

describe("isAtLimit", () => {
  it("should return true when at limit", () => {
    expect(isAtLimit("a".repeat(500), 500)).toBe(true);
    expect(isAtLimit("a".repeat(501), 500)).toBe(true);
  });

  it("should return false when below limit", () => {
    expect(isAtLimit("hello", 500)).toBe(false);
  });
});

describe("isNearLimit", () => {
  it("should return true when at 90%+ of limit", () => {
    expect(isNearLimit("a".repeat(450), 500)).toBe(true);
    expect(isNearLimit("a".repeat(500), 500)).toBe(true);
  });

  it("should return false when below 90%", () => {
    expect(isNearLimit("a".repeat(400), 500)).toBe(false);
    expect(isNearLimit("hello", 500)).toBe(false);
  });
});

describe("getTypeConfig", () => {
  it("should return config for valid type", () => {
    const config = getTypeConfig("VOCABULARY");
    expect(config).toBeDefined();
    expect(config?.value).toBe("VOCABULARY");
  });

  it("should return undefined for invalid type", () => {
    const config = getTypeConfig("INVALID" as FlashcardType);
    expect(config).toBeUndefined();
  });
});

describe("formatTagsDisplay", () => {
  it("should return empty string for no tags", () => {
    expect(formatTagsDisplay([])).toBe("");
  });

  it("should join up to 3 tags", () => {
    expect(formatTagsDisplay(["a"])).toBe("a");
    expect(formatTagsDisplay(["a", "b"])).toBe("a, b");
    expect(formatTagsDisplay(["a", "b", "c"])).toBe("a, b, c");
  });

  it("should truncate and show count for more than 3 tags", () => {
    expect(formatTagsDisplay(["a", "b", "c", "d"])).toBe("a, b, c +1");
    expect(formatTagsDisplay(["a", "b", "c", "d", "e"])).toBe("a, b, c +2");
  });
});
