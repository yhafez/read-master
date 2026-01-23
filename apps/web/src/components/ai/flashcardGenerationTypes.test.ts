/**
 * Tests for Flashcard Generation Types and Utilities
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Constants
  FLASHCARD_TYPE_OPTIONS,
  MIN_CARD_COUNT,
  MAX_CARD_COUNT,
  DEFAULT_CARD_COUNT,
  CARD_COUNT_STEP,
  CARD_COUNT_PRESETS,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  GENERATION_PREFS_STORAGE_KEY,
  // Validation functions
  isValidFlashcardType,
  isValidCardCount,
  isValidContentLength,
  validateContent,
  validateCardTypes,
  // Error functions
  createGenerationError,
  parseGenerationApiError,
  getGenerationErrorKey,
  // Display helpers
  getFlashcardTypeDisplay,
  getFlashcardTypeDescription,
  getFlashcardTypeIcon,
  getFlashcardTypeConfig,
  getDefaultSelectedTypes,
  // Editable flashcard functions
  toEditableFlashcards,
  startEditingCard,
  cancelEditingCard,
  saveEditedCard,
  updateEditedFront,
  updateEditedBack,
  toggleCardSelection,
  selectAllCards,
  deselectAllCards,
  getSelectedCards,
  getSelectedCount,
  isAnyCardEditing,
  toGeneratedFlashcards,
  // Storage functions
  loadGenerationPreferences,
  saveGenerationPreferences,
  // API builders
  buildGenerationRequest,
  // Summary display functions
  formatDuration,
  formatTokenCount,
  formatCost,
  getSummaryText,
  getTypeBreakdown,
  estimateGenerationTime,
  // Types
  type FlashcardGenerationType,
  type GeneratedFlashcard,
  type GenerationSummary,
} from "./flashcardGenerationTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Flashcard Generation Constants", () => {
  it("should have valid FLASHCARD_TYPE_OPTIONS", () => {
    expect(FLASHCARD_TYPE_OPTIONS).toHaveLength(4);
    expect(FLASHCARD_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      "vocabulary",
      "concept",
      "comprehension",
      "quote",
    ]);
  });

  it("should have valid card count constants", () => {
    expect(MIN_CARD_COUNT).toBe(1);
    expect(MAX_CARD_COUNT).toBe(30);
    expect(DEFAULT_CARD_COUNT).toBe(10);
    expect(CARD_COUNT_STEP).toBe(5);
    expect(CARD_COUNT_PRESETS).toEqual([5, 10, 15, 20, 30]);
  });

  it("should have valid content length constants", () => {
    expect(MIN_CONTENT_LENGTH).toBe(50);
    expect(MAX_CONTENT_LENGTH).toBe(50000);
  });

  it("should have valid storage key", () => {
    expect(GENERATION_PREFS_STORAGE_KEY).toBe("flashcard_generation_prefs");
  });
});

// =============================================================================
// VALIDATION FUNCTION TESTS
// =============================================================================

describe("isValidFlashcardType", () => {
  it("should return true for valid types", () => {
    expect(isValidFlashcardType("vocabulary")).toBe(true);
    expect(isValidFlashcardType("concept")).toBe(true);
    expect(isValidFlashcardType("comprehension")).toBe(true);
    expect(isValidFlashcardType("quote")).toBe(true);
  });

  it("should return false for invalid types", () => {
    expect(isValidFlashcardType("invalid")).toBe(false);
    expect(isValidFlashcardType("")).toBe(false);
    expect(isValidFlashcardType(null)).toBe(false);
    expect(isValidFlashcardType(undefined)).toBe(false);
    expect(isValidFlashcardType(123)).toBe(false);
  });
});

describe("isValidCardCount", () => {
  it("should return true for valid counts", () => {
    expect(isValidCardCount(1)).toBe(true);
    expect(isValidCardCount(10)).toBe(true);
    expect(isValidCardCount(30)).toBe(true);
  });

  it("should return false for invalid counts", () => {
    expect(isValidCardCount(0)).toBe(false);
    expect(isValidCardCount(31)).toBe(false);
    expect(isValidCardCount(-1)).toBe(false);
    expect(isValidCardCount(5.5)).toBe(false);
    expect(isValidCardCount("10")).toBe(false);
    expect(isValidCardCount(null)).toBe(false);
  });
});

describe("isValidContentLength", () => {
  it("should return true for valid content", () => {
    expect(isValidContentLength("a".repeat(50))).toBe(true);
    expect(isValidContentLength("a".repeat(1000))).toBe(true);
    expect(isValidContentLength("a".repeat(50000))).toBe(true);
  });

  it("should return false for invalid content", () => {
    expect(isValidContentLength("")).toBe(false);
    expect(isValidContentLength("a".repeat(49))).toBe(false);
    expect(isValidContentLength("a".repeat(50001))).toBe(false);
  });
});

describe("validateContent", () => {
  it("should validate content correctly", () => {
    expect(validateContent("a".repeat(50))).toEqual({ valid: true });
    expect(validateContent("a".repeat(100))).toEqual({ valid: true });
  });

  it("should return error for empty content", () => {
    const result = validateContent("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should return error for short content", () => {
    const result = validateContent("short");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least");
  });

  it("should return error for long content", () => {
    const result = validateContent("a".repeat(50001));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most");
  });
});

describe("validateCardTypes", () => {
  it("should validate card types correctly", () => {
    expect(validateCardTypes(["vocabulary"])).toEqual({ valid: true });
    expect(validateCardTypes(["vocabulary", "concept"])).toEqual({
      valid: true,
    });
  });

  it("should return error for empty array", () => {
    const result = validateCardTypes([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least one");
  });

  it("should return error for non-array", () => {
    const result = validateCardTypes(
      "vocabulary" as unknown as FlashcardGenerationType[]
    );
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// ERROR FUNCTION TESTS
// =============================================================================

describe("createGenerationError", () => {
  it("should create error with default message", () => {
    const error = createGenerationError("network_error");
    expect(error.type).toBe("network_error");
    expect(error.message).toContain("internet");
    expect(error.retryable).toBe(true);
  });

  it("should create error with custom message", () => {
    const error = createGenerationError("validation_error", "Custom message");
    expect(error.type).toBe("validation_error");
    expect(error.message).toBe("Custom message");
    expect(error.retryable).toBe(false);
  });

  it("should mark network errors as retryable", () => {
    expect(createGenerationError("network_error").retryable).toBe(true);
    expect(createGenerationError("ai_unavailable").retryable).toBe(true);
    expect(createGenerationError("unknown").retryable).toBe(true);
  });

  it("should mark other errors as not retryable", () => {
    expect(createGenerationError("validation_error").retryable).toBe(false);
    expect(createGenerationError("rate_limit").retryable).toBe(false);
    expect(createGenerationError("ai_disabled").retryable).toBe(false);
  });
});

describe("parseGenerationApiError", () => {
  it("should parse 400 errors correctly", () => {
    const error = parseGenerationApiError(400, "Content too short");
    expect(error.type).toBe("validation_error");
  });

  it("should parse content-related 400 errors", () => {
    expect(parseGenerationApiError(400, "Content must be at least").type).toBe(
      "content_too_short"
    );
    expect(parseGenerationApiError(400, "Content must be at most").type).toBe(
      "content_too_long"
    );
  });

  it("should parse 401/403 errors correctly", () => {
    expect(parseGenerationApiError(401).type).toBe("ai_disabled");
    expect(parseGenerationApiError(403, "disabled").type).toBe("ai_disabled");
  });

  it("should parse 404 errors correctly", () => {
    expect(parseGenerationApiError(404).type).toBe("book_not_found");
  });

  it("should parse 429 errors correctly", () => {
    expect(parseGenerationApiError(429).type).toBe("rate_limit");
  });

  it("should parse 503 errors correctly", () => {
    expect(parseGenerationApiError(503).type).toBe("ai_unavailable");
  });

  it("should parse network errors (status 0)", () => {
    expect(parseGenerationApiError(0).type).toBe("network_error");
  });

  it("should parse unknown errors", () => {
    expect(parseGenerationApiError(500).type).toBe("unknown");
  });
});

describe("getGenerationErrorKey", () => {
  it("should return correct i18n keys", () => {
    expect(getGenerationErrorKey("network_error")).toBe(
      "ai.flashcardGeneration.error.network"
    );
    expect(getGenerationErrorKey("rate_limit")).toBe(
      "ai.flashcardGeneration.error.rateLimit"
    );
    expect(getGenerationErrorKey("ai_disabled")).toBe(
      "ai.flashcardGeneration.error.aiDisabled"
    );
  });
});

// =============================================================================
// DISPLAY HELPER TESTS
// =============================================================================

describe("getFlashcardTypeDisplay", () => {
  it("should return display names for types", () => {
    expect(getFlashcardTypeDisplay("vocabulary")).toBe("Vocabulary");
    expect(getFlashcardTypeDisplay("concept")).toBe("Concept");
    expect(getFlashcardTypeDisplay("comprehension")).toBe("Comprehension");
    expect(getFlashcardTypeDisplay("quote")).toBe("Quote");
  });
});

describe("getFlashcardTypeDescription", () => {
  it("should return descriptions for types", () => {
    expect(getFlashcardTypeDescription("vocabulary")).toContain("Word");
    expect(getFlashcardTypeDescription("concept")).toContain("ideas");
    expect(getFlashcardTypeDescription("comprehension")).toContain(
      "Understanding"
    );
    expect(getFlashcardTypeDescription("quote")).toContain("passages");
  });
});

describe("getFlashcardTypeIcon", () => {
  it("should return icon names for types", () => {
    expect(getFlashcardTypeIcon("vocabulary")).toBe("text_fields");
    expect(getFlashcardTypeIcon("concept")).toBe("lightbulb");
    expect(getFlashcardTypeIcon("comprehension")).toBe("psychology");
    expect(getFlashcardTypeIcon("quote")).toBe("format_quote");
  });
});

describe("getFlashcardTypeConfig", () => {
  it("should return config for valid types", () => {
    const config = getFlashcardTypeConfig("vocabulary");
    expect(config).toBeDefined();
    expect(config?.value).toBe("vocabulary");
  });

  it("should return undefined for invalid types", () => {
    expect(
      getFlashcardTypeConfig("invalid" as FlashcardGenerationType)
    ).toBeUndefined();
  });
});

describe("getDefaultSelectedTypes", () => {
  it("should return default selected types", () => {
    const defaults = getDefaultSelectedTypes();
    expect(defaults).toContain("vocabulary");
    expect(defaults).toContain("concept");
    expect(defaults).not.toContain("comprehension");
    expect(defaults).not.toContain("quote");
  });
});

// =============================================================================
// EDITABLE FLASHCARD TESTS
// =============================================================================

describe("Editable Flashcard Functions", () => {
  const mockFlashcards: GeneratedFlashcard[] = [
    {
      id: "1",
      front: "Front 1",
      back: "Back 1",
      type: "vocabulary",
      tags: ["tag1"],
      dueDate: "2024-01-01",
    },
    {
      id: "2",
      front: "Front 2",
      back: "Back 2",
      type: "concept",
      tags: [],
      dueDate: "2024-01-01",
    },
  ];

  describe("toEditableFlashcards", () => {
    it("should convert to editable format", () => {
      const editable = toEditableFlashcards(mockFlashcards);
      expect(editable).toHaveLength(2);
      const first = editable[0];
      expect(first).toBeDefined();
      expect(first?.isEditing).toBe(false);
      expect(first?.isSelected).toBe(true);
      expect(first?.editedFront).toBe("Front 1");
      expect(first?.editedBack).toBe("Back 1");
    });
  });

  describe("startEditingCard", () => {
    it("should start editing a card", () => {
      const editable = toEditableFlashcards(mockFlashcards);
      const result = startEditingCard(editable, "1");
      expect(result[0]?.isEditing).toBe(true);
      expect(result[1]?.isEditing).toBe(false);
    });

    it("should stop editing other cards", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      editable = startEditingCard(editable, "1");
      editable = startEditingCard(editable, "2");
      expect(editable[0]?.isEditing).toBe(false);
      expect(editable[1]?.isEditing).toBe(true);
    });
  });

  describe("cancelEditingCard", () => {
    it("should cancel editing and restore values", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      editable = startEditingCard(editable, "1");
      editable = updateEditedFront(editable, "1", "Changed");
      editable = cancelEditingCard(editable, "1");
      expect(editable[0]?.isEditing).toBe(false);
      expect(editable[0]?.editedFront).toBe("Front 1");
    });
  });

  describe("saveEditedCard", () => {
    it("should save edited values", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      editable = startEditingCard(editable, "1");
      editable = updateEditedFront(editable, "1", "New Front");
      editable = updateEditedBack(editable, "1", "New Back");
      editable = saveEditedCard(editable, "1");
      expect(editable[0]?.isEditing).toBe(false);
      expect(editable[0]?.front).toBe("New Front");
      expect(editable[0]?.back).toBe("New Back");
    });
  });

  describe("updateEditedFront/Back", () => {
    it("should update edited front text", () => {
      const editable = toEditableFlashcards(mockFlashcards);
      const result = updateEditedFront(editable, "1", "Changed");
      expect(result[0]?.editedFront).toBe("Changed");
    });

    it("should update edited back text", () => {
      const editable = toEditableFlashcards(mockFlashcards);
      const result = updateEditedBack(editable, "1", "Changed");
      expect(result[0]?.editedBack).toBe("Changed");
    });
  });

  describe("toggleCardSelection", () => {
    it("should toggle card selection", () => {
      const editable = toEditableFlashcards(mockFlashcards);
      const result = toggleCardSelection(editable, "1");
      expect(result[0]?.isSelected).toBe(false);
      const result2 = toggleCardSelection(result, "1");
      expect(result2[0]?.isSelected).toBe(true);
    });
  });

  describe("selectAllCards/deselectAllCards", () => {
    it("should select all cards", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      editable = deselectAllCards(editable);
      editable = selectAllCards(editable);
      expect(editable[0]?.isSelected).toBe(true);
      expect(editable[1]?.isSelected).toBe(true);
    });

    it("should deselect all cards", () => {
      const editable = toEditableFlashcards(mockFlashcards);
      const result = deselectAllCards(editable);
      expect(result[0]?.isSelected).toBe(false);
      expect(result[1]?.isSelected).toBe(false);
    });
  });

  describe("getSelectedCards/getSelectedCount", () => {
    it("should get selected cards", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      editable = toggleCardSelection(editable, "2");
      const selected = getSelectedCards(editable);
      expect(selected).toHaveLength(1);
      expect(selected[0]?.id).toBe("1");
    });

    it("should get selected count", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      expect(getSelectedCount(editable)).toBe(2);
      editable = toggleCardSelection(editable, "1");
      expect(getSelectedCount(editable)).toBe(1);
    });
  });

  describe("isAnyCardEditing", () => {
    it("should return true if any card is editing", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      expect(isAnyCardEditing(editable)).toBe(false);
      editable = startEditingCard(editable, "1");
      expect(isAnyCardEditing(editable)).toBe(true);
    });
  });

  describe("toGeneratedFlashcards", () => {
    it("should convert back to generated format", () => {
      let editable = toEditableFlashcards(mockFlashcards);
      editable = toggleCardSelection(editable, "2");
      const generated = toGeneratedFlashcards(editable);
      expect(generated).toHaveLength(1);
      expect(generated[0]?.id).toBe("1");
    });
  });
});

// =============================================================================
// STORAGE FUNCTION TESTS
// =============================================================================

describe("Storage Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadGenerationPreferences", () => {
    it("should return defaults when no stored prefs", () => {
      const prefs = loadGenerationPreferences();
      expect(prefs.cardCount).toBe(DEFAULT_CARD_COUNT);
      expect(prefs.cardTypes).toEqual(getDefaultSelectedTypes());
      expect(prefs.autoSave).toBe(false);
    });

    it("should load stored preferences", () => {
      const stored = {
        cardTypes: ["vocabulary"] as FlashcardGenerationType[],
        cardCount: 15,
        autoSave: true,
      };
      localStorage.setItem(
        GENERATION_PREFS_STORAGE_KEY,
        JSON.stringify(stored)
      );
      const prefs = loadGenerationPreferences();
      expect(prefs.cardTypes).toEqual(["vocabulary"]);
      expect(prefs.cardCount).toBe(15);
      expect(prefs.autoSave).toBe(true);
    });

    it("should return defaults for invalid stored data", () => {
      localStorage.setItem(GENERATION_PREFS_STORAGE_KEY, "invalid json");
      const prefs = loadGenerationPreferences();
      expect(prefs.cardCount).toBe(DEFAULT_CARD_COUNT);
    });

    it("should validate stored card types", () => {
      const stored = {
        cardTypes: ["invalid"],
        cardCount: 10,
        autoSave: false,
      };
      localStorage.setItem(
        GENERATION_PREFS_STORAGE_KEY,
        JSON.stringify(stored)
      );
      const prefs = loadGenerationPreferences();
      expect(prefs.cardTypes).toEqual(getDefaultSelectedTypes());
    });

    it("should validate stored card count", () => {
      const stored = {
        cardTypes: ["vocabulary"],
        cardCount: 100, // Invalid
        autoSave: false,
      };
      localStorage.setItem(
        GENERATION_PREFS_STORAGE_KEY,
        JSON.stringify(stored)
      );
      const prefs = loadGenerationPreferences();
      expect(prefs.cardCount).toBe(DEFAULT_CARD_COUNT);
    });
  });

  describe("saveGenerationPreferences", () => {
    it("should save preferences to localStorage", () => {
      saveGenerationPreferences({
        cardTypes: ["vocabulary", "concept"],
        cardCount: 20,
        autoSave: true,
      });
      const stored = localStorage.getItem(GENERATION_PREFS_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored ?? "{}");
      expect(parsed.cardTypes).toEqual(["vocabulary", "concept"]);
      expect(parsed.cardCount).toBe(20);
      expect(parsed.autoSave).toBe(true);
    });
  });
});

// =============================================================================
// API BUILDER TESTS
// =============================================================================

describe("buildGenerationRequest", () => {
  it("should build request with required fields", () => {
    const request = buildGenerationRequest({
      bookId: "book123",
      content: "Test content",
      cardTypes: ["vocabulary"],
      cardCount: 10,
    });
    expect(request.bookId).toBe("book123");
    expect(request.content).toBe("Test content");
    expect(request.cardTypes).toEqual(["vocabulary"]);
    expect(request.cardCount).toBe(10);
    expect(request.chapterId).toBeUndefined();
    expect(request.sourceOffset).toBeUndefined();
  });

  it("should build request with optional fields", () => {
    const request = buildGenerationRequest({
      bookId: "book123",
      content: "Test content",
      cardTypes: ["vocabulary"],
      cardCount: 10,
      chapterId: "chapter1",
      sourceOffset: 100,
    });
    expect(request.chapterId).toBe("chapter1");
    expect(request.sourceOffset).toBe(100);
  });
});

// =============================================================================
// SUMMARY DISPLAY FUNCTION TESTS
// =============================================================================

describe("formatDuration", () => {
  it("should format milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("should format seconds", () => {
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(3000)).toBe("3s");
  });
});

describe("formatTokenCount", () => {
  it("should format small token counts", () => {
    expect(formatTokenCount(500)).toBe("500");
    expect(formatTokenCount(999)).toBe("999");
  });

  it("should format large token counts with k suffix", () => {
    expect(formatTokenCount(1500)).toBe("1.5k");
    expect(formatTokenCount(10000)).toBe("10.0k");
  });
});

describe("formatCost", () => {
  it("should format small costs with 4 decimals", () => {
    expect(formatCost(0.0001)).toBe("$0.0001");
    expect(formatCost(0.005)).toBe("$0.0050");
  });

  it("should format larger costs with 2 decimals", () => {
    expect(formatCost(0.01)).toBe("$0.01");
    expect(formatCost(1.5)).toBe("$1.50");
  });
});

describe("getSummaryText", () => {
  it("should generate summary text", () => {
    const summary: GenerationSummary = {
      totalCards: 10,
      byType: { vocabulary: 5, concept: 5 },
      averageDifficulty: 3,
      duplicatesRemoved: 2,
      requestedCount: 12,
      generatedCount: 12,
      savedCount: 10,
    };
    const text = getSummaryText(summary);
    expect(text).toContain("10 cards saved");
    expect(text).toContain("2 duplicates removed");
  });

  it("should not include duplicates if zero", () => {
    const summary: GenerationSummary = {
      totalCards: 10,
      byType: {},
      averageDifficulty: 3,
      duplicatesRemoved: 0,
      requestedCount: 10,
      generatedCount: 10,
      savedCount: 10,
    };
    const text = getSummaryText(summary);
    expect(text).not.toContain("duplicates");
  });
});

describe("getTypeBreakdown", () => {
  it("should return sorted breakdown by type", () => {
    const byType = { vocabulary: 3, concept: 7, comprehension: 2 };
    const breakdown = getTypeBreakdown(byType);
    expect(breakdown).toHaveLength(3);
    expect(breakdown[0]?.type).toBe("concept");
    expect(breakdown[0]?.count).toBe(7);
    expect(breakdown[1]?.type).toBe("vocabulary");
    expect(breakdown[1]?.count).toBe(3);
  });

  it("should filter out zero counts", () => {
    const byType = { vocabulary: 5, concept: 0 };
    const breakdown = getTypeBreakdown(byType);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0]?.type).toBe("vocabulary");
  });
});

describe("estimateGenerationTime", () => {
  it("should estimate time for small card counts", () => {
    expect(estimateGenerationTime(3)).toBe("a few seconds");
  });

  it("should estimate time for medium card counts", () => {
    // 10 cards * 3 seconds = 30 seconds, which is >= 30 so returns "under a minute"
    expect(estimateGenerationTime(10)).toBe("under a minute");
  });

  it("should estimate time for larger card counts", () => {
    // 20 cards * 3 seconds = 60 seconds, which is >= 60 so returns "1-2 minutes"
    expect(estimateGenerationTime(20)).toBe("1-2 minutes");
  });

  it("should estimate time for large card counts", () => {
    expect(estimateGenerationTime(30)).toBe("1-2 minutes");
  });
});
