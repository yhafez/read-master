/**
 * Tests for useVoiceCommands hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useVoiceCommands,
  isVoiceCommandsSupported,
  getVoiceCommandVocabulary,
} from "./useVoiceCommands";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));

// ============================================================================
// Mock Speech Recognition
// ============================================================================

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "en-US";
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: MockSpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: MockSpeechRecognitionErrorEvent) => void) | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) throw new Error("Already started");
    this.isRunning = true;
    this.onstart?.();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.onend?.();
  }

  abort() {
    this.isRunning = false;
  }

  // Helper to simulate speech result
  simulateResult(transcript: string, confidence: number, isFinal = true) {
    const event: MockSpeechRecognitionEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        item: (_index: number) => ({
          isFinal,
          length: 1,
          item: () => ({ transcript, confidence }),
          0: { transcript, confidence },
        }),
        0: {
          isFinal,
          length: 1,
          item: () => ({ transcript, confidence }),
          0: { transcript, confidence },
        },
      },
    };
    this.onresult?.(event);
  }

  // Helper to simulate error
  simulateError(error: string, message?: string) {
    const event: MockSpeechRecognitionErrorEvent = { error, message };
    this.onerror?.(event);
  }
}

interface MockSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    item: (index: number) => MockSpeechRecognitionResult;
    [index: number]: MockSpeechRecognitionResult;
  };
}

interface MockSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item: (index: number) => MockSpeechRecognitionAlternative;
  [index: number]: MockSpeechRecognitionAlternative;
}

interface MockSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface MockSpeechRecognitionErrorEvent {
  error: string;
  message: string | undefined;
}

// ============================================================================
// Tests
// ============================================================================

describe("useVoiceCommands", () => {
  let mockRecognition: MockSpeechRecognition | null = null;
  const originalSpeechRecognition = (
    globalThis as unknown as { SpeechRecognition?: unknown }
  ).SpeechRecognition;
  const originalWebkitSpeechRecognition = (
    globalThis as unknown as { webkitSpeechRecognition?: unknown }
  ).webkitSpeechRecognition;

  beforeEach(() => {
    mockRecognition = null;
    // Mock SpeechRecognition
    const MockConstructor = function (this: MockSpeechRecognition) {
      mockRecognition = new MockSpeechRecognition();
      return mockRecognition;
    } as unknown as { new (): MockSpeechRecognition };

    (globalThis as unknown as Record<string, unknown>).SpeechRecognition =
      MockConstructor;
    (globalThis as unknown as Record<string, unknown>).webkitSpeechRecognition =
      MockConstructor;
  });

  afterEach(() => {
    (globalThis as unknown as Record<string, unknown>).SpeechRecognition =
      originalSpeechRecognition;
    (globalThis as unknown as Record<string, unknown>).webkitSpeechRecognition =
      originalWebkitSpeechRecognition;
    vi.clearAllMocks();
  });

  describe("isVoiceCommandsSupported", () => {
    it("should return true when SpeechRecognition is available", () => {
      expect(isVoiceCommandsSupported()).toBe(true);
    });

    it("should return false when SpeechRecognition is not available", () => {
      delete (globalThis as unknown as Record<string, unknown>)
        .SpeechRecognition;
      delete (globalThis as unknown as Record<string, unknown>)
        .webkitSpeechRecognition;
      expect(isVoiceCommandsSupported()).toBe(false);
    });
  });

  describe("getVoiceCommandVocabulary", () => {
    it("should return English vocabulary for en-US", () => {
      const vocab = getVoiceCommandVocabulary("en-US");
      expect(vocab.navigation.home).toContain("home");
      expect(vocab.navigation.library).toContain("library");
      expect(vocab.reading.next_page).toContain("next page");
    });

    it("should return Spanish vocabulary for es", () => {
      const vocab = getVoiceCommandVocabulary("es");
      expect(vocab.navigation.home).toContain("inicio");
      expect(vocab.navigation.library).toContain("biblioteca");
    });

    it("should return Arabic vocabulary for ar", () => {
      const vocab = getVoiceCommandVocabulary("ar");
      expect(vocab.navigation.home).toContain("الرئيسية");
      expect(vocab.navigation.library).toContain("المكتبة");
    });

    it("should default to English for unknown languages", () => {
      const vocab = getVoiceCommandVocabulary("unknown");
      expect(vocab.navigation.home).toContain("home");
    });
  });

  describe("hook initialization", () => {
    it("should indicate support when SpeechRecognition is available", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.isSupported).toBe(true);
    });

    it("should not be listening initially", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.isListening).toBe(false);
    });

    it("should have empty transcript initially", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.transcript).toBe("");
    });

    it("should have null lastCommand initially", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.lastCommand).toBeNull();
    });
  });

  describe("startListening", () => {
    it("should start speech recognition", () => {
      const { result } = renderHook(() => useVoiceCommands());

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);
    });

    it("should call onError if not supported", () => {
      delete (globalThis as unknown as Record<string, unknown>)
        .SpeechRecognition;
      delete (globalThis as unknown as Record<string, unknown>)
        .webkitSpeechRecognition;

      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceCommands({ onError }));

      act(() => {
        result.current.startListening();
      });

      expect(onError).toHaveBeenCalledWith({
        type: "not-supported",
        message: "Voice commands are not supported in this browser.",
      });
    });
  });

  describe("stopListening", () => {
    it("should stop speech recognition", () => {
      const { result } = renderHook(() => useVoiceCommands());

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe("toggleListening", () => {
    it("should toggle listening state", () => {
      const { result } = renderHook(() => useVoiceCommands());

      expect(result.current.isListening).toBe(false);

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe("command recognition", () => {
    it("should recognize navigation commands", () => {
      const onNavigate = vi.fn();
      const onCommand = vi.fn();

      const { result } = renderHook(() =>
        useVoiceCommands({ onNavigate, onCommand })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("go to library", 0.9);
      });

      expect(onNavigate).toHaveBeenCalledWith("library");
      expect(onCommand).toHaveBeenCalled();
      expect(result.current.lastCommand?.command).toBe("library");
    });

    it("should recognize reading commands", () => {
      const onReadingAction = vi.fn();

      const { result } = renderHook(() =>
        useVoiceCommands({ onReadingAction })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("next page", 0.9);
      });

      expect(onReadingAction).toHaveBeenCalledWith("next_page");
    });

    it("should recognize action commands", () => {
      const onAction = vi.fn();

      const { result } = renderHook(() => useVoiceCommands({ onAction }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("search", 0.9);
      });

      expect(onAction).toHaveBeenCalledWith("search");
    });

    it("should not recognize commands below confidence threshold", () => {
      const onCommand = vi.fn();

      const { result } = renderHook(() =>
        useVoiceCommands({ onCommand, confidenceThreshold: 0.8 })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("go to library", 0.5);
      });

      expect(onCommand).not.toHaveBeenCalled();
    });

    it("should update transcript for interim results", () => {
      const { result } = renderHook(() => useVoiceCommands());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("go to", 0.9, false);
      });

      expect(result.current.transcript).toBe("go to");
    });
  });

  describe("error handling", () => {
    it("should handle not-allowed error", () => {
      const onError = vi.fn();

      const { result } = renderHook(() => useVoiceCommands({ onError }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateError("not-allowed");
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "not-allowed",
        })
      );
      expect(result.current.isListening).toBe(false);
    });

    it("should handle no-speech error", () => {
      const onError = vi.fn();

      const { result } = renderHook(() => useVoiceCommands({ onError }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateError("no-speech");
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "no-speech",
        })
      );
    });

    it("should handle network error", () => {
      const onError = vi.fn();

      const { result } = renderHook(() => useVoiceCommands({ onError }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateError("network");
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "network",
        })
      );
    });
  });

  describe("getAvailableCommands", () => {
    it("should return vocabulary for current language", () => {
      const { result } = renderHook(() =>
        useVoiceCommands({ language: "en-US" })
      );

      const commands = result.current.getAvailableCommands();

      expect(commands.navigation).toBeDefined();
      expect(commands.reading).toBeDefined();
      expect(commands.actions).toBeDefined();
    });
  });

  describe("hasCommand", () => {
    it("should return true for valid navigation commands", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.hasCommand("home")).toBe(true);
      expect(result.current.hasCommand("library")).toBe(true);
    });

    it("should return true for valid reading commands", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.hasCommand("next_page")).toBe(true);
      expect(result.current.hasCommand("read_aloud")).toBe(true);
    });

    it("should return true for valid action commands", () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.hasCommand("search")).toBe(true);
      expect(result.current.hasCommand("help")).toBe(true);
    });
  });

  describe("language support", () => {
    it("should recognize Spanish commands when language is Spanish", () => {
      const onNavigate = vi.fn();

      const { result } = renderHook(() =>
        useVoiceCommands({ language: "es", onNavigate })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("ir a biblioteca", 0.9);
      });

      expect(onNavigate).toHaveBeenCalledWith("library");
    });

    it("should recognize Arabic commands when language is Arabic", () => {
      const onNavigate = vi.fn();

      const { result } = renderHook(() =>
        useVoiceCommands({ language: "ar", onNavigate })
      );

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognition?.simulateResult("اذهب للمكتبة", 0.9);
      });

      expect(onNavigate).toHaveBeenCalledWith("library");
    });
  });
});
