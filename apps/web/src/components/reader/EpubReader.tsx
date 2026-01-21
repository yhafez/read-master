/**
 * EPUB Reader Component
 *
 * Renders EPUB files using epub.js with support for:
 * - Page/continuous navigation
 * - Text selection
 * - Position syncing
 * - Responsive layout
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Typography, IconButton } from "@mui/material";
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useReaderStore } from "@/stores/readerStore";
import ePub from "epubjs";
import type { Book, Rendition, NavItem } from "epubjs";
import type {
  EpubReaderProps,
  EpubReaderState,
  EpubLocation,
  TocItem,
  TextSelection,
} from "./types";
import {
  INITIAL_READER_STATE,
  createReaderError,
  getErrorMessage,
  validateEpubUrl,
  DEFAULT_EPUB_STYLES,
} from "./types";

/**
 * Convert epub.js NavItem to TocItem
 */
function convertNavToToc(navItems: NavItem[]): TocItem[] {
  return navItems.map((item) => ({
    id: item.id || item.href,
    label: item.label,
    href: item.href,
    subitems: item.subitems ? convertNavToToc(item.subitems) : [],
  }));
}

/**
 * EpubReader component for rendering EPUB files
 */
export function EpubReader({
  url,
  initialCfi,
  onLocationChange,
  onTextSelect,
  onError,
  onLoad,
}: EpubReaderProps): React.ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  // Get reading mode from store
  const readingMode = useReaderStore((state) => state.settings.readingMode);

  const [state, setState] = useState<EpubReaderState>(INITIAL_READER_STATE);

  // Update specific state properties
  const updateState = useCallback((updates: Partial<EpubReaderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle location change from epub.js
  const handleLocationChange = useCallback(
    (loc: {
      start: { cfi: string; displayed: { page: number; total: number } };
      end: { cfi: string };
    }) => {
      if (!bookRef.current) return;

      const book = bookRef.current;
      const spine = book.spine;

      // Calculate percentage
      let percentage = 0;
      if (spine && "spineByHref" in spine) {
        const startCfi = loc.start.cfi;
        // Get location percentage from the book
        const locationData = book.locations;
        if (locationData && "percentageFromCfi" in locationData) {
          const percentFn = locationData.percentageFromCfi as (
            cfi: string
          ) => number;
          percentage = percentFn(startCfi) || 0;
        }
      }

      const location: EpubLocation = {
        cfi: loc.start.cfi,
        percentage,
        chapter: 0, // Will be updated if we have spine info
        totalPages: loc.start.displayed.total,
        currentPage: loc.start.displayed.page,
      };

      updateState({
        location,
        canGoPrev: true,
        canGoNext: true,
      });

      onLocationChange?.(location);
    },
    [onLocationChange, updateState]
  );

  // Handle text selection
  const handleTextSelection = useCallback(
    (cfiRange: string, contents: { window: Window }) => {
      const selection = contents.window.getSelection();
      if (!selection || selection.isCollapsed) {
        updateState({ selection: null });
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        updateState({ selection: null });
        return;
      }

      // Get selection position for popover
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const selectionData: TextSelection = {
        text,
        cfiRange,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
      };

      updateState({ selection: selectionData });
      onTextSelect?.(selectionData);
    },
    [onTextSelect, updateState]
  );

  // Initialize EPUB
  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Validate URL
    if (!validateEpubUrl(url)) {
      const error = createReaderError("invalid_url", "Invalid EPUB URL");
      updateState({
        hasError: true,
        errorMessage: getErrorMessage(error),
      });
      onError?.(error);
      return;
    }

    // Reset state
    updateState(INITIAL_READER_STATE);

    // Initialize book
    const book = ePub(url);
    bookRef.current = book;

    // Create rendition with spread mode based on settings
    // "spread" mode shows two pages side-by-side for desktop reading
    const rendition = book.renderTo(containerRef.current, {
      width: "100%",
      height: "100%",
      spread: readingMode === "spread" ? "auto" : "none",
      flow: readingMode === "scroll" ? "scrolled" : "paginated",
    });
    renditionRef.current = rendition;

    // Apply default styles
    Object.entries(DEFAULT_EPUB_STYLES).forEach(([selector, styles]) => {
      rendition.themes.default({
        [selector]: styles as Record<string, string>,
      });
    });

    // Set up event listeners
    rendition.on("relocated", handleLocationChange);
    rendition.on("selected", handleTextSelection);

    // Load and display
    const loadBook = async () => {
      try {
        // Generate locations for accurate progress tracking
        await book.ready;
        await book.locations.generate(1024);

        // Get table of contents
        const navigation = await book.loaded.navigation;
        const toc = convertNavToToc(navigation.toc);

        // Display the book
        if (initialCfi) {
          await rendition.display(initialCfi);
        } else {
          await rendition.display();
        }

        updateState({
          isLoaded: true,
          toc,
          canGoPrev: true,
          canGoNext: true,
        });

        onLoad?.(toc);
      } catch (err) {
        const error = createReaderError(
          "load_failed",
          err instanceof Error ? err.message : "Unknown error"
        );
        updateState({
          hasError: true,
          errorMessage: getErrorMessage(error),
        });
        onError?.(error);
      }
    };

    loadBook();

    // Cleanup
    return () => {
      rendition.off("relocated", handleLocationChange);
      rendition.off("selected", handleTextSelection);
      book.destroy();
      bookRef.current = null;
      renditionRef.current = null;
    };
  }, [
    url,
    initialCfi,
    readingMode,
    handleLocationChange,
    handleTextSelection,
    onError,
    onLoad,
    updateState,
  ]);

  // Navigation functions
  const goNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const goPrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

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
        position: "relative",
      }}
    >
      {/* Reader container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 400,
          bgcolor: "background.paper",
          "& iframe": {
            border: "none",
          },
        }}
        data-testid="epub-container"
      />

      {/* Navigation overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          pointerEvents: "none",
        }}
      >
        {/* Previous page button */}
        <Box
          sx={{
            width: "15%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            pl: 1,
            pointerEvents: "auto",
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.02)",
            },
          }}
          onClick={goPrev}
          role="button"
          tabIndex={0}
          aria-label={t("common.previous")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goPrev();
            }
          }}
        >
          <IconButton
            size="large"
            disabled={!state.canGoPrev}
            sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
            aria-hidden="true"
            tabIndex={-1}
          >
            <PrevIcon />
          </IconButton>
        </Box>

        {/* Spacer - clicks pass through to epub content */}
        <Box sx={{ flex: 1 }} />

        {/* Next page button */}
        <Box
          sx={{
            width: "15%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            pr: 1,
            pointerEvents: "auto",
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.02)",
            },
          }}
          onClick={goNext}
          role="button"
          tabIndex={0}
          aria-label={t("common.next")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goNext();
            }
          }}
        >
          <IconButton
            size="large"
            disabled={!state.canGoNext}
            sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
            aria-hidden="true"
            tabIndex={-1}
          >
            <NextIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Progress indicator */}
      {state.location && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            py: 1,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {t("reader.progress", {
              percent: Math.round(state.location.percentage * 100),
            })}
          </Typography>
          {state.location.totalPages > 0 && (
            <Typography variant="caption" color="text.secondary">
              {state.location.currentPage} / {state.location.totalPages}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default EpubReader;
