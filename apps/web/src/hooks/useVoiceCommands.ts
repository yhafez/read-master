/**
 * Voice Commands Hook
 *
 * Provides voice command support for accessibility using the Web Speech API.
 * Supports navigation, reading controls, and common actions.
 *
 * @example
 * const { isListening, startListening, stopListening, isSupported } = useVoiceCommands({
 *   onNavigate: (route) => navigate(route),
 *   onReadingAction: (action) => handleReadingAction(action),
 * });
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported navigation commands
 */
export type NavigationCommand =
  | "home"
  | "library"
  | "flashcards"
  | "assessments"
  | "settings"
  | "groups"
  | "forum"
  | "leaderboard"
  | "curriculums"
  | "back"
  | "forward";

/**
 * Supported reading commands
 */
export type ReadingCommand =
  | "next_page"
  | "previous_page"
  | "read_aloud"
  | "stop_reading"
  | "pause"
  | "resume"
  | "add_bookmark"
  | "remove_bookmark"
  | "create_note"
  | "highlight"
  | "increase_font"
  | "decrease_font"
  | "toggle_fullscreen";

/**
 * Generic action commands
 */
export type ActionCommand =
  | "search"
  | "help"
  | "close"
  | "cancel"
  | "confirm"
  | "save"
  | "undo"
  | "redo"
  | "refresh";

/**
 * All voice commands
 */
export type VoiceCommand = NavigationCommand | ReadingCommand | ActionCommand;

/**
 * Voice command result with confidence
 */
export interface VoiceCommandResult {
  command: VoiceCommand;
  transcript: string;
  confidence: number;
}

/**
 * Voice command error
 */
export interface VoiceCommandError {
  type: "not-supported" | "not-allowed" | "no-speech" | "network" | "unknown";
  message: string;
}

/**
 * Voice commands hook options
 */
export interface UseVoiceCommandsOptions {
  /** Called when a navigation command is recognized */
  onNavigate?: ((command: NavigationCommand) => void) | undefined;
  /** Called when a reading command is recognized */
  onReadingAction?: ((command: ReadingCommand) => void) | undefined;
  /** Called when an action command is recognized */
  onAction?: ((command: ActionCommand) => void) | undefined;
  /** Called when any command is recognized */
  onCommand?: ((result: VoiceCommandResult) => void) | undefined;
  /** Called when an error occurs */
  onError?: ((error: VoiceCommandError) => void) | undefined;
  /** Language for speech recognition (default: user's locale or 'en-US') */
  language?: string | undefined;
  /** Whether to provide visual feedback (default: true) */
  visualFeedback?: boolean | undefined;
  /** Whether to provide audio feedback (default: true) */
  audioFeedback?: boolean | undefined;
  /** Whether to auto-start listening (default: false) */
  autoStart?: boolean | undefined;
  /** Continuous listening mode (default: false) */
  continuous?: boolean | undefined;
  /** Minimum confidence threshold (0-1, default: 0.5) */
  confidenceThreshold?: number | undefined;
}

/**
 * Voice commands hook return type
 */
export interface UseVoiceCommandsReturn {
  /** Whether voice commands are supported in this browser */
  isSupported: boolean;
  /** Whether currently listening for commands */
  isListening: boolean;
  /** Current transcript while listening */
  transcript: string;
  /** Last recognized command */
  lastCommand: VoiceCommandResult | null;
  /** Start listening for voice commands */
  startListening: () => void;
  /** Stop listening for voice commands */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => void;
  /** Get available commands for current language */
  getAvailableCommands: () => VoiceCommandVocabulary;
  /** Check if a specific command is available */
  hasCommand: (command: VoiceCommand) => boolean;
}

/**
 * Voice command vocabulary mapping
 */
export interface VoiceCommandVocabulary {
  navigation: Record<NavigationCommand, string[]>;
  reading: Record<ReadingCommand, string[]>;
  actions: Record<ActionCommand, string[]>;
}

// ============================================================================
// Command Vocabulary (Multi-language support)
// ============================================================================

/**
 * Get voice command vocabulary for a specific language
 */
export function getVoiceCommandVocabulary(
  language: string
): VoiceCommandVocabulary {
  const lang = language.split("-")[0]?.toLowerCase() ?? "en";

  // English vocabulary (default)
  const englishVocabulary: VoiceCommandVocabulary = {
    navigation: {
      home: ["home", "go home", "go to home", "dashboard", "go to dashboard"],
      library: [
        "library",
        "go to library",
        "my books",
        "books",
        "open library",
      ],
      flashcards: [
        "flashcards",
        "flash cards",
        "go to flashcards",
        "review cards",
        "study",
      ],
      assessments: ["assessments", "tests", "quizzes", "go to assessments"],
      settings: ["settings", "preferences", "go to settings", "options"],
      groups: ["groups", "reading groups", "go to groups", "my groups"],
      forum: ["forum", "discussions", "go to forum", "community"],
      leaderboard: ["leaderboard", "rankings", "go to leaderboard", "scores"],
      curriculums: ["curriculums", "curricula", "courses", "go to curriculums"],
      back: ["back", "go back", "previous", "navigate back"],
      forward: ["forward", "go forward", "next", "navigate forward"],
    },
    reading: {
      next_page: ["next page", "next", "turn page", "forward", "continue"],
      previous_page: ["previous page", "previous", "go back", "back page"],
      read_aloud: [
        "read aloud",
        "read to me",
        "start reading",
        "speak",
        "read this",
      ],
      stop_reading: ["stop reading", "stop", "silence", "quiet"],
      pause: ["pause", "wait", "hold"],
      resume: ["resume", "continue", "go on"],
      add_bookmark: ["bookmark", "add bookmark", "save place", "mark page"],
      remove_bookmark: ["remove bookmark", "delete bookmark", "unmark"],
      create_note: ["note", "create note", "add note", "new note", "annotate"],
      highlight: ["highlight", "mark text", "select text"],
      increase_font: ["bigger font", "increase font", "larger text", "zoom in"],
      decrease_font: [
        "smaller font",
        "decrease font",
        "smaller text",
        "zoom out",
      ],
      toggle_fullscreen: [
        "fullscreen",
        "full screen",
        "toggle fullscreen",
        "maximize",
      ],
    },
    actions: {
      search: ["search", "find", "look for"],
      help: ["help", "assistance", "what can I say", "commands"],
      close: ["close", "dismiss", "exit"],
      cancel: ["cancel", "abort", "never mind"],
      confirm: ["confirm", "yes", "okay", "ok", "accept"],
      save: ["save", "store", "keep"],
      undo: ["undo", "revert", "go back"],
      redo: ["redo", "repeat", "again"],
      refresh: ["refresh", "reload", "update"],
    },
  };

  // Spanish vocabulary
  const spanishVocabulary: VoiceCommandVocabulary = {
    navigation: {
      home: ["inicio", "ir a inicio", "casa", "panel"],
      library: ["biblioteca", "ir a biblioteca", "mis libros", "libros"],
      flashcards: ["tarjetas", "flashcards", "ir a tarjetas", "estudiar"],
      assessments: ["evaluaciones", "exámenes", "pruebas", "ir a evaluaciones"],
      settings: ["ajustes", "configuración", "preferencias", "ir a ajustes"],
      groups: ["grupos", "ir a grupos", "mis grupos"],
      forum: ["foro", "discusiones", "ir a foro", "comunidad"],
      leaderboard: [
        "clasificación",
        "ranking",
        "ir a clasificación",
        "puntuaciones",
      ],
      curriculums: ["currículos", "cursos", "ir a currículos"],
      back: ["atrás", "volver", "anterior", "regresar"],
      forward: ["adelante", "siguiente", "avanzar"],
    },
    reading: {
      next_page: ["siguiente página", "siguiente", "pasar página", "avanzar"],
      previous_page: ["página anterior", "anterior", "retroceder"],
      read_aloud: ["leer en voz alta", "léeme", "empezar a leer", "hablar"],
      stop_reading: ["parar lectura", "parar", "silencio", "detener"],
      pause: ["pausar", "esperar", "detener"],
      resume: ["reanudar", "continuar", "seguir"],
      add_bookmark: ["marcador", "añadir marcador", "guardar página", "marcar"],
      remove_bookmark: ["quitar marcador", "eliminar marcador", "desmarcar"],
      create_note: [
        "nota",
        "crear nota",
        "añadir nota",
        "nueva nota",
        "anotar",
      ],
      highlight: ["resaltar", "marcar texto", "subrayar"],
      increase_font: [
        "fuente más grande",
        "aumentar fuente",
        "texto más grande",
        "ampliar",
      ],
      decrease_font: [
        "fuente más pequeña",
        "reducir fuente",
        "texto más pequeño",
        "reducir",
      ],
      toggle_fullscreen: [
        "pantalla completa",
        "maximizar",
        "alternar pantalla completa",
      ],
    },
    actions: {
      search: ["buscar", "encontrar", "busca"],
      help: ["ayuda", "asistencia", "qué puedo decir", "comandos"],
      close: ["cerrar", "salir"],
      cancel: ["cancelar", "abortar", "no importa"],
      confirm: ["confirmar", "sí", "vale", "aceptar"],
      save: ["guardar", "almacenar", "mantener"],
      undo: ["deshacer", "revertir"],
      redo: ["rehacer", "repetir", "otra vez"],
      refresh: ["actualizar", "recargar", "refrescar"],
    },
  };

  // Arabic vocabulary
  const arabicVocabulary: VoiceCommandVocabulary = {
    navigation: {
      home: ["الرئيسية", "اذهب للرئيسية", "البداية"],
      library: ["المكتبة", "اذهب للمكتبة", "كتبي", "الكتب"],
      flashcards: ["البطاقات", "بطاقات المراجعة", "اذهب للبطاقات", "مراجعة"],
      assessments: ["التقييمات", "الاختبارات", "اذهب للتقييمات"],
      settings: ["الإعدادات", "التفضيلات", "اذهب للإعدادات"],
      groups: ["المجموعات", "اذهب للمجموعات", "مجموعاتي"],
      forum: ["المنتدى", "النقاشات", "اذهب للمنتدى", "المجتمع"],
      leaderboard: ["لوحة المتصدرين", "الترتيب", "اذهب للترتيب", "النتائج"],
      curriculums: ["المناهج", "الدورات", "اذهب للمناهج"],
      back: ["رجوع", "ارجع", "السابق"],
      forward: ["تقدم", "التالي", "أمام"],
    },
    reading: {
      next_page: ["الصفحة التالية", "التالي", "اقلب الصفحة", "تقدم"],
      previous_page: ["الصفحة السابقة", "السابق", "ارجع"],
      read_aloud: ["اقرأ بصوت عالٍ", "اقرأ لي", "ابدأ القراءة", "تحدث"],
      stop_reading: ["توقف عن القراءة", "توقف", "صمت"],
      pause: ["إيقاف مؤقت", "انتظر", "توقف"],
      resume: ["استأنف", "استمر", "تابع"],
      add_bookmark: ["إشارة مرجعية", "أضف إشارة", "احفظ المكان", "علامة"],
      remove_bookmark: ["إزالة الإشارة", "حذف الإشارة"],
      create_note: ["ملاحظة", "أنشئ ملاحظة", "أضف ملاحظة", "ملاحظة جديدة"],
      highlight: ["تمييز", "تحديد النص", "علم النص"],
      increase_font: ["خط أكبر", "تكبير الخط", "نص أكبر"],
      decrease_font: ["خط أصغر", "تصغير الخط", "نص أصغر"],
      toggle_fullscreen: ["ملء الشاشة", "شاشة كاملة", "تكبير"],
    },
    actions: {
      search: ["بحث", "ابحث", "جد"],
      help: ["مساعدة", "ماذا يمكنني أن أقول", "الأوامر"],
      close: ["إغلاق", "اخرج"],
      cancel: ["إلغاء", "لا تهتم"],
      confirm: ["تأكيد", "نعم", "حسناً", "موافق"],
      save: ["حفظ", "احفظ"],
      undo: ["تراجع", "ارجع"],
      redo: ["إعادة", "كرر", "مرة أخرى"],
      refresh: ["تحديث", "إعادة تحميل"],
    },
  };

  // Select vocabulary based on language
  switch (lang) {
    case "es":
      return spanishVocabulary;
    case "ar":
      return arabicVocabulary;
    default:
      return englishVocabulary;
  }
}

// ============================================================================
// Speech Recognition Types (Web Speech API)
// ============================================================================

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Check if Web Speech API is supported
 */
export function isVoiceCommandsSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Get SpeechRecognition constructor
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, SpeechRecognitionConstructor>;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Hook for voice commands
 */
export function useVoiceCommands(
  options: UseVoiceCommandsOptions = {}
): UseVoiceCommandsReturn {
  const { i18n } = useTranslation();

  const {
    onNavigate,
    onReadingAction,
    onAction,
    onCommand,
    onError,
    language = i18n.language || "en-US",
    autoStart = false,
    continuous = false,
    confidenceThreshold = 0.5,
  } = options;

  const [isSupported] = useState(() => isVoiceCommandsSupported());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(
    null
  );

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const vocabularyRef = useRef<VoiceCommandVocabulary>(
    getVoiceCommandVocabulary(language)
  );

  // Update vocabulary when language changes
  useEffect(() => {
    vocabularyRef.current = getVoiceCommandVocabulary(language);
  }, [language]);

  /**
   * Match transcript to a command
   * Priority: reading commands > navigation commands > action commands
   * This ensures more specific phrases like "next page" match before generic "next"
   */
  const matchCommand = useCallback(
    (text: string): VoiceCommandResult | null => {
      const normalizedText = text.toLowerCase().trim();
      const vocab = vocabularyRef.current;

      // Helper to find best match from a category
      // Prefer longer phrase matches (more specific)
      const findBestMatch = <T extends string>(
        category: Record<T, string[]>
      ): VoiceCommandResult | null => {
        let bestMatch: { command: T; phrase: string } | null = null;
        let longestMatchLength = 0;

        for (const [command, phrases] of Object.entries(category) as [
          T,
          string[],
        ][]) {
          for (const phrase of phrases) {
            const lowerPhrase = phrase.toLowerCase();
            if (
              normalizedText.includes(lowerPhrase) &&
              lowerPhrase.length > longestMatchLength
            ) {
              longestMatchLength = lowerPhrase.length;
              bestMatch = { command, phrase };
            }
          }
        }

        if (bestMatch) {
          return {
            command: bestMatch.command as VoiceCommand,
            transcript: text,
            confidence: 1.0,
          };
        }
        return null;
      };

      // Check reading commands first (more specific, often include "page")
      const readingMatch = findBestMatch(vocab.reading);
      if (readingMatch) return readingMatch;

      // Check navigation commands
      const navMatch = findBestMatch(vocab.navigation);
      if (navMatch) return navMatch;

      // Check action commands
      const actionMatch = findBestMatch(vocab.actions);
      if (actionMatch) return actionMatch;

      return null;
    },
    []
  );

  /**
   * Handle recognized speech
   */
  const handleResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (!lastResult) return;

      if (lastResult.isFinal) {
        const alternative = lastResult[0];
        if (!alternative) return;

        const text = alternative.transcript;
        const confidence = alternative.confidence;

        setTranscript(text);

        // Only process if confidence is above threshold
        if (confidence >= confidenceThreshold) {
          const commandResult = matchCommand(text);

          if (commandResult) {
            commandResult.confidence = confidence;
            setLastCommand(commandResult);

            // Call appropriate callback
            onCommand?.(commandResult);

            const navCommands: NavigationCommand[] = [
              "home",
              "library",
              "flashcards",
              "assessments",
              "settings",
              "groups",
              "forum",
              "leaderboard",
              "curriculums",
              "back",
              "forward",
            ];
            const readCommands: ReadingCommand[] = [
              "next_page",
              "previous_page",
              "read_aloud",
              "stop_reading",
              "pause",
              "resume",
              "add_bookmark",
              "remove_bookmark",
              "create_note",
              "highlight",
              "increase_font",
              "decrease_font",
              "toggle_fullscreen",
            ];

            if (
              navCommands.includes(commandResult.command as NavigationCommand)
            ) {
              onNavigate?.(commandResult.command as NavigationCommand);
            } else if (
              readCommands.includes(commandResult.command as ReadingCommand)
            ) {
              onReadingAction?.(commandResult.command as ReadingCommand);
            } else {
              onAction?.(commandResult.command as ActionCommand);
            }
          }
        }
      } else {
        // Interim result
        const interimAlternative = lastResult[0];
        if (interimAlternative) {
          setTranscript(interimAlternative.transcript);
        }
      }
    },
    [
      confidenceThreshold,
      matchCommand,
      onCommand,
      onNavigate,
      onReadingAction,
      onAction,
    ]
  );

  /**
   * Handle speech recognition error
   */
  const handleError = useCallback(
    (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);

      let errorType: VoiceCommandError["type"] = "unknown";
      let message = "An unknown error occurred";

      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          errorType = "not-allowed";
          message =
            "Microphone access denied. Please enable microphone permissions.";
          break;
        case "no-speech":
          errorType = "no-speech";
          message = "No speech detected. Please try again.";
          break;
        case "network":
          errorType = "network";
          message = "Network error. Please check your internet connection.";
          break;
        default:
          message = event.message || `Speech recognition error: ${event.error}`;
      }

      onError?.({ type: errorType, message });
    },
    [onError]
  );

  /**
   * Initialize speech recognition
   */
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Restart if continuous mode
      if (continuous && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Already started
        }
      }
    };

    recognition.onresult = handleResult;
    recognition.onerror = handleError;

    recognitionRef.current = recognition;

    // Auto-start if enabled
    if (autoStart) {
      try {
        recognition.start();
      } catch {
        // Already started
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [isSupported, language, continuous, autoStart, handleResult, handleError]);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.({
        type: "not-supported",
        message: "Voice commands are not supported in this browser.",
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already started
      }
    }
  }, [isSupported, isListening, onError]);

  /**
   * Stop listening for voice commands
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Get available commands for current language
   */
  const getAvailableCommands = useCallback(() => {
    return vocabularyRef.current;
  }, []);

  /**
   * Check if a specific command is available
   */
  const hasCommand = useCallback((command: VoiceCommand): boolean => {
    const vocab = vocabularyRef.current;
    return (
      command in vocab.navigation ||
      command in vocab.reading ||
      command in vocab.actions
    );
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    getAvailableCommands,
    hasCommand,
  };
}

export default useVoiceCommands;
