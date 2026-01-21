/**
 * Reader page for displaying book content
 *
 * Handles EPUB, PDF, and text-based formats with appropriate readers.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EpubReader, PdfReader, TextReader } from "@/components/reader";
import { useBook, useBookContent } from "@/hooks/useBooks";
import type {
  EpubLocation,
  TocItem,
  TextSelection,
  PdfLocation,
  PdfTextSelection,
  TextLocation,
  TextReaderSelection,
} from "@/components/reader";
import { useReaderStore } from "@/stores/readerStore";

/**
 * Get file format from book fileType
 */
function getBookFormat(
  fileType: string | null | undefined
): "epub" | "pdf" | "txt" | "doc" | "docx" {
  if (!fileType) return "txt";
  const type = fileType.toLowerCase();
  if (type === "epub") return "epub";
  if (type === "pdf") return "pdf";
  if (type === "doc") return "doc";
  if (type === "docx") return "docx";
  return "txt";
}

/**
 * Check if a format is text-based (needs content string)
 */
function isTextBasedFormat(format: string): boolean {
  return format === "txt" || format === "doc" || format === "docx";
}

/**
 * Reader page component
 */
export function ReaderPage(): React.ReactElement {
  const { t } = useTranslation();
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  // Reader store
  const { isFullscreen, toggleFullscreen, setSelectedText, updatePosition } =
    useReaderStore();

  // Local state
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  // Fetch book metadata
  const {
    data: book,
    isLoading: isLoadingBook,
    error: bookError,
  } = useBook(bookId || "");

  // Determine if we need to fetch content (for text-based formats)
  const format = book ? getBookFormat(book.fileType) : "epub";
  const needsContentFetch = book && isTextBasedFormat(format);

  // Fetch book content
  const {
    data: bookContent,
    isLoading: isLoadingContent,
    error: contentError,
  } = useBookContent(bookId || "", {
    enabled: !!needsContentFetch,
  });

  // Combine loading and error states
  const isLoading = isLoadingBook || (needsContentFetch && isLoadingContent);
  const error = bookError || contentError;

  // Handle EPUB location change from reader
  const handleEpubLocationChange = useCallback(
    (location: EpubLocation) => {
      // Update store position (uses percentage * 100 as position)
      updatePosition(Math.round(location.percentage * 100), location.cfi);

      // TODO: Sync to backend with debounce
    },
    [updatePosition]
  );

  // Handle PDF location change from reader
  const handlePdfLocationChange = useCallback(
    (location: PdfLocation) => {
      // Update store position (uses percentage * 100 as position)
      updatePosition(
        Math.round(location.percentage * 100),
        `page:${location.pageNumber}`
      );

      // TODO: Sync to backend with debounce
    },
    [updatePosition]
  );

  // Handle EPUB text selection
  const handleEpubTextSelect = useCallback(
    (selection: TextSelection) => {
      setSelectedText(selection.text);
      // TODO: Show annotation toolbar
    },
    [setSelectedText]
  );

  // Handle PDF text selection
  const handlePdfTextSelect = useCallback(
    (selection: PdfTextSelection) => {
      setSelectedText(selection.text);
      // TODO: Show annotation toolbar
    },
    [setSelectedText]
  );

  // Handle Text reader location change
  const handleTextLocationChange = useCallback(
    (location: TextLocation) => {
      // Update store position (uses percentage * 100 as position)
      updatePosition(
        Math.round(location.percentage * 100),
        `offset:${location.charOffset}`
      );

      // TODO: Sync to backend with debounce
    },
    [updatePosition]
  );

  // Handle Text reader text selection
  const handleTextTextSelect = useCallback(
    (selection: TextReaderSelection) => {
      setSelectedText(selection.text);
      // TODO: Show annotation toolbar
    },
    [setSelectedText]
  );

  // Handle EPUB book load
  const handleEpubLoad = useCallback((loadedToc: TocItem[]) => {
    setToc(loadedToc);
  }, []);

  // Handle PDF book load
  const handlePdfLoad = useCallback((_totalPages: number) => {
    // PDFs don't have a TOC in the same way as EPUBs
    // We could potentially extract bookmarks/outlines in the future
    setToc([]);
  }, []);

  // Handle reader error
  const handleError = useCallback((_err: Error) => {
    // Error logging would be handled by a proper logging service in production
    // TODO: Show error toast
  }, []);

  // Go back to library
  const handleBack = useCallback(() => {
    navigate("/library");
  }, [navigate]);

  // Toggle sidebar
  const handleToggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Sync fullscreen state with actual document state
      if (!document.fullscreenElement && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullscreen, toggleFullscreen]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      });
    } else {
      document.exitFullscreen().catch(() => {
        // Exit fullscreen failed
      });
    }
    toggleFullscreen();
  }, [toggleFullscreen]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {t("common.loading")}
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error || (!isLoading && !book)) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || t("common.error")}
        </Alert>
        <IconButton onClick={handleBack} color="primary">
          <BackIcon />
          <Typography variant="button" sx={{ ml: 1 }}>
            {t("reader.backToLibrary")}
          </Typography>
        </IconButton>
      </Box>
    );
  }

  // Must have book to render
  if (!book) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Get content URL for EPUB/PDF
  const contentUrl = `/api/books/${book.id}/content`;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Header toolbar */}
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
        }}
      >
        <Tooltip title={t("reader.backToLibrary")}>
          <IconButton
            onClick={handleBack}
            edge="start"
            aria-label={t("reader.backToLibrary")}
          >
            <BackIcon />
          </IconButton>
        </Tooltip>

        <Typography
          variant="subtitle1"
          component="h1"
          sx={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {book.title}
        </Typography>

        <Tooltip title={t("reader.tableOfContents")}>
          <IconButton
            onClick={handleToggleSidebar}
            aria-label={t("reader.tableOfContents")}
            aria-expanded={showSidebar}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        <Tooltip
          title={isFullscreen ? t("common.close") : t("reader.settings")}
        >
          <IconButton onClick={handleFullscreen} aria-label="Toggle fullscreen">
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main content area */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar (TOC) */}
        {showSidebar && (
          <Box
            sx={{
              width: { xs: "100%", sm: 280 },
              borderRight: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "auto",
              position: { xs: "absolute", sm: "relative" },
              zIndex: { xs: 10, sm: "auto" },
              height: { xs: "calc(100% - 56px)", sm: "auto" },
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t("reader.tableOfContents")}
              </Typography>
              {toc.length > 0 ? (
                <Box component="nav" aria-label={t("reader.tableOfContents")}>
                  {toc.map((item) => (
                    <Typography
                      key={item.id}
                      variant="body2"
                      sx={{
                        py: 0.5,
                        cursor: "pointer",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      {item.label}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("common.loading")}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Reader content */}
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          {format === "epub" && (
            <EpubReader
              url={contentUrl}
              onLocationChange={handleEpubLocationChange}
              onTextSelect={handleEpubTextSelect}
              onLoad={handleEpubLoad}
              onError={handleError}
            />
          )}
          {format === "pdf" && (
            <PdfReader
              url={contentUrl}
              onLocationChange={handlePdfLocationChange}
              onTextSelect={handlePdfTextSelect}
              onLoad={handlePdfLoad}
              onError={handleError}
            />
          )}
          {isTextBasedFormat(format) && bookContent && (
            <TextReader
              content={bookContent}
              contentType={
                format === "docx" ? "docx" : format === "doc" ? "doc" : "plain"
              }
              initialOffset={0}
              onLocationChange={handleTextLocationChange}
              onTextSelect={handleTextTextSelect}
              onError={handleError}
            />
          )}
          {isTextBasedFormat(format) && !bookContent && isLoadingContent && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                {t("common.loading")}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ReaderPage;
