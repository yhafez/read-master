/**
 * Split Screen Reader Component
 *
 * Layout component for side-by-side or stacked reading.
 */

import React, { useEffect, useRef } from "react";
import { Box, Divider } from "@mui/material";

import {
  useSplitScreenStore,
  selectIsSplitScreen,
  selectIsVerticalSplit,
} from "@/stores/useSplitScreenStore";

// ============================================================================
// Types
// ============================================================================

type SplitScreenReaderProps = {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  onLeftScroll?: (position: number) => void;
  onRightScroll?: (position: number) => void;
};

// ============================================================================
// Main Component
// ============================================================================

export function SplitScreenReader({
  leftContent,
  rightContent,
  onLeftScroll,
  onRightScroll,
}: SplitScreenReaderProps): React.ReactElement {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const isSplitScreen = useSplitScreenStore(selectIsSplitScreen);
  const isVertical = useSplitScreenStore(selectIsVerticalSplit);
  const { splitRatio, syncScroll } = useSplitScreenStore();

  // Sync scrolling between panes
  useEffect(() => {
    if (!syncScroll || !isSplitScreen) return;

    const leftPane = leftRef.current;
    const rightPane = rightRef.current;

    if (!leftPane || !rightPane) return;

    const handleLeftScroll = (): void => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      const scrollPercentage =
        leftPane.scrollTop / (leftPane.scrollHeight - leftPane.clientHeight);
      rightPane.scrollTop =
        scrollPercentage * (rightPane.scrollHeight - rightPane.clientHeight);

      syncingRef.current = false;

      if (onLeftScroll) {
        onLeftScroll(leftPane.scrollTop);
      }
    };

    const handleRightScroll = (): void => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      const scrollPercentage =
        rightPane.scrollTop / (rightPane.scrollHeight - rightPane.clientHeight);
      leftPane.scrollTop =
        scrollPercentage * (leftPane.scrollHeight - leftPane.clientHeight);

      syncingRef.current = false;

      if (onRightScroll) {
        onRightScroll(rightPane.scrollTop);
      }
    };

    leftPane.addEventListener("scroll", handleLeftScroll);
    rightPane.addEventListener("scroll", handleRightScroll);

    return () => {
      leftPane.removeEventListener("scroll", handleLeftScroll);
      rightPane.removeEventListener("scroll", handleRightScroll);
    };
  }, [syncScroll, isSplitScreen, onLeftScroll, onRightScroll]);

  if (!isSplitScreen) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          overflow: "auto",
        }}
      >
        {leftContent}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: isVertical ? "row" : "column",
      }}
    >
      {/* Left/Top Pane */}
      <Box
        ref={leftRef}
        sx={{
          [isVertical ? "width" : "height"]: `${splitRatio}%`,
          overflow: "auto",
          position: "relative",
        }}
      >
        {leftContent}
      </Box>

      {/* Divider */}
      <Divider
        orientation={isVertical ? "vertical" : "horizontal"}
        flexItem
        sx={{
          cursor: isVertical ? "ew-resize" : "ns-resize",
          "&:hover": {
            backgroundColor: "primary.main",
          },
        }}
      />

      {/* Right/Bottom Pane */}
      <Box
        ref={rightRef}
        sx={{
          [isVertical ? "width" : "height"]: `${100 - splitRatio}%`,
          overflow: "auto",
          position: "relative",
        }}
      >
        {rightContent}
      </Box>
    </Box>
  );
}

export default SplitScreenReader;
