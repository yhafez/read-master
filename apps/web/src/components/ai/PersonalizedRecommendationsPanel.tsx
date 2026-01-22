import { useState } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Card,
  CardContent,
  Chip,
  TextField,
  Autocomplete,
} from "@mui/material";
import {
  AutoAwesome as AIIcon,
  MenuBook as BookIcon,
  TrendingUp as ConfidenceIcon,
  Lightbulb as ReasoningIcon,
} from "@mui/icons-material";
import { usePersonalizedRecommendations } from "@/hooks";
import type {
  PersonalizedRecommendationsOutput,
  BookRecommendation,
} from "@read-master/ai";

/**
 * Get confidence color based on score (1-10)
 */
function getConfidenceColor(score: number): "success" | "warning" | "error" {
  if (score >= 8) return "success";
  if (score >= 5) return "warning";
  return "error";
}

/**
 * Personalized Recommendations Panel Component
 *
 * Uses AI to generate personalized book recommendations based on
 * reading history, preferences, and goals.
 */
export function PersonalizedRecommendationsPanel() {
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [skillDevelopment, setSkillDevelopment] = useState<string[]>([]);
  const [recommendationCount, setRecommendationCount] = useState(5);
  const [recommendations, setRecommendations] =
    useState<PersonalizedRecommendationsOutput | null>(null);

  const {
    mutate: getRecommendations,
    isPending,
    error,
  } = usePersonalizedRecommendations();

  const handleGetRecommendations = () => {
    const requestPayload: {
      preferences?: { favoriteGenres?: string[]; topics?: string[] };
      goals?: { skillDevelopment?: string[] };
      recommendationCount?: number;
    } = {
      recommendationCount,
    };

    if (favoriteGenres.length > 0 || topics.length > 0) {
      requestPayload.preferences = {};
      if (favoriteGenres.length > 0) {
        requestPayload.preferences.favoriteGenres = favoriteGenres;
      }
      if (topics.length > 0) {
        requestPayload.preferences.topics = topics;
      }
    }

    if (skillDevelopment.length > 0) {
      requestPayload.goals = {
        skillDevelopment,
      };
    }

    getRecommendations(requestPayload, {
      onSuccess: (response) => {
        setRecommendations(response);
      },
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Personalized Recommendations
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Get AI-powered book recommendations tailored to your interests and
          goals
        </Typography>
      </Box>

      {/* Preferences */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Autocomplete
          multiple
          freeSolo
          options={[
            "Fiction",
            "Non-Fiction",
            "Science Fiction",
            "Fantasy",
            "Mystery",
            "Biography",
            "History",
            "Philosophy",
            "Science",
            "Self-Help",
          ]}
          value={favoriteGenres}
          onChange={(_e, newValue) => setFavoriteGenres(newValue)}
          renderInput={(params) => {
            const { InputLabelProps: _ignored, ...rest } = params;
            return (
              <TextField
                {...rest}
                label="Favorite Genres"
                placeholder="Add genres..."
                size="small"
              />
            );
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                size="small"
                {...getTagProps({ index })}
                key={option}
              />
            ))
          }
        />

        <Autocomplete
          multiple
          freeSolo
          options={[
            "AI & Technology",
            "Psychology",
            "Leadership",
            "Creativity",
            "Productivity",
            "Ethics",
            "Science",
            "History",
            "Culture",
            "Education",
          ]}
          value={topics}
          onChange={(_e, newValue) => setTopics(newValue)}
          renderInput={(params) => {
            const { InputLabelProps: _ignored2, ...rest } = params;
            return (
              <TextField
                {...rest}
                label="Topics of Interest"
                placeholder="Add topics..."
                size="small"
              />
            );
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                size="small"
                {...getTagProps({ index })}
                key={option}
              />
            ))
          }
        />

        <Autocomplete
          multiple
          freeSolo
          options={[
            "Critical Thinking",
            "Writing",
            "Communication",
            "Research",
            "Problem Solving",
            "Emotional Intelligence",
            "Technical Skills",
          ]}
          value={skillDevelopment}
          onChange={(_e, newValue) => setSkillDevelopment(newValue)}
          renderInput={(params) => {
            const { InputLabelProps: _ignored3, ...rest } = params;
            return (
              <TextField
                {...rest}
                label="Skills to Develop"
                placeholder="Add skills..."
                size="small"
              />
            );
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                size="small"
                {...getTagProps({ index })}
                key={option}
              />
            ))
          }
        />

        <TextField
          fullWidth
          size="small"
          type="number"
          label="Number of Recommendations"
          value={recommendationCount}
          onChange={(e) =>
            setRecommendationCount(parseInt(e.target.value, 10) || 5)
          }
          inputProps={{ min: 3, max: 10 }}
        />

        <Button
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} /> : <AIIcon />}
          onClick={handleGetRecommendations}
          disabled={isPending}
          fullWidth
        >
          {isPending ? "Generating Recommendations..." : "Get Recommendations"}
        </Button>
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || "Failed to get recommendations. Please try again."}
        </Alert>
      )}

      {/* Recommendations */}
      {recommendations && (
        <Box>
          <Divider sx={{ mb: 3 }} />

          {/* Reading Patterns */}
          {recommendations.readingPatterns && (
            <Alert severity="info" icon={<BookIcon />} sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Your Reading Profile
              </Typography>
              <Typography variant="body2">
                Preferred Genres:{" "}
                {recommendations.readingPatterns.preferredGenres.join(", ")}
              </Typography>
              <Typography variant="body2">
                Comprehension Level:{" "}
                {recommendations.readingPatterns.averageComprehension}/10
              </Typography>
            </Alert>
          )}

          {/* Book Recommendations */}
          {recommendations.recommendations &&
            recommendations.recommendations.length > 0 && (
              <Stack spacing={2}>
                {recommendations.recommendations.map(
                  (rec: BookRecommendation, index: number) => (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{ position: "relative" }}
                    >
                      <CardContent>
                        {/* Confidence Badge */}
                        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                          <Chip
                            icon={<ConfidenceIcon />}
                            label={`${rec.confidence}/10`}
                            color={getConfidenceColor(rec.confidence)}
                            size="small"
                          />
                        </Box>

                        {/* Book Info */}
                        <Box sx={{ pr: 12 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          >
                            {rec.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                          >
                            {rec.author}
                          </Typography>

                          {/* Description */}
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {rec.description}
                          </Typography>

                          {/* Reasoning */}
                          <Box sx={{ mb: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 1,
                              }}
                            >
                              <ReasoningIcon fontSize="small" color="primary" />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  color: "text.secondary",
                                }}
                              >
                                Why this book:
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {rec.reasoning}
                            </Typography>
                          </Box>

                          {/* Difficulty & Alignment */}
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              flexWrap: "wrap",
                              mb: 2,
                            }}
                          >
                            <Chip
                              label={rec.predictedDifficulty}
                              size="small"
                              color={
                                rec.predictedDifficulty === "easy"
                                  ? "success"
                                  : rec.predictedDifficulty === "moderate"
                                    ? "primary"
                                    : "warning"
                              }
                            />
                            <Chip
                              label={`${rec.comprehensionMatch}/10 match`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>

                          {/* Goals Alignment */}
                          {rec.goalsAlignment &&
                            rec.goalsAlignment.length > 0 && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 600,
                                    color: "text.secondary",
                                    mb: 1,
                                  }}
                                >
                                  Aligns with your goals:
                                </Typography>
                                <ul
                                  style={{
                                    margin: "8px 0",
                                    paddingLeft: "24px",
                                  }}
                                >
                                  {rec.goalsAlignment.map(
                                    (goal: string, i: number) => (
                                      <li key={i}>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          {goal}
                                        </Typography>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </Box>
                            )}
                        </Box>
                      </CardContent>
                    </Card>
                  )
                )}
              </Stack>
            )}

          {/* Next Steps */}
          {recommendations.advice &&
            recommendations.advice.nextSteps.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Next Steps
                </Typography>
                <Stack spacing={1}>
                  {recommendations.advice.nextSteps.map(
                    (step: string, index: number) => (
                      <Card
                        key={index}
                        variant="outlined"
                        sx={{ bgcolor: "primary.light" }}
                      >
                        <CardContent
                          sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}
                        >
                          <Typography variant="body2">
                            {index + 1}. {step}
                          </Typography>
                        </CardContent>
                      </Card>
                    )
                  )}
                </Stack>
              </Box>
            )}
        </Box>
      )}
    </Paper>
  );
}
