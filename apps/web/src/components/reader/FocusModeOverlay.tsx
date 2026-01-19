/**
 * Focus Mode Overlay Component
 *
 * Provides a dimmed overlay that highlights the currently focused line
 * or paragraph, reducing visual distractions while reading.
 */

import { useCallback, useEffect, useState, useRef, memo } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import {
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { type FocusModeConfig, getLineHeightPx } from "./advancedReadingTypes";

export interface FocusModeOverlayProps {
  /** Whether focus mode is active */
  isActive: boolean;
  /** Focus mode configuration */
  config: FocusModeConfig;
  /** Container element to overlay */
  containerRef: React.RefObject<HTMLElement>;
  /** Font size in pixels */
  fontSize: number;
  /** Line height multiplier */
  lineHeight: number;
  /** Callback when focus line changes */
  onFocusLineChange?: (lineIndex: number) => void;
}

/**
 * FocusModeOverlay component for reducing visual distractions
 */
export const FocusModeOverlay = memo(function FocusModeOverlay({
  isActive,
  config,
  containerRef,
  fontSize,
  lineHeight,
  onFocusLineChange,
}: FocusModeOverlayProps) {
  const { t } = useTranslation();
  const [focusLine, setFocusLine] = useState(0);
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const [totalLines, setTotalLines] = useState(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Calculate line height in pixels
  const lineHeightPx = getLineHeightPx(fontSize, lineHeight);

  // Update container bounds and calculate total lines
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isActive) return;

    const updateBounds = () => {
      const rect = container.getBoundingClientRect();
      setContainerBounds(rect);

      // Calculate total lines based on scroll height
      const scrollHeight = container.scrollHeight;
      const lines = Math.ceil(scrollHeight / lineHeightPx);
      setTotalLines(lines);
    };

    updateBounds();

    // Set up resize observer
    resizeObserverRef.current = new ResizeObserver(updateBounds);
    resizeObserverRef.current.observe(container);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [containerRef, isActive, lineHeightPx]);

  // Auto-follow scroll when enabled
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isActive || !config.autoFollow) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const viewportMidpoint = scrollTop + container.clientHeight / 2;
      const currentLine = Math.floor(viewportMidpoint / lineHeightPx);
      setFocusLine(Math.max(0, Math.min(currentLine, totalLines - 1)));
      onFocusLineChange?.(currentLine);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initialize

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [
    containerRef,
    isActive,
    config.autoFollow,
    lineHeightPx,
    totalLines,
    onFocusLineChange,
  ]);

  // Handle manual focus line navigation
  const moveFocusUp = useCallback(() => {
    setFocusLine((prev) => {
      const newLine = Math.max(0, prev - 1);
      onFocusLineChange?.(newLine);
      return newLine;
    });
  }, [onFocusLineChange]);

  const moveFocusDown = useCallback(() => {
    setFocusLine((prev) => {
      const newLine = Math.min(totalLines - 1, prev + 1);
      onFocusLineChange?.(newLine);
      return newLine;
    });
  }, [totalLines, onFocusLineChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive || config.autoFollow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        moveFocusUp();
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        moveFocusDown();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, config.autoFollow, moveFocusUp, moveFocusDown]);

  if (!isActive || !containerBounds) {
    return null;
  }

  // Calculate visible window position
  const visibleWindowHeight = (config.visibleLines * 2 + 1) * lineHeightPx;
  const focusLineY = focusLine * lineHeightPx;
  const halfWindow = config.visibleLines * lineHeightPx;

  // Calculate overlay positions relative to container
  const topOverlayBottom = Math.max(0, focusLineY - halfWindow);
  const bottomOverlayTop = focusLineY + lineHeightPx + halfWindow;

  return (
    <>
      {/* Top overlay */}
      {topOverlayBottom > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: topOverlayBottom,
            bgcolor: "common.black",
            opacity: config.overlayOpacity,
            pointerEvents: "none",
            transition: "height 0.15s ease-out, opacity 0.2s",
            zIndex: 10,
          }}
          aria-hidden="true"
        />
      )}

      {/* Bottom overlay */}
      <Box
        sx={{
          position: "absolute",
          top: bottomOverlayTop,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "common.black",
          opacity: config.overlayOpacity,
          pointerEvents: "none",
          transition: "top 0.15s ease-out, opacity 0.2s",
          zIndex: 10,
        }}
        aria-hidden="true"
      />

      {/* Focus indicator line */}
      <Box
        sx={{
          position: "absolute",
          top: focusLineY,
          left: 0,
          right: 0,
          height: visibleWindowHeight,
          border: "2px solid",
          borderColor: "primary.main",
          borderRadius: 1,
          pointerEvents: "none",
          boxShadow:
            "0 0 10px rgba(var(--mui-palette-primary-mainChannel) / 0.3)",
          transition: "top 0.15s ease-out",
          zIndex: 11,
        }}
        aria-hidden="true"
      />

      {/* Navigation controls (when not auto-following) */}
      {!config.autoFollow && (
        <Box
          sx={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            zIndex: 12,
          }}
        >
          <Tooltip title={t("reader.advancedReading.focusUp")} placement="left">
            <IconButton
              size="small"
              onClick={moveFocusUp}
              disabled={focusLine <= 0}
              sx={{
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "action.hover" },
              }}
              aria-label={t("reader.advancedReading.focusUp")}
            >
              <UpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={t("reader.advancedReading.focusDown")}
            placement="left"
          >
            <IconButton
              size="small"
              onClick={moveFocusDown}
              disabled={focusLine >= totalLines - 1}
              sx={{
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "action.hover" },
              }}
              aria-label={t("reader.advancedReading.focusDown")}
            >
              <DownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </>
  );
});

export default FocusModeOverlay;
