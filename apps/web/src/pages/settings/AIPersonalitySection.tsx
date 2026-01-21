/**
 * AI Personality Section Component
 *
 * Allows users to customize how the AI assistant interacts with them:
 * - Personality type (Encouraging Tutor, Neutral Assistant, Socratic Guide)
 * - Custom tone
 * - Verbosity level (Concise to Comprehensive)
 * - Language complexity (Simplify, Match, Challenge)
 * - Proactive suggestions toggle
 */

import {
  Box,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  Typography,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useState, useCallback } from "react";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SchoolIcon from "@mui/icons-material/School";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ChatIcon from "@mui/icons-material/Chat";

import { useAISettingsStore } from "@/stores";
import type {
  AIPersonality,
  VerbosityLevel,
  LanguageComplexity,
} from "@/stores";

const PERSONALITY_ICONS: Record<AIPersonality, React.ReactElement> = {
  encouraging_tutor: <SchoolIcon />,
  neutral_assistant: <ChatIcon />,
  socratic_guide: <PsychologyIcon />,
};

const PERSONALITY_DESCRIPTIONS: Record<AIPersonality, string> = {
  encouraging_tutor:
    "Supportive and motivating, celebrates your progress and provides positive reinforcement",
  neutral_assistant:
    "Professional and factual, focuses on delivering clear information without emotional tone",
  socratic_guide:
    "Thought-provoking and questioning, helps you discover answers through guided inquiry",
};

const VERBOSITY_LABELS: Record<VerbosityLevel, string> = {
  concise: "Concise",
  balanced: "Balanced",
  detailed: "Detailed",
  comprehensive: "Comprehensive",
};


export function AIPersonalitySection(): React.ReactElement {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");

  // Store state and actions
  const {
    personality,
    setPersonality,
    setCustomTone,
    setVerbosity,
    setLanguageComplexity,
    setProactiveSuggestions,
  } = useAISettingsStore();

  // Handlers
  const handlePersonalityChange = useCallback(
    (event: SelectChangeEvent<AIPersonality>) => {
      setPersonality(event.target.value as AIPersonality);
    },
    [setPersonality]
  );

  const handleCustomToneChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.trim() || undefined;
      setCustomTone(value);
    },
    [setCustomTone]
  );

  const handleVerbosityChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const verbosityMap: VerbosityLevel[] = [
        "concise",
        "balanced",
        "detailed",
        "comprehensive",
      ];
      const newVerbosity = verbosityMap[value as number];
      if (newVerbosity) {
        setVerbosity(newVerbosity);
      }
    },
    [setVerbosity]
  );

  const handleLanguageComplexityChange = useCallback(
    (event: SelectChangeEvent<LanguageComplexity>) => {
      setLanguageComplexity(event.target.value as LanguageComplexity);
    },
    [setLanguageComplexity]
  );

  const handleProactiveSuggestionsToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setProactiveSuggestions(event.target.checked);
    },
    [setProactiveSuggestions]
  );

  const handlePreview = useCallback(() => {
    // Generate a preview response based on current settings
    const previews: Record<AIPersonality, string> = {
      encouraging_tutor: `Great question! I'm here to help you understand this better. ${personality.customTone ? `[${personality.customTone}] ` : ""}Let's break this down step by step...`,
      neutral_assistant: `Here's the information you requested. ${personality.customTone ? `[${personality.customTone}] ` : ""}The concept can be explained as follows...`,
      socratic_guide: `That's an interesting observation. ${personality.customTone ? `[${personality.customTone}] ` : ""}What do you think might be the underlying reason for this?`,
    };

    const verbosityExamples = {
      concise: " (Brief answer)",
      balanced: " (Balanced explanation with key points)",
      detailed: " (Detailed explanation with examples and context)",
      comprehensive:
        " (Comprehensive analysis with multiple perspectives, examples, and implications)",
    };

    const complexityExamples = {
      simplify: " [Using simple, everyday language]",
      match_level: " [Matching your current reading level]",
      challenge_me:
        " [Using advanced vocabulary and complex sentence structures]",
    };

    const preview =
      previews[personality.personality] +
      verbosityExamples[personality.verbosity] +
      complexityExamples[personality.languageComplexity];

    setPreviewText(preview);
    setPreviewOpen(true);
  }, [personality]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // Map verbosity level to slider value
  const verbosityToSlider: Record<VerbosityLevel, number> = {
    concise: 0,
    balanced: 1,
    detailed: 2,
    comprehensive: 3,
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI Personality
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customize how the AI assistant communicates with you
            </Typography>
          </Box>

          <Stack spacing={3}>
            {/* Personality Type Selector */}
            <FormControl fullWidth>
              <InputLabel id="personality-select-label">
                Personality Type
              </InputLabel>
              <Select
                labelId="personality-select-label"
                id="personality-select"
                value={personality.personality}
                label="Personality Type"
                onChange={handlePersonalityChange}
              >
                <MenuItem value="encouraging_tutor">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {PERSONALITY_ICONS.encouraging_tutor}
                    <Box>
                      <Typography variant="body1">Encouraging Tutor</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {PERSONALITY_DESCRIPTIONS.encouraging_tutor}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
                <MenuItem value="neutral_assistant">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {PERSONALITY_ICONS.neutral_assistant}
                    <Box>
                      <Typography variant="body1">Neutral Assistant</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {PERSONALITY_DESCRIPTIONS.neutral_assistant}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
                <MenuItem value="socratic_guide">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {PERSONALITY_ICONS.socratic_guide}
                    <Box>
                      <Typography variant="body1">Socratic Guide</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {PERSONALITY_DESCRIPTIONS.socratic_guide}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>
                Choose how the AI approaches explanations and guidance
              </FormHelperText>
            </FormControl>

            {/* Custom Tone */}
            <TextField
              fullWidth
              label="Custom Tone (Optional)"
              placeholder="e.g., 'Be more formal' or 'Use more humor'"
              value={personality.customTone || ""}
              onChange={handleCustomToneChange}
              helperText="Add specific instructions to further customize the AI's tone"
              multiline
              rows={2}
            />

            {/* Verbosity Level Slider */}
            <Box>
              <Typography gutterBottom>Response Length</Typography>
              <Slider
                value={verbosityToSlider[personality.verbosity]}
                onChange={handleVerbosityChange}
                step={1}
                marks
                min={0}
                max={3}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) =>
                  VERBOSITY_LABELS[
                    ["concise", "balanced", "detailed", "comprehensive"][
                      value
                    ] as VerbosityLevel
                  ]
                }
                sx={{ mt: 2, mb: 1 }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Concise
                </Typography>
                <Chip
                  label={VERBOSITY_LABELS[personality.verbosity]}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  Comprehensive
                </Typography>
              </Box>
              <FormHelperText>
                Controls how detailed the AI's responses are
              </FormHelperText>
            </Box>

            {/* Language Complexity */}
            <FormControl fullWidth>
              <InputLabel id="complexity-select-label">
                Language Complexity
              </InputLabel>
              <Select
                labelId="complexity-select-label"
                id="complexity-select"
                value={personality.languageComplexity}
                label="Language Complexity"
                onChange={handleLanguageComplexityChange}
              >
                <MenuItem value="simplify">
                  <Box>
                    <Typography variant="body1">Simplify for me</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use simple, everyday language
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="match_level">
                  <Box>
                    <Typography variant="body1">Match my level</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adapt to your current reading level
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="challenge_me">
                  <Box>
                    <Typography variant="body1">Challenge me</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use advanced vocabulary and concepts
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>
                Adjust the complexity of vocabulary and sentence structure
              </FormHelperText>
            </FormControl>

            {/* Proactive Suggestions Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={personality.proactiveSuggestions}
                  onChange={handleProactiveSuggestionsToggle}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Proactive Suggestions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    AI will offer helpful tips and recommendations without being
                    asked
                  </Typography>
                </Box>
              }
            />

            {/* Preview Button */}
            <Button
              variant="outlined"
              startIcon={<AutoFixHighIcon />}
              onClick={handlePreview}
              fullWidth
              sx={{ mt: 2 }}
            >
              Preview AI Personality
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>AI Response Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Here's an example of how the AI would respond with your current
            settings:
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="body1">{previewText}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            Note: This is a simplified preview. Actual AI responses will be more
            contextual and detailed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
