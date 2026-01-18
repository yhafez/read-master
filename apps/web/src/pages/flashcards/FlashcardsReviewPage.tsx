import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Flashcards review page placeholder.
 * Will display SRS review interface.
 */
export function FlashcardsReviewPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("flashcards.review")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.flashcardsReviewPlaceholder")}
      </Typography>
    </Box>
  );
}

export default FlashcardsReviewPage;
