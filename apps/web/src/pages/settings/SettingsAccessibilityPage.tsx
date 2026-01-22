/**
 * Accessibility Settings Page
 *
 * Allows users to configure accessibility preferences:
 * - Dyslexia-friendly fonts
 * - High contrast mode
 * - Reduced motion
 * - Focus indicators
 * - Font scaling
 * - Line/letter/word spacing
 */

import {
  Box,
  Typography,
  Switch,
  Slider,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Alert,
} from "@mui/material";
import {
  RestartAlt as ResetIcon,
  Accessibility as AccessibilityIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useAccessibility } from "@/contexts/AccessibilityContext";

/**
 * Accessibility Settings Page Component
 */
export function SettingsAccessibilityPage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
    resetSettings,
    toggleDyslexiaFont,
    toggleHighContrast,
    toggleReducedMotion,
    toggleEnhancedFocus,
    increaseFontSize,
    decreaseFontSize,
  } = useAccessibility();

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <AccessibilityIcon fontSize="large" color="primary" />
        <Box>
          <Typography variant="h4" gutterBottom>
            {t("accessibility.settings.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("accessibility.settings.description")}
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        These settings are saved locally and will persist across sessions.
      </Alert>

      {/* Visual Modes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Visual Modes
          </Typography>

          {/* Dyslexia Font */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.dyslexiaFont}
                onChange={toggleDyslexiaFont}
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {t("accessibility.settings.dyslexiaFont")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("accessibility.settings.dyslexiaFontDesc")}
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />

          {/* High Contrast */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.highContrast}
                onChange={toggleHighContrast}
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {t("accessibility.settings.highContrast")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("accessibility.settings.highContrastDesc")}
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />

          {/* Reduced Motion */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.reducedMotion}
                onChange={toggleReducedMotion}
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {t("accessibility.settings.reducedMotion")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("accessibility.settings.reducedMotionDesc")}
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />

          {/* Enhanced Focus */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.enhancedFocus}
                onChange={toggleEnhancedFocus}
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {t("accessibility.settings.enhancedFocus")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("accessibility.settings.enhancedFocusDesc")}
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* Typography Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Typography
          </Typography>

          {/* Font Scale */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              {t("accessibility.settings.fontScale")}:{" "}
              {Math.round(settings.fontScale * 100)}%
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("accessibility.settings.fontScaleDesc")}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
              <Button size="small" onClick={decreaseFontSize}>
                A-
              </Button>
              <Slider
                value={settings.fontScale}
                onChange={(_, value) =>
                  updateSettings({ fontScale: value as number })
                }
                min={0.8}
                max={2.0}
                step={0.1}
                marks={[
                  { value: 0.8, label: "80%" },
                  { value: 1.0, label: "100%" },
                  { value: 1.5, label: "150%" },
                  { value: 2.0, label: "200%" },
                ]}
                sx={{ flex: 1 }}
              />
              <Button size="small" onClick={increaseFontSize}>
                A+
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Line Spacing */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              {t("accessibility.settings.lineSpacing")}:{" "}
              {settings.lineSpacing.toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("accessibility.settings.lineSpacingDesc")}
            </Typography>
            <Slider
              value={settings.lineSpacing}
              onChange={(_, value) =>
                updateSettings({ lineSpacing: value as number })
              }
              min={1.0}
              max={3.0}
              step={0.1}
              marks={[
                { value: 1.0, label: "1.0" },
                { value: 1.5, label: "1.5" },
                { value: 2.0, label: "2.0" },
                { value: 2.5, label: "2.5" },
                { value: 3.0, label: "3.0" },
              ]}
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Letter Spacing */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              {t("accessibility.settings.letterSpacing")}:{" "}
              {settings.letterSpacing.toFixed(2)}em
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("accessibility.settings.letterSpacingDesc")}
            </Typography>
            <Slider
              value={settings.letterSpacing}
              onChange={(_, value) =>
                updateSettings({ letterSpacing: value as number })
              }
              min={0}
              max={0.5}
              step={0.01}
              marks={[
                { value: 0, label: "0" },
                { value: 0.1, label: "0.1" },
                { value: 0.2, label: "0.2" },
                { value: 0.3, label: "0.3" },
                { value: 0.5, label: "0.5" },
              ]}
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Word Spacing */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              {t("accessibility.settings.wordSpacing")}:{" "}
              {settings.wordSpacing.toFixed(2)}em
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("accessibility.settings.wordSpacingDesc")}
            </Typography>
            <Slider
              value={settings.wordSpacing}
              onChange={(_, value) =>
                updateSettings({ wordSpacing: value as number })
              }
              min={0}
              max={1.0}
              step={0.01}
              marks={[
                { value: 0, label: "0" },
                { value: 0.2, label: "0.2" },
                { value: 0.4, label: "0.4" },
                { value: 0.6, label: "0.6" },
                { value: 1.0, label: "1.0" },
              ]}
              sx={{ mt: 1 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={resetSettings}
        >
          {t("accessibility.settings.reset")}
        </Button>
      </Box>

      {/* Preview Box */}
      <Card sx={{ mt: 3, bgcolor: "background.default" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Preview
          </Typography>
          <Typography variant="body1" paragraph>
            This is a preview of how text will appear with your current
            settings. The quick brown fox jumps over the lazy dog.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can adjust font size, spacing, and other visual settings to make
            reading more comfortable for your needs.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SettingsAccessibilityPage;
