import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Assessments page placeholder.
 * Will display user's assessment history.
 */
export function AssessmentsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.assessments")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.assessmentsPlaceholder")}
      </Typography>
    </Box>
  );
}

export default AssessmentsPage;
