/**
 * MarkdownEditor Component
 *
 * A reusable markdown editor with formatting toolbar and optional preview.
 * Used for creating forum posts, replies, and other markdown content.
 */

import React, { useRef, useState } from "react";
import {
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Typography,
  Stack,
  Divider,
  type TextFieldProps,
} from "@mui/material";
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon,
  FormatListBulleted as ListIcon,
  FormatListNumbered as OrderedListIcon,
  Link as LinkIcon,
  StrikethroughS as StrikethroughIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { MarkdownPreview } from "./MarkdownPreview";

// ============================================================================
// Types
// ============================================================================

export type EditorMode = "write" | "preview";

export interface MarkdownEditorProps {
  /** Current value of the editor */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Number of rows for the text area */
  rows?: number;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows */
  maxRows?: number;
  /** Maximum character count */
  maxLength?: number;
  /** Whether to show the character counter */
  showCharCount?: boolean;
  /** Whether to show the preview toggle */
  showPreviewToggle?: boolean;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Helper text */
  helperText?: string;
  /** Label for the text field */
  label?: string;
  /** Additional props for the TextField */
  textFieldProps?: Partial<TextFieldProps>;
}

// ============================================================================
// Markdown Formatting Helpers
// ============================================================================

export interface FormatResult {
  newValue: string;
  newCursorPos: number;
}

/**
 * Inserts markdown formatting around selected text or at cursor
 */
export function insertFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string = prefix
): FormatResult {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);

  if (selected) {
    // Wrap selection
    const newValue = `${before}${prefix}${selected}${suffix}${after}`;
    return {
      newValue,
      newCursorPos: selectionStart + prefix.length + selected.length,
    };
  } else {
    // Insert at cursor with placeholder
    const newValue = `${before}${prefix}${suffix}${after}`;
    return {
      newValue,
      newCursorPos: selectionStart + prefix.length,
    };
  }
}

/**
 * Inserts a line prefix (for blockquotes, lists)
 */
export function insertLinePrefix(
  value: string,
  selectionStart: number,
  prefix: string
): FormatResult {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionStart);

  // Find start of current line
  const lineStart = before.lastIndexOf("\n") + 1;
  const beforeLine = value.slice(0, lineStart);
  const currentLine = value.slice(lineStart, selectionStart);

  const newValue = `${beforeLine}${prefix}${currentLine}${after}`;
  return {
    newValue,
    newCursorPos: selectionStart + prefix.length,
  };
}

/**
 * Inserts a link with placeholder
 */
export function insertLink(
  value: string,
  selectionStart: number,
  selectionEnd: number
): FormatResult {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);

  if (selected) {
    // Use selection as link text
    const newValue = `${before}[${selected}](url)${after}`;
    return {
      newValue,
      newCursorPos: selectionStart + selected.length + 3, // Position at "url"
    };
  } else {
    // Insert placeholder
    const newValue = `${before}[link text](url)${after}`;
    return {
      newValue,
      newCursorPos: selectionStart + 1, // Position at "link text"
    };
  }
}

// ============================================================================
// Toolbar Button Types
// ============================================================================

type FormatAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "quote"
  | "list"
  | "orderedList"
  | "link";

interface ToolbarButton {
  action: FormatAction;
  icon: React.ReactNode;
  label: string;
}

// ============================================================================
// Component
// ============================================================================

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
  minRows,
  maxRows,
  maxLength,
  showCharCount = true,
  showPreviewToggle = true,
  disabled = false,
  error = false,
  helperText,
  label,
  textFieldProps,
}: MarkdownEditorProps): React.ReactElement {
  const { t } = useTranslation();
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<EditorMode>("write");

  // Toolbar buttons
  const toolbarButtons: ToolbarButton[] = [
    { action: "bold", icon: <BoldIcon />, label: t("forum.formatting.bold") },
    {
      action: "italic",
      icon: <ItalicIcon />,
      label: t("forum.formatting.italic"),
    },
    {
      action: "strikethrough",
      icon: <StrikethroughIcon />,
      label: t("forum.formatting.strikethrough"),
    },
    { action: "code", icon: <CodeIcon />, label: t("forum.formatting.code") },
    {
      action: "quote",
      icon: <QuoteIcon />,
      label: t("forum.formatting.quote"),
    },
    { action: "list", icon: <ListIcon />, label: t("forum.formatting.list") },
    {
      action: "orderedList",
      icon: <OrderedListIcon />,
      label: t("forum.formatting.orderedList"),
    },
    { action: "link", icon: <LinkIcon />, label: t("forum.formatting.link") },
  ];

  // Handle format action
  const handleFormat = (action: FormatAction) => {
    if (!textFieldRef.current) return;

    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let result: FormatResult;

    switch (action) {
      case "bold":
        result = insertFormat(value, start, end, "**");
        break;
      case "italic":
        result = insertFormat(value, start, end, "*");
        break;
      case "strikethrough":
        result = insertFormat(value, start, end, "~~");
        break;
      case "code":
        result = insertFormat(value, start, end, "`");
        break;
      case "quote":
        result = insertLinePrefix(value, start, "> ");
        break;
      case "list":
        result = insertLinePrefix(value, start, "- ");
        break;
      case "orderedList":
        result = insertLinePrefix(value, start, "1. ");
        break;
      case "link":
        result = insertLink(value, start, end);
        break;
      default:
        return;
    }

    onChange(result.newValue);

    // Restore focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newCursorPos, result.newCursorPos);
    }, 0);
  };

  // Character count
  const charCount = value.length;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  return (
    <Box>
      {/* Toolbar */}
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{
          mb: 1,
          p: 0.5,
          borderRadius: 1,
          backgroundColor: "action.hover",
          flexWrap: "wrap",
        }}
      >
        {/* Format buttons */}
        {toolbarButtons.map((button) => (
          <Tooltip key={button.action} title={button.label}>
            <span>
              <IconButton
                size="small"
                onClick={() => handleFormat(button.action)}
                disabled={disabled || mode === "preview"}
                aria-label={button.label}
              >
                {button.icon}
              </IconButton>
            </span>
          </Tooltip>
        ))}

        {showPreviewToggle && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_e, newMode) => {
                if (newMode) setMode(newMode);
              }}
              size="small"
              aria-label={t("forum.editorMode")}
            >
              <ToggleButton value="write" aria-label={t("forum.write")}>
                <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">{t("forum.write")}</Typography>
              </ToggleButton>
              <ToggleButton value="preview" aria-label={t("forum.preview")}>
                <PreviewIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">{t("forum.preview")}</Typography>
              </ToggleButton>
            </ToggleButtonGroup>
          </>
        )}
      </Stack>

      {/* Editor / Preview */}
      {mode === "write" ? (
        <TextField
          inputRef={textFieldRef}
          fullWidth
          multiline
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          error={error || isOverLimit}
          {...(minRows !== undefined && { minRows })}
          {...(maxRows !== undefined && { maxRows })}
          {...(placeholder !== undefined && { placeholder })}
          {...(helperText !== undefined && { helperText })}
          {...(label !== undefined && { label })}
          {...textFieldProps}
        />
      ) : (
        <Box
          sx={{
            minHeight: rows * 24,
            p: 2,
            border: 1,
            borderColor: error ? "error.main" : "divider",
            borderRadius: 1,
            backgroundColor: "background.paper",
          }}
        >
          {value ? (
            <MarkdownPreview content={value} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t("forum.noPreviewContent")}
            </Typography>
          )}
        </Box>
      )}

      {/* Character count */}
      {showCharCount && maxLength && (
        <Typography
          variant="caption"
          color={isOverLimit ? "error.main" : "text.secondary"}
          sx={{ mt: 0.5, display: "block", textAlign: "right" }}
        >
          {charCount.toLocaleString()}/{maxLength.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}

export default MarkdownEditor;
