/**
 * Flashcard Export Dialog Component
 *
 * Dialog for exporting flashcards to Anki, Quizlet, CSV, and JSON formats.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormGroup,
  Checkbox,
  TextField,
  Stack,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  type FlashcardExportFormat,
  type FlashcardExportOptions,
  exportToAnki,
  exportToQuizlet,
  exportToCSV,
  exportFlashcardsToJSON,
  downloadFile,
  getMimeType,
  getFileExtension,
} from "@/utils/exportUtils";

// ============================================================================
// Types
// ============================================================================

type Flashcard = {
  id: string;
  front: string;
  back: string;
  tags?: string[];
};

type FlashcardExportDialogProps = {
  open: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  deckName?: string;
};

// ============================================================================
// Main Component
// ============================================================================

export function FlashcardExportDialog({
  open,
  onClose,
  flashcards,
  deckName: initialDeckName = "My Deck",
}: FlashcardExportDialogProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [format, setFormat] = useState<FlashcardExportFormat>("anki");
  const [includeTags, setIncludeTags] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [deckName, setDeckName] = useState(initialDeckName);

  const handleExport = (): void => {
    // Convert flashcards to export format
    const exportData = flashcards.map((card) => ({
      front: card.front,
      back: card.back,
      tags: card.tags || [],
    }));

    const options: FlashcardExportOptions = {
      includeTags,
      includeMetadata,
      deckName,
    };

    let exportedContent: string;
    let filename: string;

    switch (format) {
      case "anki":
        exportedContent = exportToAnki(exportData, options);
        filename = `${deckName}${getFileExtension(format)}`;
        break;

      case "quizlet":
        exportedContent = exportToQuizlet(exportData, options);
        filename = `${deckName}${getFileExtension(format)}`;
        break;

      case "csv":
        exportedContent = exportToCSV(exportData, options);
        filename = `${deckName}${getFileExtension(format)}`;
        break;

      case "json":
        exportedContent = exportFlashcardsToJSON(exportData, options);
        filename = `${deckName}${getFileExtension(format)}`;
        break;

      default:
        return;
    }

    // Download the file
    downloadFile(exportedContent, filename, getMimeType(format));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("flashcards.export.title")}</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Info */}
          <Alert severity="info">
            <Typography variant="body2">
              {t("flashcards.export.info", { count: flashcards.length })}
            </Typography>
          </Alert>

          {/* Deck Name */}
          <TextField
            label={t("flashcards.export.deckName")}
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            fullWidth
          />

          {/* Format Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend">{t("export.format")}</FormLabel>
            <RadioGroup
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as FlashcardExportFormat)
              }
            >
              <FormControlLabel
                value="anki"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">
                      {t("flashcards.export.formats.anki")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("flashcards.export.formats.ankiDescription")}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="quizlet"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">
                      {t("flashcards.export.formats.quizlet")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("flashcards.export.formats.quizletDescription")}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="csv"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">
                      {t("flashcards.export.formats.csv")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("flashcards.export.formats.csvDescription")}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="json"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">
                      {t("flashcards.export.formats.json")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("flashcards.export.formats.jsonDescription")}
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Options */}
          <FormControl component="fieldset">
            <FormLabel component="legend">{t("export.options")}</FormLabel>
            <FormGroup>
              {(format === "anki" || format === "csv" || format === "json") && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeTags}
                      onChange={(e) => setIncludeTags(e.target.checked)}
                    />
                  }
                  label={t("flashcards.export.includeTags")}
                />
              )}
              {format === "json" && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                    />
                  }
                  label={t("export.includeMetadata")}
                />
              )}
            </FormGroup>
          </FormControl>

          {/* Format-specific instructions */}
          {format === "anki" && (
            <Alert severity="success">
              <Typography variant="body2">
                <strong>{t("flashcards.export.ankiInstructions.title")}</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                <ol style={{ paddingLeft: "1.5rem", margin: 0 }}>
                  <li>{t("flashcards.export.ankiInstructions.step1")}</li>
                  <li>{t("flashcards.export.ankiInstructions.step2")}</li>
                  <li>{t("flashcards.export.ankiInstructions.step3")}</li>
                </ol>
              </Typography>
            </Alert>
          )}

          {format === "quizlet" && (
            <Alert severity="success">
              <Typography variant="body2">
                <strong>
                  {t("flashcards.export.quizletInstructions.title")}
                </strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                <ol style={{ paddingLeft: "1.5rem", margin: 0 }}>
                  <li>{t("flashcards.export.quizletInstructions.step1")}</li>
                  <li>{t("flashcards.export.quizletInstructions.step2")}</li>
                  <li>{t("flashcards.export.quizletInstructions.step3")}</li>
                </ol>
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={flashcards.length === 0 || !deckName.trim()}
        >
          {t("export.export")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FlashcardExportDialog;
