/**
 * Text Reader Component
 *
 * Renders plain text, DOC, DOCX, and pasted content with support for:
 * - Scroll-based navigation
 * - Text selection
 * - Highlighting
 * - Position syncing
 * - Responsive layout
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
  Slider,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FormatSize as FontSizeIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ViewWeek as ColumnWidthIcon,
  TextFields as TypographyIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useReaderStore } from "@/stores/readerStore";
import { TypographySettings } from "./TypographySettings";
import { SearchInBook, type SearchMatch } from "./SearchInBook";
import { TTSControls } from "./TTSControls";
import type {
  TextReaderProps,
  TextReaderState,
  TextReaderSelection,
  TextHighlight,
} from "./textTypes";
import {
  INITIAL_TEXT_READER_STATE,
  SCROLL_AMOUNT,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_STEP,
  HIGHLIGHT_COLORS,
  createTextReaderError,
  getTextReaderErrorMessage,
  validateContent,
  calculateLocation,
  parseIntoParagraphs,
  clampFontSize,
  formatPercent,
  getOffsetAtScrollPosition,
  getScrollPositionFromOffset,
} from "./textTypes";

/**
 * TextReader component for rendering text content
 *
 * Note: onHighlightCreate is included in the API for future use when
 * highlight creation UI is implemented. Currently prefixed with underscore
 * to indicate intentional non-use while maintaining API compatibility.
 */
export function TextReader({
  content,
  contentType = "plain",
  initialOffset = 0,
  highlights: externalHighlights = [],
  onLocationChange,
  onTextSelect,
  onError,
  onLoad,
  onHighlightCreate: _onHighlightCreate,
  onHighlightRemove,
}: TextReaderProps): React.ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<TextReaderState>({
    ...INITIAL_TEXT_READER_STATE,
    highlights: externalHighlights,
  });

  // Column width popover anchor
  const [widthAnchorEl, setWidthAnchorEl] = useState<HTMLButtonElement | null>(
    null
  );

  // Typography dialog state
  const [typographyOpen, setTypographyOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);

  // Get reader settings from store
  const { settings, updateSettings } = useReaderStore((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  }));

  const maxWidth = settings.maxWidth || 800; // Default to 800px if not set
  const typography = settings.typography;

  // Update specific state properties
  const updateState = useCallback((updates: Partial<TextReaderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Parse content into paragraphs
  const paragraphs = useMemo(() => parseIntoParagraphs(content), [content]);

  // Update highlights when external highlights change
  useEffect(() => {
    updateState({ highlights: externalHighlights });
  }, [externalHighlights, updateState]);

  // Initialize content
  useEffect(() => {
    if (!validateContent(content)) {
      const error = createTextReaderError(
        "invalid_content",
        "Content is empty or invalid"
      );
      updateState({
        hasError: true,
        errorMessage: getTextReaderErrorMessage(error),
      });
      onError?.(error);
      return;
    }

    // Reset state and set as loaded
    updateState({
      ...INITIAL_TEXT_READER_STATE,
      isLoaded: true,
      highlights: externalHighlights,
      canGoNext: true,
      canGoPrev: initialOffset > 0,
    });

    // Calculate initial location
    const location = calculateLocation(initialOffset, content, paragraphs);
    updateState({ location });

    onLoad?.(content.length);

    // Scroll to initial offset after render
    requestAnimationFrame(() => {
      if (containerRef.current && initialOffset > 0) {
        const scrollPos = getScrollPositionFromOffset(
          initialOffset,
          content.length,
          containerRef.current.scrollHeight
        );
        containerRef.current.scrollTop = scrollPos;
      }
    });
  }, [
    content,
    contentType,
    initialOffset,
    paragraphs,
    externalHighlights,
    onError,
    onLoad,
    updateState,
  ]);

  // Handle scroll position changes
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !state.isLoaded) return;

    // Debounce scroll updates
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const charOffset = getOffsetAtScrollPosition(
        container.scrollTop,
        container.scrollHeight - container.clientHeight,
        content.length
      );

      const location = calculateLocation(charOffset, content, paragraphs);

      // Update navigation state
      const canGoPrev = container.scrollTop > 0;
      const canGoNext =
        container.scrollTop <
        container.scrollHeight - container.clientHeight - 1;

      updateState({ location, canGoPrev, canGoNext });
      onLocationChange?.(location);
    }, 100);
  }, [content, paragraphs, state.isLoaded, onLocationChange, updateState]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
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

    // Calculate character offsets
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const range = selection.getRangeAt(0);
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(contentEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + text.length;

    // Get position for toolbar
    const rect = range.getBoundingClientRect();

    const selectionData: TextReaderSelection = {
      text,
      startOffset,
      endOffset,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
    };

    updateState({ selection: selectionData });
    onTextSelect?.(selectionData);
  }, [onTextSelect, updateState]);

  // Navigation functions
  const goNext = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = container.clientHeight * SCROLL_AMOUNT;
    container.scrollBy({ top: scrollAmount, behavior: "smooth" });
  }, []);

  const goPrev = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = container.clientHeight * SCROLL_AMOUNT;
    container.scrollBy({ top: -scrollAmount, behavior: "smooth" });
  }, []);

  // Font size controls
  const increaseFontSize = useCallback(() => {
    updateState({ fontSize: clampFontSize(state.fontSize + FONT_SIZE_STEP) });
  }, [state.fontSize, updateState]);

  const decreaseFontSize = useCallback(() => {
    updateState({ fontSize: clampFontSize(state.fontSize - FONT_SIZE_STEP) });
  }, [state.fontSize, updateState]);

  // Column width controls
  const handleWidthClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setWidthAnchorEl(event.currentTarget);
    },
    []
  );

  const handleWidthClose = useCallback(() => {
    setWidthAnchorEl(null);
  }, []);

  const handleWidthChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const newWidth = Array.isArray(value) ? value[0] || 0 : value;
      updateSettings({ maxWidth: newWidth });
    },
    [updateSettings]
  );

  const widthOpen = Boolean(widthAnchorEl);

  // Typography dialog handlers
  const handleTypographyOpen = useCallback(() => {
    setTypographyOpen(true);
  }, []);

  const handleTypographyClose = useCallback(() => {
    setTypographyOpen(false);
  }, []);

  // Search handlers
  const handleSearchToggle = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleSearchMatchSelect = useCallback(
    (match: SearchMatch) => {
      // Scroll to the match position
      const container = containerRef.current;
      if (!container) return;

      const scrollPos = getScrollPositionFromOffset(
        match.startOffset,
        content.length,
        container.scrollHeight
      );
      container.scrollTo({ top: scrollPos, behavior: "smooth" });
    },
    [content.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else if (e.key === "End") {
        e.preventDefault();
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Handle mouseup for text selection
  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    return () => document.removeEventListener("mouseup", handleTextSelection);
  }, [handleTextSelection]);

  // Render content with highlights
  const renderContentWithHighlights = useCallback((): React.ReactNode => {
    if (state.highlights.length === 0) {
      return paragraphs.map((para, index) => (
        <Typography
          key={index}
          component="p"
          sx={{
            mb: `${typography.paragraphSpacing}em`,
            fontSize: `${typography.fontSize}px`,
            lineHeight: typography.lineHeight,
            letterSpacing: `${typography.letterSpacing}em`,
            wordSpacing: `${typography.wordSpacing}em`,
            textAlign: typography.textAlign,
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {para}
        </Typography>
      ));
    }

    // Calculate paragraph offsets
    let currentOffset = 0;
    const paraOffsets: { start: number; end: number; text: string }[] = [];

    for (const para of paragraphs) {
      paraOffsets.push({
        start: currentOffset,
        end: currentOffset + para.length,
        text: para,
      });
      currentOffset += para.length + 1; // +1 for newline
    }

    // Render paragraphs with highlights
    return paraOffsets.map((para, paraIndex) => {
      // Find highlights that overlap with this paragraph
      const relevantHighlights = state.highlights.filter(
        (h) => h.startOffset < para.end && h.endOffset > para.start
      );

      if (relevantHighlights.length === 0) {
        return (
          <Typography
            key={paraIndex}
            component="p"
            sx={{
              mb: `${typography.paragraphSpacing}em`,
              fontSize: `${typography.fontSize}px`,
              lineHeight: typography.lineHeight,
              letterSpacing: `${typography.letterSpacing}em`,
              wordSpacing: `${typography.wordSpacing}em`,
              textAlign: typography.textAlign,
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {para.text}
          </Typography>
        );
      }

      // Build segments with and without highlights
      const segments: {
        text: string;
        highlight: TextHighlight | null;
      }[] = [];

      let segmentStart = 0;
      const sortedHighlights = [...relevantHighlights].sort(
        (a, b) => a.startOffset - b.startOffset
      );

      for (const highlight of sortedHighlights) {
        const highlightStartInPara = Math.max(
          0,
          highlight.startOffset - para.start
        );
        const highlightEndInPara = Math.min(
          para.text.length,
          highlight.endOffset - para.start
        );

        // Add non-highlighted segment before this highlight
        if (highlightStartInPara > segmentStart) {
          segments.push({
            text: para.text.slice(segmentStart, highlightStartInPara),
            highlight: null,
          });
        }

        // Add highlighted segment
        segments.push({
          text: para.text.slice(highlightStartInPara, highlightEndInPara),
          highlight,
        });

        segmentStart = highlightEndInPara;
      }

      // Add remaining non-highlighted segment
      if (segmentStart < para.text.length) {
        segments.push({
          text: para.text.slice(segmentStart),
          highlight: null,
        });
      }

      return (
        <Typography
          key={paraIndex}
          component="p"
          sx={{
            mb: `${typography.paragraphSpacing}em`,
            fontSize: `${typography.fontSize}px`,
            lineHeight: typography.lineHeight,
            letterSpacing: `${typography.letterSpacing}em`,
            wordSpacing: `${typography.wordSpacing}em`,
            textAlign: typography.textAlign,
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {segments.map((segment, segIndex) => {
            if (!segment.highlight) {
              return <span key={segIndex}>{segment.text}</span>;
            }

            const highlight = segment.highlight;
            const bgColor = HIGHLIGHT_COLORS[highlight.color];
            return (
              <Box
                key={segIndex}
                component="span"
                sx={{
                  backgroundColor: bgColor,
                  cursor: "pointer",
                  borderRadius: "2px",
                  "&:hover": {
                    opacity: 0.8,
                  },
                }}
                onClick={() => onHighlightRemove?.(highlight.id)}
                title={highlight.note || undefined}
              >
                {segment.text}
              </Box>
            );
          })}
        </Typography>
      );
    });
  }, [paragraphs, state.highlights, typography, onHighlightRemove]);

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
        </Box>

        {/* Separator */}
        <Box
          sx={{ borderLeft: 1, borderColor: "divider", height: 24, mx: 1 }}
        />

        {/* Font size controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <FontSizeIcon fontSize="small" color="action" />
          <Tooltip title={t("reader.decreaseFontSize")}>
            <span>
              <IconButton
                size="small"
                onClick={decreaseFontSize}
                disabled={state.fontSize <= MIN_FONT_SIZE}
                aria-label={t("reader.decreaseFontSize")}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography
            variant="body2"
            sx={{ minWidth: 40, textAlign: "center" }}
          >
            {Math.round(state.fontSize * 100)}%
          </Typography>
          <Tooltip title={t("reader.increaseFontSize")}>
            <span>
              <IconButton
                size="small"
                onClick={increaseFontSize}
                disabled={state.fontSize >= MAX_FONT_SIZE}
                aria-label={t("reader.increaseFontSize")}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Separator */}
        <Box
          sx={{ borderLeft: 1, borderColor: "divider", height: 24, mx: 1 }}
        />

        {/* Column width control */}
        <Tooltip title={t("reader.columnWidth") || "Column Width"}>
          <IconButton
            size="small"
            onClick={handleWidthClick}
            aria-label={t("reader.columnWidth") || "Adjust column width"}
          >
            <ColumnWidthIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Typography settings */}
        <Tooltip title={t("reader.typography") || "Typography"}>
          <IconButton
            size="small"
            onClick={handleTypographyOpen}
            aria-label={t("reader.typography") || "Typography settings"}
          >
            <TypographyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Separator */}
        <Box
          sx={{ borderLeft: 1, borderColor: "divider", height: 24, mx: 1 }}
        />

        {/* Search */}
        <Tooltip title={t("reader.search") || "Search"}>
          <IconButton
            size="small"
            onClick={handleSearchToggle}
            aria-label={t("reader.search") || "Search in book"}
            color={searchOpen ? "primary" : "default"}
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Progress display */}
        <Box sx={{ flex: 1 }} />
        {state.location && (
          <Typography variant="caption" color="text.secondary">
            {t("reader.progress", {
              percent: Math.round(state.location.percentage * 100),
            })}
          </Typography>
        )}
      </Box>

      {/* TTS Controls */}
      <TTSControls text={content} />

      {/* Content container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          bgcolor: "background.paper",
          p: { xs: 2, sm: 3, md: 4 },
        }}
        data-testid="text-container"
      >
        <Box
          ref={contentRef}
          sx={{
            maxWidth: maxWidth === 0 ? "100%" : maxWidth,
            mx: "auto",
            userSelect: "text",
          }}
          data-testid="text-content"
        >
          {renderContentWithHighlights()}
        </Box>
      </Box>

      {/* Column width popover */}
      <Popover
        open={widthOpen}
        anchorEl={widthAnchorEl}
        onClose={handleWidthClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Box sx={{ p: 3, minWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t("reader.columnWidth") || "Column Width"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
            <Typography variant="caption" sx={{ minWidth: 70 }}>
              {maxWidth === 0
                ? t("reader.fullWidth") || "Full"
                : `${maxWidth}px`}
            </Typography>
            <Slider
              value={maxWidth}
              onChange={handleWidthChange}
              min={0}
              max={1400}
              step={50}
              marks={[
                { value: 0, label: t("reader.full") || "Full" },
                { value: 600, label: "600" },
                { value: 800, label: "800" },
                { value: 1000, label: "1000" },
                { value: 1200, label: "1200" },
              ]}
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            {t("reader.columnWidthHelp") ||
              "0 = Full width, 600-1200 = Optimal reading width"}
          </Typography>
        </Box>
      </Popover>

      {/* Typography settings dialog */}
      <Dialog
        open={typographyOpen}
        onClose={handleTypographyClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("reader.typography") || "Typography Settings"}
        </DialogTitle>
        <DialogContent>
          <TypographySettings />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTypographyClose}>
            {t("common.close") || "Close"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search in book */}
      <SearchInBook
        content={content}
        open={searchOpen}
        onClose={handleSearchClose}
        onMatchSelect={handleSearchMatchSelect}
      />

      {/* Bottom progress bar */}
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
            {formatPercent(state.location.percentage)}
          </Typography>
          {state.location.estimatedTotalPages > 0 && (
            <Typography variant="caption" color="text.secondary">
              {t("reader.pageOf", {
                current: state.location.estimatedPage,
                total: state.location.estimatedTotalPages,
              })}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default TextReader;
