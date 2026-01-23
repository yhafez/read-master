/**
 * VoiceCommandSettings Component
 *
 * Settings panel for voice command configuration.
 * Allows users to enable/disable voice commands, adjust settings,
 * and view available commands.
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Slider,
  Divider,
  Button,
  Alert,
  AlertTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import LanguageIcon from "@mui/icons-material/Language";
import TuneIcon from "@mui/icons-material/Tune";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useTranslation } from "react-i18next";
import {
  isVoiceCommandsSupported,
  getVoiceCommandVocabulary,
} from "@/hooks/useVoiceCommands";

/**
 * Voice command settings interface
 */
export interface VoiceCommandSettingsData {
  enabled: boolean;
  language: string;
  confidenceThreshold: number;
  visualFeedback: boolean;
  audioFeedback: boolean;
  continuous: boolean;
  wakeWord: string | null;
}

/**
 * Default voice command settings
 */
export const DEFAULT_VOICE_SETTINGS: VoiceCommandSettingsData = {
  enabled: false,
  language: "en-US",
  confidenceThreshold: 0.5,
  visualFeedback: true,
  audioFeedback: true,
  continuous: false,
  wakeWord: null,
};

/**
 * Props for VoiceCommandSettings
 */
export interface VoiceCommandSettingsProps {
  /** Current settings */
  settings: VoiceCommandSettingsData;
  /** Called when settings change */
  onChange: (settings: VoiceCommandSettingsData) => void;
}

/**
 * Supported languages for voice commands
 */
const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "ar-SA", name: "Arabic" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "tl-PH", name: "Tagalog (Philippines)" },
];

/**
 * VoiceCommandSettings Component
 */
export function VoiceCommandSettings({
  settings,
  onChange,
}: VoiceCommandSettingsProps) {
  const { t } = useTranslation();
  const [showCommands, setShowCommands] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null
  );

  const isSupported = isVoiceCommandsSupported();

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof VoiceCommandSettingsData>(
      key: K,
      value: VoiceCommandSettingsData[K]
    ) => {
      onChange({ ...settings, [key]: value });
    },
    [settings, onChange]
  );

  // Test microphone access
  const testMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setTestResult("success");
      setTimeout(() => setTestResult(null), 3000);
    } catch {
      setTestResult("error");
      setTimeout(() => setTestResult(null), 5000);
    }
  }, []);

  // Get vocabulary for current language
  const vocabulary = getVoiceCommandVocabulary(settings.language);

  // If not supported, show warning
  if (!isSupported) {
    return (
      <Card>
        <CardHeader
          avatar={<MicIcon />}
          title={t("voiceCommands.settingsTitle", "Voice Commands")}
        />
        <CardContent>
          <Alert severity="warning">
            <AlertTitle>
              {t("voiceCommands.notSupported", "Not Supported")}
            </AlertTitle>
            {t(
              "voiceCommands.notSupportedMessage",
              "Voice commands are not supported in this browser. Please use a modern browser like Chrome, Edge, or Safari."
            )}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<MicIcon />}
        title={t("voiceCommands.settingsTitle", "Voice Commands")}
        subheader={t(
          "voiceCommands.settingsDescription",
          "Control the app with your voice"
        )}
        action={
          <FormControlLabel
            control={
              <Switch
                checked={settings.enabled}
                onChange={(e) => updateSetting("enabled", e.target.checked)}
                color="primary"
              />
            }
            label={
              settings.enabled
                ? t("common.enabled", "Enabled")
                : t("common.disabled", "Disabled")
            }
          />
        }
      />
      <CardContent>
        <Collapse in={settings.enabled}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Test Microphone */}
            <Box>
              <Button
                variant="outlined"
                startIcon={<PlayArrowIcon />}
                onClick={testMicrophone}
              >
                {t("voiceCommands.testMicrophone", "Test Microphone")}
              </Button>
              {testResult === "success" && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {t(
                    "voiceCommands.microphoneWorking",
                    "Microphone is working correctly!"
                  )}
                </Alert>
              )}
              {testResult === "error" && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {t(
                    "voiceCommands.microphoneError",
                    "Unable to access microphone. Please check your permissions."
                  )}
                </Alert>
              )}
            </Box>

            <Divider />

            {/* Language Selection */}
            <Box>
              <FormControl fullWidth>
                <InputLabel id="voice-language-label">
                  {t("voiceCommands.language", "Language")}
                </InputLabel>
                <Select
                  labelId="voice-language-label"
                  value={settings.language}
                  label={t("voiceCommands.language", "Language")}
                  onChange={(e) => updateSetting("language", e.target.value)}
                  startAdornment={
                    <LanguageIcon sx={{ mr: 1, color: "action.active" }} />
                  }
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {t(
                  "voiceCommands.languageHint",
                  "Choose the language you will speak commands in"
                )}
              </Typography>
            </Box>

            {/* Confidence Threshold */}
            <Box>
              <Typography gutterBottom>
                <TuneIcon
                  sx={{ fontSize: 18, verticalAlign: "middle", mr: 1 }}
                />
                {t(
                  "voiceCommands.confidenceThreshold",
                  "Recognition Sensitivity"
                )}
              </Typography>
              <Slider
                value={settings.confidenceThreshold}
                onChange={(_, value) =>
                  updateSetting("confidenceThreshold", value as number)
                }
                min={0.3}
                max={0.9}
                step={0.1}
                marks={[
                  {
                    value: 0.3,
                    label: t("voiceCommands.sensitive", "Sensitive"),
                  },
                  {
                    value: 0.6,
                    label: t("voiceCommands.balanced", "Balanced"),
                  },
                  { value: 0.9, label: t("voiceCommands.strict", "Strict") },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              />
              <Typography variant="caption" color="text.secondary">
                {t(
                  "voiceCommands.confidenceHint",
                  "Higher values require clearer speech but may miss some commands"
                )}
              </Typography>
            </Box>

            <Divider />

            {/* Feedback Options */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("voiceCommands.feedback", "Feedback")}
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.visualFeedback}
                    onChange={(e) =>
                      updateSetting("visualFeedback", e.target.checked)
                    }
                    size="small"
                  />
                }
                label={t("voiceCommands.visualFeedback", "Visual feedback")}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.audioFeedback}
                    onChange={(e) =>
                      updateSetting("audioFeedback", e.target.checked)
                    }
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <VolumeUpIcon fontSize="small" />
                    {t("voiceCommands.audioFeedback", "Audio feedback")}
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.continuous}
                    onChange={(e) =>
                      updateSetting("continuous", e.target.checked)
                    }
                    size="small"
                  />
                }
                label={t(
                  "voiceCommands.continuousListening",
                  "Continuous listening"
                )}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ ml: 4 }}
              >
                {t(
                  "voiceCommands.continuousHint",
                  "Keep listening after each command (may use more battery)"
                )}
              </Typography>
            </Box>

            <Divider />

            {/* Available Commands */}
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => setShowCommands(!showCommands)}
              >
                <Typography variant="subtitle2">
                  {t("voiceCommands.availableCommands", "Available Commands")}
                </Typography>
                <IconButton size="small">
                  {showCommands ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={showCommands}>
                <Box sx={{ mt: 2 }}>
                  {/* Navigation Commands */}
                  <Typography
                    variant="body2"
                    color="primary"
                    fontWeight="medium"
                  >
                    {t("voiceCommands.navigation", "Navigation")}
                  </Typography>
                  <List dense>
                    {Object.entries(vocabulary.navigation).map(
                      ([cmd, phrases]) => (
                        <ListItem key={cmd} disableGutters sx={{ py: 0 }}>
                          <ListItemText
                            primary={cmd.replace(/_/g, " ")}
                            secondary={`"${phrases[0]}"`}
                            primaryTypographyProps={{ variant: "body2" }}
                            secondaryTypographyProps={{ variant: "caption" }}
                          />
                        </ListItem>
                      )
                    )}
                  </List>

                  {/* Reading Commands */}
                  <Typography
                    variant="body2"
                    color="primary"
                    fontWeight="medium"
                    sx={{ mt: 2 }}
                  >
                    {t("voiceCommands.reading", "Reading")}
                  </Typography>
                  <List dense>
                    {Object.entries(vocabulary.reading).map(
                      ([cmd, phrases]) => (
                        <ListItem key={cmd} disableGutters sx={{ py: 0 }}>
                          <ListItemText
                            primary={cmd.replace(/_/g, " ")}
                            secondary={`"${phrases[0]}"`}
                            primaryTypographyProps={{ variant: "body2" }}
                            secondaryTypographyProps={{ variant: "caption" }}
                          />
                        </ListItem>
                      )
                    )}
                  </List>

                  {/* Action Commands */}
                  <Typography
                    variant="body2"
                    color="primary"
                    fontWeight="medium"
                    sx={{ mt: 2 }}
                  >
                    {t("voiceCommands.actions", "Actions")}
                  </Typography>
                  <List dense>
                    {Object.entries(vocabulary.actions).map(
                      ([cmd, phrases]) => (
                        <ListItem key={cmd} disableGutters sx={{ py: 0 }}>
                          <ListItemText
                            primary={cmd.replace(/_/g, " ")}
                            secondary={`"${phrases[0]}"`}
                            primaryTypographyProps={{ variant: "body2" }}
                            secondaryTypographyProps={{ variant: "caption" }}
                          />
                        </ListItem>
                      )
                    )}
                  </List>
                </Box>
              </Collapse>
            </Box>
          </Box>
        </Collapse>

        {!settings.enabled && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t(
              "voiceCommands.enableHint",
              "Enable voice commands to control the app hands-free"
            )}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default VoiceCommandSettings;
