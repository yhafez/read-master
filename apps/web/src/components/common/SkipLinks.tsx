/**
 * Skip Links Component
 *
 * Provides keyboard navigation shortcuts to skip to main content areas.
 * Visible only when focused (for keyboard users).
 */

import { Box, Link } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Skip link targets
 */
const SKIP_TARGETS = [
  { id: "main-content", labelKey: "accessibility.skipToMain" },
  { id: "navigation", labelKey: "accessibility.skipToNav" },
  { id: "search", labelKey: "accessibility.skipToSearch" },
] as const;

/**
 * SkipLinks component
 */
export function SkipLinks(): React.ReactElement {
  const { t } = useTranslation();

  const handleSkip = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Box
      component="nav"
      aria-label={t("accessibility.skipLinks") || "Skip links"}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        "& a": {
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          "&:focus": {
            position: "fixed",
            top: 8,
            left: 8,
            width: "auto",
            height: "auto",
            overflow: "visible",
            padding: 2,
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            textDecoration: "none",
            borderRadius: 1,
            zIndex: 9999,
            boxShadow: 3,
          },
        },
      }}
    >
      {SKIP_TARGETS.map(({ id, labelKey }) => (
        <Link
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            handleSkip(id);
          }}
          sx={{ display: "block", mb: 1 }}
        >
          {t(labelKey)}
        </Link>
      ))}
    </Box>
  );
}

export default SkipLinks;
