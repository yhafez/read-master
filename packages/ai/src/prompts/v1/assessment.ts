/**
 * Assessment Prompt Template v1
 *
 * Generates comprehensive post-reading assessments that cover
 * all levels of Bloom's Taxonomy.
 */

import {
  type BookContext,
  type UserContext,
  type PromptTemplate,
  type BloomLevel,
  type QuestionType,
  getReadingLevelDescription,
  getBloomLevelDescription,
  formatBookContext,
  truncateContent,
  validateRequired,
  validateLength,
  BLOOM_LEVEL_DESCRIPTIONS,
} from "../types.js";

// =============================================================================
// INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for assessment generation
 */
export type AssessmentInput = {
  /** Book context */
  book: BookContext;
  /** Type of assessment */
  assessmentType: "quick" | "standard" | "comprehensive";
  /** Focus on specific Bloom's levels */
  focusLevels?: BloomLevel[];
  /** Number of questions to generate */
  questionCount?: number;
};

/**
 * Single assessment question
 */
export type AssessmentQuestion = {
  /** Unique question ID */
  id: string;
  /** The question text */
  question: string;
  /** Question type */
  type: QuestionType;
  /** Bloom's taxonomy level */
  bloomLevel: BloomLevel;
  /** Difficulty (1-5) */
  difficulty: number;
  /** Answer options (for multiple choice) */
  options?: Array<{
    id: string;
    text: string;
  }>;
  /** Correct answer */
  correctAnswer: string;
  /** Model answer for essay questions */
  modelAnswer?: string;
  /** Explanation */
  explanation: string;
  /** Points for this question */
  points: number;
  /** Grading rubric for open-ended questions */
  rubric?: Array<{
    criterion: string;
    maxPoints: number;
  }>;
};

/**
 * Output structure for assessment
 */
export type AssessmentOutput = {
  /** Assessment title */
  title: string;
  /** Assessment description */
  description: string;
  /** Estimated time to complete (minutes) */
  estimatedTime: number;
  /** Total possible points */
  totalPoints: number;
  /** Assessment questions */
  questions: AssessmentQuestion[];
  /** Distribution of Bloom's levels */
  bloomDistribution: Partial<Record<BloomLevel, number>>;
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Assessment prompt template
 */
export const assessmentPrompt: PromptTemplate<
  AssessmentInput,
  AssessmentOutput
> = {
  id: "assessment",
  version: "1.0.0",
  description:
    "Generate comprehensive post-reading assessments covering all Bloom's levels",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);
    const bloomsDesc = Object.entries(BLOOM_LEVEL_DESCRIPTIONS)
      .map(([level, desc]) => `  - ${level}: ${desc}`)
      .join("\n");

    return `You are an expert educational assessment designer creating reading comprehension tests.
Your goal is to create balanced assessments that test understanding at multiple cognitive levels.

IMPORTANT GUIDELINES:
- Design questions appropriate for ${levelDesc}
- Include questions at all Bloom's Taxonomy levels:
${bloomsDesc}
- Balance question types (multiple choice, short answer, essay)
- Make questions clear and unambiguous
- Provide detailed explanations and rubrics
- Focus on meaningful understanding, not trivia
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "title": "Assessment title",
  "description": "Brief description of what this assessment covers",
  "estimatedTime": 15,
  "totalPoints": 100,
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "type": "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank",
      "bloomLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
      "difficulty": 2,
      "options": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" }
      ],
      "correctAnswer": "a",
      "modelAnswer": "For essays, the ideal answer",
      "explanation": "Why this is correct",
      "points": 10,
      "rubric": [
        { "criterion": "Content accuracy", "maxPoints": 5 }
      ]
    }
  ],
  "bloomDistribution": {
    "remember": 2,
    "understand": 3,
    "apply": 2,
    "analyze": 2,
    "evaluate": 1,
    "create": 0
  }
}`;
  },

  getUserPrompt: (input: AssessmentInput): string => {
    const bookInfo = formatBookContext(input.book);
    const content = truncateContent(input.book.content, 8000);

    const questionCounts = {
      quick: 5,
      standard: 10,
      comprehensive: 20,
    };
    const count = input.questionCount ?? questionCounts[input.assessmentType];

    let focusGuidance = "";
    if (input.focusLevels && input.focusLevels.length > 0) {
      focusGuidance = `\nFocus more questions on these Bloom's levels: ${input.focusLevels.join(", ")}`;
    }

    return `Create a ${input.assessmentType} assessment (${count} questions) for the following book:

BOOK INFORMATION:
${bookInfo}

BOOK CONTENT:
${content}

Requirements:
1. Generate exactly ${count} questions
2. Include questions at multiple Bloom's Taxonomy levels
3. Mix question types (multiple choice, short answer, essay)
4. Ensure questions are answerable based on the provided content
5. Include clear explanations for all answers
6. For essay questions, include grading rubrics${focusGuidance}

Respond with a valid JSON object following the specified format.`;
  },

  parseResponse: (response: string): AssessmentOutput => {
    let jsonStr = response.trim();

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as AssessmentOutput;

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Missing questions array");
      }

      // Ensure all questions have required fields
      const questions = parsed.questions.map((q, index) => ({
        id: q.id ?? `q${index + 1}`,
        question: q.question ?? "Question text missing",
        type: q.type ?? "short_answer",
        bloomLevel: q.bloomLevel ?? "understand",
        difficulty: q.difficulty ?? 2,
        options: q.options,
        correctAnswer: q.correctAnswer ?? "",
        modelAnswer: q.modelAnswer,
        explanation: q.explanation ?? "No explanation provided",
        points: q.points ?? 10,
        rubric: q.rubric,
      })) as AssessmentQuestion[];

      // Calculate totals
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      // Calculate Bloom's distribution
      const bloomDistribution: Partial<Record<BloomLevel, number>> = {};
      for (const q of questions) {
        bloomDistribution[q.bloomLevel] =
          (bloomDistribution[q.bloomLevel] ?? 0) + 1;
      }

      return {
        title: parsed.title ?? "Reading Assessment",
        description: parsed.description ?? "Test your understanding",
        estimatedTime: parsed.estimatedTime ?? questions.length * 2,
        totalPoints,
        questions,
        bloomDistribution,
      };
    } catch {
      return {
        title: "Assessment Generation Failed",
        description: "Unable to parse assessment response",
        estimatedTime: 0,
        totalPoints: 0,
        questions: [],
        bloomDistribution: {},
      };
    }
  },

  validateInput: (
    input: AssessmentInput
  ): { valid: boolean; error?: string } => {
    const requiredCheck = validateRequired(input, ["book", "assessmentType"]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const bookCheck = validateRequired(input.book, [
      "title",
      "author",
      "content",
    ]);
    if (!bookCheck.valid) {
      return bookCheck;
    }

    const lengthCheck = validateLength(
      input.book.content,
      100,
      100000,
      "Book content"
    );
    if (!lengthCheck.valid) {
      return lengthCheck;
    }

    const validTypes = ["quick", "standard", "comprehensive"];
    if (!validTypes.includes(input.assessmentType)) {
      return {
        valid: false,
        error: `Invalid assessment type: ${input.assessmentType}`,
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate assessment prompt strings
 */
export function generateAssessmentPrompt(
  input: AssessmentInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: assessmentPrompt.getSystemPrompt(userContext),
    user: assessmentPrompt.getUserPrompt(input),
  };
}

/**
 * Parse assessment response
 */
export function parseAssessmentResponse(response: string): AssessmentOutput {
  return assessmentPrompt.parseResponse(response);
}

/**
 * Validate assessment input
 */
export function validateAssessmentInput(input: AssessmentInput): {
  valid: boolean;
  error?: string;
} {
  return assessmentPrompt.validateInput(input);
}

/**
 * Get bloom level description
 */
export { getBloomLevelDescription };
