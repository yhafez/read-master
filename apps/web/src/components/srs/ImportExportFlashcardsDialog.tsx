/**
 * ImportExportFlashcardsDialog Component
 *
 * Dialog for importing flashcards from CSV files or exporting existing
 * flashcards to CSV format. Supports preview, validation, and options.
 */

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  CloudDownload as DownloadIcon,
  CloudUpload as UploadIcon,
  Error as ErrorIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import type { FlashcardType } from "./flashcardDeckTypes";
import type {
  ExportOptions,
  ImportCardResult,
  ImportExportFlashcardsDialogProps,
  ImportState,
  ImportStep,
} from "./flashcardImportExportTypes";
import {
  DEFAULT_EXPORT_OPTIONS,
  downloadCSV,
  downloadCSVTemplate,
  formatFileSize,
  generateCSVContent,
  generateExportFilename,
  getImportSummaryText,
  getSelectedValidCards,
  INITIAL_IMPORT_STATE,
  isValidCSVFile,
  isValidFileSize,
  MAX_FILE_SIZE,
  MAX_IMPORT_ROWS,
  parseCSVContent,
  readFileAsText,
  validateImport,
} from "./flashcardImportExportTypes";

/**
 * Type chip colors
 */
const TYPE_COLORS: Record<
  FlashcardType,
  "primary" | "secondary" | "info" | "warning" | "default"
> = {
  VOCABULARY: "primary",
  CONCEPT: "secondary",
  COMPREHENSION: "info",
  QUOTE: "warning",
  CUSTOM: "default",
};

/**
 * ImportExportFlashcardsDialog Component
 */
export function ImportExportFlashcardsDialog({
  open,
  onClose,
  initialMode = "import",
  books = [],
  cardsToExport = [],
  onImportSuccess,
  onExportSuccess,
}: ImportExportFlashcardsDialogProps) {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = useState<"import" | "export">(initialMode);

  // Import state
  const [importState, setImportState] =
    useState<ImportState>(INITIAL_IMPORT_STATE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS
  );

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    setImportState(INITIAL_IMPORT_STATE);
    setExportOptions(DEFAULT_EXPORT_OPTIONS);
    onClose();
  }, [onClose]);

  // Handle tab change
  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: "import" | "export") => {
      setActiveTab(newValue);
    },
    []
  );

  // Handle file select click
  const handleFileSelectClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file change
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file
      if (!isValidCSVFile(file)) {
        setImportState((prev) => ({
          ...prev,
          error: t("flashcards.importExport.import.errors.invalidFileType"),
        }));
        return;
      }

      if (!isValidFileSize(file)) {
        setImportState((prev) => ({
          ...prev,
          error: t("flashcards.importExport.import.errors.fileTooLarge", {
            maxSize: formatFileSize(MAX_FILE_SIZE),
          }),
        }));
        return;
      }

      // Read and parse file
      setImportState((prev) => ({
        ...prev,
        file,
        isLoading: true,
        error: null,
      }));

      try {
        const content = await readFileAsText(file);
        const rows = parseCSVContent(content);
        const result = validateImport(rows, books);

        // Select all valid rows by default
        const selectedRows = new Set(
          result.rows.filter((r) => r.isValid).map((r) => r.rowNumber)
        );

        setImportState((prev) => ({
          ...prev,
          rawContent: content,
          result,
          isLoading: false,
          step: "preview",
          selectedRows,
        }));
      } catch {
        setImportState((prev) => ({
          ...prev,
          isLoading: false,
          error: t("flashcards.importExport.import.errors.readFailed"),
        }));
      }

      // Reset file input
      event.target.value = "";
    },
    [books, t]
  );

  // Handle drop
  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      // Create a fake event to reuse file change handler
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await handleFileChange(fakeEvent);
    },
    [handleFileChange]
  );

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Toggle row selection
  const toggleRowSelection = useCallback((rowNumber: number) => {
    setImportState((prev) => {
      const newSelected = new Set(prev.selectedRows);
      if (newSelected.has(rowNumber)) {
        newSelected.delete(rowNumber);
      } else {
        newSelected.add(rowNumber);
      }
      return { ...prev, selectedRows: newSelected };
    });
  }, []);

  // Select all valid rows
  const selectAllValidRows = useCallback(() => {
    if (!importState.result) return;
    const validRows = new Set(
      importState.result.rows.filter((r) => r.isValid).map((r) => r.rowNumber)
    );
    setImportState((prev) => ({ ...prev, selectedRows: validRows }));
  }, [importState.result]);

  // Deselect all rows
  const deselectAllRows = useCallback(() => {
    setImportState((prev) => ({ ...prev, selectedRows: new Set() }));
  }, []);

  // Go to confirm step
  const goToConfirm = useCallback(() => {
    setImportState((prev) => ({ ...prev, step: "confirm" }));
  }, []);

  // Go back to preview
  const goToPreview = useCallback(() => {
    setImportState((prev) => ({ ...prev, step: "preview" }));
  }, []);

  // Reset import
  const resetImport = useCallback(() => {
    setImportState(INITIAL_IMPORT_STATE);
  }, []);

  // Handle import
  const handleImport = useCallback(() => {
    if (!importState.result) return;

    const selectedCards = getSelectedValidCards(
      importState.result,
      importState.selectedRows
    );

    // In a real implementation, this would call an API to create the cards
    // For now, we just simulate success
    onImportSuccess?.(selectedCards.length);
    handleClose();
  }, [
    importState.result,
    importState.selectedRows,
    onImportSuccess,
    handleClose,
  ]);

  // Handle export
  const handleExport = useCallback(() => {
    if (cardsToExport.length === 0) return;

    const content = generateCSVContent(cardsToExport, exportOptions);
    const filename = generateExportFilename("flashcards");
    downloadCSV(content, filename);

    onExportSuccess?.();
  }, [cardsToExport, exportOptions, onExportSuccess]);

  // Render import upload step
  const renderUploadStep = () => (
    <Box
      sx={{
        p: 4,
        border: "2px dashed",
        borderColor: "divider",
        borderRadius: 2,
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.2s",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
      onClick={handleFileSelectClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <UploadIcon sx={{ fontSize: 48, color: "action.active", mb: 2 }} />
      <Typography variant="body1" sx={{ mb: 1 }}>
        {t("flashcards.importExport.import.dragOrClick")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("flashcards.importExport.import.supportedFormats")}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: "block" }}
      >
        {t("flashcards.importExport.import.maxSize", {
          maxSize: formatFileSize(MAX_FILE_SIZE),
        })}
      </Typography>
    </Box>
  );

  // Render import preview step
  const renderPreviewStep = () => {
    if (!importState.result) return null;

    const { result, selectedRows } = importState;
    const selectedCount = selectedRows.size;
    const allValidSelected =
      selectedCount === result.rows.filter((r) => r.isValid).length;

    return (
      <Box>
        {/* Summary */}
        <Alert severity={result.canImport ? "info" : "error"} sx={{ mb: 2 }}>
          {getImportSummaryText(result)}
          {result.totalRows === MAX_IMPORT_ROWS && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {t("flashcards.importExport.import.rowsLimited", {
                max: MAX_IMPORT_ROWS,
              })}
            </Typography>
          )}
        </Alert>

        {/* Selection controls */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            size="small"
            onClick={allValidSelected ? deselectAllRows : selectAllValidRows}
          >
            {allValidSelected
              ? t("flashcards.importExport.import.deselectAll")
              : t("flashcards.importExport.import.selectAll")}
          </Button>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: "30px" }}
          >
            {t("flashcards.importExport.import.selectedCount", {
              count: selectedCount,
              total: result.validCount,
            })}
          </Typography>
        </Stack>

        {/* Preview table */}
        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 50 }} />
                <TableCell sx={{ width: 50 }}>#</TableCell>
                <TableCell>
                  {t("flashcards.importExport.columns.front")}
                </TableCell>
                <TableCell>
                  {t("flashcards.importExport.columns.back")}
                </TableCell>
                <TableCell sx={{ width: 120 }}>
                  {t("flashcards.importExport.columns.type")}
                </TableCell>
                <TableCell sx={{ width: 80 }}>
                  {t("flashcards.importExport.columns.status")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.rows.map((row) => (
                <ImportRowPreview
                  key={row.rowNumber}
                  row={row}
                  selected={selectedRows.has(row.rowNumber)}
                  onToggle={() => toggleRowSelection(row.rowNumber)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Render import confirm step
  const renderConfirmStep = () => {
    if (!importState.result) return null;

    const selectedCards = getSelectedValidCards(
      importState.result,
      importState.selectedRows
    );

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("flashcards.importExport.import.confirmMessage", {
            count: selectedCards.length,
          })}
        </Alert>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t("flashcards.importExport.import.summary")}
        </Typography>

        <List dense>
          {selectedCards.slice(0, 5).map((card, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <CheckIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  card.front.substring(0, 50) +
                  (card.front.length > 50 ? "..." : "")
                }
                secondary={card.type}
              />
            </ListItem>
          ))}
          {selectedCards.length > 5 && (
            <ListItem>
              <ListItemText
                primary={t("flashcards.importExport.import.andMore", {
                  count: selectedCards.length - 5,
                })}
              />
            </ListItem>
          )}
        </List>
      </Box>
    );
  };

  // Render import tab content
  const renderImportContent = () => (
    <Box>
      {/* Error message */}
      {importState.error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setImportState((prev) => ({ ...prev, error: null }))}
        >
          {importState.error}
        </Alert>
      )}

      {/* Loading */}
      {importState.isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Step content */}
      {importState.step === "upload" && renderUploadStep()}
      {importState.step === "preview" && renderPreviewStep()}
      {importState.step === "confirm" && renderConfirmStep()}

      {/* Template download */}
      {importState.step === "upload" && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link
            component="button"
            variant="body2"
            onClick={downloadCSVTemplate}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
          >
            <FileDownloadIcon fontSize="small" />
            {t("flashcards.importExport.import.downloadTemplate")}
          </Link>
        </Box>
      )}
    </Box>
  );

  // Render export tab content
  const renderExportContent = () => (
    <Box>
      {cardsToExport.length === 0 ? (
        <Alert severity="info">
          {t("flashcards.importExport.export.noCards")}
        </Alert>
      ) : (
        <>
          {/* Export count */}
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("flashcards.importExport.export.cardCount", {
              count: cardsToExport.length,
            })}
          </Alert>

          {/* Export options */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t("flashcards.importExport.export.options")}
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportOptions.includeStatus}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeStatus: e.target.checked,
                    }))
                  }
                />
              }
              label={t("flashcards.importExport.export.includeStatus")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportOptions.includeStats}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeStats: e.target.checked,
                    }))
                  }
                />
              }
              label={t("flashcards.importExport.export.includeStats")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportOptions.includeCreatedAt}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeCreatedAt: e.target.checked,
                    }))
                  }
                />
              }
              label={t("flashcards.importExport.export.includeCreatedAt")}
            />
          </FormGroup>

          <Divider sx={{ my: 2 }} />

          {/* Delimiter selection */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t("flashcards.importExport.export.delimiter")}
          </Typography>

          <TextField
            select
            size="small"
            value={exportOptions.delimiter}
            onChange={(e) =>
              setExportOptions((prev) => ({
                ...prev,
                delimiter: e.target.value as "," | ";" | "\t",
              }))
            }
            SelectProps={{ native: true }}
            sx={{ minWidth: 150 }}
          >
            <option value=",">
              {t("flashcards.importExport.export.delimiterComma")}
            </option>
            <option value=";">
              {t("flashcards.importExport.export.delimiterSemicolon")}
            </option>
            <option value={"\t"}>
              {t("flashcards.importExport.export.delimiterTab")}
            </option>
          </TextField>
        </>
      )}
    </Box>
  );

  // Get import step label
  const getStepLabel = (step: ImportStep): string => {
    switch (step) {
      case "upload":
        return t("flashcards.importExport.import.steps.upload");
      case "preview":
        return t("flashcards.importExport.import.steps.preview");
      case "confirm":
        return t("flashcards.importExport.import.steps.confirm");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="import-export-dialog-title"
    >
      <DialogTitle id="import-export-dialog-title">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6">
            {t("flashcards.importExport.title")}
          </Typography>
          <IconButton
            aria-label={t("common.close")}
            onClick={handleClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            value="import"
            label={t("flashcards.importExport.tabs.import")}
            icon={<FileUploadIcon />}
            iconPosition="start"
          />
          <Tab
            value="export"
            label={t("flashcards.importExport.tabs.export")}
            icon={<FileDownloadIcon />}
            iconPosition="start"
          />
        </Tabs>

        {/* Step indicator for import */}
        {activeTab === "import" && importState.step !== "upload" && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2 }}
          >
            {getStepLabel(importState.step)}
          </Typography>
        )}

        {/* Tab content */}
        {activeTab === "import" ? renderImportContent() : renderExportContent()}
      </DialogContent>

      <DialogActions>
        {activeTab === "import" ? (
          <>
            {importState.step === "upload" && (
              <Button onClick={handleClose}>{t("common.cancel")}</Button>
            )}
            {importState.step === "preview" && (
              <>
                <Button onClick={resetImport}>{t("common.back")}</Button>
                <Button
                  variant="contained"
                  onClick={goToConfirm}
                  disabled={importState.selectedRows.size === 0}
                >
                  {t("common.next")}
                </Button>
              </>
            )}
            {importState.step === "confirm" && (
              <>
                <Button onClick={goToPreview}>{t("common.back")}</Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleImport}
                  startIcon={<UploadIcon />}
                >
                  {t("flashcards.importExport.import.importButton", {
                    count: importState.selectedRows.size,
                  })}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Button onClick={handleClose}>{t("common.cancel")}</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExport}
              disabled={cardsToExport.length === 0}
              startIcon={<DownloadIcon />}
            >
              {t("flashcards.importExport.export.exportButton")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

/**
 * Import row preview component
 */
type ImportRowPreviewProps = {
  row: ImportCardResult;
  selected: boolean;
  onToggle: () => void;
};

function ImportRowPreview({ row, selected, onToggle }: ImportRowPreviewProps) {
  const { t } = useTranslation();

  const statusIcon = row.isValid ? (
    row.warnings.length > 0 ? (
      <Tooltip title={row.warnings.join(", ")}>
        <WarningIcon color="warning" fontSize="small" />
      </Tooltip>
    ) : (
      <CheckIcon color="success" fontSize="small" />
    )
  ) : (
    <Tooltip title={row.errors.join(", ")}>
      <ErrorIcon color="error" fontSize="small" />
    </Tooltip>
  );

  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.substring(0, maxLen) + "..." : text;

  return (
    <TableRow
      sx={{
        opacity: row.isValid ? 1 : 0.6,
        bgcolor: selected ? "action.selected" : undefined,
      }}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={selected}
          disabled={!row.isValid}
          onChange={onToggle}
          size="small"
        />
      </TableCell>
      <TableCell>{row.rowNumber}</TableCell>
      <TableCell>
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {truncate(row.original.front, 50)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
          {truncate(row.original.back, 50)}
        </Typography>
      </TableCell>
      <TableCell>
        {row.card && (
          <Chip
            label={t(`flashcards.browse.type.${row.card.type.toLowerCase()}`)}
            size="small"
            color={TYPE_COLORS[row.card.type]}
          />
        )}
      </TableCell>
      <TableCell>{statusIcon}</TableCell>
    </TableRow>
  );
}

export default ImportExportFlashcardsDialog;
