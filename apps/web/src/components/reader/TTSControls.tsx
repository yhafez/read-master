/**
 * TTS Controls Component
 *
 * Provides text-to-speech playback controls with:
 * - Play/Pause/Stop buttons
 * - Voice selection (Web Speech API for free tier)
 * - Speed control slider
 * - Volume control
 * - Text highlighting during speech
 * - Settings persistence
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  Collapse,
  Typography,
  Stack,
  Alert,
  Button,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import SpeedIcon from "@mui/icons-material/Speed";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTranslation } from "react-i18next";
import type {
  TTSControlsProps,
  TTSSettings,
  TTSVoice,
  TTSPlaybackState,
  TTSPosition,
  TTSError,
} from "./ttsTypes";
import {
  DEFAULT_TTS_SETTINGS,
  RATE_RANGE,
  VOLUME_RANGE,
  RATE_PRESETS,
  isWebSpeechSupported,
  getAllWebSpeechVoices,
  findWebSpeechVoiceById,
  findVoiceByLanguage,
  getVoicesForTier,
  getDefaultVoiceForTier,
  findVoiceById,
  groupVoicesByProvider,
  loadTTSSettings,
  saveTTSSettings,
  formatRate,
  formatVolume,
  createTTSError,
  getTTSErrorMessage,
  isRecoverableError,
  prepareTextForTTS,
  createPositionFromBoundary,
  getProviderDisplayName,
  canUseVoice,
} from "./ttsTypes";

/**
 * TTSControls - Text-to-Speech playback controls
 */
export function TTSControls({
  text,
  tier = "free",
  onPlaybackChange,
  onPositionChange,
  onError,
  className,
  compact = false,
  disabled = false,
}: TTSControlsProps) {
  const { t } = useTranslation();

  // State
  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>("idle");
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [error, setError] = useState<TTSError | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load settings and voices on mount
  useEffect(() => {
    const loadedSettings = loadTTSSettings();
    setSettings(loadedSettings);

    if (!isWebSpeechSupported()) {
      const err = createTTSError("not_supported");
      setError(err);
      onError?.(err);
      return;
    }

    synthRef.current = window.speechSynthesis;

    // Load voices (may be async on some browsers)
    const loadVoices = () => {
      const webVoices = getAllWebSpeechVoices();
      const availableVoices = getVoicesForTier(tier, webVoices);
      setVoices(availableVoices);
      setVoicesLoaded(true);

      // Set default voice if none selected
      if (!loadedSettings.selectedVoiceId && webVoices.length > 0) {
        const defaultVoice = getDefaultVoiceForTier(
          tier,
          webVoices,
          loadedSettings.preferredLanguage
        );
        if (defaultVoice) {
          const newSettings = {
            ...loadedSettings,
            selectedVoiceId: defaultVoice.id,
          };
          setSettings(newSettings);
          saveTTSSettings(newSettings);
        }
      }
    };

    // Voices may be loaded async
    if (synthRef.current.getVoices().length > 0) {
      loadVoices();
    } else {
      synthRef.current.addEventListener("voiceschanged", loadVoices);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.removeEventListener("voiceschanged", loadVoices);
        synthRef.current.cancel();
      }
    };
  }, [tier, onError]);

  // Update available voices when tier changes
  useEffect(() => {
    if (voicesLoaded) {
      const webVoices = getAllWebSpeechVoices();
      const availableVoices = getVoicesForTier(tier, webVoices);
      setVoices(availableVoices);
    }
  }, [tier, voicesLoaded]);

  // Update playback state callback
  const updatePlaybackState = useCallback(
    (state: TTSPlaybackState) => {
      setPlaybackState(state);
      onPlaybackChange?.(state);
    },
    [onPlaybackChange]
  );

  // Update position callback
  const updatePosition = useCallback(
    (position: TTSPosition | null) => {
      onPositionChange?.(position);
    },
    [onPositionChange]
  );

  // Play speech
  const play = useCallback(() => {
    if (!synthRef.current || disabled) return;

    // Cancel any existing speech
    synthRef.current.cancel();

    // Check if we have a valid voice
    const selectedVoice = settings.selectedVoiceId
      ? findVoiceById(settings.selectedVoiceId, voices)
      : null;

    // For non-web-speech voices, we'd need API calls (not implemented for free tier)
    if (selectedVoice && !selectedVoice.id.startsWith("web-")) {
      if (!canUseVoice(selectedVoice.id, tier)) {
        const err = createTTSError("unauthorized", "Upgrade to use this voice");
        setError(err);
        onError?.(err);
        return;
      }
      // API-based TTS would be implemented here for pro/scholar tiers
      // For now, fall back to web speech
    }

    const preparedText = prepareTextForTTS(text);
    if (!preparedText) return;

    updatePlaybackState("loading");
    setError(null);

    const utterance = new SpeechSynthesisUtterance(preparedText);

    // Find the actual SpeechSynthesisVoice
    if (settings.selectedVoiceId) {
      const webVoice = findWebSpeechVoiceById(settings.selectedVoiceId);
      if (webVoice) {
        utterance.voice = webVoice;
      } else {
        // Try to find by language preference
        const webVoices = synthRef.current.getVoices();
        const langVoice = findVoiceByLanguage(
          webVoices,
          settings.preferredLanguage
        );
        if (langVoice) utterance.voice = langVoice;
      }
    }

    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    // Event handlers
    utterance.onstart = () => {
      updatePlaybackState("playing");
    };

    utterance.onend = () => {
      updatePlaybackState("idle");
      updatePosition(null);
    };

    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        // These are expected when stop/pause is called
        return;
      }
      const err = createTTSError("synthesis_error", event.error);
      setError(err);
      onError?.(err);
      updatePlaybackState("idle");
    };

    utterance.onboundary = (event) => {
      if (settings.highlightText) {
        updatePosition(createPositionFromBoundary(event));
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [
    text,
    settings,
    voices,
    tier,
    disabled,
    updatePlaybackState,
    updatePosition,
    onError,
  ]);

  // Pause speech
  const pause = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.pause();
    updatePlaybackState("paused");
  }, [updatePlaybackState]);

  // Resume speech
  const resume = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.resume();
    updatePlaybackState("playing");
  }, [updatePlaybackState]);

  // Stop speech
  const stop = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    updatePlaybackState("idle");
    updatePosition(null);
  }, [updatePlaybackState, updatePosition]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    switch (playbackState) {
      case "idle":
        play();
        break;
      case "playing":
        pause();
        break;
      case "paused":
        resume();
        break;
      case "loading":
        // Do nothing while loading
        break;
    }
  }, [playbackState, play, pause, resume]);

  // Update settings
  const updateSetting = useCallback(
    <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
      setSettings((prev) => {
        const newSettings = { ...prev, [key]: value };
        saveTTSSettings(newSettings);
        return newSettings;
      });
    },
    []
  );

  // Handle voice change
  const handleVoiceChange = useCallback(
    (voiceId: string) => {
      // Check if user can use this voice
      if (!canUseVoice(voiceId, tier)) {
        const err = createTTSError(
          "unauthorized",
          "Upgrade your plan to use premium voices"
        );
        setError(err);
        onError?.(err);
        return;
      }
      updateSetting("selectedVoiceId", voiceId);
      setError(null);
    },
    [tier, updateSetting, onError]
  );

  // Handle rate change
  const handleRateChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const rate = Array.isArray(value) ? (value[0] ?? 1) : value;
      updateSetting("rate", rate);

      // Update current utterance if playing
      if (utteranceRef.current && playbackState === "playing") {
        // Note: Can't change rate mid-speech with Web Speech API
        // Would need to restart
      }
    },
    [updateSetting, playbackState]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const volume = Array.isArray(value) ? (value[0] ?? 1) : value;
      updateSetting("volume", volume);
    },
    [updateSetting]
  );

  // Get volume icon based on level
  const getVolumeIcon = () => {
    if (settings.volume === 0) return <VolumeOffIcon />;
    if (settings.volume < 0.5) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  // Group voices for select menu
  const groupedVoices = groupVoicesByProvider(voices);

  // Render non-recoverable error alert
  if (error && !isRecoverableError(error)) {
    return (
      <Alert severity="error" sx={{ m: 1 }}>
        <Typography variant="body2" gutterBottom>
          {getTTSErrorMessage(error)}
        </Typography>
        {error.type === "not_supported" && (
          <Typography variant="caption" color="text.secondary">
            {t("reader.tts.notSupportedHelp")}
          </Typography>
        )}
        {error.type === "no_voices" && (
          <Typography variant="caption" color="text.secondary">
            {t("reader.tts.noVoicesHelp")}
          </Typography>
        )}
        {error.type === "unauthorized" && (
          <Typography variant="caption" color="text.secondary">
            {t("reader.tts.unauthorizedHelp")}
          </Typography>
        )}
      </Alert>
    );
  }

  return (
    <Box className={className} sx={{ p: compact ? 1 : 2 }}>
      {/* Main controls row */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="center"
      >
        {/* Play/Pause button */}
        <Tooltip
          title={
            playbackState === "playing"
              ? t("reader.tts.pause")
              : t("reader.tts.play")
          }
        >
          <span>
            <IconButton
              onClick={togglePlayPause}
              disabled={
                disabled || !voicesLoaded || playbackState === "loading"
              }
              color="primary"
              size={compact ? "small" : "medium"}
            >
              {playbackState === "loading" ? (
                <CircularProgress size={24} />
              ) : playbackState === "playing" ? (
                <PauseIcon />
              ) : (
                <PlayArrowIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* Stop button */}
        <Tooltip title={t("reader.tts.stop")}>
          <span>
            <IconButton
              onClick={stop}
              disabled={disabled || playbackState === "idle"}
              size={compact ? "small" : "medium"}
            >
              <StopIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Speed indicator */}
        {!compact && (
          <Tooltip title={t("reader.tts.speed")}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                minWidth: 60,
              }}
            >
              <SpeedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {formatRate(settings.rate)}
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Volume indicator */}
        {!compact && (
          <Tooltip title={t("reader.tts.volume")}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                minWidth: 60,
              }}
            >
              {getVolumeIcon()}
              <Typography variant="body2" color="text.secondary">
                {formatVolume(settings.volume)}
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Settings toggle */}
        <Tooltip title={t("reader.tts.settings")}>
          <IconButton
            onClick={() => setShowSettings(!showSettings)}
            size={compact ? "small" : "medium"}
            color={showSettings ? "primary" : "default"}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Error message */}
      {error && isRecoverableError(error) && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={() => {
              setError(null);
              togglePlayPause();
            }}>
              {t("common.retry")}
            </Button>
          }
        >
          {getTTSErrorMessage(error)}
        </Alert>
      )}

      {/* Expandable settings panel */}
      <Collapse in={showSettings}>
        <Box sx={{ mt: 2 }}>
          {/* Voice selector */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t("reader.tts.voice")}</InputLabel>
            <Select
              value={settings.selectedVoiceId ?? ""}
              onChange={(e) => handleVoiceChange(e.target.value)}
              label={t("reader.tts.voice")}
              disabled={disabled || !voicesLoaded}
            >
              {/* Web Speech voices */}
              {groupedVoices.web_speech.length > 0 && (
                <MenuItem disabled sx={{ fontWeight: "bold", opacity: 1 }}>
                  {getProviderDisplayName("web_speech")}
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
                  <MenuItem disabled sx={{ fontWeight: "bold", opacity: 1 }}>
                    {getProviderDisplayName("openai")}
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
                <MenuItem disabled sx={{ fontWeight: "bold", opacity: 1 }}>
                  {getProviderDisplayName("elevenlabs")}
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

          {/* Speed slider */}
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom variant="body2">
              {t("reader.tts.speed")}: {formatRate(settings.rate)}
            </Typography>
            <Slider
              value={settings.rate}
              onChange={handleRateChange}
              min={RATE_RANGE.min}
              max={RATE_RANGE.max}
              step={RATE_RANGE.step}
              marks={RATE_PRESETS.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
              disabled={disabled}
              size="small"
            />
          </Box>

          {/* Volume slider */}
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom variant="body2">
              {t("reader.tts.volume")}: {formatVolume(settings.volume)}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <VolumeDownIcon fontSize="small" color="action" />
              <Slider
                value={settings.volume}
                onChange={handleVolumeChange}
                min={VOLUME_RANGE.min}
                max={VOLUME_RANGE.max}
                step={VOLUME_RANGE.step}
                disabled={disabled}
                size="small"
              />
              <VolumeUpIcon fontSize="small" color="action" />
            </Stack>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default TTSControls;
