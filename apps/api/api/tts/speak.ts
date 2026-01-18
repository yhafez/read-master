/**
 * POST /api/tts/speak
 *
 * Text-to-speech endpoint with tier-based providers.
 *
 * This endpoint:
 * - Requires authentication
 * - Returns different TTS configurations based on user's subscription tier:
 *   - FREE: Web Speech API config (client-side, browser-based)
 *   - PRO: OpenAI TTS API (server streams audio)
 *   - SCHOLAR: ElevenLabs API (server streams audio)
 * - Enforces rate limits per tier
 * - Tracks TTS usage
 *
 * @example
 * ```bash
 * curl -X POST /api/tts/speak \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "text": "Hello, this is a test.",
 *     "voice": "alloy",
 *     "speed": 1.0
 *   }'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  checkRateLimit,
  applyRateLimitHeaders,
  createRateLimitResponse,
} from "../../src/middleware/rateLimit.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { getTierLimits } from "@read-master/shared";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum text length for TTS
 */
export const MIN_TEXT_LENGTH = 1;

/**
 * Maximum text length for TTS (characters)
 */
export const MAX_TEXT_LENGTH = 4096;

/**
 * Default speech rate
 */
export const DEFAULT_SPEED = 1.0;

/**
 * Minimum speech rate
 */
export const MIN_SPEED = 0.25;

/**
 * Maximum speech rate
 */
export const MAX_SPEED = 4.0;

/**
 * OpenAI TTS voices
 */
export const OPENAI_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;
export type OpenAIVoice = (typeof OPENAI_VOICES)[number];

/**
 * ElevenLabs premium voices (representative sample)
 */
export const ELEVENLABS_VOICES = [
  "rachel",
  "drew",
  "clyde",
  "paul",
  "domi",
  "dave",
  "fin",
  "bella",
  "antoni",
  "thomas",
  "charlie",
  "emily",
  "elli",
  "callum",
  "patrick",
  "harry",
  "liam",
  "dorothy",
  "josh",
  "arnold",
  "charlotte",
  "matilda",
  "matthew",
  "james",
  "joseph",
  "jeremy",
  "michael",
  "ethan",
  "gigi",
  "freya",
  "grace",
  "daniel",
  "serena",
  "adam",
  "nicole",
  "jessie",
  "ryan",
  "sam",
  "glinda",
  "giovanni",
] as const;
export type ElevenLabsVoice = (typeof ELEVENLABS_VOICES)[number];

/**
 * Default OpenAI voice
 */
export const DEFAULT_OPENAI_VOICE: OpenAIVoice = "alloy";

/**
 * Default ElevenLabs voice
 */
export const DEFAULT_ELEVENLABS_VOICE: ElevenLabsVoice = "rachel";

/**
 * TTS Provider types
 */
export type TTSProvider = "web_speech" | "openai" | "elevenlabs";

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * TTS speak request validation schema
 */
export const ttsRequestSchema = z.object({
  text: z
    .string()
    .min(MIN_TEXT_LENGTH, "Text is required")
    .max(MAX_TEXT_LENGTH, `Text must be at most ${MAX_TEXT_LENGTH} characters`),
  voice: z.string().optional(),
  speed: z
    .number()
    .min(MIN_SPEED, `Speed must be at least ${MIN_SPEED}`)
    .max(MAX_SPEED, `Speed must be at most ${MAX_SPEED}`)
    .optional()
    .default(DEFAULT_SPEED),
  language: z.string().optional().default("en"),
});

/**
 * Type for validated request
 */
export type TTSRequest = z.infer<typeof ttsRequestSchema>;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Web Speech API configuration (for free tier)
 */
export type WebSpeechConfig = {
  provider: "web_speech";
  text: string;
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: string | null;
  message: string;
};

/**
 * OpenAI TTS response (for Pro tier)
 */
export type OpenAITTSResponse = {
  provider: "openai";
  text: string;
  voice: OpenAIVoice;
  speed: number;
  audioUrl?: string;
  audioBase64?: string;
  format: "mp3";
  message: string;
};

/**
 * ElevenLabs TTS response (for Scholar tier)
 */
export type ElevenLabsTTSResponse = {
  provider: "elevenlabs";
  text: string;
  voice: ElevenLabsVoice;
  speed: number;
  audioUrl?: string;
  audioBase64?: string;
  format: "mp3";
  stability: number;
  similarityBoost: number;
  message: string;
};

/**
 * Union type for all TTS responses
 */
export type TTSResponse =
  | WebSpeechConfig
  | OpenAITTSResponse
  | ElevenLabsTTSResponse;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate OpenAI voice
 */
export function isValidOpenAIVoice(voice: string): voice is OpenAIVoice {
  return OPENAI_VOICES.includes(voice as OpenAIVoice);
}

/**
 * Validate ElevenLabs voice
 */
export function isValidElevenLabsVoice(
  voice: string
): voice is ElevenLabsVoice {
  return ELEVENLABS_VOICES.includes(voice as ElevenLabsVoice);
}

/**
 * Get default voice for provider
 */
export function getDefaultVoice(provider: TTSProvider): string | null {
  switch (provider) {
    case "openai":
      return DEFAULT_OPENAI_VOICE;
    case "elevenlabs":
      return DEFAULT_ELEVENLABS_VOICE;
    case "web_speech":
    default:
      return null;
  }
}

/**
 * Validate and normalize voice for provider
 */
export function normalizeVoice(
  provider: TTSProvider,
  voice: string | undefined
): string | null {
  if (!voice) {
    return getDefaultVoice(provider);
  }

  switch (provider) {
    case "openai":
      return isValidOpenAIVoice(voice) ? voice : DEFAULT_OPENAI_VOICE;
    case "elevenlabs":
      return isValidElevenLabsVoice(voice) ? voice : DEFAULT_ELEVENLABS_VOICE;
    case "web_speech":
    default:
      // Web Speech API uses browser's default voices
      return voice;
  }
}

/**
 * Build Web Speech API configuration for free tier users
 */
export function buildWebSpeechConfig(
  text: string,
  speed: number,
  language: string,
  voice?: string
): WebSpeechConfig {
  return {
    provider: "web_speech",
    text,
    language,
    rate: speed,
    pitch: 1.0, // Default pitch
    volume: 1.0, // Default volume
    voice: voice ?? null,
    message:
      "Use the Web Speech API in your browser to speak this text. " +
      "Upgrade to Pro for higher quality OpenAI voices.",
  };
}

/**
 * Build OpenAI TTS response placeholder for Pro tier users
 *
 * Note: Actual OpenAI API integration will be in a separate TTS service (api-tts-002).
 * This returns the configuration that the frontend can use to make the request.
 */
export function buildOpenAIResponse(
  text: string,
  voice: OpenAIVoice,
  speed: number
): OpenAITTSResponse {
  return {
    provider: "openai",
    text,
    voice,
    speed,
    format: "mp3",
    message:
      "OpenAI TTS is available for Pro users. " +
      "Audio generation requires the TTS service to be configured. " +
      "Upgrade to Scholar for premium ElevenLabs voices.",
  };
}

/**
 * Build ElevenLabs TTS response placeholder for Scholar tier users
 *
 * Note: Actual ElevenLabs API integration will be in a separate TTS service (api-tts-002).
 * This returns the configuration that the frontend can use.
 */
export function buildElevenLabsResponse(
  text: string,
  voice: ElevenLabsVoice,
  speed: number
): ElevenLabsTTSResponse {
  return {
    provider: "elevenlabs",
    text,
    voice,
    speed,
    format: "mp3",
    stability: 0.5, // Default stability
    similarityBoost: 0.75, // Default similarity boost
    message:
      "ElevenLabs premium TTS is available for Scholar users. " +
      "Audio generation requires the TTS service to be configured.",
  };
}

/**
 * Build TTS response based on user tier
 */
export function buildTTSResponse(
  provider: TTSProvider,
  text: string,
  voice: string | undefined,
  speed: number,
  language: string
): TTSResponse {
  switch (provider) {
    case "elevenlabs": {
      const normalizedVoice = normalizeVoice(provider, voice);
      return buildElevenLabsResponse(
        text,
        normalizedVoice as ElevenLabsVoice,
        speed
      );
    }
    case "openai": {
      const normalizedVoice = normalizeVoice(provider, voice);
      return buildOpenAIResponse(text, normalizedVoice as OpenAIVoice, speed);
    }
    case "web_speech":
    default:
      return buildWebSpeechConfig(text, speed, language, voice);
  }
}

/**
 * Log TTS usage to the database
 */
export async function logTTSUsage(
  userId: string,
  provider: TTSProvider,
  textLength: number,
  voice: string | null,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await db.aIUsageLog.create({
      data: {
        userId,
        operation: `tts_${provider}`,
        model:
          provider === "openai"
            ? "tts-1"
            : provider === "elevenlabs"
              ? "eleven_monolingual_v1"
              : "web_speech",
        provider: provider === "web_speech" ? "browser" : provider,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: Math.ceil(textLength / 4), // Approximate token count
        cost: calculateTTSCost(provider, textLength),
        durationMs: 0,
        success,
        errorCode: success ? null : "TTS_ERROR",
        errorMessage: success ? null : (errorMessage ?? null),
        metadata: {
          textLength,
          voice,
          provider,
        },
      },
    });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error("Failed to log TTS usage", {
      userId,
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Calculate approximate TTS cost
 * Prices are estimates based on provider pricing (per character)
 */
export function calculateTTSCost(
  provider: TTSProvider,
  textLength: number
): number {
  switch (provider) {
    case "openai":
      // OpenAI TTS: ~$15/1M characters
      return (textLength / 1_000_000) * 15;
    case "elevenlabs":
      // ElevenLabs: ~$0.30/1K characters (varies by plan)
      return (textLength / 1_000) * 0.3;
    case "web_speech":
    default:
      // Free browser API
      return 0;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle TTS speak request
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Validate request body
    const validationResult = ttsRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request body",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const { text, voice, speed, language }: TTSRequest = validationResult.data;

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Get tier limits to determine TTS provider
    const tierLimits = getTierLimits(user.tier);
    const provider = tierLimits.ttsProvider;

    // Check TTS rate limits
    const rateLimitResult = await checkRateLimit("tts", user.id, user.tier);
    applyRateLimitHeaders(res, rateLimitResult, "tts");

    if (!rateLimitResult.success) {
      const rateLimitResponse = createRateLimitResponse(rateLimitResult, "tts");
      res.status(rateLimitResponse.statusCode).json(rateLimitResponse.body);
      return;
    }

    // Build response based on tier's TTS provider
    const ttsResponse = buildTTSResponse(
      provider,
      text,
      voice,
      speed,
      language
    );

    // Log TTS usage
    await logTTSUsage(
      user.id,
      provider,
      text.length,
      normalizeVoice(provider, voice),
      true
    );

    logger.info("TTS request processed", {
      userId: user.id,
      tier: user.tier,
      provider,
      textLength: text.length,
      voice: normalizeVoice(provider, voice),
    });

    // Return the TTS response
    sendSuccess(res, {
      ...ttsResponse,
      tier: user.tier,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error processing TTS request", {
      userId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Try to log the failed request
    try {
      const user = await getUserByClerkId(userId);
      if (user) {
        const tierLimits = getTierLimits(user.tier);
        await logTTSUsage(
          user.id,
          tierLimits.ttsProvider,
          0,
          null,
          false,
          message
        );
      }
    } catch {
      // Ignore logging errors
    }

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to process TTS request. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

// Export schema with alias for testing
export { ttsRequestSchema as speakRequestSchema };
