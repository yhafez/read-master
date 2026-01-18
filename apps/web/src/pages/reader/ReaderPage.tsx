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
import { EpubReader } from "@/components/reader";
import type { EpubLocation, TocItem, TextSelection } from "@/components/reader";
import { useReaderStore } from "@/stores/readerStore";

/**
 * Mock function to get book data (will be replaced with React Query)
 */
function useMockBookData(bookId: string | undefined) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<{
    id: string;
    title: string;
    format: "epub" | "pdf" | "txt";
    contentUrl: string;
    initialCfi?: string | undefined;
  } | null>(null);

  useEffect(() => {
    if (!bookId) {
      setError("No book ID provided");
      setIsLoading(false);
      return;
    }

    // Simulate loading
    const timer = setTimeout(() => {
      // Mock book data - in production, this comes from the API
      setBook({
        id: bookId,
        title: "Sample Book",
        format: "epub",
        // This would be a real URL to the book content
        contentUrl: `/api/books/${bookId}/content`,
      });
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [bookId]);

  return { book, isLoading, error };
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

  // Mock book data (will be React Query in production)
  const { book, isLoading, error } = useMockBookData(bookId);

  // Handle location change from reader
  const handleLocationChange = useCallback(
    (location: EpubLocation) => {
      // Update store position (uses percentage * 100 as position)
      updatePosition(Math.round(location.percentage * 100), location.cfi);

      // TODO: Sync to backend with debounce
    },
    [updatePosition]
  );

  // Handle text selection
  const handleTextSelect = useCallback(
    (selection: TextSelection) => {
      setSelectedText(selection.text);
      // TODO: Show annotation toolbar
    },
    [setSelectedText]
  );

  // Handle book load
  const handleLoad = useCallback((loadedToc: TocItem[]) => {
    setToc(loadedToc);
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
  if (error || !book) {
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
          {error || t("common.error")}
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
          {book.format === "epub" ? (
            <EpubReader
              url={book.contentUrl}
              initialCfi={book.initialCfi}
              onLocationChange={handleLocationChange}
              onTextSelect={handleTextSelect}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {t("reader.placeholder", { bookId })}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ReaderPage;
