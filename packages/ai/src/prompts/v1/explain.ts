/**
 * Explain Text Prompt Template v1
 *
 * Generates contextual explanations for selected text
 * during reading to help readers understand difficult passages.
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
 * Input for text explanation
 */
export type ExplainInput = {
  /** The text the user selected */
  selectedText: string;
  /** Surrounding context (text before and after selection) */
  surroundingContext?: string;
  /** Book context */
  book: BookContext;
  /** Optional specific question about the text */
  question?: string;
};

/**
 * Output structure for explanation
 */
export type ExplainOutput = {
  /** Main explanation of the selected text */
  explanation: string;
  /** Key terms explained */
  keyTerms?: Array<{
    term: string;
    definition: string;
  }>;
  /** Why this passage is significant */
  significance?: string;
  /** Related concepts to explore */
  relatedConcepts?: string[];
  /** Follow-up questions for deeper understanding */
  followUpQuestions?: string[];
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Explain text prompt template
 */
export const explainPrompt: PromptTemplate<ExplainInput, ExplainOutput> = {
  id: "explain",
  version: "1.0.0",
  description:
    "Generate contextual explanations for selected text during reading",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are a helpful reading assistant explaining text to readers.
Your goal is to help readers understand difficult or unclear passages.

IMPORTANT GUIDELINES:
- Adapt your explanation for ${levelDesc}
- Be clear and concise - avoid unnecessary complexity
- Connect the explanation to the broader context of the book
- Use analogies and examples when helpful
- Don't spoil future plot points if this is fiction
- Explain any technical terms or references
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "explanation": "Clear explanation of the selected text (2-4 paragraphs)",
  "keyTerms": [
    { "term": "word or phrase", "definition": "clear definition" }
  ],
  "significance": "Why this passage is important (optional)",
  "relatedConcepts": ["concept1", "concept2"],
  "followUpQuestions": ["Question for deeper thinking"]
}

Focus on helping the reader truly understand, not just defining words.`;
  },

  getUserPrompt: (input: ExplainInput): string => {
    const bookInfo = formatBookContext(input.book);
    const context = input.surroundingContext
      ? truncateContent(input.surroundingContext, 2000)
      : "";

    let prompt = `Please explain the following text from the book:

BOOK INFORMATION:
${bookInfo}

SELECTED TEXT:
"${input.selectedText}"`;

    if (context) {
      prompt += `

SURROUNDING CONTEXT:
${context}`;
    }

    if (input.question) {
      prompt += `

SPECIFIC QUESTION:
${input.question}`;
    }

    prompt += `

Please provide a clear explanation that helps the reader understand this text.
Respond with a valid JSON object following the specified format.`;

    return prompt;
  },

  parseResponse: (response: string): ExplainOutput => {
    let jsonStr = response.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as ExplainOutput;

      if (!parsed.explanation) {
        throw new Error("Missing explanation");
      }

      const result: ExplainOutput = {
        explanation: parsed.explanation,
        keyTerms: parsed.keyTerms ?? [],
        relatedConcepts: parsed.relatedConcepts ?? [],
        followUpQuestions: parsed.followUpQuestions ?? [],
      };

      if (parsed.significance) {
        result.significance = parsed.significance;
      }

      return result;
    } catch {
      // Fallback: treat the whole response as the explanation
      return {
        explanation: response,
        keyTerms: [],
        relatedConcepts: [],
        followUpQuestions: [],
      };
    }
  },

  validateInput: (input: ExplainInput): { valid: boolean; error?: string } => {
    const requiredCheck = validateRequired(input, ["selectedText", "book"]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const lengthCheck = validateLength(
      input.selectedText,
      1,
      5000,
      "Selected text"
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
 * Generate explain prompt strings
 */
export function generateExplainPrompt(
  input: ExplainInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: explainPrompt.getSystemPrompt(userContext),
    user: explainPrompt.getUserPrompt(input),
  };
}

/**
 * Parse explain response
 */
export function parseExplainResponse(response: string): ExplainOutput {
  return explainPrompt.parseResponse(response);
}

/**
 * Validate explain input
 */
export function validateExplainInput(input: ExplainInput): {
  valid: boolean;
  error?: string;
} {
  return explainPrompt.validateInput(input);
}
