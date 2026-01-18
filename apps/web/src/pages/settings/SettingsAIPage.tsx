import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * AI settings page placeholder.
 * Will display AI preferences and usage.
 */
export function SettingsAIPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.ai")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsAIPlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsAIPage;
