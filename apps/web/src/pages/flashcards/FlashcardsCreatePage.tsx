import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Flashcards create page placeholder.
 * Will display flashcard creation form.
 */
export function FlashcardsCreatePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("flashcards.create")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.flashcardsCreatePlaceholder")}
      </Typography>
    </Box>
  );
}

export default FlashcardsCreatePage;
