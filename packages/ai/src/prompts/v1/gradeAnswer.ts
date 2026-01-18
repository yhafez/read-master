/**
 * Grade Answer Prompt Template v1
 *
 * AI-powered grading for short answer and essay responses
 * with detailed feedback.
 */

import {
  type UserContext,
  type PromptTemplate,
  getReadingLevelDescription,
  validateRequired,
  validateLength,
} from "../types.js";

// =============================================================================
// INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for answer grading
 */
export type GradeAnswerInput = {
  /** The question that was asked */
  question: string;
  /** The expected/model answer */
  expectedAnswer: string;
  /** The user's submitted answer */
  userAnswer: string;
  /** Maximum points for this question */
  maxPoints: number;
  /** Optional grading rubric */
  rubric?: Array<{
    criterion: string;
    maxPoints: number;
    description?: string;
  }>;
  /** Book title for context */
  bookTitle?: string;
};

/**
 * Output structure for graded answer
 */
export type GradeAnswerOutput = {
  /** Points awarded */
  pointsAwarded: number;
  /** Maximum possible points */
  maxPoints: number;
  /** Percentage score (0-100) */
  percentage: number;
  /** Overall feedback */
  feedback: string;
  /** What the student did well */
  strengths: string[];
  /** Areas for improvement */
  improvements: string[];
  /** Rubric scores if rubric was provided */
  rubricScores?: Array<{
    criterion: string;
    pointsAwarded: number;
    maxPoints: number;
    feedback: string;
  }>;
  /** Suggested revision for the answer */
  suggestedRevision?: string;
  /** Is the answer fundamentally correct? */
  isCorrect: boolean;
  /** Is the answer partially correct? */
  isPartiallyCorrect: boolean;
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Grade answer prompt template
 */
export const gradeAnswerPrompt: PromptTemplate<
  GradeAnswerInput,
  GradeAnswerOutput
> = {
  id: "grade-answer",
  version: "1.0.0",
  description:
    "AI-powered grading for short answer and essay responses with feedback",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are a fair and encouraging teacher grading student responses.
Your goal is to provide accurate grades and helpful feedback.

GRADING GUIDELINES:
- Be fair and consistent in grading
- Consider the student is ${levelDesc}
- Look for understanding, not just exact wording
- Give partial credit for partially correct answers
- Focus on concepts over grammar/spelling
- Be encouraging while honest about mistakes
- Provide specific, actionable feedback
${userContext.language ? `- Respond in ${userContext.language}` : ""}

SCORING PRINCIPLES:
- Full credit: Answer demonstrates complete understanding
- Partial credit: Answer shows some understanding but is incomplete
- Minimal credit: Answer attempts the question but misses key points
- No credit: Answer is incorrect, off-topic, or blank

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "pointsAwarded": 8,
  "maxPoints": 10,
  "percentage": 80,
  "feedback": "Overall feedback on the answer",
  "strengths": ["What was done well"],
  "improvements": ["What could be improved"],
  "rubricScores": [
    {
      "criterion": "Rubric criterion",
      "pointsAwarded": 4,
      "maxPoints": 5,
      "feedback": "Specific feedback for this criterion"
    }
  ],
  "suggestedRevision": "How the answer could be improved",
  "isCorrect": false,
  "isPartiallyCorrect": true
}`;
  },

  getUserPrompt: (input: GradeAnswerInput): string => {
    let prompt = `Please grade the following student response:

QUESTION:
${input.question}

EXPECTED ANSWER:
${input.expectedAnswer}

STUDENT'S ANSWER:
${input.userAnswer}

MAXIMUM POINTS: ${input.maxPoints}`;

    if (input.bookTitle) {
      prompt += `\n\nCONTEXT: This question is about the book "${input.bookTitle}"`;
    }

    if (input.rubric && input.rubric.length > 0) {
      prompt += "\n\nGRADING RUBRIC:";
      for (const item of input.rubric) {
        prompt += `\n- ${item.criterion} (${item.maxPoints} points)`;
        if (item.description) {
          prompt += `: ${item.description}`;
        }
      }
    }

    prompt += `

Grade this response fairly, considering understanding over exact wording.
Provide encouraging but honest feedback.
Respond with a valid JSON object following the specified format.`;

    return prompt;
  },

  parseResponse: (response: string): GradeAnswerOutput => {
    let jsonStr = response.trim();

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as GradeAnswerOutput;

      const pointsAwarded = Math.max(
        0,
        Math.min(parsed.maxPoints, parsed.pointsAwarded ?? 0)
      );
      const maxPoints = parsed.maxPoints ?? 10;
      const percentage = Math.round((pointsAwarded / maxPoints) * 100);

      const result: GradeAnswerOutput = {
        pointsAwarded,
        maxPoints,
        percentage,
        feedback: parsed.feedback ?? "No feedback provided",
        strengths: parsed.strengths ?? [],
        improvements: parsed.improvements ?? [],
        isCorrect: parsed.isCorrect ?? percentage >= 90,
        isPartiallyCorrect:
          parsed.isPartiallyCorrect ?? (percentage >= 50 && percentage < 90),
      };

      if (parsed.rubricScores) {
        result.rubricScores = parsed.rubricScores;
      }

      if (parsed.suggestedRevision) {
        result.suggestedRevision = parsed.suggestedRevision;
      }

      return result;
    } catch {
      return {
        pointsAwarded: 0,
        maxPoints: 10,
        percentage: 0,
        feedback: "Unable to grade response automatically",
        strengths: [],
        improvements: ["Please try again"],
        isCorrect: false,
        isPartiallyCorrect: false,
      };
    }
  },

  validateInput: (
    input: GradeAnswerInput
  ): { valid: boolean; error?: string } => {
    const requiredCheck = validateRequired(input, [
      "question",
      "expectedAnswer",
      "userAnswer",
      "maxPoints",
    ]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const questionCheck = validateLength(input.question, 5, 5000, "Question");
    if (!questionCheck.valid) {
      return questionCheck;
    }

    const answerCheck = validateLength(
      input.userAnswer,
      1,
      10000,
      "User answer"
    );
    if (!answerCheck.valid) {
      return answerCheck;
    }

    if (input.maxPoints <= 0) {
      return { valid: false, error: "Max points must be greater than 0" };
    }

    return { valid: true };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate grade answer prompt strings
 */
export function generateGradeAnswerPrompt(
  input: GradeAnswerInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: gradeAnswerPrompt.getSystemPrompt(userContext),
    user: gradeAnswerPrompt.getUserPrompt(input),
  };
}

/**
 * Parse grade answer response
 */
export function parseGradeAnswerResponse(response: string): GradeAnswerOutput {
  return gradeAnswerPrompt.parseResponse(response);
}

/**
 * Validate grade answer input
 */
export function validateGradeAnswerInput(input: GradeAnswerInput): {
  valid: boolean;
  error?: string;
} {
  return gradeAnswerPrompt.validateInput(input);
}

/**
 * Calculate letter grade from percentage
 */
export function percentageToLetterGrade(percentage: number): string {
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}
