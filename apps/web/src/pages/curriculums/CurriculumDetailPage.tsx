import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Curriculum detail page placeholder.
 * Will display curriculum content and progress.
 */
export function CurriculumDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { curriculumId } = useParams<{ curriculumId: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("curriculums.detail")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("curriculums.placeholder", { curriculumId })}
      </Typography>
    </Box>
  );
}

export default CurriculumDetailPage;
