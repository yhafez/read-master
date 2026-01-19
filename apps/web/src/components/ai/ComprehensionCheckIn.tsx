/**
 * Comprehension Check-In Component
 *
 * A dialog that appears during reading to verify comprehension.
 * Triggers based on reading progress and user preferences.
 */
import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  Paper,
  Chip,
  Collapse,
  useTheme,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CorrectIcon,
  Cancel as IncorrectIcon,
  Lightbulb as HintIcon,
  School as SchoolIcon,
  SkipNext as SkipIcon,
  Refresh as RetryIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ComprehensionCheckInProps,
  CheckInState,
  ComprehensionQuestion,
  CheckInError,
  ComprehensionCheckApiResponse,
} from "./comprehensionCheckTypes";
import {
  buildCheckInApiRequest,
  parseApiResponseToQuestion,
  parseCheckInApiError,
  isAnswerCorrect,
  getDifficultyLabel,
  loadCheckInProgress,
  saveCheckInProgress,
  markMilestoneCompleted,
  getCurrentMilestone,
  loadCheckInFrequency,
} from "./comprehensionCheckTypes";

/**
 * ComprehensionCheckIn - Dialog for reading comprehension verification
 */
export function ComprehensionCheckIn({
  open,
  onClose,
  bookId,
  bookTitle,
  currentProgress,
  recentContent,
  chapterId,
  onCorrectAnswer,
  onIncorrectAnswer,
  onSkip,
}: ComprehensionCheckInProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  // Component state
  const [state, setState] = useState<CheckInState>("loading");
  const [question, setQuestion] = useState<ComprehensionQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState<CheckInError | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setState("loading");
      setQuestion(null);
      setSelectedAnswer("");
      setShowExplanation(false);
      setError(null);
      setCorrectAnswer("");
      setExplanation("");
    }
  }, [open]);

  // Fetch question mutation
  const fetchQuestionMutation = useMutation({
    mutationFn: async () => {
      const request = buildCheckInApiRequest(
        bookId,
        recentContent,
        "multiple_choice",
        chapterId
      );

      const response = await fetch("/api/ai/comprehension-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseCheckInApiError(
          response.status,
          errorData.code,
          errorData.message
        );
      }

      return response.json() as Promise<ComprehensionCheckApiResponse>;
    },
    onSuccess: (data) => {
      const parsedQuestion = parseApiResponseToQuestion(data);
      // Find correct answer for later
      const correct = data.options?.find((opt) => opt.isCorrect);
      setCorrectAnswer(correct?.id ?? "");
      setQuestion(parsedQuestion);
      setState("question");
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
    onError: (err: CheckInError | Error) => {
      const checkInError =
        "type" in err
          ? err
          : { type: "unknown" as const, message: err.message, retryable: true };
      setError(checkInError);
      setState("error");
    },
  });

  // Fetch question when dialog opens
  useEffect(() => {
    if (open && state === "loading" && !fetchQuestionMutation.isPending) {
      fetchQuestionMutation.mutate();
    }
  }, [open, state, fetchQuestionMutation]);

  // Submit answer mutation (to grade and get explanation)
  const submitAnswerMutation = useMutation({
    mutationFn: async (answer: string) => {
      // For now, we check locally. In a real app, we'd call /api/ai/grade-answer
      // The correct answer and explanation are already available from the question
      if (!question) throw new Error("No question");

      const isCorrect = isAnswerCorrect(question, answer);

      // Store the answer (fire-and-forget, we don't need the response)
      void fetch(`/api/assessments/${question.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: "q1",
          userAnswer: answer,
          isCorrect,
        }),
      });

      // Even if storing fails, show the result
      // We already have the correct answer from the question generation

      return { isCorrect };
    },
    onSuccess: ({ isCorrect }) => {
      setState(isCorrect ? "feedback_correct" : "feedback_incorrect");

      // Mark the milestone as completed
      const frequency = loadCheckInFrequency();
      const milestone = getCurrentMilestone(currentProgress, frequency);
      if (milestone > 0) {
        const progress = loadCheckInProgress(bookId);
        const updated = markMilestoneCompleted(progress, milestone);
        saveCheckInProgress(updated);
      }

      // Callbacks
      if (isCorrect) {
        onCorrectAnswer?.();
      } else {
        onIncorrectAnswer?.();
      }
    },
    onError: () => {
      // Even on error, show local result
      if (question && selectedAnswer) {
        const isCorrect = isAnswerCorrect(question, selectedAnswer);
        setState(isCorrect ? "feedback_correct" : "feedback_incorrect");
      }
    },
  });

  // Handlers
  const handleAnswerSelect = useCallback((value: string) => {
    setSelectedAnswer(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || !question) return;
    submitAnswerMutation.mutate(selectedAnswer);
  }, [selectedAnswer, question, submitAnswerMutation]);

  const handleSkip = useCallback(() => {
    // Mark the milestone as completed even on skip
    const frequency = loadCheckInFrequency();
    const milestone = getCurrentMilestone(currentProgress, frequency);
    if (milestone > 0) {
      const progress = loadCheckInProgress(bookId);
      const updated = markMilestoneCompleted(progress, milestone);
      saveCheckInProgress(updated);
    }

    onSkip?.();
    onClose();
  }, [bookId, currentProgress, onSkip, onClose]);

  const handleRetry = useCallback(() => {
    setState("loading");
    setError(null);
    fetchQuestionMutation.mutate();
  }, [fetchQuestionMutation]);

  const handleContinue = useCallback(() => {
    onClose();
  }, [onClose]);

  // Get the explanation text based on the correct option
  const getExplanationText = useCallback((): string => {
    if (explanation) return explanation;
    if (!question) return "";

    // Build explanation from question data
    const correctOption = question.options?.find((opt) => opt.isCorrect);
    let text = "";

    if (question.textReference) {
      text = `The answer can be found in the text: "${question.textReference}"`;
    } else if (correctOption) {
      text = `The correct answer is "${correctOption.text}".`;
    }

    return text || "Review the passage to understand this concept better.";
  }, [question, explanation]);

  // Render loading state
  const renderLoading = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 4,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
        {t("ai.checkIn.generating", "Generating a quick question...")}
      </Typography>
    </Box>
  );

  // Render error state
  const renderError = () => (
    <Box sx={{ py: 2 }}>
      <Alert
        severity="error"
        action={
          error?.retryable && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RetryIcon />}
              onClick={handleRetry}
            >
              {t("common.retry", "Retry")}
            </Button>
          )
        }
      >
        {error?.message ?? t("ai.checkIn.error", "Failed to generate question")}
      </Alert>
    </Box>
  );

  // Render question state
  const renderQuestion = () => {
    if (!question) return null;

    return (
      <Box>
        {/* Difficulty chip */}
        <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
          <Chip
            size="small"
            label={getDifficultyLabel(question.difficulty)}
            color={
              question.difficulty <= 2
                ? "success"
                : question.difficulty <= 3
                  ? "warning"
                  : "error"
            }
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${Math.round(currentProgress)}% ${t("reader.progress.completed", "completed")}`}
            variant="outlined"
          />
        </Box>

        {/* Question text */}
        <Typography variant="h6" sx={{ mb: 3 }}>
          {question.question}
        </Typography>

        {/* Answer options */}
        <RadioGroup
          value={selectedAnswer}
          onChange={(e) => handleAnswerSelect(e.target.value)}
        >
          {question.options?.map((option) => (
            <Paper
              key={option.id}
              variant="outlined"
              sx={{
                mb: 1,
                p: 0.5,
                cursor: "pointer",
                borderColor:
                  selectedAnswer === option.id ? "primary.main" : "divider",
                bgcolor:
                  selectedAnswer === option.id
                    ? theme.palette.mode === "dark"
                      ? "primary.dark"
                      : "primary.light"
                    : "transparent",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: theme.palette.action.hover,
                },
                transition: "all 0.2s",
              }}
              onClick={() => handleAnswerSelect(option.id)}
            >
              <FormControlLabel
                value={option.id}
                control={<Radio />}
                label={
                  <Typography variant="body1">
                    <strong>{option.id.toUpperCase()}.</strong> {option.text}
                  </Typography>
                }
                sx={{ width: "100%", m: 0 }}
              />
            </Paper>
          ))}
        </RadioGroup>
      </Box>
    );
  };

  // Render feedback state
  const renderFeedback = (isCorrect: boolean) => (
    <Box sx={{ textAlign: "center", py: 2 }}>
      {/* Result icon */}
      <Box sx={{ mb: 2 }}>
        {isCorrect ? (
          <CorrectIcon
            sx={{
              fontSize: 64,
              color: "success.main",
            }}
          />
        ) : (
          <IncorrectIcon
            sx={{
              fontSize: 64,
              color: "error.main",
            }}
          />
        )}
      </Box>

      {/* Result message */}
      <Typography variant="h5" sx={{ mb: 1 }}>
        {isCorrect
          ? t("ai.checkIn.correct", "Correct!")
          : t("ai.checkIn.incorrect", "Not quite right")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {isCorrect
          ? t(
              "ai.checkIn.correctMessage",
              "Great job! You understood the content well."
            )
          : t(
              "ai.checkIn.incorrectMessage",
              "Review this section to strengthen your understanding."
            )}
      </Typography>

      {/* Show correct answer if incorrect */}
      {!isCorrect && question && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {t("ai.checkIn.correctAnswerWas", "Correct answer:")}
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {question.options?.find((opt) => opt.id === correctAnswer)?.text ??
              correctAnswer}
          </Typography>
        </Paper>
      )}

      {/* Explanation toggle */}
      <Button
        variant="text"
        startIcon={<HintIcon />}
        onClick={() => setShowExplanation(!showExplanation)}
        sx={{ mb: 1 }}
      >
        {showExplanation
          ? t("ai.checkIn.hideExplanation", "Hide explanation")
          : t("ai.checkIn.showExplanation", "Show explanation")}
      </Button>

      {/* Explanation content */}
      <Collapse in={showExplanation}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            textAlign: "left",
            bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
          }}
        >
          <Typography variant="body2">{getExplanationText()}</Typography>
        </Paper>
      </Collapse>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={state === "loading" ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="comprehension-check-title"
    >
      {/* Header */}
      <DialogTitle
        id="comprehension-check-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        }}
      >
        <SchoolIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">
            {t("ai.checkIn.title", "Comprehension Check")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {bookTitle}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={state === "loading"}
          size="small"
          aria-label={t("common.close", "Close")}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ py: 3 }}>
        {state === "loading" && renderLoading()}
        {state === "error" && renderError()}
        {state === "question" && renderQuestion()}
        {state === "feedback_correct" && renderFeedback(true)}
        {state === "feedback_incorrect" && renderFeedback(false)}
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}
      >
        {state === "question" && (
          <>
            <Button
              variant="text"
              startIcon={<SkipIcon />}
              onClick={handleSkip}
              color="inherit"
            >
              {t("ai.checkIn.skip", "Skip")}
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!selectedAnswer || submitAnswerMutation.isPending}
            >
              {submitAnswerMutation.isPending
                ? t("common.loading", "Loading...")
                : t("ai.checkIn.submit", "Submit Answer")}
            </Button>
          </>
        )}
        {(state === "feedback_correct" || state === "feedback_incorrect") && (
          <Button variant="contained" onClick={handleContinue}>
            {t("ai.checkIn.continue", "Continue Reading")}
          </Button>
        )}
        {state === "error" && (
          <Button variant="text" onClick={handleSkip}>
            {t("ai.checkIn.skip", "Skip")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
