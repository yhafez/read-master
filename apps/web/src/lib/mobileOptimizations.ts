/**
 * Mobile Performance Optimizations
 *
 * Utilities for optimizing the reading experience on mobile devices including:
 * - Passive event listeners for better scroll performance
 * - Debounced scroll handlers
 * - Viewport detection
 * - Touch gesture optimizations
 */

/**
 * Check if the device is mobile based on various criteria
 */
export function isMobileDevice(): boolean {
  // Check for touch support
  const hasTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is non-standard
    navigator.msMaxTouchPoints > 0;

  // Check screen size (typical mobile breakpoint)
  const isSmallScreen = window.matchMedia("(max-width: 900px)").matches;

  // Check user agent (less reliable but still useful)
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  return hasTouch && (isSmallScreen || isMobileUA);
}

/**
 * Check if device prefers reduced motion
 * Used to disable animations for users with motion sensitivity
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if device is in landscape orientation
 */
export function isLandscape(): boolean {
  return window.matchMedia("(orientation: landscape)").matches;
}

/**
 * Get safe area insets (for notched devices)
 */
export function getSafeAreaInsets() {
  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(
      computedStyle.getPropertyValue("--safe-area-inset-top") || "0",
      10
    ),
    right: parseInt(
      computedStyle.getPropertyValue("--safe-area-inset-right") || "0",
      10
    ),
    bottom: parseInt(
      computedStyle.getPropertyValue("--safe-area-inset-bottom") || "0",
      10
    ),
    left: parseInt(
      computedStyle.getPropertyValue("--safe-area-inset-left") || "0",
      10
    ),
  };
}

/**
 * Options for passive event listeners
 */
export const PASSIVE_EVENT_OPTIONS: AddEventListenerOptions = {
  passive: true,
  capture: false,
};

/**
 * Options for passive capture event listeners
 */
export const PASSIVE_CAPTURE_EVENT_OPTIONS: AddEventListenerOptions = {
  passive: true,
  capture: true,
};

/**
 * Debounce function for performance
 * Delays execution until after specified wait time has elapsed since last call
 */
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 * Ensures function is called at most once per specified time period
 */
export function throttle<T extends (...args: never[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback for browsers that don't support it
 */
export function requestIdleCallbackPolyfill(
  callback: () => void,
  options?: { timeout?: number }
): number {
  const win = window as Window & {
    requestIdleCallback?: (
      cb: () => void,
      opts?: { timeout?: number }
    ) => number;
  };

  if (win.requestIdleCallback) {
    return win.requestIdleCallback(callback, options);
  }

  // Fallback to setTimeout
  return setTimeout(callback, options?.timeout || 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallbackPolyfill(id: number): void {
  const win = window as Window & { cancelIdleCallback?: (id: number) => void };

  if (win.cancelIdleCallback) {
    win.cancelIdleCallback(id);
  } else {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  }
}

/**
 * Preload an image for better performance
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * Check if element is in viewport
 * Useful for lazy loading and performance optimizations
 */
export function isInViewport(element: HTMLElement, threshold = 0): boolean {
  const rect = element.getBoundingClientRect();

  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) +
        threshold &&
    rect.right <=
      (window.innerWidth || document.documentElement.clientWidth) + threshold
  );
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/**
 * Check if device has high pixel density (Retina display)
 */
export function isHighDensityDisplay(): boolean {
  return window.devicePixelRatio > 1;
}

/**
 * Get connection quality hint (if available)
 */
export function getConnectionQuality(): "slow" | "fast" | "unknown" {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
    mozConnection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
    webkitConnection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  };

  const connection =
    nav.connection || nav.mozConnection || nav.webkitConnection;

  if (!connection) {
    return "unknown";
  }

  // Check for effective type
  if (connection.effectiveType) {
    return connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"
      ? "slow"
      : "fast";
  }

  // Check for save-data preference
  if (connection.saveData) {
    return "slow";
  }

  return "unknown";
}

/**
 * Disable text selection (useful during gestures)
 */
export function disableTextSelection(): void {
  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
}

/**
 * Enable text selection
 */
export function enableTextSelection(): void {
  document.body.style.userSelect = "";
  document.body.style.webkitUserSelect = "";
}

/**
 * Prevent default touch behavior (like pull-to-refresh)
 */
export function preventTouchDefaults(element: HTMLElement): void {
  element.addEventListener("touchstart", (e) => e.preventDefault(), {
    passive: false,
  });
  element.addEventListener("touchmove", (e) => e.preventDefault(), {
    passive: false,
  });
}

/**
 * Lock scroll on mobile (useful for modals)
 */
export function lockScroll(): void {
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
}

/**
 * Unlock scroll on mobile
 */
export function unlockScroll(): void {
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
}
