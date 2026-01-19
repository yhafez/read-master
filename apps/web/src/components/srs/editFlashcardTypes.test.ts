/**
 * Edit Flashcard Types Tests
 *
 * Comprehensive tests for editFlashcardTypes utilities including
 * validation functions, form helpers, and API helpers.
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  MIN_FRONT_LENGTH,
  MAX_FRONT_LENGTH,
  MIN_BACK_LENGTH,
  MAX_BACK_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  // Types
  type EditFlashcardFormData,
  type ExistingFlashcard,
  // Validation functions
  validateEditFormData,
  getEditFieldError,
  hasEditFieldError,
  // Form helpers
  createEditFormData,
  createEmptyEditFormData,
  updateEditFormField,
  addEditTag,
  removeEditTag,
  hasFormChanged,
  // API helpers
  buildUpdateRequest,
  parseUpdateApiError,
  parseLoadApiError,
  getBookOptionFromFlashcard,
} from "./editFlashcardTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("editFlashcardTypes constants", () => {
  it("should have correct front length constraints", () => {
    expect(MIN_FRONT_LENGTH).toBe(1);
    expect(MAX_FRONT_LENGTH).toBe(500);
  });

  it("should have correct back length constraints", () => {
    expect(MIN_BACK_LENGTH).toBe(1);
    expect(MAX_BACK_LENGTH).toBe(2000);
  });

  it("should have correct tag constraints", () => {
    expect(MAX_TAGS).toBe(10);
    expect(MAX_TAG_LENGTH).toBe(50);
  });
});

// =============================================================================
// VALIDATION FUNCTIONS TESTS
// =============================================================================

describe("validateEditFormData", () => {
  const validFormData: EditFlashcardFormData = {
    id: "card-123",
    front: "What is the capital of France?",
    back: "Paris",
    type: "CUSTOM",
    tags: ["geography", "europe"],
    bookId: null,
  };

  it("should return valid for correct form data", () => {
    const result = validateEditFormData(validFormData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return error for empty id", () => {
    const result = validateEditFormData({ ...validFormData, id: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.messageKey).toBe(
      "flashcards.edit.errors.missingId"
    );
  });

  it("should return error for whitespace-only id", () => {
    const result = validateEditFormData({ ...validFormData, id: "   " });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.messageKey).toBe(
      "flashcards.edit.errors.missingId"
    );
  });

  it("should return error for empty front", () => {
    const result = validateEditFormData({ ...validFormData, front: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "front")).toBe(true);
  });

  it("should return error for front exceeding max length", () => {
    const longFront = "a".repeat(MAX_FRONT_LENGTH + 1);
    const result = validateEditFormData({ ...validFormData, front: longFront });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.messageKey.includes("frontTooLong"))
    ).toBe(true);
  });

  it("should return error for empty back", () => {
    const result = validateEditFormData({ ...validFormData, back: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "back")).toBe(true);
  });

  it("should return error for back exceeding max length", () => {
    const longBack = "a".repeat(MAX_BACK_LENGTH + 1);
    const result = validateEditFormData({ ...validFormData, back: longBack });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.messageKey.includes("backTooLong"))
    ).toBe(true);
  });

  it("should return error for invalid type", () => {
    const result = validateEditFormData({
      ...validFormData,
      type: "INVALID" as EditFlashcardFormData["type"],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.messageKey.includes("invalidType"))
    ).toBe(true);
  });

  it("should return error for too many tags", () => {
    const tooManyTags = Array.from(
      { length: MAX_TAGS + 1 },
      (_, i) => `tag${i}`
    );
    const result = validateEditFormData({
      ...validFormData,
      tags: tooManyTags,
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.messageKey.includes("tooManyTags"))
    ).toBe(true);
  });

  it("should return error for tag exceeding max length", () => {
    const longTag = "a".repeat(MAX_TAG_LENGTH + 1);
    const result = validateEditFormData({
      ...validFormData,
      tags: [longTag],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.messageKey.includes("invalidTag"))).toBe(
      true
    );
  });

  it("should accept all valid flashcard types", () => {
    const validTypes: EditFlashcardFormData["type"][] = [
      "VOCABULARY",
      "CONCEPT",
      "COMPREHENSION",
      "QUOTE",
      "CUSTOM",
    ];

    validTypes.forEach((type) => {
      const result = validateEditFormData({ ...validFormData, type });
      expect(result.valid).toBe(true);
    });
  });
});

describe("getEditFieldError", () => {
  it("should return error for specific field", () => {
    const result = validateEditFormData({
      id: "card-123",
      front: "",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    });

    const error = getEditFieldError(result, "front");
    expect(error).toBeDefined();
    expect(error?.field).toBe("front");
  });

  it("should return undefined if field has no error", () => {
    const result = validateEditFormData({
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    });

    const error = getEditFieldError(result, "front");
    expect(error).toBeUndefined();
  });
});

describe("hasEditFieldError", () => {
  it("should return true if field has error", () => {
    const result = validateEditFormData({
      id: "card-123",
      front: "",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    });

    expect(hasEditFieldError(result, "front")).toBe(true);
  });

  it("should return false if field has no error", () => {
    const result = validateEditFormData({
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    });

    expect(hasEditFieldError(result, "front")).toBe(false);
  });
});

// =============================================================================
// FORM HELPERS TESTS
// =============================================================================

describe("createEditFormData", () => {
  it("should create form data from existing flashcard", () => {
    const flashcard: ExistingFlashcard = {
      id: "card-123",
      front: "What is React?",
      back: "A JavaScript library",
      type: "CONCEPT",
      tags: ["react", "javascript"],
      bookId: "book-456",
    };

    const formData = createEditFormData(flashcard);

    expect(formData.id).toBe("card-123");
    expect(formData.front).toBe("What is React?");
    expect(formData.back).toBe("A JavaScript library");
    expect(formData.type).toBe("CONCEPT");
    expect(formData.tags).toEqual(["react", "javascript"]);
    expect(formData.bookId).toBe("book-456");
  });

  it("should handle null bookId", () => {
    const flashcard: ExistingFlashcard = {
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    };

    const formData = createEditFormData(flashcard);
    expect(formData.bookId).toBeNull();
  });
});

describe("createEmptyEditFormData", () => {
  it("should create empty form data", () => {
    const formData = createEmptyEditFormData();

    expect(formData.id).toBe("");
    expect(formData.front).toBe("");
    expect(formData.back).toBe("");
    expect(formData.type).toBe("CUSTOM");
    expect(formData.tags).toEqual([]);
    expect(formData.bookId).toBeNull();
  });
});

describe("updateEditFormField", () => {
  const baseData: EditFlashcardFormData = {
    id: "card-123",
    front: "Old front",
    back: "Old back",
    type: "CUSTOM",
    tags: ["tag1"],
    bookId: null,
  };

  it("should update front field", () => {
    const updated = updateEditFormField(baseData, "front", "New front");
    expect(updated.front).toBe("New front");
    expect(updated.back).toBe("Old back"); // Unchanged
  });

  it("should update back field", () => {
    const updated = updateEditFormField(baseData, "back", "New back");
    expect(updated.back).toBe("New back");
    expect(updated.front).toBe("Old front"); // Unchanged
  });

  it("should update type field", () => {
    const updated = updateEditFormField(baseData, "type", "VOCABULARY");
    expect(updated.type).toBe("VOCABULARY");
  });

  it("should update bookId field", () => {
    const updated = updateEditFormField(baseData, "bookId", "book-789");
    expect(updated.bookId).toBe("book-789");
  });

  it("should not mutate original data", () => {
    updateEditFormField(baseData, "front", "New front");
    expect(baseData.front).toBe("Old front");
  });
});

describe("addEditTag", () => {
  const baseData: EditFlashcardFormData = {
    id: "card-123",
    front: "Question",
    back: "Answer",
    type: "CUSTOM",
    tags: ["existing"],
    bookId: null,
  };

  it("should add a new tag", () => {
    const updated = addEditTag(baseData, "new-tag");
    expect(updated.tags).toContain("new-tag");
    expect(updated.tags).toHaveLength(2);
  });

  it("should trim whitespace from tag", () => {
    const updated = addEditTag(baseData, "  trimmed  ");
    expect(updated.tags).toContain("trimmed");
  });

  it("should not add duplicate tag", () => {
    const updated = addEditTag(baseData, "existing");
    expect(updated.tags).toHaveLength(1);
  });

  it("should not add empty tag", () => {
    const updated = addEditTag(baseData, "");
    expect(updated.tags).toHaveLength(1);
  });

  it("should not add whitespace-only tag", () => {
    const updated = addEditTag(baseData, "   ");
    expect(updated.tags).toHaveLength(1);
  });

  it("should not exceed max tags", () => {
    const dataWithMaxTags: EditFlashcardFormData = {
      ...baseData,
      tags: Array.from({ length: MAX_TAGS }, (_, i) => `tag${i}`),
    };
    const updated = addEditTag(dataWithMaxTags, "overflow");
    expect(updated.tags).toHaveLength(MAX_TAGS);
    expect(updated.tags).not.toContain("overflow");
  });

  it("should not mutate original data", () => {
    addEditTag(baseData, "new-tag");
    expect(baseData.tags).toEqual(["existing"]);
  });
});

describe("removeEditTag", () => {
  const baseData: EditFlashcardFormData = {
    id: "card-123",
    front: "Question",
    back: "Answer",
    type: "CUSTOM",
    tags: ["tag1", "tag2", "tag3"],
    bookId: null,
  };

  it("should remove existing tag", () => {
    const updated = removeEditTag(baseData, "tag2");
    expect(updated.tags).toEqual(["tag1", "tag3"]);
  });

  it("should handle non-existent tag", () => {
    const updated = removeEditTag(baseData, "non-existent");
    expect(updated.tags).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("should not mutate original data", () => {
    removeEditTag(baseData, "tag1");
    expect(baseData.tags).toEqual(["tag1", "tag2", "tag3"]);
  });
});

describe("hasFormChanged", () => {
  const original: ExistingFlashcard = {
    id: "card-123",
    front: "Original question",
    back: "Original answer",
    type: "CUSTOM",
    tags: ["tag1", "tag2"],
    bookId: "book-456",
  };

  it("should return false when nothing changed", () => {
    const current: EditFlashcardFormData = {
      id: "card-123",
      front: "Original question",
      back: "Original answer",
      type: "CUSTOM",
      tags: ["tag1", "tag2"],
      bookId: "book-456",
    };
    expect(hasFormChanged(original, current)).toBe(false);
  });

  it("should return false when only whitespace differs", () => {
    const current: EditFlashcardFormData = {
      id: "card-123",
      front: "Original question  ",
      back: "  Original answer",
      type: "CUSTOM",
      tags: ["tag1", "tag2"],
      bookId: "book-456",
    };
    expect(hasFormChanged(original, current)).toBe(false);
  });

  it("should return true when front changed", () => {
    const current: EditFlashcardFormData = {
      ...original,
      front: "New question",
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should return true when back changed", () => {
    const current: EditFlashcardFormData = {
      ...original,
      back: "New answer",
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should return true when type changed", () => {
    const current: EditFlashcardFormData = {
      ...original,
      type: "VOCABULARY",
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should return true when bookId changed", () => {
    const current: EditFlashcardFormData = {
      ...original,
      bookId: "book-789",
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should return true when tag added", () => {
    const current: EditFlashcardFormData = {
      ...original,
      tags: ["tag1", "tag2", "tag3"],
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should return true when tag removed", () => {
    const current: EditFlashcardFormData = {
      ...original,
      tags: ["tag1"],
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should return true when tags differ even with same length", () => {
    const current: EditFlashcardFormData = {
      ...original,
      tags: ["tag1", "tag3"],
    };
    expect(hasFormChanged(original, current)).toBe(true);
  });

  it("should ignore tag order", () => {
    const current: EditFlashcardFormData = {
      ...original,
      tags: ["tag2", "tag1"],
    };
    expect(hasFormChanged(original, current)).toBe(false);
  });
});

// =============================================================================
// API HELPERS TESTS
// =============================================================================

describe("buildUpdateRequest", () => {
  it("should build correct request body", () => {
    const formData: EditFlashcardFormData = {
      id: "card-123",
      front: "  Question with spaces  ",
      back: "  Answer with spaces  ",
      type: "VOCABULARY",
      tags: ["tag1", "tag2"],
      bookId: "book-456",
    };

    const request = buildUpdateRequest(formData);

    expect(request.front).toBe("Question with spaces");
    expect(request.back).toBe("Answer with spaces");
    expect(request.type).toBe("VOCABULARY");
    expect(request.tags).toEqual(["tag1", "tag2"]);
    expect(request.bookId).toBe("book-456");
    expect(request).not.toHaveProperty("id");
  });

  it("should handle null bookId", () => {
    const formData: EditFlashcardFormData = {
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    };

    const request = buildUpdateRequest(formData);
    expect(request.bookId).toBeNull();
  });
});

describe("parseUpdateApiError", () => {
  it("should return validation error for 400", () => {
    const error = parseUpdateApiError(400);
    expect(error.messageKey).toBe("flashcards.edit.errors.validation");
    expect(error.retryable).toBe(false);
  });

  it("should return unauthorized error for 401", () => {
    const error = parseUpdateApiError(401);
    expect(error.messageKey).toBe("flashcards.edit.errors.unauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should return unauthorized error for 403", () => {
    const error = parseUpdateApiError(403);
    expect(error.messageKey).toBe("flashcards.edit.errors.unauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should return not found error for 404", () => {
    const error = parseUpdateApiError(404);
    expect(error.messageKey).toBe("flashcards.edit.errors.notFound");
    expect(error.retryable).toBe(false);
  });

  it("should return rate limit error for 429", () => {
    const error = parseUpdateApiError(429);
    expect(error.messageKey).toBe("flashcards.edit.errors.rateLimit");
    expect(error.retryable).toBe(true);
  });

  it("should return server error for 500", () => {
    const error = parseUpdateApiError(500);
    expect(error.messageKey).toBe("flashcards.edit.errors.server");
    expect(error.retryable).toBe(true);
  });

  it("should return server error for 503", () => {
    const error = parseUpdateApiError(503);
    expect(error.messageKey).toBe("flashcards.edit.errors.server");
    expect(error.retryable).toBe(true);
  });

  it("should return unknown error for other status codes", () => {
    const error = parseUpdateApiError(418);
    expect(error.messageKey).toBe("flashcards.edit.errors.unknown");
    expect(error.retryable).toBe(true);
  });

  it("should use custom message if provided", () => {
    const error = parseUpdateApiError(418, "custom.error");
    expect(error.messageKey).toBe("custom.error");
  });
});

describe("parseLoadApiError", () => {
  it("should return unauthorized error for 401", () => {
    const error = parseLoadApiError(401);
    expect(error.messageKey).toBe("flashcards.edit.errors.loadUnauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should return unauthorized error for 403", () => {
    const error = parseLoadApiError(403);
    expect(error.messageKey).toBe("flashcards.edit.errors.loadUnauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should return not found error for 404", () => {
    const error = parseLoadApiError(404);
    expect(error.messageKey).toBe("flashcards.edit.errors.loadNotFound");
    expect(error.retryable).toBe(false);
  });

  it("should return server error for 500", () => {
    const error = parseLoadApiError(500);
    expect(error.messageKey).toBe("flashcards.edit.errors.loadServer");
    expect(error.retryable).toBe(true);
  });

  it("should return unknown error for other status codes", () => {
    const error = parseLoadApiError(418);
    expect(error.messageKey).toBe("flashcards.edit.errors.loadUnknown");
    expect(error.retryable).toBe(true);
  });

  it("should use custom message if provided", () => {
    const error = parseLoadApiError(418, "custom.load.error");
    expect(error.messageKey).toBe("custom.load.error");
  });
});

// =============================================================================
// BOOK OPTION HELPERS TESTS
// =============================================================================

describe("getBookOptionFromFlashcard", () => {
  it("should return null when flashcard has no book", () => {
    const flashcard: ExistingFlashcard = {
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: null,
    };

    expect(getBookOptionFromFlashcard(flashcard)).toBeNull();
  });

  it("should return null when flashcard has bookId but no book object", () => {
    const flashcard: ExistingFlashcard = {
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: "book-456",
    };

    expect(getBookOptionFromFlashcard(flashcard)).toBeNull();
  });

  it("should return book option from flashcard with book", () => {
    const flashcard: ExistingFlashcard = {
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: "book-456",
      book: {
        id: "book-456",
        title: "Test Book",
        author: "Test Author",
        coverUrl: "https://example.com/cover.jpg",
      },
    };

    const option = getBookOptionFromFlashcard(flashcard);
    expect(option).not.toBeNull();
    expect(option?.id).toBe("book-456");
    expect(option?.title).toBe("Test Book");
    expect(option?.author).toBe("Test Author");
    expect(option?.coverUrl).toBe("https://example.com/cover.jpg");
  });

  it("should handle null author and coverUrl", () => {
    const flashcard: ExistingFlashcard = {
      id: "card-123",
      front: "Question",
      back: "Answer",
      type: "CUSTOM",
      tags: [],
      bookId: "book-456",
      book: {
        id: "book-456",
        title: "Test Book",
        author: null,
        coverUrl: null,
      },
    };

    const option = getBookOptionFromFlashcard(flashcard);
    expect(option?.author).toBeNull();
    expect(option?.coverUrl).toBeNull();
  });
});
