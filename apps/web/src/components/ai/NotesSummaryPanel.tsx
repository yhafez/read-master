import { useState } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import {
  AutoAwesome as AIIcon,
  Description as NotesIcon,
  Lightbulb as ThemeIcon,
  TrendingUp as TakeawayIcon,
  School as ReviewIcon,
} from "@mui/icons-material";
import { useSummarizeNotes, type AnnotationForSummary } from "@/hooks";
import type { SummarizeNotesOutput } from "@read-master/ai";

/**
 * Notes Summary Panel Props
 */
type NotesSummaryPanelProps = {
  bookId: string;
  bookTitle: string;
  annotations: AnnotationForSummary[];
};

/**
 * Notes Summary Panel Component
 *
 * Uses AI to generate intelligent summaries of reading notes,
 * organizing them by theme or chronology.
 */
export function NotesSummaryPanel({
  bookId,
  bookTitle,
  annotations,
}: NotesSummaryPanelProps) {
  const [style, setStyle] = useState<
    "brief" | "structured" | "outline" | "synthesis"
  >("structured");
  const [groupBy, setGroupBy] = useState<
    "chronological" | "theme" | "chapter" | "type"
  >("theme");
  const [includeQuotes, setIncludeQuotes] = useState(true);
  const [summary, setSummary] = useState<SummarizeNotesOutput | null>(null);

  const { mutate: summarize, isPending, error } = useSummarizeNotes();

  const handleSummarize = () => {
    if (annotations.length === 0) return;

    summarize(
      {
        bookId,
        annotations,
        style,
        groupBy,
        includeQuotes,
      },
      {
        onSuccess: (response) => {
          setSummary(response);
        },
      }
    );
  };

  const annotationCount = annotations.length;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Notes Summary
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          AI-powered summary of your notes for {bookTitle}
        </Typography>
      </Box>

      {/* Annotation Count */}
      <Alert severity="info" icon={<NotesIcon />} sx={{ mb: 3 }}>
        {annotationCount === 0
          ? "You don't have any notes or highlights yet."
          : `You have ${annotationCount} note${annotationCount === 1 ? "" : "s"} and highlight${annotationCount === 1 ? "" : "s"} to summarize.`}
      </Alert>

      {annotationCount > 0 && (
        <>
          {/* Controls */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Summary Style</InputLabel>
              <Select
                value={style}
                onChange={(e) => setStyle(e.target.value as typeof style)}
                label="Summary Style"
              >
                <MenuItem value="brief">Brief - Quick overview</MenuItem>
                <MenuItem value="structured">
                  Structured - Organized sections
                </MenuItem>
                <MenuItem value="outline">Outline - Bullet points</MenuItem>
                <MenuItem value="synthesis">Synthesis - Deep analysis</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Group By</InputLabel>
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                label="Group By"
              >
                <MenuItem value="chronological">Chronological Order</MenuItem>
                <MenuItem value="theme">Theme/Topic</MenuItem>
                <MenuItem value="chapter">Chapter</MenuItem>
                <MenuItem value="type">Type (Notes vs Highlights)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Include Quotes</InputLabel>
              <Select
                value={includeQuotes ? "yes" : "no"}
                onChange={(e) => setIncludeQuotes(e.target.value === "yes")}
                label="Include Quotes"
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={
                isPending ? <CircularProgress size={16} /> : <AIIcon />
              }
              onClick={handleSummarize}
              disabled={isPending || annotationCount === 0}
              fullWidth
            >
              {isPending ? "Summarizing..." : "Generate Summary"}
            </Button>
          </Stack>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message || "Failed to generate summary. Please try again."}
            </Alert>
          )}

          {/* Summary */}
          {summary && (
            <Box>
              <Divider sx={{ mb: 3 }} />

              {/* Overall Summary */}
              <Card sx={{ mb: 3, bgcolor: "primary.light" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Overall Summary
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {summary.overallSummary}
                  </Typography>
                </CardContent>
              </Card>

              {/* Sections */}
              {summary.sections && summary.sections.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Sections
                  </Typography>
                  <Stack spacing={2}>
                    {summary.sections.map(
                      (
                        section: {
                          title: string;
                          summary: string;
                          keyInsights: string[];
                        },
                        index: number
                      ) => (
                        <Card key={index} variant="outlined">
                          <CardContent>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600, mb: 1 }}
                            >
                              {section.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap", mb: 2 }}
                            >
                              {section.summary}
                            </Typography>
                            {section.keyInsights &&
                              section.keyInsights.length > 0 && (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 600,
                                      color: "text.secondary",
                                      mb: 1,
                                    }}
                                  >
                                    Key Insights:
                                  </Typography>
                                  <ul
                                    style={{
                                      margin: "8px 0",
                                      paddingLeft: "24px",
                                    }}
                                  >
                                    {section.keyInsights.map(
                                      (insight: string, i: number) => (
                                        <li key={i}>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                          >
                                            {insight}
                                          </Typography>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </Box>
                              )}
                          </CardContent>
                        </Card>
                      )
                    )}
                  </Stack>
                </Box>
              )}

              {/* Key Themes */}
              {summary.keyThemes && summary.keyThemes.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <ThemeIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Key Themes
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {summary.keyThemes.map((theme: string, index: number) => (
                      <Chip key={index} label={theme} color="primary" />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Main Takeaways */}
              {summary.mainTakeaways && summary.mainTakeaways.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <TakeawayIcon color="secondary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Main Takeaways
                    </Typography>
                  </Box>
                  <Stack spacing={1}>
                    {summary.mainTakeaways.map(
                      (takeaway: string, index: number) => (
                        <Card
                          key={index}
                          variant="outlined"
                          sx={{ bgcolor: "secondary.light" }}
                        >
                          <CardContent
                            sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}
                          >
                            <Typography variant="body2">{takeaway}</Typography>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </Stack>
                </Box>
              )}

              {/* Review Topics */}
              {summary.reviewTopics && summary.reviewTopics.length > 0 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <ReviewIcon color="warning" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Suggested Review Topics
                    </Typography>
                  </Box>
                  <Stack spacing={1}>
                    {summary.reviewTopics.map(
                      (topic: string, index: number) => (
                        <Chip
                          key={index}
                          label={topic}
                          color="warning"
                          variant="outlined"
                        />
                      )
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
