/**
 * AI Chat Sidebar Types
 *
 * Type definitions for the AI Chat Sidebar component and related utilities.
 * This feature allows users to have a conversational AI assistant in the reader.
 */

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/**
 * Role of message sender
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Status of a message
 */
export type MessageStatus = "pending" | "streaming" | "complete" | "error";

/**
 * A single chat message
 */
export type ChatMessage = {
  /** Unique identifier */
  id: string;
  /** Sender role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** When the message was created */
  timestamp: string;
  /** Status of the message */
  status: MessageStatus;
  /** Tokens used (for assistant messages) */
  tokensUsed?: number;
  /** Error message if status is error */
  error?: string;
};

/**
 * Context for the chat - provides book/chapter info for relevant responses
 */
export type ChatContext = {
  /** Book ID */
  bookId: string;
  /** Book title */
  bookTitle?: string;
  /** Current chapter title */
  chapterTitle?: string;
  /** Current reading position (0-1) */
  readingProgress?: number;
  /** Recently read text for context */
  recentText?: string;
  /** Selected text if any */
  selectedText?: string;
  /** User's reading level */
  readingLevel?: "beginner" | "intermediate" | "advanced";
};

/**
 * A chat session containing messages and context
 */
export type ChatSession = {
  /** Unique session identifier */
  id: string;
  /** Book ID this session is for */
  bookId: string;
  /** Messages in the session */
  messages: ChatMessage[];
  /** Session context */
  context: ChatContext;
  /** When the session was created */
  createdAt: string;
  /** When the session was last updated */
  updatedAt: string;
};

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Props for ChatSidebar component
 */
export type ChatSidebarProps = {
  /** Whether the sidebar is open */
  open: boolean;
  /** Called when sidebar should close */
  onClose: () => void;
  /** Book context for the chat */
  context: ChatContext;
  /** Existing session to restore (optional) */
  initialSession?: ChatSession | null;
  /** Called when session is updated */
  onSessionUpdate?: (session: ChatSession) => void;
  /** Drawer width in pixels */
  width?: number;
};

/**
 * Chat input state
 */
export type ChatInputState = {
  /** Current input value */
  value: string;
  /** Whether input is disabled */
  disabled: boolean;
  /** Placeholder text */
  placeholder: string;
};

// =============================================================================
// API TYPES
// =============================================================================

/**
 * API request for chat message
 */
export type ChatApiRequest = {
  /** Book ID */
  bookId: string;
  /** User's message */
  message: string;
  /** Previous messages for context */
  history: Array<{ role: MessageRole; content: string }>;
  /** Book context */
  context?: {
    bookTitle?: string;
    chapterTitle?: string;
    recentText?: string;
    selectedText?: string;
    readingLevel?: string;
  };
};

/**
 * API response for chat message
 */
export type ChatApiResponse = {
  /** The assistant's response */
  response: string;
  /** Tokens used */
  tokensUsed: number;
  /** Whether response was cached */
  cached?: boolean;
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error types for chat
 */
export type ChatErrorType =
  | "network_error"
  | "rate_limited"
  | "ai_disabled"
  | "ai_unavailable"
  | "message_too_long"
  | "session_expired"
  | "unknown";

/**
 * Error structure for chat
 */
export type ChatError = {
  type: ChatErrorType;
  message: string;
  retryable: boolean;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum message length */
export const MAX_MESSAGE_LENGTH = 2000;

/** Maximum messages in history to send */
export const MAX_HISTORY_MESSAGES = 10;

/** Maximum context text length */
export const MAX_CONTEXT_LENGTH = 1000;

/** Session storage key prefix */
export const SESSION_STORAGE_KEY_PREFIX = "chat_session_";

/** Default initial input state */
export const INITIAL_INPUT_STATE: ChatInputState = {
  value: "",
  disabled: false,
  placeholder: "Ask a question about the book...",
};

/** Suggested questions for users */
export const SUGGESTED_QUESTIONS = [
  "Summarize what I've read so far",
  "Explain the main themes",
  "Who are the key characters?",
  "What should I pay attention to?",
  "Define any difficult vocabulary",
] as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new user message
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role: "user",
    content: content.trim(),
    timestamp: new Date().toISOString(),
    status: "complete",
  };
}

/**
 * Create a new assistant message (initially pending)
 */
export function createAssistantMessage(content: string = ""): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    status: "pending",
  };
}

/**
 * Create a new chat session
 */
export function createChatSession(context: ChatContext): ChatSession {
  return {
    id: generateSessionId(),
    bookId: context.bookId,
    messages: [],
    context,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a message to a session
 */
export function addMessageToSession(
  session: ChatSession,
  message: ChatMessage
): ChatSession {
  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update the last message in a session
 */
export function updateLastMessage(
  session: ChatSession,
  updates: Partial<ChatMessage>
): ChatSession {
  if (session.messages.length === 0) return session;

  const messages = [...session.messages];
  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];
  if (lastMessage) {
    messages[lastIndex] = { ...lastMessage, ...updates };
  }

  return {
    ...session,
    messages,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Clear messages from a session (keep context)
 */
export function clearSessionMessages(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get messages for API history (limited to recent messages)
 */
export function getHistoryForApi(
  messages: ChatMessage[],
  maxMessages: number = MAX_HISTORY_MESSAGES
): Array<{ role: MessageRole; content: string }> {
  return messages
    .filter((m) => m.status === "complete" && m.role !== "system")
    .slice(-maxMessages)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Validate message content
 */
export function validateMessage(content: string): {
  valid: boolean;
  error?: ChatError;
} {
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: createChatError("unknown", "Message cannot be empty"),
    };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: createChatError(
        "message_too_long",
        `Message must be at most ${MAX_MESSAGE_LENGTH} characters`
      ),
    };
  }

  return { valid: true };
}

/**
 * Create a ChatError
 */
export function createChatError(
  type: ChatErrorType,
  message?: string
): ChatError {
  const defaultMessages: Record<ChatErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    rate_limited: "Too many requests. Please wait a moment and try again.",
    ai_disabled:
      "AI features are disabled for your account. Enable them in settings.",
    ai_unavailable:
      "AI service is temporarily unavailable. Please try again later.",
    message_too_long: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`,
    session_expired: "Your chat session has expired. Please start a new one.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: ChatErrorType[] = [
    "network_error",
    "rate_limited",
    "ai_unavailable",
  ];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error response
 */
export function parseChatApiError(
  status: number,
  errorCode?: string,
  errorMessage?: string
): ChatError {
  if (status === 429) {
    return createChatError("rate_limited", errorMessage);
  }
  if (status === 403) {
    if (errorCode === "AI_DISABLED" || errorMessage?.includes("AI")) {
      return createChatError("ai_disabled", errorMessage);
    }
    return createChatError("unknown", errorMessage);
  }
  if (status === 400) {
    if (
      errorCode === "MESSAGE_TOO_LONG" ||
      errorMessage?.includes("too long")
    ) {
      return createChatError("message_too_long", errorMessage);
    }
    return createChatError("unknown", errorMessage);
  }
  if (status === 503) {
    return createChatError("ai_unavailable", errorMessage);
  }
  if (status >= 500) {
    return createChatError("ai_unavailable", errorMessage);
  }
  if (status === 0) {
    return createChatError("network_error");
  }
  return createChatError("unknown", errorMessage);
}

/**
 * Truncate text to max length
 */
export function truncateText(
  text: string | undefined,
  maxLength: number
): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Build API request from session
 */
export function buildChatApiRequest(
  session: ChatSession,
  newMessage: string
): ChatApiRequest {
  const contextObj: ChatApiRequest["context"] = {};

  if (session.context.bookTitle) {
    contextObj.bookTitle = session.context.bookTitle;
  }
  if (session.context.chapterTitle) {
    contextObj.chapterTitle = session.context.chapterTitle;
  }
  const recentText = truncateText(
    session.context.recentText,
    MAX_CONTEXT_LENGTH
  );
  if (recentText) {
    contextObj.recentText = recentText;
  }
  const selectedText = truncateText(
    session.context.selectedText,
    MAX_CONTEXT_LENGTH
  );
  if (selectedText) {
    contextObj.selectedText = selectedText;
  }
  if (session.context.readingLevel) {
    contextObj.readingLevel = session.context.readingLevel;
  }

  return {
    bookId: session.context.bookId,
    message: newMessage.trim(),
    history: getHistoryForApi(session.messages),
    context: contextObj,
  };
}

/**
 * Get storage key for a session
 */
export function getSessionStorageKey(bookId: string): string {
  return `${SESSION_STORAGE_KEY_PREFIX}${bookId}`;
}

/**
 * Save session to localStorage
 */
export function saveSessionToStorage(session: ChatSession): void {
  try {
    const key = getSessionStorageKey(session.bookId);
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Silently fail if storage is not available
  }
}

/**
 * Load session from localStorage
 */
export function loadSessionFromStorage(bookId: string): ChatSession | null {
  try {
    const key = getSessionStorageKey(bookId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as ChatSession;
  } catch {
    return null;
  }
}

/**
 * Clear session from localStorage
 */
export function clearSessionFromStorage(bookId: string): void {
  try {
    const key = getSessionStorageKey(bookId);
    localStorage.removeItem(key);
  } catch {
    // Silently fail if storage is not available
  }
}

/**
 * Format timestamp for display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Check if session is empty
 */
export function isSessionEmpty(session: ChatSession | null): boolean {
  return !session || session.messages.length === 0;
}

/**
 * Get message count for a session
 */
export function getMessageCount(session: ChatSession | null): number {
  return session?.messages.length ?? 0;
}

/**
 * Get user messages count
 */
export function getUserMessageCount(session: ChatSession | null): number {
  return session?.messages.filter((m) => m.role === "user").length ?? 0;
}

/**
 * Check if the last message is from the assistant and still pending/streaming
 */
export function isWaitingForResponse(session: ChatSession | null): boolean {
  if (!session || session.messages.length === 0) return false;
  const lastMessage = session.messages[session.messages.length - 1];
  if (!lastMessage) return false;
  return (
    lastMessage.role === "assistant" &&
    (lastMessage.status === "pending" || lastMessage.status === "streaming")
  );
}

/**
 * Get the last error message if any
 */
export function getLastError(session: ChatSession | null): string | undefined {
  if (!session || session.messages.length === 0) return undefined;
  const lastMessage = session.messages[session.messages.length - 1];
  if (!lastMessage) return undefined;
  return lastMessage.status === "error" ? lastMessage.error : undefined;
}
