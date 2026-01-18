import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Forum post page placeholder.
 * Will display a single post with replies.
 */
export function ForumPostPage(): React.ReactElement {
  const { t } = useTranslation();
  const { postId } = useParams<{ postId: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("forum.post")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("forum.postPlaceholder", { postId })}
      </Typography>
    </Box>
  );
}

export default ForumPostPage;
