/**
 * Search In Book Component
 *
 * Provides full-text search within a book with:
 * - Real-time search as you type
 * - Match highlighting
 * - Navigation between matches
 * - Case-sensitive toggle
 * - Match count display
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface SearchMatch {
  /** Index of this match in the list */
  index: number;
  /** Character offset where match starts */
  startOffset: number;
  /** Character offset where match ends */
  endOffset: number;
  /** Surrounding context for preview */
  context: string;
}

export interface SearchInBookProps {
  /** Book content to search */
  content: string;
  /** Callback when a match is selected for navigation */
  onMatchSelect?: (match: SearchMatch) => void;
  /** Callback when search is closed */
  onClose?: () => void;
  /** Initial search query */
  initialQuery?: string;
  /** Whether the search UI is open */
  open?: boolean;
}

/**
 * Context length for match preview (characters before/after)
 */
const CONTEXT_LENGTH = 50;

/**
 * Extract context around a match for preview
 */
function extractContext(
  content: string,
  startOffset: number,
  endOffset: number
): string {
  const start = Math.max(0, startOffset - CONTEXT_LENGTH);
  const end = Math.min(content.length, endOffset + CONTEXT_LENGTH);

  let context = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = "..." + context;
  if (end < content.length) context = context + "...";

  return context;
}

/**
 * Find all matches of a query in content
 */
function findMatches(
  content: string,
  query: string,
  caseSensitive: boolean
): SearchMatch[] {
  if (!query || !content) return [];

  const matches: SearchMatch[] = [];
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  let offset = 0;
  while (offset < searchContent.length) {
    const index = searchContent.indexOf(searchQuery, offset);
    if (index === -1) break;

    const startOffset = index;
    const endOffset = index + query.length;

    matches.push({
      index: matches.length,
      startOffset,
      endOffset,
      context: extractContext(content, startOffset, endOffset),
    });

    offset = endOffset;
  }

  return matches;
}

/**
 * Search In Book Component
 */
export function SearchInBook({
  content,
  onMatchSelect,
  onClose,
  initialQuery = "",
  open = true,
}: SearchInBookProps): React.ReactElement | null {
  const { t } = useTranslation();

  const [query, setQuery] = useState(initialQuery);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Find all matches
  const matches = useMemo(
    () => findMatches(content, query, caseSensitive),
    [content, query, caseSensitive]
  );

  // Reset to first match when query or matches change
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [matches]);

  // Navigate to current match
  useEffect(() => {
    if (matches.length > 0 && onMatchSelect) {
      const match = matches[currentMatchIndex];
      if (match) {
        onMatchSelect(match);
      }
    }
  }, [matches, currentMatchIndex, onMatchSelect]);

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );

  const handleCaseSensitiveToggle = useCallback(() => {
    setCaseSensitive((prev) => !prev);
  }, []);

  const handlePrevMatch = useCallback(() => {
    setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : matches.length - 1));
  }, [matches.length]);

  const handleNextMatch = useCallback(() => {
    setCurrentMatchIndex((prev) => (prev < matches.length - 1 ? prev + 1 : 0));
  }, [matches.length]);

  const handleClose = useCallback(() => {
    setQuery("");
    setCurrentMatchIndex(0);
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const hasMatches = matches.length > 0;
  const currentMatch = hasMatches ? matches[currentMatchIndex] : null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 400,
        maxWidth: "calc(100vw - 48px)",
        zIndex: 1300,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Search header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SearchIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            {t("reader.searchInBook") || "Search in Book"}
          </Typography>
          <Tooltip title={t("common.close") || "Close"}>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search input */}
        <TextField
          fullWidth
          size="small"
          placeholder={t("reader.searchPlaceholder") || "Search..."}
          value={query}
          onChange={handleQueryChange}
          autoFocus
          sx={{ mb: 1 }}
        />

        {/* Options */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={caseSensitive}
                onChange={handleCaseSensitiveToggle}
              />
            }
            label={
              <Typography variant="caption">
                {t("reader.caseSensitive") || "Case sensitive"}
              </Typography>
            }
          />

          {/* Match count and navigation */}
          {query && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {hasMatches
                  ? `${currentMatchIndex + 1} / ${matches.length}`
                  : t("reader.noMatches") || "No matches"}
              </Typography>
              {hasMatches && (
                <>
                  <IconButton
                    size="small"
                    onClick={handlePrevMatch}
                    disabled={matches.length <= 1}
                  >
                    <PrevIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleNextMatch}
                    disabled={matches.length <= 1}
                  >
                    <NextIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          )}
        </Box>

        {/* Current match context */}
        {query && currentMatch && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                {t("reader.matchContext") || "Context"}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
              >
                {currentMatch.context}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
}

export default SearchInBook;
