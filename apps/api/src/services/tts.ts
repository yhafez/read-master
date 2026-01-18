/**
 * TTS Service - Text-to-Speech Integration
 *
 * Provides text-to-speech capabilities with:
 * - OpenAI TTS API integration (Pro tier)
 * - ElevenLabs API integration (Scholar tier)
 * - Text chunking for long content
 * - Audio streaming support
 * - Rate limit handling
 */

import { logger } from "../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * TTS provider types
 */
export type TTSProvider = "web_speech" | "openai" | "elevenlabs";

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
 * OpenAI TTS models
 */
export const OPENAI_MODELS = ["tts-1", "tts-1-hd"] as const;
export type OpenAIModel = (typeof OPENAI_MODELS)[number];

/**
 * ElevenLabs voices (representative sample)
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
] as const;
export type ElevenLabsVoice = (typeof ELEVENLABS_VOICES)[number];

/**
 * ElevenLabs voice ID mapping (voice name -> voice ID)
 * In production, these would be actual ElevenLabs voice IDs
 */
export const ELEVENLABS_VOICE_IDS: Record<ElevenLabsVoice, string> = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  drew: "29vD33N1CtxCmqQRPOHJ",
  clyde: "2EiwWnXFnvU5JabPnv8n",
  paul: "5Q0t7uMcjvnagumLfvZi",
  domi: "AZnzlk1XvdvUeBnXmlld",
  dave: "CYw3kZ02Hs0563khs1Fj",
  fin: "D38z5RcWu1voky8WS1ja",
  bella: "EXAVITQu4vr4xnSDxMaL",
  antoni: "ErXwobaYiN019PkySvjV",
  thomas: "GBv7mTt0atIp3Br8iCZE",
};

/**
 * Audio format options
 */
export type AudioFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

/**
 * TTS request options
 */
export interface TTSOptions {
  /** Text to convert to speech */
  text: string;
  /** Voice to use */
  voice?: string;
  /** Speech speed (0.25-4.0) */
  speed?: number;
  /** Audio format */
  format?: AudioFormat;
  /** OpenAI model (tts-1 or tts-1-hd) */
  model?: OpenAIModel;
  /** ElevenLabs stability setting (0-1) */
  stability?: number;
  /** ElevenLabs similarity boost (0-1) */
  similarityBoost?: number;
}

/**
 * Audio chunk for streaming
 */
export interface AudioChunk {
  /** Chunk index */
  index: number;
  /** Audio data as base64 */
  data: string;
  /** Format of audio */
  format: AudioFormat;
  /** Whether this is the final chunk */
  isFinal: boolean;
  /** Duration in milliseconds (if known) */
  durationMs?: number;
}

/**
 * TTS result
 */
export interface TTSResult {
  /** Audio data as base64 */
  audioBase64: string;
  /** Audio format */
  format: AudioFormat;
  /** Character count processed */
  characterCount: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Estimated cost in USD */
  cost: number;
}

/**
 * TTS stream result
 */
export interface TTSStreamResult {
  /** Async iterable of audio chunks */
  audioStream: AsyncIterable<AudioChunk>;
  /** Character count */
  characterCount: number;
  /** Format of audio */
  format: AudioFormat;
}

/**
 * Text chunk for processing
 */
export interface TextChunk {
  /** Chunk index */
  index: number;
  /** Text content */
  text: string;
  /** Start position in original text */
  startPosition: number;
  /** End position in original text */
  endPosition: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum text length for single TTS request (characters)
 */
export const MAX_CHUNK_SIZE = 4096;

/**
 * Minimum chunk size to avoid tiny chunks
 */
export const MIN_CHUNK_SIZE = 100;

/**
 * Default OpenAI voice
 */
export const DEFAULT_OPENAI_VOICE: OpenAIVoice = "alloy";

/**
 * Default ElevenLabs voice
 */
export const DEFAULT_ELEVENLABS_VOICE: ElevenLabsVoice = "rachel";

/**
 * Default OpenAI model
 */
export const DEFAULT_OPENAI_MODEL: OpenAIModel = "tts-1";

/**
 * Default audio format
 */
export const DEFAULT_AUDIO_FORMAT: AudioFormat = "mp3";

/**
 * Default speech speed
 */
export const DEFAULT_SPEED = 1.0;

/**
 * Default ElevenLabs stability
 */
export const DEFAULT_STABILITY = 0.5;

/**
 * Default ElevenLabs similarity boost
 */
export const DEFAULT_SIMILARITY_BOOST = 0.75;

/**
 * Pricing per character
 */
export const TTS_PRICING = {
  openai: {
    // OpenAI TTS: $15/1M characters
    perCharacter: 15 / 1_000_000,
    perCharacterHD: 30 / 1_000_000, // tts-1-hd is 2x price
  },
  elevenlabs: {
    // ElevenLabs: ~$0.30/1K characters
    perCharacter: 0.3 / 1_000,
  },
  web_speech: {
    perCharacter: 0,
  },
} as const;

/**
 * Sentence ending patterns for smart chunking
 */
const SENTENCE_ENDINGS = /[.!?]\s+/g;

/**
 * Paragraph break pattern
 */
const PARAGRAPH_BREAK = /\n\n+/g;

// ============================================================================
// Text Chunking Functions
// ============================================================================

/**
 * Split text into chunks suitable for TTS processing.
 * Tries to break at natural boundaries (sentences, paragraphs).
 *
 * @param text - Full text to chunk
 * @param maxChunkSize - Maximum characters per chunk
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  maxChunkSize: number = MAX_CHUNK_SIZE
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmedText = text.trim();

  // If text fits in a single chunk, return it
  if (trimmedText.length <= maxChunkSize) {
    return [
      {
        index: 0,
        text: trimmedText,
        startPosition: 0,
        endPosition: trimmedText.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < trimmedText.length) {
    const remainingText = trimmedText.slice(currentPosition);
    let chunkEnd = Math.min(remainingText.length, maxChunkSize);

    // If this isn't the last chunk, try to find a natural break point
    if (chunkEnd < remainingText.length) {
      const searchText = remainingText.slice(0, chunkEnd);

      // Try to find paragraph break first (most natural)
      const paragraphMatch = findLastMatch(searchText, PARAGRAPH_BREAK);
      if (paragraphMatch !== null && paragraphMatch > MIN_CHUNK_SIZE) {
        chunkEnd = paragraphMatch;
      } else {
        // Try to find sentence ending
        const sentenceMatch = findLastMatch(searchText, SENTENCE_ENDINGS);
        if (sentenceMatch !== null && sentenceMatch > MIN_CHUNK_SIZE) {
          chunkEnd = sentenceMatch;
        } else {
          // Fall back to word boundary
          const lastSpace = searchText.lastIndexOf(" ");
          if (lastSpace > MIN_CHUNK_SIZE) {
            chunkEnd = lastSpace;
          }
        }
      }
    }

    const chunkText = remainingText.slice(0, chunkEnd).trim();

    if (chunkText.length > 0) {
      chunks.push({
        index: chunkIndex,
        text: chunkText,
        startPosition: currentPosition,
        endPosition: currentPosition + chunkEnd,
      });
      chunkIndex++;
    }

    currentPosition += chunkEnd;

    // Skip any leading whitespace for next chunk
    while (
      currentPosition < trimmedText.length &&
      /\s/.test(trimmedText[currentPosition] ?? "")
    ) {
      currentPosition++;
    }
  }

  return chunks;
}

/**
 * Find the last match of a pattern in text, returning the end position
 */
function findLastMatch(text: string, pattern: RegExp): number | null {
  const matches = [...text.matchAll(new RegExp(pattern.source, "g"))];
  if (matches.length === 0) return null;

  const lastMatch = matches[matches.length - 1];
  if (!lastMatch || lastMatch.index === undefined) return null;

  return lastMatch.index + lastMatch[0].length;
}

/**
 * Estimate total chunks needed for text
 */
export function estimateChunkCount(
  text: string,
  maxChunkSize: number = MAX_CHUNK_SIZE
): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.trim().length / maxChunkSize);
}

/**
 * Get total character count for chunks
 */
export function getTotalCharacterCount(chunks: TextChunk[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
}

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Calculate TTS cost for given provider and character count
 */
export function calculateTTSCost(
  provider: TTSProvider,
  characterCount: number,
  model?: OpenAIModel
): number {
  if (characterCount <= 0) return 0;

  switch (provider) {
    case "openai": {
      const isHD = model === "tts-1-hd";
      const pricePerChar = isHD
        ? TTS_PRICING.openai.perCharacterHD
        : TTS_PRICING.openai.perCharacter;
      return characterCount * pricePerChar;
    }
    case "elevenlabs":
      return characterCount * TTS_PRICING.elevenlabs.perCharacter;
    case "web_speech":
    default:
      return 0;
  }
}

/**
 * Estimate cost for text before processing
 */
export function estimateTTSCost(
  text: string,
  provider: TTSProvider,
  model?: OpenAIModel
): number {
  const characterCount = text.trim().length;
  return calculateTTSCost(provider, characterCount, model);
}

// ============================================================================
// Voice Validation
// ============================================================================

/**
 * Check if a voice is valid for OpenAI
 */
export function isValidOpenAIVoice(voice: string): voice is OpenAIVoice {
  return OPENAI_VOICES.includes(voice as OpenAIVoice);
}

/**
 * Check if a voice is valid for ElevenLabs
 */
export function isValidElevenLabsVoice(
  voice: string
): voice is ElevenLabsVoice {
  return ELEVENLABS_VOICES.includes(voice as ElevenLabsVoice);
}

/**
 * Normalize voice for provider, returning default if invalid
 */
export function normalizeVoice(
  provider: TTSProvider,
  voice?: string
): string | null {
  if (!voice) {
    switch (provider) {
      case "openai":
        return DEFAULT_OPENAI_VOICE;
      case "elevenlabs":
        return DEFAULT_ELEVENLABS_VOICE;
      default:
        return null;
    }
  }

  switch (provider) {
    case "openai":
      return isValidOpenAIVoice(voice) ? voice : DEFAULT_OPENAI_VOICE;
    case "elevenlabs":
      return isValidElevenLabsVoice(voice) ? voice : DEFAULT_ELEVENLABS_VOICE;
    default:
      return voice;
  }
}

/**
 * Get ElevenLabs voice ID from voice name
 */
export function getElevenLabsVoiceId(voice: ElevenLabsVoice): string {
  return ELEVENLABS_VOICE_IDS[voice];
}

// ============================================================================
// OpenAI TTS Service
// ============================================================================

/**
 * Check if OpenAI TTS is available
 */
export function isOpenAITTSAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate audio using OpenAI TTS API
 *
 * @param options - TTS options
 * @returns Promise resolving to TTS result
 */
export async function generateOpenAIAudio(
  options: TTSOptions
): Promise<TTSResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  const {
    text,
    voice = DEFAULT_OPENAI_VOICE,
    speed = DEFAULT_SPEED,
    format = DEFAULT_AUDIO_FORMAT,
    model = DEFAULT_OPENAI_MODEL,
  } = options;

  const normalizedVoice = normalizeVoice("openai", voice) as OpenAIVoice;
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: normalizedVoice,
        response_format: format,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI TTS API error: ${response.status} - ${errorText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    const durationMs = Date.now() - startTime;

    logger.info("OpenAI TTS generation complete", {
      characterCount: text.length,
      format,
      voice: normalizedVoice,
      model,
      durationMs,
    });

    return {
      audioBase64,
      format,
      characterCount: text.length,
      durationMs,
      cost: calculateTTSCost("openai", text.length, model),
    };
  } catch (error) {
    logger.error("OpenAI TTS generation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      characterCount: text.length,
    });
    throw error;
  }
}

/**
 * Generate audio for multiple chunks using OpenAI
 */
export async function generateOpenAIAudioChunked(
  chunks: TextChunk[],
  options: Omit<TTSOptions, "text">
): Promise<TTSResult[]> {
  const results: TTSResult[] = [];

  for (const chunk of chunks) {
    const result = await generateOpenAIAudio({
      ...options,
      text: chunk.text,
    });
    results.push(result);
  }

  return results;
}

/**
 * Stream audio chunks from OpenAI TTS
 * Note: OpenAI TTS doesn't support true streaming, so this generates
 * chunks sequentially and yields them as they complete.
 */
export async function* streamOpenAIAudio(
  chunks: TextChunk[],
  options: Omit<TTSOptions, "text">
): AsyncGenerator<AudioChunk> {
  const format = options.format ?? DEFAULT_AUDIO_FORMAT;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const result = await generateOpenAIAudio({
      ...options,
      text: chunk.text,
    });

    yield {
      index: i,
      data: result.audioBase64,
      format,
      isFinal: i === chunks.length - 1,
      durationMs: result.durationMs,
    };
  }
}

// ============================================================================
// ElevenLabs TTS Service
// ============================================================================

/**
 * Check if ElevenLabs TTS is available
 */
export function isElevenLabsTTSAvailable(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * Generate audio using ElevenLabs API
 *
 * @param options - TTS options
 * @returns Promise resolving to TTS result
 */
export async function generateElevenLabsAudio(
  options: TTSOptions
): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is required");
  }

  const {
    text,
    voice = DEFAULT_ELEVENLABS_VOICE,
    stability = DEFAULT_STABILITY,
    similarityBoost = DEFAULT_SIMILARITY_BOOST,
    format = DEFAULT_AUDIO_FORMAT,
  } = options;

  const normalizedVoice = normalizeVoice(
    "elevenlabs",
    voice
  ) as ElevenLabsVoice;
  const voiceId = getElevenLabsVoiceId(normalizedVoice);
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: `audio/${format}`,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: Math.max(0, Math.min(1, stability)),
            similarity_boost: Math.max(0, Math.min(1, similarityBoost)),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${errorText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    const durationMs = Date.now() - startTime;

    logger.info("ElevenLabs TTS generation complete", {
      characterCount: text.length,
      format,
      voice: normalizedVoice,
      durationMs,
    });

    return {
      audioBase64,
      format,
      characterCount: text.length,
      durationMs,
      cost: calculateTTSCost("elevenlabs", text.length),
    };
  } catch (error) {
    logger.error("ElevenLabs TTS generation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      characterCount: text.length,
    });
    throw error;
  }
}

/**
 * Generate audio for multiple chunks using ElevenLabs
 */
export async function generateElevenLabsAudioChunked(
  chunks: TextChunk[],
  options: Omit<TTSOptions, "text">
): Promise<TTSResult[]> {
  const results: TTSResult[] = [];

  for (const chunk of chunks) {
    const result = await generateElevenLabsAudio({
      ...options,
      text: chunk.text,
    });
    results.push(result);
  }

  return results;
}

/**
 * Stream audio chunks from ElevenLabs
 * ElevenLabs supports native streaming via their streaming endpoint.
 */
export async function* streamElevenLabsAudio(
  chunks: TextChunk[],
  options: Omit<TTSOptions, "text">
): AsyncGenerator<AudioChunk> {
  const format = options.format ?? DEFAULT_AUDIO_FORMAT;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const result = await generateElevenLabsAudio({
      ...options,
      text: chunk.text,
    });

    yield {
      index: i,
      data: result.audioBase64,
      format,
      isFinal: i === chunks.length - 1,
      durationMs: result.durationMs,
    };
  }
}

// ============================================================================
// Unified TTS Interface
// ============================================================================

/**
 * Generate TTS audio using the appropriate provider
 */
export async function generateAudio(
  provider: TTSProvider,
  options: TTSOptions
): Promise<TTSResult> {
  switch (provider) {
    case "openai":
      return generateOpenAIAudio(options);
    case "elevenlabs":
      return generateElevenLabsAudio(options);
    case "web_speech":
      // Web speech is client-side only
      throw new Error("Web Speech API is client-side only");
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

/**
 * Generate TTS audio for long text, handling chunking automatically
 */
export async function generateAudioLongText(
  provider: TTSProvider,
  text: string,
  options: Omit<TTSOptions, "text">
): Promise<TTSResult[]> {
  const chunks = chunkText(text);

  switch (provider) {
    case "openai":
      return generateOpenAIAudioChunked(chunks, options);
    case "elevenlabs":
      return generateElevenLabsAudioChunked(chunks, options);
    case "web_speech":
      throw new Error("Web Speech API is client-side only");
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

/**
 * Stream TTS audio chunks
 */
export function streamAudio(
  provider: TTSProvider,
  text: string,
  options: Omit<TTSOptions, "text">
): AsyncGenerator<AudioChunk> {
  const chunks = chunkText(text);

  switch (provider) {
    case "openai":
      return streamOpenAIAudio(chunks, options);
    case "elevenlabs":
      return streamElevenLabsAudio(chunks, options);
    case "web_speech":
      throw new Error("Web Speech API is client-side only");
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

/**
 * Check if a TTS provider is available
 */
export function isTTSProviderAvailable(provider: TTSProvider): boolean {
  switch (provider) {
    case "openai":
      return isOpenAITTSAvailable();
    case "elevenlabs":
      return isElevenLabsTTSAvailable();
    case "web_speech":
      return true; // Always available (client-side)
    default:
      return false;
  }
}

// ============================================================================
// Service Export
// ============================================================================

/**
 * TTS service namespace for convenient imports
 */
export const ttsService = {
  // Text chunking
  chunkText,
  estimateChunkCount,
  getTotalCharacterCount,

  // Cost calculation
  calculateTTSCost,
  estimateTTSCost,

  // Voice validation
  isValidOpenAIVoice,
  isValidElevenLabsVoice,
  normalizeVoice,
  getElevenLabsVoiceId,

  // OpenAI
  isOpenAITTSAvailable,
  generateOpenAIAudio,
  generateOpenAIAudioChunked,
  streamOpenAIAudio,

  // ElevenLabs
  isElevenLabsTTSAvailable,
  generateElevenLabsAudio,
  generateElevenLabsAudioChunked,
  streamElevenLabsAudio,

  // Unified interface
  generateAudio,
  generateAudioLongText,
  streamAudio,
  isTTSProviderAvailable,

  // Constants
  OPENAI_VOICES,
  ELEVENLABS_VOICES,
  ELEVENLABS_VOICE_IDS,
  OPENAI_MODELS,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  DEFAULT_OPENAI_VOICE,
  DEFAULT_ELEVENLABS_VOICE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_AUDIO_FORMAT,
  DEFAULT_SPEED,
  DEFAULT_STABILITY,
  DEFAULT_SIMILARITY_BOOST,
  TTS_PRICING,
} as const;

export default ttsService;
