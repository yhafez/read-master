/**
 * AnnotationToolbar component
 *
 * A floating toolbar that appears on text selection, allowing users to:
 * - Create highlights with different colors
 * - Add notes
 * - Create bookmarks
 * - Copy text
 * - Look up definitions
 * - Get AI explanations
 */

import {
  Box,
  IconButton,
  Paper,
  Popper,
  Tooltip,
  Divider,
  ClickAwayListener,
} from "@mui/material";
import {
  ContentCopy,
  MenuBook,
  AutoAwesome,
  Bookmark,
  NoteAdd,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type {
  TextSelectionInfo,
  HighlightColor,
  AnnotationAction,
} from "./annotationTypes";
import {
  HIGHLIGHT_COLOR_VALUES,
  DEFAULT_HIGHLIGHT_COLOR,
} from "./annotationTypes";

export interface AnnotationToolbarProps {
  /** Selection information */
  selection: TextSelectionInfo | null;
  /** Called when toolbar action is triggered */
  onAction: (action: AnnotationAction, color?: HighlightColor) => void;
  /** Called when toolbar should close */
  onClose: () => void;
  /** Whether AI features are available */
  aiEnabled?: boolean;
  /** Whether lookup feature is available */
  lookupEnabled?: boolean;
  /** Anchor element for positioning */
  anchorEl: HTMLElement | null;
  /** Whether toolbar is open */
  open: boolean;
}

/**
 * Color button for highlight selection
 */
function ColorButton({
  hexValue,
  selected,
  onClick,
  label,
}: {
  hexValue: string;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={onClick}
        sx={{
          width: 24,
          height: 24,
          backgroundColor: hexValue,
          border: selected ? "2px solid" : "1px solid",
          borderColor: selected ? "primary.main" : "divider",
          "&:hover": {
            backgroundColor: hexValue,
            opacity: 0.8,
          },
        }}
        aria-label={label}
        aria-pressed={selected}
      />
    </Tooltip>
  );
}

export function AnnotationToolbar({
  selection,
  onAction,
  onClose,
  aiEnabled = true,
  lookupEnabled = true,
  anchorEl,
  open,
}: AnnotationToolbarProps) {
  const { t } = useTranslation();

  // Track selected highlight color
  const handleHighlight = (color: HighlightColor = DEFAULT_HIGHLIGHT_COLOR) => {
    onAction("highlight", color);
  };

  const handleCopy = async () => {
    if (selection?.text) {
      await navigator.clipboard.writeText(selection.text);
      onAction("copy");
    }
  };

  if (!selection) {
    return null;
  }

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="top"
      modifiers={[
        {
          name: "offset",
          options: {
            offset: [0, 8],
          },
        },
        {
          name: "preventOverflow",
          options: {
            boundary: "viewport",
            padding: 8,
          },
        },
      ]}
      sx={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={4}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderRadius: 2,
          }}
          role="toolbar"
          aria-label={t("reader.annotations.toolbar")}
        >
          {/* Highlight colors */}
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            {(
              Object.entries(HIGHLIGHT_COLOR_VALUES) as [
                HighlightColor,
                string,
              ][]
            ).map(([color, hex]) => (
              <ColorButton
                key={color}
                hexValue={hex}
                selected={false}
                onClick={() => handleHighlight(color)}
                label={t(`reader.annotations.colors.${color}`)}
              />
            ))}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Quick actions */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title={t("reader.annotations.addNote")}>
              <IconButton
                size="small"
                onClick={() => onAction("note")}
                aria-label={t("reader.annotations.addNote")}
              >
                <NoteAdd fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={t("reader.annotations.addBookmark")}>
              <IconButton
                size="small"
                onClick={() => onAction("bookmark")}
                aria-label={t("reader.annotations.addBookmark")}
              >
                <Bookmark fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={t("reader.annotations.copy")}>
              <IconButton
                size="small"
                onClick={handleCopy}
                aria-label={t("reader.annotations.copy")}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {(lookupEnabled || aiEnabled) && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

              <Box sx={{ display: "flex", gap: 0.5 }}>
                {lookupEnabled && (
                  <Tooltip title={t("reader.annotations.lookup")}>
                    <IconButton
                      size="small"
                      onClick={() => onAction("lookup")}
                      aria-label={t("reader.annotations.lookup")}
                    >
                      <MenuBook fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {aiEnabled && (
                  <Tooltip title={t("reader.annotations.explain")}>
                    <IconButton
                      size="small"
                      onClick={() => onAction("explain")}
                      aria-label={t("reader.annotations.explain")}
                      sx={{ color: "secondary.main" }}
                    >
                      <AutoAwesome fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </>
          )}
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
}

/**
 * Hook to get a virtual anchor element from selection position
 */
export function useSelectionAnchor(
  selection: TextSelectionInfo | null
): HTMLElement | null {
  if (!selection) return null;

  // Create a virtual element at the selection position
  const virtualElement = {
    getBoundingClientRect: () => ({
      width: selection.position.width,
      height: selection.position.height,
      top: selection.position.y,
      left: selection.position.x,
      right: selection.position.x + selection.position.width,
      bottom: selection.position.y + selection.position.height,
      x: selection.position.x,
      y: selection.position.y,
      toJSON: () => ({}),
    }),
  } as HTMLElement;

  return virtualElement;
}
