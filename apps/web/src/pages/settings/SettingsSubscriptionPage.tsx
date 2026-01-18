import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Subscription settings page placeholder.
 * Will display subscription management.
 */
export function SettingsSubscriptionPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.subscription")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsSubscriptionPlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsSubscriptionPage;
