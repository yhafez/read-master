import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Flashcards page placeholder.
 * Will display user's flashcard decks and review status.
 */
export function FlashcardsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.flashcards")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.flashcardsPlaceholder")}
      </Typography>
    </Box>
  );
}

export default FlashcardsPage;
