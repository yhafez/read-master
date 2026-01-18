/**
 * GET /api/tts/voices
 *
 * Returns available TTS voices based on user's subscription tier.
 *
 * This endpoint:
 * - Requires authentication
 * - Returns different voice options based on tier:
 *   - FREE: Web Speech API browser default voices (client-side)
 *   - PRO: OpenAI TTS voices (alloy, echo, fable, onyx, nova, shimmer)
 *   - SCHOLAR: ElevenLabs premium voices (40+ voices)
 *
 * @example
 * ```bash
 * curl -X GET /api/tts/voices \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { getUserByClerkId } from "../../src/services/db.js";
import { getTierLimits } from "@read-master/shared";

// ============================================================================
// Types
// ============================================================================

/**
 * TTS Provider types
 */
export type TTSProvider = "web_speech" | "openai" | "elevenlabs";

/**
 * Voice option structure
 */
export type VoiceOption = {
  id: string;
  name: string;
  description?: string;
  gender?: "male" | "female" | "neutral";
  language?: string;
  preview?: boolean;
};

/**
 * Web Speech voices response
 */
export type WebSpeechVoicesResponse = {
  provider: "web_speech";
  voices: VoiceOption[];
  default: null;
  message: string;
  note: string;
};

/**
 * OpenAI voices response
 */
export type OpenAIVoicesResponse = {
  provider: "openai";
  voices: VoiceOption[];
  default: string;
  message: string;
};

/**
 * ElevenLabs voices response
 */
export type ElevenLabsVoicesResponse = {
  provider: "elevenlabs";
  voices: VoiceOption[];
  default: string;
  message: string;
};

/**
 * Union type for all voices responses
 */
export type VoicesResponse =
  | WebSpeechVoicesResponse
  | OpenAIVoicesResponse
  | ElevenLabsVoicesResponse;

// ============================================================================
// Voice Data
// ============================================================================

/**
 * OpenAI TTS voices with metadata
 */
export const OPENAI_VOICES: VoiceOption[] = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Balanced, versatile voice",
    gender: "neutral",
    language: "en",
  },
  {
    id: "echo",
    name: "Echo",
    description: "Warm, friendly male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "fable",
    name: "Fable",
    description: "British-accented storytelling voice",
    gender: "male",
    language: "en",
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Deep, authoritative male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Youthful, energetic female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Expressive, dynamic female voice",
    gender: "female",
    language: "en",
  },
];

/**
 * ElevenLabs premium voices with metadata
 */
export const ELEVENLABS_VOICES: VoiceOption[] = [
  // Natural voices
  {
    id: "rachel",
    name: "Rachel",
    description: "Calm, young American female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "drew",
    name: "Drew",
    description: "Well-rounded American male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "clyde",
    name: "Clyde",
    description: "War veteran, deep resonant voice",
    gender: "male",
    language: "en",
  },
  {
    id: "paul",
    name: "Paul",
    description: "Authoritative news anchor voice",
    gender: "male",
    language: "en",
  },
  {
    id: "domi",
    name: "Domi",
    description: "Strong, assertive female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "dave",
    name: "Dave",
    description: "Conversational British-Essex male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "fin",
    name: "Fin",
    description: "Irish sailor, adventurous voice",
    gender: "male",
    language: "en",
  },
  {
    id: "bella",
    name: "Bella",
    description: "Soft, pleasant female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "antoni",
    name: "Antoni",
    description: "Well-rounded American male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "thomas",
    name: "Thomas",
    description: "Calm, professional male voice",
    gender: "male",
    language: "en",
  },
  // Additional premium voices
  {
    id: "charlie",
    name: "Charlie",
    description: "Casual, conversational Australian male",
    gender: "male",
    language: "en",
  },
  {
    id: "emily",
    name: "Emily",
    description: "Calm, soothing female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "elli",
    name: "Elli",
    description: "Young, emotional female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "callum",
    name: "Callum",
    description: "Trans-Atlantic male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "patrick",
    name: "Patrick",
    description: "Confident, mature male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "harry",
    name: "Harry",
    description: "Anxious, young British male",
    gender: "male",
    language: "en",
  },
  {
    id: "liam",
    name: "Liam",
    description: "Young, articulate American male",
    gender: "male",
    language: "en",
  },
  {
    id: "dorothy",
    name: "Dorothy",
    description: "British, pleasant older female",
    gender: "female",
    language: "en",
  },
  {
    id: "josh",
    name: "Josh",
    description: "Deep, narrative male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "arnold",
    name: "Arnold",
    description: "Crisp, clear American male",
    gender: "male",
    language: "en",
  },
  {
    id: "charlotte",
    name: "Charlotte",
    description: "Swedish, melodic female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "matilda",
    name: "Matilda",
    description: "Warm, friendly Australian female",
    gender: "female",
    language: "en",
  },
  {
    id: "matthew",
    name: "Matthew",
    description: "Deep, narrative male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "james",
    name: "James",
    description: "Calm, Australian male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "joseph",
    name: "Joseph",
    description: "British, authoritative male",
    gender: "male",
    language: "en",
  },
  {
    id: "jeremy",
    name: "Jeremy",
    description: "Irish, conversational male",
    gender: "male",
    language: "en",
  },
  {
    id: "michael",
    name: "Michael",
    description: "Old, American male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "ethan",
    name: "Ethan",
    description: "Young, American narrator",
    gender: "male",
    language: "en",
  },
  {
    id: "gigi",
    name: "Gigi",
    description: "Animated, childlike female",
    gender: "female",
    language: "en",
  },
  {
    id: "freya",
    name: "Freya",
    description: "Overconfident, American female",
    gender: "female",
    language: "en",
  },
  {
    id: "grace",
    name: "Grace",
    description: "Southern American female",
    gender: "female",
    language: "en",
  },
  {
    id: "daniel",
    name: "Daniel",
    description: "Deep, British male voice",
    gender: "male",
    language: "en",
  },
  {
    id: "serena",
    name: "Serena",
    description: "Pleasant, American female",
    gender: "female",
    language: "en",
  },
  {
    id: "adam",
    name: "Adam",
    description: "Deep, narrative American male",
    gender: "male",
    language: "en",
  },
  {
    id: "nicole",
    name: "Nicole",
    description: "Soft, whispered female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "jessie",
    name: "Jessie",
    description: "Raspy, American female voice",
    gender: "female",
    language: "en",
  },
  {
    id: "ryan",
    name: "Ryan",
    description: "Soldier, commanding male",
    gender: "male",
    language: "en",
  },
  {
    id: "sam",
    name: "Sam",
    description: "Raspy, American young male",
    gender: "male",
    language: "en",
  },
  {
    id: "glinda",
    name: "Glinda",
    description: "Witch, enchanting female",
    gender: "female",
    language: "en",
  },
  {
    id: "giovanni",
    name: "Giovanni",
    description: "Italian, passionate male",
    gender: "male",
    language: "en",
  },
];

/**
 * Web Speech API voices (browser-provided)
 */
export const WEB_SPEECH_VOICES: VoiceOption[] = [];

/**
 * Default voices by provider
 */
export const DEFAULT_VOICES = {
  openai: "alloy",
  elevenlabs: "rachel",
  web_speech: null,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get voices for Web Speech API
 */
export function getWebSpeechVoices(): WebSpeechVoicesResponse {
  return {
    provider: "web_speech",
    voices: WEB_SPEECH_VOICES,
    default: null,
    message:
      "Web Speech API uses browser-provided voices. " +
      "The available voices depend on your browser and operating system.",
    note:
      "Use window.speechSynthesis.getVoices() in your browser to get the available voices. " +
      "Upgrade to Pro for high-quality OpenAI voices.",
  };
}

/**
 * Get voices for OpenAI TTS
 */
export function getOpenAIVoices(): OpenAIVoicesResponse {
  return {
    provider: "openai",
    voices: OPENAI_VOICES,
    default: DEFAULT_VOICES.openai,
    message:
      "OpenAI TTS provides 6 high-quality neural voices. " +
      "Upgrade to Scholar for 40+ premium ElevenLabs voices.",
  };
}

/**
 * Get voices for ElevenLabs
 */
export function getElevenLabsVoices(): ElevenLabsVoicesResponse {
  return {
    provider: "elevenlabs",
    voices: ELEVENLABS_VOICES,
    default: DEFAULT_VOICES.elevenlabs,
    message:
      "ElevenLabs provides 40+ premium neural voices with natural intonation. " +
      "You have access to all Scholar-tier voices.",
  };
}

/**
 * Get voices based on provider
 */
export function getVoicesForProvider(provider: TTSProvider): VoicesResponse {
  switch (provider) {
    case "elevenlabs":
      return getElevenLabsVoices();
    case "openai":
      return getOpenAIVoices();
    case "web_speech":
    default:
      return getWebSpeechVoices();
  }
}

/**
 * Get voice count for provider
 */
export function getVoiceCount(provider: TTSProvider): number {
  switch (provider) {
    case "elevenlabs":
      return ELEVENLABS_VOICES.length;
    case "openai":
      return OPENAI_VOICES.length;
    case "web_speech":
      return 0; // Browser-dependent
    default:
      return 0;
  }
}

/**
 * Find voice by ID
 */
export function findVoiceById(
  provider: TTSProvider,
  voiceId: string
): VoiceOption | undefined {
  switch (provider) {
    case "elevenlabs":
      return ELEVENLABS_VOICES.find((v) => v.id === voiceId);
    case "openai":
      return OPENAI_VOICES.find((v) => v.id === voiceId);
    case "web_speech":
    default:
      return undefined;
  }
}

/**
 * Filter voices by gender
 */
export function filterVoicesByGender(
  voices: VoiceOption[],
  gender: "male" | "female" | "neutral"
): VoiceOption[] {
  return voices.filter((v) => v.gender === gender);
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle TTS voices request
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Get tier limits to determine TTS provider
    const tierLimits = getTierLimits(user.tier);
    const provider = tierLimits.ttsProvider;

    // Get voices for user's provider
    const voicesResponse = getVoicesForProvider(provider);

    logger.info("TTS voices request processed", {
      userId: user.id,
      tier: user.tier,
      provider,
      voiceCount: getVoiceCount(provider),
    });

    // Return voices with tier info
    sendSuccess(res, {
      ...voicesResponse,
      tier: user.tier,
      totalVoices: getVoiceCount(provider),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching TTS voices", {
      userId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch TTS voices. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
