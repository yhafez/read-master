/**
 * PreReadingGuide Component
 *
 * Displays an AI-generated pre-reading guide for a book.
 * Features:
 * - Generate button to create a new guide
 * - Collapsible sections for overview, vocabulary, concepts, etc.
 * - Support for regeneration
 * - Caching of generated guides
 * - Loading and error states
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import RefreshIcon from "@mui/icons-material/Refresh";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";

import { queryKeys } from "@/lib/queryClient";
import {
  type PreReadingGuideProps,
  type PreReadingGuideData,
  type ExpandedSections,
  type GuideSectionId,
  type PreReadingGuideError,
  DEFAULT_EXPANDED_SECTIONS,
  createGuideError,
  parseApiError,
  hasContent,
  toggleSection,
  expandAllSections,
  collapseAllSections,
} from "./preReadingGuideTypes";

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch existing pre-reading guide for a book
 */
async function fetchGuide(bookId: string): Promise<PreReadingGuideData | null> {
  const response = await fetch(`/api/ai/pre-reading-guide?bookId=${bookId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw parseApiError(response.status, error.code, error.message);
  }

  const data = await response.json();
  return data.data as PreReadingGuideData;
}

/**
 * Generate a new pre-reading guide
 */
async function generateGuide(
  bookId: string,
  regenerate: boolean
): Promise<PreReadingGuideData> {
  const response = await fetch("/api/ai/pre-reading-guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookId, regenerate }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw parseApiError(response.status, error.code, error.message);
  }

  const data = await response.json();
  return data.data as PreReadingGuideData;
}

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

type SectionProps = {
  sectionId: GuideSectionId;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: (id: GuideSectionId) => void;
  children: React.ReactNode;
  itemCount?: number;
};

function GuideSection({
  sectionId,
  title,
  icon,
  expanded,
  onToggle,
  children,
  itemCount,
}: SectionProps) {
  return (
    <Accordion
      expanded={expanded}
      onChange={() => onToggle(sectionId)}
      sx={{ "&:before": { display: "none" } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${sectionId}-content`}
        id={`${sectionId}-header`}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
        >
          {icon}
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          {typeof itemCount === "number" && itemCount > 0 && (
            <Chip size="small" label={itemCount} sx={{ ml: "auto", mr: 1 }} />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PreReadingGuide({
  bookId,
  bookTitle: _bookTitle,
  initialData = null,
  onGenerateStart,
  onGenerateComplete,
  onError,
  defaultExpanded = true,
  className = "",
}: PreReadingGuideProps) {
  // bookTitle available for future use in UI enhancements
  void _bookTitle;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    defaultExpanded ? DEFAULT_EXPANDED_SECTIONS : collapseAllSections()
  );

  // Fetch existing guide
  const {
    data: guide,
    isLoading: isFetching,
    error: fetchError,
  } = useQuery({
    queryKey: queryKeys.ai.preReadingGuide(bookId),
    queryFn: () => fetchGuide(bookId),
    initialData,
    enabled: !!bookId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Generate guide mutation
  const generateMutation = useMutation({
    mutationFn: (regenerate: boolean) => generateGuide(bookId, regenerate),
    onMutate: () => {
      onGenerateStart?.();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ai.preReadingGuide(bookId), data);
      onGenerateComplete?.(data);
    },
    onError: (error: PreReadingGuideError) => {
      onError?.(error);
    },
  });

  // Handlers
  const handleToggleSection = useCallback((sectionId: GuideSectionId) => {
    setExpandedSections((prev) => toggleSection(prev, sectionId));
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedSections(expandAllSections());
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedSections(collapseAllSections());
  }, []);

  const handleGenerate = useCallback(() => {
    generateMutation.mutate(false);
  }, [generateMutation]);

  const handleRegenerate = useCallback(() => {
    generateMutation.mutate(true);
  }, [generateMutation]);

  // Loading state
  if (isFetching) {
    return (
      <Paper sx={{ p: 3 }} className={className}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  // Error state
  if (fetchError && !guide) {
    const error =
      fetchError instanceof Error
        ? createGuideError("unknown", fetchError.message)
        : (fetchError as PreReadingGuideError);

    return (
      <Paper sx={{ p: 3 }} className={className}>
        <Alert
          severity="error"
          action={
            error.retryable && (
              <Button color="inherit" size="small" onClick={handleGenerate}>
                {t("common.retry", "Retry")}
              </Button>
            )
          }
        >
          {error.message}
        </Alert>
      </Paper>
    );
  }

  // No guide - show generate button
  if (!guide || !hasContent(guide)) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }} className={className}>
        <AutoStoriesIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {t("reader.preReadingGuide")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t(
            "ai.preReading.description",
            "Get AI-generated vocabulary, key concepts, and context to help you understand this book better."
          )}
        </Typography>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          startIcon={
            generateMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              <LightbulbIcon />
            )
          }
        >
          {generateMutation.isPending
            ? t("ai.preReading.generating", "Generating...")
            : t("reader.generateGuide")}
        </Button>
        {generateMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(generateMutation.error as PreReadingGuideError).message}
          </Alert>
        )}
      </Paper>
    );
  }

  // Has guide - render sections
  return (
    <Paper sx={{ p: 2 }} className={className}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoStoriesIcon color="primary" />
          <Typography variant="h6">{t("reader.preReadingGuide")}</Typography>
          {guide.cached && (
            <Chip
              size="small"
              label={t("ai.cached", "Cached")}
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={t("ai.expandAll", "Expand all")}>
            <IconButton size="small" onClick={handleExpandAll}>
              <ExpandMoreIcon sx={{ transform: "rotate(180deg)" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("ai.collapseAll", "Collapse all")}>
            <IconButton size="small" onClick={handleCollapseAll}>
              <ExpandMoreIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("ai.regenerate", "Regenerate")}>
            <IconButton
              size="small"
              onClick={handleRegenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {generateMutation.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(generateMutation.error as PreReadingGuideError).message}
        </Alert>
      )}

      {/* Overview Section */}
      <GuideSection
        sectionId="overview"
        title={t("ai.sections.overview", "Overview")}
        icon={<MenuBookIcon color="action" />}
        expanded={expandedSections.overview}
        onToggle={handleToggleSection}
      >
        <Typography variant="body1" paragraph>
          {guide.overview?.summary}
        </Typography>
        {guide.overview?.themes && guide.overview.themes.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t("ai.sections.themes", "Themes")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {guide.overview.themes.map((theme, idx) => (
                <Chip key={idx} label={theme} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
        {guide.overview?.targetAudience && (
          <Typography variant="body2" color="text.secondary">
            <strong>
              {t("ai.sections.targetAudience", "Target Audience")}:
            </strong>{" "}
            {guide.overview.targetAudience}
          </Typography>
        )}
      </GuideSection>

      {/* Vocabulary Section */}
      {guide.vocabulary && guide.vocabulary.length > 0 && (
        <GuideSection
          sectionId="vocabulary"
          title={t("reader.vocabulary")}
          icon={<LightbulbIcon color="action" />}
          expanded={expandedSections.vocabulary}
          onToggle={handleToggleSection}
          itemCount={guide.vocabulary.length}
        >
          <List disablePadding>
            {guide.vocabulary.map((item, idx) => (
              <Box key={idx}>
                {idx > 0 && <Divider />}
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight={600}>
                        {item.term}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {item.definition}
                        </Typography>
                        {item.examples && item.examples.length > 0 && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontStyle: "italic", mt: 0.5 }}
                          >
                            {t("ai.example", "Example")}: {item.examples[0]}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </GuideSection>
      )}

      {/* Key Concepts Section */}
      {guide.keyConcepts && guide.keyConcepts.length > 0 && (
        <GuideSection
          sectionId="keyConcepts"
          title={t("ai.sections.keyConcepts", "Key Concepts")}
          icon={<LightbulbIcon color="action" />}
          expanded={expandedSections.keyConcepts}
          onToggle={handleToggleSection}
          itemCount={guide.keyConcepts.length}
        >
          <List disablePadding>
            {guide.keyConcepts.map((concept, idx) => (
              <Box key={idx}>
                {idx > 0 && <Divider />}
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight={600}>
                        {concept.term}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {concept.definition}
                        </Typography>
                        {concept.relevance && (
                          <Typography
                            variant="body2"
                            color="primary.main"
                            sx={{ mt: 0.5 }}
                          >
                            {t("ai.relevance", "Why it matters")}:{" "}
                            {concept.relevance}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </GuideSection>
      )}

      {/* Context Section */}
      {guide.context &&
        (guide.context.historicalContext ||
          guide.context.culturalContext ||
          guide.context.authorContext) && (
          <GuideSection
            sectionId="context"
            title={t("ai.sections.context", "Context")}
            icon={<HistoryEduIcon color="action" />}
            expanded={expandedSections.context}
            onToggle={handleToggleSection}
          >
            {guide.context.historicalContext && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("reader.context.historical")}
                </Typography>
                <Typography variant="body2">
                  {guide.context.historicalContext}
                </Typography>
              </Box>
            )}
            {guide.context.authorContext && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("reader.context.author")}
                </Typography>
                <Typography variant="body2">
                  {guide.context.authorContext}
                </Typography>
              </Box>
            )}
            {guide.context.culturalContext && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("ai.sections.culturalContext", "Cultural Context")}
                </Typography>
                <Typography variant="body2">
                  {guide.context.culturalContext}
                </Typography>
              </Box>
            )}
          </GuideSection>
        )}

      {/* Guiding Questions Section */}
      {guide.guidingQuestions && guide.guidingQuestions.length > 0 && (
        <GuideSection
          sectionId="guidingQuestions"
          title={t("ai.sections.guidingQuestions", "Guiding Questions")}
          icon={<QuestionMarkIcon color="action" />}
          expanded={expandedSections.guidingQuestions}
          onToggle={handleToggleSection}
          itemCount={guide.guidingQuestions.length}
        >
          <List disablePadding>
            {guide.guidingQuestions.map((question, idx) => (
              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {idx + 1}. {question}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </GuideSection>
      )}

      {/* Reading Tips Section */}
      {guide.readingTips && guide.readingTips.length > 0 && (
        <GuideSection
          sectionId="readingTips"
          title={t("ai.sections.readingTips", "Reading Tips")}
          icon={<TipsAndUpdatesIcon color="action" />}
          expanded={expandedSections.readingTips}
          onToggle={handleToggleSection}
          itemCount={guide.readingTips.length}
        >
          <List disablePadding>
            {guide.readingTips.map((tip, idx) => (
              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <Chip
                        size="small"
                        label={idx + 1}
                        sx={{ mr: 1, minWidth: 24 }}
                      />
                      {tip}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </GuideSection>
      )}

      {/* Generated info */}
      {guide.generatedAt && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2, textAlign: "right" }}
        >
          {t("ai.generatedAt", "Generated")}:{" "}
          {new Date(guide.generatedAt).toLocaleDateString()}
        </Typography>
      )}
    </Paper>
  );
}

export default PreReadingGuide;
