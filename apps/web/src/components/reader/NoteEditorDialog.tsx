/**
 * NoteEditorDialog component
 *
 * A dialog for creating and editing notes attached to annotations.
 * Used for both adding notes to highlights and creating standalone notes.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { Annotation, HighlightAnnotation } from "./annotationTypes";
import {
  getExcerptText,
  HIGHLIGHT_COLOR_VALUES,
  isHighlight,
} from "./annotationTypes";

export interface NoteEditorDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called when note is saved */
  onSave: (note: string, isPublic: boolean) => void;
  /** Existing annotation being edited (optional) */
  annotation?: Annotation;
  /** Selected text (for new notes) */
  selectedText?: string;
  /** Mode of the dialog */
  mode: "create" | "edit";
  /** Title override */
  title?: string;
}

const MAX_NOTE_LENGTH = 5000;

export function NoteEditorDialog({
  open,
  onClose,
  onSave,
  annotation,
  selectedText,
  mode,
  title,
}: NoteEditorDialogProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes or annotation changes
  useEffect(() => {
    if (open) {
      setNote(annotation?.note ?? "");
      setIsPublic(annotation?.isPublic ?? false);
      setError(null);
    }
  }, [open, annotation]);

  const handleSave = () => {
    const trimmedNote = note.trim();

    // Validate
    if (mode === "create" && !trimmedNote) {
      setError(t("reader.annotations.noteRequired"));
      return;
    }

    if (trimmedNote.length > MAX_NOTE_LENGTH) {
      setError(t("reader.annotations.noteTooLong", { max: MAX_NOTE_LENGTH }));
      return;
    }

    onSave(trimmedNote, isPublic);
    onClose();
  };

  const handleNoteChange = (value: string) => {
    setNote(value);
    if (error) {
      setError(null);
    }
  };

  // Get display text for context
  const contextText =
    selectedText ??
    (annotation && isHighlight(annotation)
      ? (annotation as HighlightAnnotation).selectedText
      : undefined);

  const dialogTitle =
    title ??
    (mode === "create"
      ? t("reader.annotations.addNote")
      : t("reader.annotations.editNote"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="note-editor-dialog-title"
    >
      <DialogTitle
        id="note-editor-dialog-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {dialogTitle}
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={t("common.close")}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Selected text context */}
        {contextText && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{ mb: 0.5 }}
            >
              {t("reader.annotations.selectedText")}
            </Typography>
            <Box
              sx={{
                p: 1.5,
                backgroundColor:
                  annotation && isHighlight(annotation)
                    ? HIGHLIGHT_COLOR_VALUES[
                        (annotation as HighlightAnnotation).color
                      ]
                    : "action.hover",
                borderRadius: 1,
                borderLeft: 3,
                borderColor: "primary.main",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontStyle: "italic",
                  color: "text.primary",
                }}
              >
                "{getExcerptText(contextText, 200)}"
              </Typography>
            </Box>
          </Box>
        )}

        {/* Annotation type indicator */}
        {annotation && (
          <Box sx={{ mb: 2 }}>
            <Chip
              size="small"
              label={t(
                `reader.annotations.types.${annotation.type.toLowerCase()}`
              )}
              color={
                annotation.type === "HIGHLIGHT"
                  ? "warning"
                  : annotation.type === "NOTE"
                    ? "info"
                    : "default"
              }
            />
          </Box>
        )}

        {/* Note editor */}
        <TextField
          autoFocus
          multiline
          rows={4}
          fullWidth
          label={t("reader.annotations.noteLabel")}
          placeholder={t("reader.annotations.notePlaceholder")}
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          error={Boolean(error)}
          helperText={error ?? `${note.length}/${MAX_NOTE_LENGTH}`}
          slotProps={{
            htmlInput: { maxLength: MAX_NOTE_LENGTH },
          }}
        />

        {/* Public toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
          }
          label={t("reader.annotations.makePublic")}
          sx={{ mt: 2 }}
        />
        <Typography variant="caption" color="text.secondary" display="block">
          {t("reader.annotations.publicDescription")}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {mode === "create" ? t("common.create") : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
