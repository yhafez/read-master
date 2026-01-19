/**
 * TTS Settings page
 *
 * Allows users to configure Text-to-Speech preferences including:
 * - Voice selection based on subscription tier
 * - Speech rate, pitch, and volume
 * - Highlighting and auto-play options
 * - Highlight color customization
 * - Quota information for premium tiers
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-react";

import {
  useTTSSettingsStore,
  RATE_RANGE,
  PITCH_RANGE,
  VOLUME_RANGE,
  HIGHLIGHT_COLOR_PRESETS,
} from "@/stores";
import {
  getAllWebSpeechVoices,
  getVoicesForTier,
  groupVoicesByProvider,
  getProviderDisplayName,
  formatRate,
  formatVolume,
} from "@/components/reader/ttsTypes";

/**
 * Get user tier from Clerk metadata
 */
function getUserTier(
  user: ReturnType<typeof useUser>["user"]
): "free" | "pro" | "scholar" {
  const publicMetadata = user?.publicMetadata as
    | { tier?: "free" | "pro" | "scholar" }
    | undefined;
  return publicMetadata?.tier ?? "free";
}

/**
 * TTS Settings page component
 */
export function SettingsTTSPage(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useUser();
  const tier = getUserTier(user);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Store state and actions
  const settings = useTTSSettingsStore((state) => state.settings);
  const setEnabled = useTTSSettingsStore((state) => state.setEnabled);
  const setSelectedVoiceId = useTTSSettingsStore(
    (state) => state.setSelectedVoiceId
  );
  const setRate = useTTSSettingsStore((state) => state.setRate);
  const setPitch = useTTSSettingsStore((state) => state.setPitch);
  const setVolume = useTTSSettingsStore((state) => state.setVolume);
  const setHighlightText = useTTSSettingsStore(
    (state) => state.setHighlightText
  );
  const setHighlightColor = useTTSSettingsStore(
    (state) => state.setHighlightColor
  );
  const setAutoScroll = useTTSSettingsStore((state) => state.setAutoScroll);
  const setAutoPlay = useTTSSettingsStore((state) => state.setAutoPlay);
  const resetSettings = useTTSSettingsStore((state) => state.resetSettings);

  // Get available voices based on tier
  const webSpeechVoices = useMemo(() => getAllWebSpeechVoices(), []);
  const availableVoices = useMemo(
    () => getVoicesForTier(tier, webSpeechVoices),
    [tier, webSpeechVoices]
  );
  const groupedVoices = useMemo(
    () => groupVoicesByProvider(availableVoices),
    [availableVoices]
  );

  // Handlers
  const handleEnabledToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEnabled(event.target.checked);
      setSnackbarOpen(true);
    },
    [setEnabled]
  );

  const handleVoiceChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setSelectedVoiceId(event.target.value || null);
      setSnackbarOpen(true);
    },
    [setSelectedVoiceId]
  );

  const handleRateChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setRate(Array.isArray(value) ? (value[0] ?? 1.0) : value);
      setSnackbarOpen(true);
    },
    [setRate]
  );

  const handlePitchChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setPitch(Array.isArray(value) ? (value[0] ?? 1.0) : value);
      setSnackbarOpen(true);
    },
    [setPitch]
  );

  const handleVolumeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setVolume(Array.isArray(value) ? (value[0] ?? 1.0) : value);
      setSnackbarOpen(true);
    },
    [setVolume]
  );

  const handleHighlightTextToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setHighlightText(event.target.checked);
      setSnackbarOpen(true);
    },
    [setHighlightText]
  );

  const handleHighlightColorChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newColor: string | null) => {
      if (newColor) {
        setHighlightColor(newColor);
        setSnackbarOpen(true);
      }
    },
    [setHighlightColor]
  );

  const handleAutoScrollToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAutoScroll(event.target.checked);
      setSnackbarOpen(true);
    },
    [setAutoScroll]
  );

  const handleAutoPlayToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAutoPlay(event.target.checked);
      setSnackbarOpen(true);
    },
    [setAutoPlay]
  );

  const handleResetClick = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    resetSettings();
    setResetDialogOpen(false);
    setSnackbarOpen(true);
  }, [resetSettings]);

  const handleResetCancel = useCallback(() => {
    setResetDialogOpen(false);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // Determine if voice is web_speech for pitch control visibility
  const isWebSpeechVoice = settings.selectedVoiceId?.startsWith("web-") ?? true;

  // Tier information
  const tierFeatures = useMemo(() => {
    switch (tier) {
      case "scholar":
        return {
          label: "Scholar",
          color: "success" as const,
          features: [
            "All OpenAI premium voices",
            "ElevenLabs premium voices",
            "Unlimited TTS usage",
            "Full book audio downloads",
          ],
        };
      case "pro":
        return {
          label: "Pro",
          color: "primary" as const,
          features: [
            "OpenAI premium voices (6 options)",
            "Browser voices",
            "5 full book downloads per month",
          ],
        };
      case "free":
      default:
        return {
          label: "Free",
          color: "default" as const,
          features: ["Browser voices only", "Basic TTS features"],
        };
    }
  }, [tier]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t("settings.tts.title", "Text-to-Speech Settings")}
        </Typography>
        <Chip
          label={tierFeatures.label}
          color={tierFeatures.color}
          size="small"
        />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t(
          "settings.tts.description",
          "Configure your Text-to-Speech preferences. Voice selection and features depend on your subscription tier."
        )}
      </Typography>

      <Stack spacing={3}>
        {/* Enable/Disable TTS */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h6">
                  {t("settings.tts.enabled.title", "Enable Text-to-Speech")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "settings.tts.enabled.description",
                    "Turn TTS on or off globally across all books"
                  )}
                </Typography>
              </Box>
              <Switch
                checked={settings.enabled}
                onChange={handleEnabledToggle}
                inputProps={{ "aria-label": "Enable TTS" }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Tier Features */}
        {tier === "free" && (
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              {t(
                "settings.tts.upgradePrompt",
                "Upgrade to Pro or Scholar for premium voices and unlimited TTS usage."
              )}
            </Typography>
            <Typography variant="caption" component="div">
              <strong>Pro:</strong> {tierFeatures.features.join(", ")}
            </Typography>
          </Alert>
        )}

        {/* Voice Selection */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.tts.voice.title", "Voice Selection")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "settings.tts.voice.description",
                "Choose your preferred voice for Text-to-Speech."
              )}
            </Typography>

            <FormControl fullWidth disabled={!settings.enabled}>
              <InputLabel id="tts-voice-label">
                {t("settings.tts.voice.label", "Voice")}
              </InputLabel>
              <Select
                labelId="tts-voice-label"
                id="tts-voice"
                value={settings.selectedVoiceId ?? ""}
                label={t("settings.tts.voice.label", "Voice")}
                onChange={handleVoiceChange}
              >
                {/* Web Speech voices */}
                {groupedVoices.web_speech.length > 0 && (
                  <MenuItem disabled sx={{ fontWeight: "bold", opacity: 1 }}>
                    {getProviderDisplayName("web_speech")}{" "}
                    {t("common.free", "(Free)")}
                  </MenuItem>
                )}
                {groupedVoices.web_speech.map((voice) => (
                  <MenuItem key={voice.id} value={voice.id}>
                    {voice.name} ({voice.lang})
                  </MenuItem>
                ))}

                {/* OpenAI voices (Pro tier) */}
                {(tier === "pro" || tier === "scholar") &&
                  groupedVoices.openai.length > 0 && (
                    <MenuItem
                      disabled
                      sx={{ fontWeight: "bold", opacity: 1, mt: 1 }}
                    >
                      {getProviderDisplayName("openai")}{" "}
                      {t("common.premium", "(Premium)")}
                    </MenuItem>
                  )}
                {(tier === "pro" || tier === "scholar") &&
                  groupedVoices.openai.map((voice) => (
                    <MenuItem key={voice.id} value={voice.id}>
                      {voice.name}
                      {voice.description && ` - ${voice.description}`}
                    </MenuItem>
                  ))}

                {/* ElevenLabs voices (Scholar tier) */}
                {tier === "scholar" && groupedVoices.elevenlabs.length > 0 && (
                  <MenuItem
                    disabled
                    sx={{ fontWeight: "bold", opacity: 1, mt: 1 }}
                  >
                    {getProviderDisplayName("elevenlabs")}{" "}
                    {t("common.premium", "(Premium)")}
                  </MenuItem>
                )}
                {tier === "scholar" &&
                  groupedVoices.elevenlabs.map((voice) => (
                    <MenuItem key={voice.id} value={voice.id}>
                      {voice.name}
                      {voice.description && ` - ${voice.description}`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Tier features info */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {t("settings.tts.voice.tierInfo", "Your tier features:")}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                sx={{ mt: 0.5 }}
              >
                {tierFeatures.features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Playback Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.tts.playback.title", "Playback Settings")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t(
                "settings.tts.playback.description",
                "Adjust speech rate, pitch, and volume to your preference."
              )}
            </Typography>

            <Stack spacing={3}>
              {/* Speech Rate */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.tts.playback.rate", "Speech Rate")}:{" "}
                  {formatRate(settings.rate)}
                </Typography>
                <Slider
                  value={settings.rate}
                  onChange={handleRateChange}
                  min={RATE_RANGE.min}
                  max={RATE_RANGE.max}
                  step={RATE_RANGE.step}
                  marks={[
                    { value: 0.5, label: "0.5x" },
                    { value: 1.0, label: "1x" },
                    { value: 1.5, label: "1.5x" },
                    { value: 2.0, label: "2x" },
                  ]}
                  valueLabelDisplay="auto"
                  disabled={!settings.enabled}
                  aria-label={t("settings.tts.playback.rate", "Speech Rate")}
                />
              </Box>

              {/* Pitch (only for web_speech) */}
              {isWebSpeechVoice && (
                <Box>
                  <Typography gutterBottom>
                    {t("settings.tts.playback.pitch", "Pitch")}:{" "}
                    {settings.pitch.toFixed(1)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {t(
                      "settings.tts.playback.pitchNote",
                      "Pitch control is only available for browser voices"
                    )}
                  </Typography>
                  <Slider
                    value={settings.pitch}
                    onChange={handlePitchChange}
                    min={PITCH_RANGE.min}
                    max={PITCH_RANGE.max}
                    step={PITCH_RANGE.step}
                    marks={[
                      { value: 0.5, label: "Low" },
                      { value: 1.0, label: "Normal" },
                      { value: 2.0, label: "High" },
                    ]}
                    valueLabelDisplay="auto"
                    disabled={!settings.enabled}
                    aria-label={t("settings.tts.playback.pitch", "Pitch")}
                  />
                </Box>
              )}

              {/* Volume */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.tts.playback.volume", "Volume")}:{" "}
                  {formatVolume(settings.volume)}
                </Typography>
                <Slider
                  value={settings.volume}
                  onChange={handleVolumeChange}
                  min={VOLUME_RANGE.min}
                  max={VOLUME_RANGE.max}
                  step={VOLUME_RANGE.step}
                  marks={[
                    { value: 0, label: "0%" },
                    { value: 0.5, label: "50%" },
                    { value: 1.0, label: "100%" },
                  ]}
                  valueLabelDisplay="auto"
                  disabled={!settings.enabled}
                  aria-label={t("settings.tts.playback.volume", "Volume")}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Highlighting Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.tts.highlighting.title", "Text Highlighting")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t(
                "settings.tts.highlighting.description",
                "Customize how text is highlighted during speech playback."
              )}
            </Typography>

            <Stack spacing={2}>
              {/* Highlight Text Toggle */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {t(
                      "settings.tts.highlighting.enabled",
                      "Enable Highlighting"
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.tts.highlighting.enabledDesc",
                      "Highlight words as they are being spoken"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={settings.highlightText}
                  onChange={handleHighlightTextToggle}
                  disabled={!settings.enabled}
                  inputProps={{ "aria-label": "Enable highlighting" }}
                />
              </Box>

              {/* Highlight Color Picker */}
              {settings.highlightText && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    {t("settings.tts.highlighting.color", "Highlight Color")}
                  </Typography>
                  <ToggleButtonGroup
                    value={settings.highlightColor}
                    exclusive
                    onChange={handleHighlightColorChange}
                    aria-label="highlight color"
                    disabled={!settings.enabled}
                  >
                    {HIGHLIGHT_COLOR_PRESETS.map((preset) => (
                      <ToggleButton
                        key={preset.value}
                        value={preset.value}
                        aria-label={preset.name}
                        sx={{
                          backgroundColor: preset.value,
                          border: "1px solid",
                          borderColor: "divider",
                          "&.Mui-selected": {
                            backgroundColor: preset.value,
                            borderColor: "primary.main",
                            borderWidth: 2,
                          },
                          "&:hover": {
                            backgroundColor: preset.value,
                            opacity: 0.8,
                          },
                          width: 40,
                          height: 40,
                        }}
                      />
                    ))}
                  </ToggleButtonGroup>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {HIGHLIGHT_COLOR_PRESETS.find(
                      (p) => p.value === settings.highlightColor
                    )?.name ?? "Custom"}
                  </Typography>
                </Box>
              )}

              {/* Auto Scroll Toggle */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {t("settings.tts.highlighting.autoScroll", "Auto-scroll")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.tts.highlighting.autoScrollDesc",
                      "Automatically scroll to keep highlighted text visible"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={settings.autoScroll}
                  onChange={handleAutoScrollToggle}
                  disabled={!settings.enabled || !settings.highlightText}
                  inputProps={{ "aria-label": "Auto-scroll" }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Auto-Play Settings */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box sx={{ pr: 2 }}>
                <Typography variant="h6">
                  {t("settings.tts.autoPlay.title", "Auto-play TTS")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "settings.tts.autoPlay.description",
                    "Automatically start Text-to-Speech when opening a book"
                  )}
                </Typography>
              </Box>
              <Switch
                checked={settings.autoPlay}
                onChange={handleAutoPlayToggle}
                disabled={!settings.enabled}
                inputProps={{ "aria-label": "Auto-play TTS" }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Quota Information (for Pro/Scholar tiers) */}
        {(tier === "pro" || tier === "scholar") && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("settings.tts.quota.title", "Usage Quota")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(
                  "settings.tts.quota.description",
                  "Track your Text-to-Speech usage and download limits."
                )}
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {t("settings.tts.quota.downloads", "Full Book Downloads")}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {tier === "scholar"
                        ? t("settings.tts.quota.unlimited", "Unlimited")
                        : "0 / 5 this month"}
                    </Typography>
                  </Box>
                  {tier === "pro" && (
                    <Box
                      sx={{
                        width: "100%",
                        bgcolor: "action.hover",
                        borderRadius: 1,
                        height: 8,
                      }}
                    >
                      <Box
                        sx={{
                          width: "0%",
                          bgcolor: "primary.main",
                          borderRadius: 1,
                          height: "100%",
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {tier === "scholar" && (
                  <Alert severity="success">
                    {t(
                      "settings.tts.quota.scholarMessage",
                      "As a Scholar member, you have unlimited TTS usage and full book downloads."
                    )}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Reset Settings */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body1">
                {t("settings.tts.resetSettings", "Reset to Defaults")}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleResetClick}
              >
                {t("settings.tts.resetSettings", "Reset to Defaults")}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* Reset Confirmation Dialog */}
      {resetDialogOpen && (
        <Alert
          severity="warning"
          sx={{ mt: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={handleResetCancel}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button color="warning" size="small" onClick={handleResetConfirm}>
                {t("common.confirm", "Confirm")}
              </Button>
            </Stack>
          }
        >
          {t(
            "settings.tts.resetConfirm",
            "Are you sure you want to reset all TTS settings to defaults?"
          )}
        </Alert>
      )}

      {/* Saved Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={t("settings.tts.saved", "TTS settings saved")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default SettingsTTSPage;
