/**
 * Translation Highlighter Component
 *
 * Highlights matching segments in translation comparison mode.
 */

import React from "react";
import { Box, Typography, Chip } from "@mui/material";

import type { SegmentPair } from "@/stores/useTranslationStore";
import {
  getHighlightStyle,
  getConfidenceLabel,
  getConfidenceColor,
} from "@/utils/translationUtils";

// ============================================================================
// Types
// ============================================================================

type TranslationHighlighterProps = {
  segments: SegmentPair[];
  activeSegmentId: string | null;
  highlightColor: string;
  showConfidence: boolean;
  onSegmentClick?: (segmentId: string) => void;
  isOriginal: boolean; // true for original, false for translation
};

// ============================================================================
// Main Component
// ============================================================================

export function TranslationHighlighter({
  segments,
  activeSegmentId,
  highlightColor,
  showConfidence,
  onSegmentClick,
  isOriginal,
}: TranslationHighlighterProps): React.ReactElement {
  const handleSegmentClick = (segmentId: string): void => {
    if (onSegmentClick) {
      onSegmentClick(segmentId);
    }
  };

  return (
    <Box>
      {segments.map((segment) => {
        const text = isOriginal ? segment.originalText : segment.translatedText;
        const isActive = segment.id === activeSegmentId;
        const isMatched = isOriginal
          ? segment.translatedText.length > 0
          : segment.originalText.length > 0;

        if (!text) return null;

        const highlightStyle = getHighlightStyle(
          segment.confidence,
          highlightColor
        );

        return (
          <Box
            key={segment.id}
            onClick={() => handleSegmentClick(segment.id)}
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              border: isActive ? 2 : 0,
              borderColor: "primary.main",
              ...(isMatched && highlightStyle),
              "&:hover": {
                opacity: 0.9,
              },
            }}
          >
            <Typography
              variant="body1"
              paragraph
              sx={{ mb: showConfidence ? 1 : 0 }}
            >
              {text}
            </Typography>

            {showConfidence && isMatched && (
              <Chip
                label={`${getConfidenceLabel(segment.confidence)} (${Math.round(
                  segment.confidence * 100
                )}%)`}
                size="small"
                sx={{
                  backgroundColor: getConfidenceColor(segment.confidence),
                  color: "white",
                  height: 20,
                  fontSize: "0.7rem",
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default TranslationHighlighter;
