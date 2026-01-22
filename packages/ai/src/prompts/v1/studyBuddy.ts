/**
 * AI Study Buddy Prompt Template
 *
 * Provides contextual conversational AI assistance while reading.
 * The Study Buddy maintains conversation history and understands
 * the current reading position for intelligent, context-aware responses.
 */

import type { BookContext, UserContext, PromptTemplate } from "../types.js";
import { formatBookContext, getReadingLevelDescription } from "../utils.js";

// =============================================================================
// TYPES
// =============================================================================

export type StudyBuddyInput = {
  /** Book context information */
  book: BookContext;

  /** User's current reading position */
  currentPosition?: {
    chapter?: string;
    page?: number;
    percentage?: number;
  };

  /** Current text being read (for context) */
  currentText?: string;

  /** User's message/question */
  userMessage: string;

  /** Conversation history (last 10 messages) */
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;

  /** User's recent highlights/notes from this book */
  recentAnnotations?: Array<{
    text: string;
    note?: string;
    type: "highlight" | "note";
  }>;
};

export type StudyBuddyOutput = {
  /** AI's response message */
  response: string;

  /** Suggested follow-up topics */
  suggestedTopics?: string[];

  /** Related passages to review */
  relatedPassages?: Array<{
    text: string;
    reason: string;
  }>;

  /** Discussion questions based on conversation */
  discussionPrompts?: string[];

  /** Indicates if the response contains spoilers */
  containsSpoilers?: boolean;
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Study Buddy prompt template
 */
export const studyBuddyPrompt: PromptTemplate<
  StudyBuddyInput,
  StudyBuddyOutput
> = {
  id: "study-buddy",
  version: "1.0.0",
  description:
    "Conversational AI assistant that helps readers understand and engage with books in real-time",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are an AI Study Buddy - a friendly, knowledgeable reading companion who helps readers engage deeply with books.

YOUR ROLE:
- Be conversational, encouraging, and supportive
- Help readers understand complex ideas without over-explaining
- Connect concepts across the book and to broader themes
- Encourage critical thinking and personal reflection
- Remember previous conversations to maintain continuity
- Adapt your tone to match the reader's needs (${levelDesc})

IMPORTANT GUIDELINES:
✅ DO:
- Use a warm, conversational tone (like a smart friend)
- Ask follow-up questions to encourage deeper thinking
- Connect current reading to previous discussions
- Acknowledge when you don't know something
- Celebrate insights and progress
- Provide context without excessive exposition
- Suggest related passages worth revisiting

❌ DON'T:
- Spoil future plot points unless explicitly asked
- Over-explain simple concepts
- Be condescending or overly academic
- Interrupt the reading flow with lengthy responses
- Make assumptions about the reader's background
${userContext.language ? `- Always respond in ${userContext.language}` : ""}

CONVERSATION STYLE:
- Keep responses concise but insightful (2-4 paragraphs max)
- Use natural language, not formal academic prose
- Balance information with questions
- Show enthusiasm for the reader's insights

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "response": "Your conversational response to the reader (2-4 paragraphs)",
  "suggestedTopics": ["topic1", "topic2", "topic3"],
  "relatedPassages": [
    {
      "text": "Quote from earlier in the book",
      "reason": "Why this connects to the current discussion"
    }
  ],
  "discussionPrompts": ["Thought-provoking question 1", "Question 2"],
  "containsSpoilers": false
}

Remember: You're a reading companion, not a lecturer. Keep it engaging and conversational!`;
  },

  getUserPrompt: (input: StudyBuddyInput): string => {
    const bookInfo = formatBookContext(input.book);
    const parts: string[] = [];

    // Book context
    parts.push(`BOOK INFORMATION:\n${bookInfo}`);

    // Current reading position
    if (input.currentPosition) {
      const pos = input.currentPosition;
      const posInfo: string[] = [];
      if (pos.chapter) posInfo.push(`Chapter: ${pos.chapter}`);
      if (pos.page) posInfo.push(`Page: ${pos.page}`);
      if (pos.percentage) posInfo.push(`Progress: ${pos.percentage}% complete`);

      if (posInfo.length > 0) {
        parts.push(`\nCURRENT READING POSITION:\n${posInfo.join(" | ")}`);
      }
    }

    // Current text being read
    if (input.currentText) {
      parts.push(
        `\nCURRENT PASSAGE (what the reader is reading right now):\n"${input.currentText}"`
      );
    }

    // Recent annotations
    if (input.recentAnnotations && input.recentAnnotations.length > 0) {
      const annotations = input.recentAnnotations
        .slice(0, 5)
        .map((ann, i) => {
          const note = ann.note ? `\n  Note: "${ann.note}"` : "";
          return `${i + 1}. "${ann.text}"${note}`;
        })
        .join("\n");

      parts.push(`\nRECENT HIGHLIGHTS/NOTES FROM THIS BOOK:\n${annotations}`);
    }

    // Conversation history
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      const history = input.conversationHistory
        .slice(-6) // Last 6 messages (3 exchanges)
        .map(
          (msg) =>
            `${msg.role === "user" ? "Reader" : "Study Buddy"}: ${msg.content}`
        )
        .join("\n");

      parts.push(`\nRECENT CONVERSATION:\n${history}`);
    }

    // Current user message
    parts.push(`\n====================\n`);
    parts.push(`READER'S CURRENT MESSAGE:\n${input.userMessage}`);
    parts.push(`\n====================`);

    parts.push(
      `\nRespond as the Study Buddy. Be conversational, insightful, and encouraging.`
    );

    return parts.join("\n");
  },

  parseResponse: (response: string): StudyBuddyOutput => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);

      // Validate required fields
      if (!parsed.response) {
        throw new Error("Missing required field: response");
      }

      return {
        response: parsed.response,
        suggestedTopics: parsed.suggestedTopics || [],
        relatedPassages: parsed.relatedPassages || [],
        discussionPrompts: parsed.discussionPrompts || [],
        containsSpoilers: parsed.containsSpoilers || false,
      };
    } catch (_error) {
      // Fallback: treat entire response as the message
      return {
        response: response.trim(),
        suggestedTopics: [],
        relatedPassages: [],
        discussionPrompts: [],
        containsSpoilers: false,
      };
    }
  },

  validateInput: (
    input: StudyBuddyInput
  ): { valid: boolean; error?: string } => {
    if (!input.book) {
      return { valid: false, error: "Book context is required" };
    }

    if (!input.userMessage || input.userMessage.trim().length === 0) {
      return { valid: false, error: "User message is required" };
    }

    if (input.userMessage.length > 2000) {
      return {
        valid: false,
        error: "User message is too long (max 2000 characters)",
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate Study Buddy prompt from input
 */
export function generateStudyBuddyPrompt(
  input: StudyBuddyInput,
  userContext: UserContext
): string {
  return `${studyBuddyPrompt.getSystemPrompt(userContext)}\n\n${studyBuddyPrompt.getUserPrompt(input)}`;
}

/**
 * Parse Study Buddy response
 */
export function parseStudyBuddyResponse(response: string): StudyBuddyOutput {
  return studyBuddyPrompt.parseResponse(response);
}

/**
 * Validate Study Buddy input
 */
export function validateStudyBuddyInput(input: StudyBuddyInput): {
  valid: boolean;
  error?: string;
} {
  return studyBuddyPrompt.validateInput(input);
}
