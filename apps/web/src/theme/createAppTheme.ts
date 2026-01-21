/**
 * Theme factory for Read Master
 *
 * Creates MUI themes with custom palettes and typography settings
 */

import { createTheme } from "@mui/material";
import type { Theme, ThemeOptions } from "@mui/material";

import { getPalette } from "./palettes";
import { createTypography } from "./typography";
import type { ThemeSettings } from "./types";
import { DEFAULT_THEME_SETTINGS } from "./types";

/**
 * Component overrides for consistent styling across themes
 */
function getComponentOverrides(
  mode: ThemeSettings["mode"]
): ThemeOptions["components"] {
  const isHighContrast = mode === "high-contrast";

  return {
    MuiCssBaseline: {
      styleOverrides: {
        // Ensure focus is always visible for accessibility
        "*:focus-visible": {
          outline: isHighContrast
            ? "3px solid currentColor"
            : "2px solid currentColor",
          outlineOffset: "2px",
        },
        // Smooth scrolling for better UX (respects prefers-reduced-motion)
        html: {
          scrollBehavior: "smooth",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
        // Better touch targets
        "button, a, input, select, textarea": {
          minHeight: "44px",
          minWidth: "44px",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: "8px",
          padding: "8px 16px",
          minHeight: "44px", // Touch target
          fontWeight: 600,
          ...(isHighContrast && {
            border: "2px solid currentColor",
          }),
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: "44px",
          minHeight: "44px",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            ...(isHighContrast && {
              "& fieldset": {
                borderWidth: "2px",
              },
            }),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          ...(isHighContrast && {
            border: "2px solid currentColor",
          }),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          ...(isHighContrast && {
            border: "2px solid currentColor",
          }),
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          fontSize: "0.875rem",
          borderRadius: "8px",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "16px",
        },
      },
    },
    MuiLink: {
      defaultProps: {
        underline: "hover",
      },
      styleOverrides: {
        root: {
          ...(isHighContrast && {
            textDecoration: "underline",
            textDecorationThickness: "2px",
          }),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          height: "8px",
        },
      },
    },
  };
}

/**
 * Create a complete MUI theme with Read Master settings
 */
export function createAppTheme(settings: Partial<ThemeSettings> = {}): Theme {
  const mergedSettings: ThemeSettings = {
    ...DEFAULT_THEME_SETTINGS,
    ...settings,
  };

  const palette = getPalette(mergedSettings.mode);
  const typography = createTypography(mergedSettings);
  const components = getComponentOverrides(mergedSettings.mode);

  const themeOptions: ThemeOptions = {
    palette,
    typography,
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
  };

  // Create base theme first, then apply components
  const baseTheme = createTheme(themeOptions);

  return createTheme(baseTheme, {
    components,
  });
}

/**
 * Pre-built themes for quick access
 */
export const themes = {
  light: createAppTheme({ mode: "light" }),
  dark: createAppTheme({ mode: "dark" }),
  sepia: createAppTheme({ mode: "sepia" }),
  "high-contrast": createAppTheme({ mode: "high-contrast" }),
} as const;
