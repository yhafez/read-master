/**
 * Advanced Reading Panel
 *
 * Control panel for advanced reading features:
 * - RSVP (Rapid Serial Visual Presentation) speed reading
 * - Focus mode overlay
 * - Bionic reading text transformation
 */

import { useCallback, useState, memo } from "react";
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  Collapse,
  Paper,
} from "@mui/material";
import {
  Speed as SpeedIcon,
  CenterFocusStrong as FocusIcon,
  TextFormat as BionicIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  type AdvancedReadingMode,
  type RSVPConfig,
  type FocusModeConfig,
  type BionicReadingConfig,
  WPM_RANGE,
  DEFAULT_RSVP_CONFIG,
  DEFAULT_FOCUS_CONFIG,
  DEFAULT_BIONIC_CONFIG,
  formatWPM,
} from "./advancedReadingTypes";

export interface AdvancedReadingPanelProps {
  /** Current active mode */
  mode: AdvancedReadingMode;
  /** Callback when mode changes */
  onModeChange: (mode: AdvancedReadingMode) => void;
  /** RSVP configuration */
  rsvpConfig: RSVPConfig;
  /** Callback when RSVP config changes */
  onRSVPConfigChange: (config: Partial<RSVPConfig>) => void;
  /** Focus mode configuration */
  focusConfig: FocusModeConfig;
  /** Callback when focus config changes */
  onFocusConfigChange: (config: Partial<FocusModeConfig>) => void;
  /** Bionic reading configuration */
  bionicConfig: BionicReadingConfig;
  /** Callback when bionic config changes */
  onBionicConfigChange: (config: Partial<BionicReadingConfig>) => void;
  /** Whether the panel is expanded */
  expanded?: boolean;
  /** Callback when panel expand state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * WPM Slider marks for visual guidance
 */
const WPM_MARKS = [
  { value: 100, label: "100" },
  { value: 300, label: "300" },
  { value: 500, label: "500" },
  { value: 750, label: "750" },
  { value: 1000, label: "1K" },
];

/**
 * AdvancedReadingPanel component for controlling reading modes
 */
export const AdvancedReadingPanel = memo(function AdvancedReadingPanel({
  mode,
  onModeChange,
  rsvpConfig,
  onRSVPConfigChange,
  focusConfig,
  onFocusConfigChange,
  bionicConfig,
  onBionicConfigChange,
  expanded = false,
  onExpandedChange,
}: AdvancedReadingPanelProps) {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  const handleModeChange = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newMode: AdvancedReadingMode | null
    ) => {
      if (newMode !== null) {
        onModeChange(newMode);
      }
    },
    [onModeChange]
  );

  const handleWPMChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const wpm = Array.isArray(value)
        ? (value[0] ?? WPM_RANGE.default)
        : value;
      onRSVPConfigChange({ wpm });
    },
    [onRSVPConfigChange]
  );

  const handleOverlayOpacityChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const opacity = Array.isArray(value) ? (value[0] ?? 0.7) : value;
      onFocusConfigChange({ overlayOpacity: opacity });
    },
    [onFocusConfigChange]
  );

  const handleVisibleLinesChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const lines = Array.isArray(value) ? (value[0] ?? 1) : value;
      onFocusConfigChange({ visibleLines: lines });
    },
    [onFocusConfigChange]
  );

  const handleBoldPercentageChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const percentage = Array.isArray(value) ? (value[0] ?? 0.4) : value;
      onBionicConfigChange({ boldPercentage: percentage });
    },
    [onBionicConfigChange]
  );

  const handleExpandClick = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  const handleSettingsClick = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderBottom: expanded ? 1 : 0,
          borderColor: "divider",
          cursor: "pointer",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
        onClick={handleExpandClick}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SpeedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">
            {t("reader.advancedReading.title")}
          </Typography>
          {mode !== "normal" && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                px: 1,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              {t(`reader.advancedReading.modes.${mode}`)}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          aria-label={expanded ? t("common.collapse") : t("common.expand")}
        >
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>

      {/* Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Mode Toggle */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t("reader.advancedReading.selectMode")}
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              aria-label={t("reader.advancedReading.title")}
              size="small"
              fullWidth
            >
              <ToggleButton
                value="normal"
                aria-label={t("reader.advancedReading.modes.normal")}
              >
                <Typography variant="caption">
                  {t("reader.advancedReading.modes.normal")}
                </Typography>
              </ToggleButton>
              <Tooltip title={t("reader.advancedReading.rsvpDescription")}>
                <ToggleButton
                  value="rsvp"
                  aria-label={t("reader.advancedReading.modes.rsvp")}
                >
                  <SpeedIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">
                    {t("reader.advancedReading.modes.rsvp")}
                  </Typography>
                </ToggleButton>
              </Tooltip>
              <Tooltip title={t("reader.advancedReading.focusDescription")}>
                <ToggleButton
                  value="focus"
                  aria-label={t("reader.advancedReading.modes.focus")}
                >
                  <FocusIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">
                    {t("reader.advancedReading.modes.focus")}
                  </Typography>
                </ToggleButton>
              </Tooltip>
              <Tooltip title={t("reader.advancedReading.bionicDescription")}>
                <ToggleButton
                  value="bionic"
                  aria-label={t("reader.advancedReading.modes.bionic")}
                >
                  <BionicIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">
                    {t("reader.advancedReading.modes.bionic")}
                  </Typography>
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Box>

          {/* Mode-specific settings */}
          {mode === "rsvp" && (
            <Box>
              <Typography variant="body2" gutterBottom>
                {t("reader.advancedReading.wpmLabel")}:{" "}
                {formatWPM(rsvpConfig.wpm)}
              </Typography>
              <Slider
                value={rsvpConfig.wpm}
                onChange={handleWPMChange}
                min={WPM_RANGE.min}
                max={WPM_RANGE.max}
                step={WPM_RANGE.step}
                marks={WPM_MARKS}
                valueLabelDisplay="auto"
                valueLabelFormat={formatWPM}
                aria-label={t("reader.advancedReading.wpmLabel")}
                sx={{ mt: 1 }}
              />

              {/* Advanced RSVP settings */}
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={handleSettingsClick}
                >
                  <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {t("reader.advancedReading.advancedSettings")}
                  </Typography>
                  {showSettings ? (
                    <CollapseIcon fontSize="small" sx={{ ml: "auto" }} />
                  ) : (
                    <ExpandIcon fontSize="small" sx={{ ml: "auto" }} />
                  )}
                </Box>
                <Collapse in={showSettings}>
                  <Box sx={{ mt: 2, pl: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={rsvpConfig.pauseOnPunctuation}
                          onChange={(e) =>
                            onRSVPConfigChange({
                              pauseOnPunctuation: e.target.checked,
                            })
                          }
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {t("reader.advancedReading.pauseOnPunctuation")}
                        </Typography>
                      }
                    />

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        {t("reader.advancedReading.wordsPerFlash")}:{" "}
                        {rsvpConfig.wordsPerFlash}
                      </Typography>
                      <Slider
                        value={rsvpConfig.wordsPerFlash}
                        onChange={(_e, value) => {
                          const v = Array.isArray(value)
                            ? (value[0] ?? 1)
                            : value;
                          onRSVPConfigChange({ wordsPerFlash: v });
                        }}
                        min={1}
                        max={3}
                        step={1}
                        marks={[
                          { value: 1, label: "1" },
                          { value: 2, label: "2" },
                          { value: 3, label: "3" },
                        ]}
                        aria-label={t("reader.advancedReading.wordsPerFlash")}
                      />
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            </Box>
          )}

          {mode === "focus" && (
            <Box>
              <Typography variant="body2" gutterBottom>
                {t("reader.advancedReading.overlayOpacity")}:{" "}
                {Math.round(focusConfig.overlayOpacity * 100)}%
              </Typography>
              <Slider
                value={focusConfig.overlayOpacity}
                onChange={handleOverlayOpacityChange}
                min={0.3}
                max={0.9}
                step={0.1}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                aria-label={t("reader.advancedReading.overlayOpacity")}
                sx={{ mt: 1 }}
              />

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" gutterBottom>
                  {t("reader.advancedReading.visibleLines")}:{" "}
                  {focusConfig.visibleLines}
                </Typography>
                <Slider
                  value={focusConfig.visibleLines}
                  onChange={handleVisibleLinesChange}
                  min={1}
                  max={5}
                  step={1}
                  marks={[
                    { value: 1, label: "1" },
                    { value: 3, label: "3" },
                    { value: 5, label: "5" },
                  ]}
                  aria-label={t("reader.advancedReading.visibleLines")}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={focusConfig.autoFollow}
                    onChange={(e) =>
                      onFocusConfigChange({ autoFollow: e.target.checked })
                    }
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {t("reader.advancedReading.autoFollow")}
                  </Typography>
                }
                sx={{ mt: 2 }}
              />
            </Box>
          )}

          {mode === "bionic" && (
            <Box>
              <Typography variant="body2" gutterBottom>
                {t("reader.advancedReading.boldPercentage")}:{" "}
                {Math.round(bionicConfig.boldPercentage * 100)}%
              </Typography>
              <Slider
                value={bionicConfig.boldPercentage}
                onChange={handleBoldPercentageChange}
                min={0.2}
                max={0.6}
                step={0.05}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                aria-label={t("reader.advancedReading.boldPercentage")}
                sx={{ mt: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={bionicConfig.boldShortWords}
                    onChange={(e) =>
                      onBionicConfigChange({ boldShortWords: e.target.checked })
                    }
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {t("reader.advancedReading.boldShortWords")}
                  </Typography>
                }
                sx={{ mt: 2 }}
              />

              {/* Preview */}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: "background.default",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  {t("reader.advancedReading.preview")}:
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <BionicPreview
                    text={t("reader.advancedReading.previewText")}
                    boldPercentage={bionicConfig.boldPercentage}
                    boldShortWords={bionicConfig.boldShortWords}
                  />
                </Typography>
              </Box>
            </Box>
          )}

          {mode === "normal" && (
            <Typography variant="body2" color="text.secondary">
              {t("reader.advancedReading.normalDescription")}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});

/**
 * Bionic text preview component
 */
interface BionicPreviewProps {
  text: string;
  boldPercentage: number;
  boldShortWords: boolean;
}

const BionicPreview = memo(function BionicPreview({
  text,
  boldPercentage,
  boldShortWords,
}: BionicPreviewProps) {
  const words = text.split(/\s+/);
  const minBoldChars = DEFAULT_BIONIC_CONFIG.minBoldChars;

  return (
    <>
      {words.map((word, index) => {
        // Skip very short words unless configured to bold them
        if (word.length <= 2 && !boldShortWords) {
          return (
            <span key={index}>
              {word}
              {index < words.length - 1 ? " " : ""}
            </span>
          );
        }

        // Calculate how many characters to bold
        const boldChars = Math.max(
          minBoldChars,
          Math.ceil(word.length * boldPercentage)
        );
        const actualBoldChars = Math.min(boldChars, word.length);
        const boldPart = word.slice(0, actualBoldChars);
        const normalPart = word.slice(actualBoldChars);

        return (
          <span key={index}>
            <strong>{boldPart}</strong>
            {normalPart}
            {index < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
});

/**
 * Export default configurations for external use
 */
export { DEFAULT_RSVP_CONFIG, DEFAULT_FOCUS_CONFIG, DEFAULT_BIONIC_CONFIG };

export default AdvancedReadingPanel;
