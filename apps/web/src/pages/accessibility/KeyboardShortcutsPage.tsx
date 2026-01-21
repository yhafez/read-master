/**
 * Keyboard Shortcuts Help Page
 *
 * Documents all keyboard shortcuts available in Read Master
 * for improved accessibility and power user efficiency
 */

import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from "@mui/material";
import { Helmet } from "react-helmet-async";

type ShortcutGroup = {
  title: string;
  description: string;
  shortcuts: {
    keys: string[];
    description: string;
    context?: string;
  }[];
};

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Global Navigation",
    description: "Available on all pages",
    shortcuts: [
      {
        keys: ["Alt", "H"],
        description: "Go to Home page",
      },
      {
        keys: ["Alt", "L"],
        description: "Go to Library",
      },
      {
        keys: ["Alt", "S"],
        description: "Focus Search",
      },
      {
        keys: ["Alt", "P"],
        description: "Go to Profile",
      },
      {
        keys: ["Alt", ","],
        description: "Go to Settings",
      },
      {
        keys: ["?"],
        description: "Show Keyboard Shortcuts (this page)",
      },
    ],
  },
  {
    title: "Reader Controls",
    description: "Available when reading a book",
    shortcuts: [
      {
        keys: ["←", "→"],
        description: "Navigate between pages/chapters",
      },
      {
        keys: ["Space"],
        description: "Scroll down / Next page",
      },
      {
        keys: ["Shift", "Space"],
        description: "Scroll up / Previous page",
      },
      {
        keys: ["Home"],
        description: "Go to beginning",
      },
      {
        keys: ["End"],
        description: "Go to end",
      },
      {
        keys: ["F"],
        description: "Toggle fullscreen",
      },
      {
        keys: ["T"],
        description: "Toggle table of contents",
      },
      {
        keys: ["N"],
        description: "Toggle annotations panel",
      },
      {
        keys: ["[", "]"],
        description: "Toggle two-page spread (desktop only)",
        context: "Desktop only, screen width > 1200px",
      },
      {
        keys: ["-", "+"],
        description: "Decrease / Increase font size",
      },
      {
        keys: ["Esc"],
        description: "Exit fullscreen / Close dialogs",
      },
    ],
  },
  {
    title: "Text Selection & Annotations",
    description: "When text is selected in the reader",
    shortcuts: [
      {
        keys: ["Ctrl/Cmd", "H"],
        description: "Highlight selected text",
      },
      {
        keys: ["Ctrl/Cmd", "N"],
        description: "Add note to selection",
      },
      {
        keys: ["Ctrl/Cmd", "D"],
        description: "Look up definition (dictionary)",
      },
      {
        keys: ["Ctrl/Cmd", "E"],
        description: "Explain with AI",
      },
      {
        keys: ["Ctrl/Cmd", "F"],
        description: "Create flashcard from selection",
      },
    ],
  },
  {
    title: "Text-to-Speech (TTS)",
    description: "Audio reading controls",
    shortcuts: [
      {
        keys: ["Alt", "P"],
        description: "Play / Pause TTS",
        context: "In reader",
      },
      {
        keys: ["Alt", "["],
        description: "Previous sentence",
      },
      {
        keys: ["Alt", "]"],
        description: "Next sentence",
      },
      {
        keys: ["Alt", "-"],
        description: "Decrease playback speed",
      },
      {
        keys: ["Alt", "+"],
        description: "Increase playback speed",
      },
    ],
  },
  {
    title: "Library Management",
    description: "Available in the library view",
    shortcuts: [
      {
        keys: ["Ctrl/Cmd", "F"],
        description: "Focus search / filter",
      },
      {
        keys: ["Ctrl/Cmd", "A"],
        description: "Select all books",
      },
      {
        keys: ["Ctrl/Cmd", "D"],
        description: "Deselect all",
      },
      {
        keys: ["Delete"],
        description: "Delete selected books",
      },
      {
        keys: ["G", "R"],
        description: "Filter by Currently Reading",
      },
      {
        keys: ["G", "C"],
        description: "Filter by Completed",
      },
      {
        keys: ["G", "W"],
        description: "Filter by Want to Read",
      },
    ],
  },
  {
    title: "Flashcards (SRS)",
    description: "During flashcard review sessions",
    shortcuts: [
      {
        keys: ["Space"],
        description: "Reveal answer",
      },
      {
        keys: ["1"],
        description: "Again (forgot)",
      },
      {
        keys: ["2"],
        description: "Hard",
      },
      {
        keys: ["3"],
        description: "Good",
      },
      {
        keys: ["4"],
        description: "Easy",
      },
      {
        keys: ["E"],
        description: "Edit current card",
      },
      {
        keys: ["Esc"],
        description: "Exit review session",
      },
    ],
  },
  {
    title: "Accessibility",
    description: "Accessibility-specific shortcuts",
    shortcuts: [
      {
        keys: ["Alt", "1"],
        description: "Skip to main content",
      },
      {
        keys: ["Alt", "2"],
        description: "Skip to navigation",
      },
      {
        keys: ["Alt", "3"],
        description: "Skip to search",
      },
      {
        keys: ["Ctrl/Cmd", "\\"],
        description: "Toggle high contrast mode",
      },
      {
        keys: ["Ctrl/Cmd", "0"],
        description: "Reset zoom to 100%",
      },
    ],
  },
];

function KeyCombo({ keys }: { keys: string[] }): JSX.Element {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {keys.map((key, index) => (
        <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Chip
            label={key}
            size="small"
            sx={{
              fontFamily: "monospace",
              fontWeight: 600,
              minWidth: "auto",
            }}
          />
          {index < keys.length - 1 && (
            <Typography variant="body2" component="span" sx={{ px: 0.5 }}>
              +
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function KeyboardShortcutsPage() {
  return (
    <>
      <Helmet>
        <title>Keyboard Shortcuts - Read Master</title>
        <meta
          name="description"
          content="Complete guide to Read Master keyboard shortcuts for faster navigation and accessibility"
        />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Keyboard Shortcuts
        </Typography>

        <Typography variant="body1" paragraph>
          Read Master provides extensive keyboard shortcuts for efficient
          navigation and improved accessibility. All features are fully accessible
          via keyboard.
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Note:</strong> "Ctrl" refers to the Control key on Windows/Linux
            and the Command (⌘) key on macOS.
          </Typography>
        </Alert>

        {shortcutGroups.map((group, index) => (
          <Box key={index} component="section" mb={6}>
            <Typography variant="h2" component="h2" gutterBottom>
              {group.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {group.description}
            </Typography>

            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: "30%" }}>
                      Shortcut
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.shortcuts.map((shortcut, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <KeyCombo keys={shortcut.keys} />
                      </TableCell>
                      <TableCell>
                        {shortcut.description}
                        {shortcut.context && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            {shortcut.context}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}

        <Paper elevation={0} sx={{ p: 3, mt: 4, bgcolor: "grey.100" }}>
          <Typography variant="h3" component="h3" gutterBottom>
            Tips for Keyboard Navigation
          </Typography>
          <Typography variant="body2" paragraph>
            • Press <strong>Tab</strong> to move focus forward through interactive
            elements
          </Typography>
          <Typography variant="body2" paragraph>
            • Press <strong>Shift + Tab</strong> to move focus backward
          </Typography>
          <Typography variant="body2" paragraph>
            • Press <strong>Enter</strong> or <strong>Space</strong> to activate
            buttons and links
          </Typography>
          <Typography variant="body2" paragraph>
            • Press <strong>Arrow keys</strong> to navigate within menus, lists,
            and radio groups
          </Typography>
          <Typography variant="body2" paragraph>
            • Press <strong>Esc</strong> to close dialogs, menus, and modals
          </Typography>
          <Typography variant="body2">
            • Look for visible focus indicators (blue outlines) to see which
            element has focus
          </Typography>
        </Paper>

        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            Can't find a shortcut? Check our{" "}
            <a href="/accessibility-statement">Accessibility Statement</a> or{" "}
            <a href="mailto:accessibility@readmaster.ai">contact us</a> for help.
          </Typography>
        </Box>
      </Container>
    </>
  );
}
