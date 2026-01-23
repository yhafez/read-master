/**
 * Voice Chat Component
 *
 * Provides voice interaction with AI using speech-to-text and text-to-speech.
 * Users can talk to the AI assistant and receive voice responses.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Avatar,
  Chip,
  Tooltip,
  Fade,
  LinearProgress,
  Stack,
  Menu,
  MenuItem,
  Divider,
  Slider,
  FormControlLabel,
  Switch,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Stop as StopIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  SmartToy as AIIcon,
  Speed as SpeedIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  useVoiceChat,
  useVoiceSettings,
  useUpdateVoiceSettings,
  useSpeechSynthesis,
  SUPPORTED_LANGUAGES,
  type VoiceMessage,
  type VoiceLanguage,
} from "@/hooks";

/**
 * Voice Chat Props
 */
type VoiceChatProps = {
  /** Optional book context */
  bookId?: string;
  /** Optional book title for display */
  bookTitle?: string;
  /** Optional page number context */
  pageNumber?: number;
  /** Optional selected text for context */
  selectedText?: string;
  /** Callback when chat is closed */
  onClose?: () => void;
  /** Compact mode for embedded usage */
  compact?: boolean;
};

/**
 * Message Bubble Component
 */
function MessageBubble({
  message,
  onSpeak,
  onStopSpeaking,
  isSpeaking,
}: {
  message: VoiceMessage;
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
  isSpeaking: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 2,
      }}
    >
      {!isUser && (
        <Avatar
          sx={{
            bgcolor: "primary.main",
            mr: 1,
            width: 32,
            height: 32,
          }}
        >
          <AIIcon sx={{ fontSize: 18 }} />
        </Avatar>
      )}
      <Box sx={{ maxWidth: "75%" }}>
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            bgcolor: isUser ? "primary.main" : "grey.100",
            color: isUser ? "primary.contrastText" : "text.primary",
            borderRadius: 2,
            borderTopRightRadius: isUser ? 0 : 2,
            borderTopLeftRadius: isUser ? 2 : 0,
          }}
        >
          <Typography variant="body2">{message.text}</Typography>
        </Paper>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mt: 0.5,
            gap: 0.5,
            justifyContent: isUser ? "flex-end" : "flex-start",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
          {!isUser && (
            <Tooltip title={isSpeaking ? "Stop speaking" : "Read aloud"}>
              <IconButton
                size="small"
                onClick={() =>
                  isSpeaking ? onStopSpeaking() : onSpeak(message.text)
                }
                sx={{ ml: 0.5 }}
              >
                {isSpeaking ? (
                  <StopIcon sx={{ fontSize: 16 }} />
                ) : (
                  <VolumeUpIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
          {message.confidence !== undefined && message.confidence > 0 && (
            <Chip
              label={`${Math.round(message.confidence * 100)}%`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          )}
        </Box>
      </Box>
      {isUser && (
        <Avatar
          sx={{
            bgcolor: "secondary.main",
            ml: 1,
            width: 32,
            height: 32,
          }}
        >
          <PersonIcon sx={{ fontSize: 18 }} />
        </Avatar>
      )}
    </Box>
  );
}

/**
 * Waveform Visualizer Component
 */
function WaveformVisualizer({ isActive }: { isActive: boolean }) {
  const bars = 5;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 24,
        gap: 0.5,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            bgcolor: isActive ? "primary.main" : "grey.400",
            borderRadius: 1,
            transition: "height 0.1s ease",
            height: isActive ? `${8 + Math.random() * 16}px` : 8,
            animation: isActive
              ? `pulse 0.5s ease-in-out ${i * 0.1}s infinite alternate`
              : "none",
            "@keyframes pulse": {
              "0%": { height: "8px" },
              "100%": { height: "24px" },
            },
          }}
        />
      ))}
    </Box>
  );
}

/**
 * Voice Chat Component
 *
 * Provides voice interaction with AI assistant.
 */
export function VoiceChat({
  bookId,
  bookTitle,
  pageNumber,
  selectedText,
  onClose,
  compact = false,
}: VoiceChatProps) {
  const { t } = useTranslation();
  const [textInput, setTextInput] = useState("");
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice settings
  const { data: voiceSettings } = useVoiceSettings();
  const { mutate: updateSettings } = useUpdateVoiceSettings();

  // Voice chat hook
  const {
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
  } = useVoiceChat({
    context:
      bookId || bookTitle || pageNumber
        ? {
            ...(bookId && { bookId }),
            ...(bookTitle && { bookTitle }),
            ...(pageNumber && { pageNumber }),
          }
        : undefined,
    settings: voiceSettings,
  });

  // Speech synthesis for replaying messages
  const synthesisSettings = voiceSettings?.synthesis;
  const {
    speak,
    stop: stopSpeech,
    voices,
  } = useSpeechSynthesis(
    synthesisSettings ? { settings: synthesisSettings } : {}
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle text input send
  const handleSendText = useCallback(async () => {
    if (!textInput.trim()) return;
    await sendMessage(textInput.trim());
    setTextInput("");
  }, [textInput, sendMessage]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Handle microphone toggle
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle settings menu
  const handleSettingsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  // Handle settings changes
  const handleLanguageChange = (event: SelectChangeEvent) => {
    updateSettings({
      recognition: { language: event.target.value as VoiceLanguage },
      synthesis: { language: event.target.value as VoiceLanguage },
    });
  };

  const handleRateChange = (_: Event, value: number | number[]) => {
    updateSettings({
      synthesis: { rate: value as number },
    });
  };

  const handleAutoPlayToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({
      synthesis: { autoPlay: event.target.checked },
    });
  };

  // Status indicator
  const getStatusText = () => {
    switch (status) {
      case "listening":
        return t("voice.status.listening", "Listening...");
      case "processing":
        return t("voice.status.processing", "Processing...");
      case "thinking":
        return t("voice.status.thinking", "Thinking...");
      case "speaking":
        return t("voice.status.speaking", "Speaking...");
      case "error":
        return t("voice.status.error", "Error occurred");
      default:
        return t("voice.status.ready", "Ready");
    }
  };

  const isProcessing =
    status === "processing" || status === "thinking" || status === "speaking";

  return (
    <Paper
      elevation={compact ? 0 : 3}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: compact ? 0 : 2,
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
          <MicIcon />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t("voice.title", "Voice Chat")}
            </Typography>
            {bookTitle && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {bookTitle}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={t("voice.settings", "Settings")}>
            <IconButton
              size="small"
              onClick={handleSettingsOpen}
              sx={{ color: "inherit" }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("voice.clearChat", "Clear chat")}>
            <IconButton
              size="small"
              onClick={clearSession}
              sx={{ color: "inherit" }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {onClose && (
            <Tooltip title={t("common.close", "Close")}>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ color: "inherit" }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Processing indicator */}
      {isProcessing && <LinearProgress />}

      {/* Status bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: "grey.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WaveformVisualizer isActive={isListening || isSpeaking} />
          <Typography variant="caption" color="text.secondary">
            {getStatusText()}
          </Typography>
        </Box>
        {selectedText && (
          <Chip
            label={t("voice.contextActive", "Context active")}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          bgcolor: "background.default",
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "text.secondary",
              textAlign: "center",
              p: 3,
            }}
          >
            <MicIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              {t("voice.startPrompt", "Start talking")}
            </Typography>
            <Typography variant="body2">
              {t(
                "voice.instructions",
                "Click the microphone to start speaking, or type a message below."
              )}
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onSpeak={speak}
                onStopSpeaking={stopSpeech}
                isSpeaking={isSpeaking}
              />
            ))}
          </>
        )}

        {/* Show transcript while listening */}
        {(transcript || interimTranscript) && (
          <Fade in>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mb: 2,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                  borderRadius: 2,
                  borderTopRightRadius: 0,
                  maxWidth: "75%",
                  opacity: 0.8,
                }}
              >
                <Typography variant="body2">
                  {transcript}
                  {interimTranscript && (
                    <span style={{ opacity: 0.7 }}>{interimTranscript}</span>
                  )}
                </Typography>
              </Paper>
            </Box>
          </Fade>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-end">
          {/* Microphone button */}
          <Tooltip
            title={
              isListening
                ? t("voice.stopListening", "Stop listening")
                : t("voice.startListening", "Start listening")
            }
          >
            <IconButton
              onClick={handleMicToggle}
              disabled={isProcessing}
              sx={{
                bgcolor: isListening ? "error.main" : "primary.main",
                color: "white",
                "&:hover": {
                  bgcolor: isListening ? "error.dark" : "primary.dark",
                },
                "&.Mui-disabled": {
                  bgcolor: "grey.300",
                  color: "grey.500",
                },
              }}
            >
              {isListening ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
          </Tooltip>

          {/* Text input */}
          <TextField
            fullWidth
            size="small"
            placeholder={t("voice.typePlaceholder", "Type or speak...")}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isListening || isProcessing}
            multiline
            maxRows={3}
            InputProps={{
              sx: { borderRadius: 2 },
            }}
          />

          {/* Send button */}
          <Tooltip title={t("voice.send", "Send message")}>
            <span>
              <IconButton
                onClick={handleSendText}
                disabled={!textInput.trim() || isProcessing}
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "grey.300",
                    color: "grey.500",
                  },
                }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>

          {/* Stop speech button (shown when speaking) */}
          {isSpeaking && (
            <Tooltip title={t("voice.stopSpeaking", "Stop speaking")}>
              <IconButton
                onClick={cancelSpeech}
                sx={{
                  bgcolor: "error.main",
                  color: "white",
                  "&:hover": {
                    bgcolor: "error.dark",
                  },
                }}
              >
                <VolumeOffIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: { width: 280, maxHeight: 400, p: 1 },
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          {t("voice.settings", "Voice Settings")}
        </Typography>
        <Divider sx={{ my: 1 }} />

        {/* Language selection */}
        <MenuItem sx={{ flexDirection: "column", alignItems: "flex-start" }}>
          <Typography variant="caption" color="text.secondary">
            {t("voice.language", "Language")}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={voiceSettings?.recognition?.language ?? "en-US"}
            onChange={handleLanguageChange}
            sx={{ mt: 0.5 }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <MenuItem key={lang} value={lang}>
                {lang}
              </MenuItem>
            ))}
          </Select>
        </MenuItem>

        {/* Speech rate */}
        <MenuItem sx={{ flexDirection: "column", alignItems: "flex-start" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: "100%",
            }}
          >
            <SpeedIcon sx={{ fontSize: 18 }} />
            <Typography variant="caption" color="text.secondary">
              {t("voice.speechRate", "Speech Rate")}
            </Typography>
          </Box>
          <Slider
            size="small"
            value={voiceSettings?.synthesis?.rate ?? 1}
            onChange={handleRateChange}
            min={0.5}
            max={2}
            step={0.1}
            valueLabelDisplay="auto"
            sx={{ mt: 1, width: "100%" }}
          />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {/* Auto-play toggle */}
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={voiceSettings?.synthesis?.autoPlay ?? true}
                onChange={handleAutoPlayToggle}
              />
            }
            label={
              <Typography variant="body2">
                {t("voice.autoPlay", "Auto-play responses")}
              </Typography>
            }
            sx={{ width: "100%" }}
          />
        </MenuItem>

        {/* Voice count info */}
        {voices.length > 0 && (
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">
              {t("voice.availableVoices", "{{count}} voices available", {
                count: voices.length,
              })}
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
}
