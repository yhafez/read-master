import { describe, it, expect } from "vitest";
import {
  // Types
  type ReadingLevelCategory,
  type TextDifficultyResult,
  type TextMetrics,
  type GradeLevelInfo,
  type ReadingLevelRecommendation,
  // Constants
  GRADE_LEVEL_LEXILE_MAP,
  READING_LEVEL_CATEGORIES,
  MIN_TEXT_LENGTH_FOR_ANALYSIS,
  MIN_SENTENCES_FOR_ANALYSIS,
  // Text analysis helpers
  countSyllables,
  isComplexWord,
  isCommonWord,
  extractWords,
  extractSentences,
  calculateTextMetrics,
  // Readability formulas
  calculateFleschKincaidGradeLevel,
  calculateFleschReadingEase,
  calculateGunningFog,
  calculateSmogIndex,
  calculateColemanLiauIndex,
  calculateAri,
  // Lexile estimation
  gradeLevelToLexile,
  lexileToGradeLevel,
  estimateLexileFromMetrics,
  getLexileCategory,
  getReadingLevelLabel,
  formatLexileScore,
  estimateTextDifficulty,
  quickLexileEstimate,
  // Comparison and recommendations
  isTextAppropriate,
  compareLexileScores,
  calculateLexileDifference,
  getReadingLevelRecommendation,
  getGradeLevelInfo,
  getGradeLevelsInRange,
  isValidLexile,
  parseLexileString,
  // Utility object
  lexileUtils,
} from "./lexile";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Lexile Constants", () => {
  describe("GRADE_LEVEL_LEXILE_MAP", () => {
    it("should have 16 grade levels (1-16)", () => {
      expect(GRADE_LEVEL_LEXILE_MAP).toHaveLength(16);
    });

    it("should have grade levels in ascending order", () => {
      for (let i = 1; i < GRADE_LEVEL_LEXILE_MAP.length; i++) {
        const prev = GRADE_LEVEL_LEXILE_MAP[i - 1];
        const curr = GRADE_LEVEL_LEXILE_MAP[i];
        if (prev && curr) {
          expect(curr.grade).toBeGreaterThan(prev.grade);
        }
      }
    });

    it("should have increasing Lexile ranges", () => {
      for (let i = 1; i < GRADE_LEVEL_LEXILE_MAP.length; i++) {
        const prev = GRADE_LEVEL_LEXILE_MAP[i - 1];
        const curr = GRADE_LEVEL_LEXILE_MAP[i];
        if (prev && curr) {
          expect(curr.lexileMin).toBeGreaterThanOrEqual(prev.lexileMin);
        }
      }
    });

    it("should cover all reading level categories", () => {
      const categories = new Set(GRADE_LEVEL_LEXILE_MAP.map((g) => g.category));
      expect(categories.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe("READING_LEVEL_CATEGORIES", () => {
    it("should have all 7 categories", () => {
      const expectedCategories: ReadingLevelCategory[] = [
        "BEGINNING_READER",
        "EARLY_ELEMENTARY",
        "ELEMENTARY",
        "MIDDLE_SCHOOL",
        "HIGH_SCHOOL",
        "COLLEGE",
        "ADVANCED",
      ];
      for (const category of expectedCategories) {
        expect(READING_LEVEL_CATEGORIES[category]).toBeDefined();
        expect(READING_LEVEL_CATEGORIES[category].name).toBeDefined();
        expect(READING_LEVEL_CATEGORIES[category].description).toBeDefined();
      }
    });
  });

  describe("MIN constants", () => {
    it("should have sensible minimum values", () => {
      expect(MIN_TEXT_LENGTH_FOR_ANALYSIS).toBeGreaterThan(0);
      expect(MIN_SENTENCES_FOR_ANALYSIS).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// TEXT ANALYSIS HELPER TESTS
// =============================================================================

describe("countSyllables", () => {
  it("should count syllables in simple words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("dog")).toBe(1);
    expect(countSyllables("the")).toBe(1);
  });

  it("should count syllables in multi-syllable words", () => {
    expect(countSyllables("water")).toBe(2);
    expect(countSyllables("bottle")).toBe(2);
    expect(countSyllables("beautiful")).toBe(3);
    expect(countSyllables("education")).toBe(4);
  });

  it("should handle words ending in silent e", () => {
    expect(countSyllables("like")).toBe(1);
    expect(countSyllables("make")).toBe(1);
    expect(countSyllables("home")).toBe(1);
  });

  it("should handle edge cases", () => {
    expect(countSyllables("")).toBe(0);
    expect(countSyllables("a")).toBe(1);
    expect(countSyllables("I")).toBe(1);
    expect(countSyllables("123")).toBe(0);
  });

  it("should handle complex words", () => {
    expect(countSyllables("extraordinary")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("unfortunately")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("comprehension")).toBeGreaterThanOrEqual(3);
  });
});

describe("isComplexWord", () => {
  it("should return false for common words", () => {
    expect(isComplexWord("the")).toBe(false);
    expect(isComplexWord("and")).toBe(false);
    expect(isComplexWord("question")).toBe(false); // common word
  });

  it("should return true for complex uncommon words", () => {
    expect(isComplexWord("extraordinary")).toBe(true);
    expect(isComplexWord("telecommunications")).toBe(true);
    expect(isComplexWord("biodiversity")).toBe(true);
  });

  it("should return false for short words", () => {
    expect(isComplexWord("cat")).toBe(false);
    expect(isComplexWord("run")).toBe(false);
  });

  it("should handle empty input", () => {
    expect(isComplexWord("")).toBe(false);
  });
});

describe("isCommonWord", () => {
  it("should return true for common words", () => {
    expect(isCommonWord("the")).toBe(true);
    expect(isCommonWord("and")).toBe(true);
    expect(isCommonWord("is")).toBe(true);
    expect(isCommonWord("have")).toBe(true);
  });

  it("should return false for uncommon words", () => {
    expect(isCommonWord("cryptography")).toBe(false);
    expect(isCommonWord("quantum")).toBe(false);
    expect(isCommonWord("obfuscation")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isCommonWord("The")).toBe(true);
    expect(isCommonWord("THE")).toBe(true);
  });
});

describe("extractWords", () => {
  it("should extract words from simple text", () => {
    const words = extractWords("The quick brown fox.");
    expect(words).toEqual(["The", "quick", "brown", "fox"]);
  });

  it("should handle punctuation", () => {
    const words = extractWords("Hello, world! How are you?");
    expect(words).toContain("Hello");
    expect(words).toContain("world");
    expect(words).toContain("How");
    expect(words).toContain("are");
    expect(words).toContain("you");
  });

  it("should handle empty text", () => {
    expect(extractWords("")).toEqual([]);
  });

  it("should filter out numbers-only strings", () => {
    const words = extractWords("There are 123 apples.");
    expect(words).not.toContain("123");
    expect(words).toContain("There");
    expect(words).toContain("apples");
  });

  it("should handle contractions", () => {
    const words = extractWords("I don't think it's working.");
    expect(words).toContain("don't");
    expect(words).toContain("it's");
  });
});

describe("extractSentences", () => {
  it("should extract sentences from text", () => {
    const sentences = extractSentences("Hello world. How are you? I am fine!");
    expect(sentences).toHaveLength(3);
  });

  it("should handle single sentence", () => {
    const sentences = extractSentences("This is a single sentence.");
    expect(sentences).toHaveLength(1);
  });

  it("should handle empty text", () => {
    const sentences = extractSentences("");
    expect(sentences).toHaveLength(0);
  });

  it("should filter out empty sentences", () => {
    const sentences = extractSentences("First. . . Second.");
    const validSentences = sentences.filter((s) => s.trim().length > 0);
    expect(validSentences.length).toBeGreaterThanOrEqual(2);
  });
});

describe("calculateTextMetrics", () => {
  const sampleText =
    "The quick brown fox jumps over the lazy dog. This is a simple sentence. Another sentence here.";

  it("should calculate word count correctly", () => {
    const metrics = calculateTextMetrics(sampleText);
    expect(metrics.wordCount).toBeGreaterThan(0);
  });

  it("should calculate sentence count correctly", () => {
    const metrics = calculateTextMetrics(sampleText);
    expect(metrics.sentenceCount).toBe(3);
  });

  it("should calculate average words per sentence", () => {
    const metrics = calculateTextMetrics(sampleText);
    expect(metrics.avgWordsPerSentence).toBeGreaterThan(0);
  });

  it("should calculate average syllables per word", () => {
    const metrics = calculateTextMetrics(sampleText);
    expect(metrics.avgSyllablesPerWord).toBeGreaterThan(0);
    expect(metrics.avgSyllablesPerWord).toBeLessThan(5);
  });

  it("should handle empty text", () => {
    const metrics = calculateTextMetrics("");
    expect(metrics.wordCount).toBe(0);
    expect(metrics.sentenceCount).toBe(1); // Minimum of 1 to avoid division by zero
  });

  it("should return a complete TextMetrics object", () => {
    const metrics = calculateTextMetrics(sampleText);
    expect(metrics).toHaveProperty("wordCount");
    expect(metrics).toHaveProperty("sentenceCount");
    expect(metrics).toHaveProperty("syllableCount");
    expect(metrics).toHaveProperty("avgWordsPerSentence");
    expect(metrics).toHaveProperty("avgSyllablesPerWord");
    expect(metrics).toHaveProperty("complexWordPercentage");
    expect(metrics).toHaveProperty("characterCount");
    expect(metrics).toHaveProperty("avgCharactersPerWord");
  });
});

// =============================================================================
// READABILITY FORMULA TESTS
// =============================================================================

describe("Readability Formulas", () => {
  const simpleMetrics: TextMetrics = {
    wordCount: 100,
    sentenceCount: 10,
    syllableCount: 130,
    avgWordsPerSentence: 10,
    avgSyllablesPerWord: 1.3,
    complexWordPercentage: 5,
    characterCount: 450,
    avgCharactersPerWord: 4.5,
  };

  const complexMetrics: TextMetrics = {
    wordCount: 100,
    sentenceCount: 4,
    syllableCount: 200,
    avgWordsPerSentence: 25,
    avgSyllablesPerWord: 2.0,
    complexWordPercentage: 25,
    characterCount: 600,
    avgCharactersPerWord: 6,
  };

  describe("calculateFleschKincaidGradeLevel", () => {
    it("should return lower grade for simple text", () => {
      const grade = calculateFleschKincaidGradeLevel(simpleMetrics);
      expect(grade).toBeLessThan(10);
    });

    it("should return higher grade for complex text", () => {
      const grade = calculateFleschKincaidGradeLevel(complexMetrics);
      expect(grade).toBeGreaterThan(
        calculateFleschKincaidGradeLevel(simpleMetrics)
      );
    });

    it("should return non-negative values", () => {
      const grade = calculateFleschKincaidGradeLevel(simpleMetrics);
      expect(grade).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateFleschReadingEase", () => {
    it("should return higher score for simpler text", () => {
      const simpleScore = calculateFleschReadingEase(simpleMetrics);
      const complexScore = calculateFleschReadingEase(complexMetrics);
      expect(simpleScore).toBeGreaterThan(complexScore);
    });

    it("should return values in 0-100 range", () => {
      const score = calculateFleschReadingEase(simpleMetrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateGunningFog", () => {
    it("should return lower index for simple text", () => {
      const simple = calculateGunningFog(simpleMetrics);
      const complex = calculateGunningFog(complexMetrics);
      expect(simple).toBeLessThan(complex);
    });

    it("should return non-negative values", () => {
      const index = calculateGunningFog(simpleMetrics);
      expect(index).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateSmogIndex", () => {
    it("should return a grade level estimate", () => {
      const index = calculateSmogIndex(simpleMetrics);
      expect(index).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateColemanLiauIndex", () => {
    it("should return a grade level estimate", () => {
      const index = calculateColemanLiauIndex(simpleMetrics);
      expect(index).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateAri", () => {
    it("should return a grade level estimate", () => {
      const index = calculateAri(simpleMetrics);
      expect(index).toBeGreaterThanOrEqual(0);
    });

    it("should return higher values for complex text", () => {
      const simple = calculateAri(simpleMetrics);
      const complex = calculateAri(complexMetrics);
      expect(complex).toBeGreaterThan(simple);
    });
  });
});

// =============================================================================
// LEXILE ESTIMATION TESTS
// =============================================================================

describe("gradeLevelToLexile", () => {
  it("should convert grade 1 to low Lexile", () => {
    const lexile = gradeLevelToLexile(1);
    expect(lexile).toBeLessThan(300);
  });

  it("should convert grade 6 to middle school Lexile", () => {
    const lexile = gradeLevelToLexile(6);
    expect(lexile).toBeGreaterThanOrEqual(665);
    expect(lexile).toBeLessThanOrEqual(1000);
  });

  it("should convert grade 12 to high school Lexile", () => {
    const lexile = gradeLevelToLexile(12);
    expect(lexile).toBeGreaterThanOrEqual(970);
  });

  it("should handle out of range grades", () => {
    expect(gradeLevelToLexile(0)).toBeDefined();
    expect(gradeLevelToLexile(20)).toBeDefined();
  });

  it("should return increasing Lexile for increasing grades", () => {
    const grade5 = gradeLevelToLexile(5);
    const grade10 = gradeLevelToLexile(10);
    expect(grade10).toBeGreaterThan(grade5);
  });
});

describe("lexileToGradeLevel", () => {
  it("should convert low Lexile to early grades", () => {
    const grade = lexileToGradeLevel(200);
    expect(grade).toBeLessThanOrEqual(3);
  });

  it("should convert 800L to middle school", () => {
    const grade = lexileToGradeLevel(800);
    expect(grade).toBeGreaterThanOrEqual(6);
    expect(grade).toBeLessThanOrEqual(9);
  });

  it("should convert 1200L to high school/college", () => {
    const grade = lexileToGradeLevel(1200);
    expect(grade).toBeGreaterThanOrEqual(10);
  });

  it("should handle boundary values", () => {
    expect(lexileToGradeLevel(0)).toBe(1);
    expect(lexileToGradeLevel(2000)).toBeGreaterThanOrEqual(14);
  });
});

describe("estimateLexileFromMetrics", () => {
  it("should return a Lexile in valid range", () => {
    const metrics = calculateTextMetrics(
      "The quick brown fox jumps over the lazy dog. This is a simple test."
    );
    const lexile = estimateLexileFromMetrics(metrics);
    expect(lexile).toBeGreaterThanOrEqual(0);
    expect(lexile).toBeLessThanOrEqual(2000);
  });

  it("should return higher Lexile for complex text", () => {
    const simpleText = "The cat sat. The dog ran. I like cake.";
    const complexText =
      "The comprehensive analysis of interdisciplinary phenomena demonstrates the multifaceted nature of epistemological inquiry within contemporary academic discourse.";

    const simpleLexile = estimateLexileFromMetrics(
      calculateTextMetrics(simpleText)
    );
    const complexLexile = estimateLexileFromMetrics(
      calculateTextMetrics(complexText)
    );

    expect(complexLexile).toBeGreaterThan(simpleLexile);
  });
});

describe("getLexileCategory", () => {
  it("should return BEGINNING_READER for very low Lexile", () => {
    expect(getLexileCategory(50)).toBe("BEGINNING_READER");
  });

  it("should return ELEMENTARY for mid-range Lexile", () => {
    expect(getLexileCategory(600)).toBe("ELEMENTARY");
  });

  it("should return HIGH_SCHOOL for high Lexile", () => {
    expect(getLexileCategory(1000)).toBe("HIGH_SCHOOL");
  });

  it("should return ADVANCED for very high Lexile", () => {
    expect(getLexileCategory(1500)).toBe("ADVANCED");
  });
});

describe("getReadingLevelLabel", () => {
  it("should return human-readable labels", () => {
    expect(getReadingLevelLabel(100)).toBe("Beginning Reader");
    expect(getReadingLevelLabel(600)).toBe("Elementary");
    expect(getReadingLevelLabel(1000)).toBe("High School");
  });
});

describe("formatLexileScore", () => {
  it("should format with L suffix", () => {
    expect(formatLexileScore(850)).toBe("850L");
    expect(formatLexileScore(1200)).toBe("1200L");
  });

  it("should handle BR (Beginning Reader)", () => {
    expect(formatLexileScore(-10)).toBe("BR");
  });

  it("should round to nearest integer", () => {
    expect(formatLexileScore(850.6)).toBe("851L");
    expect(formatLexileScore(850.4)).toBe("850L");
  });
});

// =============================================================================
// MAIN ESTIMATION FUNCTION TESTS
// =============================================================================

describe("estimateTextDifficulty", () => {
  const sampleText = `
    The scientific method is a systematic approach to inquiry that has been
    developed over centuries. It involves observation, hypothesis formation,
    experimentation, and conclusion. Scientists use this method to understand
    the natural world and make predictions about phenomena. The process is
    iterative, meaning that conclusions often lead to new questions and
    further investigation.
  `;

  it("should return a complete TextDifficultyResult", () => {
    const result = estimateTextDifficulty(sampleText);

    expect(result).toHaveProperty("lexile");
    expect(result).toHaveProperty("gradeLevel");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("category");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("metrics");
  });

  it("should return valid Lexile range", () => {
    const result = estimateTextDifficulty(sampleText);
    expect(result.lexile).toBeGreaterThanOrEqual(0);
    expect(result.lexile).toBeLessThanOrEqual(2000);
  });

  it("should return valid grade level", () => {
    const result = estimateTextDifficulty(sampleText);
    expect(result.gradeLevel).toBeGreaterThanOrEqual(0);
    expect(result.gradeLevel).toBeLessThanOrEqual(20);
  });

  it("should return valid confidence (0-1)", () => {
    const result = estimateTextDifficulty(sampleText);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("should have lower confidence for short texts", () => {
    const shortText = "Hello world.";
    const longText = sampleText.repeat(3);

    const shortResult = estimateTextDifficulty(shortText);
    const longResult = estimateTextDifficulty(longText);

    expect(shortResult.confidence).toBeLessThan(longResult.confidence);
  });

  it("should include complete metrics", () => {
    const result = estimateTextDifficulty(sampleText);
    expect(result.metrics.wordCount).toBeGreaterThan(0);
    expect(result.metrics.sentenceCount).toBeGreaterThan(0);
  });
});

describe("quickLexileEstimate", () => {
  it("should return a number", () => {
    const result = quickLexileEstimate("The quick brown fox jumps.");
    expect(typeof result).toBe("number");
  });

  it("should return value in valid range", () => {
    const result = quickLexileEstimate(
      "This is a simple sentence for testing purposes."
    );
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2000);
  });
});

// =============================================================================
// COMPARISON AND RECOMMENDATION TESTS
// =============================================================================

describe("isTextAppropriate", () => {
  it("should return true when text is within range", () => {
    expect(isTextAppropriate(800, 650, 950)).toBe(true);
    expect(isTextAppropriate(650, 650, 950)).toBe(true);
    expect(isTextAppropriate(950, 650, 950)).toBe(true);
  });

  it("should return false when text is outside range", () => {
    expect(isTextAppropriate(500, 650, 950)).toBe(false);
    expect(isTextAppropriate(1000, 650, 950)).toBe(false);
  });
});

describe("compareLexileScores", () => {
  it("should return negative when first is lower", () => {
    expect(compareLexileScores(500, 800)).toBeLessThan(0);
  });

  it("should return positive when first is higher", () => {
    expect(compareLexileScores(1000, 800)).toBeGreaterThan(0);
  });

  it("should return zero when equal", () => {
    expect(compareLexileScores(800, 800)).toBe(0);
  });
});

describe("calculateLexileDifference", () => {
  it("should identify easier texts", () => {
    const result = calculateLexileDifference(600, 800);
    expect(result.direction).toBe("easier");
    expect(result.difference).toBe(200);
  });

  it("should identify harder texts", () => {
    const result = calculateLexileDifference(1000, 800);
    expect(result.direction).toBe("harder");
    expect(result.difference).toBe(200);
  });

  it("should identify matched texts", () => {
    const result = calculateLexileDifference(800, 800);
    expect(result.direction).toBe("matched");
  });

  it("should consider close texts as matched", () => {
    const result = calculateLexileDifference(820, 800);
    expect(result.direction).toBe("matched");
  });
});

describe("getReadingLevelRecommendation", () => {
  it("should return recommendation with valid ranges", () => {
    const rec = getReadingLevelRecommendation(800);
    expect(rec.minLexile).toBeLessThan(rec.maxLexile);
    expect(rec.minLexile).toBeGreaterThanOrEqual(0);
    expect(rec.maxLexile).toBeLessThanOrEqual(2000);
  });

  it("should include stretch bonus when stretch is true", () => {
    const withStretch = getReadingLevelRecommendation(800, true);
    const withoutStretch = getReadingLevelRecommendation(800, false);
    expect(withStretch.maxLexile).toBeGreaterThan(withoutStretch.maxLexile);
  });

  it("should include grade range", () => {
    const rec = getReadingLevelRecommendation(800);
    expect(rec.gradeRange).toMatch(/Grade \d+-\d+/);
  });

  it("should include description", () => {
    const rec = getReadingLevelRecommendation(800);
    expect(rec.description.length).toBeGreaterThan(0);
  });
});

describe("getGradeLevelInfo", () => {
  it("should return info for valid grades", () => {
    const info = getGradeLevelInfo(6);
    expect(info).not.toBeNull();
    expect(info?.grade).toBe(6);
    expect(info?.name).toBe("6th Grade");
  });

  it("should clamp out of range grades", () => {
    const info = getGradeLevelInfo(0);
    expect(info?.grade).toBe(1);

    const highInfo = getGradeLevelInfo(20);
    expect(highInfo?.grade).toBe(16);
  });

  it("should round decimal grades", () => {
    const info = getGradeLevelInfo(5.7);
    expect(info?.grade).toBe(6);
  });
});

describe("getGradeLevelsInRange", () => {
  it("should return grades within Lexile range", () => {
    const grades = getGradeLevelsInRange(500, 900);
    expect(grades.length).toBeGreaterThan(0);
    for (const grade of grades) {
      expect(grade.lexileMax).toBeGreaterThanOrEqual(500);
      expect(grade.lexileMin).toBeLessThanOrEqual(900);
    }
  });

  it("should return empty array for invalid range", () => {
    const grades = getGradeLevelsInRange(2100, 2200);
    expect(grades).toHaveLength(0);
  });
});

describe("isValidLexile", () => {
  it("should return true for valid Lexile scores", () => {
    expect(isValidLexile(0)).toBe(true);
    expect(isValidLexile(500)).toBe(true);
    expect(isValidLexile(1000)).toBe(true);
    expect(isValidLexile(2000)).toBe(true);
  });

  it("should return false for invalid values", () => {
    expect(isValidLexile(-100)).toBe(false);
    expect(isValidLexile(2500)).toBe(false);
    expect(isValidLexile("800")).toBe(false);
    expect(isValidLexile(null)).toBe(false);
    expect(isValidLexile(undefined)).toBe(false);
    expect(isValidLexile(NaN)).toBe(false);
  });
});

describe("parseLexileString", () => {
  it("should parse standard Lexile format", () => {
    expect(parseLexileString("850L")).toBe(850);
    expect(parseLexileString("1200L")).toBe(1200);
  });

  it("should parse without L suffix", () => {
    expect(parseLexileString("850")).toBe(850);
  });

  it("should handle BR (Beginning Reader)", () => {
    expect(parseLexileString("BR")).toBe(0);
  });

  it("should be case insensitive", () => {
    expect(parseLexileString("850l")).toBe(850);
    expect(parseLexileString("br")).toBe(0);
  });

  it("should return null for invalid strings", () => {
    expect(parseLexileString("invalid")).toBeNull();
    expect(parseLexileString("abc")).toBeNull();
    expect(parseLexileString("-100L")).toBeNull();
    expect(parseLexileString("3000L")).toBeNull();
  });

  it("should handle whitespace", () => {
    expect(parseLexileString("  850L  ")).toBe(850);
  });
});

// =============================================================================
// LEXILE UTILS OBJECT TESTS
// =============================================================================

describe("lexileUtils", () => {
  it("should export all constants", () => {
    expect(lexileUtils.GRADE_LEVEL_MAP).toBeDefined();
    expect(lexileUtils.CATEGORIES).toBeDefined();
    expect(lexileUtils.MIN_TEXT_LENGTH).toBeDefined();
    expect(lexileUtils.MIN_SENTENCES).toBeDefined();
  });

  it("should export all text analysis functions", () => {
    expect(typeof lexileUtils.countSyllables).toBe("function");
    expect(typeof lexileUtils.isComplexWord).toBe("function");
    expect(typeof lexileUtils.isCommonWord).toBe("function");
    expect(typeof lexileUtils.extractWords).toBe("function");
    expect(typeof lexileUtils.extractSentences).toBe("function");
    expect(typeof lexileUtils.calculateMetrics).toBe("function");
  });

  it("should export all readability formulas", () => {
    expect(typeof lexileUtils.fleschKincaidGrade).toBe("function");
    expect(typeof lexileUtils.fleschReadingEase).toBe("function");
    expect(typeof lexileUtils.gunningFog).toBe("function");
    expect(typeof lexileUtils.smogIndex).toBe("function");
    expect(typeof lexileUtils.colemanLiauIndex).toBe("function");
    expect(typeof lexileUtils.ari).toBe("function");
  });

  it("should export all Lexile estimation functions", () => {
    expect(typeof lexileUtils.gradeLevelToLexile).toBe("function");
    expect(typeof lexileUtils.lexileToGradeLevel).toBe("function");
    expect(typeof lexileUtils.estimateLexile).toBe("function");
    expect(typeof lexileUtils.quickEstimate).toBe("function");
    expect(typeof lexileUtils.estimateDifficulty).toBe("function");
  });

  it("should export all categorization functions", () => {
    expect(typeof lexileUtils.getCategory).toBe("function");
    expect(typeof lexileUtils.getLabel).toBe("function");
    expect(typeof lexileUtils.formatScore).toBe("function");
  });

  it("should export all comparison functions", () => {
    expect(typeof lexileUtils.isAppropriate).toBe("function");
    expect(typeof lexileUtils.compare).toBe("function");
    expect(typeof lexileUtils.calculateDifference).toBe("function");
  });

  it("should export all recommendation functions", () => {
    expect(typeof lexileUtils.getRecommendation).toBe("function");
    expect(typeof lexileUtils.getGradeLevelInfo).toBe("function");
    expect(typeof lexileUtils.getGradeLevelsInRange).toBe("function");
  });

  it("should export validation functions", () => {
    expect(typeof lexileUtils.isValid).toBe("function");
    expect(typeof lexileUtils.parse).toBe("function");
  });
});

// =============================================================================
// REAL-WORLD TEXT TESTS
// =============================================================================

describe("Real-world text analysis", () => {
  it("should estimate children's book level correctly", () => {
    const childrensText =
      "See the cat. The cat is big. The cat runs fast. I like the cat.";
    const result = estimateTextDifficulty(childrensText);
    expect(result.gradeLevel).toBeLessThanOrEqual(4);
    expect(result.category).toMatch(/BEGINNING|EARLY|ELEMENTARY/);
  });

  it("should estimate academic text correctly", () => {
    const academicText = `
      The epistemological foundations of contemporary quantum mechanics
      necessitate a comprehensive reevaluation of classical deterministic
      paradigms. The probabilistic interpretation, initially proposed by
      the Copenhagen school, remains contentious among physicists and
      philosophers of science alike. Furthermore, the ontological
      implications of wave function collapse continue to engender
      significant scholarly debate within the academic community.
    `;
    const result = estimateTextDifficulty(academicText);
    expect(result.gradeLevel).toBeGreaterThanOrEqual(10);
    expect(["HIGH_SCHOOL", "COLLEGE", "ADVANCED"]).toContain(result.category);
  });

  it("should estimate newspaper article correctly", () => {
    // Simpler newspaper-style text with common vocabulary
    const newsText = `
      Local leaders said today that work on the new town center
      will start next month. The plan was made over two years ago.
      The new building will have a gym and meeting rooms.
      Mayor Smith said she is happy about it. She said it will
      help people of all ages in the town.
    `;
    const result = estimateTextDifficulty(newsText);
    // Newspaper articles typically range from grade 6-12 depending on vocabulary
    expect(result.gradeLevel).toBeGreaterThanOrEqual(4);
    expect(result.gradeLevel).toBeLessThanOrEqual(14);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge cases", () => {
  it("should handle very short text", () => {
    const result = estimateTextDifficulty("Hi.");
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.lexile).toBeDefined();
  });

  it("should handle text with no sentences", () => {
    const result = estimateTextDifficulty("hello world no punctuation");
    expect(result.lexile).toBeDefined();
    expect(result.gradeLevel).toBeDefined();
  });

  it("should handle text with special characters", () => {
    const result = estimateTextDifficulty(
      "Hello! @#$% World... How are you???"
    );
    expect(result.lexile).toBeDefined();
  });

  it("should handle unicode text", () => {
    const result = estimateTextDifficulty(
      "The café serves excellent croissants and espresso."
    );
    expect(result.lexile).toBeDefined();
  });

  it("should handle very long text efficiently", () => {
    const longText =
      "This is a test sentence with moderate complexity. ".repeat(100);
    const start = Date.now();
    const result = estimateTextDifficulty(longText);
    const duration = Date.now() - start;

    expect(result.lexile).toBeDefined();
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it("should handle empty string", () => {
    const result = estimateTextDifficulty("");
    expect(result.lexile).toBeDefined();
    expect(result.confidence).toBeLessThan(0.2);
  });
});

// =============================================================================
// TYPE SAFETY TESTS
// =============================================================================

describe("Type safety", () => {
  it("should return properly typed TextDifficultyResult", () => {
    const result: TextDifficultyResult = estimateTextDifficulty(
      "Sample text for type testing."
    );
    expect(typeof result.lexile).toBe("number");
    expect(typeof result.gradeLevel).toBe("number");
    expect(typeof result.label).toBe("string");
    expect(typeof result.category).toBe("string");
    expect(typeof result.confidence).toBe("number");
  });

  it("should return properly typed TextMetrics", () => {
    const metrics: TextMetrics = calculateTextMetrics("Sample text.");
    expect(typeof metrics.wordCount).toBe("number");
    expect(typeof metrics.sentenceCount).toBe("number");
    expect(typeof metrics.avgWordsPerSentence).toBe("number");
  });

  it("should return properly typed ReadingLevelRecommendation", () => {
    const rec: ReadingLevelRecommendation = getReadingLevelRecommendation(800);
    expect(typeof rec.minLexile).toBe("number");
    expect(typeof rec.maxLexile).toBe("number");
    expect(typeof rec.gradeRange).toBe("string");
  });

  it("should accept valid GradeLevelInfo", () => {
    const info: GradeLevelInfo | null = getGradeLevelInfo(6);
    if (info) {
      expect(typeof info.grade).toBe("number");
      expect(typeof info.name).toBe("string");
      expect(typeof info.lexileMin).toBe("number");
      expect(typeof info.lexileMax).toBe("number");
    }
  });
});
