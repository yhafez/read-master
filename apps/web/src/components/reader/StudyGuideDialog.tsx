/**
 * Study Guide Generation Dialog
 *
 * Dialog for generating AI-powered study guides from books.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormGroup,
  Checkbox,
  Select,
  MenuItem,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Paper,
} from "@mui/material";
import {
  AutoStories as BookIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { Book } from "@/hooks/useBooks";
import {
  useStudyGuide,
  type StudyGuideStyle,
  type StudyGuideSections,
  getDefaultSections,
  getStyleDisplayName,
  getStyleDescription,
} from "@/hooks/useStudyGuide";
import { downloadFile } from "@/utils/exportUtils";

// ============================================================================
// Types
// ============================================================================

type StudyGuideDialogProps = {
  open: boolean;
  onClose: () => void;
  book: Book;
};

// ============================================================================
// Main Component
// ============================================================================

export function StudyGuideDialog({
  open,
  onClose,
  book,
}: StudyGuideDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const {
    mutate: generateStudyGuide,
    isPending,
    data,
    error,
  } = useStudyGuide();

  // State
  const [style, setStyle] = useState<StudyGuideStyle>("comprehensive");
  const [targetAudience, setTargetAudience] = useState<
    "high-school" | "college" | "graduate" | "general"
  >("general");
  const [includeAnnotations, setIncludeAnnotations] = useState(true);
  const [sections, setSections] =
    useState<StudyGuideSections>(getDefaultSections());

  const handleGenerate = (): void => {
    generateStudyGuide({
      bookId: book.id,
      style,
      sections,
      targetAudience,
      includeAnnotations,
    });
  };

  const handleDownload = (): void => {
    if (!data) return;

    const content = `# Study Guide: ${book.title}\n\n${data.studyGuide}`;
    downloadFile(content, `${book.title}-study-guide.md`, "text/markdown");
  };

  const handleCopy = async (): Promise<void> => {
    if (!data) return;

    try {
      await navigator.clipboard.writeText(data.studyGuide);
      // TODO: Show success toast
    } catch {
      // Error copying to clipboard
    }
  };

  const toggleSection = (key: keyof StudyGuideSections): void => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <BookIcon />
          <span>{t("studyGuide.title")}</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Book Info */}
          <Alert severity="info" icon={<BookIcon />}>
            <Typography variant="body2">
              <strong>{book.title}</strong>
              {book.author && ` by ${book.author}`}
            </Typography>
          </Alert>

          {/* Style Selection */}
          {!data && (
            <>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  {t("studyGuide.style")}
                </FormLabel>
                <RadioGroup
                  value={style}
                  onChange={(e) => setStyle(e.target.value as StudyGuideStyle)}
                >
                  {(
                    [
                      "comprehensive",
                      "summary",
                      "exam-prep",
                      "discussion",
                      "visual",
                    ] as StudyGuideStyle[]
                  ).map((s) => (
                    <FormControlLabel
                      key={s}
                      value={s}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1">
                            {getStyleDisplayName(s)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getStyleDescription(s)}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>

              {/* Target Audience */}
              <FormControl fullWidth>
                <FormLabel>{t("studyGuide.audience")}</FormLabel>
                <Select
                  value={targetAudience}
                  onChange={(e) =>
                    setTargetAudience(
                      e.target.value as
                        | "high-school"
                        | "college"
                        | "graduate"
                        | "general"
                    )
                  }
                >
                  <MenuItem value="high-school">
                    {t("studyGuide.audiences.highSchool")}
                  </MenuItem>
                  <MenuItem value="college">
                    {t("studyGuide.audiences.college")}
                  </MenuItem>
                  <MenuItem value="graduate">
                    {t("studyGuide.audiences.graduate")}
                  </MenuItem>
                  <MenuItem value="general">
                    {t("studyGuide.audiences.general")}
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Sections */}
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  {t("studyGuide.sections")}
                </FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeOverview}
                        onChange={() => toggleSection("includeOverview")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.overview")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeKeyPoints}
                        onChange={() => toggleSection("includeKeyPoints")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.keyPoints")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeVocabulary}
                        onChange={() => toggleSection("includeVocabulary")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.vocabulary")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeThemes}
                        onChange={() => toggleSection("includeThemes")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.themes")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeTimeline}
                        onChange={() => toggleSection("includeTimeline")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.timeline")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeQuestions}
                        onChange={() => toggleSection("includeQuestions")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.questions")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sections.includeSummary}
                        onChange={() => toggleSection("includeSummary")}
                      />
                    }
                    label={t("studyGuide.sectionTypes.summary")}
                  />
                </FormGroup>
              </FormControl>

              {/* Include Annotations */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeAnnotations}
                    onChange={(e) => setIncludeAnnotations(e.target.checked)}
                  />
                }
                label={t("studyGuide.includeAnnotations")}
              />
            </>
          )}

          {/* Loading State */}
          {isPending && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              py={4}
            >
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1">
                {t("studyGuide.generating")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("studyGuide.generatingHint")}
              </Typography>
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error">
              {error instanceof Error ? error.message : t("studyGuide.error")}
            </Alert>
          )}

          {/* Generated Study Guide */}
          {data && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: "60vh",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
              }}
            >
              <Typography component="pre" sx={{ m: 0, fontFamily: "inherit" }}>
                {data.studyGuide}
              </Typography>
            </Paper>
          )}

          {/* Metadata */}
          {data && (
            <Alert severity="success">
              <Typography variant="caption">
                {t("studyGuide.generatedSuccess")} •{" "}
                {t("studyGuide.tokensUsed", {
                  count: data.metadata.tokensUsed,
                })}
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          {t("common.close")}
        </Button>
        {!data && (
          <Button
            onClick={handleGenerate}
            variant="contained"
            startIcon={
              isPending ? <CircularProgress size={20} /> : <BookIcon />
            }
            disabled={isPending}
          >
            {isPending ? t("studyGuide.generating") : t("studyGuide.generate")}
          </Button>
        )}
        {data && (
          <>
            <Button onClick={handleCopy} startIcon={<CopyIcon />}>
              {t("common.copy")}
            </Button>
            <Button
              onClick={handleDownload}
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              {t("common.download")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default StudyGuideDialog;
