/**
 * Zod schemas for Voice Interaction with AI
 *
 * These schemas validate voice-related API requests for:
 * - Speech-to-text (voice recording)
 * - Text-to-speech (AI voice responses)
 * - Voice chat sessions
 * - Voice command shortcuts
 *
 * Uses Web Speech API for browser-based speech recognition
 * and various TTS providers for AI voice responses.
 *
 * @example
 * ```typescript
 * import { voiceMessageSchema, voiceChatSessionSchema } from '@read-master/shared/schemas';
 *
 * // Validate voice message
 * const result = voiceMessageSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * ```
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Supported speech-to-text engines
 */
export const speechRecognitionEngineSchema = z.enum([
  "web-speech-api", // Browser native Web Speech API
  "whisper", // OpenAI Whisper
  "deepgram", // Deepgram ASR
  "azure", // Azure Cognitive Services
]);
export type SpeechRecognitionEngine = z.infer<
  typeof speechRecognitionEngineSchema
>;

/**
 * Supported text-to-speech engines for AI responses
 */
export const textToSpeechEngineSchema = z.enum([
  "web-speech-api", // Browser native synthesis
  "elevenlabs", // ElevenLabs
  "openai-tts", // OpenAI TTS
  "azure", // Azure Cognitive Services
  "google-cloud", // Google Cloud TTS
]);
export type TextToSpeechEngine = z.infer<typeof textToSpeechEngineSchema>;

/**
 * Voice message role (who is speaking)
 */
export const voiceMessageRoleSchema = z.enum([
  "user", // User's voice input
  "assistant", // AI voice response
]);
export type VoiceMessageRole = z.infer<typeof voiceMessageRoleSchema>;

/**
 * Voice interaction status
 */
export const voiceInteractionStatusSchema = z.enum([
  "idle", // Not recording or playing
  "listening", // Recording user voice
  "processing", // Processing speech-to-text
  "thinking", // AI generating response
  "speaking", // AI speaking response
  "paused", // Playback paused
  "error", // Error state
]);
export type VoiceInteractionStatus = z.infer<
  typeof voiceInteractionStatusSchema
>;

/**
 * Supported languages for voice interaction
 */
export const voiceLanguageSchema = z.enum([
  "en-US", // English (US)
  "en-GB", // English (UK)
  "es-ES", // Spanish (Spain)
  "es-MX", // Spanish (Mexico)
  "ar-SA", // Arabic
  "ja-JP", // Japanese
  "zh-CN", // Chinese (Simplified)
  "tl-PH", // Tagalog
  "fr-FR", // French
  "de-DE", // German
  "it-IT", // Italian
  "pt-BR", // Portuguese (Brazil)
  "ko-KR", // Korean
  "hi-IN", // Hindi
]);
export type VoiceLanguage = z.infer<typeof voiceLanguageSchema>;

// =============================================================================
// VOICE SETTINGS SCHEMAS
// =============================================================================

/**
 * Voice settings for speech recognition
 */
export const speechRecognitionSettingsSchema = z.object({
  /** Speech recognition engine */
  engine: speechRecognitionEngineSchema.default("web-speech-api"),
  /** Language for recognition */
  language: voiceLanguageSchema.default("en-US"),
  /** Enable continuous recognition (keep listening after phrase ends) */
  continuous: z.boolean().default(false),
  /** Return interim results (partial transcriptions) */
  interimResults: z.boolean().default(true),
  /** Maximum alternatives to return */
  maxAlternatives: z.number().int().min(1).max(5).default(1),
  /** Silence detection timeout in ms */
  silenceTimeout: z.number().int().min(1000).max(10000).default(3000),
  /** Audio gain (volume boost) */
  audioGain: z.number().min(0).max(2).default(1),
});
export type SpeechRecognitionSettings = z.infer<
  typeof speechRecognitionSettingsSchema
>;

/**
 * Voice settings for text-to-speech
 */
export const textToSpeechSettingsSchema = z.object({
  /** TTS engine to use */
  engine: textToSpeechEngineSchema.default("web-speech-api"),
  /** Voice identifier (varies by engine) */
  voiceId: z.string().optional(),
  /** Language for TTS */
  language: voiceLanguageSchema.default("en-US"),
  /** Speech rate (0.5 = half speed, 2 = double speed) */
  rate: z.number().min(0.25).max(4).default(1),
  /** Pitch adjustment (-1 to 1) */
  pitch: z.number().min(-1).max(1).default(0),
  /** Volume (0 to 1) */
  volume: z.number().min(0).max(1).default(1),
  /** Enable auto-play of AI responses */
  autoPlay: z.boolean().default(true),
});
export type TextToSpeechSettings = z.infer<typeof textToSpeechSettingsSchema>;

/**
 * Combined voice interaction settings
 */
export const voiceInteractionSettingsSchema = z.object({
  /** Whether voice interaction is enabled */
  enabled: z.boolean().default(true),
  /** Speech recognition settings */
  recognition: speechRecognitionSettingsSchema.default({}),
  /** Text-to-speech settings */
  synthesis: textToSpeechSettingsSchema.default({}),
  /** Wake word (if enabled) */
  wakeWord: z.string().min(2).max(50).optional(),
  /** Enable wake word detection */
  wakeWordEnabled: z.boolean().default(false),
  /** Show voice waveform visualization */
  showWaveform: z.boolean().default(true),
  /** Enable haptic feedback (mobile) */
  hapticFeedback: z.boolean().default(true),
  /** Keyboard shortcut for push-to-talk */
  pushToTalkKey: z.string().max(20).default("Space"),
});
export type VoiceInteractionSettings = z.infer<
  typeof voiceInteractionSettingsSchema
>;

/**
 * Update voice interaction settings
 */
export const updateVoiceInteractionSettingsSchema =
  voiceInteractionSettingsSchema.partial();
export type UpdateVoiceInteractionSettingsInput = z.infer<
  typeof updateVoiceInteractionSettingsSchema
>;

// =============================================================================
// VOICE MESSAGE SCHEMAS
// =============================================================================

/**
 * Voice message (a single turn in voice conversation)
 */
export const voiceMessageSchema = z.object({
  /** Unique message ID */
  id: z.string().min(1),
  /** Who sent the message */
  role: voiceMessageRoleSchema,
  /** Transcribed text (for user) or response text (for assistant) */
  text: z.string(),
  /** Audio URL (if audio is stored/cached) */
  audioUrl: z.string().url().optional(),
  /** Audio blob (for temporary storage) */
  audioBlob: z.instanceof(Blob).optional(),
  /** Duration in seconds */
  durationSeconds: z.number().nonnegative().optional(),
  /** Confidence score for transcription (0-1) */
  confidence: z.number().min(0).max(1).optional(),
  /** Language detected/used */
  language: voiceLanguageSchema.optional(),
  /** Timestamp */
  timestamp: z.date(),
  /** Processing time in ms */
  processingTimeMs: z.number().int().nonnegative().optional(),
  /** Error if any */
  error: z.string().optional(),
});
export type VoiceMessage = z.infer<typeof voiceMessageSchema>;

/**
 * Voice message input (for creating new message)
 */
export const createVoiceMessageSchema = z.object({
  /** Transcribed or input text */
  text: z.string().min(1).max(10000),
  /** Role */
  role: voiceMessageRoleSchema,
  /** Audio blob (optional) */
  audioBlob: z.instanceof(Blob).optional(),
  /** Session ID */
  sessionId: z.string().min(1).optional(),
  /** Context (e.g., current book, page) */
  context: z
    .object({
      bookId: z.string().optional(),
      pageNumber: z.number().int().optional(),
      selectedText: z.string().max(5000).optional(),
    })
    .optional(),
});
export type CreateVoiceMessageInput = z.infer<typeof createVoiceMessageSchema>;

// =============================================================================
// VOICE CHAT SESSION SCHEMAS
// =============================================================================

/**
 * Voice chat session
 */
export const voiceChatSessionSchema = z.object({
  /** Session ID */
  id: z.string().min(1),
  /** User ID */
  userId: z.string().min(1),
  /** Session title (auto-generated or user-set) */
  title: z.string().max(200).optional(),
  /** Messages in the session */
  messages: z.array(voiceMessageSchema),
  /** Current status */
  status: voiceInteractionStatusSchema,
  /** Settings used for this session */
  settings: voiceInteractionSettingsSchema.optional(),
  /** Context (book, page, etc.) */
  context: z
    .object({
      bookId: z.string().optional(),
      bookTitle: z.string().optional(),
      pageNumber: z.number().int().optional(),
    })
    .optional(),
  /** Total duration of all audio in seconds */
  totalDurationSeconds: z.number().nonnegative().default(0),
  /** Created timestamp */
  createdAt: z.date(),
  /** Last updated timestamp */
  updatedAt: z.date(),
});
export type VoiceChatSession = z.infer<typeof voiceChatSessionSchema>;

/**
 * Create voice chat session
 */
export const createVoiceChatSessionSchema = z.object({
  /** Optional title */
  title: z.string().max(200).optional(),
  /** Context */
  context: z
    .object({
      bookId: z.string().optional(),
      bookTitle: z.string().optional(),
      pageNumber: z.number().int().optional(),
    })
    .optional(),
  /** Initial settings override */
  settings: voiceInteractionSettingsSchema.partial().optional(),
});
export type CreateVoiceChatSessionInput = z.infer<
  typeof createVoiceChatSessionSchema
>;

/**
 * Voice chat session summary (for listing)
 */
export const voiceChatSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  messageCount: z.number().int().nonnegative(),
  totalDurationSeconds: z.number().nonnegative(),
  lastMessagePreview: z.string().max(200).optional(),
  context: z
    .object({
      bookId: z.string().optional(),
      bookTitle: z.string().optional(),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type VoiceChatSessionSummary = z.infer<
  typeof voiceChatSessionSummarySchema
>;

// =============================================================================
// SPEECH RECOGNITION SCHEMAS
// =============================================================================

/**
 * Speech recognition result
 */
export const speechRecognitionResultSchema = z.object({
  /** Transcribed text */
  transcript: z.string(),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** Is this a final result? */
  isFinal: z.boolean(),
  /** Alternative transcriptions */
  alternatives: z
    .array(
      z.object({
        transcript: z.string(),
        confidence: z.number().min(0).max(1),
      })
    )
    .optional(),
  /** Detected language */
  detectedLanguage: voiceLanguageSchema.optional(),
});
export type SpeechRecognitionResult = z.infer<
  typeof speechRecognitionResultSchema
>;

/**
 * Speech recognition error
 */
export const speechRecognitionErrorSchema = z.object({
  /** Error code */
  code: z.enum([
    "no-speech", // No speech detected
    "aborted", // Recognition aborted
    "audio-capture", // Audio capture failed
    "network", // Network error
    "not-allowed", // Microphone permission denied
    "service-not-allowed", // Speech service not available
    "bad-grammar", // Grammar compilation failed
    "language-not-supported", // Language not supported
    "unknown", // Unknown error
  ]),
  /** Human-readable message */
  message: z.string(),
});
export type SpeechRecognitionError = z.infer<
  typeof speechRecognitionErrorSchema
>;

// =============================================================================
// TEXT-TO-SPEECH SCHEMAS
// =============================================================================

/**
 * Available TTS voice
 */
export const ttsVoiceSchema = z.object({
  /** Voice ID */
  id: z.string(),
  /** Display name */
  name: z.string(),
  /** Language */
  language: voiceLanguageSchema,
  /** Gender */
  gender: z.enum(["male", "female", "neutral"]).optional(),
  /** Preview audio URL */
  previewUrl: z.string().url().optional(),
  /** Whether this is a premium voice */
  premium: z.boolean().default(false),
  /** Engine this voice belongs to */
  engine: textToSpeechEngineSchema,
});
export type TTSVoice = z.infer<typeof ttsVoiceSchema>;

/**
 * TTS synthesis request
 */
export const ttsSynthesisRequestSchema = z.object({
  /** Text to synthesize */
  text: z.string().min(1).max(5000),
  /** Voice ID */
  voiceId: z.string().optional(),
  /** Language */
  language: voiceLanguageSchema.default("en-US"),
  /** Engine to use */
  engine: textToSpeechEngineSchema.default("web-speech-api"),
  /** Speech rate */
  rate: z.number().min(0.25).max(4).default(1),
  /** Pitch */
  pitch: z.number().min(-1).max(1).default(0),
  /** Volume */
  volume: z.number().min(0).max(1).default(1),
  /** Output format */
  format: z.enum(["mp3", "wav", "ogg"]).default("mp3"),
});
export type TTSSynthesisRequest = z.infer<typeof ttsSynthesisRequestSchema>;

/**
 * TTS synthesis response
 */
export const ttsSynthesisResponseSchema = z.object({
  /** Audio URL */
  audioUrl: z.string().url().optional(),
  /** Audio data (base64) */
  audioData: z.string().optional(),
  /** Audio format */
  format: z.enum(["mp3", "wav", "ogg"]),
  /** Duration in seconds */
  durationSeconds: z.number().nonnegative(),
  /** Character count processed */
  characterCount: z.number().int().nonnegative(),
});
export type TTSSynthesisResponse = z.infer<typeof ttsSynthesisResponseSchema>;

// =============================================================================
// VOICE COMMAND SCHEMAS
// =============================================================================

/**
 * Voice command definition
 */
export const voiceCommandSchema = z.object({
  /** Command ID */
  id: z.string(),
  /** Trigger phrases (any of these activates the command) */
  triggers: z.array(z.string().min(1)).min(1),
  /** Command action */
  action: z.enum([
    // Navigation
    "navigate-library",
    "navigate-reader",
    "navigate-flashcards",
    "navigate-settings",
    "navigate-back",
    // Reading
    "next-page",
    "previous-page",
    "read-aloud",
    "stop-reading",
    "toggle-bookmark",
    // AI
    "ask-ai",
    "explain-selection",
    "summarize",
    // General
    "search",
    "help",
    "cancel",
  ]),
  /** Description */
  description: z.string().max(200),
  /** Whether command is enabled */
  enabled: z.boolean().default(true),
  /** Language for this command */
  language: voiceLanguageSchema,
});
export type VoiceCommand = z.infer<typeof voiceCommandSchema>;

/**
 * Voice command result
 */
export const voiceCommandResultSchema = z.object({
  /** Whether a command was matched */
  matched: z.boolean(),
  /** Matched command (if any) */
  command: voiceCommandSchema.optional(),
  /** Original transcript */
  transcript: z.string(),
  /** Confidence of match (0-1) */
  confidence: z.number().min(0).max(1).optional(),
});
export type VoiceCommandResult = z.infer<typeof voiceCommandResultSchema>;

// =============================================================================
// API SCHEMAS
// =============================================================================

/**
 * Voice chat query parameters
 */
export const voiceChatQuerySchema = z.object({
  /** Session ID to continue */
  sessionId: z.string().optional(),
  /** Book context */
  bookId: z.string().optional(),
  /** Page number context */
  pageNumber: z.coerce.number().int().optional(),
  /** Limit messages returned */
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type VoiceChatQuery = z.infer<typeof voiceChatQuerySchema>;

/**
 * Voice chat history query
 */
export const voiceChatHistoryQuerySchema = z.object({
  /** Filter by book */
  bookId: z.string().optional(),
  /** Pagination cursor */
  cursor: z.string().optional(),
  /** Results per page */
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Sort order */
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type VoiceChatHistoryQuery = z.infer<typeof voiceChatHistoryQuerySchema>;

/**
 * Send voice message to AI
 */
export const sendVoiceMessageSchema = z.object({
  /** Session ID (creates new if not provided) */
  sessionId: z.string().optional(),
  /** Transcribed text from user's voice */
  text: z.string().min(1).max(10000),
  /** Context */
  context: z
    .object({
      bookId: z.string().optional(),
      pageNumber: z.number().int().optional(),
      selectedText: z.string().max(5000).optional(),
    })
    .optional(),
  /** Whether to generate audio response */
  generateAudio: z.boolean().default(true),
  /** TTS settings for response */
  ttsSettings: textToSpeechSettingsSchema.partial().optional(),
});
export type SendVoiceMessageInput = z.infer<typeof sendVoiceMessageSchema>;

/**
 * Voice message response
 */
export const voiceMessageResponseSchema = z.object({
  /** Session ID */
  sessionId: z.string(),
  /** AI response message */
  message: voiceMessageSchema,
  /** Audio URL (if generated) */
  audioUrl: z.string().url().optional(),
  /** Processing metrics */
  metrics: z
    .object({
      transcriptionTimeMs: z.number().int().optional(),
      aiResponseTimeMs: z.number().int(),
      ttsTimeMs: z.number().int().optional(),
      totalTimeMs: z.number().int(),
    })
    .optional(),
});
export type VoiceMessageResponse = z.infer<typeof voiceMessageResponseSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Voice settings response
 */
export const voiceSettingsResponseSchema = z.object({
  settings: voiceInteractionSettingsSchema,
  availableVoices: z.array(ttsVoiceSchema),
  supportedLanguages: z.array(voiceLanguageSchema),
});
export type VoiceSettingsResponse = z.infer<typeof voiceSettingsResponseSchema>;

/**
 * Voice chat sessions list response
 */
export const voiceChatSessionsResponseSchema = z.object({
  sessions: z.array(voiceChatSessionSummarySchema),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  cursor: z.string().optional(),
});
export type VoiceChatSessionsResponse = z.infer<
  typeof voiceChatSessionsResponseSchema
>;

// =============================================================================
// SCHEMA COLLECTION
// =============================================================================

/**
 * All voice interaction schemas for convenient importing
 */
export const voiceInteractionSchemas = {
  // Enums
  speechRecognitionEngine: speechRecognitionEngineSchema,
  textToSpeechEngine: textToSpeechEngineSchema,
  messageRole: voiceMessageRoleSchema,
  interactionStatus: voiceInteractionStatusSchema,
  language: voiceLanguageSchema,

  // Settings
  speechRecognitionSettings: speechRecognitionSettingsSchema,
  textToSpeechSettings: textToSpeechSettingsSchema,
  interactionSettings: voiceInteractionSettingsSchema,
  updateSettings: updateVoiceInteractionSettingsSchema,

  // Messages
  message: voiceMessageSchema,
  createMessage: createVoiceMessageSchema,

  // Sessions
  session: voiceChatSessionSchema,
  createSession: createVoiceChatSessionSchema,
  sessionSummary: voiceChatSessionSummarySchema,

  // Speech recognition
  recognitionResult: speechRecognitionResultSchema,
  recognitionError: speechRecognitionErrorSchema,

  // TTS
  voice: ttsVoiceSchema,
  synthesisRequest: ttsSynthesisRequestSchema,
  synthesisResponse: ttsSynthesisResponseSchema,

  // Commands
  command: voiceCommandSchema,
  commandResult: voiceCommandResultSchema,

  // API
  chatQuery: voiceChatQuerySchema,
  historyQuery: voiceChatHistoryQuerySchema,
  sendMessage: sendVoiceMessageSchema,
  messageResponse: voiceMessageResponseSchema,

  // Responses
  settingsResponse: voiceSettingsResponseSchema,
  sessionsResponse: voiceChatSessionsResponseSchema,
} as const;
