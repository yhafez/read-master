import { useState } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import type { DiscussionQuestion } from "@read-master/ai";
import { useDiscussionQuestions, type Section, type Progress } from "@/hooks";

/**
 * Discussion Questions Panel Props
 */
type DiscussionQuestionsPanelProps = {
  bookId: string;
  bookTitle: string;
  currentSection?: Section;
  currentProgress?: Progress;
};

/**
 * Get difficulty color
 */
function getDifficultyColor(
  difficulty: number
): "success" | "warning" | "error" {
  if (difficulty <= 2) return "success";
  if (difficulty <= 4) return "warning";
  return "error";
}

/**
 * Get question type label
 */
function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    comprehension: "Comprehension",
    analysis: "Analysis",
    application: "Application",
    creative: "Creative",
    mixed: "Mixed",
  };
  return labels[type] || type;
}

/**
 * Discussion Questions Panel Component
 *
 * Generates and displays thoughtful discussion questions for
 * individual reflection or group discussions.
 */
export function DiscussionQuestionsPanel({
  bookId,
  bookTitle,
  currentSection,
  currentProgress,
}: DiscussionQuestionsPanelProps) {
  const [questionType, setQuestionType] = useState<
    "comprehension" | "analysis" | "application" | "creative" | "mixed"
  >("mixed");
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<DiscussionQuestion[]>([]);

  const {
    mutate: generateQuestions,
    isPending,
    error,
  } = useDiscussionQuestions();

  const handleGenerate = () => {
    generateQuestions(
      {
        bookId,
        ...(currentSection && { section: currentSection }),
        ...(currentProgress && { progress: currentProgress }),
        questionType,
        questionCount,
      },
      {
        onSuccess: (response) => {
          setQuestions(response.questions);
        },
      }
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Discussion Questions
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Generate AI-powered discussion questions for {bookTitle}
        </Typography>
      </Box>

      {/* Controls */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Question Type</InputLabel>
          <Select
            value={questionType}
            onChange={(e) =>
              setQuestionType(e.target.value as typeof questionType)
            }
            label="Question Type"
          >
            <MenuItem value="mixed">Mixed (All Types)</MenuItem>
            <MenuItem value="comprehension">Comprehension</MenuItem>
            <MenuItem value="analysis">Analysis</MenuItem>
            <MenuItem value="application">Application</MenuItem>
            <MenuItem value="creative">Creative</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          type="number"
          label="Number of Questions"
          value={questionCount}
          onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 5)}
          inputProps={{ min: 3, max: 10 }}
        />

        <Button
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} /> : <AIIcon />}
          onClick={handleGenerate}
          disabled={isPending}
          fullWidth
        >
          {isPending ? "Generating..." : "Generate Questions"}
        </Button>
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || "Failed to generate questions. Please try again."}
        </Alert>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {questions.length} Questions Generated
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleGenerate}
              disabled={isPending}
            >
              Regenerate
            </Button>
          </Box>

          <Stack spacing={1}>
            {questions.map((question, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        pr: 2,
                      }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {index + 1}. {question.question}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Chip
                          label={getQuestionTypeLabel(question.category)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Level ${question.difficulty}`}
                          size="small"
                          color={getDifficultyColor(question.difficulty)}
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: "text.secondary" }}
                      >
                        Purpose:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {question.purpose}
                      </Typography>
                    </Box>
                    {question.hints && question.hints.length > 0 && (
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 600, color: "text.secondary" }}
                        >
                          Hints:
                        </Typography>
                        <ul style={{ margin: "8px 0", paddingLeft: "24px" }}>
                          {question.hints.map((hint: string, i: number) => (
                            <li key={i}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {hint}
                              </Typography>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
