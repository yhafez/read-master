/**
 * FlashcardStudy Component
 *
 * Main study interface implementing SM-2 spaced repetition algorithm.
 * Features:
 * - Card display with flip animation
 * - 4-rating buttons (Again, Hard, Good, Easy)
 * - Progress tracking
 * - Session summary on completion
 * - Keyboard shortcuts
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Keyboard as KeyboardIcon,
  School as SchoolIcon,
} from "@mui/icons-material";

import {
  type CardReviewResult,
  type FlashcardStudyProps,
  type StudyCard,
  type StudyProgress,
  type StudySessionState,
  type StudySessionSummary,
  type SrsRating,
  CARD_FLIP_DURATION,
  DEFAULT_SESSION_LIMIT,
  MIN_CARD_VIEW_TIME,
  RATING_BUTTONS,
  STUDY_SHORTCUTS,
  createDefaultProgress,
  createSessionSummary,
  createStudyError,
  formatIntervalDisplay,
  formatSessionDuration,
  getProgressPercentage,
  getRetentionBadgeColor,
  isCorrectRating,
  isValidRating,
  updateProgress,
} from "./flashcardStudyTypes";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

// =============================================================================
// RATING BUTTONS COMPONENT
// =============================================================================

type RatingButtonsInternalProps = {
  predictedIntervals: Record<SrsRating, number>;
  onRate: (rating: SrsRating) => void;
  isSubmitting: boolean;
  disabled: boolean;
};

function RatingButtons({
  predictedIntervals,
  onRate,
  isSubmitting,
  disabled,
}: RatingButtonsInternalProps) {
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
      {RATING_BUTTONS.map((config) => (
        <Button
          key={config.rating}
          variant="contained"
          color={config.color}
          onClick={() => onRate(config.rating)}
          disabled={disabled || isSubmitting}
          sx={{
            minWidth: { xs: 70, sm: 100 },
            flexDirection: "column",
            py: 1,
            px: 2,
          }}
        >
          <Typography variant="button" fontWeight="bold">
            {t(config.labelKey)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {formatIntervalDisplay(predictedIntervals[config.rating])}
          </Typography>
        </Button>
      ))}
    </Stack>
  );
}

// =============================================================================
// CARD DISPLAY COMPONENT
// =============================================================================

type CardDisplayInternalProps = {
  card: StudyCard;
  showAnswer: boolean;
  onShowAnswer: () => void;
  isFlipping: boolean;
  canShowAnswer: boolean;
};

function CardDisplay({
  card,
  showAnswer,
  onShowAnswer,
  isFlipping,
  canShowAnswer,
}: CardDisplayInternalProps) {
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        minHeight: 300,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: `transform ${CARD_FLIP_DURATION}ms ease-in-out`,
        transform: isFlipping ? "rotateY(90deg)" : "rotateY(0deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Card Type Badge */}
      <Box sx={{ position: "absolute", top: 8, right: 8 }}>
        <Chip label={card.type} size="small" variant="outlined" />
      </Box>

      {/* Card Content */}
      <CardContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          p: 4,
        }}
      >
        {/* Front (Question) */}
        <Typography
          variant="h5"
          component="div"
          sx={{ mb: showAnswer ? 3 : 0, fontWeight: 500 }}
        >
          {card.front}
        </Typography>

        {/* Divider when showing answer */}
        {showAnswer && (
          <Divider sx={{ width: "60%", my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t("flashcards.study.answer")}
            </Typography>
          </Divider>
        )}

        {/* Back (Answer) */}
        {showAnswer && (
          <Typography
            variant="h6"
            component="div"
            color="text.secondary"
            sx={{ whiteSpace: "pre-wrap" }}
          >
            {card.back}
          </Typography>
        )}
      </CardContent>

      {/* Show Answer Button */}
      {!showAnswer && (
        <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <Button
            variant="outlined"
            size="large"
            onClick={onShowAnswer}
            disabled={!canShowAnswer}
            sx={{ minWidth: 200 }}
          >
            {t("flashcards.study.showAnswer")}
            <Typography
              variant="caption"
              sx={{ ml: 1, opacity: 0.7 }}
              component="span"
            >
              (Space)
            </Typography>
          </Button>
        </Box>
      )}

      {/* Book reference */}
      {card.book && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {card.book.title}
            {card.book.author && ` - ${card.book.author}`}
          </Typography>
        </Box>
      )}
    </Card>
  );
}

// =============================================================================
// PROGRESS DISPLAY COMPONENT
// =============================================================================

type ProgressDisplayInternalProps = {
  progress: StudyProgress;
};

function ProgressDisplay({ progress }: ProgressDisplayInternalProps) {
  const { t } = useTranslation();
  const percentage = getProgressPercentage(progress);

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="body2" color="text.secondary">
          {t("flashcards.study.cardProgress", {
            current: progress.completedCards + 1,
            total: progress.totalCards,
          })}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Typography variant="body2" color="success.main">
            {progress.correctCount} {t("flashcards.study.correct")}
          </Typography>
          <Typography variant="body2" color="error.main">
            {progress.incorrectCount} {t("flashcards.study.incorrect")}
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

// =============================================================================
// SESSION SUMMARY COMPONENT
// =============================================================================

type SessionSummaryInternalProps = {
  summary: StudySessionSummary;
  onStudyMore?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
};

function SessionSummary({
  summary,
  onStudyMore,
  onBack,
}: SessionSummaryInternalProps) {
  const { t } = useTranslation();
  const retentionColor = getRetentionBadgeColor(summary.sessionRetentionRate);

  return (
    <Paper sx={{ p: 4, textAlign: "center", maxWidth: 500, mx: "auto" }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />

      <Typography variant="h4" gutterBottom>
        {t("flashcards.study.sessionComplete")}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t("flashcards.study.sessionSummary", {
          count: summary.totalStudied,
        })}
      </Typography>

      {/* Stats Grid */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">
            {t("flashcards.study.retention")}
          </Typography>
          <Chip
            label={`${summary.sessionRetentionRate}%`}
            color={retentionColor}
            size="small"
          />
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">
            {t("flashcards.study.correct")}
          </Typography>
          <Typography color="success.main" fontWeight="medium">
            {summary.correctCount}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">
            {t("flashcards.study.incorrect")}
          </Typography>
          <Typography color="error.main" fontWeight="medium">
            {summary.incorrectCount}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">
            {t("flashcards.study.xpEarned")}
          </Typography>
          <Typography color="primary.main" fontWeight="medium">
            +{summary.totalXpEarned} XP
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">
            {t("flashcards.study.duration")}
          </Typography>
          <Typography>
            {formatSessionDuration(summary.sessionDurationMs)}
          </Typography>
        </Stack>

        {summary.cardsStillDue > 0 && (
          <Stack direction="row" justifyContent="space-between">
            <Typography color="text.secondary">
              {t("flashcards.study.cardsStillDue")}
            </Typography>
            <Typography color="warning.main" fontWeight="medium">
              {summary.cardsStillDue}
            </Typography>
          </Stack>
        )}
      </Stack>

      {/* Actions */}
      <Stack direction="row" spacing={2} justifyContent="center">
        {onBack && (
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
          >
            {t("common.back")}
          </Button>
        )}
        {onStudyMore && summary.cardsStillDue > 0 && (
          <Button
            variant="contained"
            onClick={onStudyMore}
            startIcon={<SchoolIcon />}
          >
            {t("flashcards.study.studyMore")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * FlashcardStudy - Main study interface for flashcard review
 */
export function FlashcardStudy({
  deckId,
  sessionLimit = DEFAULT_SESSION_LIMIT,
  onComplete,
  onExit,
  className,
}: FlashcardStudyProps) {
  const { t } = useTranslation();

  // State
  const [state, setState] = useState<StudySessionState>("loading");
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [canShowAnswer, setCanShowAnswer] = useState(false);
  const [progress, setProgress] = useState<StudyProgress>(
    createDefaultProgress(0)
  );
  const [results, setResults] = useState<CardReviewResult[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [summary, setSummary] = useState<StudySessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  // Current card
  const currentCard = cards[currentCardIndex] ?? null;

  // Predicted intervals (mock calculation for now)
  const predictedIntervals = useMemo<Record<SrsRating, number>>(() => {
    if (!currentCard) {
      return { 1: 1, 2: 1, 3: 6, 4: 8 };
    }
    const { easeFactor, interval, repetitions } = currentCard;
    // Simplified prediction based on SM-2
    return {
      1: 1, // Again always resets to 1
      2: Math.max(1, Math.round(interval * 0.6)), // Hard: 60%
      3:
        repetitions === 0
          ? 1
          : repetitions === 1
            ? 6
            : Math.round(interval * easeFactor),
      4: Math.round(
        (repetitions === 0
          ? 1
          : repetitions === 1
            ? 6
            : interval * easeFactor) * 1.3
      ),
    };
  }, [currentCard]);

  // Load cards (simulated - would be API call)
  useEffect(() => {
    const loadCards = async () => {
      try {
        setState("loading");
        // Simulate API call - in real implementation, fetch from /api/flashcards/due
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock data for now - real implementation would fetch from API
        const mockCards: StudyCard[] = [
          {
            id: "card-1",
            front: "What is the SM-2 algorithm?",
            back: "A spaced repetition algorithm that calculates optimal review intervals based on ease factor and response quality.",
            type: "CONCEPT",
            status: "REVIEW",
            tags: ["srs", "algorithm"],
            book: {
              id: "book-1",
              title: "Learning How to Learn",
              author: "Barbara Oakley",
            },
            easeFactor: 2.5,
            interval: 10,
            repetitions: 3,
            dueDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: "card-2",
            front: "What are the four rating options in SM-2?",
            back: "Again (1), Hard (2), Good (3), Easy (4)",
            type: "COMPREHENSION",
            status: "REVIEW",
            tags: ["srs"],
            book: null,
            easeFactor: 2.3,
            interval: 5,
            repetitions: 2,
            dueDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ];

        // Filter by deckId if provided
        const filteredCards = deckId
          ? mockCards.filter((c) => c.book?.id === deckId)
          : mockCards;

        // Limit cards
        const limitedCards = filteredCards.slice(0, sessionLimit);

        if (limitedCards.length === 0) {
          setError(createStudyError("no_cards_due").message);
          setState("error");
          return;
        }

        setCards(limitedCards);
        setProgress(createDefaultProgress(limitedCards.length));
        setState("studying");
        setCardStartTime(Date.now());
      } catch {
        setError(createStudyError("network_error").message);
        setState("error");
      }
    };

    void loadCards();
  }, [deckId, sessionLimit]);

  // Enable show answer after minimum view time
  useEffect(() => {
    if (state === "studying" && !showAnswer) {
      setCanShowAnswer(false);
      const timer = setTimeout(() => {
        setCanShowAnswer(true);
      }, MIN_CARD_VIEW_TIME);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state, showAnswer, currentCardIndex]);

  // Handle show answer
  const handleShowAnswer = useCallback(() => {
    if (!canShowAnswer || showAnswer) return;
    setIsFlipping(true);
    setTimeout(() => {
      setShowAnswer(true);
      setIsFlipping(false);
      setState("showingAnswer");
    }, CARD_FLIP_DURATION / 2);
  }, [canShowAnswer, showAnswer]);

  // Handle rating submission
  const handleRate = useCallback(
    async (rating: SrsRating) => {
      if (!currentCard || state !== "showingAnswer") return;

      setState("submitting");
      const responseTimeMs = Date.now() - cardStartTime;

      try {
        // Simulate API call - real implementation would POST to /api/flashcards/:id/review
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Calculate XP (simplified)
        const xpAwarded = isCorrectRating(rating) ? 10 : 2;

        // Record result
        const result: CardReviewResult = {
          cardId: currentCard.id,
          rating,
          responseTimeMs,
          newInterval: predictedIntervals[rating],
          newDueDate: new Date(
            Date.now() + predictedIntervals[rating] * 24 * 60 * 60 * 1000
          ).toISOString(),
          xpAwarded,
        };

        setResults((prev) => [...prev, result]);
        setProgress((prev) => updateProgress(prev, rating));

        // Move to next card or complete
        if (currentCardIndex + 1 >= cards.length) {
          // Session complete
          const sessionSummary = createSessionSummary(
            [...results, result],
            sessionStartTime,
            0 // Would be fetched from API
          );
          setSummary(sessionSummary);
          setState("completed");
          onComplete?.(sessionSummary);
        } else {
          // Next card
          setCurrentCardIndex((prev) => prev + 1);
          setShowAnswer(false);
          setCardStartTime(Date.now());
          setState("studying");
        }
      } catch {
        setError(createStudyError("submission_failed").message);
        setState("showingAnswer"); // Allow retry
      }
    },
    [
      currentCard,
      state,
      cardStartTime,
      predictedIntervals,
      currentCardIndex,
      cards.length,
      results,
      sessionStartTime,
      onComplete,
    ]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Help dialog
      if (e.key === STUDY_SHORTCUTS.HELP) {
        e.preventDefault();
        setShowShortcutsDialog(true);
        return;
      }

      // Exit
      if (e.key === STUDY_SHORTCUTS.EXIT) {
        e.preventDefault();
        onExit?.();
        return;
      }

      // Show answer
      if (e.key === STUDY_SHORTCUTS.SHOW_ANSWER && state === "studying") {
        e.preventDefault();
        handleShowAnswer();
        return;
      }

      // Rating shortcuts (when answer is showing)
      if (state === "showingAnswer") {
        const rating = parseInt(e.key, 10);
        if (isValidRating(rating)) {
          e.preventDefault();
          void handleRate(rating);
          return;
        }
      }

      // TODO: Implement undo functionality
      if (e.key.toLowerCase() === STUDY_SHORTCUTS.UNDO) {
        e.preventDefault();
        // TODO: Implement undo last rating
        return;
      }

      // TODO: Implement suspend card functionality
      if (e.key.toLowerCase() === STUDY_SHORTCUTS.SUSPEND) {
        e.preventDefault();
        // TODO: Implement suspend current card
        return;
      }

      // TODO: Implement edit card functionality
      if (e.key.toLowerCase() === STUDY_SHORTCUTS.EDIT) {
        e.preventDefault();
        // TODO: Implement edit current card
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, handleShowAnswer, handleRate, onExit, setShowShortcutsDialog]);

  // Handle study more
  const handleStudyMore = useCallback(() => {
    setCards([]);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setProgress(createDefaultProgress(0));
    setResults([]);
    setSummary(null);
    setState("loading");
  }, []);

  // Render loading state
  if (state === "loading") {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          {t("flashcards.study.loading")}
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (state === "error" && error) {
    return (
      <Box className={className} sx={{ p: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleStudyMore}>
              {t("common.retry")}
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Render completion state
  if (state === "completed" && summary) {
    return (
      <Box className={className} sx={{ p: 2 }}>
        <SessionSummary
          summary={summary}
          onStudyMore={handleStudyMore}
          onBack={onExit}
        />
      </Box>
    );
  }

  // Render study interface
  return (
    <Box className={className} sx={{ p: 2, maxWidth: 700, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Tooltip title={t("common.exit")}>
          <IconButton onClick={onExit}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h6">{t("flashcards.study.title")}</Typography>
        <Tooltip title={t("flashcards.study.shortcuts")}>
          <IconButton onClick={() => setShowShortcutsDialog(true)}>
            <KeyboardIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Progress */}
      <Box sx={{ mb: 3 }}>
        <ProgressDisplay progress={progress} />
      </Box>

      {/* Card */}
      {currentCard && (
        <Box sx={{ mb: 3 }}>
          <CardDisplay
            card={currentCard}
            showAnswer={showAnswer}
            onShowAnswer={handleShowAnswer}
            isFlipping={isFlipping}
            canShowAnswer={canShowAnswer}
          />
        </Box>
      )}

      {/* Rating Buttons */}
      {showAnswer && (
        <Box sx={{ mt: 3 }}>
          <RatingButtons
            predictedIntervals={predictedIntervals}
            onRate={handleRate}
            isSubmitting={state === "submitting"}
            disabled={state !== "showingAnswer"}
          />
        </Box>
      )}

      {/* Submitting indicator */}
      {state === "submitting" && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcutsDialog}
        onClose={() => setShowShortcutsDialog(false)}
      />
    </Box>
  );
}

export default FlashcardStudy;
