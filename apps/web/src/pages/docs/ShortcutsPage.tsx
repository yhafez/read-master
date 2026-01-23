/**
 * Keyboard Shortcuts Documentation Page
 *
 * Comprehensive list of keyboard shortcuts available in Read Master.
 */

import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import InfoIcon from "@mui/icons-material/Info";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface Shortcut {
  keys: string[];
  descriptionKey: string;
  platform?: "mac" | "windows" | "all";
}

interface ShortcutCategory {
  titleKey: string;
  shortcuts: Shortcut[];
}

// ============================================================================
// Constants
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    titleKey: "docs.shortcuts.navigation",
    shortcuts: [
      { keys: ["→", "Space"], descriptionKey: "docs.shortcuts.nextPage" },
      { keys: ["←", "Shift+Space"], descriptionKey: "docs.shortcuts.prevPage" },
      { keys: ["Home"], descriptionKey: "docs.shortcuts.goToStart" },
      { keys: ["End"], descriptionKey: "docs.shortcuts.goToEnd" },
      { keys: ["Ctrl+G", "⌘G"], descriptionKey: "docs.shortcuts.goToPage" },
      { keys: ["Ctrl+F", "⌘F"], descriptionKey: "docs.shortcuts.search" },
    ],
  },
  {
    titleKey: "docs.shortcuts.reading",
    shortcuts: [
      { keys: ["F"], descriptionKey: "docs.shortcuts.fullscreen" },
      { keys: ["+", "="], descriptionKey: "docs.shortcuts.zoomIn" },
      { keys: ["-"], descriptionKey: "docs.shortcuts.zoomOut" },
      { keys: ["0"], descriptionKey: "docs.shortcuts.resetZoom" },
      { keys: ["T"], descriptionKey: "docs.shortcuts.toggleTheme" },
      { keys: ["S"], descriptionKey: "docs.shortcuts.toggleSidebar" },
    ],
  },
  {
    titleKey: "docs.shortcuts.annotations",
    shortcuts: [
      { keys: ["H"], descriptionKey: "docs.shortcuts.highlight" },
      { keys: ["N"], descriptionKey: "docs.shortcuts.addNote" },
      { keys: ["B"], descriptionKey: "docs.shortcuts.addBookmark" },
      { keys: ["Ctrl+C", "⌘C"], descriptionKey: "docs.shortcuts.copy" },
      { keys: ["Ctrl+A", "⌘A"], descriptionKey: "docs.shortcuts.selectAll" },
    ],
  },
  {
    titleKey: "docs.shortcuts.tts",
    shortcuts: [
      { keys: ["P"], descriptionKey: "docs.shortcuts.playPause" },
      { keys: ["["], descriptionKey: "docs.shortcuts.slowDown" },
      { keys: ["]"], descriptionKey: "docs.shortcuts.speedUp" },
      { keys: ["M"], descriptionKey: "docs.shortcuts.mute" },
    ],
  },
  {
    titleKey: "docs.shortcuts.flashcards",
    shortcuts: [
      { keys: ["Space", "Enter"], descriptionKey: "docs.shortcuts.showAnswer" },
      { keys: ["1"], descriptionKey: "docs.shortcuts.rateAgain" },
      { keys: ["2"], descriptionKey: "docs.shortcuts.rateHard" },
      { keys: ["3"], descriptionKey: "docs.shortcuts.rateGood" },
      { keys: ["4"], descriptionKey: "docs.shortcuts.rateEasy" },
      { keys: ["U"], descriptionKey: "docs.shortcuts.undoRating" },
    ],
  },
  {
    titleKey: "docs.shortcuts.general",
    shortcuts: [
      { keys: ["Ctrl+,", "⌘,"], descriptionKey: "docs.shortcuts.settings" },
      { keys: ["Ctrl+L", "⌘L"], descriptionKey: "docs.shortcuts.library" },
      { keys: ["Ctrl+D", "⌘D"], descriptionKey: "docs.shortcuts.dashboard" },
      { keys: ["?"], descriptionKey: "docs.shortcuts.help" },
      { keys: ["Esc"], descriptionKey: "docs.shortcuts.escape" },
    ],
  },
];

// ============================================================================
// Helper Components
// ============================================================================

function KeyChip({ keyName }: { keyName: string }) {
  // Replace platform-specific keys
  let displayKey = keyName;
  if (isMac) {
    displayKey = displayKey
      .replace("Ctrl+", "⌘")
      .replace("Alt+", "⌥")
      .replace("Shift+", "⇧");
  } else {
    displayKey = displayKey.replace("⌘", "Ctrl+");
  }

  return (
    <Chip
      label={displayKey}
      size="small"
      sx={{
        fontFamily: "monospace",
        fontWeight: 600,
        bgcolor: "grey.200",
        border: "1px solid",
        borderColor: "grey.400",
        borderRadius: 1,
        mx: 0.5,
      }}
    />
  );
}

// ============================================================================
// Component
// ============================================================================

export function ShortcutsPage() {
  const { t } = useTranslation();

  return (
    <DocsLayout
      title={t("docs.shortcuts.title", "Keyboard Shortcuts")}
      description={t(
        "docs.shortcuts.description",
        "Master keyboard shortcuts to navigate Read Master like a pro."
      )}
      breadcrumbs={[{ label: "docs.shortcuts.title" }]}
    >
      {/* Platform Info */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 4 }}>
        <Typography variant="body2">
          {isMac
            ? t(
                "docs.shortcuts.macTip",
                "You're on Mac. Use ⌘ (Command) instead of Ctrl for most shortcuts."
              )
            : t(
                "docs.shortcuts.windowsTip",
                "You're on Windows/Linux. Use Ctrl for modifier shortcuts."
              )}
        </Typography>
      </Alert>

      {/* Quick Reference Card */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <KeyboardIcon color="primary" />
            <Typography variant="h6">
              {t("docs.shortcuts.quickRef", "Quick Reference")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t(
              "docs.shortcuts.quickRefDesc",
              "Press ? at any time to show the keyboard shortcuts help overlay."
            )}
          </Typography>
        </CardContent>
      </Card>

      {/* Shortcut Categories */}
      <Grid container spacing={3}>
        {SHORTCUT_CATEGORIES.map((category) => (
          <Grid item xs={12} md={6} key={category.titleKey}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  {t(category.titleKey)}
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {t("docs.shortcuts.shortcut", "Shortcut")}
                        </TableCell>
                        <TableCell>
                          {t("docs.shortcuts.action", "Action")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {category.shortcuts.map((shortcut, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box
                              display="flex"
                              flexWrap="wrap"
                              alignItems="center"
                            >
                              {shortcut.keys.map((key, keyIndex) => (
                                <Box
                                  key={key}
                                  display="flex"
                                  alignItems="center"
                                >
                                  <KeyChip keyName={key} />
                                  {keyIndex < shortcut.keys.length - 1 && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mx: 0.5 }}
                                    >
                                      {t("common.or", "or")}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {t(shortcut.descriptionKey)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Customization Note */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          bgcolor: "grey.100",
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t("docs.shortcuts.customization", "Customization")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            "docs.shortcuts.customizationDesc",
            "Keyboard shortcuts can be customized in Settings > Keyboard Shortcuts. You can also disable shortcuts if they conflict with your browser or operating system."
          )}
        </Typography>
      </Box>
    </DocsLayout>
  );
}

export default ShortcutsPage;
