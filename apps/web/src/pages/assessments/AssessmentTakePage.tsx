import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Assessment take page placeholder.
 * Will display the assessment quiz interface.
 */
export function AssessmentTakePage(): React.ReactElement {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("assessments.take")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("assessments.placeholder", { assessmentId })}
      </Typography>
    </Box>
  );
}

export default AssessmentTakePage;
