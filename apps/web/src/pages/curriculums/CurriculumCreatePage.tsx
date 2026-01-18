import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Curriculum create page placeholder.
 * Will display form to create a new curriculum.
 */
export function CurriculumCreatePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("curriculums.create")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.curriculumCreatePlaceholder")}
      </Typography>
    </Box>
  );
}

export default CurriculumCreatePage;
