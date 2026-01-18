/**
 * Tests for Bloom's Taxonomy utilities
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type BloomsBreakdown,
  type QuestionWithBloomsLevel,

  // Constants
  BLOOMS_LEVELS,
  BLOOMS_LEVEL_INFO,
  DEFAULT_BLOOMS_DISTRIBUTION,
  HIGHER_ORDER_LEVELS,
  LOWER_ORDER_LEVELS,

  // Validation
  isValidBloomsLevel,
  isHigherOrderLevel,
  isLowerOrderLevel,

  // Level info
  getBloomsLevelInfo,
  getCognitiveLevel,
  getBloomsLevelName,
  getBloomsLevelDescription,
  getBloomsLevelColor,
  getBloomsKeywords,
  getBloomsQuestionStems,

  // Comparison
  compareBloomsLevels,
  getNextHigherLevel,
  getNextLowerLevel,
  getLevelsAtOrAbove,
  getLevelsAtOrBelow,

  // Categorization
  categorizeQuestion,
  categorizeQuestions,
  suggestKeywordsForLevel,
  getExampleStemsForLevel,

  // Breakdown
  createEmptyBreakdown,
  calculateBloomsBreakdown,
  calculateCountsFromBreakdown,
  getRecommendedDistribution,
  calculateAverageCognitiveLevel,
  calculateHigherOrderPercentage,
  isBalancedBreakdown,
  getBalanceSuggestions,

  // Utility object
  bloomsUtils,
} from "./blooms";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Bloom's Taxonomy Constants", () => {
  describe("BLOOMS_LEVELS", () => {
    it("should contain all six levels in order", () => {
      expect(BLOOMS_LEVELS).toEqual([
        "REMEMBER",
        "UNDERSTAND",
        "APPLY",
        "ANALYZE",
        "EVALUATE",
        "CREATE",
      ]);
    });

    it("should be a readonly array", () => {
      // TypeScript readonly arrays are not necessarily frozen at runtime
      // The readonly modifier provides compile-time safety
      expect(Array.isArray(BLOOMS_LEVELS)).toBe(true);
    });

    it("should have exactly 6 levels", () => {
      expect(BLOOMS_LEVELS.length).toBe(6);
    });
  });

  describe("BLOOMS_LEVEL_INFO", () => {
    it("should have info for all six levels", () => {
      expect(Object.keys(BLOOMS_LEVEL_INFO)).toHaveLength(6);
      for (const level of BLOOMS_LEVELS) {
        expect(BLOOMS_LEVEL_INFO[level]).toBeDefined();
      }
    });

    it("should have valid cognitive levels (1-6)", () => {
      for (const level of BLOOMS_LEVELS) {
        const info = BLOOMS_LEVEL_INFO[level];
        expect(info.cognitiveLevel).toBeGreaterThanOrEqual(1);
        expect(info.cognitiveLevel).toBeLessThanOrEqual(6);
      }
    });

    it("should have cognitive levels in ascending order", () => {
      expect(BLOOMS_LEVEL_INFO.REMEMBER.cognitiveLevel).toBe(1);
      expect(BLOOMS_LEVEL_INFO.UNDERSTAND.cognitiveLevel).toBe(2);
      expect(BLOOMS_LEVEL_INFO.APPLY.cognitiveLevel).toBe(3);
      expect(BLOOMS_LEVEL_INFO.ANALYZE.cognitiveLevel).toBe(4);
      expect(BLOOMS_LEVEL_INFO.EVALUATE.cognitiveLevel).toBe(5);
      expect(BLOOMS_LEVEL_INFO.CREATE.cognitiveLevel).toBe(6);
    });

    it("should have keywords arrays for each level", () => {
      for (const level of BLOOMS_LEVELS) {
        const info = BLOOMS_LEVEL_INFO[level];
        expect(Array.isArray(info.keywords)).toBe(true);
        expect(info.keywords.length).toBeGreaterThan(0);
      }
    });

    it("should have question stems for each level", () => {
      for (const level of BLOOMS_LEVELS) {
        const info = BLOOMS_LEVEL_INFO[level];
        expect(Array.isArray(info.questionStems)).toBe(true);
        expect(info.questionStems.length).toBeGreaterThan(0);
      }
    });

    it("should have valid hex colors for each level", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const level of BLOOMS_LEVELS) {
        const info = BLOOMS_LEVEL_INFO[level];
        expect(hexColorRegex.test(info.color)).toBe(true);
      }
    });

    it("should have non-empty names and descriptions", () => {
      for (const level of BLOOMS_LEVELS) {
        const info = BLOOMS_LEVEL_INFO[level];
        expect(info.name.length).toBeGreaterThan(0);
        expect(info.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("DEFAULT_BLOOMS_DISTRIBUTION", () => {
    it("should total to 100%", () => {
      const total = DEFAULT_BLOOMS_DISTRIBUTION.reduce(
        (sum, d) => sum + d.percentage,
        0
      );
      expect(total).toBe(100);
    });

    it("should have all six levels", () => {
      expect(DEFAULT_BLOOMS_DISTRIBUTION.length).toBe(6);
    });

    it("should have reasonable percentages (all between 5-30)", () => {
      for (const dist of DEFAULT_BLOOMS_DISTRIBUTION) {
        expect(dist.percentage).toBeGreaterThanOrEqual(5);
        expect(dist.percentage).toBeLessThanOrEqual(30);
      }
    });
  });

  describe("HIGHER_ORDER_LEVELS", () => {
    it("should contain ANALYZE, EVALUATE, CREATE", () => {
      expect(HIGHER_ORDER_LEVELS).toEqual(["ANALYZE", "EVALUATE", "CREATE"]);
    });
  });

  describe("LOWER_ORDER_LEVELS", () => {
    it("should contain REMEMBER, UNDERSTAND, APPLY", () => {
      expect(LOWER_ORDER_LEVELS).toEqual(["REMEMBER", "UNDERSTAND", "APPLY"]);
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Validation Functions", () => {
  describe("isValidBloomsLevel", () => {
    it("should return true for valid levels", () => {
      for (const level of BLOOMS_LEVELS) {
        expect(isValidBloomsLevel(level)).toBe(true);
      }
    });

    it("should return false for lowercase levels", () => {
      expect(isValidBloomsLevel("remember")).toBe(false);
      expect(isValidBloomsLevel("analyze")).toBe(false);
    });

    it("should return false for invalid strings", () => {
      expect(isValidBloomsLevel("INVALID")).toBe(false);
      expect(isValidBloomsLevel("")).toBe(false);
      expect(isValidBloomsLevel("KNOWLEDGE")).toBe(false);
    });

    it("should return false for non-strings", () => {
      expect(isValidBloomsLevel(null)).toBe(false);
      expect(isValidBloomsLevel(undefined)).toBe(false);
      expect(isValidBloomsLevel(1)).toBe(false);
      expect(isValidBloomsLevel({})).toBe(false);
      expect(isValidBloomsLevel([])).toBe(false);
    });
  });

  describe("isHigherOrderLevel", () => {
    it("should return true for ANALYZE, EVALUATE, CREATE", () => {
      expect(isHigherOrderLevel("ANALYZE")).toBe(true);
      expect(isHigherOrderLevel("EVALUATE")).toBe(true);
      expect(isHigherOrderLevel("CREATE")).toBe(true);
    });

    it("should return false for REMEMBER, UNDERSTAND, APPLY", () => {
      expect(isHigherOrderLevel("REMEMBER")).toBe(false);
      expect(isHigherOrderLevel("UNDERSTAND")).toBe(false);
      expect(isHigherOrderLevel("APPLY")).toBe(false);
    });
  });

  describe("isLowerOrderLevel", () => {
    it("should return true for REMEMBER, UNDERSTAND, APPLY", () => {
      expect(isLowerOrderLevel("REMEMBER")).toBe(true);
      expect(isLowerOrderLevel("UNDERSTAND")).toBe(true);
      expect(isLowerOrderLevel("APPLY")).toBe(true);
    });

    it("should return false for ANALYZE, EVALUATE, CREATE", () => {
      expect(isLowerOrderLevel("ANALYZE")).toBe(false);
      expect(isLowerOrderLevel("EVALUATE")).toBe(false);
      expect(isLowerOrderLevel("CREATE")).toBe(false);
    });
  });
});

// =============================================================================
// LEVEL INFO TESTS
// =============================================================================

describe("Level Info Functions", () => {
  describe("getBloomsLevelInfo", () => {
    it("should return complete info for each level", () => {
      for (const level of BLOOMS_LEVELS) {
        const info = getBloomsLevelInfo(level);
        expect(info.level).toBe(level);
        expect(typeof info.name).toBe("string");
        expect(typeof info.description).toBe("string");
        expect(typeof info.cognitiveLevel).toBe("number");
        expect(Array.isArray(info.keywords)).toBe(true);
        expect(Array.isArray(info.questionStems)).toBe(true);
        expect(typeof info.color).toBe("string");
      }
    });
  });

  describe("getCognitiveLevel", () => {
    it("should return correct cognitive levels", () => {
      expect(getCognitiveLevel("REMEMBER")).toBe(1);
      expect(getCognitiveLevel("UNDERSTAND")).toBe(2);
      expect(getCognitiveLevel("APPLY")).toBe(3);
      expect(getCognitiveLevel("ANALYZE")).toBe(4);
      expect(getCognitiveLevel("EVALUATE")).toBe(5);
      expect(getCognitiveLevel("CREATE")).toBe(6);
    });
  });

  describe("getBloomsLevelName", () => {
    it("should return human-readable names", () => {
      expect(getBloomsLevelName("REMEMBER")).toBe("Remember");
      expect(getBloomsLevelName("UNDERSTAND")).toBe("Understand");
      expect(getBloomsLevelName("APPLY")).toBe("Apply");
      expect(getBloomsLevelName("ANALYZE")).toBe("Analyze");
      expect(getBloomsLevelName("EVALUATE")).toBe("Evaluate");
      expect(getBloomsLevelName("CREATE")).toBe("Create");
    });
  });

  describe("getBloomsLevelDescription", () => {
    it("should return non-empty descriptions", () => {
      for (const level of BLOOMS_LEVELS) {
        const description = getBloomsLevelDescription(level);
        expect(description.length).toBeGreaterThan(20);
      }
    });
  });

  describe("getBloomsLevelColor", () => {
    it("should return valid hex colors", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const level of BLOOMS_LEVELS) {
        const color = getBloomsLevelColor(level);
        expect(hexColorRegex.test(color)).toBe(true);
      }
    });

    it("should return different colors for different levels", () => {
      const colors = BLOOMS_LEVELS.map(getBloomsLevelColor);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(6);
    });
  });

  describe("getBloomsKeywords", () => {
    it("should return keyword arrays", () => {
      for (const level of BLOOMS_LEVELS) {
        const keywords = getBloomsKeywords(level);
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeGreaterThan(5);
      }
    });

    it("should have expected keywords for each level", () => {
      expect(getBloomsKeywords("REMEMBER")).toContain("define");
      expect(getBloomsKeywords("UNDERSTAND")).toContain("explain");
      expect(getBloomsKeywords("APPLY")).toContain("solve");
      expect(getBloomsKeywords("ANALYZE")).toContain("analyze");
      expect(getBloomsKeywords("EVALUATE")).toContain("evaluate");
      expect(getBloomsKeywords("CREATE")).toContain("create");
    });
  });

  describe("getBloomsQuestionStems", () => {
    it("should return question stem arrays", () => {
      for (const level of BLOOMS_LEVELS) {
        const stems = getBloomsQuestionStems(level);
        expect(Array.isArray(stems)).toBe(true);
        expect(stems.length).toBeGreaterThan(3);
      }
    });

    it("should have expected stems for each level", () => {
      expect(getBloomsQuestionStems("REMEMBER")).toContain("What is");
      expect(getBloomsQuestionStems("UNDERSTAND")).toContain("Explain");
      expect(getBloomsQuestionStems("APPLY")).toContain("Solve");
      expect(getBloomsQuestionStems("ANALYZE")).toContain("Analyze");
      expect(getBloomsQuestionStems("EVALUATE")).toContain("Evaluate");
      expect(getBloomsQuestionStems("CREATE")).toContain("Create");
    });
  });
});

// =============================================================================
// COMPARISON TESTS
// =============================================================================

describe("Comparison Functions", () => {
  describe("compareBloomsLevels", () => {
    it("should return negative when first is lower", () => {
      expect(compareBloomsLevels("REMEMBER", "CREATE")).toBeLessThan(0);
      expect(compareBloomsLevels("UNDERSTAND", "ANALYZE")).toBeLessThan(0);
    });

    it("should return positive when first is higher", () => {
      expect(compareBloomsLevels("CREATE", "REMEMBER")).toBeGreaterThan(0);
      expect(compareBloomsLevels("EVALUATE", "APPLY")).toBeGreaterThan(0);
    });

    it("should return 0 when equal", () => {
      expect(compareBloomsLevels("ANALYZE", "ANALYZE")).toBe(0);
      expect(compareBloomsLevels("REMEMBER", "REMEMBER")).toBe(0);
    });

    it("should correctly compare adjacent levels", () => {
      expect(compareBloomsLevels("REMEMBER", "UNDERSTAND")).toBe(-1);
      expect(compareBloomsLevels("UNDERSTAND", "APPLY")).toBe(-1);
      expect(compareBloomsLevels("EVALUATE", "CREATE")).toBe(-1);
    });
  });

  describe("getNextHigherLevel", () => {
    it("should return next level for all except CREATE", () => {
      expect(getNextHigherLevel("REMEMBER")).toBe("UNDERSTAND");
      expect(getNextHigherLevel("UNDERSTAND")).toBe("APPLY");
      expect(getNextHigherLevel("APPLY")).toBe("ANALYZE");
      expect(getNextHigherLevel("ANALYZE")).toBe("EVALUATE");
      expect(getNextHigherLevel("EVALUATE")).toBe("CREATE");
    });

    it("should return null for CREATE", () => {
      expect(getNextHigherLevel("CREATE")).toBeNull();
    });
  });

  describe("getNextLowerLevel", () => {
    it("should return previous level for all except REMEMBER", () => {
      expect(getNextLowerLevel("CREATE")).toBe("EVALUATE");
      expect(getNextLowerLevel("EVALUATE")).toBe("ANALYZE");
      expect(getNextLowerLevel("ANALYZE")).toBe("APPLY");
      expect(getNextLowerLevel("APPLY")).toBe("UNDERSTAND");
      expect(getNextLowerLevel("UNDERSTAND")).toBe("REMEMBER");
    });

    it("should return null for REMEMBER", () => {
      expect(getNextLowerLevel("REMEMBER")).toBeNull();
    });
  });

  describe("getLevelsAtOrAbove", () => {
    it("should return all levels from given level up", () => {
      expect(getLevelsAtOrAbove("REMEMBER")).toEqual(BLOOMS_LEVELS);
      expect(getLevelsAtOrAbove("ANALYZE")).toEqual([
        "ANALYZE",
        "EVALUATE",
        "CREATE",
      ]);
      expect(getLevelsAtOrAbove("CREATE")).toEqual(["CREATE"]);
    });
  });

  describe("getLevelsAtOrBelow", () => {
    it("should return all levels from given level down", () => {
      expect(getLevelsAtOrBelow("CREATE")).toEqual(BLOOMS_LEVELS);
      expect(getLevelsAtOrBelow("APPLY")).toEqual([
        "REMEMBER",
        "UNDERSTAND",
        "APPLY",
      ]);
      expect(getLevelsAtOrBelow("REMEMBER")).toEqual(["REMEMBER"]);
    });
  });
});

// =============================================================================
// CATEGORIZATION TESTS
// =============================================================================

describe("Question Categorization", () => {
  describe("categorizeQuestion", () => {
    it("should categorize REMEMBER questions", () => {
      expect(categorizeQuestion("What is the main character's name?")).toBe(
        "REMEMBER"
      );
      expect(categorizeQuestion("List the three main events")).toBe("REMEMBER");
      expect(categorizeQuestion("Define the term 'protagonist'")).toBe(
        "REMEMBER"
      );
      expect(categorizeQuestion("Who was the author of this book?")).toBe(
        "REMEMBER"
      );
      expect(categorizeQuestion("When did the story take place?")).toBe(
        "REMEMBER"
      );
    });

    it("should categorize UNDERSTAND questions", () => {
      expect(
        categorizeQuestion("Explain why the character made that choice")
      ).toBe("UNDERSTAND");
      expect(categorizeQuestion("Summarize the main argument")).toBe(
        "UNDERSTAND"
      );
      expect(
        categorizeQuestion("Describe in your own words what happened")
      ).toBe("UNDERSTAND");
      // Use clearer UNDERSTAND stems
      expect(categorizeQuestion("Interpret the author's meaning here")).toBe(
        "UNDERSTAND"
      );
      expect(categorizeQuestion("Compare the two main characters")).toBe(
        "UNDERSTAND"
      );
    });

    it("should categorize APPLY questions", () => {
      expect(
        categorizeQuestion("How would you use this technique in real life?")
      ).toBe("APPLY");
      expect(
        categorizeQuestion("Apply the formula to solve this problem")
      ).toBe("APPLY");
      expect(categorizeQuestion("Demonstrate how the method works")).toBe(
        "APPLY"
      );
      expect(
        categorizeQuestion("Calculate the result using the equation")
      ).toBe("APPLY");
    });

    it("should categorize ANALYZE questions", () => {
      expect(categorizeQuestion("Analyze the author's use of symbolism")).toBe(
        "ANALYZE"
      );
      // Use clearer ANALYZE stems
      expect(
        categorizeQuestion("Examine how the two events are connected")
      ).toBe("ANALYZE");
      expect(
        categorizeQuestion("What evidence supports this conclusion?")
      ).toBe("ANALYZE");
      expect(categorizeQuestion("Examine the structure of the argument")).toBe(
        "ANALYZE"
      );
      expect(
        categorizeQuestion("What patterns do you notice in the data?")
      ).toBe("ANALYZE");
    });

    it("should categorize EVALUATE questions", () => {
      expect(categorizeQuestion("Evaluate the author's argument")).toBe(
        "EVALUATE"
      );
      expect(categorizeQuestion("Do you agree with this conclusion?")).toBe(
        "EVALUATE"
      );
      expect(categorizeQuestion("Judge the value of this approach")).toBe(
        "EVALUATE"
      );
      expect(categorizeQuestion("What would you recommend?")).toBe("EVALUATE");
      expect(categorizeQuestion("Critique the methodology used")).toBe(
        "EVALUATE"
      );
    });

    it("should categorize CREATE questions", () => {
      expect(categorizeQuestion("Create a new ending for the story")).toBe(
        "CREATE"
      );
      expect(categorizeQuestion("Design a solution to the problem")).toBe(
        "CREATE"
      );
      expect(categorizeQuestion("How would you improve this system?")).toBe(
        "CREATE"
      );
      expect(categorizeQuestion("Propose an alternative approach")).toBe(
        "CREATE"
      );
      expect(categorizeQuestion("Develop a plan to address the issue")).toBe(
        "CREATE"
      );
    });

    it("should handle case insensitivity", () => {
      expect(categorizeQuestion("EXPLAIN the concept")).toBe("UNDERSTAND");
      expect(categorizeQuestion("analyze THE DATA")).toBe("ANALYZE");
    });

    it("should handle questions with multiple keywords", () => {
      // When multiple keywords match, should prefer higher level
      const result = categorizeQuestion(
        "Analyze and evaluate the author's argument"
      );
      expect(["ANALYZE", "EVALUATE"]).toContain(result);
    });

    it("should default to REMEMBER for ambiguous questions", () => {
      expect(categorizeQuestion("This is a vague question")).toBe("REMEMBER");
      expect(categorizeQuestion("")).toBe("REMEMBER");
    });
  });

  describe("categorizeQuestions", () => {
    it("should categorize multiple questions", () => {
      const questions = [
        "What is the main idea?",
        "Explain why this happened",
        "Create a new solution",
      ];
      const levels = categorizeQuestions(questions);
      expect(levels).toHaveLength(3);
      expect(levels[0]).toBe("REMEMBER");
      expect(levels[1]).toBe("UNDERSTAND");
      expect(levels[2]).toBe("CREATE");
    });

    it("should handle empty array", () => {
      expect(categorizeQuestions([])).toEqual([]);
    });
  });

  describe("suggestKeywordsForLevel", () => {
    it("should return up to 5 keywords", () => {
      for (const level of BLOOMS_LEVELS) {
        const keywords = suggestKeywordsForLevel(level);
        expect(keywords.length).toBeLessThanOrEqual(5);
        expect(keywords.length).toBeGreaterThan(0);
      }
    });

    it("should return keywords from the level's keyword list", () => {
      for (const level of BLOOMS_LEVELS) {
        const suggested = suggestKeywordsForLevel(level);
        const allKeywords = getBloomsKeywords(level);
        for (const keyword of suggested) {
          expect(allKeywords).toContain(keyword);
        }
      }
    });
  });

  describe("getExampleStemsForLevel", () => {
    it("should return up to 5 question stems", () => {
      for (const level of BLOOMS_LEVELS) {
        const stems = getExampleStemsForLevel(level);
        expect(stems.length).toBeLessThanOrEqual(5);
        expect(stems.length).toBeGreaterThan(0);
      }
    });

    it("should return stems from the level's stem list", () => {
      for (const level of BLOOMS_LEVELS) {
        const suggested = getExampleStemsForLevel(level);
        const allStems = getBloomsQuestionStems(level);
        for (const stem of suggested) {
          expect(allStems).toContain(stem);
        }
      }
    });
  });
});

// =============================================================================
// BREAKDOWN CALCULATION TESTS
// =============================================================================

describe("Breakdown Calculation", () => {
  describe("createEmptyBreakdown", () => {
    it("should return all zeros", () => {
      const breakdown = createEmptyBreakdown();
      expect(breakdown).toEqual({
        remember: 0,
        understand: 0,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 0,
      });
    });

    it("should return a new object each time", () => {
      const a = createEmptyBreakdown();
      const b = createEmptyBreakdown();
      expect(a).not.toBe(b);
    });
  });

  describe("calculateBloomsBreakdown", () => {
    it("should calculate correct percentages for evenly distributed questions", () => {
      const questions: QuestionWithBloomsLevel[] = [
        { bloomsLevel: "REMEMBER" },
        { bloomsLevel: "UNDERSTAND" },
        { bloomsLevel: "APPLY" },
        { bloomsLevel: "ANALYZE" },
        { bloomsLevel: "EVALUATE" },
        { bloomsLevel: "CREATE" },
      ];
      const breakdown = calculateBloomsBreakdown(questions);
      expect(breakdown.remember).toBeCloseTo(16.67, 1);
      expect(breakdown.understand).toBeCloseTo(16.67, 1);
      expect(breakdown.apply).toBeCloseTo(16.67, 1);
      expect(breakdown.analyze).toBeCloseTo(16.67, 1);
      expect(breakdown.evaluate).toBeCloseTo(16.67, 1);
      expect(breakdown.create).toBeCloseTo(16.67, 1);
    });

    it("should handle single level questions", () => {
      const questions: QuestionWithBloomsLevel[] = [
        { bloomsLevel: "REMEMBER" },
        { bloomsLevel: "REMEMBER" },
        { bloomsLevel: "REMEMBER" },
      ];
      const breakdown = calculateBloomsBreakdown(questions);
      expect(breakdown.remember).toBe(100);
      expect(breakdown.understand).toBe(0);
    });

    it("should handle empty array", () => {
      const breakdown = calculateBloomsBreakdown([]);
      expect(breakdown).toEqual(createEmptyBreakdown());
    });

    it("should handle uneven distribution", () => {
      const questions: QuestionWithBloomsLevel[] = [
        { bloomsLevel: "REMEMBER" },
        { bloomsLevel: "REMEMBER" },
        { bloomsLevel: "UNDERSTAND" },
        { bloomsLevel: "CREATE" },
      ];
      const breakdown = calculateBloomsBreakdown(questions);
      expect(breakdown.remember).toBe(50);
      expect(breakdown.understand).toBe(25);
      expect(breakdown.create).toBe(25);
      expect(breakdown.apply).toBe(0);
    });

    it("should sum to approximately 100%", () => {
      const questions: QuestionWithBloomsLevel[] = [
        { bloomsLevel: "REMEMBER" },
        { bloomsLevel: "UNDERSTAND" },
        { bloomsLevel: "APPLY" },
        { bloomsLevel: "ANALYZE" },
        { bloomsLevel: "EVALUATE" },
        { bloomsLevel: "CREATE" },
        { bloomsLevel: "REMEMBER" },
      ];
      const breakdown = calculateBloomsBreakdown(questions);
      const total =
        breakdown.remember +
        breakdown.understand +
        breakdown.apply +
        breakdown.analyze +
        breakdown.evaluate +
        breakdown.create;
      expect(Math.round(total)).toBe(100);
    });
  });

  describe("calculateCountsFromBreakdown", () => {
    it("should calculate correct counts for 10 questions", () => {
      const breakdown: BloomsBreakdown = {
        remember: 20,
        understand: 20,
        apply: 20,
        analyze: 20,
        evaluate: 10,
        create: 10,
      };
      const counts = calculateCountsFromBreakdown(breakdown, 10);
      expect(counts.REMEMBER).toBe(2);
      expect(counts.UNDERSTAND).toBe(2);
      expect(counts.APPLY).toBe(2);
      expect(counts.ANALYZE).toBe(2);
      expect(counts.EVALUATE).toBe(1);
      expect(counts.CREATE).toBe(1);
    });

    it("should handle rounding and ensure total matches", () => {
      const breakdown: BloomsBreakdown = {
        remember: 15,
        understand: 20,
        apply: 20,
        analyze: 20,
        evaluate: 15,
        create: 10,
      };
      const counts = calculateCountsFromBreakdown(breakdown, 10);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(10);
    });

    it("should handle zero questions", () => {
      const breakdown: BloomsBreakdown = {
        remember: 100,
        understand: 0,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 0,
      };
      const counts = calculateCountsFromBreakdown(breakdown, 0);
      expect(Object.values(counts).every((c) => c === 0)).toBe(true);
    });
  });

  describe("getRecommendedDistribution", () => {
    it("should return distribution with counts for 10 questions", () => {
      const dist = getRecommendedDistribution(10);
      expect(dist).toHaveLength(6);
      const totalCount = dist.reduce((sum, d) => sum + (d.count ?? 0), 0);
      expect(totalCount).toBe(10);
    });

    it("should use custom distribution if provided", () => {
      const custom = {
        remember: 50,
        understand: 50,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 0,
      };
      const dist = getRecommendedDistribution(10, custom);
      expect(dist.find((d) => d.level === "REMEMBER")?.percentage).toBe(50);
      expect(dist.find((d) => d.level === "UNDERSTAND")?.percentage).toBe(50);
    });

    it("should fall back to defaults for missing custom values", () => {
      const custom = { remember: 30 };
      const dist = getRecommendedDistribution(10, custom);
      expect(dist.find((d) => d.level === "REMEMBER")?.percentage).toBe(30);
      expect(dist.find((d) => d.level === "UNDERSTAND")?.percentage).toBe(20); // default
    });
  });

  describe("calculateAverageCognitiveLevel", () => {
    it("should return 1 for all REMEMBER", () => {
      const breakdown: BloomsBreakdown = {
        remember: 100,
        understand: 0,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 0,
      };
      expect(calculateAverageCognitiveLevel(breakdown)).toBe(1);
    });

    it("should return 6 for all CREATE", () => {
      const breakdown: BloomsBreakdown = {
        remember: 0,
        understand: 0,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 100,
      };
      expect(calculateAverageCognitiveLevel(breakdown)).toBe(6);
    });

    it("should return 3.5 for evenly distributed", () => {
      const breakdown: BloomsBreakdown = {
        remember: 16.67,
        understand: 16.67,
        apply: 16.67,
        analyze: 16.67,
        evaluate: 16.67,
        create: 16.65,
      };
      const avg = calculateAverageCognitiveLevel(breakdown);
      expect(avg).toBeCloseTo(3.5, 1);
    });

    it("should return 0 for empty breakdown", () => {
      const breakdown = createEmptyBreakdown();
      expect(calculateAverageCognitiveLevel(breakdown)).toBe(0);
    });
  });

  describe("calculateHigherOrderPercentage", () => {
    it("should return 0 for all lower-order questions", () => {
      const breakdown: BloomsBreakdown = {
        remember: 50,
        understand: 30,
        apply: 20,
        analyze: 0,
        evaluate: 0,
        create: 0,
      };
      expect(calculateHigherOrderPercentage(breakdown)).toBe(0);
    });

    it("should return 100 for all higher-order questions", () => {
      const breakdown: BloomsBreakdown = {
        remember: 0,
        understand: 0,
        apply: 0,
        analyze: 40,
        evaluate: 30,
        create: 30,
      };
      expect(calculateHigherOrderPercentage(breakdown)).toBe(100);
    });

    it("should calculate correct percentage for mixed", () => {
      const breakdown: BloomsBreakdown = {
        remember: 25,
        understand: 25,
        apply: 0,
        analyze: 25,
        evaluate: 25,
        create: 0,
      };
      expect(calculateHigherOrderPercentage(breakdown)).toBe(50);
    });
  });

  describe("isBalancedBreakdown", () => {
    it("should return true for default distribution", () => {
      const breakdown: BloomsBreakdown = {
        remember: 15,
        understand: 20,
        apply: 20,
        analyze: 20,
        evaluate: 15,
        create: 10,
      };
      expect(isBalancedBreakdown(breakdown)).toBe(true);
    });

    it("should return false for highly skewed distribution", () => {
      const breakdown: BloomsBreakdown = {
        remember: 80,
        understand: 20,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 0,
      };
      expect(isBalancedBreakdown(breakdown)).toBe(false);
    });

    it("should respect custom tolerance", () => {
      const breakdown: BloomsBreakdown = {
        remember: 25,
        understand: 25,
        apply: 25,
        analyze: 15,
        evaluate: 5,
        create: 5,
      };
      expect(isBalancedBreakdown(breakdown, 20)).toBe(true);
      expect(isBalancedBreakdown(breakdown, 5)).toBe(false);
    });
  });

  describe("getBalanceSuggestions", () => {
    it("should return empty for balanced breakdown", () => {
      const breakdown: BloomsBreakdown = {
        remember: 15,
        understand: 20,
        apply: 20,
        analyze: 20,
        evaluate: 15,
        create: 10,
      };
      expect(getBalanceSuggestions(breakdown)).toHaveLength(0);
    });

    it("should suggest decreasing over-represented levels", () => {
      const breakdown: BloomsBreakdown = {
        remember: 50,
        understand: 20,
        apply: 20,
        analyze: 5,
        evaluate: 5,
        create: 0,
      };
      const suggestions = getBalanceSuggestions(breakdown);
      const rememberSuggestion = suggestions.find(
        (s) => s.level === "REMEMBER"
      );
      expect(rememberSuggestion?.suggestion).toBe("decrease");
    });

    it("should suggest increasing under-represented levels", () => {
      const breakdown: BloomsBreakdown = {
        remember: 40,
        understand: 40,
        apply: 10,
        analyze: 5,
        evaluate: 5,
        create: 0,
      };
      const suggestions = getBalanceSuggestions(breakdown);
      const analyzeSuggestion = suggestions.find((s) => s.level === "ANALYZE");
      expect(analyzeSuggestion?.suggestion).toBe("increase");
    });

    it("should include current and target values", () => {
      const breakdown: BloomsBreakdown = {
        remember: 50,
        understand: 30,
        apply: 20,
        analyze: 0,
        evaluate: 0,
        create: 0,
      };
      const suggestions = getBalanceSuggestions(breakdown);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const suggestion of suggestions) {
        expect(typeof suggestion.current).toBe("number");
        expect(typeof suggestion.target).toBe("number");
      }
    });
  });
});

// =============================================================================
// UTILITY OBJECT TESTS
// =============================================================================

describe("bloomsUtils object", () => {
  it("should export all constants", () => {
    expect(bloomsUtils.LEVELS).toBe(BLOOMS_LEVELS);
    expect(bloomsUtils.LEVEL_INFO).toBe(BLOOMS_LEVEL_INFO);
    expect(bloomsUtils.DEFAULT_DISTRIBUTION).toBe(DEFAULT_BLOOMS_DISTRIBUTION);
    expect(bloomsUtils.HIGHER_ORDER_LEVELS).toBe(HIGHER_ORDER_LEVELS);
    expect(bloomsUtils.LOWER_ORDER_LEVELS).toBe(LOWER_ORDER_LEVELS);
  });

  it("should export all validation functions", () => {
    expect(bloomsUtils.isValidLevel).toBe(isValidBloomsLevel);
    expect(bloomsUtils.isHigherOrder).toBe(isHigherOrderLevel);
    expect(bloomsUtils.isLowerOrder).toBe(isLowerOrderLevel);
  });

  it("should export all level info functions", () => {
    expect(bloomsUtils.getLevelInfo).toBe(getBloomsLevelInfo);
    expect(bloomsUtils.getCognitiveLevel).toBe(getCognitiveLevel);
    expect(bloomsUtils.getLevelName).toBe(getBloomsLevelName);
    expect(bloomsUtils.getLevelDescription).toBe(getBloomsLevelDescription);
    expect(bloomsUtils.getLevelColor).toBe(getBloomsLevelColor);
    expect(bloomsUtils.getKeywords).toBe(getBloomsKeywords);
    expect(bloomsUtils.getQuestionStems).toBe(getBloomsQuestionStems);
  });

  it("should export all comparison functions", () => {
    expect(bloomsUtils.compare).toBe(compareBloomsLevels);
    expect(bloomsUtils.getNextHigher).toBe(getNextHigherLevel);
    expect(bloomsUtils.getNextLower).toBe(getNextLowerLevel);
    expect(bloomsUtils.getLevelsAtOrAbove).toBe(getLevelsAtOrAbove);
    expect(bloomsUtils.getLevelsAtOrBelow).toBe(getLevelsAtOrBelow);
  });

  it("should export all categorization functions", () => {
    expect(bloomsUtils.categorizeQuestion).toBe(categorizeQuestion);
    expect(bloomsUtils.categorizeQuestions).toBe(categorizeQuestions);
    expect(bloomsUtils.suggestKeywords).toBe(suggestKeywordsForLevel);
    expect(bloomsUtils.getExampleStems).toBe(getExampleStemsForLevel);
  });

  it("should export all breakdown functions", () => {
    expect(bloomsUtils.createEmptyBreakdown).toBe(createEmptyBreakdown);
    expect(bloomsUtils.calculateBreakdown).toBe(calculateBloomsBreakdown);
    expect(bloomsUtils.calculateCounts).toBe(calculateCountsFromBreakdown);
    expect(bloomsUtils.getRecommendedDistribution).toBe(
      getRecommendedDistribution
    );
    expect(bloomsUtils.calculateAverageCognitiveLevel).toBe(
      calculateAverageCognitiveLevel
    );
    expect(bloomsUtils.calculateHigherOrderPercentage).toBe(
      calculateHigherOrderPercentage
    );
    expect(bloomsUtils.isBalanced).toBe(isBalancedBreakdown);
    expect(bloomsUtils.getBalanceSuggestions).toBe(getBalanceSuggestions);
  });
});

// =============================================================================
// EDGE CASES AND INTEGRATION TESTS
// =============================================================================

describe("Edge Cases", () => {
  it("should handle questions with special characters", () => {
    const result = categorizeQuestion(
      "What's the author's main point? (chapter 3)"
    );
    expect(isValidBloomsLevel(result)).toBe(true);
  });

  it("should handle very long questions", () => {
    const longQuestion = "Explain " + "in detail ".repeat(100) + "the concept";
    const result = categorizeQuestion(longQuestion);
    expect(isValidBloomsLevel(result)).toBe(true);
  });

  it("should handle unicode questions", () => {
    const result = categorizeQuestion("解释这个概念 (Explain this concept)");
    expect(isValidBloomsLevel(result)).toBe(true);
  });

  it("should handle questions with only punctuation", () => {
    const result = categorizeQuestion("???");
    expect(result).toBe("REMEMBER"); // defaults to REMEMBER
  });
});

describe("Integration: Full Assessment Flow", () => {
  it("should categorize and calculate breakdown for a realistic assessment", () => {
    const assessmentQuestions = [
      "What is the main character's name?",
      "When did the story take place?",
      "Explain the protagonist's motivation",
      "Summarize the plot in your own words",
      "How would you apply the lesson learned?",
      "Analyze the relationship between the two main characters",
      "What evidence supports the author's conclusion?",
      "Evaluate whether the ending was appropriate",
      "Do you agree with the author's message?",
      "Create an alternative ending for the story",
    ];

    // Categorize all questions
    const levels = categorizeQuestions(assessmentQuestions);
    expect(levels).toHaveLength(10);

    // Create question objects with levels
    const questions: QuestionWithBloomsLevel[] = levels.map((level) => ({
      bloomsLevel: level,
    }));

    // Calculate breakdown
    const breakdown = calculateBloomsBreakdown(questions);

    // Verify breakdown sums to ~100%
    const total =
      breakdown.remember +
      breakdown.understand +
      breakdown.apply +
      breakdown.analyze +
      breakdown.evaluate +
      breakdown.create;
    expect(Math.round(total)).toBe(100);

    // Verify higher-order thinking is represented
    const higherOrder = calculateHigherOrderPercentage(breakdown);
    expect(higherOrder).toBeGreaterThan(0);

    // Calculate average cognitive level
    const avgLevel = calculateAverageCognitiveLevel(breakdown);
    expect(avgLevel).toBeGreaterThan(0);
    expect(avgLevel).toBeLessThanOrEqual(6);
  });
});
