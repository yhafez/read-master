/**
 * Skip Navigation Links
 *
 * Provides keyboard users a way to skip repetitive content
 * and jump directly to main content areas (WCAG 2.4.1)
 */

import { Box, styled } from "@mui/material";

const SkipLink = styled("a")(({ theme }) => ({
  position: "absolute",
  top: "-100px",
  left: theme.spacing(2),
  zIndex: 9999,
  padding: theme.spacing(1.5, 3),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  textDecoration: "none",
  borderRadius: theme.shape.borderRadius,
  fontWeight: 600,
  fontSize: "1rem",
  boxShadow: theme.shadows[4],
  transition: "top 0.2s ease-in-out",

  "&:focus": {
    top: theme.spacing(2),
    outline: `3px solid ${theme.palette.secondary.main}`,
    outlineOffset: "2px",
  },
}));

export function SkipNavigation() {
  return (
    <Box component="nav" aria-label="Skip navigation">
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>
      <SkipLink href="#search">Skip to search</SkipLink>
    </Box>
  );
}
