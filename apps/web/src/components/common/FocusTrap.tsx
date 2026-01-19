/**
 * FocusTrap Component
 *
 * A component that traps keyboard focus within its children.
 * Useful for modals, dialogs, drawers, and other overlay components.
 *
 * Implements WCAG 2.4.3 (Focus Order) and modal focus requirements.
 */

import {
  type ReactNode,
  forwardRef,
  useCallback,
  useImperativeHandle,
} from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import {
  useFocusTrap,
  type FocusTrapOptions,
} from "@/hooks/useFocusManagement";

// ============================================================================
// TYPES
// ============================================================================

export type FocusTrapProps = {
  /** The content to render within the focus trap */
  children: ReactNode;
  /** Whether the focus trap is active */
  active?: boolean;
  /** Element to focus when trap activates */
  initialFocus?: HTMLElement | null;
  /** Element to focus when trap deactivates */
  returnFocus?: HTMLElement | null;
  /** Whether to auto-focus the first element */
  autoFocus?: boolean;
  /** Whether to restore focus when deactivated */
  restoreFocus?: boolean;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
  /** Callback when click occurs outside the trap */
  onClickOutside?: () => void;
  /** MUI sx prop for styling */
  sx?: SxProps<Theme>;
  /** Component role for accessibility */
  role?: string;
  /** ARIA label for the component */
  "aria-label"?: string;
  /** ARIA labelledby for the component */
  "aria-labelledby"?: string;
  /** ARIA describedby for the component */
  "aria-describedby"?: string;
  /** Whether this is a modal (adds aria-modal) */
  modal?: boolean;
  /** Additional class name */
  className?: string;
  /** Test ID for testing */
  "data-testid"?: string;
};

export type FocusTrapRef = {
  /** Manually activate the focus trap */
  activate: () => void;
  /** Manually deactivate the focus trap */
  deactivate: () => void;
  /** Whether the trap is currently active */
  isActive: boolean;
  /** The container element */
  container: HTMLElement | null;
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FocusTrap wraps content and traps keyboard focus within it.
 *
 * @example
 * ```tsx
 * // Basic modal usage
 * function Modal({ isOpen, onClose, children }) {
 *   return (
 *     <FocusTrap
 *       active={isOpen}
 *       onEscape={onClose}
 *       onClickOutside={onClose}
 *       role="dialog"
 *       aria-modal
 *       aria-label="Example modal"
 *     >
 *       {children}
 *     </FocusTrap>
 *   );
 * }
 *
 * // With ref for manual control
 * function CustomOverlay({ children }) {
 *   const focusTrapRef = useRef<FocusTrapRef>(null);
 *
 *   const handleOpen = () => {
 *     focusTrapRef.current?.activate();
 *   };
 *
 *   return (
 *     <FocusTrap ref={focusTrapRef} active={false}>
 *       {children}
 *     </FocusTrap>
 *   );
 * }
 * ```
 */
export const FocusTrap = forwardRef<FocusTrapRef, FocusTrapProps>(
  function FocusTrap(props, ref) {
    const {
      children,
      active = true,
      initialFocus,
      returnFocus,
      autoFocus = true,
      restoreFocus = true,
      onEscape,
      onClickOutside,
      sx,
      role,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      modal = false,
      className,
      "data-testid": testId,
    } = props;

    // Build options object, only including defined properties
    const focusTrapOptions: FocusTrapOptions = {
      active,
      autoFocus,
      restoreFocus,
    };

    // Only set optional properties if they are defined (not undefined)
    if (initialFocus !== undefined) {
      focusTrapOptions.initialFocus = initialFocus;
    }
    if (returnFocus !== undefined) {
      focusTrapOptions.returnFocus = returnFocus;
    }
    if (onEscape !== undefined) {
      focusTrapOptions.onEscape = onEscape;
    }
    if (onClickOutside !== undefined) {
      focusTrapOptions.onClickOutside = onClickOutside;
    }

    const { containerRef, activate, deactivate, isActive } =
      useFocusTrap(focusTrapOptions);

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
      activate,
      deactivate,
      isActive,
      container: containerRef.current,
    }));

    // Handle ref assignment since containerRef expects HTMLElement
    const handleRef = useCallback(
      (node: HTMLDivElement | null) => {
        // TypeScript needs us to set current on the ref
        (containerRef as React.MutableRefObject<HTMLElement | null>).current =
          node;
      },
      [containerRef]
    );

    // Build Box props, only including defined values
    const boxProps: Record<string, unknown> = {
      ref: handleRef,
      children,
    };

    if (role !== undefined) boxProps.role = role;
    if (ariaLabel !== undefined) boxProps["aria-label"] = ariaLabel;
    if (ariaLabelledBy !== undefined)
      boxProps["aria-labelledby"] = ariaLabelledBy;
    if (ariaDescribedBy !== undefined)
      boxProps["aria-describedby"] = ariaDescribedBy;
    if (modal) boxProps["aria-modal"] = true;
    if (className !== undefined) boxProps.className = className;
    if (testId !== undefined) boxProps["data-testid"] = testId;
    if (sx !== undefined) boxProps.sx = sx;

    return <Box {...boxProps} />;
  }
);

// ============================================================================
// SKIP LINK COMPONENT
// ============================================================================

export type SkipLinkProps = {
  /** Target element ID to skip to */
  targetId?: string;
  /** Link text */
  children?: ReactNode;
  /** MUI sx prop for styling */
  sx?: SxProps<Theme>;
};

/**
 * SkipLink component for keyboard users to skip navigation.
 * Implements WCAG 2.4.1 (Bypass Blocks).
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <SkipLink targetId="main-content">
 *         Skip to main content
 *       </SkipLink>
 *       <Header />
 *       <Navigation />
 *       <main id="main-content">
 *         Content here
 *       </main>
 *     </>
 *   );
 * }
 * ```
 */
export function SkipLink({
  targetId = "main-content",
  children = "Skip to main content",
  sx,
}: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Box
      component="a"
      href={`#${targetId}`}
      onClick={handleClick}
      sx={{
        position: "absolute",
        left: "-9999px",
        top: "auto",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        zIndex: 9999,
        "&:focus": {
          position: "fixed",
          top: 8,
          left: 8,
          width: "auto",
          height: "auto",
          padding: 2,
          backgroundColor: "background.paper",
          color: "text.primary",
          border: "2px solid",
          borderColor: "primary.main",
          borderRadius: 1,
          textDecoration: "none",
          fontWeight: 600,
          boxShadow: 4,
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "2px",
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// FOCUS INDICATOR COMPONENT
// ============================================================================

export type VisuallyHiddenProps = {
  /** Content to hide visually but keep accessible to screen readers */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Component to render (default: span) */
  component?: React.ElementType;
};

/**
 * VisuallyHidden component hides content visually while keeping it accessible.
 * Implements WCAG screen reader requirements.
 *
 * @example
 * ```tsx
 * <button>
 *   <Icon name="menu" />
 *   <VisuallyHidden>Open menu</VisuallyHidden>
 * </button>
 * ```
 */
export function VisuallyHidden({
  children,
  className,
  component = "span",
}: VisuallyHiddenProps) {
  return (
    <Box
      component={component}
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
      {children}
    </Box>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FocusTrap;
