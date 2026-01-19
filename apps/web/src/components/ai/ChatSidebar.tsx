/**
 * AI Chat Sidebar Component
 *
 * A sidebar chat interface that allows users to have conversations
 * with an AI assistant about the book they're reading.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Divider,
  Tooltip,
  useTheme,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  Close as CloseIcon,
  Send as SendIcon,
  DeleteOutline as ClearIcon,
  AutoAwesome as SparkleIcon,
  Person as UserIcon,
  SmartToy as AssistantIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ChatSidebarProps,
  ChatSession,
  ChatMessage,
  ChatError,
} from "./chatTypes";
import {
  createChatSession,
  createUserMessage,
  createAssistantMessage,
  addMessageToSession,
  updateLastMessage,
  clearSessionMessages,
  buildChatApiRequest,
  parseChatApiError,
  validateMessage,
  saveSessionToStorage,
  loadSessionFromStorage,
  clearSessionFromStorage,
  formatMessageTime,
  isWaitingForResponse,
  getLastError,
  SUGGESTED_QUESTIONS,
  MAX_MESSAGE_LENGTH,
} from "./chatTypes";

/**
 * Single chat message bubble
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isPending =
    message.status === "pending" || message.status === "streaming";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        mb: 2,
      }}
    >
      {/* Avatar and role indicator */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mb: 0.5,
          color: "text.secondary",
        }}
      >
        {isUser ? (
          <>
            <Typography variant="caption">{t("ai.chat.you")}</Typography>
            <UserIcon fontSize="small" />
          </>
        ) : (
          <>
            <AssistantIcon fontSize="small" />
            <Typography variant="caption">{t("ai.chat.assistant")}</Typography>
          </>
        )}
      </Box>

      {/* Message content */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          maxWidth: "85%",
          borderRadius: 2,
          backgroundColor: isUser
            ? theme.palette.primary.main
            : isError
              ? theme.palette.error.light
              : theme.palette.mode === "dark"
                ? theme.palette.grey[800]
                : theme.palette.grey[100],
          color: isUser
            ? theme.palette.primary.contrastText
            : isError
              ? theme.palette.error.contrastText
              : theme.palette.text.primary,
        }}
      >
        {isPending ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="body2">
              {t("ai.chat.thinking", "Thinking...")}
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <ErrorIcon fontSize="small" />
            <Typography variant="body2">
              {message.error ?? t("ai.chat.errorGeneric")}
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {message.content}
          </Typography>
        )}
      </Paper>

      {/* Timestamp */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {formatMessageTime(message.timestamp)}
      </Typography>
    </Box>
  );
}

/**
 * Suggested questions component
 */
function SuggestedQuestions({
  onSelect,
  disabled,
}: {
  onSelect: (question: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t("ai.chat.suggestions", "Try asking:")}
      </Typography>
      <List dense disablePadding>
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => onSelect(question)}
              disabled={disabled}
              sx={{
                borderRadius: 1,
                py: 0.75,
                bgcolor: "action.hover",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <ListItemText
                primary={t(`ai.chat.suggested.${index}`, question)}
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/**
 * Chat Sidebar - AI conversation interface
 */
export function ChatSidebar({
  open,
  onClose,
  context,
  initialSession,
  onSessionUpdate,
  width = 360,
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  const [session, setSession] = useState<ChatSession>(() => {
    if (initialSession) return initialSession;
    const stored = loadSessionFromStorage(context.bookId);
    if (stored && stored.bookId === context.bookId) return stored;
    return createChatSession(context);
  });

  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<ChatError | null>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session.messages.length, scrollToBottom]);

  // Save session to storage when it updates
  useEffect(() => {
    saveSessionToStorage(session);
    onSessionUpdate?.(session);
  }, [session, onSessionUpdate]);

  // Reset session if context changes
  useEffect(() => {
    if (context.bookId !== session.bookId) {
      const stored = loadSessionFromStorage(context.bookId);
      if (stored && stored.bookId === context.bookId) {
        setSession(stored);
      } else {
        setSession(createChatSession(context));
      }
    } else {
      // Update context in current session
      setSession((prev) => ({
        ...prev,
        context: { ...prev.context, ...context },
      }));
    }
  }, [context, session.bookId]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildChatApiRequest(session, message)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseChatApiError(
          response.status,
          errorData.code,
          errorData.message
        );
      }

      return response.json();
    },
    onMutate: (message) => {
      // Add user message and pending assistant message
      const userMsg = createUserMessage(message);
      const assistantMsg = createAssistantMessage();

      setSession((prev) => {
        let updated = addMessageToSession(prev, userMsg);
        updated = addMessageToSession(updated, assistantMsg);
        return updated;
      });

      setInputValue("");
      setError(null);
    },
    onSuccess: (data) => {
      // Update the assistant message with the response
      setSession((prev) =>
        updateLastMessage(prev, {
          content: data.response ?? data.answer ?? "",
          status: "complete",
          tokensUsed: data.tokensUsed,
        })
      );
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
    onError: (err: ChatError | Error) => {
      const chatError =
        "type" in err
          ? err
          : { type: "unknown" as const, message: err.message, retryable: true };
      setError(chatError);

      // Update the assistant message with error
      setSession((prev) =>
        updateLastMessage(prev, {
          status: "error",
          error: chatError.message,
        })
      );
    },
  });

  // Handle send message
  const handleSend = useCallback(() => {
    const validation = validateMessage(inputValue);
    if (!validation.valid) {
      if (validation.error) setError(validation.error);
      return;
    }
    sendMutation.mutate(inputValue);
  }, [inputValue, sendMutation]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handle suggested question
  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      sendMutation.mutate(question);
    },
    [sendMutation]
  );

  // Handle clear chat
  const handleClearChat = useCallback(() => {
    setSession((prev) => clearSessionMessages(prev));
    clearSessionFromStorage(context.bookId);
    setError(null);
  }, [context.bookId]);

  // Handle retry last message
  const handleRetry = useCallback(() => {
    if (session.messages.length < 2) return;

    // Find the last user message
    const messages = [...session.messages];
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg.role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];
    if (!lastUserMessage) return;

    // Remove the error message and retry
    setSession((prev) => ({
      ...prev,
      messages: prev.messages.slice(0, -1),
      updatedAt: new Date().toISOString(),
    }));

    setError(null);
    sendMutation.mutate(lastUserMessage.content);
  }, [session.messages, sendMutation]);

  const isLoading = isWaitingForResponse(session);
  const lastError = getLastError(session);
  const showSuggestions = session.messages.length === 0;
  const canSend = inputValue.trim().length > 0 && !isLoading;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width, display: "flex", flexDirection: "column" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SparkleIcon color="primary" />
          <Typography variant="h6">{t("ai.chat.title")}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={t("ai.chat.clear")}>
            <IconButton
              size="small"
              onClick={handleClearChat}
              disabled={session.messages.length === 0}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Context chip */}
      {context.bookTitle && (
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
          <Chip
            size="small"
            label={t("ai.chat.context", { book: context.bookTitle })}
            variant="outlined"
          />
        </Box>
      )}

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {showSuggestions ? (
          <Box sx={{ flex: 1 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <SparkleIcon
                sx={{
                  fontSize: 48,
                  color: "primary.main",
                  opacity: 0.5,
                  mb: 1,
                }}
              />
              <Typography variant="body1" color="text.secondary">
                {t("ai.chat.welcome")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t("ai.chat.welcomeDescription")}
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <SuggestedQuestions
              onSelect={handleSuggestedQuestion}
              disabled={isLoading}
            />
          </Box>
        ) : (
          <>
            {session.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Error alert with retry */}
      {lastError && error?.retryable && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              {t("common.retry")}
            </Button>
          }
          sx={{ mx: 2, mb: 1 }}
        >
          {lastError}
        </Alert>
      )}

      {/* Input area */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={t("ai.chat.placeholder")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            slotProps={{
              htmlInput: { maxLength: MAX_MESSAGE_LENGTH },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!canSend}
            sx={{
              bgcolor: canSend ? "primary.main" : "transparent",
              color: canSend ? "primary.contrastText" : "inherit",
              "&:hover": {
                bgcolor: canSend ? "primary.dark" : "action.hover",
              },
            }}
          >
            {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          {t("ai.chat.charCount", {
            current: inputValue.length,
            max: MAX_MESSAGE_LENGTH,
          })}
        </Typography>
      </Box>
    </Drawer>
  );
}
