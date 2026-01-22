import { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Send as SendIcon,
  AutoAwesome as AIIcon,
  Person as PersonIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import type { ConversationMessage } from "@read-master/ai";
import {
  useStudyBuddy,
  type ReadingPosition,
  type RecentAnnotation,
} from "@/hooks";

/**
 * Study Buddy Chat Props
 */
type StudyBuddyChatProps = {
  bookId: string;
  bookTitle: string;
  currentPosition?: ReadingPosition;
  currentText?: string;
  recentAnnotations?: RecentAnnotation[];
  onClose?: () => void;
};

/**
 * AI Study Buddy Chat Component
 *
 * Provides contextual chat assistance while reading.
 * The AI Study Buddy can answer questions, explain concepts,
 * and provide personalized learning support.
 */
export function StudyBuddyChat({
  bookId,
  bookTitle,
  currentPosition,
  currentText,
  recentAnnotations,
  onClose,
}: StudyBuddyChatProps) {
  const [message, setMessage] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { mutate: sendMessage, isPending, error } = useStudyBuddy();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  const handleSendMessage = () => {
    if (!message.trim() || isPending) return;

    const userMessage = message.trim();
    setMessage("");

    // Add user message to conversation
    const newUserMessage: ConversationMessage = {
      role: "user",
      content: userMessage,
    };
    setConversationHistory((prev) => [...prev, newUserMessage]);

    // Send to AI
    sendMessage(
      {
        bookId,
        userMessage,
        ...(currentPosition && { currentPosition }),
        ...(currentText && { currentText }),
        ...(conversationHistory &&
          conversationHistory.length > 0 && { conversationHistory }),
        ...(recentAnnotations &&
          recentAnnotations.length > 0 && { recentAnnotations }),
      },
      {
        onSuccess: (response) => {
          // Add AI response to conversation
          const aiMessage: ConversationMessage = {
            role: "assistant",
            content: response.response,
          };
          setConversationHistory((prev) => [...prev, aiMessage]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = () => {
    setConversationHistory([]);
    setMessage("");
  };

  return (
    <Paper
      elevation={3}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AIIcon />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Study Buddy
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {bookTitle}
            </Typography>
          </Box>
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: "inherit" }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Context Chips */}
      {(currentPosition || currentText || recentAnnotations) && (
        <Box
          sx={{
            p: 1,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            bgcolor: "grey.50",
          }}
        >
          {currentPosition?.percentage && (
            <Chip
              label={`${currentPosition.percentage}% complete`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {currentPosition?.chapter && (
            <Chip
              label={currentPosition.chapter}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {currentText && (
            <Chip
              label="Selected text provided"
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
          {recentAnnotations && recentAnnotations.length > 0 && (
            <Chip
              label={`${recentAnnotations.length} recent notes`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {conversationHistory.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            <AIIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Hello! I'm your AI Study Buddy
            </Typography>
            <Typography variant="body2">
              Ask me anything about {bookTitle}. I can explain concepts, answer
              questions, and help you understand the material better.
            </Typography>
          </Box>
        )}

        {conversationHistory.map((msg, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}
          >
            <Avatar
              sx={{
                bgcolor:
                  msg.role === "user" ? "secondary.main" : "primary.main",
                width: 32,
                height: 32,
              }}
            >
              {msg.role === "user" ? (
                <PersonIcon fontSize="small" />
              ) : (
                <AIIcon fontSize="small" />
              )}
            </Avatar>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: "75%",
                bgcolor: msg.role === "user" ? "secondary.light" : "grey.100",
                color:
                  msg.role === "user"
                    ? "secondary.contrastText"
                    : "text.primary",
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {msg.content}
              </Typography>
            </Paper>
          </Box>
        ))}

        {isPending && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
              <AIIcon fontSize="small" />
            </Avatar>
            <Paper elevation={1} sx={{ p: 2, bgcolor: "grey.100" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Thinking...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {error && (
          <Alert severity="error" onClose={() => {}}>
            {error.message || "Failed to get AI response. Please try again."}
          </Alert>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          gap: 1,
          alignItems: "flex-end",
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the book..."
          disabled={isPending}
          variant="outlined"
          size="small"
        />
        <Tooltip
          title={conversationHistory.length > 0 ? "Clear conversation" : ""}
        >
          <span>
            <IconButton
              onClick={handleClearConversation}
              disabled={conversationHistory.length === 0}
              color="default"
            >
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Send message (Enter)">
          <span>
            <IconButton
              onClick={handleSendMessage}
              disabled={!message.trim() || isPending}
              color="primary"
            >
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
}
