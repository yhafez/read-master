/**
 * Focus Management Hooks
 *
 * React hooks for managing keyboard focus in accessible ways.
 * Implements WCAG 2.4.7 (Focus Visible) and 2.4.11 (Focus Not Obscured).
 */

import { useCallback, useEffect, useRef } from "react";
import {
  createFocusTrap,
  getFocusableElements,
  FOCUSABLE_SELECTOR,
} from "@/lib/accessibility";

// ============================================================================
// TYPES
// ============================================================================

export type FocusTrapOptions = {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Element to focus when trap activates (default: first focusable) */
  initialFocus?: HTMLElement | null;
  /** Element to focus when trap deactivates (default: previously focused) */
  returnFocus?: HTMLElement | null;
  /** Whether to auto-focus the first element when activated */
  autoFocus?: boolean;
  /** Whether to restore focus when deactivated */
  restoreFocus?: boolean;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
  /** Callback when click occurs outside the trap */
  onClickOutside?: () => void;
};

export type FocusRestoreOptions = {
  /** Whether to restore focus when component unmounts */
  restoreOnUnmount?: boolean;
  /** Callback to run before restoring focus */
  onBeforeRestore?: () => void;
};

export type FocusTrapReturn = {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Manually activate the focus trap */
  activate: () => void;
  /** Manually deactivate the focus trap */
  deactivate: () => void;
  /** Whether the trap is currently active */
  isActive: boolean;
};

export type FocusRestoreReturn = {
  /** Store the current focus to restore later */
  saveFocus: () => void;
  /** Restore the previously saved focus */
  restoreFocus: () => void;
  /** The element that was focused when saveFocus was called */
  savedElement: HTMLElement | null;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default options for focus trap */
export const DEFAULT_FOCUS_TRAP_OPTIONS: Required<
  Omit<
    FocusTrapOptions,
    "initialFocus" | "returnFocus" | "onEscape" | "onClickOutside"
  >
> = {
  active: true,
  autoFocus: true,
  restoreFocus: true,
};

// ============================================================================
// FOCUS TRAP HOOK
// ============================================================================

/**
 * Hook for trapping focus within a container element.
 * Useful for modals, dialogs, and other overlay components.
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const { containerRef } = useFocusTrap({
 *     active: isOpen,
 *     onEscape: onClose,
 *     onClickOutside: onClose,
 *   });
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap(options: FocusTrapOptions = {}): FocusTrapReturn {
  const {
    active = DEFAULT_FOCUS_TRAP_OPTIONS.active,
    initialFocus,
    returnFocus,
    autoFocus = DEFAULT_FOCUS_TRAP_OPTIONS.autoFocus,
    restoreFocus = DEFAULT_FOCUS_TRAP_OPTIONS.restoreFocus,
    onEscape,
    onClickOutside,
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const trapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null);
  const isActiveRef = useRef(false);

  // Activate the focus trap
  const activate = useCallback(() => {
    const container = containerRef.current;
    if (!container || isActiveRef.current) return;

    // Store the currently focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Create the focus trap
    trapRef.current = createFocusTrap(container);

    if (autoFocus) {
      if (initialFocus && container.contains(initialFocus)) {
        initialFocus.focus();
      } else {
        trapRef.current.activate();
      }
    }

    isActiveRef.current = true;
  }, [autoFocus, initialFocus]);

  // Deactivate the focus trap
  const deactivate = useCallback(() => {
    if (!isActiveRef.current || !trapRef.current) return;

    trapRef.current.deactivate();

    if (restoreFocus) {
      const elementToFocus = returnFocus ?? previouslyFocusedRef.current;
      if (elementToFocus && document.body.contains(elementToFocus)) {
        elementToFocus.focus();
      }
    }

    trapRef.current = null;
    isActiveRef.current = false;
  }, [restoreFocus, returnFocus]);

  // Handle escape key
  useEffect(() => {
    if (!active || !onEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, onEscape]);

  // Handle click outside
  useEffect(() => {
    if (!active || !onClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    // Use capture phase to handle clicks before they reach other elements
    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [active, onClickOutside]);

  // Activate/deactivate based on active prop
  useEffect(() => {
    if (active) {
      activate();
    } else {
      deactivate();
    }

    return () => {
      deactivate();
    };
  }, [active, activate, deactivate]);

  return {
    containerRef,
    activate,
    deactivate,
    isActive: isActiveRef.current,
  };
}

// ============================================================================
// FOCUS RESTORE HOOK
// ============================================================================

/**
 * Hook for saving and restoring focus.
 * Useful for components that temporarily take focus and need to return it.
 *
 * @example
 * ```tsx
 * function Dropdown({ isOpen, onClose }) {
 *   const { saveFocus, restoreFocus } = useFocusRestore({
 *     restoreOnUnmount: true,
 *   });
 *
 *   useEffect(() => {
 *     if (isOpen) {
 *       saveFocus();
 *     } else {
 *       restoreFocus();
 *     }
 *   }, [isOpen, saveFocus, restoreFocus]);
 *
 *   // ...
 * }
 * ```
 */
export function useFocusRestore(
  options: FocusRestoreOptions = {}
): FocusRestoreReturn {
  const { restoreOnUnmount = true, onBeforeRestore } = options;

  const savedElementRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    savedElementRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (onBeforeRestore) {
      onBeforeRestore();
    }

    const element = savedElementRef.current;
    if (element && document.body.contains(element)) {
      element.focus();
    }
    savedElementRef.current = null;
  }, [onBeforeRestore]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreOnUnmount && savedElementRef.current) {
        const element = savedElementRef.current;
        if (element && document.body.contains(element)) {
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            element.focus();
          }, 0);
        }
      }
    };
  }, [restoreOnUnmount]);

  return {
    saveFocus,
    restoreFocus,
    savedElement: savedElementRef.current,
  };
}

// ============================================================================
// FOCUS WITHIN HOOK
// ============================================================================

/**
 * Hook to track if focus is within a container.
 *
 * @example
 * ```tsx
 * function Menu({ children }) {
 *   const { containerRef, hasFocus } = useFocusWithin();
 *
 *   return (
 *     <div ref={containerRef} className={hasFocus ? 'focused' : ''}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusWithin(): {
  containerRef: React.RefObject<HTMLElement | null>;
  hasFocus: boolean;
} {
  const containerRef = useRef<HTMLElement | null>(null);
  const hasFocusRef = useRef(false);
  const forceUpdateRef = useRef(0);

  // Force re-render when focus state changes
  const forceUpdate = useCallback(() => {
    forceUpdateRef.current++;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = () => {
      if (!hasFocusRef.current) {
        hasFocusRef.current = true;
        forceUpdate();
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      // Check if focus moved outside the container
      if (!container.contains(event.relatedTarget as Node)) {
        hasFocusRef.current = false;
        forceUpdate();
      }
    };

    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);

    return () => {
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
    };
  }, [forceUpdate]);

  return {
    containerRef,
    hasFocus: hasFocusRef.current,
  };
}

// ============================================================================
// ROVING TABINDEX HOOK
// ============================================================================

export type RovingTabindexOptions = {
  /** Whether navigation wraps from end to beginning */
  wrap?: boolean;
  /** Allow horizontal arrow key navigation */
  horizontal?: boolean;
  /** Allow vertical arrow key navigation */
  vertical?: boolean;
  /** Current active index */
  currentIndex?: number;
  /** Callback when active index changes */
  onIndexChange?: (index: number) => void;
};

/**
 * Hook for roving tabindex pattern.
 * Useful for lists, menus, toolbars, and tab lists.
 *
 * @example
 * ```tsx
 * function TabList({ tabs, activeTab, onTabChange }) {
 *   const { containerRef, getTabIndex, handleKeyDown } = useRovingTabindex({
 *     currentIndex: activeTab,
 *     onIndexChange: onTabChange,
 *     horizontal: true,
 *   });
 *
 *   return (
 *     <div ref={containerRef} role="tablist" onKeyDown={handleKeyDown}>
 *       {tabs.map((tab, index) => (
 *         <button
 *           key={tab.id}
 *           role="tab"
 *           tabIndex={getTabIndex(index)}
 *           onClick={() => onTabChange(index)}
 *         >
 *           {tab.label}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRovingTabindex(options: RovingTabindexOptions = {}): {
  containerRef: React.RefObject<HTMLElement | null>;
  getTabIndex: (index: number) => 0 | -1;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  focusIndex: (index: number) => void;
} {
  const {
    wrap = true,
    horizontal = true,
    vertical = false,
    currentIndex = 0,
    onIndexChange,
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => {
      return index === currentIndex ? 0 : -1;
    },
    [currentIndex]
  );

  const focusIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const focusableElements = getFocusableElements(container);
      const element = focusableElements[index];
      if (element) {
        element.focus();
        onIndexChange?.(index);
      }
    },
    [onIndexChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const focusableElements = getFocusableElements(container);
      const length = focusableElements.length;
      if (length === 0) return;

      let newIndex = currentIndex;
      const isNext =
        (horizontal && event.key === "ArrowRight") ||
        (vertical && event.key === "ArrowDown");
      const isPrev =
        (horizontal && event.key === "ArrowLeft") ||
        (vertical && event.key === "ArrowUp");
      const isHome = event.key === "Home";
      const isEnd = event.key === "End";

      if (isNext) {
        event.preventDefault();
        newIndex = wrap
          ? (currentIndex + 1) % length
          : Math.min(currentIndex + 1, length - 1);
      } else if (isPrev) {
        event.preventDefault();
        newIndex = wrap
          ? (currentIndex - 1 + length) % length
          : Math.max(currentIndex - 1, 0);
      } else if (isHome) {
        event.preventDefault();
        newIndex = 0;
      } else if (isEnd) {
        event.preventDefault();
        newIndex = length - 1;
      }

      if (newIndex !== currentIndex) {
        focusIndex(newIndex);
      }
    },
    [currentIndex, horizontal, vertical, wrap, focusIndex]
  );

  return {
    containerRef,
    getTabIndex,
    handleKeyDown,
    focusIndex,
  };
}

// ============================================================================
// SKIP LINK HOOK
// ============================================================================

/**
 * Hook for skip link functionality.
 * Allows keyboard users to skip navigation and jump to main content.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { skipLinkProps, targetProps } = useSkipLink();
 *
 *   return (
 *     <>
 *       <a {...skipLinkProps}>Skip to main content</a>
 *       <nav>...</nav>
 *       <main {...targetProps}>
 *         Content here
 *       </main>
 *     </>
 *   );
 * }
 * ```
 */
export function useSkipLink(targetId: string = "main-content"): {
  skipLinkProps: {
    href: string;
    onClick: (event: React.MouseEvent) => void;
    className: string;
  };
  targetProps: {
    id: string;
    tabIndex: -1;
    ref: React.RefObject<HTMLElement | null>;
  };
} {
  const targetRef = useRef<HTMLElement | null>(null);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const target = targetRef.current ?? document.getElementById(targetId);
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus();
        target.scrollIntoView({ behavior: "smooth" });
      }
    },
    [targetId]
  );

  return {
    skipLinkProps: {
      href: `#${targetId}`,
      onClick: handleClick,
      className: "skip-link",
    },
    targetProps: {
      id: targetId,
      tabIndex: -1,
      ref: targetRef,
    },
  };
}

// ============================================================================
// FOCUS VISIBLE HOOK
// ============================================================================

/**
 * Hook to detect if focus is from keyboard navigation (focus-visible).
 * Useful for styling focus indicators only when using keyboard.
 *
 * @example
 * ```tsx
 * function Button({ children }) {
 *   const { ref, isFocusVisible } = useFocusVisible();
 *
 *   return (
 *     <button
 *       ref={ref}
 *       className={isFocusVisible ? 'focus-visible' : ''}
 *     >
 *       {children}
 *     </button>
 *   );
 * }
 * ```
 */
export function useFocusVisible<T extends HTMLElement = HTMLElement>(): {
  ref: React.RefObject<T | null>;
  isFocusVisible: boolean;
  isFocused: boolean;
} {
  const ref = useRef<T | null>(null);
  const isFocusedRef = useRef(false);
  const isFocusVisibleRef = useRef(false);
  const hadKeyboardEventRef = useRef(false);
  const forceUpdateRef = useRef(0);

  // Force re-render when focus state changes
  const forceUpdate = useCallback(() => {
    forceUpdateRef.current++;
  }, []);

  useEffect(() => {
    const handleKeyDown = () => {
      hadKeyboardEventRef.current = true;
    };

    const handlePointerDown = () => {
      hadKeyboardEventRef.current = false;
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      isFocusedRef.current = true;
      isFocusVisibleRef.current = hadKeyboardEventRef.current;
      forceUpdate();
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      isFocusVisibleRef.current = false;
      forceUpdate();
    };

    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);

    return () => {
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
    };
  }, [forceUpdate]);

  return {
    ref,
    isFocusVisible: isFocusVisibleRef.current,
    isFocused: isFocusedRef.current,
  };
}

// Re-export relevant accessibility constants
export { FOCUSABLE_SELECTOR };
