import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Curriculum browse page placeholder.
 * Will display public curriculums to discover.
 */
export function CurriculumBrowsePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("curriculums.browse")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.curriculumBrowsePlaceholder")}
      </Typography>
    </Box>
  );
}

export default CurriculumBrowsePage;
