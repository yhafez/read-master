/**
 * Advanced Reading Types Tests
 *
 * Comprehensive test suite for advanced reading utilities:
 * - RSVP (Rapid Serial Visual Presentation)
 * - Focus mode
 * - Bionic reading
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type AdvancedReadingMode,
  type RSVPConfig,
  type FocusModeConfig,
  type BionicReadingConfig,
  type RSVPState,
  // Constants
  WPM_RANGE,
  DEFAULT_RSVP_CONFIG,
  DEFAULT_FOCUS_CONFIG,
  DEFAULT_BIONIC_CONFIG,
  INITIAL_RSVP_STATE,
  PUNCTUATION_MARKS,
  LONG_WORD_THRESHOLD,
  // Functions
  calculateWordDisplayTime,
  splitIntoWords,
  groupWordsForRSVP,
  findORP,
  applyBionicFormatting,
  transformToBionic,
  validateWPM,
  formatWPM,
  calculateEstimatedTime,
  formatReadingTime,
  calculateRSVPProgress,
  isSentenceEnd,
  getLineHeightPx,
  calculateFocusOverlay,
} from "./advancedReadingTypes";

describe("advancedReadingTypes", () => {
  // ===========================================
  // Constants Tests
  // ===========================================

  describe("Constants", () => {
    describe("WPM_RANGE", () => {
      it("should have correct min value", () => {
        expect(WPM_RANGE.min).toBe(100);
      });

      it("should have correct max value", () => {
        expect(WPM_RANGE.max).toBe(1000);
      });

      it("should have correct default value", () => {
        expect(WPM_RANGE.default).toBe(300);
      });

      it("should have correct step value", () => {
        expect(WPM_RANGE.step).toBe(25);
      });

      it("default should be within range", () => {
        expect(WPM_RANGE.default).toBeGreaterThanOrEqual(WPM_RANGE.min);
        expect(WPM_RANGE.default).toBeLessThanOrEqual(WPM_RANGE.max);
      });
    });

    describe("DEFAULT_RSVP_CONFIG", () => {
      it("should have correct wpm", () => {
        expect(DEFAULT_RSVP_CONFIG.wpm).toBe(300);
      });

      it("should have pauseOnPunctuation enabled", () => {
        expect(DEFAULT_RSVP_CONFIG.pauseOnPunctuation).toBe(true);
      });

      it("should have correct punctuation pause multiplier", () => {
        expect(DEFAULT_RSVP_CONFIG.punctuationPauseMultiplier).toBe(2.0);
      });

      it("should have correct long word pause multiplier", () => {
        expect(DEFAULT_RSVP_CONFIG.longWordPauseMultiplier).toBe(1.5);
      });

      it("should have wordsPerFlash set to 1", () => {
        expect(DEFAULT_RSVP_CONFIG.wordsPerFlash).toBe(1);
      });
    });

    describe("DEFAULT_FOCUS_CONFIG", () => {
      it("should have correct overlay opacity", () => {
        expect(DEFAULT_FOCUS_CONFIG.overlayOpacity).toBe(0.7);
      });

      it("should have correct visible lines", () => {
        expect(DEFAULT_FOCUS_CONFIG.visibleLines).toBe(1);
      });

      it("should have autoFollow enabled", () => {
        expect(DEFAULT_FOCUS_CONFIG.autoFollow).toBe(true);
      });
    });

    describe("DEFAULT_BIONIC_CONFIG", () => {
      it("should have correct bold percentage", () => {
        expect(DEFAULT_BIONIC_CONFIG.boldPercentage).toBe(0.4);
      });

      it("should have correct min bold chars", () => {
        expect(DEFAULT_BIONIC_CONFIG.minBoldChars).toBe(1);
      });

      it("should have boldShortWords enabled", () => {
        expect(DEFAULT_BIONIC_CONFIG.boldShortWords).toBe(true);
      });
    });

    describe("INITIAL_RSVP_STATE", () => {
      it("should have empty current word", () => {
        expect(INITIAL_RSVP_STATE.currentWord).toBe("");
      });

      it("should start at index 0", () => {
        expect(INITIAL_RSVP_STATE.currentIndex).toBe(0);
      });

      it("should have 0 total words", () => {
        expect(INITIAL_RSVP_STATE.totalWords).toBe(0);
      });

      it("should not be playing", () => {
        expect(INITIAL_RSVP_STATE.isPlaying).toBe(false);
      });

      it("should not be complete", () => {
        expect(INITIAL_RSVP_STATE.isComplete).toBe(false);
      });

      it("should have 0 progress", () => {
        expect(INITIAL_RSVP_STATE.progress).toBe(0);
      });
    });

    describe("PUNCTUATION_MARKS", () => {
      it("should match period at end", () => {
        expect(PUNCTUATION_MARKS.test("word.")).toBe(true);
      });

      it("should match exclamation at end", () => {
        expect(PUNCTUATION_MARKS.test("word!")).toBe(true);
      });

      it("should match question mark at end", () => {
        expect(PUNCTUATION_MARKS.test("word?")).toBe(true);
      });

      it("should match semicolon at end", () => {
        expect(PUNCTUATION_MARKS.test("word;")).toBe(true);
      });

      it("should match colon at end", () => {
        expect(PUNCTUATION_MARKS.test("word:")).toBe(true);
      });

      it("should match comma at end", () => {
        expect(PUNCTUATION_MARKS.test("word,")).toBe(true);
      });

      it("should not match punctuation in middle", () => {
        expect(PUNCTUATION_MARKS.test("wo.rd")).toBe(false);
      });

      it("should not match words without punctuation", () => {
        expect(PUNCTUATION_MARKS.test("word")).toBe(false);
      });
    });

    describe("LONG_WORD_THRESHOLD", () => {
      it("should be 8 characters", () => {
        expect(LONG_WORD_THRESHOLD).toBe(8);
      });
    });
  });

  // ===========================================
  // RSVP Functions Tests
  // ===========================================

  describe("RSVP Functions", () => {
    describe("calculateWordDisplayTime", () => {
      const baseConfig: RSVPConfig = {
        wpm: 300,
        pauseOnPunctuation: true,
        punctuationPauseMultiplier: 2.0,
        longWordPauseMultiplier: 1.5,
        wordsPerFlash: 1,
      };

      it("should calculate base time for simple word", () => {
        const time = calculateWordDisplayTime("hello", baseConfig);
        // At 300 WPM, base time = 60000ms / 300 = 200ms
        expect(time).toBe(200);
      });

      it("should add pause for punctuation", () => {
        const time = calculateWordDisplayTime("hello.", baseConfig);
        // 200ms * 2.0 = 400ms
        expect(time).toBe(400);
      });

      it("should add pause for long words", () => {
        const time = calculateWordDisplayTime("comprehension", baseConfig);
        // "comprehension" is 13 chars (> 8), so 200ms * 1.5 = 300ms
        expect(time).toBe(300);
      });

      it("should not pause on punctuation when disabled", () => {
        const config = { ...baseConfig, pauseOnPunctuation: false };
        const time = calculateWordDisplayTime("hello.", config);
        expect(time).toBe(200);
      });

      it("should calculate correctly at different WPM", () => {
        const config = { ...baseConfig, wpm: 600 };
        const time = calculateWordDisplayTime("hello", config);
        // At 600 WPM, base time = 60000ms / 600 = 100ms
        expect(time).toBe(100);
      });

      it("should use max multiplier when word is both long and has punctuation", () => {
        const time = calculateWordDisplayTime("comprehension.", baseConfig);
        // punctuation multiplier (2.0) > long word multiplier (1.5), so use 2.0
        // 200ms * 2.0 = 400ms
        expect(time).toBe(400);
      });
    });

    describe("splitIntoWords", () => {
      it("should split text by spaces", () => {
        const words = splitIntoWords("hello world");
        expect(words).toEqual(["hello", "world"]);
      });

      it("should handle multiple spaces", () => {
        const words = splitIntoWords("hello   world");
        expect(words).toEqual(["hello", "world"]);
      });

      it("should handle tabs and newlines", () => {
        const words = splitIntoWords("hello\tworld\nnew");
        expect(words).toEqual(["hello", "world", "new"]);
      });

      it("should trim leading and trailing whitespace", () => {
        const words = splitIntoWords("  hello world  ");
        expect(words).toEqual(["hello", "world"]);
      });

      it("should return empty array for empty string", () => {
        const words = splitIntoWords("");
        expect(words).toEqual([]);
      });

      it("should return empty array for whitespace only", () => {
        const words = splitIntoWords("   \t\n   ");
        expect(words).toEqual([]);
      });
    });

    describe("groupWordsForRSVP", () => {
      const words = ["one", "two", "three", "four", "five"];

      it("should return original array when wordsPerFlash is 1", () => {
        const result = groupWordsForRSVP(words, 1);
        expect(result).toEqual(words);
      });

      it("should group words in pairs when wordsPerFlash is 2", () => {
        const result = groupWordsForRSVP(words, 2);
        expect(result).toEqual(["one two", "three four", "five"]);
      });

      it("should group words in threes when wordsPerFlash is 3", () => {
        const result = groupWordsForRSVP(words, 3);
        expect(result).toEqual(["one two three", "four five"]);
      });

      it("should handle empty array", () => {
        const result = groupWordsForRSVP([], 2);
        expect(result).toEqual([]);
      });

      it("should handle wordsPerFlash of 0 (treat as 1)", () => {
        const result = groupWordsForRSVP(words, 0);
        expect(result).toEqual(words);
      });
    });

    describe("findORP", () => {
      it("should find ORP at ~35% of word", () => {
        // "reading" = 7 chars, ORP at ~35% = ~2
        const orp = findORP("reading");
        expect(orp).toBe(2);
      });

      it("should return 0 for single character word", () => {
        const orp = findORP("a");
        expect(orp).toBe(0);
      });

      it("should handle short words", () => {
        const orp = findORP("the");
        expect(orp).toBe(0);
      });

      it("should ignore punctuation in calculation", () => {
        // "reading." without punctuation = "reading" = 7 chars
        const orp = findORP("reading.");
        expect(orp).toBe(2);
      });

      it("should handle long words", () => {
        // "comprehension" = 13 chars, ORP at ~35% = ~4
        const orp = findORP("comprehension");
        expect(orp).toBe(4);
      });
    });

    describe("calculateRSVPProgress", () => {
      it("should return 0 for first word", () => {
        const progress = calculateRSVPProgress(0, 100);
        expect(progress).toBe(0);
      });

      it("should return 50 at halfway", () => {
        const progress = calculateRSVPProgress(50, 100);
        expect(progress).toBe(50);
      });

      it("should return 100 at end", () => {
        const progress = calculateRSVPProgress(100, 100);
        expect(progress).toBe(100);
      });

      it("should return 0 for zero total words", () => {
        const progress = calculateRSVPProgress(5, 0);
        expect(progress).toBe(0);
      });

      it("should round to nearest integer", () => {
        const progress = calculateRSVPProgress(33, 100);
        expect(progress).toBe(33);
      });
    });
  });

  // ===========================================
  // Bionic Reading Functions Tests
  // ===========================================

  describe("Bionic Reading Functions", () => {
    describe("applyBionicFormatting", () => {
      const defaultConfig: BionicReadingConfig = {
        boldPercentage: 0.4,
        minBoldChars: 1,
        boldShortWords: true,
      };

      it("should bold 40% of a normal word", () => {
        // "reading" = 7 chars, 40% = 2.8 -> ceil = 3
        const [bold, normal] = applyBionicFormatting("reading", defaultConfig);
        expect(bold).toBe("rea");
        expect(normal).toBe("ding");
      });

      it("should bold short words when enabled", () => {
        const [bold, normal] = applyBionicFormatting("go", defaultConfig);
        expect(bold).toBe("g");
        expect(normal).toBe("o");
      });

      it("should not bold short words when disabled", () => {
        const config = { ...defaultConfig, boldShortWords: false };
        const [bold, normal] = applyBionicFormatting("go", config);
        expect(bold).toBe("");
        expect(normal).toBe("go");
      });

      it("should respect minBoldChars", () => {
        const config = { ...defaultConfig, minBoldChars: 2 };
        const [bold, normal] = applyBionicFormatting("cat", config);
        // 40% of 3 = 1.2 -> ceil = 2, but minBoldChars = 2
        expect(bold).toBe("ca");
        expect(normal).toBe("t");
      });

      it("should not bold more than word length", () => {
        const config = { ...defaultConfig, boldPercentage: 1.0 };
        const [bold, normal] = applyBionicFormatting("hi", config);
        expect(bold).toBe("hi");
        expect(normal).toBe("");
      });

      it("should handle single character words", () => {
        const [bold, normal] = applyBionicFormatting("a", defaultConfig);
        expect(bold).toBe("a");
        expect(normal).toBe("");
      });
    });

    describe("transformToBionic", () => {
      const config: BionicReadingConfig = {
        boldPercentage: 0.4,
        minBoldChars: 1,
        boldShortWords: true,
      };

      it("should transform simple sentence", () => {
        const result = transformToBionic("The quick fox", config);
        expect(result).toHaveLength(3);
        // "The" (3 chars) with 40% = ceil(1.2) = 2 bold chars
        expect(result[0]?.bold).toBe("Th");
        expect(result[0]?.normal).toBe("e");
        expect(result[0]?.space).toBe(" ");
        expect(result[2]?.space).toBe(""); // Last word has no space
      });

      it("should handle empty string", () => {
        const result = transformToBionic("", config);
        expect(result).toHaveLength(0);
      });

      it("should handle single word", () => {
        const result = transformToBionic("hello", config);
        expect(result).toHaveLength(1);
        expect(result[0]?.bold).toBe("he");
        expect(result[0]?.normal).toBe("llo");
        expect(result[0]?.space).toBe("");
      });
    });
  });

  // ===========================================
  // WPM and Time Functions Tests
  // ===========================================

  describe("WPM and Time Functions", () => {
    describe("validateWPM", () => {
      it("should return value within range", () => {
        expect(validateWPM(300)).toBe(300);
      });

      it("should clamp to minimum", () => {
        expect(validateWPM(50)).toBe(100);
      });

      it("should clamp to maximum", () => {
        expect(validateWPM(1500)).toBe(1000);
      });

      it("should handle exact min value", () => {
        expect(validateWPM(100)).toBe(100);
      });

      it("should handle exact max value", () => {
        expect(validateWPM(1000)).toBe(1000);
      });
    });

    describe("formatWPM", () => {
      it("should format with WPM suffix", () => {
        expect(formatWPM(300)).toBe("300 WPM");
      });

      it("should handle min value", () => {
        expect(formatWPM(100)).toBe("100 WPM");
      });

      it("should handle max value", () => {
        expect(formatWPM(1000)).toBe("1000 WPM");
      });
    });

    describe("calculateEstimatedTime", () => {
      it("should calculate time for 300 words at 300 WPM", () => {
        expect(calculateEstimatedTime(300, 300)).toBe(1);
      });

      it("should round up", () => {
        expect(calculateEstimatedTime(301, 300)).toBe(2);
      });

      it("should return 0 for 0 WPM", () => {
        expect(calculateEstimatedTime(100, 0)).toBe(0);
      });

      it("should handle large word counts", () => {
        expect(calculateEstimatedTime(60000, 200)).toBe(300);
      });
    });

    describe("formatReadingTime", () => {
      it("should format less than 1 minute", () => {
        expect(formatReadingTime(0)).toBe("< 1 min");
      });

      it("should format minutes", () => {
        expect(formatReadingTime(5)).toBe("5 min");
      });

      it("should format exactly 1 hour", () => {
        expect(formatReadingTime(60)).toBe("1 hr");
      });

      it("should format hours and minutes", () => {
        expect(formatReadingTime(90)).toBe("1 hr 30 min");
      });

      it("should format multiple hours", () => {
        expect(formatReadingTime(180)).toBe("3 hr");
      });
    });
  });

  // ===========================================
  // Focus Mode Functions Tests
  // ===========================================

  describe("Focus Mode Functions", () => {
    describe("isSentenceEnd", () => {
      it("should return true for period", () => {
        expect(isSentenceEnd(".")).toBe(true);
      });

      it("should return true for exclamation", () => {
        expect(isSentenceEnd("!")).toBe(true);
      });

      it("should return true for question mark", () => {
        expect(isSentenceEnd("?")).toBe(true);
      });

      it("should return false for comma", () => {
        expect(isSentenceEnd(",")).toBe(false);
      });

      it("should return false for letter", () => {
        expect(isSentenceEnd("a")).toBe(false);
      });
    });

    describe("getLineHeightPx", () => {
      it("should calculate line height", () => {
        expect(getLineHeightPx(16, 1.5)).toBe(24);
      });

      it("should handle multiplier of 1", () => {
        expect(getLineHeightPx(18, 1)).toBe(18);
      });

      it("should handle larger font sizes", () => {
        // Use toBeCloseTo for floating point comparison
        expect(getLineHeightPx(24, 1.6)).toBeCloseTo(38.4, 5);
      });
    });

    describe("calculateFocusOverlay", () => {
      it("should return correct values for first line", () => {
        const result = calculateFocusOverlay(0, 100, 1);
        expect(result.topOverlayHeight).toBe(0);
        expect(result.bottomOverlayStart).toBe(1);
      });

      it("should return correct values for middle line", () => {
        // With 100 lines, each line is 1% tall
        // With visibleLines=1, halfVisible=0
        // Line 50 is visible, so top covers 50% (lines 0-49), bottom starts at 51%
        const result = calculateFocusOverlay(50, 100, 1);
        expect(result.topOverlayHeight).toBe(50);
        expect(result.bottomOverlayStart).toBe(51);
      });

      it("should handle zero total lines", () => {
        const result = calculateFocusOverlay(0, 0, 1);
        expect(result.topOverlayHeight).toBe(0);
        expect(result.bottomOverlayStart).toBe(100);
      });

      it("should handle multiple visible lines", () => {
        const result = calculateFocusOverlay(50, 100, 3);
        // halfVisible = 1, topLines = 50-1 = 49
        expect(result.topOverlayHeight).toBe(49);
        // bottomStartLine = min(100, 50+1+1) = 52
        expect(result.bottomOverlayStart).toBe(52);
      });
    });
  });

  // ===========================================
  // Type Guards Tests
  // ===========================================

  describe("Type compatibility", () => {
    it("should have valid AdvancedReadingMode values", () => {
      const modes: AdvancedReadingMode[] = [
        "normal",
        "rsvp",
        "focus",
        "bionic",
      ];
      expect(modes).toHaveLength(4);
    });

    it("RSVPConfig should be assignable", () => {
      const config: RSVPConfig = {
        wpm: 300,
        pauseOnPunctuation: true,
        punctuationPauseMultiplier: 2.0,
        longWordPauseMultiplier: 1.5,
        wordsPerFlash: 1,
      };
      expect(config.wpm).toBe(300);
    });

    it("FocusModeConfig should be assignable", () => {
      const config: FocusModeConfig = {
        overlayOpacity: 0.7,
        visibleLines: 1,
        autoFollow: true,
      };
      expect(config.overlayOpacity).toBe(0.7);
    });

    it("BionicReadingConfig should be assignable", () => {
      const config: BionicReadingConfig = {
        boldPercentage: 0.4,
        minBoldChars: 1,
        boldShortWords: true,
      };
      expect(config.boldPercentage).toBe(0.4);
    });

    it("RSVPState should be assignable", () => {
      const state: RSVPState = {
        currentWord: "test",
        currentIndex: 5,
        totalWords: 100,
        isPlaying: true,
        isComplete: false,
        progress: 5,
      };
      expect(state.currentWord).toBe("test");
    });
  });
});
