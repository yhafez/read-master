import { Box, Container, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/common";

export function App(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container maxWidth="lg">
      <Box
        component="header"
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          py: 2,
        }}
      >
        <LanguageSwitcher />
      </Box>
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          {t("common.appName")}
        </Typography>
        <Typography variant="h5" color="text.secondary">
          {t("home.tagline")}
        </Typography>
      </Box>
    </Container>
  );
}
