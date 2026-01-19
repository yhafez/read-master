/**
 * Tests for preReadingGuideTypes
 */

import { describe, it, expect } from "vitest";
import {
  type PreReadingGuideData,
  type PreReadingGuideError,
  type ExpandedSections,
  type GuideSectionId,
  DEFAULT_EXPANDED_SECTIONS,
  createGuideError,
  getGuideErrorMessage,
  parseApiError,
  hasContent,
  countGuideItems,
  getSectionLabel,
  toggleSection,
  expandAllSections,
  collapseAllSections,
} from "./preReadingGuideTypes";

// =============================================================================
// TEST DATA
// =============================================================================

const mockGuideEmpty: PreReadingGuideData = {
  id: "guide-1",
  bookId: "book-1",
  overview: { summary: "", themes: [], targetAudience: "" },
  keyConcepts: [],
  context: {},
  guidingQuestions: [],
  vocabulary: [],
  readingTips: [],
  generatedAt: null,
};

const mockGuideWithContent: PreReadingGuideData = {
  id: "guide-2",
  bookId: "book-2",
  overview: {
    summary: "A gripping tale of adventure.",
    themes: ["courage", "friendship"],
    targetAudience: "Young adults",
  },
  keyConcepts: [
    { term: "Heroism", definition: "Brave action", relevance: "Central theme" },
    {
      term: "Sacrifice",
      definition: "Giving up something",
      relevance: "Character development",
    },
  ],
  context: {
    historicalContext: "Set in the 1800s",
    authorContext: "Written by a famous author",
  },
  guidingQuestions: [
    "What motivates the hero?",
    "How does the setting affect the story?",
  ],
  vocabulary: [
    {
      term: "Protagonist",
      definition: "Main character",
      examples: ["The protagonist was brave."],
    },
    { term: "Antagonist", definition: "Opposing character" },
  ],
  readingTips: ["Take notes as you read.", "Pay attention to dialogue."],
  generatedAt: "2024-01-15T10:00:00Z",
  cached: true,
};

// =============================================================================
// createGuideError TESTS
// =============================================================================

describe("createGuideError", () => {
  it("creates error with default message for network_error", () => {
    const error = createGuideError("network_error");
    expect(error.type).toBe("network_error");
    expect(error.message).toBe(
      "Unable to connect. Please check your internet connection."
    );
    expect(error.retryable).toBe(true);
  });

  it("creates error with default message for not_found", () => {
    const error = createGuideError("not_found");
    expect(error.type).toBe("not_found");
    expect(error.message).toBe("Book not found. It may have been deleted.");
    expect(error.retryable).toBe(false);
  });

  it("creates error with default message for rate_limited", () => {
    const error = createGuideError("rate_limited");
    expect(error.type).toBe("rate_limited");
    expect(error.message).toBe(
      "Too many requests. Please wait a moment and try again."
    );
    expect(error.retryable).toBe(true);
  });

  it("creates error with default message for ai_disabled", () => {
    const error = createGuideError("ai_disabled");
    expect(error.type).toBe("ai_disabled");
    expect(error.message).toBe(
      "AI features are disabled for your account. Enable them in settings."
    );
    expect(error.retryable).toBe(false);
  });

  it("creates error with default message for ai_unavailable", () => {
    const error = createGuideError("ai_unavailable");
    expect(error.type).toBe("ai_unavailable");
    expect(error.message).toBe(
      "AI service is temporarily unavailable. Please try again later."
    );
    expect(error.retryable).toBe(true);
  });

  it("creates error with default message for generation_failed", () => {
    const error = createGuideError("generation_failed");
    expect(error.type).toBe("generation_failed");
    expect(error.message).toBe("Failed to generate guide. Please try again.");
    expect(error.retryable).toBe(true);
  });

  it("creates error with default message for unknown", () => {
    const error = createGuideError("unknown");
    expect(error.type).toBe("unknown");
    expect(error.message).toBe(
      "An unexpected error occurred. Please try again."
    );
    expect(error.retryable).toBe(false);
  });

  it("allows custom message override", () => {
    const error = createGuideError("network_error", "Custom network message");
    expect(error.type).toBe("network_error");
    expect(error.message).toBe("Custom network message");
    expect(error.retryable).toBe(true);
  });

  it("marks retryable errors correctly", () => {
    const retryableTypes: Array<PreReadingGuideError["type"]> = [
      "network_error",
      "rate_limited",
      "ai_unavailable",
      "generation_failed",
    ];
    const nonRetryableTypes: Array<PreReadingGuideError["type"]> = [
      "not_found",
      "ai_disabled",
      "unknown",
    ];

    retryableTypes.forEach((type) => {
      expect(createGuideError(type).retryable).toBe(true);
    });

    nonRetryableTypes.forEach((type) => {
      expect(createGuideError(type).retryable).toBe(false);
    });
  });
});

// =============================================================================
// getGuideErrorMessage TESTS
// =============================================================================

describe("getGuideErrorMessage", () => {
  it("returns the error message", () => {
    const error = createGuideError("network_error");
    expect(getGuideErrorMessage(error)).toBe(error.message);
  });

  it("returns custom message if provided", () => {
    const error = createGuideError("unknown", "Custom error message");
    expect(getGuideErrorMessage(error)).toBe("Custom error message");
  });
});

// =============================================================================
// parseApiError TESTS
// =============================================================================

describe("parseApiError", () => {
  it("returns not_found for 404", () => {
    const error = parseApiError(404);
    expect(error.type).toBe("not_found");
  });

  it("returns rate_limited for 429", () => {
    const error = parseApiError(429);
    expect(error.type).toBe("rate_limited");
  });

  it("returns rate_limited with custom message for 429", () => {
    const error = parseApiError(429, undefined, "Slow down!");
    expect(error.type).toBe("rate_limited");
    expect(error.message).toBe("Slow down!");
  });

  it("returns ai_disabled for 403 with AI-related message", () => {
    const error = parseApiError(403, "AI_DISABLED", "AI features disabled");
    expect(error.type).toBe("ai_disabled");
  });

  it("returns ai_disabled for 403 with AI in message", () => {
    const error = parseApiError(403, undefined, "AI not enabled");
    expect(error.type).toBe("ai_disabled");
  });

  it("returns unknown for 403 without AI context", () => {
    const error = parseApiError(403, undefined, "Forbidden");
    expect(error.type).toBe("unknown");
  });

  it("returns ai_unavailable for 503", () => {
    const error = parseApiError(503);
    expect(error.type).toBe("ai_unavailable");
  });

  it("returns generation_failed for 500", () => {
    const error = parseApiError(500);
    expect(error.type).toBe("generation_failed");
  });

  it("returns generation_failed for other 5xx errors", () => {
    const error = parseApiError(502);
    expect(error.type).toBe("generation_failed");
  });

  it("returns network_error for status 0", () => {
    const error = parseApiError(0);
    expect(error.type).toBe("network_error");
  });

  it("returns unknown for other status codes", () => {
    const error = parseApiError(400);
    expect(error.type).toBe("unknown");
  });

  it("preserves custom error message", () => {
    const error = parseApiError(400, undefined, "Bad request details");
    expect(error.message).toBe("Bad request details");
  });
});

// =============================================================================
// hasContent TESTS
// =============================================================================

describe("hasContent", () => {
  it("returns false for null", () => {
    expect(hasContent(null)).toBe(false);
  });

  it("returns false for guide with empty content", () => {
    expect(hasContent(mockGuideEmpty)).toBe(false);
  });

  it("returns true for guide with summary", () => {
    expect(hasContent(mockGuideWithContent)).toBe(true);
  });

  it("returns true for guide with only vocabulary", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      vocabulary: [{ term: "test", definition: "def" }],
    };
    expect(hasContent(guide)).toBe(true);
  });

  it("returns true for guide with only key concepts", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      keyConcepts: [{ term: "test", definition: "def", relevance: "rel" }],
    };
    expect(hasContent(guide)).toBe(true);
  });

  it("returns true for guide with only guiding questions", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      guidingQuestions: ["Question?"],
    };
    expect(hasContent(guide)).toBe(true);
  });

  it("returns true for guide with only reading tips", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      readingTips: ["Tip 1"],
    };
    expect(hasContent(guide)).toBe(true);
  });
});

// =============================================================================
// countGuideItems TESTS
// =============================================================================

describe("countGuideItems", () => {
  it("returns 0 for null", () => {
    expect(countGuideItems(null)).toBe(0);
  });

  it("returns 0 for empty guide", () => {
    expect(countGuideItems(mockGuideEmpty)).toBe(0);
  });

  it("counts all items correctly", () => {
    // 2 vocabulary + 2 keyConcepts + 2 questions + 2 tips = 8
    expect(countGuideItems(mockGuideWithContent)).toBe(8);
  });

  it("handles missing arrays", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      vocabulary: undefined as unknown as [],
      keyConcepts: undefined as unknown as [],
    };
    expect(countGuideItems(guide)).toBe(0);
  });
});

// =============================================================================
// getSectionLabel TESTS
// =============================================================================

describe("getSectionLabel", () => {
  it("returns correct label for overview", () => {
    expect(getSectionLabel("overview")).toBe("Overview");
  });

  it("returns correct label for vocabulary", () => {
    expect(getSectionLabel("vocabulary")).toBe("Vocabulary");
  });

  it("returns correct label for keyConcepts", () => {
    expect(getSectionLabel("keyConcepts")).toBe("Key Concepts");
  });

  it("returns correct label for context", () => {
    expect(getSectionLabel("context")).toBe("Context");
  });

  it("returns correct label for guidingQuestions", () => {
    expect(getSectionLabel("guidingQuestions")).toBe("Guiding Questions");
  });

  it("returns correct label for readingTips", () => {
    expect(getSectionLabel("readingTips")).toBe("Reading Tips");
  });
});

// =============================================================================
// toggleSection TESTS
// =============================================================================

describe("toggleSection", () => {
  it("toggles section from false to true", () => {
    const initial: ExpandedSections = {
      overview: false,
      vocabulary: false,
      keyConcepts: false,
      context: false,
      guidingQuestions: false,
      readingTips: false,
    };
    const result = toggleSection(initial, "overview");
    expect(result.overview).toBe(true);
    expect(result.vocabulary).toBe(false);
  });

  it("toggles section from true to false", () => {
    const initial: ExpandedSections = {
      overview: true,
      vocabulary: true,
      keyConcepts: false,
      context: false,
      guidingQuestions: false,
      readingTips: false,
    };
    const result = toggleSection(initial, "overview");
    expect(result.overview).toBe(false);
    expect(result.vocabulary).toBe(true);
  });

  it("preserves other sections", () => {
    const result = toggleSection(DEFAULT_EXPANDED_SECTIONS, "keyConcepts");
    expect(result.overview).toBe(true);
    expect(result.vocabulary).toBe(true);
    expect(result.keyConcepts).toBe(true); // was false, now true
    expect(result.context).toBe(false);
    expect(result.guidingQuestions).toBe(false);
    expect(result.readingTips).toBe(false);
  });

  it("returns new object (immutable)", () => {
    const initial = { ...DEFAULT_EXPANDED_SECTIONS };
    const result = toggleSection(initial, "overview");
    expect(result).not.toBe(initial);
  });
});

// =============================================================================
// expandAllSections TESTS
// =============================================================================

describe("expandAllSections", () => {
  it("returns all sections expanded", () => {
    const result = expandAllSections();
    expect(result.overview).toBe(true);
    expect(result.vocabulary).toBe(true);
    expect(result.keyConcepts).toBe(true);
    expect(result.context).toBe(true);
    expect(result.guidingQuestions).toBe(true);
    expect(result.readingTips).toBe(true);
  });

  it("returns new object each time", () => {
    const result1 = expandAllSections();
    const result2 = expandAllSections();
    expect(result1).not.toBe(result2);
  });
});

// =============================================================================
// collapseAllSections TESTS
// =============================================================================

describe("collapseAllSections", () => {
  it("returns all sections collapsed except overview", () => {
    const result = collapseAllSections();
    expect(result.overview).toBe(true);
    expect(result.vocabulary).toBe(false);
    expect(result.keyConcepts).toBe(false);
    expect(result.context).toBe(false);
    expect(result.guidingQuestions).toBe(false);
    expect(result.readingTips).toBe(false);
  });

  it("returns new object each time", () => {
    const result1 = collapseAllSections();
    const result2 = collapseAllSections();
    expect(result1).not.toBe(result2);
  });
});

// =============================================================================
// DEFAULT_EXPANDED_SECTIONS TESTS
// =============================================================================

describe("DEFAULT_EXPANDED_SECTIONS", () => {
  it("has overview expanded by default", () => {
    expect(DEFAULT_EXPANDED_SECTIONS.overview).toBe(true);
  });

  it("has vocabulary expanded by default", () => {
    expect(DEFAULT_EXPANDED_SECTIONS.vocabulary).toBe(true);
  });

  it("has keyConcepts collapsed by default", () => {
    expect(DEFAULT_EXPANDED_SECTIONS.keyConcepts).toBe(false);
  });

  it("has context collapsed by default", () => {
    expect(DEFAULT_EXPANDED_SECTIONS.context).toBe(false);
  });

  it("has guidingQuestions collapsed by default", () => {
    expect(DEFAULT_EXPANDED_SECTIONS.guidingQuestions).toBe(false);
  });

  it("has readingTips collapsed by default", () => {
    expect(DEFAULT_EXPANDED_SECTIONS.readingTips).toBe(false);
  });

  it("contains all section IDs", () => {
    const sectionIds: GuideSectionId[] = [
      "overview",
      "vocabulary",
      "keyConcepts",
      "context",
      "guidingQuestions",
      "readingTips",
    ];
    sectionIds.forEach((id) => {
      expect(typeof DEFAULT_EXPANDED_SECTIONS[id]).toBe("boolean");
    });
  });
});

// =============================================================================
// TYPE EXPORTS TESTS
// =============================================================================

describe("Type exports", () => {
  it("exports PreReadingGuideData type correctly", () => {
    const data: PreReadingGuideData = mockGuideWithContent;
    expect(data.id).toBeDefined();
    expect(data.bookId).toBeDefined();
    expect(data.overview).toBeDefined();
  });

  it("exports VocabularyItem type correctly", () => {
    const item = mockGuideWithContent.vocabulary[0];
    expect(item?.term).toBeDefined();
    expect(item?.definition).toBeDefined();
  });

  it("exports KeyConcept type correctly", () => {
    const concept = mockGuideWithContent.keyConcepts[0];
    expect(concept?.term).toBeDefined();
    expect(concept?.definition).toBeDefined();
    expect(concept?.relevance).toBeDefined();
  });

  it("exports GuideOverview type correctly", () => {
    const overview = mockGuideWithContent.overview;
    expect(overview.summary).toBeDefined();
    expect(overview.themes).toBeDefined();
    expect(overview.targetAudience).toBeDefined();
  });

  it("exports GuideContext type correctly", () => {
    const context = mockGuideWithContent.context;
    expect(typeof context.historicalContext === "string").toBe(true);
    expect(typeof context.authorContext === "string").toBe(true);
  });

  it("exports GuideSectionId type correctly", () => {
    const id: GuideSectionId = "overview";
    expect(id).toBe("overview");
  });

  it("exports ExpandedSections type correctly", () => {
    const sections: ExpandedSections = DEFAULT_EXPANDED_SECTIONS;
    expect(sections.overview).toBeDefined();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge cases", () => {
  it("handles guide with empty arrays", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      overview: { summary: "Summary", themes: [], targetAudience: "" },
    };
    expect(hasContent(guide)).toBe(true);
    expect(countGuideItems(guide)).toBe(0);
  });

  it("handles guide with whitespace-only summary", () => {
    const guide: PreReadingGuideData = {
      ...mockGuideEmpty,
      overview: { summary: "   ", themes: [], targetAudience: "" },
    };
    // Whitespace is truthy in JavaScript
    expect(hasContent(guide)).toBe(true);
  });

  it("toggleSection handles all section IDs", () => {
    const sectionIds: GuideSectionId[] = [
      "overview",
      "vocabulary",
      "keyConcepts",
      "context",
      "guidingQuestions",
      "readingTips",
    ];

    sectionIds.forEach((id) => {
      const result = toggleSection(collapseAllSections(), id);
      // Overview is already true, so toggling makes it false
      // Other sections are false, so toggling makes them true
      if (id === "overview") {
        expect(result[id]).toBe(false);
      } else {
        expect(result[id]).toBe(true);
      }
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Integration scenarios", () => {
  it("full workflow: create error, get message, check retryable", () => {
    const error = parseApiError(503, undefined, "Service overloaded");
    expect(error.type).toBe("ai_unavailable");
    expect(getGuideErrorMessage(error)).toBe("Service overloaded");
    expect(error.retryable).toBe(true);
  });

  it("full workflow: check content and count", () => {
    expect(hasContent(mockGuideWithContent)).toBe(true);
    expect(countGuideItems(mockGuideWithContent)).toBe(8);
  });

  it("full workflow: expand, toggle, collapse", () => {
    let sections = collapseAllSections();
    expect(sections.vocabulary).toBe(false);

    sections = toggleSection(sections, "vocabulary");
    expect(sections.vocabulary).toBe(true);

    sections = expandAllSections();
    expect(sections.vocabulary).toBe(true);
    expect(sections.keyConcepts).toBe(true);

    sections = collapseAllSections();
    expect(sections.vocabulary).toBe(false);
    expect(sections.overview).toBe(true); // Overview stays expanded
  });
});
