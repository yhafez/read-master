/**
 * Live Region Component
 *
 * ARIA live region for announcing dynamic content changes to screen readers.
 * Provides a declarative way to announce messages without using imperative APIs.
 */

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";

import { type LiveRegionPoliteness } from "@/lib/accessibility";

export interface LiveRegionProps {
  /** Message to announce to screen readers */
  message: string;
  /** Politeness level for announcements */
  politeness?: LiveRegionPoliteness;
  /** Whether to clear message after announcing */
  clearOnAnnounce?: boolean;
  /** Debounce delay in ms (default: 150) */
  debounce?: number;
  /** Additional className */
  className?: string;
}

/**
 * Live Region component for screen reader announcements
 *
 * @example
 * <LiveRegion message="5 new messages" politeness="polite" />
 * <LiveRegion message="Error occurred" politeness="assertive" />
 */
export function LiveRegion({
  message,
  politeness = "polite",
  clearOnAnnounce = false,
  debounce = 150,
  className,
}: LiveRegionProps): React.ReactElement {
  const messageRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only announce if message changed
    if (message && message !== messageRef.current) {
      messageRef.current = message;

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce announcement
      timeoutRef.current = setTimeout(() => {
        // Message will be announced by screen readers via aria-live
        if (clearOnAnnounce) {
          // Clear after a short delay to ensure announcement
          setTimeout(() => {
            messageRef.current = "";
          }, 1000);
        }
      }, debounce);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearOnAnnounce, debounce]);

  return (
    <Box
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={className}
      sx={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {message}
    </Box>
  );
}

/**
 * Polite Live Region (default politeness)
 *
 * @example
 * <PoliteLiveRegion message="Content updated" />
 */
export function PoliteLiveRegion({
  message,
  ...props
}: Omit<LiveRegionProps, "politeness">): React.ReactElement {
  return <LiveRegion message={message} politeness="polite" {...props} />;
}

/**
 * Assertive Live Region (interrupts current announcements)
 *
 * @example
 * <AssertiveLiveRegion message="Critical error occurred" />
 */
export function AssertiveLiveRegion({
  message,
  ...props
}: Omit<LiveRegionProps, "politeness">): React.ReactElement {
  return <LiveRegion message={message} politeness="assertive" {...props} />;
}
