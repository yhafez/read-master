import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Forum page placeholder.
 * Will display forum categories and recent posts.
 */
export function ForumPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.forum")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.forumPlaceholder")}
      </Typography>
    </Box>
  );
}

export default ForumPage;
