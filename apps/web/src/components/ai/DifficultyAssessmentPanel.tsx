import { useState } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  AutoAwesome as AIIcon,
  TrendingUp as DifficultyIcon,
  CheckCircle as MatchIcon,
  Schedule as TimeIcon,
  Lightbulb as StrategyIcon,
} from "@mui/icons-material";
import { useAssessDifficulty, type ReadingLevel } from "@/hooks";
import type { AssessDifficultyOutput } from "@read-master/ai";

/**
 * Difficulty Assessment Panel Props
 */
type DifficultyAssessmentPanelProps = {
  bookId: string;
  bookTitle: string;
  sampleText: string;
  userReadingLevel?: ReadingLevel;
};

/**
 * Get match color based on score
 */
function getMatchColor(score: number): "success" | "warning" | "error" {
  if (score >= 8) return "success";
  if (score >= 5) return "warning";
  return "error";
}

/**
 * Get difficulty level label
 */
function getDifficultyLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: "Beginner",
    elementary: "Elementary",
    middle_school: "Middle School",
    high_school: "High School",
    college: "College",
    advanced: "Advanced",
  };
  return labels[level] || level;
}

/**
 * Difficulty Assessment Panel Component
 *
 * Uses AI to analyze reading difficulty and provide personalized
 * difficulty metrics, reader matching, and reading strategies.
 */
export function DifficultyAssessmentPanel({
  bookId,
  bookTitle,
  sampleText,
  userReadingLevel,
}: DifficultyAssessmentPanelProps) {
  const [selectedLevel, setSelectedLevel] = useState<ReadingLevel | undefined>(
    userReadingLevel
  );
  const [assessment, setAssessment] = useState<AssessDifficultyOutput | null>(
    null
  );

  const { mutate: assessDifficulty, isPending, error } = useAssessDifficulty();

  const handleAssess = () => {
    if (!sampleText || sampleText.length < 500) {
      return;
    }

    assessDifficulty(
      {
        bookId,
        sampleText,
        ...(selectedLevel && { userReadingLevel: selectedLevel }),
      },
      {
        onSuccess: (response) => {
          setAssessment(response);
        },
      }
    );
  };

  const isSampleTooShort = sampleText.length < 500;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Difficulty Assessment
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          AI-powered analysis of reading difficulty for {bookTitle}
        </Typography>
      </Box>

      {/* Sample Text Info */}
      <Alert
        severity={isSampleTooShort ? "warning" : "info"}
        icon={<DifficultyIcon />}
        sx={{ mb: 3 }}
      >
        {isSampleTooShort
          ? `Sample text is too short (${sampleText.length} characters). Need at least 500 characters for accurate analysis.`
          : `Analyzing ${sampleText.length} characters of sample text.`}
      </Alert>

      {/* Controls */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Your Reading Level</InputLabel>
          <Select
            value={selectedLevel || ""}
            onChange={(e) => setSelectedLevel(e.target.value as ReadingLevel)}
            label="Your Reading Level"
          >
            <MenuItem value="">Not specified</MenuItem>
            <MenuItem value="beginner">Beginner</MenuItem>
            <MenuItem value="elementary">Elementary</MenuItem>
            <MenuItem value="middle_school">Middle School</MenuItem>
            <MenuItem value="high_school">High School</MenuItem>
            <MenuItem value="college">College</MenuItem>
            <MenuItem value="advanced">Advanced</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} /> : <AIIcon />}
          onClick={handleAssess}
          disabled={isPending || isSampleTooShort}
          fullWidth
        >
          {isPending ? "Analyzing..." : "Analyze Difficulty"}
        </Button>
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || "Failed to assess difficulty. Please try again."}
        </Alert>
      )}

      {/* Assessment Results */}
      {assessment && (
        <Box>
          <Divider sx={{ mb: 3 }} />

          {/* Overall Difficulty */}
          <Card sx={{ mb: 3, bgcolor: "primary.light" }}>
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <DifficultyIcon />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Suggested Reading Level
                </Typography>
              </Box>
              <Chip
                label={getDifficultyLabel(assessment.suggestedLevel)}
                color="primary"
                size="medium"
                sx={{ mb: 2, fontSize: "1rem", px: 2, py: 2.5 }}
              />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Overall Difficulty: {assessment.metrics.overallDifficulty}/10
              </Typography>
            </CardContent>
          </Card>

          {/* Difficulty Metrics */}
          <Card sx={{ mb: 3 }} variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Detailed Metrics
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Vocabulary Level
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assessment.metrics.vocabularyLevel}/10
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={assessment.metrics.vocabularyLevel * 10}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Sentence Complexity
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assessment.metrics.sentenceComplexity}/10
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={assessment.metrics.sentenceComplexity * 10}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Concept Density
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assessment.metrics.conceptDensity}/10
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={assessment.metrics.conceptDensity * 10}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Prior Knowledge Required
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assessment.metrics.priorKnowledgeRequired}/10
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={assessment.metrics.priorKnowledgeRequired * 10}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Reader Match */}
          {assessment.readerMatch && (
            <Card sx={{ mb: 3 }} variant="outlined">
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <MatchIcon
                    color={getMatchColor(assessment.readerMatch.matchScore)}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Reader Match
                  </Typography>
                  <Chip
                    label={`${assessment.readerMatch.matchScore}/10`}
                    color={getMatchColor(assessment.readerMatch.matchScore)}
                    size="small"
                  />
                </Box>
                <Chip
                  label={assessment.readerMatch.recommendation}
                  color={
                    assessment.readerMatch.isAppropriate ? "success" : "warning"
                  }
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2">
                  {assessment.readerMatch.explanation}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Estimated Reading Times */}
          <Card sx={{ mb: 3 }} variant="outlined">
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <TimeIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Estimated Reading Time (min/page)
                </Typography>
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Fast (300+ WPM):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {assessment.estimatedReadingTime.fast} min/page
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">
                    Average (200-300 WPM):
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {assessment.estimatedReadingTime.average} min/page
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">
                    Careful (150-200 WPM):
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {assessment.estimatedReadingTime.careful} min/page
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Support Strategies */}
          {assessment.recommendations.supportStrategies.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <StrategyIcon color="secondary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Support Strategies
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  {assessment.recommendations.supportStrategies.map(
                    (strategy: string, index: number) => (
                      <Card
                        key={index}
                        variant="outlined"
                        sx={{ bgcolor: "secondary.light" }}
                      >
                        <CardContent
                          sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}
                        >
                          <Typography variant="body2">{strategy}</Typography>
                        </CardContent>
                      </Card>
                    )
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Paper>
  );
}
