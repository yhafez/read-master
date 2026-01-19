/**
 * Tests for AI Chat Sidebar Types and Utilities
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  // Constants
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_CONTEXT_LENGTH,
  SESSION_STORAGE_KEY_PREFIX,
  INITIAL_INPUT_STATE,
  SUGGESTED_QUESTIONS,
  // Message utilities
  generateMessageId,
  generateSessionId,
  createUserMessage,
  createAssistantMessage,
  // Session utilities
  createChatSession,
  addMessageToSession,
  updateLastMessage,
  clearSessionMessages,
  getHistoryForApi,
  // Validation and errors
  validateMessage,
  createChatError,
  parseChatApiError,
  // Text utilities
  truncateText,
  buildChatApiRequest,
  // Storage utilities
  getSessionStorageKey,
  saveSessionToStorage,
  loadSessionFromStorage,
  clearSessionFromStorage,
  // Display utilities
  formatMessageTime,
  // Session state utilities
  isSessionEmpty,
  getMessageCount,
  getUserMessageCount,
  isWaitingForResponse,
  getLastError,
} from "./chatTypes";
import type { ChatContext, ChatMessage } from "./chatTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  describe("MAX_MESSAGE_LENGTH", () => {
    it("should be 2000", () => {
      expect(MAX_MESSAGE_LENGTH).toBe(2000);
    });
  });

  describe("MAX_HISTORY_MESSAGES", () => {
    it("should be 10", () => {
      expect(MAX_HISTORY_MESSAGES).toBe(10);
    });
  });

  describe("MAX_CONTEXT_LENGTH", () => {
    it("should be 1000", () => {
      expect(MAX_CONTEXT_LENGTH).toBe(1000);
    });
  });

  describe("SESSION_STORAGE_KEY_PREFIX", () => {
    it("should have correct prefix", () => {
      expect(SESSION_STORAGE_KEY_PREFIX).toBe("chat_session_");
    });
  });

  describe("INITIAL_INPUT_STATE", () => {
    it("should have correct default values", () => {
      expect(INITIAL_INPUT_STATE).toEqual({
        value: "",
        disabled: false,
        placeholder: "Ask a question about the book...",
      });
    });
  });

  describe("SUGGESTED_QUESTIONS", () => {
    it("should have 5 questions", () => {
      expect(SUGGESTED_QUESTIONS).toHaveLength(5);
    });

    it("should include reading-related questions", () => {
      expect(SUGGESTED_QUESTIONS).toContain("Summarize what I've read so far");
      expect(SUGGESTED_QUESTIONS).toContain("Explain the main themes");
      expect(SUGGESTED_QUESTIONS).toContain("Who are the key characters?");
    });
  });
});

// =============================================================================
// MESSAGE UTILITIES TESTS
// =============================================================================

describe("Message Utilities", () => {
  describe("generateMessageId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });

    it("should start with msg_ prefix", () => {
      const id = generateMessageId();
      expect(id.startsWith("msg_")).toBe(true);
    });

    it("should contain timestamp", () => {
      const before = Date.now();
      const id = generateMessageId();
      const after = Date.now();

      const parts = id.split("_");
      const timestamp = parseInt(parts[1]!, 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("generateSessionId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });

    it("should start with sess_ prefix", () => {
      const id = generateSessionId();
      expect(id.startsWith("sess_")).toBe(true);
    });
  });

  describe("createUserMessage", () => {
    it("should create a user message with correct role", () => {
      const message = createUserMessage("Hello");
      expect(message.role).toBe("user");
    });

    it("should trim content", () => {
      const message = createUserMessage("  Hello  ");
      expect(message.content).toBe("Hello");
    });

    it("should have complete status", () => {
      const message = createUserMessage("Hello");
      expect(message.status).toBe("complete");
    });

    it("should have timestamp", () => {
      const before = new Date().toISOString();
      const message = createUserMessage("Hello");
      const after = new Date().toISOString();

      expect(message.timestamp >= before).toBe(true);
      expect(message.timestamp <= after).toBe(true);
    });

    it("should have unique ID", () => {
      const msg1 = createUserMessage("Hello");
      const msg2 = createUserMessage("Hello");
      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe("createAssistantMessage", () => {
    it("should create an assistant message with correct role", () => {
      const message = createAssistantMessage();
      expect(message.role).toBe("assistant");
    });

    it("should have pending status", () => {
      const message = createAssistantMessage();
      expect(message.status).toBe("pending");
    });

    it("should have empty content by default", () => {
      const message = createAssistantMessage();
      expect(message.content).toBe("");
    });

    it("should accept content parameter", () => {
      const message = createAssistantMessage("Hello");
      expect(message.content).toBe("Hello");
    });
  });
});

// =============================================================================
// SESSION UTILITIES TESTS
// =============================================================================

describe("Session Utilities", () => {
  const mockContext: ChatContext = {
    bookId: "book-123",
    bookTitle: "Test Book",
    chapterTitle: "Chapter 1",
    readingProgress: 0.5,
    readingLevel: "intermediate",
  };

  describe("createChatSession", () => {
    it("should create session with correct book ID", () => {
      const session = createChatSession(mockContext);
      expect(session.bookId).toBe("book-123");
    });

    it("should have empty messages array", () => {
      const session = createChatSession(mockContext);
      expect(session.messages).toEqual([]);
    });

    it("should include context", () => {
      const session = createChatSession(mockContext);
      expect(session.context).toEqual(mockContext);
    });

    it("should have timestamps", () => {
      const session = createChatSession(mockContext);
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    it("should have unique ID", () => {
      const s1 = createChatSession(mockContext);
      const s2 = createChatSession(mockContext);
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe("addMessageToSession", () => {
    it("should add message to session", () => {
      const session = createChatSession(mockContext);
      const message = createUserMessage("Hello");
      const updated = addMessageToSession(session, message);

      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toEqual(message);
    });

    it("should not mutate original session", () => {
      const session = createChatSession(mockContext);
      const message = createUserMessage("Hello");
      addMessageToSession(session, message);

      expect(session.messages).toHaveLength(0);
    });

    it("should update timestamp", () => {
      const session = createChatSession(mockContext);
      const originalUpdatedAt = session.updatedAt;

      // Wait a bit to ensure different timestamp
      const message = createUserMessage("Hello");
      const updated = addMessageToSession(session, message);

      expect(updated.updatedAt >= originalUpdatedAt).toBe(true);
    });

    it("should preserve existing messages", () => {
      const session = createChatSession(mockContext);
      const msg1 = createUserMessage("Hello");
      const msg2 = createUserMessage("World");

      const s1 = addMessageToSession(session, msg1);
      const s2 = addMessageToSession(s1, msg2);

      expect(s2.messages).toHaveLength(2);
      expect(s2.messages[0]).toEqual(msg1);
      expect(s2.messages[1]).toEqual(msg2);
    });
  });

  describe("updateLastMessage", () => {
    it("should update last message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createAssistantMessage());

      const updated = updateLastMessage(session, {
        content: "Updated content",
        status: "complete",
      });

      expect(updated.messages[0]!.content).toBe("Updated content");
      expect(updated.messages[0]!.status).toBe("complete");
    });

    it("should return same session if no messages", () => {
      const session = createChatSession(mockContext);
      const updated = updateLastMessage(session, { content: "Test" });
      expect(updated).toBe(session);
    });

    it("should only update last message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("First"));
      session = addMessageToSession(session, createAssistantMessage("Second"));

      const updated = updateLastMessage(session, { content: "Updated" });

      expect(updated.messages[0]!.content).toBe("First");
      expect(updated.messages[1]!.content).toBe("Updated");
    });

    it("should not mutate original session", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(
        session,
        createAssistantMessage("Original")
      );

      updateLastMessage(session, { content: "Updated" });

      expect(session.messages[0]!.content).toBe("Original");
    });
  });

  describe("clearSessionMessages", () => {
    it("should clear all messages", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      session = addMessageToSession(session, createAssistantMessage("Hi"));

      const cleared = clearSessionMessages(session);
      expect(cleared.messages).toHaveLength(0);
    });

    it("should preserve session ID", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));

      const cleared = clearSessionMessages(session);
      expect(cleared.id).toBe(session.id);
    });

    it("should preserve context", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));

      const cleared = clearSessionMessages(session);
      expect(cleared.context).toEqual(mockContext);
    });
  });

  describe("getHistoryForApi", () => {
    it("should return empty array for no messages", () => {
      expect(getHistoryForApi([])).toEqual([]);
    });

    it("should filter out non-complete messages", () => {
      const messages: ChatMessage[] = [
        { ...createUserMessage("Hello"), status: "complete" },
        { ...createAssistantMessage(), status: "pending" },
      ];

      const history = getHistoryForApi(messages);
      expect(history).toHaveLength(1);
    });

    it("should filter out system messages", () => {
      const messages: ChatMessage[] = [
        createUserMessage("Hello"),
        {
          id: "sys-1",
          role: "system",
          content: "System",
          timestamp: new Date().toISOString(),
          status: "complete",
        },
      ];

      const history = getHistoryForApi(messages);
      expect(history).toHaveLength(1);
      expect(history[0]!.role).toBe("user");
    });

    it("should limit to max messages", () => {
      const messages: ChatMessage[] = Array.from({ length: 15 }, (_, i) =>
        createUserMessage(`Message ${i}`)
      );

      const history = getHistoryForApi(messages, 10);
      expect(history).toHaveLength(10);
    });

    it("should keep most recent messages", () => {
      const messages: ChatMessage[] = Array.from({ length: 15 }, (_, i) =>
        createUserMessage(`Message ${i}`)
      );

      const history = getHistoryForApi(messages, 10);
      expect(history[0]!.content).toBe("Message 5");
      expect(history[9]!.content).toBe("Message 14");
    });

    it("should return only role and content", () => {
      const messages: ChatMessage[] = [createUserMessage("Hello")];
      const history = getHistoryForApi(messages);

      expect(history[0]!).toEqual({ role: "user", content: "Hello" });
      expect(Object.keys(history[0]!)).toEqual(["role", "content"]);
    });
  });
});

// =============================================================================
// VALIDATION AND ERROR TESTS
// =============================================================================

describe("Validation and Errors", () => {
  describe("validateMessage", () => {
    it("should return valid for normal message", () => {
      const result = validateMessage("Hello, how are you?");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for empty message", () => {
      const result = validateMessage("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return invalid for whitespace-only message", () => {
      const result = validateMessage("   ");
      expect(result.valid).toBe(false);
    });

    it("should return invalid for message exceeding max length", () => {
      const longMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
      const result = validateMessage(longMessage);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("message_too_long");
    });

    it("should accept message at max length", () => {
      const maxMessage = "a".repeat(MAX_MESSAGE_LENGTH);
      const result = validateMessage(maxMessage);
      expect(result.valid).toBe(true);
    });
  });

  describe("createChatError", () => {
    it("should create error with given type", () => {
      const error = createChatError("network_error");
      expect(error.type).toBe("network_error");
    });

    it("should use default message", () => {
      const error = createChatError("network_error");
      expect(error.message).toContain("connect");
    });

    it("should use custom message when provided", () => {
      const error = createChatError("network_error", "Custom error");
      expect(error.message).toBe("Custom error");
    });

    it("should set retryable correctly for network error", () => {
      const error = createChatError("network_error");
      expect(error.retryable).toBe(true);
    });

    it("should set retryable correctly for rate limited", () => {
      const error = createChatError("rate_limited");
      expect(error.retryable).toBe(true);
    });

    it("should set retryable false for ai_disabled", () => {
      const error = createChatError("ai_disabled");
      expect(error.retryable).toBe(false);
    });

    it("should set retryable false for unknown errors", () => {
      const error = createChatError("unknown");
      expect(error.retryable).toBe(false);
    });
  });

  describe("parseChatApiError", () => {
    it("should parse 429 as rate limited", () => {
      const error = parseChatApiError(429);
      expect(error.type).toBe("rate_limited");
    });

    it("should parse 403 with AI_DISABLED code", () => {
      const error = parseChatApiError(403, "AI_DISABLED");
      expect(error.type).toBe("ai_disabled");
    });

    it("should parse 403 with AI in message", () => {
      const error = parseChatApiError(403, undefined, "AI features disabled");
      expect(error.type).toBe("ai_disabled");
    });

    it("should parse 400 with MESSAGE_TOO_LONG", () => {
      const error = parseChatApiError(400, "MESSAGE_TOO_LONG");
      expect(error.type).toBe("message_too_long");
    });

    it("should parse 503 as ai_unavailable", () => {
      const error = parseChatApiError(503);
      expect(error.type).toBe("ai_unavailable");
    });

    it("should parse 500 as ai_unavailable", () => {
      const error = parseChatApiError(500);
      expect(error.type).toBe("ai_unavailable");
    });

    it("should parse 0 as network_error", () => {
      const error = parseChatApiError(0);
      expect(error.type).toBe("network_error");
    });

    it("should default to unknown for other errors", () => {
      const error = parseChatApiError(418);
      expect(error.type).toBe("unknown");
    });
  });
});

// =============================================================================
// TEXT UTILITIES TESTS
// =============================================================================

describe("Text Utilities", () => {
  describe("truncateText", () => {
    it("should return undefined for undefined input", () => {
      expect(truncateText(undefined, 100)).toBeUndefined();
    });

    it("should return text unchanged if under limit", () => {
      expect(truncateText("Hello", 100)).toBe("Hello");
    });

    it("should truncate and add ellipsis if over limit", () => {
      expect(truncateText("Hello World", 5)).toBe("Hello...");
    });

    it("should handle exact length", () => {
      expect(truncateText("Hello", 5)).toBe("Hello");
    });
  });

  describe("buildChatApiRequest", () => {
    const mockContext: ChatContext = {
      bookId: "book-123",
      bookTitle: "Test Book",
      chapterTitle: "Chapter 1",
      readingLevel: "intermediate",
    };

    it("should build request with correct book ID", () => {
      const session = createChatSession(mockContext);
      const request = buildChatApiRequest(session, "Hello");
      expect(request.bookId).toBe("book-123");
    });

    it("should trim message", () => {
      const session = createChatSession(mockContext);
      const request = buildChatApiRequest(session, "  Hello  ");
      expect(request.message).toBe("Hello");
    });

    it("should include history from session", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("First"));
      session = addMessageToSession(session, {
        ...createAssistantMessage("Reply"),
        status: "complete",
      });

      const request = buildChatApiRequest(session, "Second");
      expect(request.history).toHaveLength(2);
    });

    it("should include context fields", () => {
      const session = createChatSession(mockContext);
      const request = buildChatApiRequest(session, "Hello");

      expect(request.context?.bookTitle).toBe("Test Book");
      expect(request.context?.chapterTitle).toBe("Chapter 1");
      expect(request.context?.readingLevel).toBe("intermediate");
    });

    it("should truncate long context text", () => {
      const longContext: ChatContext = {
        ...mockContext,
        recentText: "a".repeat(2000),
      };
      const session = createChatSession(longContext);
      const request = buildChatApiRequest(session, "Hello");

      expect(request.context?.recentText?.length).toBeLessThanOrEqual(
        MAX_CONTEXT_LENGTH + 3
      ); // +3 for ellipsis
    });
  });
});

// =============================================================================
// STORAGE UTILITIES TESTS
// =============================================================================

describe("Storage Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getSessionStorageKey", () => {
    it("should generate correct key", () => {
      expect(getSessionStorageKey("book-123")).toBe("chat_session_book-123");
    });
  });

  describe("saveSessionToStorage and loadSessionFromStorage", () => {
    const mockContext: ChatContext = { bookId: "book-123" };

    it("should save and load session", () => {
      const session = createChatSession(mockContext);
      saveSessionToStorage(session);

      const loaded = loadSessionFromStorage("book-123");
      expect(loaded?.id).toBe(session.id);
      expect(loaded?.bookId).toBe("book-123");
    });

    it("should return null for non-existent session", () => {
      const loaded = loadSessionFromStorage("non-existent");
      expect(loaded).toBeNull();
    });

    it("should preserve messages", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      saveSessionToStorage(session);

      const loaded = loadSessionFromStorage("book-123");
      expect(loaded?.messages).toHaveLength(1);
      expect(loaded?.messages[0]!.content).toBe("Hello");
    });
  });

  describe("clearSessionFromStorage", () => {
    it("should remove session from storage", () => {
      const mockContext: ChatContext = { bookId: "book-123" };
      const session = createChatSession(mockContext);
      saveSessionToStorage(session);

      clearSessionFromStorage("book-123");
      const loaded = loadSessionFromStorage("book-123");
      expect(loaded).toBeNull();
    });

    it("should not throw for non-existent session", () => {
      expect(() => clearSessionFromStorage("non-existent")).not.toThrow();
    });
  });
});

// =============================================================================
// DISPLAY UTILITIES TESTS
// =============================================================================

describe("Display Utilities", () => {
  describe("formatMessageTime", () => {
    it("should format time", () => {
      const timestamp = "2024-01-15T14:30:00Z";
      const formatted = formatMessageTime(timestamp);
      // Result depends on locale, but should contain numbers
      expect(formatted).toMatch(/\d/);
    });

    it("should handle different timestamps", () => {
      const morning = formatMessageTime("2024-01-15T08:00:00Z");
      const evening = formatMessageTime("2024-01-15T20:00:00Z");
      // Should produce different outputs
      expect(morning).not.toBe(evening);
    });
  });
});

// =============================================================================
// SESSION STATE UTILITIES TESTS
// =============================================================================

describe("Session State Utilities", () => {
  const mockContext: ChatContext = { bookId: "book-123" };

  describe("isSessionEmpty", () => {
    it("should return true for null session", () => {
      expect(isSessionEmpty(null)).toBe(true);
    });

    it("should return true for session with no messages", () => {
      const session = createChatSession(mockContext);
      expect(isSessionEmpty(session)).toBe(true);
    });

    it("should return false for session with messages", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      expect(isSessionEmpty(session)).toBe(false);
    });
  });

  describe("getMessageCount", () => {
    it("should return 0 for null session", () => {
      expect(getMessageCount(null)).toBe(0);
    });

    it("should return correct count", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      session = addMessageToSession(session, createAssistantMessage("Hi"));
      expect(getMessageCount(session)).toBe(2);
    });
  });

  describe("getUserMessageCount", () => {
    it("should return 0 for null session", () => {
      expect(getUserMessageCount(null)).toBe(0);
    });

    it("should count only user messages", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      session = addMessageToSession(session, createAssistantMessage("Hi"));
      session = addMessageToSession(session, createUserMessage("How are you?"));

      expect(getUserMessageCount(session)).toBe(2);
    });
  });

  describe("isWaitingForResponse", () => {
    it("should return false for null session", () => {
      expect(isWaitingForResponse(null)).toBe(false);
    });

    it("should return false for empty session", () => {
      const session = createChatSession(mockContext);
      expect(isWaitingForResponse(session)).toBe(false);
    });

    it("should return true for pending assistant message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      session = addMessageToSession(session, createAssistantMessage());

      expect(isWaitingForResponse(session)).toBe(true);
    });

    it("should return true for streaming assistant message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      session = addMessageToSession(session, {
        ...createAssistantMessage(),
        status: "streaming",
      });

      expect(isWaitingForResponse(session)).toBe(true);
    });

    it("should return false for complete assistant message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));
      session = addMessageToSession(session, {
        ...createAssistantMessage("Hi"),
        status: "complete",
      });

      expect(isWaitingForResponse(session)).toBe(false);
    });

    it("should return false for user message last", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, createUserMessage("Hello"));

      expect(isWaitingForResponse(session)).toBe(false);
    });
  });

  describe("getLastError", () => {
    it("should return undefined for null session", () => {
      expect(getLastError(null)).toBeUndefined();
    });

    it("should return undefined for empty session", () => {
      const session = createChatSession(mockContext);
      expect(getLastError(session)).toBeUndefined();
    });

    it("should return undefined for complete message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, {
        ...createAssistantMessage("Hi"),
        status: "complete",
      });

      expect(getLastError(session)).toBeUndefined();
    });

    it("should return error for error message", () => {
      let session = createChatSession(mockContext);
      session = addMessageToSession(session, {
        ...createAssistantMessage(),
        status: "error",
        error: "Something went wrong",
      });

      expect(getLastError(session)).toBe("Something went wrong");
    });
  });
});
