/**
 * Explain Popover Component
 *
 * A popover that appears when users select text in the reader.
 * Shows AI-generated explanations and allows follow-up questions.
 */
import { useState, useCallback, useEffect } from "react";
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Chip,
  Collapse,
  Paper,
  Alert,
  useTheme,
} from "@mui/material";
import {
  Close as CloseIcon,
  AutoAwesome as SparkleIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Send as SendIcon,
  School as SchoolIcon,
  Lightbulb as LightbulbIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ExplainPopoverProps,
  ExplanationData,
  ExplainLoadingState,
  ExplainError,
  FollowUpState,
} from "./explainTypes";
import {
  validateSelectedText,
  buildExplainRequest,
  buildFollowUpRequest,
  canAddFollowUp,
  addFollowUp,
  setFollowUpLoading,
  updateFollowUpInput,
  clearFollowUps,
  createExplainError,
  parseExplainApiError,
  INITIAL_FOLLOW_UP_STATE,
  MAX_FOLLOW_UPS,
} from "./explainTypes";

/**
 * ExplainPopover - AI explanation popover for selected text
 */
export function ExplainPopover({
  open,
  anchorEl,
  context,
  onClose,
  bookId,
  initialData,
  onExplain,
  onError,
}: ExplainPopoverProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  // Component state
  const [explanation, setExplanation] = useState<ExplanationData | null>(
    initialData ?? null
  );
  const [loadingState, setLoadingState] = useState<ExplainLoadingState>("idle");
  const [error, setError] = useState<ExplainError | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpState>(
    INITIAL_FOLLOW_UP_STATE
  );
  const [showSimplified, setShowSimplified] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Reset state when context changes
  useEffect(() => {
    if (context?.selectedText !== explanation?.selectedText) {
      setExplanation(initialData ?? null);
      setLoadingState("idle");
      setError(null);
      setFollowUps(INITIAL_FOLLOW_UP_STATE);
      setShowSimplified(false);
      setShowRelated(false);
      setShowExamples(false);
    }
  }, [context?.selectedText, initialData, explanation?.selectedText]);

  // Explain mutation
  const explainMutation = useMutation({
    mutationFn: async () => {
      if (!context) {
        throw new Error("No context provided");
      }

      const validation = validateSelectedText(context.selectedText);
      if (!validation.valid && validation.error) {
        throw validation.error;
      }

      const request = buildExplainRequest(context, bookId);

      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseExplainApiError(
          response.status,
          errorData.code,
          errorData.message
        );
      }

      return response.json() as Promise<ExplanationData>;
    },
    onMutate: () => {
      setLoadingState("loading");
      setError(null);
    },
    onSuccess: (data) => {
      setExplanation(data);
      setLoadingState("idle");
      onExplain?.(data);
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
    onError: (err: ExplainError | Error) => {
      const explainError =
        "type" in err ? err : createExplainError("unknown", err.message);
      setError(explainError);
      setLoadingState("error");
      onError?.(explainError);
    },
  });

  // Follow-up mutation
  const followUpMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!explanation) {
        throw new Error("No explanation to follow up on");
      }

      const request = buildFollowUpRequest(
        bookId,
        context?.selectedText ?? "",
        explanation.explanation,
        question,
        context?.readingLevel
      );

      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw parseExplainApiError(
          response.status,
          errorData.code,
          errorData.message
        );
      }

      const data = await response.json();
      return { question, answer: data.answer ?? data.response ?? "" };
    },
    onMutate: () => {
      setFollowUps((s) => setFollowUpLoading(s, true));
    },
    onSuccess: ({ question, answer }) => {
      setFollowUps((s) => addFollowUp(s, question, answer));
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    },
    onError: () => {
      setFollowUps((s) => setFollowUpLoading(s, false));
    },
  });

  // Handlers
  const handleExplain = useCallback(() => {
    explainMutation.mutate();
  }, [explainMutation]);

  const handleRegenerate = useCallback(() => {
    setFollowUps(clearFollowUps());
    explainMutation.mutate();
  }, [explainMutation]);

  const handleFollowUpSubmit = useCallback(() => {
    const question = followUps.inputValue.trim();
    if (question && canAddFollowUp(followUps)) {
      followUpMutation.mutate(question);
    }
  }, [followUps, followUpMutation]);

  const handleFollowUpKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleFollowUpSubmit();
      }
    },
    [handleFollowUpSubmit]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Render content based on state
  const renderContent = () => {
    // Error state
    if (error && loadingState === "error") {
      return (
        <Box>
          <Alert
            severity="error"
            action={
              error.retryable && (
                <Button color="inherit" size="small" onClick={handleExplain}>
                  {t("common.retry", "Retry")}
                </Button>
              )
            }
          >
            {error.message}
          </Alert>
        </Box>
      );
    }

    // Loading state
    if (loadingState === "loading" || loadingState === "streaming") {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 3,
          }}
        >
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("ai.explain.generating", "Generating explanation...")}
          </Typography>
        </Box>
      );
    }

    // Initial state - no explanation yet
    if (!explanation) {
      return (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t(
              "ai.explain.description",
              "Get an AI-powered explanation of the selected text."
            )}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SparkleIcon />}
            onClick={handleExplain}
            disabled={!context?.selectedText}
          >
            {t("ai.explain.button", "Explain This")}
          </Button>
        </Box>
      );
    }

    // Has explanation - show it
    return (
      <Box>
        {/* Main explanation */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <SchoolIcon
              fontSize="small"
              sx={{ mr: 1, color: "primary.main" }}
            />
            <Typography variant="subtitle2">
              {t("ai.explain.explanation", "Explanation")}
            </Typography>
            {explanation.cached && (
              <Chip
                label={t("ai.cached", "Cached")}
                size="small"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Typography variant="body2">{explanation.explanation}</Typography>
        </Box>

        {/* Simplified explanation toggle */}
        {explanation.simplifiedExplanation && (
          <>
            <Button
              size="small"
              onClick={() => setShowSimplified(!showSimplified)}
              endIcon={showSimplified ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1 }}
            >
              {t("ai.explain.simpler", "Simpler explanation")}
            </Button>
            <Collapse in={showSimplified}>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {explanation.simplifiedExplanation}
                </Typography>
              </Paper>
            </Collapse>
          </>
        )}

        {/* Related concepts */}
        {explanation.relatedConcepts &&
          explanation.relatedConcepts.length > 0 && (
            <>
              <Button
                size="small"
                onClick={() => setShowRelated(!showRelated)}
                startIcon={<LinkIcon />}
                endIcon={showRelated ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ mb: 1 }}
              >
                {t("ai.explain.relatedConcepts", "Related concepts")} (
                {explanation.relatedConcepts.length})
              </Button>
              <Collapse in={showRelated}>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}
                >
                  {explanation.relatedConcepts.map((concept, i) => (
                    <Chip
                      key={i}
                      label={concept}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Collapse>
            </>
          )}

        {/* Examples */}
        {explanation.examples && explanation.examples.length > 0 && (
          <>
            <Button
              size="small"
              onClick={() => setShowExamples(!showExamples)}
              startIcon={<LightbulbIcon />}
              endIcon={showExamples ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1 }}
            >
              {t("ai.explain.examples", "Examples")} (
              {explanation.examples.length})
            </Button>
            <Collapse in={showExamples}>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                {explanation.examples.map((example, i, arr) => (
                  <Typography
                    key={i}
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: i < arr.length - 1 ? 1 : 0 }}
                  >
                    {i + 1}. {example}
                  </Typography>
                ))}
              </Paper>
            </Collapse>
          </>
        )}

        {/* Follow-up questions */}
        {followUps.items.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t("ai.explain.followUps", "Follow-up questions")}
            </Typography>
            {followUps.items.map((item, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{ p: 1.5, mb: 1, bgcolor: "action.hover" }}
              >
                <Typography
                  variant="body2"
                  fontWeight="medium"
                  color="primary.main"
                >
                  Q: {item.question}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {item.answer}
                </Typography>
              </Paper>
            ))}
          </>
        )}

        {/* Follow-up input */}
        {canAddFollowUp(followUps) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t(
                "ai.explain.askFollowUp",
                "Have a follow-up question? ({remaining} remaining)",
                { remaining: MAX_FOLLOW_UPS - followUps.items.length }
              )}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t(
                  "ai.explain.followUpPlaceholder",
                  "Ask a follow-up question..."
                )}
                value={followUps.inputValue}
                onChange={(e) =>
                  setFollowUps((s) => updateFollowUpInput(s, e.target.value))
                }
                onKeyDown={handleFollowUpKeyDown}
                disabled={followUps.isLoading}
              />
              <IconButton
                color="primary"
                onClick={handleFollowUpSubmit}
                disabled={!followUps.inputValue.trim() || followUps.isLoading}
              >
                {followUps.isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Regenerate button */}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRegenerate}
          >
            {t("ai.regenerate", "Regenerate")}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      slotProps={{
        paper: {
          sx: {
            width: 400,
            maxWidth: "90vw",
            maxHeight: "80vh",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <SparkleIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1" fontWeight="medium">
            {t("ai.explain.title", "Explain This")}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Selected text preview */}
      {context?.selectedText && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            bgcolor: "action.hover",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontStyle: "italic",
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            "{context.selectedText}"
          </Typography>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ p: 1.5, overflowY: "auto", maxHeight: "calc(80vh - 140px)" }}>
        {renderContent()}
      </Box>
    </Popover>
  );
}
