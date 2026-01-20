/**
 * CurriculumForm Component
 *
 * Form for creating and editing curriculums.
 * Features:
 * - Title, description, category, difficulty, visibility
 * - Cover image upload
 * - Tags
 * - Tier gating (Pro/Scholar only)
 * - Validation with Zod schemas
 */
import { useState } from "react";
import {
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Typography,
  Stack,
  Chip,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

interface Curriculum {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  visibility: Visibility;
  tags: string[];
  coverImageUrl?: string;
  estimatedTimeMinutes?: number;
}

// ============================================================================
// Types
// ============================================================================

export interface CurriculumFormData {
  title: string;
  description: string;
  category: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  visibility: Visibility;
  tags: string[];
  coverImageUrl?: string;
  estimatedTimeMinutes?: number;
}

export interface CurriculumFormProps {
  /** Initial data for editing */
  initialData?: Partial<Curriculum> | undefined;
  /** Called when form is submitted */
  onSubmit: (data: CurriculumFormData) => Promise<void>;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean | undefined;
  /** User's current tier */
  userTier: "FREE" | "PRO" | "SCHOLAR";
}

// ============================================================================
// Constants
// ============================================================================

const DIFFICULTY_OPTIONS = [
  { value: "BEGINNER", label: "curriculums.difficulty.beginner" },
  { value: "INTERMEDIATE", label: "curriculums.difficulty.intermediate" },
  { value: "ADVANCED", label: "curriculums.difficulty.advanced" },
  { value: "EXPERT", label: "curriculums.difficulty.expert" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "curriculums.visibility.private" },
  { value: "UNLISTED", label: "curriculums.visibility.unlisted" },
  { value: "PUBLIC", label: "curriculums.visibility.public" },
] as const;

const CATEGORY_OPTIONS = [
  "Academic",
  "Professional",
  "Personal Development",
  "Fiction",
  "Non-Fiction",
  "Science",
  "Technology",
  "History",
  "Philosophy",
  "Business",
  "Self-Help",
  "Language Learning",
  "Test Prep",
  "Other",
] as const;

// ============================================================================
// Component
// ============================================================================

export function CurriculumForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  userTier,
}: CurriculumFormProps): React.ReactElement {
  const { t } = useTranslation();

  // Form state
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [difficulty, setDifficulty] = useState<
    CurriculumFormData["difficulty"]
  >(
    (initialData?.difficulty as CurriculumFormData["difficulty"]) || "BEGINNER"
  );
  const [visibility, setVisibility] = useState<Visibility>(
    initialData?.visibility || "PRIVATE"
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialData?.coverImageUrl || ""
  );
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState<number>(
    initialData?.estimatedTimeMinutes || 0
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tier check
  const canCreate = userTier === "PRO" || userTier === "SCHOLAR";

  /**
   * Add a tag
   */
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  /**
   * Remove a tag
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      return;
    }

    // Build form data
    const formData: CurriculumFormData = {
      title,
      description,
      category,
      difficulty,
      visibility,
      tags,
      ...(coverImageUrl && { coverImageUrl }),
      ...(estimatedTimeMinutes > 0 && { estimatedTimeMinutes }),
    };

    // Basic validation
    if (!title || !description || !category) {
      setErrors({
        title: !title ? "Title is required" : "",
        description: !description ? "Description is required" : "",
        category: !category ? "Category is required" : "",
      });
      return;
    }

    try {
      setErrors({});
      await onSubmit(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      }
    }
  };

  /**
   * Handle difficulty change
   */
  const handleDifficultyChange = (e: SelectChangeEvent) => {
    setDifficulty(e.target.value as CurriculumFormData["difficulty"]);
  };

  /**
   * Handle visibility change
   */
  const handleVisibilityChange = (e: SelectChangeEvent) => {
    setVisibility(e.target.value as Visibility);
  };

  // Render tier gate
  if (!canCreate) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="h6" gutterBottom>
              {t("curriculums.tierGate.title")}
            </Typography>
            <Typography variant="body2">
              {t("curriculums.tierGate.description")}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              href="/pricing"
            >
              {t("curriculums.tierGate.upgrade")}
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 800, mx: "auto" }}
    >
      <Stack spacing={3}>
        {/* Title */}
        <TextField
          label={t("curriculums.form.title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          error={Boolean(errors.title)}
          helperText={errors.title || t("curriculums.form.titleHelper")}
          inputProps={{ maxLength: 200 }}
          disabled={isSubmitting}
        />

        {/* Description */}
        <TextField
          label={t("curriculums.form.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
          multiline
          rows={4}
          error={Boolean(errors.description)}
          helperText={
            errors.description || t("curriculums.form.descriptionHelper")
          }
          inputProps={{ maxLength: 2000 }}
          disabled={isSubmitting}
        />

        {/* Category */}
        <FormControl fullWidth error={Boolean(errors.category)}>
          <InputLabel>{t("curriculums.form.category")}</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            label={t("curriculums.form.category")}
            required
            disabled={isSubmitting}
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Difficulty */}
        <FormControl fullWidth error={Boolean(errors.difficulty)}>
          <InputLabel>{t("curriculums.form.difficulty")}</InputLabel>
          <Select
            value={difficulty}
            onChange={handleDifficultyChange}
            label={t("curriculums.form.difficulty")}
            required
            disabled={isSubmitting}
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.label)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Visibility */}
        <FormControl fullWidth error={Boolean(errors.visibility)}>
          <InputLabel>{t("curriculums.form.visibility")}</InputLabel>
          <Select
            value={visibility}
            onChange={handleVisibilityChange}
            label={t("curriculums.form.visibility")}
            required
            disabled={isSubmitting}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.label)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Tags */}
        <Box>
          <TextField
            label={t("curriculums.form.tags")}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            fullWidth
            helperText={t("curriculums.form.tagsHelper")}
            disabled={isSubmitting || tags.length >= 10}
            InputProps={{
              endAdornment: (
                <Button onClick={handleAddTag} disabled={!tagInput.trim()}>
                  {t("common.add")}
                </Button>
              ),
            }}
          />
          {tags.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  disabled={isSubmitting}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Cover Image URL */}
        <TextField
          label={t("curriculums.form.coverImage")}
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          fullWidth
          type="url"
          error={Boolean(errors.coverImageUrl)}
          helperText={
            errors.coverImageUrl || t("curriculums.form.coverImageHelper")
          }
          disabled={isSubmitting}
        />

        {/* Estimated Time */}
        <TextField
          label={t("curriculums.form.estimatedTime")}
          value={estimatedTimeMinutes || ""}
          onChange={(e) =>
            setEstimatedTimeMinutes(parseInt(e.target.value) || 0)
          }
          fullWidth
          type="number"
          inputProps={{ min: 0 }}
          error={Boolean(errors.estimatedTimeMinutes)}
          helperText={
            errors.estimatedTimeMinutes ||
            t("curriculums.form.estimatedTimeHelper")
          }
          disabled={isSubmitting}
        />

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Save />}
            disabled={isSubmitting}
          >
            {t("common.save")}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
