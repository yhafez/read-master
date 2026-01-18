/**
 * Generate Flashcards Prompt Template v1
 *
 * AI-powered flashcard generation for vocabulary, concepts,
 * and comprehension from book content.
 */

import {
  type BookContext,
  type UserContext,
  type PromptTemplate,
  type FlashcardType,
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
 * Input for flashcard generation
 */
export type GenerateFlashcardsInput = {
  /** Text content to generate flashcards from */
  content: string;
  /** Book context */
  book: BookContext;
  /** Types of flashcards to generate */
  cardTypes: FlashcardType[];
  /** Number of cards to generate */
  cardCount?: number;
  /** Existing flashcards to avoid duplicates */
  existingCards?: string[];
};

/**
 * Single generated flashcard
 */
export type GeneratedFlashcard = {
  /** Flashcard type */
  type: FlashcardType;
  /** Front of the card (question/prompt) */
  front: string;
  /** Back of the card (answer) */
  back: string;
  /** Additional context or explanation */
  context?: string;
  /** Tags for organization */
  tags: string[];
  /** Difficulty level (1-5) */
  difficulty: number;
  /** Source text this card is based on */
  sourceText?: string;
};

/**
 * Output structure for flashcard generation
 */
export type GenerateFlashcardsOutput = {
  /** Generated flashcards */
  flashcards: GeneratedFlashcard[];
  /** Summary of what was generated */
  summary: {
    totalCards: number;
    byType: Partial<Record<FlashcardType, number>>;
    averageDifficulty: number;
  };
};

// =============================================================================
// FLASHCARD TYPE DESCRIPTIONS
// =============================================================================

/**
 * Descriptions for flashcard types
 */
export const FLASHCARD_TYPE_DESCRIPTIONS: Record<FlashcardType, string> = {
  vocabulary:
    "Define important words and terms from the text. Front: word. Back: definition with example.",
  concept:
    "Explain key concepts and ideas. Front: concept name/question. Back: explanation.",
  comprehension:
    "Test understanding of the content. Front: question about the text. Back: answer.",
  quote:
    "Important quotes to remember. Front: quote prompt/context. Back: the quote and its significance.",
} as const;

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Generate flashcards prompt template
 */
export const generateFlashcardsPrompt: PromptTemplate<
  GenerateFlashcardsInput,
  GenerateFlashcardsOutput
> = {
  id: "generate-flashcards",
  version: "1.0.0",
  description: "Generate flashcards from book content for spaced repetition",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);
    const typeDescs = Object.entries(FLASHCARD_TYPE_DESCRIPTIONS)
      .map(([type, desc]) => `  - ${type}: ${desc}`)
      .join("\n");

    return `You are an expert flashcard designer creating study materials.
Your goal is to create effective flashcards for spaced repetition learning.

IMPORTANT GUIDELINES:
- Design cards appropriate for ${levelDesc}
- Follow the "one fact per card" principle
- Make cards specific and unambiguous
- Use clear, concise language
- Avoid cards that can be answered without understanding
- Don't create duplicate or overlapping cards
${userContext.language ? `- Respond in ${userContext.language}` : ""}

FLASHCARD TYPES:
${typeDescs}

CARD DESIGN PRINCIPLES:
1. Front should clearly prompt the recall
2. Back should be concise but complete
3. Include context to prevent false pattern matching
4. Difficulty should match the concept's complexity
5. Tags should help organize and review

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "flashcards": [
    {
      "type": "vocabulary" | "concept" | "comprehension" | "quote",
      "front": "Question or prompt",
      "back": "Answer",
      "context": "Additional explanation (optional)",
      "tags": ["tag1", "tag2"],
      "difficulty": 2,
      "sourceText": "The text this is based on (optional)"
    }
  ],
  "summary": {
    "totalCards": 10,
    "byType": { "vocabulary": 5, "concept": 3, "comprehension": 2 },
    "averageDifficulty": 2.5
  }
}`;
  },

  getUserPrompt: (input: GenerateFlashcardsInput): string => {
    const bookInfo = formatBookContext(input.book);
    const content = truncateContent(input.content, 6000);
    const count = input.cardCount ?? 10;
    const types = input.cardTypes.join(", ");

    let prompt = `Generate ${count} flashcards from the following text:

BOOK INFORMATION:
${bookInfo}

CONTENT TO CREATE FLASHCARDS FROM:
${content}

REQUESTED CARD TYPES: ${types}

Requirements:
1. Create ${count} high-quality flashcards
2. Include a mix of the requested types: ${types}
3. Focus on the most important information
4. Ensure cards test understanding, not just memorization
5. Vary difficulty levels appropriately`;

    if (input.existingCards && input.existingCards.length > 0) {
      prompt += `

EXISTING CARDS TO AVOID DUPLICATING:
${input.existingCards.slice(0, 20).join("\n")}

Do not create cards that duplicate these existing cards.`;
    }

    prompt += `

Respond with a valid JSON object following the specified format.`;

    return prompt;
  },

  parseResponse: (response: string): GenerateFlashcardsOutput => {
    let jsonStr = response.trim();

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as GenerateFlashcardsOutput;

      if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
        throw new Error("Missing flashcards array");
      }

      // Validate and normalize flashcards
      const flashcards = parsed.flashcards.map((card) => ({
        type: card.type ?? "concept",
        front: card.front ?? "Missing question",
        back: card.back ?? "Missing answer",
        context: card.context,
        tags: card.tags ?? [],
        difficulty: Math.max(1, Math.min(5, card.difficulty ?? 2)),
        sourceText: card.sourceText,
      })) as GeneratedFlashcard[];

      // Calculate summary
      const byType: Partial<Record<FlashcardType, number>> = {};
      let totalDifficulty = 0;

      for (const card of flashcards) {
        byType[card.type] = (byType[card.type] ?? 0) + 1;
        totalDifficulty += card.difficulty;
      }

      const averageDifficulty =
        flashcards.length > 0
          ? Math.round((totalDifficulty / flashcards.length) * 10) / 10
          : 0;

      return {
        flashcards,
        summary: {
          totalCards: flashcards.length,
          byType,
          averageDifficulty,
        },
      };
    } catch {
      return {
        flashcards: [],
        summary: {
          totalCards: 0,
          byType: {},
          averageDifficulty: 0,
        },
      };
    }
  },

  validateInput: (
    input: GenerateFlashcardsInput
  ): { valid: boolean; error?: string } => {
    const requiredCheck = validateRequired(input, [
      "content",
      "book",
      "cardTypes",
    ]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    const lengthCheck = validateLength(input.content, 50, 50000, "Content");
    if (!lengthCheck.valid) {
      return lengthCheck;
    }

    if (!Array.isArray(input.cardTypes) || input.cardTypes.length === 0) {
      return {
        valid: false,
        error: "At least one card type must be specified",
      };
    }

    const validTypes: FlashcardType[] = [
      "vocabulary",
      "concept",
      "comprehension",
      "quote",
    ];
    for (const type of input.cardTypes) {
      if (!validTypes.includes(type)) {
        return { valid: false, error: `Invalid card type: ${type}` };
      }
    }

    return { valid: true };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate flashcards prompt strings
 */
export function generateFlashcardsPromptStrings(
  input: GenerateFlashcardsInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: generateFlashcardsPrompt.getSystemPrompt(userContext),
    user: generateFlashcardsPrompt.getUserPrompt(input),
  };
}

/**
 * Parse flashcards response
 */
export function parseFlashcardsResponse(
  response: string
): GenerateFlashcardsOutput {
  return generateFlashcardsPrompt.parseResponse(response);
}

/**
 * Validate flashcards input
 */
export function validateFlashcardsInput(input: GenerateFlashcardsInput): {
  valid: boolean;
  error?: string;
} {
  return generateFlashcardsPrompt.validateInput(input);
}

/**
 * Get flashcard type description
 */
export function getFlashcardTypeDescription(type: FlashcardType): string {
  return FLASHCARD_TYPE_DESCRIPTIONS[type];
}
