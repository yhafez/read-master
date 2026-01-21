/**
 * High Contrast Mode Detection Hook
 *
 * Detects if the user has enabled high-contrast mode in their OS.
 * Works with Windows High Contrast Mode and other OS accessibility settings.
 *
 * @example
 * ```tsx
 * const isHighContrast = useHighContrast();
 *
 * <Box
 *   sx={{
 *     border: isHighContrast ? '2px solid currentColor' : '1px solid',
 *   }}
 * />
 * ```
 */

import { useState, useEffect } from "react";

/**
 * Hook to detect if user has enabled high-contrast mode
 * 
 * Respects the system preference for high contrast (e.g. Windows High Contrast Mode)
 * 
 * @returns true if user prefers high contrast, false otherwise
 */
export function useHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(() => {
    // Check on initial render
    if (typeof window !== "undefined" && window.matchMedia) {
      // Check for prefers-contrast media query (modern browsers)
      const contrastQuery = window.matchMedia("(prefers-contrast: more)");
      if (contrastQuery.matches) {
        return true;
      }

      // Check for forced-colors media query (Windows High Contrast Mode)
      const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
      if (forcedColorsQuery.matches) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");

    // Update state when preference changes
    const handleChange = () => {
      setPrefersHighContrast(
        contrastQuery.matches || forcedColorsQuery.matches
      );
    };

    // Modern browsers
    if (contrastQuery.addEventListener) {
      contrastQuery.addEventListener("change", handleChange);
      forcedColorsQuery.addEventListener("change", handleChange);
      return () => {
        contrastQuery.removeEventListener("change", handleChange);
        forcedColorsQuery.removeEventListener("change", handleChange);
      };
    }

    // Legacy browsers
    contrastQuery.addListener(handleChange);
    forcedColorsQuery.addListener(handleChange);
    return () => {
      contrastQuery.removeListener(handleChange);
      forcedColorsQuery.removeListener(handleChange);
    };
  }, []);

  return prefersHighContrast;
}

export default useHighContrast;
