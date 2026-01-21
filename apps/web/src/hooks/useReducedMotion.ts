/**
 * Reduced Motion Hook
 *
 * Detects if the user has enabled "prefers-reduced-motion" and provides
 * a way to respect their motion preferences throughout the app.
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * <Box
 *   sx={{
 *     transition: prefersReducedMotion ? 'none' : 'all 0.3s',
 *   }}
 * />
 * ```
 */

import { useState, useEffect } from "react";

/**
 * Hook to detect if user prefers reduced motion
 * 
 * Respects the system preference for reduced motion (e.g. macOS "Reduce motion" setting)
 * 
 * @returns true if user prefers reduced motion, false otherwise
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check on initial render
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Update state when preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
}

export default useReducedMotion;
