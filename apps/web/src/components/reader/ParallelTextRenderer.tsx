/**
 * Parallel Text Renderer Component
 *
 * Displays two texts side-by-side with line-by-line alignment.
 */

import React, { useRef, useEffect } from "react";
import { Box, Typography, Paper, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";

import type {
  ParallelLine,
  ParallelAlignment,
} from "@/utils/parallelTextUtils";
import { getAlignmentStats } from "@/utils/parallelTextUtils";

// ============================================================================
// Types
// ============================================================================

type ParallelTextRendererProps = {
  alignment: ParallelAlignment;
  activeLineId: string | null;
  showLineNumbers?: boolean;
  showConfidence?: boolean;
  highlightMismatches?: boolean;
  onLineClick?: (lineId: string) => void;
  leftTitle?: string;
  rightTitle?: string;
};

// ============================================================================
// Line Component
// ============================================================================

function ParallelLineComponent({
  line,
  isActive,
  showLineNumbers,
  showConfidence,
  highlightMismatches,
  onClick,
}: {
  line: ParallelLine;
  isActive: boolean;
  showLineNumbers: boolean;
  showConfidence: boolean;
  highlightMismatches: boolean;
  onClick?: () => void;
}): React.ReactElement {
  const getBackgroundColor = (): string | undefined => {
    if (isActive) return "action.selected";
    if (!highlightMismatches) return undefined;

    switch (line.type) {
      case "leftOnly":
        return "error.lighter";
      case "rightOnly":
        return "warning.lighter";
      case "aligned":
        if (line.confidence < 0.5) return "warning.lighter";
        return undefined;
      default:
        return undefined;
    }
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        gap: 2,
        p: 1.5,
        backgroundColor: getBackgroundColor(),
        borderBottom: 1,
        borderColor: "divider",
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick
          ? {
              backgroundColor: "action.hover",
            }
          : undefined,
        transition: "background-color 0.2s",
      }}
    >
      {/* Left side */}
      <Box sx={{ flex: 1, display: "flex", gap: 1 }}>
        {showLineNumbers && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 40, textAlign: "right" }}
          >
            {line.leftLineNumber >= 0 ? line.leftLineNumber + 1 : ""}
          </Typography>
        )}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            opacity: line.leftText ? 1 : 0.3,
            fontStyle: line.leftText ? "normal" : "italic",
          }}
        >
          {line.leftText || "(no match)"}
        </Typography>
      </Box>

      {/* Right side */}
      <Box sx={{ flex: 1, display: "flex", gap: 1 }}>
        {showLineNumbers && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 40, textAlign: "right" }}
          >
            {line.rightLineNumber >= 0 ? line.rightLineNumber + 1 : ""}
          </Typography>
        )}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            opacity: line.rightText ? 1 : 0.3,
            fontStyle: line.rightText ? "normal" : "italic",
          }}
        >
          {line.rightText || "(no match)"}
        </Typography>
        {showConfidence && line.type === "aligned" && (
          <Chip
            label={`${Math.round(line.confidence * 100)}%`}
            size="small"
            color={
              line.confidence >= 0.7
                ? "success"
                : line.confidence >= 0.5
                  ? "warning"
                  : "error"
            }
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        )}
      </Box>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ParallelTextRenderer({
  alignment,
  activeLineId,
  showLineNumbers = true,
  showConfidence = false,
  highlightMismatches = true,
  onLineClick,
  leftTitle,
  rightTitle,
}: ParallelTextRendererProps): React.ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = getAlignmentStats(alignment);

  // Scroll active line into view
  useEffect(() => {
    if (!activeLineId || !containerRef.current) return;

    const lineElement = containerRef.current.querySelector(
      `[data-line-id="${activeLineId}"]`
    );

    if (lineElement) {
      lineElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLineId]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 2,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6">
            {leftTitle || t("parallelText.leftText")}
          </Typography>
          <Typography variant="h6">
            {rightTitle || t("parallelText.rightText")}
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={`${stats.totalLines} ${t("parallelText.lines")}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`${stats.alignedLines} ${t("parallelText.aligned")}`}
            size="small"
            color="success"
          />
          {stats.leftOnlyLines > 0 && (
            <Chip
              label={`${stats.leftOnlyLines} ${t("parallelText.leftOnly")}`}
              size="small"
              color="error"
            />
          )}
          {stats.rightOnlyLines > 0 && (
            <Chip
              label={`${stats.rightOnlyLines} ${t("parallelText.rightOnly")}`}
              size="small"
              color="warning"
            />
          )}
          <Chip
            label={`${t("parallelText.quality")}: ${t(
              `parallelText.quality${stats.alignmentQuality.charAt(0).toUpperCase() + stats.alignmentQuality.slice(1)}`
            )}`}
            size="small"
            color={
              stats.alignmentQuality === "excellent" ||
              stats.alignmentQuality === "good"
                ? "success"
                : stats.alignmentQuality === "fair"
                  ? "warning"
                  : "error"
            }
          />
        </Box>
      </Paper>

      {/* Lines */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: "auto",
        }}
      >
        {alignment.lines.map((line) => (
          <Box key={line.id} data-line-id={line.id}>
            <ParallelLineComponent
              line={line}
              isActive={line.id === activeLineId}
              showLineNumbers={showLineNumbers}
              showConfidence={showConfidence}
              highlightMismatches={highlightMismatches}
              {...(onLineClick && { onClick: () => onLineClick(line.id) })}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default ParallelTextRenderer;
