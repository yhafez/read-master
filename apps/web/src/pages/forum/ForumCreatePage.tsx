import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Forum create page placeholder.
 * Will display form to create a new forum post.
 */
export function ForumCreatePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("forum.create")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.forumCreatePlaceholder")}
      </Typography>
    </Box>
  );
}

export default ForumCreatePage;
