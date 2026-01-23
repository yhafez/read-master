/**
 * VoiceCommandButton Component
 *
 * A button that activates voice command listening with visual and audio feedback.
 * Integrates with the useVoiceCommands hook for accessibility voice control.
 */

import { useState, useCallback, useEffect } from "react";
import {
  IconButton,
  Tooltip,
  Badge,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
  Fade,
  useTheme,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import {
  useVoiceCommands,
  type NavigationCommand,
  type ReadingCommand,
  type ActionCommand,
  type VoiceCommandResult,
  type VoiceCommandError,
} from "@/hooks/useVoiceCommands";

/**
 * Props for VoiceCommandButton
 */
export interface VoiceCommandButtonProps {
  /** Callback for reading actions (when in reader) */
  onReadingAction?: (action: ReadingCommand) => void;
  /** Callback for generic actions */
  onAction?: (action: ActionCommand) => void;
  /** Whether the button is in the reader context */
  isReader?: boolean;
  /** Size of the button */
  size?: "small" | "medium" | "large";
  /** Whether to show the help button */
  showHelp?: boolean;
}

/**
 * VoiceCommandButton Component
 */
export function VoiceCommandButton({
  onReadingAction,
  onAction,
  isReader = false,
  size = "medium",
  showHelp = true,
}: VoiceCommandButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { announce } = useAccessibility();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSeverity, setFeedbackSeverity] = useState<
    "success" | "error" | "info"
  >("info");
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Handle navigation commands
  const handleNavigate = useCallback(
    (command: NavigationCommand) => {
      const routes: Record<NavigationCommand, string | (() => void)> = {
        home: "/dashboard",
        library: "/library",
        flashcards: "/flashcards",
        assessments: "/assessments",
        settings: "/settings",
        groups: "/groups",
        forum: "/forum",
        leaderboard: "/leaderboard",
        curriculums: "/curriculums",
        back: () => window.history.back(),
        forward: () => window.history.forward(),
      };

      const route = routes[command];
      if (typeof route === "function") {
        route();
      } else {
        navigate(route);
      }
    },
    [navigate]
  );

  // Handle command feedback
  const handleCommand = useCallback(
    (result: VoiceCommandResult) => {
      const message = t("voiceCommands.commandRecognized", {
        command: result.command,
        defaultValue: `Command recognized: ${result.command}`,
      });
      setFeedbackMessage(message);
      setFeedbackSeverity("success");
      setShowFeedback(true);
      announce(message);
    },
    [t, announce]
  );

  // Handle errors
  const handleError = useCallback(
    (error: VoiceCommandError) => {
      setFeedbackMessage(error.message);
      setFeedbackSeverity("error");
      setShowFeedback(true);
      announce(error.message, { politeness: "assertive" });
    },
    [announce]
  );

  // Handle action commands (like help)
  const handleActionCommand = useCallback(
    (action: ActionCommand) => {
      if (action === "help") {
        setShowHelpDialog(true);
      } else {
        onAction?.(action);
      }
    },
    [onAction]
  );

  const {
    isSupported,
    isListening,
    transcript,
    toggleListening,
    getAvailableCommands,
  } = useVoiceCommands({
    onNavigate: handleNavigate,
    onReadingAction,
    onAction: handleActionCommand,
    onCommand: handleCommand,
    onError: handleError,
  });

  // Announce listening state changes
  useEffect(() => {
    if (isListening) {
      announce(
        t(
          "voiceCommands.listening",
          "Listening for voice commands. Say 'help' for available commands."
        )
      );
    }
  }, [isListening, announce, t]);

  // If not supported, don't render
  if (!isSupported) {
    return null;
  }

  const vocabulary = getAvailableCommands();

  return (
    <>
      {/* Main Voice Command Button */}
      <Tooltip
        title={
          isListening
            ? t("voiceCommands.stopListening", "Stop listening")
            : t("voiceCommands.startListening", "Start voice commands")
        }
      >
        <IconButton
          onClick={toggleListening}
          color={isListening ? "primary" : "default"}
          size={size}
          aria-label={
            isListening
              ? t("voiceCommands.stopListening", "Stop listening")
              : t("voiceCommands.startListening", "Start voice commands")
          }
          aria-pressed={isListening}
          sx={{
            position: "relative",
            transition: "all 0.2s ease-in-out",
            ...(isListening && {
              animation: "pulse 1.5s infinite",
              "@keyframes pulse": {
                "0%": {
                  boxShadow: `0 0 0 0 ${theme.palette.primary.main}40`,
                },
                "70%": {
                  boxShadow: `0 0 0 10px ${theme.palette.primary.main}00`,
                },
                "100%": {
                  boxShadow: `0 0 0 0 ${theme.palette.primary.main}00`,
                },
              },
            }),
          }}
        >
          <Badge
            color="error"
            variant="dot"
            invisible={!isListening}
            overlap="circular"
          >
            {isListening ? <MicIcon /> : <MicOffIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Help Button */}
      {showHelp && (
        <Tooltip title={t("voiceCommands.help", "Voice command help")}>
          <IconButton
            onClick={() => setShowHelpDialog(true)}
            size="small"
            aria-label={t("voiceCommands.help", "Voice command help")}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Listening Indicator with Transcript */}
      <Fade in={isListening && transcript.length > 0}>
        <Chip
          label={transcript}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ ml: 1, maxWidth: 200 }}
        />
      </Fade>

      {/* Feedback Snackbar */}
      <Snackbar
        open={showFeedback}
        autoHideDuration={3000}
        onClose={() => setShowFeedback(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowFeedback(false)}
          severity={feedbackSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {feedbackMessage}
        </Alert>
      </Snackbar>

      {/* Help Dialog */}
      <Dialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="voice-commands-help-title"
      >
        <DialogTitle id="voice-commands-help-title">
          {t("voiceCommands.helpTitle", "Voice Commands")}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t(
              "voiceCommands.helpDescription",
              "Say any of the following commands while voice recognition is active."
            )}
          </Typography>

          {/* Navigation Commands */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              {t("voiceCommands.navigationCommands", "Navigation")}
            </Typography>
            <List dense>
              {Object.entries(vocabulary.navigation).map(
                ([command, phrases]) => (
                  <ListItem key={command} disableGutters>
                    <ListItemText
                      primary={command.replace(/_/g, " ")}
                      secondary={phrases.slice(0, 3).join(", ")}
                    />
                  </ListItem>
                )
              )}
            </List>
          </Box>

          {/* Reading Commands (only show in reader context) */}
          {isReader && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {t("voiceCommands.readingCommands", "Reading")}
              </Typography>
              <List dense>
                {Object.entries(vocabulary.reading).map(
                  ([command, phrases]) => (
                    <ListItem key={command} disableGutters>
                      <ListItemText
                        primary={command.replace(/_/g, " ")}
                        secondary={phrases.slice(0, 3).join(", ")}
                      />
                    </ListItem>
                  )
                )}
              </List>
            </Box>
          )}

          {/* Action Commands */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              {t("voiceCommands.actionCommands", "Actions")}
            </Typography>
            <List dense>
              {Object.entries(vocabulary.actions).map(([command, phrases]) => (
                <ListItem key={command} disableGutters>
                  <ListItemText
                    primary={command.replace(/_/g, " ")}
                    secondary={phrases.slice(0, 3).join(", ")}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelpDialog(false)}>
            {t("common.close", "Close")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default VoiceCommandButton;
