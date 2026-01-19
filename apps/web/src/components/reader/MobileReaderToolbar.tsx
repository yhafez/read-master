/**
 * Mobile Reader Toolbar
 *
 * A compact, mobile-optimized toolbar for the reader that can be toggled
 * to save screen space. Shows only essential controls with touch-friendly targets.
 */

import {
  Box,
  IconButton,
  Tooltip,
  Collapse,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  NavigateBefore,
  NavigateNext,
  TextDecrease,
  TextIncrease,
  Menu as MenuIcon,
  Close as CloseIcon,
  MenuBook as TocIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface MobileReaderToolbarProps {
  /** Whether previous page/section is available */
  canGoPrev?: boolean;
  /** Whether next page/section is available */
  canGoNext?: boolean;
  /** Handler for previous page */
  onPrevPage?: () => void;
  /** Handler for next page */
  onNextPage?: () => void;
  /** Handler for decreasing font size */
  onDecreaseFontSize?: () => void;
  /** Handler for increasing font size */
  onIncreaseFontSize?: () => void;
  /** Handler for opening table of contents */
  onOpenToc?: () => void;
  /** Handler for opening settings */
  onOpenSettings?: () => void;
  /** Current font size (for display) */
  fontSize?: number;
  /** Whether to show the toolbar initially */
  initiallyOpen?: boolean;
  /** Whether font size controls are disabled */
  disableFontSize?: boolean;
}

/**
 * Mobile Reader Toolbar
 *
 * A collapsible toolbar optimized for mobile reading:
 * - Minimal UI when collapsed (just toggle button)
 * - Essential controls when expanded
 * - Touch-friendly 48px+ targets
 * - Auto-hides on non-mobile screens
 *
 * @example
 * <MobileReaderToolbar
 *   canGoPrev={canGoPrev}
 *   canGoNext={canGoNext}
 *   onPrevPage={previousPage}
 *   onNextPage={nextPage}
 *   onIncreaseFontSize={increaseFontSize}
 *   onDecreaseFontSize={decreaseFontSize}
 * />
 */
export function MobileReaderToolbar({
  canGoPrev = true,
  canGoNext = true,
  onPrevPage,
  onNextPage,
  onDecreaseFontSize,
  onIncreaseFontSize,
  onOpenToc,
  onOpenSettings,
  fontSize: _fontSize,
  initiallyOpen = false,
  disableFontSize = false,
}: MobileReaderToolbarProps): React.ReactElement | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Don't render on desktop - desktop uses full toolbar
  if (!isMobile) {
    return null;
  }

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 64, // Above bottom navigation
        right: 16,
        zIndex: theme.zIndex.appBar - 1,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* Toggle Button */}
        <IconButton
          onClick={toggleOpen}
          aria-label={isOpen ? t("common.close") : t("reader.toolbar.open")}
          aria-expanded={isOpen}
          sx={{
            width: 56,
            height: 56,
            borderRadius: isOpen ? "0" : "8px",
          }}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>

        {/* Toolbar Controls */}
        <Collapse in={isOpen} timeout="auto">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              p: 1,
              minWidth: 56,
            }}
          >
            {/* Navigation Controls */}
            {(onPrevPage || onNextPage) && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {onPrevPage && (
                  <Tooltip title={t("common.previous")} placement="left">
                    <span>
                      <IconButton
                        onClick={onPrevPage}
                        disabled={!canGoPrev}
                        aria-label={t("common.previous")}
                        sx={{ width: 48, height: 48 }}
                      >
                        <NavigateBefore />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}

                {onNextPage && (
                  <Tooltip title={t("common.next")} placement="left">
                    <span>
                      <IconButton
                        onClick={onNextPage}
                        disabled={!canGoNext}
                        aria-label={t("common.next")}
                        sx={{ width: 48, height: 48 }}
                      >
                        <NavigateNext />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            )}

            {/* Font Size Controls */}
            {!disableFontSize && (onDecreaseFontSize || onIncreaseFontSize) && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {onDecreaseFontSize && (
                  <Tooltip
                    title={t("reader.decreaseFontSize")}
                    placement="left"
                  >
                    <IconButton
                      onClick={onDecreaseFontSize}
                      aria-label={t("reader.decreaseFontSize")}
                      sx={{ width: 48, height: 48 }}
                    >
                      <TextDecrease />
                    </IconButton>
                  </Tooltip>
                )}

                {onIncreaseFontSize && (
                  <Tooltip
                    title={t("reader.increaseFontSize")}
                    placement="left"
                  >
                    <IconButton
                      onClick={onIncreaseFontSize}
                      aria-label={t("reader.increaseFontSize")}
                      sx={{ width: 48, height: 48 }}
                    >
                      <TextIncrease />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}

            {/* Additional Controls */}
            {(onOpenToc || onOpenSettings) && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {onOpenToc && (
                  <Tooltip title={t("reader.tableOfContents")} placement="left">
                    <IconButton
                      onClick={onOpenToc}
                      aria-label={t("reader.tableOfContents")}
                      sx={{ width: 48, height: 48 }}
                    >
                      <TocIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {onOpenSettings && (
                  <Tooltip title={t("common.settings")} placement="left">
                    <IconButton
                      onClick={onOpenSettings}
                      aria-label={t("common.settings")}
                      sx={{ width: 48, height: 48 }}
                    >
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
}

export default MobileReaderToolbar;
