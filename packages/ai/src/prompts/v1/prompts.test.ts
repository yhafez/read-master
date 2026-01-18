/**
 * Tests for AI Prompt Templates v1
 */

import { describe, it, expect } from "vitest";
import type { UserContext, BookContext } from "../types.js";
import {
  // Pre-Reading Guide
  preReadingGuidePrompt,
  generatePreReadingGuidePrompt,
  parsePreReadingGuideResponse,
  validatePreReadingGuideInput,
  // Explain
  explainPrompt,
  generateExplainPrompt,
  parseExplainResponse,
  // Comprehension Check
  comprehensionCheckPrompt,
  generateComprehensionCheckPrompt,
  parseComprehensionCheckResponse,
  // Assessment
  assessmentPrompt,
  generateAssessmentPrompt,
  parseAssessmentResponse,
  getBloomLevelDescription,
  // Grade Answer
  gradeAnswerPrompt,
  generateGradeAnswerPrompt,
  parseGradeAnswerResponse,
  percentageToLetterGrade,
  // Generate Flashcards
  generateFlashcardsPrompt,
  generateFlashcardsPromptStrings,
  parseFlashcardsResponse,
  getFlashcardTypeDescription,
  FLASHCARD_TYPE_DESCRIPTIONS,
} from "./index.js";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const testUserContext: UserContext = {
  readingLevel: "middle_school",
  language: "en",
  name: "Test User",
};

const testBookContext: BookContext = {
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  genre: "Fiction",
  description: "A story about the American Dream",
  content:
    "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. Whenever you feel like criticizing anyone, he told me, just remember that all the people in this world haven't had the advantages that you've had.",
};

// =============================================================================
// PRE-READING GUIDE TESTS
// =============================================================================

describe("preReadingGuidePrompt", () => {
  it("should have correct metadata", () => {
    expect(preReadingGuidePrompt.id).toBe("pre-reading-guide");
    expect(preReadingGuidePrompt.version).toBe("1.0.0");
    expect(preReadingGuidePrompt.description).toBeDefined();
  });

  it("should generate system prompt with reading level", () => {
    const systemPrompt = preReadingGuidePrompt.getSystemPrompt(testUserContext);
    expect(systemPrompt).toContain("middle school");
    expect(systemPrompt).toContain("JSON");
  });

  it("should generate user prompt with book info", () => {
    const input = { book: testBookContext };
    const userPrompt = preReadingGuidePrompt.getUserPrompt(input);
    expect(userPrompt).toContain("The Great Gatsby");
    expect(userPrompt).toContain("F. Scott Fitzgerald");
  });

  it("should validate input correctly", () => {
    const validInput = { book: testBookContext };
    expect(preReadingGuidePrompt.validateInput(validInput).valid).toBe(true);

    const invalidInput = { book: { title: "", author: "", content: "" } };
    expect(preReadingGuidePrompt.validateInput(invalidInput).valid).toBe(false);
  });

  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      overview: {
        summary: "A story about the American Dream",
        themes: ["wealth", "love", "decay"],
        targetAudience: "High school students",
      },
      keyConcepts: [
        {
          term: "American Dream",
          definition: "The ideal",
          relevance: "Central theme",
        },
      ],
      context: { historicalContext: "1920s America" },
      guidingQuestions: ["What is the American Dream?"],
      vocabulary: [{ word: "vulnerable", definition: "open to harm" }],
      readingTips: ["Pay attention to symbolism"],
    });

    const result = parsePreReadingGuideResponse(response);
    expect(result.overview.summary).toBeDefined();
    expect(result.overview.themes).toHaveLength(3);
    expect(result.keyConcepts).toHaveLength(1);
  });

  it("should handle malformed JSON gracefully", () => {
    const result = parsePreReadingGuideResponse("not valid json");
    expect(result.overview.summary).toBeDefined();
    expect(result.keyConcepts).toEqual([]);
  });
});

describe("generatePreReadingGuidePrompt", () => {
  it("should return system and user prompts", () => {
    const result = generatePreReadingGuidePrompt(
      { book: testBookContext },
      testUserContext
    );
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.system.length).toBeGreaterThan(100);
    expect(result.user.length).toBeGreaterThan(100);
  });
});

describe("validatePreReadingGuideInput", () => {
  it("should validate complete input", () => {
    const result = validatePreReadingGuideInput({ book: testBookContext });
    expect(result.valid).toBe(true);
  });

  it("should reject missing content", () => {
    const result = validatePreReadingGuideInput({
      book: { title: "Test", author: "Author", content: "" },
    });
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// EXPLAIN PROMPT TESTS
// =============================================================================

describe("explainPrompt", () => {
  it("should have correct metadata", () => {
    expect(explainPrompt.id).toBe("explain");
    expect(explainPrompt.version).toBe("1.0.0");
  });

  it("should generate system prompt", () => {
    const systemPrompt = explainPrompt.getSystemPrompt(testUserContext);
    expect(systemPrompt).toContain("reading assistant");
    expect(systemPrompt).toContain("middle school");
  });

  it("should generate user prompt with selected text", () => {
    const input = {
      selectedText: "vulnerable years",
      book: testBookContext,
    };
    const userPrompt = explainPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("vulnerable years");
    expect(userPrompt).toContain("The Great Gatsby");
  });

  it("should include surrounding context when provided", () => {
    const input = {
      selectedText: "test text",
      surroundingContext: "some context before and after",
      book: testBookContext,
    };
    const userPrompt = explainPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("some context before and after");
  });

  it("should validate input correctly", () => {
    const validInput = { selectedText: "test", book: testBookContext };
    expect(explainPrompt.validateInput(validInput).valid).toBe(true);

    const invalidInput = { selectedText: "", book: testBookContext };
    expect(explainPrompt.validateInput(invalidInput).valid).toBe(false);
  });

  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      explanation: "This means being open to harm",
      keyTerms: [{ term: "vulnerable", definition: "open to harm" }],
      significance: "Important character trait",
      relatedConcepts: ["innocence", "youth"],
      followUpQuestions: ["Why does this matter?"],
    });

    const result = parseExplainResponse(response);
    expect(result.explanation).toBeDefined();
    expect(result.keyTerms).toHaveLength(1);
  });

  it("should handle plain text response", () => {
    const result = parseExplainResponse("Just a plain explanation");
    expect(result.explanation).toBe("Just a plain explanation");
  });
});

describe("generateExplainPrompt", () => {
  it("should return prompts", () => {
    const result = generateExplainPrompt(
      { selectedText: "test", book: testBookContext },
      testUserContext
    );
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
  });
});

// =============================================================================
// COMPREHENSION CHECK TESTS
// =============================================================================

describe("comprehensionCheckPrompt", () => {
  it("should have correct metadata", () => {
    expect(comprehensionCheckPrompt.id).toBe("comprehension-check");
    expect(comprehensionCheckPrompt.version).toBe("1.0.0");
  });

  it("should generate system prompt", () => {
    const systemPrompt =
      comprehensionCheckPrompt.getSystemPrompt(testUserContext);
    expect(systemPrompt).toContain("comprehension");
    expect(systemPrompt).toContain("multiple_choice");
  });

  it("should generate user prompt", () => {
    const input = {
      recentContent: testBookContext.content,
      book: testBookContext,
      questionType: "multiple_choice" as const,
    };
    const userPrompt = comprehensionCheckPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("multiple choice");
    expect(userPrompt).toContain("vulnerable years");
  });

  it("should validate input correctly", () => {
    const validInput = {
      recentContent: testBookContext.content,
      book: testBookContext,
    };
    expect(comprehensionCheckPrompt.validateInput(validInput).valid).toBe(true);

    const invalidInput = {
      recentContent: "too short",
      book: testBookContext,
    };
    expect(comprehensionCheckPrompt.validateInput(invalidInput).valid).toBe(
      false
    );
  });

  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      question: "What advice did the narrator's father give?",
      type: "multiple_choice",
      options: [
        { id: "a", text: "Option A", isCorrect: false },
        { id: "b", text: "Remember others' disadvantages", isCorrect: true },
      ],
      correctAnswer: "b",
      explanation: "The father advised about not criticizing",
      difficulty: 2,
    });

    const result = parseComprehensionCheckResponse(response);
    expect(result.question).toBeDefined();
    expect(result.correctAnswer).toBe("b");
    expect(result.type).toBe("multiple_choice");
  });
});

describe("generateComprehensionCheckPrompt", () => {
  it("should return prompts", () => {
    const result = generateComprehensionCheckPrompt(
      { recentContent: testBookContext.content, book: testBookContext },
      testUserContext
    );
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
  });
});

// =============================================================================
// ASSESSMENT TESTS
// =============================================================================

describe("assessmentPrompt", () => {
  it("should have correct metadata", () => {
    expect(assessmentPrompt.id).toBe("assessment");
    expect(assessmentPrompt.version).toBe("1.0.0");
  });

  it("should generate system prompt with Bloom's levels", () => {
    const systemPrompt = assessmentPrompt.getSystemPrompt(testUserContext);
    expect(systemPrompt).toContain("remember");
    expect(systemPrompt).toContain("understand");
    expect(systemPrompt).toContain("analyze");
    expect(systemPrompt).toContain("create");
  });

  it("should generate user prompt based on assessment type", () => {
    const input = {
      book: testBookContext,
      assessmentType: "standard" as const,
    };
    const userPrompt = assessmentPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("10 questions");
  });

  it("should validate input correctly", () => {
    const validInput = {
      book: testBookContext,
      assessmentType: "quick" as const,
    };
    expect(assessmentPrompt.validateInput(validInput).valid).toBe(true);

    const invalidInput = {
      book: testBookContext,
      assessmentType: "invalid" as "quick",
    };
    expect(assessmentPrompt.validateInput(invalidInput).valid).toBe(false);
  });

  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      title: "Reading Assessment",
      description: "Test your understanding",
      estimatedTime: 15,
      totalPoints: 50,
      questions: [
        {
          id: "q1",
          question: "What advice was given?",
          type: "short_answer",
          bloomLevel: "remember",
          difficulty: 2,
          correctAnswer: "Don't criticize others",
          explanation: "The narrator's father advised...",
          points: 10,
        },
      ],
      bloomDistribution: { remember: 1 },
    });

    const result = parseAssessmentResponse(response);
    expect(result.title).toBeDefined();
    expect(result.questions).toHaveLength(1);
    const firstQuestion = result.questions[0];
    expect(firstQuestion).toBeDefined();
    expect(firstQuestion?.bloomLevel).toBe("remember");
  });
});

describe("getBloomLevelDescription", () => {
  it("should return description for each level", () => {
    expect(getBloomLevelDescription("remember")).toContain("Recall");
    expect(getBloomLevelDescription("create")).toContain("Produce");
  });
});

describe("generateAssessmentPrompt", () => {
  it("should return prompts", () => {
    const result = generateAssessmentPrompt(
      { book: testBookContext, assessmentType: "quick" },
      testUserContext
    );
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
  });
});

// =============================================================================
// GRADE ANSWER TESTS
// =============================================================================

describe("gradeAnswerPrompt", () => {
  it("should have correct metadata", () => {
    expect(gradeAnswerPrompt.id).toBe("grade-answer");
    expect(gradeAnswerPrompt.version).toBe("1.0.0");
  });

  it("should generate system prompt", () => {
    const systemPrompt = gradeAnswerPrompt.getSystemPrompt(testUserContext);
    expect(systemPrompt).toContain("fair");
    expect(systemPrompt).toContain("encouraging");
    expect(systemPrompt).toContain("partial credit");
  });

  it("should generate user prompt", () => {
    const input = {
      question: "What was the advice?",
      expectedAnswer: "Don't criticize others",
      userAnswer: "Don't judge people",
      maxPoints: 10,
    };
    const userPrompt = gradeAnswerPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("What was the advice?");
    expect(userPrompt).toContain("Don't judge people");
    expect(userPrompt).toContain("10");
  });

  it("should include rubric when provided", () => {
    const input = {
      question: "Test question",
      expectedAnswer: "Expected",
      userAnswer: "Student answer",
      maxPoints: 10,
      rubric: [
        { criterion: "Content accuracy", maxPoints: 5 },
        { criterion: "Clarity", maxPoints: 5 },
      ],
    };
    const userPrompt = gradeAnswerPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("Content accuracy");
    expect(userPrompt).toContain("5 points");
  });

  it("should validate input correctly", () => {
    const validInput = {
      question: "Test?",
      expectedAnswer: "Yes",
      userAnswer: "Yes",
      maxPoints: 10,
    };
    expect(gradeAnswerPrompt.validateInput(validInput).valid).toBe(true);

    const invalidInput = {
      question: "Test?",
      expectedAnswer: "Yes",
      userAnswer: "Yes",
      maxPoints: 0,
    };
    expect(gradeAnswerPrompt.validateInput(invalidInput).valid).toBe(false);
  });

  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      pointsAwarded: 8,
      maxPoints: 10,
      percentage: 80,
      feedback: "Good answer",
      strengths: ["Clear understanding"],
      improvements: ["Could add more detail"],
      isCorrect: false,
      isPartiallyCorrect: true,
    });

    const result = parseGradeAnswerResponse(response);
    expect(result.pointsAwarded).toBe(8);
    expect(result.percentage).toBe(80);
    expect(result.strengths).toHaveLength(1);
  });
});

describe("percentageToLetterGrade", () => {
  it("should return correct letter grades", () => {
    expect(percentageToLetterGrade(95)).toBe("A");
    expect(percentageToLetterGrade(91)).toBe("A-");
    expect(percentageToLetterGrade(88)).toBe("B+");
    expect(percentageToLetterGrade(85)).toBe("B");
    expect(percentageToLetterGrade(80)).toBe("B-");
    expect(percentageToLetterGrade(75)).toBe("C");
    expect(percentageToLetterGrade(65)).toBe("D");
    expect(percentageToLetterGrade(55)).toBe("F");
  });
});

describe("generateGradeAnswerPrompt", () => {
  it("should return prompts", () => {
    const result = generateGradeAnswerPrompt(
      {
        question: "Q",
        expectedAnswer: "A",
        userAnswer: "B",
        maxPoints: 10,
      },
      testUserContext
    );
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
  });
});

// =============================================================================
// GENERATE FLASHCARDS TESTS
// =============================================================================

describe("generateFlashcardsPrompt", () => {
  it("should have correct metadata", () => {
    expect(generateFlashcardsPrompt.id).toBe("generate-flashcards");
    expect(generateFlashcardsPrompt.version).toBe("1.0.0");
  });

  it("should generate system prompt", () => {
    const systemPrompt =
      generateFlashcardsPrompt.getSystemPrompt(testUserContext);
    expect(systemPrompt).toContain("flashcard");
    expect(systemPrompt).toContain("vocabulary");
    expect(systemPrompt).toContain("concept");
  });

  it("should generate user prompt", () => {
    const input = {
      content: testBookContext.content,
      book: testBookContext,
      cardTypes: ["vocabulary", "concept"] as ("vocabulary" | "concept")[],
      cardCount: 5,
    };
    const userPrompt = generateFlashcardsPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("5 flashcards");
    expect(userPrompt).toContain("vocabulary, concept");
  });

  it("should include existing cards to avoid duplicates", () => {
    const input = {
      content: testBookContext.content,
      book: testBookContext,
      cardTypes: ["vocabulary"] as "vocabulary"[],
      existingCards: ["What is vulnerable?", "Define narrator"],
    };
    const userPrompt = generateFlashcardsPrompt.getUserPrompt(input);
    expect(userPrompt).toContain("EXISTING CARDS");
    expect(userPrompt).toContain("What is vulnerable?");
  });

  it("should validate input correctly", () => {
    const validInput = {
      content: testBookContext.content,
      book: testBookContext,
      cardTypes: ["vocabulary"] as "vocabulary"[],
    };
    expect(generateFlashcardsPrompt.validateInput(validInput).valid).toBe(true);

    const invalidInput = {
      content: testBookContext.content,
      book: testBookContext,
      cardTypes: [],
    };
    expect(generateFlashcardsPrompt.validateInput(invalidInput).valid).toBe(
      false
    );

    const invalidTypeInput = {
      content: testBookContext.content,
      book: testBookContext,
      cardTypes: ["invalid"] as unknown as "vocabulary"[],
    };
    expect(generateFlashcardsPrompt.validateInput(invalidTypeInput).valid).toBe(
      false
    );
  });

  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      flashcards: [
        {
          type: "vocabulary",
          front: "What does 'vulnerable' mean?",
          back: "Open to harm or attack",
          tags: ["vocabulary", "chapter1"],
          difficulty: 2,
        },
        {
          type: "concept",
          front: "What is the narrator's attitude?",
          back: "Reflective and non-judgmental",
          tags: ["character", "narrator"],
          difficulty: 3,
        },
      ],
      summary: {
        totalCards: 2,
        byType: { vocabulary: 1, concept: 1 },
        averageDifficulty: 2.5,
      },
    });

    const result = parseFlashcardsResponse(response);
    expect(result.flashcards).toHaveLength(2);
    expect(result.summary.totalCards).toBe(2);
    const firstCard = result.flashcards[0];
    expect(firstCard).toBeDefined();
    expect(firstCard?.type).toBe("vocabulary");
  });

  it("should calculate summary from flashcards", () => {
    const response = JSON.stringify({
      flashcards: [
        {
          type: "vocabulary",
          front: "Q1",
          back: "A1",
          tags: [],
          difficulty: 2,
        },
        {
          type: "vocabulary",
          front: "Q2",
          back: "A2",
          tags: [],
          difficulty: 4,
        },
      ],
    });

    const result = parseFlashcardsResponse(response);
    expect(result.summary.totalCards).toBe(2);
    expect(result.summary.byType.vocabulary).toBe(2);
    expect(result.summary.averageDifficulty).toBe(3);
  });
});

describe("FLASHCARD_TYPE_DESCRIPTIONS", () => {
  it("should have descriptions for all types", () => {
    expect(FLASHCARD_TYPE_DESCRIPTIONS.vocabulary).toBeDefined();
    expect(FLASHCARD_TYPE_DESCRIPTIONS.concept).toBeDefined();
    expect(FLASHCARD_TYPE_DESCRIPTIONS.comprehension).toBeDefined();
    expect(FLASHCARD_TYPE_DESCRIPTIONS.quote).toBeDefined();
  });
});

describe("getFlashcardTypeDescription", () => {
  it("should return correct descriptions", () => {
    expect(getFlashcardTypeDescription("vocabulary")).toContain("words");
    expect(getFlashcardTypeDescription("concept")).toContain("ideas");
  });
});

describe("generateFlashcardsPromptStrings", () => {
  it("should return prompts", () => {
    const result = generateFlashcardsPromptStrings(
      {
        content: testBookContext.content,
        book: testBookContext,
        cardTypes: ["vocabulary"],
      },
      testUserContext
    );
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge cases", () => {
  it("should handle markdown code blocks in responses", () => {
    const response = '```json\n{"explanation": "test"}\n```';
    const result = parseExplainResponse(response);
    expect(result.explanation).toBe("test");
  });

  it("should handle responses with extra whitespace", () => {
    const response = '  \n  {"explanation": "test"}  \n  ';
    const result = parseExplainResponse(response);
    expect(result.explanation).toBe("test");
  });

  it("should provide defaults for missing optional fields", () => {
    const response = JSON.stringify({
      explanation: "Just the explanation",
    });
    const result = parseExplainResponse(response);
    expect(result.keyTerms).toEqual([]);
    expect(result.relatedConcepts).toEqual([]);
    expect(result.followUpQuestions).toEqual([]);
  });

  it("should clamp difficulty values to valid range", () => {
    const response = JSON.stringify({
      flashcards: [
        { type: "vocabulary", front: "Q", back: "A", tags: [], difficulty: 10 },
        { type: "vocabulary", front: "Q", back: "A", tags: [], difficulty: -5 },
      ],
    });
    const result = parseFlashcardsResponse(response);
    const firstCard = result.flashcards[0];
    const secondCard = result.flashcards[1];
    expect(firstCard).toBeDefined();
    expect(secondCard).toBeDefined();
    expect(firstCard?.difficulty).toBe(5);
    expect(secondCard?.difficulty).toBe(1);
  });

  it("should include language in prompts when specified", () => {
    const userContext: UserContext = {
      readingLevel: "middle_school",
      language: "Spanish",
    };
    const systemPrompt = explainPrompt.getSystemPrompt(userContext);
    expect(systemPrompt).toContain("Spanish");
  });
});
