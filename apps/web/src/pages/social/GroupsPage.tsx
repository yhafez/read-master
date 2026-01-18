import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Groups page placeholder.
 * Will display user's reading groups.
 */
export function GroupsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.groups")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.groupsPlaceholder")}
      </Typography>
    </Box>
  );
}

export default GroupsPage;
