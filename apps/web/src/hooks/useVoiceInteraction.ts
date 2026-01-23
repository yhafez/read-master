/**
 * React hooks for Voice Interaction with AI
 *
 * Provides hooks for:
 * - Speech-to-text (voice recording via Web Speech API)
 * - Text-to-speech (AI voice responses)
 * - Voice chat sessions
 * - Voice settings management
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";

// =============================================================================
// Web Speech API Type Declarations
// =============================================================================

// Speech Recognition types (for browsers that support it)
interface WebSpeechResultItem {
  transcript: string;
  confidence: number;
}

interface WebSpeechResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): WebSpeechResultItem;
  [index: number]: WebSpeechResultItem;
}

interface WebSpeechResultList {
  readonly length: number;
  item(index: number): WebSpeechResult;
  [index: number]: WebSpeechResult;
}

interface WebSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: WebSpeechResultList;
}

interface WebSpeechErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface WebSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((ev: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((ev: WebSpeechErrorEvent) => void) | null;
}

// Function to get the Speech Recognition constructor
function getSpeechRecognitionConstructor():
  | (new () => WebSpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Voice language type
 */
export type VoiceLanguage =
  | "en-US"
  | "en-GB"
  | "es-ES"
  | "es-MX"
  | "ar-SA"
  | "ja-JP"
  | "zh-CN"
  | "tl-PH"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "pt-BR"
  | "ko-KR"
  | "hi-IN";

/**
 * Voice interaction status
 */
export type VoiceInteractionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";

/**
 * Voice message role
 */
export type VoiceMessageRole = "user" | "assistant";

/**
 * TTS Engine type
 */
export type TextToSpeechEngine =
  | "web-speech-api"
  | "elevenlabs"
  | "openai-tts"
  | "azure"
  | "google-cloud";

/**
 * Speech recognition settings
 */
export interface SpeechRecognitionSettings {
  language: VoiceLanguage;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  silenceTimeout: number;
}

/**
 * Text-to-speech settings
 */
export interface TextToSpeechSettings {
  engine: TextToSpeechEngine;
  voiceId?: string;
  language: VoiceLanguage;
  rate: number;
  pitch: number;
  volume: number;
  autoPlay: boolean;
}

/**
 * Voice interaction settings
 */
export interface VoiceInteractionSettings {
  enabled: boolean;
  recognition: SpeechRecognitionSettings;
  synthesis: TextToSpeechSettings;
  wakeWord?: string;
  wakeWordEnabled: boolean;
  showWaveform: boolean;
  hapticFeedback: boolean;
  pushToTalkKey: string;
}

/**
 * Update voice interaction settings input
 * Allows partial updates to recognition and synthesis nested objects
 */
export interface UpdateVoiceSettingsInput {
  enabled?: boolean;
  recognition?: Partial<SpeechRecognitionSettings>;
  synthesis?: Partial<TextToSpeechSettings>;
  wakeWord?: string;
  wakeWordEnabled?: boolean;
  showWaveform?: boolean;
  hapticFeedback?: boolean;
  pushToTalkKey?: string;
}

/**
 * Voice message
 */
export interface VoiceMessage {
  id: string;
  role: VoiceMessageRole;
  text: string;
  audioUrl?: string;
  durationSeconds?: number;
  confidence?: number;
  language?: VoiceLanguage;
  timestamp: Date;
  processingTimeMs?: number;
  error?: string;
}

/**
 * Voice chat session
 */
export interface VoiceChatSession {
  id: string;
  userId: string;
  title?: string;
  messages: VoiceMessage[];
  status: VoiceInteractionStatus;
  context?: {
    bookId?: string;
    bookTitle?: string;
    pageNumber?: number;
  };
  totalDurationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Voice chat session summary
 */
export interface VoiceChatSessionSummary {
  id: string;
  title?: string;
  messageCount: number;
  totalDurationSeconds: number;
  lastMessagePreview?: string;
  context?: {
    bookId?: string;
    bookTitle?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TTS Voice
 */
export interface TTSVoice {
  id: string;
  name: string;
  language: VoiceLanguage;
  gender?: "male" | "female" | "neutral";
  previewUrl?: string;
  premium: boolean;
  engine: TextToSpeechEngine;
}

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{ transcript: string; confidence: number }>;
}

/**
 * Speech recognition error
 */
export interface SpeechRecognitionError {
  code:
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported"
    | "unknown";
  message: string;
}

// =============================================================================
// Default Settings
// =============================================================================

const DEFAULT_RECOGNITION_SETTINGS: SpeechRecognitionSettings = {
  language: "en-US",
  continuous: false,
  interimResults: true,
  maxAlternatives: 1,
  silenceTimeout: 3000,
};

const DEFAULT_TTS_SETTINGS: TextToSpeechSettings = {
  engine: "web-speech-api",
  language: "en-US",
  rate: 1,
  pitch: 0,
  volume: 1,
  autoPlay: true,
};

const DEFAULT_VOICE_SETTINGS: VoiceInteractionSettings = {
  enabled: true,
  recognition: DEFAULT_RECOGNITION_SETTINGS,
  synthesis: DEFAULT_TTS_SETTINGS,
  wakeWordEnabled: false,
  showWaveform: true,
  hapticFeedback: true,
  pushToTalkKey: "Space",
};

// =============================================================================
// Available Voices Catalog
// =============================================================================

/**
 * Available TTS voices (Web Speech API voices are populated at runtime)
 */
export function getAvailableVoices(): TTSVoice[] {
  const voices: TTSVoice[] = [];

  // Get Web Speech API voices if available
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const webVoices = window.speechSynthesis.getVoices();
    webVoices.forEach((voice) => {
      // Map common language codes
      const langMap: Record<string, VoiceLanguage> = {
        "en-US": "en-US",
        "en-GB": "en-GB",
        "es-ES": "es-ES",
        "es-MX": "es-MX",
        "ar-SA": "ar-SA",
        "ja-JP": "ja-JP",
        "zh-CN": "zh-CN",
        "fr-FR": "fr-FR",
        "de-DE": "de-DE",
        "it-IT": "it-IT",
        "pt-BR": "pt-BR",
        "ko-KR": "ko-KR",
        "hi-IN": "hi-IN",
      };

      const language = langMap[voice.lang] ?? "en-US";

      voices.push({
        id: voice.voiceURI,
        name: voice.name,
        language,
        premium: false,
        engine: "web-speech-api",
      });
    });
  }

  return voices;
}

/**
 * Supported languages list
 */
export const SUPPORTED_LANGUAGES: VoiceLanguage[] = [
  "en-US",
  "en-GB",
  "es-ES",
  "es-MX",
  "ar-SA",
  "ja-JP",
  "zh-CN",
  "tl-PH",
  "fr-FR",
  "de-DE",
  "it-IT",
  "pt-BR",
  "ko-KR",
  "hi-IN",
];

// =============================================================================
// Speech Recognition Hook
// =============================================================================

interface UseSpeechRecognitionOptions {
  settings?: Partial<SpeechRecognitionSettings>;
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: SpeechRecognitionError) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error: SpeechRecognitionError | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook for speech-to-text using Web Speech API
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { settings, onResult, onError, onStart, onEnd } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  const recognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);

  // Check for browser support
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Initialize recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();

    const mergedSettings = {
      ...DEFAULT_RECOGNITION_SETTINGS,
      ...settings,
    };

    recognition.lang = mergedSettings.language;
    recognition.continuous = mergedSettings.continuous;
    recognition.interimResults = mergedSettings.interimResults;
    recognition.maxAlternatives = mergedSettings.maxAlternatives;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onStart?.();
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results.item(i);
        if (result && result.isFinal) {
          const firstItem = result.item(0);
          if (firstItem) {
            finalTranscript += firstItem.transcript;
            setConfidence(firstItem.confidence);
          }
        } else if (result) {
          const firstItem = result.item(0);
          if (firstItem) {
            interim += firstItem.transcript;
          }
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        setInterimTranscript("");

        const alternatives: Array<{ transcript: string; confidence: number }> =
          [];
        const lastResult = event.results.item(event.results.length - 1);
        if (lastResult) {
          for (let i = 0; i < lastResult.length; i++) {
            const item = lastResult.item(i);
            if (item) {
              alternatives.push({
                transcript: item.transcript,
                confidence: item.confidence,
              });
            }
          }

          const firstItem = lastResult.item(0);
          onResult?.({
            transcript: finalTranscript,
            confidence: firstItem?.confidence ?? 0,
            isFinal: true,
            alternatives,
          });
        }
      } else {
        setInterimTranscript(interim);
        onResult?.({
          transcript: interim,
          confidence: 0,
          isFinal: false,
        });
      }
    };

    recognition.onerror = (event: WebSpeechErrorEvent) => {
      const errorMap: Record<string, SpeechRecognitionError["code"]> = {
        "no-speech": "no-speech",
        aborted: "aborted",
        "audio-capture": "audio-capture",
        network: "network",
        "not-allowed": "not-allowed",
        "service-not-allowed": "service-not-allowed",
        "bad-grammar": "bad-grammar",
        "language-not-supported": "language-not-supported",
      };

      const code = errorMap[event.error] ?? "unknown";
      const speechError: SpeechRecognitionError = {
        code,
        message: event.error,
      };

      setError(speechError);
      setIsListening(false);
      onError?.(speechError);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, settings, onResult, onError, onStart, onEnd]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setError(null);
    setInterimTranscript("");
    recognitionRef.current.start();
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setConfidence(0);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

// =============================================================================
// Text-to-Speech Hook
// =============================================================================

interface UseSpeechSynthesisOptions {
  settings?: Partial<TextToSpeechSettings>;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onPause?: () => void;
  onResume?: () => void;
}

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, voiceId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Hook for text-to-speech using Web Speech API
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const { settings, onStart, onEnd, onError, onPause, onResume } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for browser support
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Load voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string, voiceId?: string) => {
      if (!isSupported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      const mergedSettings = {
        ...DEFAULT_TTS_SETTINGS,
        ...settings,
      };

      utterance.rate = mergedSettings.rate;
      utterance.pitch = mergedSettings.pitch + 1; // Web Speech API uses 0-2 range
      utterance.volume = mergedSettings.volume;

      // Find voice
      const targetVoiceId = voiceId ?? settings?.voiceId;
      if (targetVoiceId) {
        const voice = voices.find((v) => v.voiceURI === targetVoiceId);
        if (voice) {
          utterance.voice = voice;
        }
      } else {
        // Find voice by language
        const langPrefix = mergedSettings.language.split("-")[0] ?? "en";
        const voice = voices.find((v) => v.lang.startsWith(langPrefix));
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        onEnd?.();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setIsPaused(false);
        onError?.(new Error(event.error));
      };

      utterance.onpause = () => {
        setIsPaused(true);
        onPause?.();
      };

      utterance.onresume = () => {
        setIsPaused(false);
        onResume?.();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, settings, voices, onStart, onEnd, onError, onPause, onResume]
  );

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause();
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume();
    }
  }, [isSupported, isPaused]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    speak,
    pause,
    resume,
    stop,
  };
}

// =============================================================================
// Voice Chat Hook
// =============================================================================

interface UseVoiceChatOptions {
  sessionId?: string;
  context?:
    | {
        bookId?: string;
        bookTitle?: string;
        pageNumber?: number;
      }
    | undefined;
  settings?: Partial<VoiceInteractionSettings> | undefined;
  onMessage?: (message: VoiceMessage) => void;
  onStatusChange?: (status: VoiceInteractionStatus) => void;
}

interface UseVoiceChatReturn {
  session: VoiceChatSession | null;
  status: VoiceInteractionStatus;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  messages: VoiceMessage[];
  startListening: () => void;
  stopListening: () => void;
  sendMessage: (text: string) => Promise<void>;
  cancelSpeech: () => void;
  clearSession: () => void;
}

/**
 * Combined hook for voice chat with AI
 */
export function useVoiceChat(
  options: UseVoiceChatOptions = {}
): UseVoiceChatReturn {
  const { sessionId, context, settings, onMessage, onStatusChange } = options;

  const [session, setSession] = useState<VoiceChatSession | null>(null);
  const [status, setStatus] = useState<VoiceInteractionStatus>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);

  // Initialize speech recognition
  const recognitionOptions: UseSpeechRecognitionOptions = {
    onResult: (result: SpeechRecognitionResult) => {
      if (result.isFinal && result.transcript.trim()) {
        // Auto-send when speech ends
        handleSendMessage(result.transcript.trim());
      }
    },
    onStart: () => {
      updateStatus("listening");
    },
    onEnd: () => {
      if (status === "listening") {
        updateStatus("idle");
      }
    },
    onError: () => {
      updateStatus("error");
    },
  };
  if (settings?.recognition) {
    recognitionOptions.settings = settings.recognition;
  }

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    resetTranscript,
  } = useSpeechRecognition(recognitionOptions);

  // Initialize speech synthesis
  const synthesisOptions: UseSpeechSynthesisOptions = {
    onStart: () => {
      updateStatus("speaking");
    },
    onEnd: () => {
      updateStatus("idle");
    },
  };
  if (settings?.synthesis) {
    synthesisOptions.settings = settings.synthesis;
  }

  const {
    isSpeaking,
    speak,
    stop: stopSpeech,
  } = useSpeechSynthesis(synthesisOptions);

  // Initialize or load session
  useEffect(() => {
    if (sessionId) {
      // Load existing session
      const storedSession = localStorage.getItem(`voice-session-${sessionId}`);
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession) as VoiceChatSession;
          setSession(parsed);
          setMessages(parsed.messages);
        } catch {
          // Create new session if parsing fails
          createNewSession();
        }
      }
    } else {
      createNewSession();
    }
  }, [sessionId]);

  const createNewSession = useCallback(() => {
    const newSession: VoiceChatSession = {
      id: `session-${Date.now()}`,
      userId: "current-user", // Would be from auth context
      title: context?.bookTitle
        ? `Chat about ${context.bookTitle}`
        : "Voice Chat",
      messages: [],
      status: "idle",
      totalDurationSeconds: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Only set context if it has at least one defined property
    if (
      context &&
      (context.bookId || context.bookTitle || context.pageNumber)
    ) {
      newSession.context = {
        ...(context.bookId && { bookId: context.bookId }),
        ...(context.bookTitle && { bookTitle: context.bookTitle }),
        ...(context.pageNumber && { pageNumber: context.pageNumber }),
      };
    }
    setSession(newSession);
    setMessages([]);
    return newSession;
  }, [context]);

  const updateStatus = useCallback(
    (newStatus: VoiceInteractionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  const addMessage = useCallback(
    (message: VoiceMessage) => {
      setMessages((prev) => [...prev, message]);
      onMessage?.(message);

      // Update session
      setSession((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          messages: [...prev.messages, message],
          updatedAt: new Date(),
        };
        // Persist to localStorage
        localStorage.setItem(
          `voice-session-${prev.id}`,
          JSON.stringify(updated)
        );
        return updated;
      });
    },
    [onMessage]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      updateStatus("processing");

      // Add user message
      const userMessage: VoiceMessage = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        text: text.trim(),
        timestamp: new Date(),
      };
      addMessage(userMessage);
      resetTranscript();

      // Simulate AI thinking
      updateStatus("thinking");

      try {
        // TODO: Replace with actual AI API call
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Generate mock AI response
        const aiResponse = generateMockAIResponse(text, context);

        const assistantMessage: VoiceMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          text: aiResponse,
          timestamp: new Date(),
          processingTimeMs: 1000,
        };
        addMessage(assistantMessage);

        // Speak the response if auto-play is enabled
        if (settings?.synthesis?.autoPlay !== false) {
          speak(aiResponse);
        } else {
          updateStatus("idle");
        }
      } catch {
        const errorMessage: VoiceMessage = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          error: "Failed to get AI response",
        };
        addMessage(errorMessage);
        updateStatus("error");
      }
    },
    [
      addMessage,
      context,
      resetTranscript,
      settings?.synthesis?.autoPlay,
      speak,
      updateStatus,
    ]
  );

  const startListening = useCallback(() => {
    startSpeechRecognition();
  }, [startSpeechRecognition]);

  const stopListening = useCallback(() => {
    stopSpeechRecognition();
  }, [stopSpeechRecognition]);

  const sendMessage = useCallback(
    async (text: string) => {
      await handleSendMessage(text);
    },
    [handleSendMessage]
  );

  const cancelSpeech = useCallback(() => {
    stopSpeech();
    updateStatus("idle");
  }, [stopSpeech, updateStatus]);

  const clearSession = useCallback(() => {
    if (session) {
      localStorage.removeItem(`voice-session-${session.id}`);
    }
    createNewSession();
    updateStatus("idle");
  }, [createNewSession, session, updateStatus]);

  return {
    session,
    status,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    messages,
    startListening,
    stopListening,
    sendMessage,
    cancelSpeech,
    clearSession,
  };
}

// Helper function to generate mock AI responses
function generateMockAIResponse(
  userText: string,
  context?: { bookId?: string; bookTitle?: string; pageNumber?: number }
): string {
  const lowerText = userText.toLowerCase();

  if (context?.bookTitle) {
    if (lowerText.includes("summary") || lowerText.includes("summarize")) {
      return `Here's a brief summary of what you've read so far in "${context.bookTitle}". The key themes and concepts covered include the main narrative elements and supporting details that help build the overall story structure.`;
    }
    if (lowerText.includes("explain") || lowerText.includes("what does")) {
      return `In the context of "${context.bookTitle}", this passage explores important ideas about the subject matter. The author uses specific language to convey deeper meaning and connect with the reader's understanding.`;
    }
  }

  if (lowerText.includes("help") || lowerText.includes("what can you do")) {
    return "I can help you with your reading! Ask me to explain passages, summarize content, define vocabulary, or discuss themes. I can also create flashcards from your reading to help with retention.";
  }

  if (lowerText.includes("hello") || lowerText.includes("hi")) {
    return "Hello! I'm your reading assistant. How can I help you with your reading today?";
  }

  return "I understand your question. Let me help you with that. The key point to consider here is how the content relates to your overall learning goals and how you can apply these insights to better understand the material.";
}

// =============================================================================
// Voice Settings Hook
// =============================================================================

/**
 * Hook to get voice interaction settings
 */
export function useVoiceSettings(
  options?: Omit<
    UseQueryOptions<VoiceInteractionSettings, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.voice.settings(),
    queryFn: async (): Promise<VoiceInteractionSettings> => {
      // Load from localStorage
      const stored = localStorage.getItem("voice-interaction-settings");
      if (stored) {
        try {
          return JSON.parse(stored) as VoiceInteractionSettings;
        } catch {
          // Fall through to defaults
        }
      }
      return DEFAULT_VOICE_SETTINGS;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to update voice interaction settings
 */
export function useUpdateVoiceSettings(
  options?: Omit<
    UseMutationOptions<
      VoiceInteractionSettings,
      Error,
      UpdateVoiceSettingsInput
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: UpdateVoiceSettingsInput
    ): Promise<VoiceInteractionSettings> => {
      const current = await queryClient.fetchQuery({
        queryKey: queryKeys.voice.settings(),
        queryFn: async () => {
          const stored = localStorage.getItem("voice-interaction-settings");
          if (stored) {
            return JSON.parse(stored) as VoiceInteractionSettings;
          }
          return DEFAULT_VOICE_SETTINGS;
        },
      });

      const updated: VoiceInteractionSettings = {
        ...current,
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        ...(updates.wakeWord !== undefined && { wakeWord: updates.wakeWord }),
        ...(updates.wakeWordEnabled !== undefined && {
          wakeWordEnabled: updates.wakeWordEnabled,
        }),
        ...(updates.showWaveform !== undefined && {
          showWaveform: updates.showWaveform,
        }),
        ...(updates.hapticFeedback !== undefined && {
          hapticFeedback: updates.hapticFeedback,
        }),
        ...(updates.pushToTalkKey !== undefined && {
          pushToTalkKey: updates.pushToTalkKey,
        }),
        recognition: updates.recognition
          ? { ...current.recognition, ...updates.recognition }
          : current.recognition,
        synthesis: updates.synthesis
          ? { ...current.synthesis, ...updates.synthesis }
          : current.synthesis,
      };

      localStorage.setItem(
        "voice-interaction-settings",
        JSON.stringify(updated)
      );
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.voice.settings(), data);
    },
    ...options,
  });
}

// =============================================================================
// Voice Sessions Hook
// =============================================================================

/**
 * Hook to get voice chat sessions
 */
export function useVoiceChatSessions(
  params?: { bookId?: string; limit?: number },
  options?: Omit<
    UseQueryOptions<VoiceChatSessionSummary[], Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.voice.sessionsList(
      params as Record<string, unknown> | undefined
    ),
    queryFn: async (): Promise<VoiceChatSessionSummary[]> => {
      // Load from localStorage
      const sessions: VoiceChatSessionSummary[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("voice-session-")) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const session = JSON.parse(data) as VoiceChatSession;

              // Filter by bookId if provided
              if (params?.bookId && session.context?.bookId !== params.bookId) {
                continue;
              }

              const lastMessage = session.messages[session.messages.length - 1];
              const lastMessagePreview = lastMessage?.text?.slice(0, 100);

              const sessionSummary: VoiceChatSessionSummary = {
                id: session.id,
                messageCount: session.messages.length,
                totalDurationSeconds: session.totalDurationSeconds,
                createdAt: new Date(session.createdAt),
                updatedAt: new Date(session.updatedAt),
                ...(session.title && { title: session.title }),
                ...(lastMessagePreview && { lastMessagePreview }),
              };

              // Only add context if it has values
              if (session.context) {
                const contextObj: { bookId?: string; bookTitle?: string } = {};
                if (session.context.bookId) {
                  contextObj.bookId = session.context.bookId;
                }
                if (session.context.bookTitle) {
                  contextObj.bookTitle = session.context.bookTitle;
                }
                if (Object.keys(contextObj).length > 0) {
                  sessionSummary.context = contextObj;
                }
              }

              sessions.push(sessionSummary);
            }
          } catch {
            // Skip invalid sessions
          }
        }
      }

      // Sort by updatedAt descending
      sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Apply limit
      if (params?.limit) {
        return sessions.slice(0, params.limit);
      }

      return sessions;
    },
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Hook to delete a voice chat session
 */
export function useDeleteVoiceChatSession(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      localStorage.removeItem(`voice-session-${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.voice.sessions() });
    },
    ...options,
  });
}

// =============================================================================
// Available Voices Hook
// =============================================================================

/**
 * Hook to get available TTS voices
 */
export function useAvailableVoices(
  options?: Omit<UseQueryOptions<TTSVoice[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.voice.voices(),
    queryFn: async (): Promise<TTSVoice[]> => {
      return getAvailableVoices();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
}
