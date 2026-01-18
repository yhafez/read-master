/**
 * PDF Reader Component
 *
 * Renders PDF files using PDF.js with support for:
 * - Page navigation
 * - Zoom controls
 * - Text selection
 * - Responsive layout
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type {
  PdfReaderProps,
  PdfReaderState,
  PdfLocation,
  PdfTextSelection,
} from "./pdfTypes";
import {
  INITIAL_PDF_READER_STATE,
  createPdfError,
  getPdfErrorMessage,
  validatePdfUrl,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  clampZoom,
  formatZoomPercent,
} from "./pdfTypes";

// Configure PDF.js worker - use CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * PdfReader component for rendering PDF files
 */
export function PdfReader({
  url,
  initialPage = 1,
  initialScale = 1.0,
  onLocationChange,
  onTextSelect,
  onError,
  onLoad,
}: PdfReaderProps): React.ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const currentPageRef = useRef<PDFPageProxy | null>(null);
  const renderTaskRef = useRef<ReturnType<PDFPageProxy["render"]> | null>(null);

  const [state, setState] = useState<PdfReaderState>({
    ...INITIAL_PDF_READER_STATE,
    scale: clampZoom(initialScale),
  });
  const [pageInput, setPageInput] = useState(String(initialPage));

  // Update specific state properties
  const updateState = useCallback((updates: Partial<PdfReaderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Update location and notify parent
  const updateLocation = useCallback(
    (pageNumber: number, totalPages: number) => {
      const location: PdfLocation = {
        pageNumber,
        totalPages,
        percentage: totalPages > 0 ? (pageNumber - 1) / totalPages : 0,
      };

      updateState({
        location,
        canGoPrev: pageNumber > 1,
        canGoNext: pageNumber < totalPages,
      });

      onLocationChange?.(location);
    },
    [onLocationChange, updateState]
  );

  // Render a specific page
  const renderPage = useCallback(
    async (pageNumber: number) => {
      const pdfDoc = pdfDocRef.current;
      const canvas = canvasRef.current;
      const textLayer = textLayerRef.current;

      if (!pdfDoc || !canvas) return;

      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        currentPageRef.current = page;

        const viewport = page.getViewport({ scale: state.scale });

        // Set canvas dimensions
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        // Clear previous content
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Render page
        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        // Render text layer for selection
        if (textLayer) {
          // Clear previous text layer
          textLayer.innerHTML = "";
          textLayer.style.width = `${viewport.width}px`;
          textLayer.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();

          // Render text items
          textContent.items.forEach((item) => {
            if ("str" in item && item.str) {
              const textItem = item as { str: string; transform?: number[] };
              const tx = textItem.transform;

              // Ensure we have a valid transform array with at least 6 elements
              if (!tx || tx.length < 6) return;

              const span = document.createElement("span");
              span.textContent = textItem.str;

              // Position the text using transform
              // tx[0-3] contain rotation/scaling, tx[4-5] contain position
              const scaleX = tx[0] ?? 1;
              const scaleY = tx[1] ?? 0;
              const posX = tx[4] ?? 0;
              const posY = tx[5] ?? 0;

              const fontSize =
                Math.sqrt(scaleX * scaleX + scaleY * scaleY) * state.scale;

              span.style.position = "absolute";
              span.style.left = `${posX * state.scale}px`;
              span.style.top = `${viewport.height - posY * state.scale}px`;
              span.style.fontSize = `${fontSize}px`;
              span.style.fontFamily = "sans-serif";
              span.style.color = "transparent";
              span.style.whiteSpace = "pre";

              textLayer.appendChild(span);
            }
          });
        }

        // Update location
        updateLocation(pageNumber, pdfDoc.numPages);
        setPageInput(String(pageNumber));
      } catch (err) {
        // Ignore cancelled render tasks
        if (err instanceof Error && err.message === "Rendering cancelled") {
          return;
        }

        const error = createPdfError(
          "render_failed",
          err instanceof Error ? err.message : "Unknown error"
        );
        updateState({
          hasError: true,
          errorMessage: getPdfErrorMessage(error),
        });
        onError?.(error);
      }
    },
    [state.scale, updateLocation, updateState, onError]
  );

  // Initialize PDF document
  useEffect(() => {
    if (!url) return;

    // Validate URL
    if (!validatePdfUrl(url)) {
      const error = createPdfError("invalid_url", "Invalid PDF URL");
      updateState({
        hasError: true,
        errorMessage: getPdfErrorMessage(error),
      });
      onError?.(error);
      return;
    }

    // Reset state
    updateState(INITIAL_PDF_READER_STATE);

    const loadDocument = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        pdfDocRef.current = pdfDoc;

        updateState({
          isLoaded: true,
        });

        onLoad?.(pdfDoc.numPages);

        // Render initial page
        const startPage = Math.max(1, Math.min(initialPage, pdfDoc.numPages));
        await renderPage(startPage);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        let errorType: "load_failed" | "password_required" | "corrupted_file" =
          "load_failed";

        if (errorMessage.includes("password")) {
          errorType = "password_required";
        } else if (
          errorMessage.includes("Invalid") ||
          errorMessage.includes("corrupt")
        ) {
          errorType = "corrupted_file";
        }

        const error = createPdfError(errorType, errorMessage);
        updateState({
          hasError: true,
          errorMessage: getPdfErrorMessage(error),
        });
        onError?.(error);
      }
    };

    loadDocument();

    // Cleanup
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      currentPageRef.current = null;
    };
  }, [url, initialPage, onError, onLoad, updateState, renderPage]);

  // Re-render on scale change
  useEffect(() => {
    if (state.isLoaded && state.location) {
      renderPage(state.location.pageNumber);
    }
  }, [state.scale, state.isLoaded, state.location, renderPage]);

  // Navigation functions
  const goToPage = useCallback(
    (pageNumber: number) => {
      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc) return;

      const validPage = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
      renderPage(validPage);
    },
    [renderPage]
  );

  const goNext = useCallback(() => {
    if (state.location && state.canGoNext) {
      goToPage(state.location.pageNumber + 1);
    }
  }, [state.location, state.canGoNext, goToPage]);

  const goPrev = useCallback(() => {
    if (state.location && state.canGoPrev) {
      goToPage(state.location.pageNumber - 1);
    }
  }, [state.location, state.canGoPrev, goToPage]);

  const goToFirst = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLast = useCallback(() => {
    const pdfDoc = pdfDocRef.current;
    if (pdfDoc) {
      goToPage(pdfDoc.numPages);
    }
  }, [goToPage]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    updateState({ scale: clampZoom(state.scale + ZOOM_STEP) });
  }, [state.scale, updateState]);

  const zoomOut = useCallback(() => {
    updateState({ scale: clampZoom(state.scale - ZOOM_STEP) });
  }, [state.scale, updateState]);

  const setZoom = useCallback(
    (newScale: number) => {
      updateState({ scale: clampZoom(newScale) });
    },
    [updateState]
  );

  // Handle page input
  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPageInput(e.target.value);
    },
    []
  );

  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const pageNum = parseInt(pageInput, 10);
        if (!isNaN(pageNum)) {
          goToPage(pageNum);
        }
      }
    },
    [pageInput, goToPage]
  );

  const handlePageInputBlur = useCallback(() => {
    // Reset to current page if invalid
    if (state.location) {
      setPageInput(String(state.location.pageNumber));
    }
  }, [state.location]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (!textLayerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      updateState({ selection: null });
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      updateState({ selection: null });
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const selectionData: PdfTextSelection = {
      text,
      pageNumber: state.location?.pageNumber || 1,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
    };

    updateState({ selection: selectionData });
    onTextSelect?.(selectionData);
  }, [state.location, onTextSelect, updateState]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToFirst();
      } else if (e.key === "End") {
        e.preventDefault();
        goToLast();
      } else if (e.key === "+" || e.key === "=") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomIn();
        }
      } else if (e.key === "-") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomOut();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, goToFirst, goToLast, zoomIn, zoomOut]);

  // Handle mouseup for text selection
  useEffect(() => {
    const textLayer = textLayerRef.current;
    if (!textLayer) return;

    textLayer.addEventListener("mouseup", handleTextSelection);
    return () => textLayer.removeEventListener("mouseup", handleTextSelection);
  }, [handleTextSelection]);

  // Error state
  if (state.hasError) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 400,
          p: 3,
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          {t("common.error")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {state.errorMessage}
        </Typography>
      </Box>
    );
  }

  // Loading state
  if (!state.isLoaded) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 400,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t("common.loading")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexWrap: "wrap",
        }}
      >
        {/* Navigation controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={t("reader.firstPage")}>
            <span>
              <IconButton
                size="small"
                onClick={goToFirst}
                disabled={!state.canGoPrev}
                aria-label={t("reader.firstPage")}
              >
                <FirstPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={t("common.previous")}>
            <span>
              <IconButton
                size="small"
                onClick={goPrev}
                disabled={!state.canGoPrev}
                aria-label={t("common.previous")}
              >
                <PrevIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            size="small"
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={handlePageInputKeyDown}
            onBlur={handlePageInputBlur}
            inputProps={{
              style: { width: 40, textAlign: "center" },
              "aria-label": t("reader.pageNumber"),
            }}
          />
          <Typography variant="body2" color="text.secondary">
            / {state.location?.totalPages || 0}
          </Typography>

          <Tooltip title={t("common.next")}>
            <span>
              <IconButton
                size="small"
                onClick={goNext}
                disabled={!state.canGoNext}
                aria-label={t("common.next")}
              >
                <NextIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={t("reader.lastPage")}>
            <span>
              <IconButton
                size="small"
                onClick={goToLast}
                disabled={!state.canGoNext}
                aria-label={t("reader.lastPage")}
              >
                <LastPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Separator */}
        <Box
          sx={{ borderLeft: 1, borderColor: "divider", height: 24, mx: 1 }}
        />

        {/* Zoom controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={t("reader.zoomOut")}>
            <span>
              <IconButton
                size="small"
                onClick={zoomOut}
                disabled={state.scale <= MIN_ZOOM}
                aria-label={t("reader.zoomOut")}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Select
            size="small"
            value={state.scale}
            onChange={(e) => setZoom(Number(e.target.value))}
            sx={{ minWidth: 80 }}
            aria-label={t("reader.zoomLevel")}
          >
            <MenuItem value={0.5}>50%</MenuItem>
            <MenuItem value={0.75}>75%</MenuItem>
            <MenuItem value={1.0}>100%</MenuItem>
            <MenuItem value={1.25}>125%</MenuItem>
            <MenuItem value={1.5}>150%</MenuItem>
            <MenuItem value={2.0}>200%</MenuItem>
          </Select>

          <Tooltip title={t("reader.zoomIn")}>
            <span>
              <IconButton
                size="small"
                onClick={zoomIn}
                disabled={state.scale >= MAX_ZOOM}
                aria-label={t("reader.zoomIn")}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Progress display */}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {state.location && formatZoomPercent(state.scale)}
        </Typography>
      </Box>

      {/* PDF container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          bgcolor: "grey.100",
          display: "flex",
          justifyContent: "center",
          p: 2,
        }}
        data-testid="pdf-container"
      >
        <Box sx={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            style={{ display: "block" }}
            data-testid="pdf-canvas"
          />
          {/* Text layer for selection */}
          <Box
            ref={textLayerRef}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              overflow: "hidden",
              userSelect: "text",
              "& span": {
                position: "absolute",
              },
            }}
            data-testid="pdf-text-layer"
          />
        </Box>
      </Box>

      {/* Bottom progress bar */}
      {state.location && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 0.5,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {t("reader.progress", {
              percent: Math.round(
                ((state.location.pageNumber - 1) /
                  Math.max(1, state.location.totalPages - 1)) *
                  100
              ),
            })}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default PdfReader;
