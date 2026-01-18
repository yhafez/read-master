/**
 * Typography configuration for Read Master
 *
 * Supports multiple font families including OpenDyslexic for accessibility
 */

import type { TypographyOptions } from "@mui/material/styles/createTypography";

import type { FontFamily, ThemeSettings } from "./types";

/**
 * Font stack definitions
 */
export const fontStacks: Record<FontFamily, string> = {
  system: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(","),
  serif: ["Georgia", '"Times New Roman"', "Times", "serif"].join(","),
  opendyslexic: [
    "OpenDyslexic",
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    "sans-serif",
  ].join(","),
};

/**
 * Base typography configuration
 */
const baseTypography: TypographyOptions = {
  htmlFontSize: 16,
  h1: {
    fontSize: "2.5rem",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: "2rem",
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: "1.75rem",
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: "1.5rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: "1.25rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: "1rem",
    lineHeight: 1.5,
  },
  body2: {
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.5,
  },
  button: {
    fontSize: "0.875rem",
    fontWeight: 600,
    textTransform: "none", // More readable than uppercase
  },
  caption: {
    fontSize: "0.75rem",
    lineHeight: 1.4,
  },
  overline: {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
};

/**
 * Create typography configuration with custom settings
 */
export function createTypography(settings: ThemeSettings): TypographyOptions {
  const fontFamily = fontStacks[settings.fontFamily];
  const sizeMultiplier = settings.fontSize;
  const lineHeightMultiplier = settings.lineHeight / 1.5; // Normalize to base 1.5
  const letterSpacing = `${settings.letterSpacing}em`;

  return {
    ...baseTypography,
    fontFamily,
    h1: {
      ...baseTypography.h1,
      fontSize: `${2.5 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.h1?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    h2: {
      ...baseTypography.h2,
      fontSize: `${2 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.h2?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    h3: {
      ...baseTypography.h3,
      fontSize: `${1.75 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.h3?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    h4: {
      ...baseTypography.h4,
      fontSize: `${1.5 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.h4?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    h5: {
      ...baseTypography.h5,
      fontSize: `${1.25 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.h5?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    h6: {
      ...baseTypography.h6,
      fontSize: `${1 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.h6?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    body1: {
      ...baseTypography.body1,
      fontSize: `${1 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.body1?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    body2: {
      ...baseTypography.body2,
      fontSize: `${0.875 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.body2?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    subtitle1: {
      ...baseTypography.subtitle1,
      fontSize: `${1 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.subtitle1?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    subtitle2: {
      ...baseTypography.subtitle2,
      fontSize: `${0.875 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.subtitle2?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    button: {
      ...baseTypography.button,
      fontSize: `${0.875 * sizeMultiplier}rem`,
      letterSpacing,
    },
    caption: {
      ...baseTypography.caption,
      fontSize: `${0.75 * sizeMultiplier}rem`,
      lineHeight:
        (baseTypography.caption?.lineHeight as number) * lineHeightMultiplier,
      letterSpacing,
    },
    overline: {
      ...baseTypography.overline,
      fontSize: `${0.75 * sizeMultiplier}rem`,
      // Keep default letter spacing for overline to maintain visual distinction
    },
  };
}
