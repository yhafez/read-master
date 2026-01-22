/**
 * Translation Controls Component
 *
 * Controls for managing translation comparison mode.
 */

import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Typography,
  Switch,
  Tooltip,
  Box,
  Chip,
} from "@mui/material";
import {
  Translate as TranslateIcon,
  CompareArrows as CompareIcon,
  Settings as SettingsIcon,
  Highlight as HighlightIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useTranslationStore,
  selectIsTranslationEnabled,
  selectHasTranslationPair,
  selectCanCompare,
} from "@/stores/useTranslationStore";
import { getLanguageName } from "@/utils/translationUtils";

// ============================================================================
// Types
// ============================================================================

type TranslationControlsProps = {
  onSelectOriginal?: () => void;
  onSelectTranslation?: () => void;
  onCompare?: () => void;
};

// ============================================================================
// Main Component
// ============================================================================

export function TranslationControls({
  onSelectOriginal,
  onSelectTranslation,
  onCompare,
}: TranslationControlsProps): React.ReactElement {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const isEnabled = useTranslationStore(selectIsTranslationEnabled);
  const hasBothBooks = useTranslationStore(selectHasTranslationPair);
  const canCompare = useTranslationStore(selectCanCompare);

  const {
    setEnabled,
    alignment,
    setAlignment,
    originalLanguage,
    translationLanguage,
    showMatchHighlights,
    setShowMatchHighlights,
    showConfidenceScores,
    setShowConfidenceScores,
    syncScroll,
    setSyncScroll,
    segments,
  } = useTranslationStore();

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleToggleEnabled = (): void => {
    setEnabled(!isEnabled);
    if (!isEnabled && onCompare) {
      onCompare();
    }
  };

  const handleCompare = (): void => {
    if (onCompare && hasBothBooks) {
      onCompare();
    }
    handleClose();
  };

  return (
    <>
      <Tooltip
        title={
          isEnabled
            ? t("translation.disableComparison")
            : t("translation.enableComparison")
        }
      >
        <IconButton
          onClick={handleClick}
          size="small"
          color={isEnabled ? "primary" : "default"}
        >
          <TranslateIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: { minWidth: 300 },
        }}
      >
        {/* Enable/Disable */}
        <MenuItem onClick={handleToggleEnabled}>
          <ListItemIcon>
            <TranslateIcon
              fontSize="small"
              color={isEnabled ? "primary" : "inherit"}
            />
          </ListItemIcon>
          <ListItemText>{t("translation.compareTranslations")}</ListItemText>
          <Switch edge="end" checked={isEnabled} size="small" />
        </MenuItem>

        {isEnabled && (
          <>
            <Divider />

            {/* Language Info */}
            {(originalLanguage || translationLanguage) && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Stack spacing={1}>
                  {originalLanguage && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("translation.originalLanguage")}
                      </Typography>
                      <Chip
                        label={getLanguageName(originalLanguage)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  )}
                  {translationLanguage && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("translation.translationLanguage")}
                      </Typography>
                      <Chip
                        label={getLanguageName(translationLanguage)}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            {/* Select Books */}
            {(onSelectOriginal || onSelectTranslation) && (
              <>
                <Divider />
                {onSelectOriginal && (
                  <MenuItem onClick={onSelectOriginal}>
                    <ListItemText inset>
                      {t("translation.selectOriginal")}
                    </ListItemText>
                  </MenuItem>
                )}
                {onSelectTranslation && (
                  <MenuItem onClick={onSelectTranslation}>
                    <ListItemText inset>
                      {t("translation.selectTranslation")}
                    </ListItemText>
                  </MenuItem>
                )}
              </>
            )}

            {/* Compare Button */}
            {hasBothBooks && onCompare && (
              <>
                <Divider />
                <MenuItem onClick={handleCompare} disabled={!canCompare}>
                  <ListItemIcon>
                    <CompareIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText>
                    {t("translation.startComparison")}
                    {segments.length > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {t("translation.segmentsFound", {
                          count: segments.length,
                        })}
                      </Typography>
                    )}
                  </ListItemText>
                </MenuItem>
              </>
            )}

            <Divider />

            {/* Alignment Mode */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("translation.alignmentMode")}
              </Typography>
            </Box>

            <MenuItem
              selected={alignment === "paragraph"}
              onClick={() => setAlignment("paragraph")}
            >
              <ListItemText inset>
                {t("translation.alignByParagraph")}
              </ListItemText>
            </MenuItem>

            <MenuItem
              selected={alignment === "sentence"}
              onClick={() => setAlignment("sentence")}
            >
              <ListItemText inset>
                {t("translation.alignBySentence")}
              </ListItemText>
            </MenuItem>

            <MenuItem
              selected={alignment === "manual"}
              onClick={() => setAlignment("manual")}
            >
              <ListItemText inset>
                {t("translation.manualAlignment")}
              </ListItemText>
            </MenuItem>

            <Divider />

            {/* Display Options */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("translation.displayOptions")}
              </Typography>
            </Box>

            <MenuItem
              onClick={() => setShowMatchHighlights(!showMatchHighlights)}
            >
              <ListItemIcon>
                {showMatchHighlights ? (
                  <HighlightIcon fontSize="small" color="primary" />
                ) : (
                  <HighlightIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{t("translation.highlightMatches")}</ListItemText>
              <Switch edge="end" checked={showMatchHighlights} size="small" />
            </MenuItem>

            <MenuItem
              onClick={() => setShowConfidenceScores(!showConfidenceScores)}
            >
              <ListItemIcon>
                {showConfidenceScores ? (
                  <VisibilityIcon fontSize="small" color="primary" />
                ) : (
                  <VisibilityOffIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{t("translation.showConfidence")}</ListItemText>
              <Switch edge="end" checked={showConfidenceScores} size="small" />
            </MenuItem>

            <MenuItem onClick={() => setSyncScroll(!syncScroll)}>
              <ListItemIcon>
                <SettingsIcon
                  fontSize="small"
                  color={syncScroll ? "primary" : "inherit"}
                />
              </ListItemIcon>
              <ListItemText>{t("translation.syncScroll")}</ListItemText>
              <Switch edge="end" checked={syncScroll} size="small" />
            </MenuItem>
          </>
        )}

        {!hasBothBooks && isEnabled && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {t("translation.selectBooksHint")}
              </Typography>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}

export default TranslationControls;
