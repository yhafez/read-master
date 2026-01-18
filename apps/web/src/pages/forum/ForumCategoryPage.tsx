import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Forum category page placeholder.
 * Will display posts in a specific category.
 */
export function ForumCategoryPage(): React.ReactElement {
  const { t } = useTranslation();
  const { categorySlug } = useParams<{ categorySlug: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("forum.category")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("forum.categoryPlaceholder", { category: categorySlug })}
      </Typography>
    </Box>
  );
}

export default ForumCategoryPage;
