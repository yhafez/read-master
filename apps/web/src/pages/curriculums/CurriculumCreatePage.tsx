/**
 * CurriculumCreatePage
 *
 * Page for creating and editing curriculums.
 * Features:
 * - Create new curriculum with all metadata
 * - Add books and external resources
 * - Reorder items with drag-and-drop
 * - Tier gating (Pro/Scholar only)
 * - Save and publish
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
} from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  CurriculumForm,
  CurriculumItemsManager,
} from "@/components/curriculum";
import type {
  CurriculumFormData,
  CurriculumItem,
} from "@/components/curriculum";
import { useUser } from "@/auth";
import {
  useCurriculum,
  useCreateCurriculum,
  useUpdateCurriculum,
  type CreateCurriculumInput,
} from "@/hooks/useCurriculums";
import { useBooks } from "@/hooks/useBooks";

// ============================================================================
// Component
// ============================================================================

export function CurriculumCreatePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useUser(); // For future use

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<CurriculumFormData | null>(null);
  const [items, setItems] = useState<CurriculumItem[]>([]);

  const isEditMode = Boolean(id);
  // For now, default to FREE tier until we have tier info from Clerk
  const userTier: "FREE" | "PRO" | "SCHOLAR" = "FREE";

  // Steps
  const steps = [
    t("curriculums.steps.basicInfo"),
    t("curriculums.steps.addContent"),
    t("curriculums.steps.review"),
  ];

  // Fetch curriculum for edit mode
  const { data: curriculum, isLoading } = useCurriculum(id || "", isEditMode);

  // Fetch user's books
  const { data: booksData } = useBooks({});
  const userBooks = booksData?.data || [];

  // Create mutation
  const createMutation = useCreateCurriculum();

  // Update mutation
  const updateMutation = useUpdateCurriculum();

  /**
   * Handle form data submission (step 1)
   */
  const handleFormSubmit = async (data: CurriculumFormData) => {
    setFormData(data);
    setActiveStep(1);
  };

  /**
   * Handle final submission
   */
  const handleFinalSubmit = async () => {
    if (!formData) return;

    const payload: CreateCurriculumInput = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      difficulty: formData.difficulty,
      visibility: formData.visibility,
      ...(formData.tags && { tags: formData.tags }),
      ...(formData.coverImageUrl && { coverImageUrl: formData.coverImageUrl }),
      ...(formData.estimatedTimeMinutes && {
        estimatedTimeMinutes: formData.estimatedTimeMinutes,
      }),
      items: items.map((item) => ({
        type: item.type,
        ...(item.bookId && { bookId: item.bookId }),
        ...(item.externalUrl && {
          externalUrl: item.externalUrl,
          externalTitle: item.externalTitle,
        }),
        ...(item.notes && { notes: item.notes }),
        ...(item.estimatedTimeMinutes && {
          estimatedTimeMinutes: item.estimatedTimeMinutes,
        }),
      })),
    };

    if (isEditMode && id) {
      const result = await updateMutation.mutateAsync({ id, input: payload });
      navigate(`/curriculums/${result.id}`);
    } else {
      const result = await createMutation.mutateAsync(payload);
      navigate(`/curriculums/${result.id}`);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    navigate("/curriculums");
  };

  /**
   * Handle back
   */
  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  /**
   * Handle next
   */
  const handleNext = () => {
    setActiveStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>{t("common.loading")}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/curriculums")}
        sx={{ mb: 2 }}
      >
        {t("common.back")}
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        {isEditMode ? t("curriculums.edit") : t("curriculums.create")}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <CurriculumForm
            initialData={formData || (curriculum as never) || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            userTier={userTier}
          />
        )}

        {activeStep === 1 && (
          <Box>
            <CurriculumItemsManager
              items={items}
              onItemsChange={setItems}
              availableBooks={userBooks}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
              <Button variant="outlined" onClick={handleBack}>
                {t("common.back")}
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={handleNext}
              >
                {t("common.next")}
              </Button>
            </Stack>
          </Box>
        )}

        {activeStep === 2 && formData && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t("curriculums.review.title")}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                gutterBottom
              >
                {t("curriculums.review.basicInfo")}
              </Typography>
              <Typography variant="body1">
                <strong>{t("curriculums.form.title")}:</strong> {formData.title}
              </Typography>
              <Typography variant="body1">
                <strong>{t("curriculums.form.description")}:</strong>{" "}
                {formData.description}
              </Typography>
              <Typography variant="body1">
                <strong>{t("curriculums.form.category")}:</strong>{" "}
                {formData.category}
              </Typography>
              <Typography variant="body1">
                <strong>{t("curriculums.form.difficulty")}:</strong>{" "}
                {formData.difficulty}
              </Typography>
              <Typography variant="body1">
                <strong>{t("curriculums.form.visibility")}:</strong>{" "}
                {formData.visibility}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                gutterBottom
              >
                {t("curriculums.review.content")}
              </Typography>
              <Typography variant="body1">
                {t("curriculums.review.itemCount", { count: items.length })}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleBack}>
                {t("common.back")}
              </Button>
              <Button
                variant="contained"
                onClick={handleFinalSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode
                  ? t("common.saveChanges")
                  : t("curriculums.publish")}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default CurriculumCreatePage;
