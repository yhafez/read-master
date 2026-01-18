/**
 * Comprehension Check Prompt Template v1
 *
 * Generates quick comprehension check questions during reading
 * to help readers verify their understanding.
 */

import {
  type BookContext,
  type UserContext,
  type PromptTemplate,
  getReadingLevelDescription,
  formatBookContext,
  truncateContent,
  validateRequired,
  validateLength,
} from "../types.js";

// =============================================================================
// INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for comprehension check generation
 */
export type ComprehensionCheckInput = {
  /** Recently read content */
  recentContent: string;
  /** Book context */
  book: BookContext;
  /** Question type preference */
  questionType?: "multiple_choice" | "true_false" | "short_answer";
};

/**
 * Output structure for comprehension check
 */
export type ComprehensionCheckOutput = {
  /** The question */
  question: string;
  /** Question type */
  type: "multiple_choice" | "true_false" | "short_answer";
  /** Answer options (for multiple choice) */
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  /** Correct answer (for true/false or short answer) */
  correctAnswer: string;
  /** Explanation of why this is the answer */
  explanation: string;
  /** Difficulty level (1-5) */
  difficulty: number;
  /** Where in the text the answer can be found */
  textReference?: string;
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Comprehension check prompt template
 */
export const comprehensionCheckPrompt: PromptTemplate<
  ComprehensionCheckInput,
  ComprehensionCheckOutput
> = {
  id: "comprehension-check",
  version: "1.0.0",
  description: "Generate quick comprehension check questions during reading",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are a reading comprehension coach creating quick check questions.
Your goal is to help readers verify they understood what they just read.

IMPORTANT GUIDELINES:
- Create questions appropriate for ${levelDesc}
- Focus on key concepts, not trivial details
- Questions should be answerable from the provided text
- Be encouraging - this is a learning tool, not a test
- Avoid trick questions or ambiguous wording
- Include clear explanations with answers
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "question": "Clear comprehension question",
  "type": "multiple_choice" | "true_false" | "short_answer",
  "options": [
    { "id": "a", "text": "Option A", "isCorrect": false },
    { "id": "b", "text": "Option B", "isCorrect": true },
    { "id": "c", "text": "Option C", "isCorrect": false },
    { "id": "d", "text": "Option D", "isCorrect": false }
  ],
  "correctAnswer": "b",
  "explanation": "Why this is the correct answer",
  "difficulty": 2,
  "textReference": "Specific text that supports the answer"
}

For true_false: options should have two items, correctAnswer is "true" or "false".
For short_answer: options is omitted, correctAnswer is the expected response.`;
  },

  getUserPrompt: (input: ComprehensionCheckInput): string => {
    const bookInfo = formatBookContext(input.book);
    const content = truncateContent(input.recentContent, 4000);
    const questionType = input.questionType ?? "multiple_choice";

    return `Generate a ${questionType.replace("_", " ")} comprehension question for the following text:

BOOK INFORMATION:
${bookInfo}

RECENTLY READ CONTENT:
${content}

Create a question that:
1. Tests understanding of a key concept or event from this text
2. Has a clear, unambiguous answer
3. Helps reinforce what the reader should have learned

Respond with a valid JSON object following the specified format.`;
  },

  parseResponse: (response: string): ComprehensionCheckOutput => {
    let jsonStr = response.trim();

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as ComprehensionCheckOutput;

      if (!parsed.question || !parsed.correctAnswer) {
        throw new Error("Missing required fields");
      }

      const result: ComprehensionCheckOutput = {
        question: parsed.question,
        type: parsed.type ?? "multiple_choice",
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation ?? "No explanation provided",
        difficulty: parsed.difficulty ?? 2,
      };

      if (parsed.options) {
        result.options = parsed.options;
      }

      if (parsed.textReference) {
        result.textReference = parsed.textReference;
      }

      return result;
    } catch {
      return {
        question: "Unable to generate question",
        type: "short_answer",
        correctAnswer: "Unable to parse response",
        explanation: response,
        difficulty: 1,
      };
    }
  },

  validateInput: (
    input: ComprehensionCheckInput
  ): { valid: boolean; error?: string } => {
    const requiredCheck = validateRequired(input, ["recentContent", "book"]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const lengthCheck = validateLength(
      input.recentContent,
      50,
      50000,
      "Recent content"
    );
    if (!lengthCheck.valid) {
      return lengthCheck;
    }

    return { valid: true };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate comprehension check prompt strings
 */
export function generateComprehensionCheckPrompt(
  input: ComprehensionCheckInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: comprehensionCheckPrompt.getSystemPrompt(userContext),
    user: comprehensionCheckPrompt.getUserPrompt(input),
  };
}

/**
 * Parse comprehension check response
 */
export function parseComprehensionCheckResponse(
  response: string
): ComprehensionCheckOutput {
  return comprehensionCheckPrompt.parseResponse(response);
}

/**
 * Validate comprehension check input
 */
export function validateComprehensionCheckInput(
  input: ComprehensionCheckInput
): { valid: boolean; error?: string } {
  return comprehensionCheckPrompt.validateInput(input);
}
