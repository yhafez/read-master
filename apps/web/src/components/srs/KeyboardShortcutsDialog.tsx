/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts for flashcard study.
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { STUDY_SHORTCUTS } from "./flashcardStudyTypes";

export interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({
  open,
  onClose,
}: KeyboardShortcutsDialogProps): React.ReactElement {
  const { t } = useTranslation();

  const shortcuts = [
    {
      key: t("flashcards.shortcuts.keys.space"),
      displayKey: "Space",
      action: t("flashcards.shortcuts.actions.showAnswer"),
    },
    {
      key: STUDY_SHORTCUTS.RATE_AGAIN,
      displayKey: "1",
      action: t("flashcards.shortcuts.actions.rateAgain"),
    },
    {
      key: STUDY_SHORTCUTS.RATE_HARD,
      displayKey: "2",
      action: t("flashcards.shortcuts.actions.rateHard"),
    },
    {
      key: STUDY_SHORTCUTS.RATE_GOOD,
      displayKey: "3",
      action: t("flashcards.shortcuts.actions.rateGood"),
    },
    {
      key: STUDY_SHORTCUTS.RATE_EASY,
      displayKey: "4",
      action: t("flashcards.shortcuts.actions.rateEasy"),
    },
    {
      key: STUDY_SHORTCUTS.UNDO,
      displayKey: "U",
      action: t("flashcards.shortcuts.actions.undo"),
    },
    {
      key: STUDY_SHORTCUTS.SUSPEND,
      displayKey: "S",
      action: t("flashcards.shortcuts.actions.suspend"),
    },
    {
      key: STUDY_SHORTCUTS.EDIT,
      displayKey: "E",
      action: t("flashcards.shortcuts.actions.edit"),
    },
    {
      key: STUDY_SHORTCUTS.HELP,
      displayKey: "?",
      action: t("flashcards.shortcuts.actions.help"),
    },
    {
      key: STUDY_SHORTCUTS.EXIT,
      displayKey: "Esc",
      action: t("flashcards.shortcuts.actions.exit"),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("flashcards.shortcuts.title")}</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("flashcards.shortcuts.description")}
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="subtitle2">
                    {t("flashcards.shortcuts.keyColumn")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2">
                    {t("flashcards.shortcuts.actionColumn")}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shortcuts.map((shortcut) => (
                <TableRow key={shortcut.key}>
                  <TableCell>
                    <Chip
                      label={shortcut.displayKey}
                      size="small"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        minWidth: 50,
                      }}
                    />
                  </TableCell>
                  <TableCell>{shortcut.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
