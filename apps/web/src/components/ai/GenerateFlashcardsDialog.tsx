/**
 * GenerateFlashcardsDialog Component
 *
 * A dialog for generating AI-powered flashcards from book content.
 * Supports type selection, card count adjustment, preview, editing, and saving.
 */

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Card,
  CardContent,
  TextField,
  Divider,
  Collapse,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import DeselectIcon from "@mui/icons-material/Deselect";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import {
  type FlashcardGenerationType,
  type GenerateFlashcardsDialogProps,
  type GeneratedFlashcard,
  type GenerationSummary,
  type GenerationState,
  type GenerationError,
  type EditableFlashcard,
  FLASHCARD_TYPE_OPTIONS,
  MIN_CARD_COUNT,
  MAX_CARD_COUNT,
  CARD_COUNT_STEP,
  validateContent,
  validateCardTypes,
  createGenerationError,
  parseGenerationApiError,
  getFlashcardTypeDisplay,
  toEditableFlashcards,
  startEditingCard,
  cancelEditingCard,
  saveEditedCard,
  updateEditedFront,
  updateEditedBack,
  toggleCardSelection,
  selectAllCards,
  deselectAllCards,
  getSelectedCount,
  isAnyCardEditing,
  toGeneratedFlashcards,
  loadGenerationPreferences,
  saveGenerationPreferences,
  buildGenerationRequest,
  formatDuration,
  getSummaryText,
  getTypeBreakdown,
  estimateGenerationTime,
} from "./flashcardGenerationTypes";

/**
 * GenerateFlashcardsDialog Component
 */
export function GenerateFlashcardsDialog({
  open,
  onClose,
  bookId,
  bookTitle,
  content,
  chapterId,
  sourceOffset,
  onSuccess,
}: GenerateFlashcardsDialogProps) {
  const { t } = useTranslation();

  // Load saved preferences
  const savedPrefs = loadGenerationPreferences();

  // Form state
  const [selectedTypes, setSelectedTypes] = useState<FlashcardGenerationType[]>(
    savedPrefs.cardTypes
  );
  const [cardCount, setCardCount] = useState(savedPrefs.cardCount);

  // Generation state
  const [state, setState] = useState<GenerationState>("idle");
  const [error, setError] = useState<GenerationError | null>(null);
  const [generatedCards, setGeneratedCards] = useState<EditableFlashcard[]>([]);
  const [summary, setSummary] = useState<GenerationSummary | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  // UI state
  const [showTypeInfo, setShowTypeInfo] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      const prefs = loadGenerationPreferences();
      setSelectedTypes(prefs.cardTypes);
      setCardCount(prefs.cardCount);
      setState("idle");
      setError(null);
      setGeneratedCards([]);
      setSummary(null);
      setDurationMs(0);
    }
  }, [open]);

  // Handle type selection
  const handleTypeToggle = useCallback((type: FlashcardGenerationType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  // Handle card count change
  const handleCardCountChange = useCallback(
    (_: Event, value: number | number[]) => {
      setCardCount(value as number);
    },
    []
  );

  // Validate form
  const contentValidation = validateContent(content);
  const typesValidation = validateCardTypes(selectedTypes);
  const canGenerate =
    state === "idle" && contentValidation.valid && typesValidation.valid;

  // Generate flashcards
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    // Save preferences
    saveGenerationPreferences({
      cardTypes: selectedTypes,
      cardCount,
      autoSave: false,
    });

    setState("generating");
    setError(null);

    try {
      const requestParams: {
        bookId: string;
        content: string;
        cardTypes: FlashcardGenerationType[];
        cardCount: number;
        chapterId?: string;
        sourceOffset?: number;
      } = {
        bookId,
        content,
        cardTypes: selectedTypes,
        cardCount,
      };
      if (chapterId) {
        requestParams.chapterId = chapterId;
      }
      if (sourceOffset !== undefined) {
        requestParams.sourceOffset = sourceOffset;
      }
      const request = buildGenerationRequest(requestParams);

      const response = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiError = parseGenerationApiError(
          response.status,
          data.error ?? data.message
        );
        setError(apiError);
        setState("error");
        return;
      }

      const flashcards: GeneratedFlashcard[] = data.data?.flashcards ?? [];
      const responseSummary: GenerationSummary = data.data?.summary ?? {
        totalCards: 0,
        byType: {},
        averageDifficulty: 0,
        duplicatesRemoved: 0,
        requestedCount: cardCount,
        generatedCount: 0,
        savedCount: flashcards.length,
      };

      if (flashcards.length === 0) {
        setError(createGenerationError("no_cards_generated"));
        setState("error");
        return;
      }

      setGeneratedCards(toEditableFlashcards(flashcards));
      setSummary(responseSummary);
      setDurationMs(data.data?.durationMs ?? 0);
      setState("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(createGenerationError("network_error", message));
      setState("error");
    }
  }, [
    canGenerate,
    selectedTypes,
    cardCount,
    bookId,
    content,
    chapterId,
    sourceOffset,
  ]);

  // Handle card editing
  const handleEditCard = useCallback((cardId: string) => {
    setGeneratedCards((prev) => startEditingCard(prev, cardId));
  }, []);

  const handleCancelEdit = useCallback((cardId: string) => {
    setGeneratedCards((prev) => cancelEditingCard(prev, cardId));
  }, []);

  const handleSaveEdit = useCallback((cardId: string) => {
    setGeneratedCards((prev) => saveEditedCard(prev, cardId));
  }, []);

  const handleFrontChange = useCallback((cardId: string, text: string) => {
    setGeneratedCards((prev) => updateEditedFront(prev, cardId, text));
  }, []);

  const handleBackChange = useCallback((cardId: string, text: string) => {
    setGeneratedCards((prev) => updateEditedBack(prev, cardId, text));
  }, []);

  const handleToggleSelection = useCallback((cardId: string) => {
    setGeneratedCards((prev) => toggleCardSelection(prev, cardId));
  }, []);

  const handleSelectAll = useCallback(() => {
    setGeneratedCards((prev) => selectAllCards(prev));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setGeneratedCards((prev) => deselectAllCards(prev));
  }, []);

  // Handle success (cards already saved by API)
  const handleDone = useCallback(() => {
    const selectedCards = toGeneratedFlashcards(generatedCards);
    if (onSuccess && summary) {
      onSuccess(selectedCards, summary);
    }
    onClose();
  }, [generatedCards, onSuccess, summary, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    if (state === "generating") return; // Don't close while generating
    onClose();
  }, [state, onClose]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    setState("idle");
    setError(null);
    setGeneratedCards([]);
    setSummary(null);
    setDurationMs(0);
  }, []);

  // Calculate selected count
  const selectedCount = getSelectedCount(generatedCards);
  const isEditing = isAnyCardEditing(generatedCards);

  // Render type selection
  const renderTypeSelection = () => (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {t("ai.flashcardGeneration.selectTypes")}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setShowTypeInfo(!showTypeInfo)}
          aria-label={t("ai.flashcardGeneration.typeInfo")}
        >
          {showTypeInfo ? <ExpandLessIcon /> : <InfoOutlinedIcon />}
        </IconButton>
      </Box>

      <Collapse in={showTypeInfo}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("ai.flashcardGeneration.typeInfoDescription")}
        </Alert>
      </Collapse>

      <FormGroup row sx={{ gap: 1 }}>
        {FLASHCARD_TYPE_OPTIONS.map((option) => (
          <Tooltip
            key={option.value}
            title={t(option.descriptionKey)}
            placement="top"
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTypes.includes(option.value)}
                  onChange={() => handleTypeToggle(option.value)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">{t(option.labelKey)}</Typography>
              }
              sx={{
                border: 1,
                borderColor: selectedTypes.includes(option.value)
                  ? "primary.main"
                  : "divider",
                borderRadius: 1,
                px: 1,
                py: 0.5,
                m: 0,
                backgroundColor: selectedTypes.includes(option.value)
                  ? "action.selected"
                  : "transparent",
              }}
            />
          </Tooltip>
        ))}
      </FormGroup>

      {!typesValidation.valid && (
        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
          {typesValidation.error}
        </Typography>
      )}
    </Box>
  );

  // Render card count slider
  const renderCardCountSlider = () => (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {t("ai.flashcardGeneration.cardCount")}
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {cardCount} {t("ai.flashcardGeneration.cards")}
        </Typography>
      </Box>

      <Slider
        value={cardCount}
        onChange={handleCardCountChange}
        min={MIN_CARD_COUNT}
        max={MAX_CARD_COUNT}
        step={CARD_COUNT_STEP}
        marks={[
          { value: 5, label: "5" },
          { value: 10, label: "10" },
          { value: 20, label: "20" },
          { value: 30, label: "30" },
        ]}
        valueLabelDisplay="auto"
      />

      <Typography variant="caption" color="text.secondary">
        {t("ai.flashcardGeneration.estimatedTime", {
          time: estimateGenerationTime(cardCount),
        })}
      </Typography>
    </Box>
  );

  // Render content info
  const renderContentInfo = () => (
    <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {bookTitle}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {content.length.toLocaleString()}{" "}
        {t("ai.flashcardGeneration.characters")}
      </Typography>
      {!contentValidation.valid && (
        <Typography variant="caption" color="error" display="block">
          {contentValidation.error}
        </Typography>
      )}
    </Box>
  );

  // Render generating state
  const renderGenerating = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 4,
      }}
    >
      <CircularProgress size={48} sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {t("ai.flashcardGeneration.generating")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("ai.flashcardGeneration.generatingDescription")}
      </Typography>
      <LinearProgress sx={{ width: "100%", mt: 2 }} />
    </Box>
  );

  // Render error state
  const renderError = () => (
    <Box sx={{ py: 2 }}>
      <Alert
        severity="error"
        action={
          error?.retryable && (
            <Button color="inherit" size="small" onClick={handleRegenerate}>
              {t("common.retry")}
            </Button>
          )
        }
      >
        {error?.message}
      </Alert>
    </Box>
  );

  // Render single flashcard
  const renderFlashcard = (card: EditableFlashcard) => (
    <Card
      key={card.id}
      variant="outlined"
      sx={{
        mb: 2,
        opacity: card.isSelected ? 1 : 0.5,
        borderColor: card.isSelected ? "primary.main" : "divider",
      }}
    >
      <CardContent sx={{ pb: "12px !important" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Checkbox
              checked={card.isSelected}
              onChange={() => handleToggleSelection(card.id)}
              size="small"
            />
            <Chip
              label={getFlashcardTypeDisplay(
                card.type as FlashcardGenerationType
              )}
              size="small"
              variant="outlined"
            />
          </Box>

          {!card.isEditing ? (
            <IconButton
              size="small"
              onClick={() => handleEditCard(card.id)}
              aria-label={t("common.edit")}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          ) : (
            <Box>
              <IconButton
                size="small"
                onClick={() => handleSaveEdit(card.id)}
                color="primary"
                aria-label={t("common.save")}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleCancelEdit(card.id)}
                aria-label={t("common.cancel")}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>

        {card.isEditing ? (
          <>
            <TextField
              fullWidth
              label={t("ai.flashcardGeneration.front")}
              value={card.editedFront}
              onChange={(e) => handleFrontChange(card.id, e.target.value)}
              size="small"
              multiline
              maxRows={3}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              label={t("ai.flashcardGeneration.back")}
              value={card.editedBack}
              onChange={(e) => handleBackChange(card.id, e.target.value)}
              size="small"
              multiline
              maxRows={5}
            />
          </>
        ) : (
          <>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              {card.front}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {card.back}
            </Typography>
          </>
        )}

        {card.tags.length > 0 && (
          <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {card.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Render generated cards preview
  const renderPreview = () => (
    <Box>
      {/* Summary */}
      {summary && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {getSummaryText(summary)}
            {durationMs > 0 && ` (${formatDuration(durationMs)})`}
          </Typography>
          {getTypeBreakdown(summary.byType).length > 0 && (
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {getTypeBreakdown(summary.byType).map(
                ({ type, count, label }) => (
                  <Chip
                    key={type}
                    label={`${label}: ${count}`}
                    size="small"
                    variant="outlined"
                  />
                )
              )}
            </Box>
          )}
        </Alert>
      )}

      {/* Selection controls */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="subtitle2">
          {t("ai.flashcardGeneration.selectedCount", {
            count: selectedCount,
            total: generatedCards.length,
          })}
        </Typography>
        <Box>
          <IconButton
            size="small"
            onClick={handleSelectAll}
            aria-label={t("ai.flashcardGeneration.selectAll")}
          >
            <SelectAllIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleDeselectAll}
            aria-label={t("ai.flashcardGeneration.deselectAll")}
          >
            <DeselectIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Card list */}
      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
        {generatedCards.map(renderFlashcard)}
      </Box>
    </Box>
  );

  // Render dialog content
  const renderContent = () => {
    switch (state) {
      case "idle":
        return (
          <>
            {renderTypeSelection()}
            {renderCardCountSlider()}
            {renderContentInfo()}
          </>
        );
      case "generating":
        return renderGenerating();
      case "error":
        return (
          <>
            {renderError()}
            {renderTypeSelection()}
            {renderCardCountSlider()}
            {renderContentInfo()}
          </>
        );
      case "complete":
        return renderPreview();
      default:
        return null;
    }
  };

  // Render dialog actions
  const renderActions = () => {
    switch (state) {
      case "idle":
        return (
          <>
            <Button onClick={handleClose}>{t("common.cancel")}</Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!canGenerate}
              startIcon={<AutoAwesomeIcon />}
            >
              {t("ai.flashcardGeneration.generate")}
            </Button>
          </>
        );
      case "generating":
        return (
          <Button disabled>{t("ai.flashcardGeneration.generating")}</Button>
        );
      case "error":
        return (
          <>
            <Button onClick={handleClose}>{t("common.close")}</Button>
            {error?.retryable && (
              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={!canGenerate}
                startIcon={<RefreshIcon />}
              >
                {t("common.retry")}
              </Button>
            )}
          </>
        );
      case "complete":
        return (
          <>
            <Button onClick={handleRegenerate} startIcon={<RefreshIcon />}>
              {t("ai.flashcardGeneration.regenerate")}
            </Button>
            <Button
              variant="contained"
              onClick={handleDone}
              disabled={selectedCount === 0 || isEditing}
              startIcon={<CheckIcon />}
            >
              {t("ai.flashcardGeneration.done")}
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="generate-flashcards-title"
    >
      <DialogTitle
        id="generate-flashcards-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">
            {t("ai.flashcardGeneration.title")}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={state === "generating"}
          aria-label={t("common.close")}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>{renderContent()}</DialogContent>

      <DialogActions>{renderActions()}</DialogActions>
    </Dialog>
  );
}
