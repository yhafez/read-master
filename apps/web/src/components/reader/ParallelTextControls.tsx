/**
 * Parallel Text Controls Component
 *
 * Controls for managing parallel text display settings.
 */

import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Switch,
  Tooltip,
} from "@mui/material";
import {
  ViewColumn as ParallelIcon,
  Settings as SettingsIcon,
  Numbers as NumbersIcon,
  Percent as PercentIcon,
  Highlight as HighlightIcon,
  CompareArrows as CompareIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { AlignmentStrategy } from "@/utils/parallelTextUtils";

// ============================================================================
// Types
// ============================================================================

type ParallelTextControlsProps = {
  alignmentStrategy: AlignmentStrategy;
  onAlignmentChange: (strategy: AlignmentStrategy) => void;
  showLineNumbers: boolean;
  onShowLineNumbersChange: (show: boolean) => void;
  showConfidence: boolean;
  onShowConfidenceChange: (show: boolean) => void;
  highlightMismatches: boolean;
  onHighlightMismatchesChange: (highlight: boolean) => void;
  onRealign?: () => void;
};

// ============================================================================
// Main Component
// ============================================================================

export function ParallelTextControls({
  alignmentStrategy,
  onAlignmentChange,
  showLineNumbers,
  onShowLineNumbersChange,
  showConfidence,
  onShowConfidenceChange,
  highlightMismatches,
  onHighlightMismatchesChange,
  onRealign,
}: ParallelTextControlsProps): React.ReactElement {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleStrategyChange = (strategy: AlignmentStrategy): void => {
    onAlignmentChange(strategy);
    if (onRealign) {
      onRealign();
    }
  };

  return (
    <>
      <Tooltip title={t("parallelText.controls")}>
        <IconButton onClick={handleClick} size="small" color="primary">
          <ParallelIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        {/* Alignment Strategy */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t("parallelText.alignmentStrategy")}
          </Typography>
        </Box>

        <MenuItem
          selected={alignmentStrategy === "auto"}
          onClick={() => handleStrategyChange("auto")}
        >
          <ListItemIcon>
            <SettingsIcon
              fontSize="small"
              color={alignmentStrategy === "auto" ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.strategyAuto")}</ListItemText>
        </MenuItem>

        <MenuItem
          selected={alignmentStrategy === "line"}
          onClick={() => handleStrategyChange("line")}
        >
          <ListItemIcon>
            <NumbersIcon
              fontSize="small"
              color={alignmentStrategy === "line" ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.strategyLine")}</ListItemText>
        </MenuItem>

        <MenuItem
          selected={alignmentStrategy === "paragraph"}
          onClick={() => handleStrategyChange("paragraph")}
        >
          <ListItemIcon>
            <CompareIcon
              fontSize="small"
              color={alignmentStrategy === "paragraph" ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.strategyParagraph")}</ListItemText>
        </MenuItem>

        <MenuItem
          selected={alignmentStrategy === "sentence"}
          onClick={() => handleStrategyChange("sentence")}
        >
          <ListItemIcon>
            <CompareIcon
              fontSize="small"
              color={alignmentStrategy === "sentence" ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.strategySentence")}</ListItemText>
        </MenuItem>

        <Divider />

        {/* Display Options */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t("parallelText.displayOptions")}
          </Typography>
        </Box>

        <MenuItem onClick={() => onShowLineNumbersChange(!showLineNumbers)}>
          <ListItemIcon>
            <NumbersIcon
              fontSize="small"
              color={showLineNumbers ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.showLineNumbers")}</ListItemText>
          <Switch edge="end" checked={showLineNumbers} size="small" />
        </MenuItem>

        <MenuItem onClick={() => onShowConfidenceChange(!showConfidence)}>
          <ListItemIcon>
            <PercentIcon
              fontSize="small"
              color={showConfidence ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.showConfidence")}</ListItemText>
          <Switch edge="end" checked={showConfidence} size="small" />
        </MenuItem>

        <MenuItem
          onClick={() => onHighlightMismatchesChange(!highlightMismatches)}
        >
          <ListItemIcon>
            <HighlightIcon
              fontSize="small"
              color={highlightMismatches ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("parallelText.highlightMismatches")}</ListItemText>
          <Switch edge="end" checked={highlightMismatches} size="small" />
        </MenuItem>

        {onRealign && (
          <>
            <Divider />
            <MenuItem
              onClick={() => {
                onRealign();
                handleClose();
              }}
            >
              <ListItemIcon>
                <CompareIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText>{t("parallelText.realign")}</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}

export default ParallelTextControls;
