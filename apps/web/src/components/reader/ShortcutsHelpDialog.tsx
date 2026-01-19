/**
 * Help dialog displaying all keyboard shortcuts and touch gestures.
 * Organizes shortcuts by category with visual key representations.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import TouchAppIcon from "@mui/icons-material/TouchApp";

import {
  SHORTCUT_CATEGORIES,
  getGroupedShortcuts,
  formatShortcutDisplay,
  isMacPlatform,
  getCategoryLabelKey,
  type ShortcutCategory,
  type ShortcutDefinition,
  type GestureDefinition,
} from "./keyboardShortcutTypes";

export interface ShortcutsHelpDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
}

/**
 * A single keyboard shortcut row
 */
function ShortcutRow({
  shortcut,
  isMac,
}: {
  shortcut: ShortcutDefinition;
  isMac: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 0.75,
        px: 1,
        borderRadius: 1,
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      <Typography variant="body2" sx={{ flex: 1 }}>
        {t(shortcut.labelKey, shortcut.id)}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {formatShortcutDisplay(shortcut, isMac)
          .split(isMac ? "" : " + ")
          .filter((k) => k.trim())
          .map((key, index) => (
            <Chip
              key={index}
              label={key}
              size="small"
              sx={{
                height: 24,
                minWidth: 28,
                fontFamily: "monospace",
                fontSize: "0.75rem",
                fontWeight: 500,
                bgcolor:
                  theme.palette.mode === "dark" ? "grey.800" : "grey.200",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0.5,
              }}
            />
          ))}
      </Box>
    </Box>
  );
}

/**
 * A single gesture row
 */
function GestureRow({ gesture }: { gesture: GestureDefinition }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 0.75,
        px: 1,
        borderRadius: 1,
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      <Typography variant="body2" sx={{ flex: 1 }}>
        {t(gesture.labelKey, gesture.id)}
      </Typography>
      <Chip
        icon={<TouchAppIcon sx={{ fontSize: 14 }} />}
        label={t(gesture.descriptionKey, gesture.type)}
        size="small"
        sx={{
          height: 24,
          fontSize: "0.7rem",
          bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.200",
          border: `1px solid ${theme.palette.divider}`,
        }}
      />
    </Box>
  );
}

/**
 * Category section with accordion
 */
function CategorySection({
  category,
  shortcuts,
  gestures,
  isMac,
  defaultExpanded,
}: {
  category: ShortcutCategory;
  shortcuts: ShortcutDefinition[];
  gestures: GestureDefinition[];
  isMac: boolean;
  defaultExpanded: boolean;
}) {
  const { t } = useTranslation();

  if (shortcuts.length === 0 && gestures.length === 0) {
    return null;
  }

  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters elevation={0}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 48,
          "&.Mui-expanded": { minHeight: 48 },
          bgcolor: "transparent",
        }}
      >
        <Typography variant="subtitle1" fontWeight={500}>
          {t(getCategoryLabelKey(category), category)}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Grid container spacing={2}>
          {/* Keyboard shortcuts */}
          {shortcuts.length > 0 && (
            <Grid item xs={12} md={gestures.length > 0 ? 6 : 12}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <KeyboardIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {t("reader.shortcuts.keyboard", "Keyboard")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                {shortcuts.map((shortcut) => (
                  <ShortcutRow
                    key={shortcut.id}
                    shortcut={shortcut}
                    isMac={isMac}
                  />
                ))}
              </Box>
            </Grid>
          )}

          {/* Touch gestures */}
          {gestures.length > 0 && (
            <Grid item xs={12} md={shortcuts.length > 0 ? 6 : 12}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <TouchAppIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {t("reader.shortcuts.touch", "Touch")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                {gestures.map((gesture) => (
                  <GestureRow key={gesture.id} gesture={gesture} />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Help dialog displaying all keyboard shortcuts and touch gestures
 */
export function ShortcutsHelpDialog({
  open,
  onClose,
}: ShortcutsHelpDialogProps) {
  const { t } = useTranslation();
  const isMac = useMemo(() => isMacPlatform(), []);
  const groupedShortcuts = useMemo(() => getGroupedShortcuts(), []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="shortcuts-help-dialog-title"
    >
      <DialogTitle
        id="shortcuts-help-dialog-title"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <KeyboardIcon />
          <Typography variant="h6" component="span">
            {t("reader.shortcuts.title", "Keyboard Shortcuts & Gestures")}
          </Typography>
        </Box>
        <IconButton
          aria-label={t("common.close", "Close")}
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isMac
            ? t(
                "reader.shortcuts.macHint",
                "Using Mac keyboard shortcuts. Press ⌘ for Control key commands."
              )
            : t(
                "reader.shortcuts.hint",
                "Press ? (Shift + /) anytime to open this help dialog."
              )}
        </Typography>

        {SHORTCUT_CATEGORIES.map((category, index) => (
          <CategorySection
            key={category}
            category={category}
            shortcuts={groupedShortcuts[category].shortcuts}
            gestures={groupedShortcuts[category].gestures}
            isMac={isMac}
            defaultExpanded={index === 0}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsHelpDialog;
