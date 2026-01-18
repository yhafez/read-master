/**
 * Bloom's Taxonomy Utilities
 *
 * This module provides utilities for working with Bloom's Taxonomy,
 * a hierarchical model for classifying educational learning objectives
 * into levels of complexity and specificity.
 *
 * The six levels (from lowest to highest cognitive complexity):
 * 1. REMEMBER - Recall facts and basic concepts
 * 2. UNDERSTAND - Explain ideas or concepts
 * 3. APPLY - Use information in new situations
 * 4. ANALYZE - Draw connections among ideas
 * 5. EVALUATE - Justify a stance or decision
 * 6. CREATE - Produce new or original work
 *
 * @example
 * ```typescript
 * import {
 *   BloomsLevel,
 *   categorizeQuestion,
 *   calculateBloomsBreakdown,
 *   getBloomsLevelInfo,
 * } from '@read-master/shared/utils';
 *
 * // Categorize a question based on its text
 * const level = categorizeQuestion("Summarize the main argument of chapter 3");
 * // level: "UNDERSTAND"
 *
 * // Calculate breakdown from a list of questions
 * const breakdown = calculateBloomsBreakdown([
 *   { bloomsLevel: "REMEMBER" },
 *   { bloomsLevel: "UNDERSTAND" },
 *   { bloomsLevel: "ANALYZE" },
 * ]);
 * // breakdown: { remember: 33.33, understand: 33.33, ... }
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Bloom's Taxonomy level enum
 */
export type BloomsLevel =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "EVALUATE"
  | "CREATE";

/**
 * Bloom's breakdown percentages for each level
 */
export type BloomsBreakdown = {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
};

/**
 * Information about a Bloom's level
 */
export type BloomsLevelInfo = {
  level: BloomsLevel;
  name: string;
  description: string;
  cognitiveLevel: number; // 1-6, 1 being lowest
  keywords: readonly string[];
  questionStems: readonly string[];
  color: string; // Hex color for UI representation
};

/**
 * Question with Bloom's level for breakdown calculation
 */
export type QuestionWithBloomsLevel = {
  bloomsLevel: BloomsLevel;
  [key: string]: unknown;
};

/**
 * Recommended distribution for balanced assessments
 */
export type BloomsDistribution = {
  level: BloomsLevel;
  percentage: number;
  count?: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * All Bloom's taxonomy levels in order from lowest to highest complexity
 */
export const BLOOMS_LEVELS: readonly BloomsLevel[] = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
] as const;

/**
 * Detailed information for each Bloom's taxonomy level
 */
export const BLOOMS_LEVEL_INFO: Record<BloomsLevel, BloomsLevelInfo> = {
  REMEMBER: {
    level: "REMEMBER",
    name: "Remember",
    description:
      "Recall facts, terms, basic concepts, or answers. Retrieve relevant knowledge from long-term memory.",
    cognitiveLevel: 1,
    keywords: [
      "define",
      "list",
      "recall",
      "identify",
      "name",
      "state",
      "describe",
      "match",
      "recognize",
      "label",
      "memorize",
      "repeat",
      "reproduce",
      "quote",
      "recite",
      "who",
      "what",
      "when",
      "where",
    ],
    questionStems: [
      "What is",
      "Who was",
      "When did",
      "Where did",
      "List the",
      "Name the",
      "Define",
      "Identify",
      "Which",
      "How many",
      "Recall",
      "State",
    ],
    color: "#E57373", // Red 300
  },
  UNDERSTAND: {
    level: "UNDERSTAND",
    name: "Understand",
    description:
      "Demonstrate understanding of facts and ideas by organizing, comparing, translating, interpreting, or describing.",
    cognitiveLevel: 2,
    keywords: [
      "explain",
      "summarize",
      "paraphrase",
      "classify",
      "compare",
      "interpret",
      "discuss",
      "distinguish",
      "predict",
      "describe",
      "illustrate",
      "infer",
      "outline",
      "rephrase",
      "translate",
      "contrast",
      "generalize",
      "estimate",
    ],
    questionStems: [
      "Explain",
      "Summarize",
      "Describe in your own words",
      "What is the main idea",
      "Compare",
      "Contrast",
      "Interpret",
      "Distinguish between",
      "Predict",
      "What can you infer",
      "Why",
      "How would you classify",
    ],
    color: "#FFB74D", // Orange 300
  },
  APPLY: {
    level: "APPLY",
    name: "Apply",
    description:
      "Use acquired knowledge to solve problems in new situations. Apply facts, techniques, and rules in a different way.",
    cognitiveLevel: 3,
    keywords: [
      "apply",
      "demonstrate",
      "solve",
      "use",
      "implement",
      "execute",
      "calculate",
      "modify",
      "construct",
      "complete",
      "show",
      "experiment",
      "practice",
      "illustrate",
      "compute",
      "operate",
      "utilize",
      "employ",
    ],
    questionStems: [
      "How would you use",
      "Apply",
      "Demonstrate",
      "Solve",
      "Calculate",
      "Show how",
      "What would happen if",
      "How would you apply",
      "Use the information to",
      "Construct",
      "Compute",
      "Implement",
    ],
    color: "#FFF176", // Yellow 300
  },
  ANALYZE: {
    level: "ANALYZE",
    name: "Analyze",
    description:
      "Break information into parts to explore understandings and relationships. Examine and break information into components.",
    cognitiveLevel: 4,
    keywords: [
      "analyze",
      "examine",
      "compare",
      "contrast",
      "investigate",
      "categorize",
      "differentiate",
      "distinguish",
      "deconstruct",
      "organize",
      "structure",
      "attribute",
      "outline",
      "diagram",
      "dissect",
      "separate",
      "subdivide",
      "infer",
    ],
    questionStems: [
      "Analyze",
      "What are the parts",
      "What is the relationship between",
      "Why do you think",
      "What evidence",
      "What conclusions",
      "How does this compare to",
      "Categorize",
      "Examine",
      "Differentiate",
      "What patterns",
      "What is the function of",
    ],
    color: "#81C784", // Green 300
  },
  EVALUATE: {
    level: "EVALUATE",
    name: "Evaluate",
    description:
      "Present and defend opinions by making judgments about information, validity of ideas, or quality of work based on a set of criteria.",
    cognitiveLevel: 5,
    keywords: [
      "evaluate",
      "judge",
      "justify",
      "argue",
      "defend",
      "critique",
      "assess",
      "rate",
      "prioritize",
      "recommend",
      "decide",
      "select",
      "appraise",
      "conclude",
      "support",
      "value",
      "validate",
      "criticize",
    ],
    questionStems: [
      "Evaluate",
      "Do you agree",
      "What is your opinion",
      "Judge the value of",
      "Defend your position",
      "What would you recommend",
      "Prioritize",
      "Critique",
      "Assess",
      "What is the most important",
      "Would it be better if",
      "Rate",
    ],
    color: "#64B5F6", // Blue 300
  },
  CREATE: {
    level: "CREATE",
    name: "Create",
    description:
      "Compile information together in a different way by combining elements in a new pattern or proposing alternative solutions.",
    cognitiveLevel: 6,
    keywords: [
      "create",
      "design",
      "develop",
      "compose",
      "construct",
      "formulate",
      "invent",
      "produce",
      "plan",
      "propose",
      "generate",
      "build",
      "devise",
      "synthesize",
      "write",
      "imagine",
      "hypothesize",
      "originate",
    ],
    questionStems: [
      "Create",
      "Design",
      "How would you improve",
      "What would happen if",
      "Propose",
      "Develop",
      "Formulate",
      "Invent",
      "Compose",
      "What alternative",
      "How could you change",
      "Write a",
    ],
    color: "#BA68C8", // Purple 300
  },
} as const;

/**
 * Default balanced distribution for assessments
 * Lower levels have slightly higher representation for comprehensive coverage
 */
export const DEFAULT_BLOOMS_DISTRIBUTION: readonly BloomsDistribution[] = [
  { level: "REMEMBER", percentage: 15 },
  { level: "UNDERSTAND", percentage: 20 },
  { level: "APPLY", percentage: 20 },
  { level: "ANALYZE", percentage: 20 },
  { level: "EVALUATE", percentage: 15 },
  { level: "CREATE", percentage: 10 },
] as const;

/**
 * Higher-order thinking levels (analysis and above)
 */
export const HIGHER_ORDER_LEVELS: readonly BloomsLevel[] = [
  "ANALYZE",
  "EVALUATE",
  "CREATE",
] as const;

/**
 * Lower-order thinking levels (remember, understand, apply)
 */
export const LOWER_ORDER_LEVELS: readonly BloomsLevel[] = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
] as const;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if a value is a valid Bloom's level
 */
export function isValidBloomsLevel(value: unknown): value is BloomsLevel {
  return (
    typeof value === "string" && BLOOMS_LEVELS.includes(value as BloomsLevel)
  );
}

/**
 * Check if a level is a higher-order thinking skill (ANALYZE, EVALUATE, CREATE)
 */
export function isHigherOrderLevel(level: BloomsLevel): boolean {
  return HIGHER_ORDER_LEVELS.includes(level);
}

/**
 * Check if a level is a lower-order thinking skill (REMEMBER, UNDERSTAND, APPLY)
 */
export function isLowerOrderLevel(level: BloomsLevel): boolean {
  return LOWER_ORDER_LEVELS.includes(level);
}

// =============================================================================
// LEVEL INFO FUNCTIONS
// =============================================================================

/**
 * Get detailed information about a Bloom's level
 */
export function getBloomsLevelInfo(level: BloomsLevel): BloomsLevelInfo {
  return BLOOMS_LEVEL_INFO[level];
}

/**
 * Get the cognitive level number (1-6) for a Bloom's level
 */
export function getCognitiveLevel(level: BloomsLevel): number {
  return BLOOMS_LEVEL_INFO[level].cognitiveLevel;
}

/**
 * Get the display name for a Bloom's level
 */
export function getBloomsLevelName(level: BloomsLevel): string {
  return BLOOMS_LEVEL_INFO[level].name;
}

/**
 * Get the description for a Bloom's level
 */
export function getBloomsLevelDescription(level: BloomsLevel): string {
  return BLOOMS_LEVEL_INFO[level].description;
}

/**
 * Get the color for a Bloom's level (for UI)
 */
export function getBloomsLevelColor(level: BloomsLevel): string {
  return BLOOMS_LEVEL_INFO[level].color;
}

/**
 * Get all keywords associated with a Bloom's level
 */
export function getBloomsKeywords(level: BloomsLevel): readonly string[] {
  return BLOOMS_LEVEL_INFO[level].keywords;
}

/**
 * Get question stems for a Bloom's level
 */
export function getBloomsQuestionStems(level: BloomsLevel): readonly string[] {
  return BLOOMS_LEVEL_INFO[level].questionStems;
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Compare two Bloom's levels by cognitive complexity
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareBloomsLevels(a: BloomsLevel, b: BloomsLevel): number {
  return getCognitiveLevel(a) - getCognitiveLevel(b);
}

/**
 * Get the level that is one step higher in complexity
 * Returns null if already at CREATE (highest level)
 */
export function getNextHigherLevel(level: BloomsLevel): BloomsLevel | null {
  const currentIndex = BLOOMS_LEVELS.indexOf(level);
  if (currentIndex === BLOOMS_LEVELS.length - 1) {
    return null;
  }
  const nextLevel = BLOOMS_LEVELS[currentIndex + 1];
  return nextLevel ?? null;
}

/**
 * Get the level that is one step lower in complexity
 * Returns null if already at REMEMBER (lowest level)
 */
export function getNextLowerLevel(level: BloomsLevel): BloomsLevel | null {
  const currentIndex = BLOOMS_LEVELS.indexOf(level);
  if (currentIndex === 0) {
    return null;
  }
  const prevLevel = BLOOMS_LEVELS[currentIndex - 1];
  return prevLevel ?? null;
}

/**
 * Get all levels at or above a given level
 */
export function getLevelsAtOrAbove(level: BloomsLevel): BloomsLevel[] {
  const currentIndex = BLOOMS_LEVELS.indexOf(level);
  return BLOOMS_LEVELS.slice(currentIndex) as BloomsLevel[];
}

/**
 * Get all levels at or below a given level
 */
export function getLevelsAtOrBelow(level: BloomsLevel): BloomsLevel[] {
  const currentIndex = BLOOMS_LEVELS.indexOf(level);
  return BLOOMS_LEVELS.slice(0, currentIndex + 1) as BloomsLevel[];
}

// =============================================================================
// QUESTION CATEGORIZATION
// =============================================================================

/**
 * Categorize a question based on its text
 * Analyzes keywords and question stems to determine the likely Bloom's level
 *
 * @param questionText - The question text to analyze
 * @returns The most likely Bloom's level for the question
 */
export function categorizeQuestion(questionText: string): BloomsLevel {
  const lowerText = questionText.toLowerCase().trim();

  // Score each level based on keyword and stem matches
  const scores: Record<BloomsLevel, number> = {
    REMEMBER: 0,
    UNDERSTAND: 0,
    APPLY: 0,
    ANALYZE: 0,
    EVALUATE: 0,
    CREATE: 0,
  };

  // Check for question stems first (stronger indicator)
  for (const level of BLOOMS_LEVELS) {
    const info = BLOOMS_LEVEL_INFO[level];

    // Check question stems (higher weight)
    for (const stem of info.questionStems) {
      if (lowerText.startsWith(stem.toLowerCase())) {
        scores[level] += 3;
      } else if (lowerText.includes(stem.toLowerCase())) {
        scores[level] += 2;
      }
    }

    // Check keywords
    for (const keyword of info.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(lowerText)) {
        scores[level] += 1;
      }
    }
  }

  // Find the level with the highest score
  let maxScore = 0;
  let bestLevel: BloomsLevel = "REMEMBER"; // Default to REMEMBER

  // Iterate in reverse order (higher levels first) to prefer higher levels on tie
  for (let i = BLOOMS_LEVELS.length - 1; i >= 0; i--) {
    const level = BLOOMS_LEVELS[i];
    if (level !== undefined && scores[level] > maxScore) {
      maxScore = scores[level];
      bestLevel = level;
    }
  }

  return bestLevel;
}

/**
 * Categorize multiple questions and return levels for each
 */
export function categorizeQuestions(questionTexts: string[]): BloomsLevel[] {
  return questionTexts.map(categorizeQuestion);
}

/**
 * Suggest keywords to add to a question to target a specific Bloom's level
 */
export function suggestKeywordsForLevel(level: BloomsLevel): string[] {
  const info = BLOOMS_LEVEL_INFO[level];
  // Return first 5 keywords as suggestions
  return [...info.keywords].slice(0, 5);
}

/**
 * Generate example question stems for a Bloom's level
 */
export function getExampleStemsForLevel(level: BloomsLevel): string[] {
  const info = BLOOMS_LEVEL_INFO[level];
  // Return first 5 question stems
  return [...info.questionStems].slice(0, 5);
}

// =============================================================================
// BREAKDOWN CALCULATION
// =============================================================================

/**
 * Create an empty Bloom's breakdown with all zeros
 */
export function createEmptyBreakdown(): BloomsBreakdown {
  return {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  };
}

/**
 * Calculate the Bloom's taxonomy breakdown from a list of questions
 *
 * @param questions - Array of questions with bloomsLevel property
 * @returns Breakdown with percentage for each level (totals to 100 if questions exist)
 */
export function calculateBloomsBreakdown(
  questions: QuestionWithBloomsLevel[]
): BloomsBreakdown {
  const breakdown = createEmptyBreakdown();

  if (questions.length === 0) {
    return breakdown;
  }

  // Count questions at each level
  const counts: Record<BloomsLevel, number> = {
    REMEMBER: 0,
    UNDERSTAND: 0,
    APPLY: 0,
    ANALYZE: 0,
    EVALUATE: 0,
    CREATE: 0,
  };

  for (const question of questions) {
    if (isValidBloomsLevel(question.bloomsLevel)) {
      counts[question.bloomsLevel]++;
    }
  }

  const total = questions.length;

  // Calculate percentages (rounded to 2 decimal places)
  breakdown.remember = Math.round((counts.REMEMBER / total) * 10000) / 100;
  breakdown.understand = Math.round((counts.UNDERSTAND / total) * 10000) / 100;
  breakdown.apply = Math.round((counts.APPLY / total) * 10000) / 100;
  breakdown.analyze = Math.round((counts.ANALYZE / total) * 10000) / 100;
  breakdown.evaluate = Math.round((counts.EVALUATE / total) * 10000) / 100;
  breakdown.create = Math.round((counts.CREATE / total) * 10000) / 100;

  return breakdown;
}

/**
 * Calculate question counts per level from a breakdown percentage
 *
 * @param breakdown - Bloom's breakdown percentages
 * @param totalQuestions - Total number of questions to distribute
 * @returns Count for each level
 */
export function calculateCountsFromBreakdown(
  breakdown: BloomsBreakdown,
  totalQuestions: number
): Record<BloomsLevel, number> {
  const counts: Record<BloomsLevel, number> = {
    REMEMBER: Math.round((breakdown.remember / 100) * totalQuestions),
    UNDERSTAND: Math.round((breakdown.understand / 100) * totalQuestions),
    APPLY: Math.round((breakdown.apply / 100) * totalQuestions),
    ANALYZE: Math.round((breakdown.analyze / 100) * totalQuestions),
    EVALUATE: Math.round((breakdown.evaluate / 100) * totalQuestions),
    CREATE: Math.round((breakdown.create / 100) * totalQuestions),
  };

  // Adjust for rounding errors to ensure total matches
  const currentTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const diff = totalQuestions - currentTotal;

  if (diff !== 0) {
    // Add or subtract from the level with highest percentage
    const levels = Object.entries(breakdown) as [
      keyof BloomsBreakdown,
      number,
    ][];
    levels.sort((a, b) => b[1] - a[1]);
    const topLevelEntry = levels[0];
    if (topLevelEntry) {
      const topLevel = topLevelEntry[0].toUpperCase() as BloomsLevel;
      counts[topLevel] += diff;
    }
  }

  return counts;
}

/**
 * Get the recommended question distribution for a given total
 *
 * @param totalQuestions - Total number of questions
 * @param customDistribution - Optional custom percentages
 * @returns Distribution with level, percentage, and count
 */
export function getRecommendedDistribution(
  totalQuestions: number,
  customDistribution?: Partial<BloomsBreakdown>
): BloomsDistribution[] {
  const breakdown: BloomsBreakdown = {
    remember: customDistribution?.remember ?? 15,
    understand: customDistribution?.understand ?? 20,
    apply: customDistribution?.apply ?? 20,
    analyze: customDistribution?.analyze ?? 20,
    evaluate: customDistribution?.evaluate ?? 15,
    create: customDistribution?.create ?? 10,
  };

  const counts = calculateCountsFromBreakdown(breakdown, totalQuestions);

  return BLOOMS_LEVELS.map((level) => ({
    level,
    percentage: breakdown[level.toLowerCase() as keyof BloomsBreakdown],
    count: counts[level],
  }));
}

/**
 * Calculate the average cognitive level from a breakdown
 * Returns a value between 1 and 6
 */
export function calculateAverageCognitiveLevel(
  breakdown: BloomsBreakdown
): number {
  const weightedSum =
    breakdown.remember * 1 +
    breakdown.understand * 2 +
    breakdown.apply * 3 +
    breakdown.analyze * 4 +
    breakdown.evaluate * 5 +
    breakdown.create * 6;

  const totalPercentage =
    breakdown.remember +
    breakdown.understand +
    breakdown.apply +
    breakdown.analyze +
    breakdown.evaluate +
    breakdown.create;

  if (totalPercentage === 0) {
    return 0;
  }

  return Math.round((weightedSum / totalPercentage) * 100) / 100;
}

/**
 * Calculate the percentage of higher-order thinking questions
 */
export function calculateHigherOrderPercentage(
  breakdown: BloomsBreakdown
): number {
  return (
    Math.round(
      (breakdown.analyze + breakdown.evaluate + breakdown.create) * 100
    ) / 100
  );
}

/**
 * Check if a breakdown is balanced (no level differs too much from target)
 *
 * @param breakdown - The breakdown to check
 * @param tolerance - Maximum allowed deviation from default (default: 15%)
 * @returns Whether the breakdown is considered balanced
 */
export function isBalancedBreakdown(
  breakdown: BloomsBreakdown,
  tolerance: number = 15
): boolean {
  const defaultDist = Object.fromEntries(
    DEFAULT_BLOOMS_DISTRIBUTION.map((d) => [
      d.level.toLowerCase(),
      d.percentage,
    ])
  ) as BloomsBreakdown;

  for (const level of BLOOMS_LEVELS) {
    const key = level.toLowerCase() as keyof BloomsBreakdown;
    const diff = Math.abs(breakdown[key] - defaultDist[key]);
    if (diff > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Get suggestions for improving balance in a breakdown
 */
export function getBalanceSuggestions(
  breakdown: BloomsBreakdown
): {
  level: BloomsLevel;
  suggestion: "increase" | "decrease";
  current: number;
  target: number;
}[] {
  const defaultDist = Object.fromEntries(
    DEFAULT_BLOOMS_DISTRIBUTION.map((d) => [
      d.level.toLowerCase(),
      d.percentage,
    ])
  ) as BloomsBreakdown;

  const suggestions: {
    level: BloomsLevel;
    suggestion: "increase" | "decrease";
    current: number;
    target: number;
  }[] = [];

  for (const level of BLOOMS_LEVELS) {
    const key = level.toLowerCase() as keyof BloomsBreakdown;
    const current = breakdown[key];
    const target = defaultDist[key];
    const diff = current - target;

    if (Math.abs(diff) > 10) {
      suggestions.push({
        level,
        suggestion: diff > 0 ? "decrease" : "increase",
        current,
        target,
      });
    }
  }

  return suggestions;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * All Bloom's taxonomy utilities for convenient importing
 */
export const bloomsUtils = {
  // Constants
  LEVELS: BLOOMS_LEVELS,
  LEVEL_INFO: BLOOMS_LEVEL_INFO,
  DEFAULT_DISTRIBUTION: DEFAULT_BLOOMS_DISTRIBUTION,
  HIGHER_ORDER_LEVELS,
  LOWER_ORDER_LEVELS,

  // Validation
  isValidLevel: isValidBloomsLevel,
  isHigherOrder: isHigherOrderLevel,
  isLowerOrder: isLowerOrderLevel,

  // Level info
  getLevelInfo: getBloomsLevelInfo,
  getCognitiveLevel,
  getLevelName: getBloomsLevelName,
  getLevelDescription: getBloomsLevelDescription,
  getLevelColor: getBloomsLevelColor,
  getKeywords: getBloomsKeywords,
  getQuestionStems: getBloomsQuestionStems,

  // Comparison
  compare: compareBloomsLevels,
  getNextHigher: getNextHigherLevel,
  getNextLower: getNextLowerLevel,
  getLevelsAtOrAbove,
  getLevelsAtOrBelow,

  // Categorization
  categorizeQuestion,
  categorizeQuestions,
  suggestKeywords: suggestKeywordsForLevel,
  getExampleStems: getExampleStemsForLevel,

  // Breakdown
  createEmptyBreakdown,
  calculateBreakdown: calculateBloomsBreakdown,
  calculateCounts: calculateCountsFromBreakdown,
  getRecommendedDistribution,
  calculateAverageCognitiveLevel,
  calculateHigherOrderPercentage,
  isBalanced: isBalancedBreakdown,
  getBalanceSuggestions,
} as const;
