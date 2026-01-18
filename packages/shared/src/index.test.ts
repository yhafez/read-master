/**
 * Tests for main index.ts exports
 *
 * Verifies that all exports from the main entry point work correctly
 * and that there are no circular dependencies.
 */

import { describe, expect, it } from "vitest";

// Import from the main entry point
import * as sharedExports from "./index";

describe("Main index.ts exports", () => {
  describe("Utility exports", () => {
    describe("String utilities", () => {
      it("should export truncate function", () => {
        expect(typeof sharedExports.truncate).toBe("function");
        expect(sharedExports.truncate("hello world", 5)).toBe("he...");
      });

      it("should export slugify function", () => {
        expect(typeof sharedExports.slugify).toBe("function");
        expect(sharedExports.slugify("Hello World")).toBe("hello-world");
      });

      it("should export toTitleCase function", () => {
        expect(typeof sharedExports.toTitleCase).toBe("function");
        expect(sharedExports.toTitleCase("hello world")).toBe("Hello World");
      });
    });

    describe("Moderation utilities", () => {
      it("should export containsProfanity function", () => {
        expect(typeof sharedExports.containsProfanity).toBe("function");
        expect(sharedExports.containsProfanity("hello")).toBe(false);
      });

      it("should export validateNoProfanity function", () => {
        expect(typeof sharedExports.validateNoProfanity).toBe("function");
        const result = sharedExports.validateNoProfanity("hello", "text");
        expect(result.valid).toBe(true);
      });

      it("should export validateFieldsNoProfanity function", () => {
        expect(typeof sharedExports.validateFieldsNoProfanity).toBe("function");
      });
    });

    describe("SRS utilities", () => {
      it("should export calculateNextReview function", () => {
        expect(typeof sharedExports.calculateNextReview).toBe("function");
      });

      it("should export createDefaultSrsState function", () => {
        expect(typeof sharedExports.createDefaultSrsState).toBe("function");
        const state = sharedExports.createDefaultSrsState();
        expect(state.easeFactor).toBe(2.5);
        expect(state.interval).toBe(0);
        expect(state.repetitions).toBe(0);
      });

      it("should export formatInterval function", () => {
        expect(typeof sharedExports.formatInterval).toBe("function");
        expect(sharedExports.formatInterval(1)).toBe("1 day");
        expect(sharedExports.formatInterval(7)).toBe("1 week");
      });

      it("should export SM2_CONSTANTS", () => {
        expect(sharedExports.SM2_CONSTANTS).toBeDefined();
        expect(sharedExports.SM2_CONSTANTS.MIN_EASE_FACTOR).toBe(1.3);
      });
    });

    describe("Date utilities", () => {
      it("should export formatRelativeTime function", () => {
        expect(typeof sharedExports.formatRelativeTime).toBe("function");
      });

      it("should export timeAgo function", () => {
        expect(typeof sharedExports.timeAgo).toBe("function");
      });

      it("should export formatDuration function", () => {
        expect(typeof sharedExports.formatDuration).toBe("function");
        expect(sharedExports.formatDuration(3661)).toBe("1h 1m 1s");
      });

      it("should export nowUTC function", () => {
        expect(typeof sharedExports.nowUTC).toBe("function");
        const date = sharedExports.nowUTC();
        expect(date).toBeInstanceOf(Date);
      });

      it("should export dateUtils object", () => {
        expect(sharedExports.dateUtils).toBeDefined();
        expect(typeof sharedExports.dateUtils.nowUTC).toBe("function");
      });
    });

    describe("Bloom's Taxonomy utilities", () => {
      it("should export categorizeQuestion function", () => {
        expect(typeof sharedExports.categorizeQuestion).toBe("function");
        const result = sharedExports.categorizeQuestion(
          "What is the main idea?"
        );
        expect(result).toBeDefined();
      });

      it("should export calculateBloomsBreakdown function", () => {
        expect(typeof sharedExports.calculateBloomsBreakdown).toBe("function");
      });

      it("should export BLOOMS_LEVELS constant", () => {
        expect(sharedExports.BLOOMS_LEVELS).toBeDefined();
        expect(sharedExports.BLOOMS_LEVELS).toHaveLength(6);
      });

      it("should export bloomsUtils object", () => {
        expect(sharedExports.bloomsUtils).toBeDefined();
      });
    });

    describe("Lexile utilities", () => {
      it("should export estimateTextDifficulty function", () => {
        expect(typeof sharedExports.estimateTextDifficulty).toBe("function");
      });

      it("should export getReadingLevelRecommendation function", () => {
        expect(typeof sharedExports.getReadingLevelRecommendation).toBe(
          "function"
        );
        const rec = sharedExports.getReadingLevelRecommendation(5);
        expect(rec.minLexile).toBeDefined();
        expect(rec.maxLexile).toBeDefined();
      });

      it("should export lexileUtils object", () => {
        expect(sharedExports.lexileUtils).toBeDefined();
      });
    });
  });

  describe("Schema exports", () => {
    describe("Book schemas", () => {
      it("should export createBookUploadSchema", () => {
        expect(sharedExports.createBookUploadSchema).toBeDefined();
        expect(sharedExports.createBookUploadSchema.parse).toBeDefined();
      });

      it("should export bookQuerySchema", () => {
        expect(sharedExports.bookQuerySchema).toBeDefined();
      });

      it("should export bookSchemas collection", () => {
        expect(sharedExports.bookSchemas).toBeDefined();
        expect(sharedExports.bookSchemas.createUpload).toBeDefined();
        expect(sharedExports.bookSchemas.query).toBeDefined();
      });
    });

    describe("Annotation schemas", () => {
      it("should export createAnnotationSchema", () => {
        expect(sharedExports.createAnnotationSchema).toBeDefined();
      });

      it("should export annotationSchemas collection", () => {
        expect(sharedExports.annotationSchemas).toBeDefined();
      });
    });

    describe("Flashcard schemas", () => {
      it("should export createFlashcardSchema", () => {
        expect(sharedExports.createFlashcardSchema).toBeDefined();
      });

      it("should export reviewFlashcardSchema", () => {
        expect(sharedExports.reviewFlashcardSchema).toBeDefined();
      });

      it("should export flashcardSchemas collection", () => {
        expect(sharedExports.flashcardSchemas).toBeDefined();
      });
    });

    describe("Forum schemas", () => {
      it("should export createForumPostSchema", () => {
        expect(sharedExports.createForumPostSchema).toBeDefined();
      });

      it("should export forumSchemas collection", () => {
        expect(sharedExports.forumSchemas).toBeDefined();
      });
    });

    describe("Assessment schemas", () => {
      it("should export generateAssessmentSchema", () => {
        expect(sharedExports.generateAssessmentSchema).toBeDefined();
      });

      it("should export assessmentSchemas collection", () => {
        expect(sharedExports.assessmentSchemas).toBeDefined();
      });
    });

    describe("Curriculum schemas", () => {
      it("should export createCurriculumSchema", () => {
        expect(sharedExports.createCurriculumSchema).toBeDefined();
      });

      it("should export curriculumSchemas collection", () => {
        expect(sharedExports.curriculumSchemas).toBeDefined();
      });
    });
  });

  describe("Constants exports", () => {
    describe("Tier limits", () => {
      it("should export TIER_LIMITS", () => {
        expect(sharedExports.TIER_LIMITS).toBeDefined();
        expect(sharedExports.TIER_LIMITS.FREE).toBeDefined();
        expect(sharedExports.TIER_LIMITS.PRO).toBeDefined();
        expect(sharedExports.TIER_LIMITS.SCHOLAR).toBeDefined();
      });

      it("should export getTierLimits function", () => {
        expect(typeof sharedExports.getTierLimits).toBe("function");
        const limits = sharedExports.getTierLimits("FREE");
        expect(limits.maxBooks).toBe(3);
      });

      it("should export canPerformAction function", () => {
        expect(typeof sharedExports.canPerformAction).toBe("function");
      });

      it("should export limitUtils object", () => {
        expect(sharedExports.limitUtils).toBeDefined();
      });
    });

    describe("Achievements", () => {
      it("should export ACHIEVEMENTS array", () => {
        expect(sharedExports.ACHIEVEMENTS).toBeDefined();
        expect(Array.isArray(sharedExports.ACHIEVEMENTS)).toBe(true);
        expect(sharedExports.ACHIEVEMENTS.length).toBeGreaterThan(0);
      });

      it("should export calculateLevel function", () => {
        expect(typeof sharedExports.calculateLevel).toBe("function");
        const level0 = sharedExports.calculateLevel(0);
        expect(level0.level).toBe(1);
        // Higher XP should result in higher level
        const levelHigh = sharedExports.calculateLevel(5000);
        expect(levelHigh.level).toBeGreaterThan(1);
      });

      it("should export checkAchievementCriteria function", () => {
        expect(typeof sharedExports.checkAchievementCriteria).toBe("function");
      });

      it("should export XP_REWARDS", () => {
        expect(sharedExports.XP_REWARDS).toBeDefined();
        expect(sharedExports.XP_REWARDS.BOOK_COMPLETED).toBe(100);
      });

      it("should export achievementUtils object", () => {
        expect(sharedExports.achievementUtils).toBeDefined();
      });
    });

    describe("Languages", () => {
      it("should export SUPPORTED_LANGUAGES array", () => {
        expect(sharedExports.SUPPORTED_LANGUAGES).toBeDefined();
        expect(Array.isArray(sharedExports.SUPPORTED_LANGUAGES)).toBe(true);
        expect(sharedExports.SUPPORTED_LANGUAGES.length).toBe(6);
      });

      it("should export isRtlLanguage function", () => {
        expect(typeof sharedExports.isRtlLanguage).toBe("function");
        expect(sharedExports.isRtlLanguage("ar")).toBe(true);
        expect(sharedExports.isRtlLanguage("en")).toBe(false);
      });

      it("should export getLanguageInfo function", () => {
        expect(typeof sharedExports.getLanguageInfo).toBe("function");
        const info = sharedExports.getLanguageInfo("en");
        expect(info?.englishName).toBe("English");
      });

      it("should export languageUtils object", () => {
        expect(sharedExports.languageUtils).toBeDefined();
      });
    });
  });

  describe("Circular dependency check", () => {
    it("should import without errors (no circular dependencies)", () => {
      // If we got here, the import succeeded without circular dependency issues
      expect(Object.keys(sharedExports).length).toBeGreaterThan(0);
    });
  });

  describe("Export counts", () => {
    it("should export a comprehensive set of utilities, schemas, and constants", () => {
      const exports = Object.keys(sharedExports);

      // Count different categories
      const schemas = exports.filter(
        (e) => e.includes("Schema") || e.includes("schema")
      );
      const utils = exports.filter(
        (e) => e.includes("Utils") || e.includes("utils")
      );
      const functions = exports.filter(
        (e) =>
          typeof (sharedExports as Record<string, unknown>)[e] === "function"
      );

      // Verify we have substantial exports
      expect(schemas.length).toBeGreaterThan(10);
      expect(utils.length).toBeGreaterThan(3);
      expect(functions.length).toBeGreaterThan(20);

      // Total exports should be significant
      expect(exports.length).toBeGreaterThan(100);
    });
  });
});
