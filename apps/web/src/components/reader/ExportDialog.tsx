/**
 * Export Dialog Component
 *
 * Dialog for exporting book content and annotations to various formats.
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
  Select,
  MenuItem,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import type { Book } from "@/hooks/useBooks";
import type { Annotation } from "./annotationTypes";
import {
  type ExportFormat,
  type ExportOptions,
  type ExportAnnotation,
  exportToMarkdown,
  exportToHTML,
  exportToJSON,
  downloadFile,
  getMimeType,
  getFileExtension,
} from "@/utils/exportUtils";

// ============================================================================
// Types
// ============================================================================

type ExportDialogProps = {
  open: boolean;
  onClose: () => void;
  book: Book;
};

// ============================================================================
// Main Component
// ============================================================================

export function ExportDialog({
  open,
  onClose,
  book,
}: ExportDialogProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includeAnnotations, setIncludeAnnotations] = useState(true);
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeBookmarks, setIncludeBookmarks] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | "sepia">(
    "light"
  );
  const [isExporting, setIsExporting] = useState(false);

  // Fetch book content
  const {
    data: contentData,
    isLoading: contentLoading,
    error: contentError,
  } = useQuery<{ content: string }, Error>({
    queryKey: ["book", "content", book.id],
    queryFn: async () => {
      const response = await fetch(`/api/books/${book.id}/content`);
      if (!response.ok) {
        throw new Error("Failed to fetch book content");
      }
      return response.json();
    },
    enabled: open,
  });

  // Fetch annotations
  const {
    data: annotationsData,
    isLoading: annotationsLoading,
    error: annotationsError,
  } = useQuery<{ annotations: Annotation[] }, Error>({
    queryKey: ["annotations", book.id],
    queryFn: async () => {
      const response = await fetch(`/api/annotations?bookId=${book.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch annotations");
      }
      return response.json();
    },
    enabled: open && includeAnnotations,
  });

  const handleExport = async (): Promise<void> => {
    if (!contentData) return;

    setIsExporting(true);

    try {
      const content = contentData.content;
      const rawAnnotations = annotationsData?.annotations || [];

      // Transform annotations to export format
      const annotations: ExportAnnotation[] = rawAnnotations.map((ann) => {
        const exp: ExportAnnotation = {
          id: ann.id,
          type: ann.type,
          createdAt: ann.createdAt,
        };
        if ("selectedText" in ann && ann.selectedText) {
          exp.text = ann.selectedText;
        }
        if (ann.note) {
          exp.note = ann.note;
        }
        if ("color" in ann && ann.color) {
          exp.color = ann.color;
        }
        return exp;
      });

      const options: ExportOptions = {
        includeAnnotations,
        includeHighlights,
        includeNotes,
        includeBookmarks,
        includeMetadata,
        colorScheme,
      };

      let exportedContent: string;
      let filename: string;

      switch (format) {
        case "markdown":
          exportedContent = exportToMarkdown(
            book,
            content,
            annotations,
            options
          );
          filename = `${book.title}${getFileExtension(format)}`;
          break;

        case "html":
          exportedContent = exportToHTML(book, content, annotations, options);
          filename = `${book.title}${getFileExtension(format)}`;
          break;

        case "json":
          exportedContent = exportToJSON(book, content, annotations, options);
          filename = `${book.title}${getFileExtension(format)}`;
          break;

        case "pdf":
        case "epub":
          // For PDF and EPUB, we need to use the backend API
          await exportViaBackend(format);
          return;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Download the file
      downloadFile(exportedContent, filename, getMimeType(format));
      onClose();
    } catch {
      // Error handled by UI state
    } finally {
      setIsExporting(false);
    }
  };

  const exportViaBackend = async (
    exportFormat: "pdf" | "epub"
  ): Promise<void> => {
    const options: ExportOptions = {
      includeAnnotations,
      includeHighlights,
      includeNotes,
      includeBookmarks,
      includeMetadata,
      colorScheme,
    };

    const response = await fetch(`/api/books/${book.id}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        format: exportFormat,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    // Download the file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${book.title}${getFileExtension(exportFormat)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  const isLoading =
    contentLoading || (includeAnnotations && annotationsLoading);
  const error = contentError || annotationsError;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("export.title")}</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Loading State */}
          {isLoading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error">{error.message || t("export.error")}</Alert>
          )}

          {/* Format Selection */}
          {!isLoading && !error && (
            <>
              <FormControl component="fieldset">
                <FormLabel component="legend">{t("export.format")}</FormLabel>
                <RadioGroup
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                >
                  <FormControlLabel
                    value="markdown"
                    control={<Radio />}
                    label={t("export.formats.markdown")}
                  />
                  <FormControlLabel
                    value="html"
                    control={<Radio />}
                    label={t("export.formats.html")}
                  />
                  <FormControlLabel
                    value="pdf"
                    control={<Radio />}
                    label={t("export.formats.pdf")}
                  />
                  <FormControlLabel
                    value="epub"
                    control={<Radio />}
                    label={t("export.formats.epub")}
                  />
                  <FormControlLabel
                    value="json"
                    control={<Radio />}
                    label={t("export.formats.json")}
                  />
                </RadioGroup>
              </FormControl>

              {/* Options */}
              <FormControl component="fieldset">
                <FormLabel component="legend">{t("export.options")}</FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                      />
                    }
                    label={t("export.includeMetadata")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeAnnotations}
                        onChange={(e) =>
                          setIncludeAnnotations(e.target.checked)
                        }
                      />
                    }
                    label={t("export.includeAnnotations")}
                  />
                  {includeAnnotations && (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={includeHighlights}
                            onChange={(e) =>
                              setIncludeHighlights(e.target.checked)
                            }
                            sx={{ ml: 3 }}
                          />
                        }
                        label={t("export.includeHighlights")}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={includeNotes}
                            onChange={(e) => setIncludeNotes(e.target.checked)}
                            sx={{ ml: 3 }}
                          />
                        }
                        label={t("export.includeNotes")}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={includeBookmarks}
                            onChange={(e) =>
                              setIncludeBookmarks(e.target.checked)
                            }
                            sx={{ ml: 3 }}
                          />
                        }
                        label={t("export.includeBookmarks")}
                      />
                    </>
                  )}
                </FormGroup>
              </FormControl>

              {/* Color Scheme (for HTML/PDF only) */}
              {(format === "html" || format === "pdf") && (
                <FormControl fullWidth>
                  <FormLabel>{t("export.colorScheme")}</FormLabel>
                  <Select
                    value={colorScheme}
                    onChange={(e) =>
                      setColorScheme(
                        e.target.value as "light" | "dark" | "sepia"
                      )
                    }
                  >
                    <MenuItem value="light">{t("theme.light")}</MenuItem>
                    <MenuItem value="dark">{t("theme.dark")}</MenuItem>
                    <MenuItem value="sepia">{t("theme.sepia")}</MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* Info */}
              <Alert severity="info">
                <Typography variant="body2">{t("export.info")}</Typography>
              </Alert>
            </>
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
          startIcon={
            isExporting ? <CircularProgress size={20} /> : <DownloadIcon />
          }
          disabled={isLoading || isExporting || Boolean(error)}
        >
          {isExporting ? t("export.exporting") : t("export.export")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportDialog;
