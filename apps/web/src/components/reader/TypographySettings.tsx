/**
 * Typography Settings Component
 *
 * Provides controls for font family, size, line height, letter spacing,
 * word spacing, paragraph spacing, and text alignment in the reader.
 */

import { useCallback } from "react";
import {
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import {
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignJustify as AlignJustifyIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useReaderStore } from "../../stores/readerStore";
import type {
  FontFamily,
  TypographySettings as TypographySettingsType,
} from "../../stores/readerStore";
import {
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  LETTER_SPACING_RANGE,
  WORD_SPACING_RANGE,
  PARAGRAPH_SPACING_RANGE,
  DEFAULT_TYPOGRAPHY_SETTINGS,
} from "../../stores/readerStore";

export interface TypographySettingsProps {
  /** Whether to show the reset button */
  showReset?: boolean;
  /** Callback when settings change */
  onChange?: (settings: Partial<TypographySettingsType>) => void;
}

/**
 * Format slider value for display
 */
function formatSliderValue(value: number, suffix: string = ""): string {
  return `${value}${suffix}`;
}

/**
 * Typography Settings Panel
 */
export function TypographySettings({
  showReset = true,
  onChange,
}: TypographySettingsProps): React.ReactElement {
  const { t } = useTranslation();
  const typography = useReaderStore((state) => state.settings.typography);
  const updateTypography = useReaderStore((state) => state.updateTypography);
  const resetTypography = useReaderStore((state) => state.resetTypography);

  const handleChange = useCallback(
    (updates: Partial<TypographySettingsType>) => {
      updateTypography(updates);
      onChange?.(updates);
    },
    [updateTypography, onChange]
  );

  const handleReset = useCallback(() => {
    resetTypography();
    onChange?.(DEFAULT_TYPOGRAPHY_SETTINGS);
  }, [resetTypography, onChange]);

  const handleFontFamilyChange = useCallback(
    (event: { target: { value: string } }) => {
      handleChange({ fontFamily: event.target.value as FontFamily });
    },
    [handleChange]
  );

  const handleFontSizeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      handleChange({ fontSize: value as number });
    },
    [handleChange]
  );

  const handleLineHeightChange = useCallback(
    (_event: Event, value: number | number[]) => {
      handleChange({ lineHeight: value as number });
    },
    [handleChange]
  );

  const handleLetterSpacingChange = useCallback(
    (_event: Event, value: number | number[]) => {
      handleChange({ letterSpacing: value as number });
    },
    [handleChange]
  );

  const handleWordSpacingChange = useCallback(
    (_event: Event, value: number | number[]) => {
      handleChange({ wordSpacing: value as number });
    },
    [handleChange]
  );

  const handleParagraphSpacingChange = useCallback(
    (_event: Event, value: number | number[]) => {
      handleChange({ paragraphSpacing: value as number });
    },
    [handleChange]
  );

  const handleTextAlignChange = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newAlignment: "left" | "justify" | "center" | null
    ) => {
      if (newAlignment !== null) {
        handleChange({ textAlign: newAlignment });
      }
    },
    [handleChange]
  );

  return (
    <Box sx={{ p: 2 }} data-testid="typography-settings">
      <Stack spacing={3}>
        {/* Header with Reset Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" component="h2">
            {t("settings.appearance.title", "Typography")}
          </Typography>
          {showReset && (
            <Button
              size="small"
              startIcon={<ResetIcon />}
              onClick={handleReset}
              aria-label={t("common.reset", "Reset to defaults")}
            >
              {t("common.reset", "Reset")}
            </Button>
          )}
        </Box>

        <Divider />

        {/* Font Family */}
        <FormControl fullWidth size="small">
          <InputLabel id="font-family-label">
            {t("settings.appearance.fontFamily", "Font Family")}
          </InputLabel>
          <Select
            labelId="font-family-label"
            id="font-family-select"
            value={typography.fontFamily}
            label={t("settings.appearance.fontFamily", "Font Family")}
            onChange={handleFontFamilyChange}
            data-testid="font-family-select"
          >
            {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((fontKey) => (
              <MenuItem
                key={fontKey}
                value={fontKey}
                sx={{ fontFamily: FONT_FAMILIES[fontKey].css }}
              >
                {FONT_FAMILIES[fontKey].name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Font Size */}
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("settings.appearance.fontSize", "Font Size")}:{" "}
            <strong>{formatSliderValue(typography.fontSize, "px")}</strong>
          </Typography>
          <Slider
            value={typography.fontSize}
            onChange={handleFontSizeChange}
            min={FONT_SIZE_RANGE.min}
            max={FONT_SIZE_RANGE.max}
            step={FONT_SIZE_RANGE.step}
            marks={[
              { value: FONT_SIZE_RANGE.min, label: `${FONT_SIZE_RANGE.min}px` },
              { value: 18, label: "18px" },
              { value: FONT_SIZE_RANGE.max, label: `${FONT_SIZE_RANGE.max}px` },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatSliderValue(value, "px")}
            aria-label={t("settings.appearance.fontSize", "Font Size")}
            data-testid="font-size-slider"
          />
        </Box>

        {/* Line Height */}
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("settings.appearance.lineHeight", "Line Height")}:{" "}
            <strong>{typography.lineHeight.toFixed(1)}</strong>
          </Typography>
          <Slider
            value={typography.lineHeight}
            onChange={handleLineHeightChange}
            min={LINE_HEIGHT_RANGE.min}
            max={LINE_HEIGHT_RANGE.max}
            step={LINE_HEIGHT_RANGE.step}
            marks={[
              { value: LINE_HEIGHT_RANGE.min, label: "1.0" },
              { value: 1.6, label: "1.6" },
              { value: LINE_HEIGHT_RANGE.max, label: "3.0" },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => value.toFixed(1)}
            aria-label={t("settings.appearance.lineHeight", "Line Height")}
            data-testid="line-height-slider"
          />
        </Box>

        {/* Letter Spacing */}
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("settings.appearance.letterSpacing", "Letter Spacing")}:{" "}
            <strong>{typography.letterSpacing.toFixed(2)}em</strong>
          </Typography>
          <Slider
            value={typography.letterSpacing}
            onChange={handleLetterSpacingChange}
            min={LETTER_SPACING_RANGE.min}
            max={LETTER_SPACING_RANGE.max}
            step={LETTER_SPACING_RANGE.step}
            marks={[
              { value: LETTER_SPACING_RANGE.min, label: "-0.05" },
              { value: 0, label: "0" },
              { value: LETTER_SPACING_RANGE.max, label: "0.2" },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value.toFixed(2)}em`}
            aria-label={t(
              "settings.appearance.letterSpacing",
              "Letter Spacing"
            )}
            data-testid="letter-spacing-slider"
          />
        </Box>

        {/* Word Spacing */}
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("settings.appearance.wordSpacing", "Word Spacing")}:{" "}
            <strong>{typography.wordSpacing.toFixed(2)}em</strong>
          </Typography>
          <Slider
            value={typography.wordSpacing}
            onChange={handleWordSpacingChange}
            min={WORD_SPACING_RANGE.min}
            max={WORD_SPACING_RANGE.max}
            step={WORD_SPACING_RANGE.step}
            marks={[
              { value: WORD_SPACING_RANGE.min, label: "0" },
              { value: WORD_SPACING_RANGE.max, label: "0.5" },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value.toFixed(2)}em`}
            aria-label={t("settings.appearance.wordSpacing", "Word Spacing")}
            data-testid="word-spacing-slider"
          />
        </Box>

        {/* Paragraph Spacing */}
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("settings.appearance.paragraphSpacing", "Paragraph Spacing")}:{" "}
            <strong>{typography.paragraphSpacing.toFixed(1)}x</strong>
          </Typography>
          <Slider
            value={typography.paragraphSpacing}
            onChange={handleParagraphSpacingChange}
            min={PARAGRAPH_SPACING_RANGE.min}
            max={PARAGRAPH_SPACING_RANGE.max}
            step={PARAGRAPH_SPACING_RANGE.step}
            marks={[
              { value: PARAGRAPH_SPACING_RANGE.min, label: "0.5x" },
              { value: 1.5, label: "1.5x" },
              { value: PARAGRAPH_SPACING_RANGE.max, label: "3.0x" },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value.toFixed(1)}x`}
            aria-label={t(
              "settings.appearance.paragraphSpacing",
              "Paragraph Spacing"
            )}
            data-testid="paragraph-spacing-slider"
          />
        </Box>

        {/* Text Alignment */}
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("settings.appearance.textAlign", "Text Alignment")}
          </Typography>
          <ToggleButtonGroup
            value={typography.textAlign}
            exclusive
            onChange={handleTextAlignChange}
            aria-label={t("settings.appearance.textAlign", "Text Alignment")}
            size="small"
            fullWidth
            data-testid="text-align-buttons"
          >
            <ToggleButton
              value="left"
              aria-label={t("settings.appearance.alignLeft", "Align Left")}
            >
              <AlignLeftIcon />
            </ToggleButton>
            <ToggleButton
              value="center"
              aria-label={t("settings.appearance.alignCenter", "Align Center")}
            >
              <AlignCenterIcon />
            </ToggleButton>
            <ToggleButton
              value="justify"
              aria-label={t("settings.appearance.alignJustify", "Justify")}
            >
              <AlignJustifyIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Preview */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("settings.appearance.preview", "Preview")}
          </Typography>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "background.paper",
              fontFamily: FONT_FAMILIES[typography.fontFamily].css,
              fontSize: `${typography.fontSize}px`,
              lineHeight: typography.lineHeight,
              letterSpacing: `${typography.letterSpacing}em`,
              wordSpacing: `${typography.wordSpacing}em`,
              textAlign: typography.textAlign,
              "& p": {
                marginBottom: `${typography.paragraphSpacing}em`,
                "&:last-child": {
                  marginBottom: 0,
                },
              },
            }}
            data-testid="typography-preview"
          >
            <p>
              {t(
                "settings.appearance.previewText1",
                "The quick brown fox jumps over the lazy dog."
              )}
            </p>
            <p>
              {t(
                "settings.appearance.previewText2",
                "Reading comprehension improves with proper typography settings."
              )}
            </p>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

export default TypographySettings;
