import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Curriculums page placeholder.
 * Will display user's curriculums.
 */
export function CurriculumsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.curriculums")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.curriculumsPlaceholder")}
      </Typography>
    </Box>
  );
}

export default CurriculumsPage;
