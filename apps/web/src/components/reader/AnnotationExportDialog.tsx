/**
 * Dialog for exporting annotations to Markdown or PDF format
 */

import { useState, useCallback, useMemo } from "react";
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
  Checkbox,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Stack,
  FormGroup,
} from "@mui/material";
import {
  FileDownload as DownloadIcon,
  Description as MarkdownIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";

import type { Annotation, AnnotationType } from "./annotationTypes";
import { countAnnotationsByType } from "./annotationTypes";
import type { ExportFormat, ExportOptions } from "./annotationExportTypes";
import {
  generateMarkdownExport,
  generateExportFilename,
  downloadMarkdown,
  downloadBlob,
  validateExportOptions,
  prepareAnnotationsForPdf,
  filterAnnotationsForExport,
  PDF_PAGE,
  getCharsPerLine,
  wrapTextForPdf,
} from "./annotationExportTypes";

export interface AnnotationExportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Annotations to export */
  annotations: Annotation[];
  /** Book title for export header */
  bookTitle: string;
  /** Book author (optional) */
  bookAuthor?: string;
}

/**
 * AnnotationExportDialog - Modal for exporting annotations
 */
export function AnnotationExportDialog({
  open,
  onClose,
  annotations,
  bookTitle,
  bookAuthor,
}: AnnotationExportDialogProps) {
  const { t } = useTranslation();

  // State
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includeTypes, setIncludeTypes] = useState<AnnotationType[]>([
    "HIGHLIGHT",
    "NOTE",
    "BOOKMARK",
  ]);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count annotations by type
  const counts = useMemo(
    () => countAnnotationsByType(annotations),
    [annotations]
  );

  // Calculate preview count
  const previewCount = useMemo(() => {
    const filters = includeTypes.length > 0 ? { types: includeTypes } : {};
    return filterAnnotationsForExport(annotations, filters).length;
  }, [annotations, includeTypes]);

  // Toggle type filter
  const handleTypeToggle = useCallback((type: AnnotationType) => {
    setIncludeTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  // Generate PDF using jsPDF
  const generatePdf = useCallback(
    (options: ExportOptions): Blob => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const { highlights, notes, bookmarks, stats } = prepareAnnotationsForPdf(
        annotations,
        options
      );

      let y = PDF_PAGE.marginTop;
      const charsPerLine = getCharsPerLine(PDF_PAGE.bodyFontSize);

      // Helper to check page break
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > PDF_PAGE.height - PDF_PAGE.marginBottom) {
          doc.addPage();
          y = PDF_PAGE.marginTop;
        }
      };

      // Title
      doc.setFontSize(PDF_PAGE.titleFontSize);
      doc.setFont("helvetica", "bold");
      doc.text(options.bookTitle, PDF_PAGE.marginLeft, y);
      y += PDF_PAGE.lineHeight + 2;

      // Author
      if (options.bookAuthor) {
        doc.setFontSize(PDF_PAGE.bodyFontSize);
        doc.setFont("helvetica", "italic");
        doc.text(`Author: ${options.bookAuthor}`, PDF_PAGE.marginLeft, y);
        y += PDF_PAGE.lineHeight;
      }

      // Divider line
      y += 3;
      doc.setDrawColor(200);
      doc.line(
        PDF_PAGE.marginLeft,
        y,
        PDF_PAGE.width - PDF_PAGE.marginRight,
        y
      );
      y += PDF_PAGE.lineHeight;

      // Stats section
      if (options.includeStats !== false) {
        doc.setFontSize(PDF_PAGE.headingFontSize);
        doc.setFont("helvetica", "bold");
        doc.text("Summary", PDF_PAGE.marginLeft, y);
        y += PDF_PAGE.lineHeight;

        doc.setFontSize(PDF_PAGE.bodyFontSize);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Total Annotations: ${stats.totalAnnotations}`,
          PDF_PAGE.marginLeft,
          y
        );
        y += PDF_PAGE.lineHeight - 1;
        doc.text(`Highlights: ${stats.highlights}`, PDF_PAGE.marginLeft, y);
        y += PDF_PAGE.lineHeight - 1;
        doc.text(`Notes: ${stats.notes}`, PDF_PAGE.marginLeft, y);
        y += PDF_PAGE.lineHeight - 1;
        doc.text(`Bookmarks: ${stats.bookmarks}`, PDF_PAGE.marginLeft, y);
        y += PDF_PAGE.lineHeight + 3;

        doc.line(
          PDF_PAGE.marginLeft,
          y,
          PDF_PAGE.width - PDF_PAGE.marginRight,
          y
        );
        y += PDF_PAGE.lineHeight;
      }

      // Render section helper
      const renderSection = (
        title: string,
        items: Array<{
          index: number;
          typeLabel: string;
          content: string;
          note?: string;
          selectedText?: string;
          colorName?: string;
          date: string;
        }>
      ) => {
        if (items.length === 0) return;

        checkPageBreak(PDF_PAGE.lineHeight * 3);

        // Section title
        doc.setFontSize(PDF_PAGE.headingFontSize);
        doc.setFont("helvetica", "bold");
        doc.text(title, PDF_PAGE.marginLeft, y);
        y += PDF_PAGE.lineHeight + 2;

        // Items
        for (const item of items) {
          checkPageBreak(PDF_PAGE.lineHeight * 5);

          // Item header
          doc.setFontSize(PDF_PAGE.bodyFontSize);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.index}. ${item.typeLabel}`, PDF_PAGE.marginLeft, y);
          y += PDF_PAGE.lineHeight;

          // Content
          doc.setFont("helvetica", "normal");
          const contentLines = wrapTextForPdf(item.content, charsPerLine);
          for (const line of contentLines) {
            checkPageBreak(PDF_PAGE.lineHeight);
            doc.text(line, PDF_PAGE.marginLeft + 5, y);
            y += PDF_PAGE.lineHeight - 1;
          }

          // Note (if different from content)
          if (item.note && item.note !== item.content) {
            doc.setFont("helvetica", "italic");
            doc.text("Note:", PDF_PAGE.marginLeft + 5, y);
            y += PDF_PAGE.lineHeight - 1;
            const noteLines = wrapTextForPdf(item.note, charsPerLine - 5);
            for (const line of noteLines) {
              checkPageBreak(PDF_PAGE.lineHeight);
              doc.text(line, PDF_PAGE.marginLeft + 10, y);
              y += PDF_PAGE.lineHeight - 1;
            }
          }

          // Metadata
          doc.setFontSize(PDF_PAGE.smallFontSize);
          doc.setTextColor(100);
          let meta = `Date: ${item.date}`;
          if (item.colorName) {
            meta += ` | Color: ${item.colorName}`;
          }
          doc.text(meta, PDF_PAGE.marginLeft + 5, y);
          doc.setTextColor(0);
          y += PDF_PAGE.lineHeight + 3;
        }

        // Section divider
        doc.setDrawColor(200);
        doc.line(
          PDF_PAGE.marginLeft,
          y,
          PDF_PAGE.width - PDF_PAGE.marginRight,
          y
        );
        y += PDF_PAGE.lineHeight;
      };

      // Render sections
      renderSection("Highlights", highlights);
      renderSection("Notes", notes);
      renderSection("Bookmarks", bookmarks);

      // Footer
      checkPageBreak(PDF_PAGE.lineHeight * 2);
      doc.setFontSize(PDF_PAGE.smallFontSize);
      doc.setTextColor(128);
      doc.text(
        `Exported from Read Master on ${new Date().toLocaleDateString()}`,
        PDF_PAGE.marginLeft,
        y
      );

      return doc.output("blob");
    },
    [annotations]
  );

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format,
        bookTitle,
        includeToc,
        includeStats,
      };
      if (bookAuthor) {
        options.bookAuthor = bookAuthor;
      }
      if (includeTypes.length > 0) {
        options.filters = { types: includeTypes };
      }

      const validation = validateExportOptions(options);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const filename = generateExportFilename(bookTitle, format);

      if (format === "markdown") {
        const content = generateMarkdownExport(annotations, options);
        downloadMarkdown(content, filename);
      } else {
        const blob = generatePdf(options);
        downloadBlob(blob, filename);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [
    format,
    bookTitle,
    bookAuthor,
    includeToc,
    includeStats,
    includeTypes,
    annotations,
    generatePdf,
    onClose,
  ]);

  return (
    <Dialog
      open={open}
      onClose={isExporting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="export-dialog-title"
    >
      <DialogTitle id="export-dialog-title">
        {t("reader.export.title", "Export Annotations")}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Format Selection */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">
            {t("reader.export.format", "Export Format")}
          </FormLabel>
          <RadioGroup
            row
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            <FormControlLabel
              value="markdown"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <MarkdownIcon fontSize="small" />
                  <span>Markdown (.md)</span>
                </Box>
              }
            />
            <FormControlLabel
              value="pdf"
              control={<Radio />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PdfIcon fontSize="small" />
                  <span>PDF</span>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Type Filters */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">
            {t("reader.export.includeTypes", "Include Annotation Types")}
          </FormLabel>
          <FormGroup row>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeTypes.includes("HIGHLIGHT")}
                  onChange={() => handleTypeToggle("HIGHLIGHT")}
                />
              }
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>
                    {t("reader.annotations.types.highlight", "Highlights")}
                  </span>
                  <Chip
                    size="small"
                    label={counts.HIGHLIGHT}
                    variant="outlined"
                  />
                </Stack>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeTypes.includes("NOTE")}
                  onChange={() => handleTypeToggle("NOTE")}
                />
              }
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{t("reader.annotations.types.note", "Notes")}</span>
                  <Chip size="small" label={counts.NOTE} variant="outlined" />
                </Stack>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeTypes.includes("BOOKMARK")}
                  onChange={() => handleTypeToggle("BOOKMARK")}
                />
              }
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>
                    {t("reader.annotations.types.bookmark", "Bookmarks")}
                  </span>
                  <Chip
                    size="small"
                    label={counts.BOOKMARK}
                    variant="outlined"
                  />
                </Stack>
              }
            />
          </FormGroup>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Export Options */}
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">
            {t("reader.export.options", "Export Options")}
          </FormLabel>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeToc}
                  onChange={(e) => setIncludeToc(e.target.checked)}
                />
              }
              label={t("reader.export.includeToc", "Include table of contents")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeStats}
                  onChange={(e) => setIncludeStats(e.target.checked)}
                />
              }
              label={t(
                "reader.export.includeStats",
                "Include statistics summary"
              )}
            />
          </FormGroup>
        </FormControl>

        {/* Preview Count */}
        <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t("reader.export.previewCount", "Annotations to export:")}{" "}
            <strong>{previewCount}</strong>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={isExporting || previewCount === 0}
          startIcon={
            isExporting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <DownloadIcon />
            )
          }
        >
          {isExporting
            ? t("reader.export.exporting", "Exporting...")
            : t("reader.export.export", "Export")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AnnotationExportDialog;
