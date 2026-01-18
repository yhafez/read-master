/**
 * Ask Question Prompt Template v1
 *
 * Generates answers to user questions about selected text
 * or the book in general, maintaining context for meaningful responses.
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
 * Input for asking questions about text/book
 */
export type AskInput = {
  /** The user's question */
  question: string;
  /** Optional selected text for context */
  selectedText?: string;
  /** Surrounding context (text before and after selection) */
  surroundingContext?: string;
  /** Book context */
  book: BookContext;
  /** Previous conversation messages for multi-turn context */
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

/**
 * Output structure for question answer
 */
export type AskOutput = {
  /** The main answer to the question */
  answer: string;
  /** Relevant quotes from the text that support the answer */
  supportingQuotes?: string[];
  /** Additional context or clarification */
  additionalContext?: string;
  /** Related topics the user might want to explore */
  relatedTopics?: string[];
  /** Follow-up questions for deeper exploration */
  suggestedFollowUps?: string[];
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Ask question prompt template
 */
export const askPrompt: PromptTemplate<AskInput, AskOutput> = {
  id: "ask",
  version: "1.0.0",
  description:
    "Answer user questions about selected text or the book, maintaining context",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are a knowledgeable reading assistant helping readers understand books.
Your goal is to answer questions about the text, characters, themes, and concepts.

IMPORTANT GUIDELINES:
- Adapt your response for ${levelDesc}
- Be accurate and base answers on the provided text context when available
- If the question is about something not in the provided context, use your knowledge but clarify this
- Don't spoil future plot points if this is fiction (unless the user asks)
- Provide thoughtful, educational responses that enhance understanding
- If you're unsure, say so rather than making things up
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "answer": "Clear, comprehensive answer to the question (1-4 paragraphs)",
  "supportingQuotes": ["Relevant quote from the text"],
  "additionalContext": "Any helpful background or clarification (optional)",
  "relatedTopics": ["topic1", "topic2"],
  "suggestedFollowUps": ["Follow-up question 1", "Follow-up question 2"]
}

Focus on helping the reader gain deeper understanding and appreciation of the text.`;
  },

  getUserPrompt: (input: AskInput): string => {
    const bookInfo = formatBookContext(input.book);
    let prompt = `Please answer the following question about the book:

BOOK INFORMATION:
${bookInfo}

QUESTION:
${input.question}`;

    if (input.selectedText) {
      prompt += `

SELECTED TEXT (context for the question):
"${truncateContent(input.selectedText, 3000)}"`;
    }

    if (input.surroundingContext) {
      prompt += `

SURROUNDING CONTEXT:
${truncateContent(input.surroundingContext, 2000)}`;
    }

    if (input.conversationHistory && input.conversationHistory.length > 0) {
      const recentHistory = input.conversationHistory.slice(-5); // Keep last 5 messages
      const historyText = recentHistory
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");

      prompt += `

PREVIOUS CONVERSATION:
${historyText}`;
    }

    prompt += `

Please provide a helpful answer based on the text and context provided.
Respond with a valid JSON object following the specified format.`;

    return prompt;
  },

  parseResponse: (response: string): AskOutput => {
    let jsonStr = response.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as AskOutput;

      if (!parsed.answer) {
        throw new Error("Missing answer");
      }

      const result: AskOutput = {
        answer: parsed.answer,
        supportingQuotes: parsed.supportingQuotes ?? [],
        relatedTopics: parsed.relatedTopics ?? [],
        suggestedFollowUps: parsed.suggestedFollowUps ?? [],
      };

      if (parsed.additionalContext) {
        result.additionalContext = parsed.additionalContext;
      }

      return result;
    } catch {
      // Fallback: treat the whole response as the answer
      return {
        answer: response,
        supportingQuotes: [],
        relatedTopics: [],
        suggestedFollowUps: [],
      };
    }
  },

  validateInput: (input: AskInput): { valid: boolean; error?: string } => {
    const requiredCheck = validateRequired(input, ["question", "book"]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const lengthCheck = validateLength(input.question, 1, 1000, "Question");
    if (!lengthCheck.valid) {
      return lengthCheck;
    }

    if (input.selectedText) {
      const selectedTextCheck = validateLength(
        input.selectedText,
        1,
        10000,
        "Selected text"
      );
      if (!selectedTextCheck.valid) {
        return selectedTextCheck;
      }
    }

    return { valid: true };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate ask prompt strings
 */
export function generateAskPrompt(
  input: AskInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: askPrompt.getSystemPrompt(userContext),
    user: askPrompt.getUserPrompt(input),
  };
}

/**
 * Parse ask response
 */
export function parseAskResponse(response: string): AskOutput {
  return askPrompt.parseResponse(response);
}

/**
 * Validate ask input
 */
export function validateAskInput(input: AskInput): {
  valid: boolean;
  error?: string;
} {
  return askPrompt.validateInput(input);
}
