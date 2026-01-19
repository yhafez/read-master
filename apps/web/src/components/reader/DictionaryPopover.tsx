/**
 * Dictionary and Wikipedia lookup popover component
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Popover,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Link,
  Divider,
  Tooltip,
  Alert,
  Stack,
  Button,
} from "@mui/material";
import {
  Close as CloseIcon,
  VolumeUp as VolumeUpIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  LookupSource,
  DictionaryResult,
  WikipediaResult,
  DictionaryEntry,
  WikipediaSummary,
  LookupPosition,
} from "./dictionaryTypes";
import {
  normalizeWord,
  isValidLookupWord,
  extractFirstWord,
  isPhrase,
  getFromCache,
  addToCache,
  DICTIONARY_CACHE_KEY,
  WIKIPEDIA_CACHE_KEY,
  DICTIONARY_API_URL,
  buildWikipediaUrl,
  parseDictionaryResponse,
  parseWikipediaResponse,
  createDictionaryError,
  createWikipediaError,
  getPhoneticText,
  getPhoneticAudio,
  getAllSynonyms,
  getAllAntonyms,
  truncateExtract,
  formatPartOfSpeech,
  getDictionaryErrorMessage,
  getWikipediaErrorMessage,
} from "./dictionaryTypes";

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface DictionaryPopoverProps {
  /** Whether the popover is open */
  open: boolean;
  /** The selected text to look up */
  selectedText: string;
  /** Anchor element for positioning */
  anchorEl: HTMLElement | null;
  /** Position for the popover */
  position?: LookupPosition;
  /** Callback when popover closes */
  onClose: () => void;
  /** Callback when a word is clicked (for follow-up lookups) */
  onWordClick?: (word: string) => void;
  /** Initial source tab */
  initialSource?: LookupSource;
  /** Wikipedia language code */
  wikipediaLanguage?: string;
  /** Show phonetics */
  showPhonetics?: boolean;
  /** Show examples */
  showExamples?: boolean;
  /** Show synonyms/antonyms */
  showSynonyms?: boolean;
}

// =============================================================================
// API FETCH FUNCTIONS
// =============================================================================

async function fetchDictionary(word: string): Promise<DictionaryResult> {
  const normalized = extractFirstWord(word);
  if (!isValidLookupWord(normalized)) {
    return createDictionaryError(word, "Invalid word", "invalid_word");
  }

  // Check cache first
  const cached = getFromCache<DictionaryResult>(
    DICTIONARY_CACHE_KEY,
    normalized.toLowerCase()
  );
  if (cached) return cached;

  try {
    const response = await fetch(
      `${DICTIONARY_API_URL}/${encodeURIComponent(normalized)}`
    );

    if (response.status === 404) {
      const result = createDictionaryError(
        normalized,
        "Word not found",
        "not_found"
      );
      addToCache(DICTIONARY_CACHE_KEY, normalized.toLowerCase(), result);
      return result;
    }

    if (response.status === 429) {
      return createDictionaryError(normalized, "Rate limited", "rate_limited");
    }

    if (!response.ok) {
      return createDictionaryError(
        normalized,
        `HTTP error: ${response.status}`,
        "network_error"
      );
    }

    const data = (await response.json()) as unknown[];
    const result = parseDictionaryResponse(normalized, data);
    addToCache(DICTIONARY_CACHE_KEY, normalized.toLowerCase(), result);
    return result;
  } catch {
    return createDictionaryError(normalized, "Network error", "network_error");
  }
}

async function fetchWikipedia(
  query: string,
  language: string = "en"
): Promise<WikipediaResult> {
  const normalized = normalizeWord(query);
  if (!isValidLookupWord(normalized)) {
    return createWikipediaError(query, "Invalid query", "not_found");
  }

  // Check cache first
  const cacheKey = `${language}:${normalized.toLowerCase()}`;
  const cached = getFromCache<WikipediaResult>(WIKIPEDIA_CACHE_KEY, cacheKey);
  if (cached) return cached;

  try {
    const url = buildWikipediaUrl(normalized, language);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      const result = createWikipediaError(
        normalized,
        "Article not found",
        "not_found"
      );
      addToCache(WIKIPEDIA_CACHE_KEY, cacheKey, result);
      return result;
    }

    if (response.status === 429) {
      return createWikipediaError(normalized, "Rate limited", "rate_limited");
    }

    if (!response.ok) {
      return createWikipediaError(
        normalized,
        `HTTP error: ${response.status}`,
        "network_error"
      );
    }

    const data = await response.json();
    const result = parseWikipediaResponse(normalized, data);
    addToCache(WIKIPEDIA_CACHE_KEY, cacheKey, result);
    return result;
  } catch {
    return createWikipediaError(normalized, "Network error", "network_error");
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface DictionaryContentProps {
  entry: DictionaryEntry;
  showPhonetics: boolean;
  showExamples: boolean;
  showSynonyms: boolean;
  onWordClick?: (word: string) => void;
}

function DictionaryContent({
  entry,
  showPhonetics,
  showExamples,
  showSynonyms,
  onWordClick,
}: DictionaryContentProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const phoneticText = getPhoneticText(entry);
  const phoneticAudio = getPhoneticAudio(entry);
  const synonyms = getAllSynonyms(entry);
  const antonyms = getAllAntonyms(entry);

  const playAudio = useCallback(() => {
    if (phoneticAudio && audioRef.current) {
      audioRef.current.src = phoneticAudio;
      audioRef.current.play().catch(() => {
        // Audio playback failed - ignore
      });
    }
  }, [phoneticAudio]);

  const handleWordClick = useCallback(
    (word: string) => {
      if (onWordClick) {
        onWordClick(word);
      }
    },
    [onWordClick]
  );

  return (
    <Box>
      {/* Word and phonetics */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          {entry.word}
        </Typography>
        {showPhonetics && phoneticText && (
          <Typography variant="body2" color="text.secondary">
            {phoneticText}
          </Typography>
        )}
        {phoneticAudio && (
          <>
            <audio ref={audioRef} />
            <Tooltip title={t("reader.dictionary.playPronunciation")}>
              <IconButton size="small" onClick={playAudio}>
                <VolumeUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Origin */}
      {entry.origin && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1.5, fontStyle: "italic" }}
        >
          {t("reader.dictionary.origin")}: {entry.origin}
        </Typography>
      )}

      {/* Meanings */}
      {entry.meanings.map((meaning, mIdx) => (
        <Box key={mIdx} sx={{ mb: 2 }}>
          <Typography
            variant="subtitle2"
            color="primary"
            sx={{ mb: 0.5, fontStyle: "italic" }}
          >
            {formatPartOfSpeech(meaning.partOfSpeech)}
          </Typography>

          {meaning.definitions.map((def, dIdx) => (
            <Box key={dIdx} sx={{ mb: 1, pl: 1 }}>
              <Typography variant="body2">
                {meaning.definitions.length > 1 && `${dIdx + 1}. `}
                {def.definition}
              </Typography>
              {showExamples && def.example && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ pl: 2, fontStyle: "italic", mt: 0.5 }}
                >
                  "{def.example}"
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ))}

      {/* Synonyms & Antonyms */}
      {showSynonyms && (synonyms.length > 0 || antonyms.length > 0) && (
        <>
          <Divider sx={{ my: 1.5 }} />
          {synonyms.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("reader.dictionary.synonyms")}:
              </Typography>
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}
              >
                {synonyms.slice(0, 8).map((syn) => (
                  <Chip
                    key={syn}
                    label={syn}
                    size="small"
                    variant="outlined"
                    onClick={() => handleWordClick(syn)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>
          )}
          {antonyms.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("reader.dictionary.antonyms")}:
              </Typography>
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}
              >
                {antonyms.slice(0, 8).map((ant) => (
                  <Chip
                    key={ant}
                    label={ant}
                    size="small"
                    variant="outlined"
                    onClick={() => handleWordClick(ant)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

interface WikipediaContentProps {
  summary: WikipediaSummary;
}

function WikipediaContent({ summary }: WikipediaContentProps) {
  const { t } = useTranslation();
  const truncatedExtract = truncateExtract(summary.extract, 400);

  return (
    <Box>
      {/* Title */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        {summary.displayTitle}
      </Typography>

      {/* Description */}
      {summary.description && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
          {summary.description}
        </Typography>
      )}

      {/* Thumbnail */}
      {summary.thumbnail && (
        <Box
          sx={{
            float: "right",
            ml: 1.5,
            mb: 1,
            maxWidth: 120,
          }}
        >
          <img
            src={summary.thumbnail.source}
            alt={summary.title}
            style={{
              maxWidth: "100%",
              borderRadius: 4,
            }}
          />
        </Box>
      )}

      {/* Extract */}
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {truncatedExtract}
      </Typography>

      {/* Read more link */}
      <Box sx={{ clear: "both" }}>
        <Link
          href={summary.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
        >
          {t("reader.wikipedia.readMore")}
          <OpenInNewIcon fontSize="small" />
        </Link>
      </Box>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DictionaryPopover({
  open,
  selectedText,
  anchorEl,
  onClose,
  onWordClick,
  initialSource,
  wikipediaLanguage = "en",
  showPhonetics = true,
  showExamples = true,
  showSynonyms = true,
}: DictionaryPopoverProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LookupSource>(
    initialSource || (isPhrase(selectedText) ? "wikipedia" : "dictionary")
  );

  // Reset tab when selected text changes
  useEffect(() => {
    if (open && selectedText) {
      setActiveTab(
        initialSource || (isPhrase(selectedText) ? "wikipedia" : "dictionary")
      );
    }
  }, [open, selectedText, initialSource]);

  // Dictionary query
  const dictionaryQuery = useQuery<DictionaryResult>({
    queryKey: ["dictionary", extractFirstWord(selectedText)],
    queryFn: () => fetchDictionary(selectedText),
    enabled:
      open && activeTab === "dictionary" && isValidLookupWord(selectedText),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });

  // Wikipedia query
  const wikipediaQuery = useQuery<WikipediaResult>({
    queryKey: ["wikipedia", normalizeWord(selectedText), wikipediaLanguage],
    queryFn: () => fetchWikipedia(selectedText, wikipediaLanguage),
    enabled:
      open && activeTab === "wikipedia" && isValidLookupWord(selectedText),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: LookupSource) => {
      setActiveTab(newValue);
    },
    []
  );

  const handleWordClick = useCallback(
    (word: string) => {
      if (onWordClick) {
        onWordClick(word);
      }
    },
    [onWordClick]
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === "dictionary") {
      dictionaryQuery.refetch();
    } else {
      wikipediaQuery.refetch();
    }
  }, [activeTab, dictionaryQuery, wikipediaQuery]);

  // Get current query state
  const currentQuery =
    activeTab === "dictionary" ? dictionaryQuery : wikipediaQuery;
  const isLoading = currentQuery.isLoading || currentQuery.isFetching;
  const isError = currentQuery.isError;

  // Get result data
  const dictionaryResult = dictionaryQuery.data;
  const wikipediaResult = wikipediaQuery.data;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      slotProps={{
        paper: {
          sx: {
            maxWidth: 400,
            minWidth: 320,
            maxHeight: 500,
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label={t("reader.lookup.tabs")}
        >
          <Tab
            value="dictionary"
            label={t("reader.dictionary.title")}
            id="lookup-tab-dictionary"
            aria-controls="lookup-panel-dictionary"
          />
          <Tab
            value="wikipedia"
            label={t("reader.wikipedia.title")}
            id="lookup-tab-wikipedia"
            aria-controls="lookup-panel-wikipedia"
          />
        </Tabs>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t("common.retry")}>
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, overflow: "auto", maxHeight: 400 }}>
        {/* Loading state */}
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("reader.lookup.error")}
            <Button size="small" onClick={handleRefresh} sx={{ ml: 1 }}>
              {t("common.retry")}
            </Button>
          </Alert>
        )}

        {/* Dictionary content */}
        {activeTab === "dictionary" && !isLoading && dictionaryResult && (
          <>
            {dictionaryResult.success && dictionaryResult.entry ? (
              <DictionaryContent
                entry={dictionaryResult.entry}
                showPhonetics={showPhonetics}
                showExamples={showExamples}
                showSynonyms={showSynonyms}
                onWordClick={handleWordClick}
              />
            ) : (
              <Alert severity="info">
                {dictionaryResult.errorType
                  ? getDictionaryErrorMessage(dictionaryResult.errorType)
                  : dictionaryResult.error || t("reader.dictionary.notFound")}
              </Alert>
            )}
          </>
        )}

        {/* Wikipedia content */}
        {activeTab === "wikipedia" && !isLoading && wikipediaResult && (
          <>
            {wikipediaResult.success && wikipediaResult.summary ? (
              <WikipediaContent summary={wikipediaResult.summary} />
            ) : (
              <Alert severity="info">
                {wikipediaResult.errorType
                  ? getWikipediaErrorMessage(wikipediaResult.errorType)
                  : wikipediaResult.error || t("reader.wikipedia.notFound")}
              </Alert>
            )}
          </>
        )}

        {/* Invalid selection */}
        {!isValidLookupWord(selectedText) && !isLoading && (
          <Alert severity="info">{t("reader.lookup.invalidSelection")}</Alert>
        )}
      </Box>
    </Popover>
  );
}

export default DictionaryPopover;
