/**
 * SessionChat Component
 *
 * Real-time chat sidebar for live reading sessions.
 * Displays messages and allows participants to send chat.
 *
 * Features:
 * - Message list with auto-scroll
 * - Message input with send button
 * - Different message types (chat, system, highlight, question)
 * - Typing indicator for pending messages
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Avatar,
  Stack,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  SendOutlined,
  ChatBubbleOutline,
  HighlightOutlined,
  HelpOutline,
  EditNoteOutlined,
  InfoOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import type {
  SessionMessage,
  SendMessageInput,
} from "@/hooks/useSessionRealtime";

// ============================================================================
// Types
// ============================================================================

export type SessionChatProps = {
  messages: SessionMessage[];
  isLoadingMessages: boolean;
  onSendMessage: (input: SendMessageInput) => Promise<void>;
  isSendingMessage: boolean;
  allowChat: boolean;
  currentPage?: number;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon for message type
 */
export function getMessageTypeIcon(
  type: SessionMessage["type"]
): React.ReactNode {
  switch (type) {
    case "HIGHLIGHT":
      return <HighlightOutlined fontSize="small" color="warning" />;
    case "QUESTION":
      return <HelpOutline fontSize="small" color="info" />;
    case "ANNOTATION":
      return <EditNoteOutlined fontSize="small" color="secondary" />;
    case "SYSTEM":
      return <InfoOutlined fontSize="small" color="disabled" />;
    default:
      return null;
  }
}

/**
 * Get background color for message type
 */
export function getMessageBackgroundColor(
  type: SessionMessage["type"]
): string {
  switch (type) {
    case "SYSTEM":
      return "action.hover";
    case "HIGHLIGHT":
      return "warning.light";
    case "QUESTION":
      return "info.light";
    case "ANNOTATION":
      return "secondary.light";
    default:
      return "transparent";
  }
}

/**
 * Format message time
 */
export function formatMessageTime(createdAt: string): string {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
}

/**
 * Get display name for user
 */
export function getDisplayName(user: SessionMessage["user"]): string {
  return user.displayName ?? user.username ?? "Anonymous";
}

// ============================================================================
// Sub-components
// ============================================================================

type MessageItemProps = {
  message: SessionMessage;
};

function MessageItem({ message }: MessageItemProps): React.ReactElement {
  const isSystem = message.type === "SYSTEM";
  const icon = getMessageTypeIcon(message.type);
  const bgColor = getMessageBackgroundColor(message.type);

  if (isSystem) {
    return (
      <Box
        sx={{
          py: 0.5,
          px: 1,
          bgcolor: bgColor,
          borderRadius: 1,
          textAlign: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {message.content}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: 1,
        px: 1.5,
        bgcolor: bgColor,
        borderRadius: 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack direction="row" spacing={1.5}>
        <Avatar
          {...(message.user.avatarUrl ? { src: message.user.avatarUrl } : {})}
          sx={{ width: 32, height: 32 }}
        >
          {getDisplayName(message.user).charAt(0).toUpperCase()}
        </Avatar>
        <Box flex={1}>
          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
            <Typography variant="subtitle2">
              {getDisplayName(message.user)}
            </Typography>
            {icon}
            {message.pageNumber !== null && (
              <Chip
                label={`p.${message.pageNumber}`}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: "0.7rem" }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {formatMessageTime(message.createdAt)}
            </Typography>
          </Stack>
          <Typography variant="body2">{message.content}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SessionChat({
  messages,
  isLoadingMessages,
  onSendMessage,
  isSendingMessage,
  allowChat,
  currentPage,
  hasMoreMessages,
  onLoadMore,
}: SessionChatProps): React.ReactElement {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSendingMessage) return;

    const messageContent = inputValue.trim();
    setInputValue("");

    await onSendMessage({
      content: messageContent,
      type: "CHAT",
      pageNumber: currentPage ?? null,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Sort messages oldest first for display (bottom to top)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ChatBubbleOutline color="primary" />
          <Typography variant="h6">{t("liveSessions.chat.title")}</Typography>
        </Stack>
      </Box>

      {/* Messages */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {/* Load more button */}
        {hasMoreMessages && onLoadMore && (
          <Box textAlign="center" py={1}>
            <Chip
              label={t("common.loadMore", "Load more")}
              onClick={onLoadMore}
              size="small"
              clickable
            />
          </Box>
        )}

        {isLoadingMessages ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            flex={1}
          >
            <CircularProgress size={24} />
          </Box>
        ) : sortedMessages.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            flex={1}
            gap={1}
          >
            <ChatBubbleOutline sx={{ fontSize: 48, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary">
              {t("liveSessions.chat.noMessages")}
            </Typography>
          </Box>
        ) : (
          sortedMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      {allowChat ? (
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder={t("liveSessions.chat.placeholder")}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSendingMessage}
              multiline
              maxRows={3}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!inputValue.trim() || isSendingMessage}
            >
              {isSendingMessage ? (
                <CircularProgress size={20} />
              ) : (
                <SendOutlined />
              )}
            </IconButton>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("liveSessions.details.chatDisabled")}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default SessionChat;
