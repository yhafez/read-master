/**
 * Screen Reader Text Components
 *
 * Provides visually hidden text that is accessible to screen readers.
 * Useful for providing additional context that sighted users don't need.
 */

import { Box, type BoxProps } from "@mui/material";
import type { ReactNode } from "react";

// ============================================================================
// Visually Hidden Styles
// ============================================================================

const visuallyHiddenStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

// ============================================================================
// ScreenReaderText Component
// ============================================================================

export interface ScreenReaderTextProps extends Omit<BoxProps, "sx"> {
  children: ReactNode;
  /** Optional component to render as */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

/**
 * Visually hidden text that is accessible to screen readers
 *
 * @example
 * <IconButton>
 *   <DeleteIcon />
 *   <ScreenReaderText>Delete item</ScreenReaderText>
 * </IconButton>
 */
export function ScreenReaderText({
  children,
  as = "span",
  ...props
}: ScreenReaderTextProps): React.ReactElement {
  return (
    <Box component={as} sx={visuallyHiddenStyles} {...props}>
      {children}
    </Box>
  );
}

// ============================================================================
// ScreenReaderAnnounce Component
// ============================================================================

export interface ScreenReaderAnnounceProps {
  children: ReactNode;
  /** Politeness level */
  politeness?: "polite" | "assertive" | "off";
  /** Whether to announce as atomic (whole region) */
  atomic?: boolean;
  /** Role for the live region */
  role?: "status" | "alert" | "log" | "timer" | "marquee";
}

/**
 * Live region that announces content to screen readers
 *
 * @example
 * <ScreenReaderAnnounce politeness="polite">
 *   {isLoading ? "Loading..." : "Content loaded"}
 * </ScreenReaderAnnounce>
 */
export function ScreenReaderAnnounce({
  children,
  politeness = "polite",
  atomic = true,
  role = "status",
}: ScreenReaderAnnounceProps): React.ReactElement {
  return (
    <Box
      role={role}
      aria-live={politeness}
      aria-atomic={atomic}
      sx={visuallyHiddenStyles}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// DescribedBy Component
// ============================================================================

export interface DescribedByProps {
  id: string;
  children: ReactNode;
}

/**
 * Hidden description that can be referenced by aria-describedby
 *
 * @example
 * <input aria-describedby="password-hint" />
 * <DescribedBy id="password-hint">
 *   Password must be at least 8 characters
 * </DescribedBy>
 */
export function DescribedBy({
  id,
  children,
}: DescribedByProps): React.ReactElement {
  return (
    <Box id={id} sx={visuallyHiddenStyles}>
      {children}
    </Box>
  );
}

// ============================================================================
// LabelledBy Component
// ============================================================================

export interface LabelledByProps {
  id: string;
  children: ReactNode;
}

/**
 * Hidden label that can be referenced by aria-labelledby
 *
 * @example
 * <section aria-labelledby="section-title">
 *   <LabelledBy id="section-title">User Settings</LabelledBy>
 *   ...content
 * </section>
 */
export function LabelledBy({
  id,
  children,
}: LabelledByProps): React.ReactElement {
  return (
    <Box component="span" id={id} sx={visuallyHiddenStyles}>
      {children}
    </Box>
  );
}

// ============================================================================
// StatusMessage Component
// ============================================================================

export interface StatusMessageProps {
  children: ReactNode;
  /** Whether to show visually as well */
  visible?: boolean;
}

/**
 * Status message that is announced to screen readers
 *
 * @example
 * <StatusMessage>Form submitted successfully</StatusMessage>
 */
export function StatusMessage({
  children,
  visible = false,
}: StatusMessageProps): React.ReactElement {
  const sxStyles = visible ? {} : visuallyHiddenStyles;
  return (
    <Box role="status" aria-live="polite" sx={sxStyles}>
      {children}
    </Box>
  );
}

// ============================================================================
// AlertMessage Component
// ============================================================================

export interface AlertMessageProps {
  children: ReactNode;
  /** Whether to show visually as well */
  visible?: boolean;
}

/**
 * Alert message that is immediately announced to screen readers
 *
 * @example
 * <AlertMessage>Error: Please fix the form</AlertMessage>
 */
export function AlertMessage({
  children,
  visible = false,
}: AlertMessageProps): React.ReactElement {
  const sxStyles = visible ? {} : visuallyHiddenStyles;
  return (
    <Box role="alert" aria-live="assertive" sx={sxStyles}>
      {children}
    </Box>
  );
}

// ============================================================================
// ProgressAnnounce Component
// ============================================================================

export interface ProgressAnnounceProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Label for the progress */
  label?: string;
}

/**
 * Announces progress to screen readers
 *
 * @example
 * <ProgressAnnounce value={75} label="File upload" />
 */
export function ProgressAnnounce({
  value,
  max = 100,
  label,
}: ProgressAnnounceProps): React.ReactElement {
  const percentage = Math.round((value / max) * 100);
  const text = label
    ? `${label}: ${percentage}% complete`
    : `${percentage}% complete`;

  return (
    <Box
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={text}
      sx={visuallyHiddenStyles}
    >
      {text}
    </Box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ScreenReaderText;
