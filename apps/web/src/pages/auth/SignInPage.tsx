import { Box, Container, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Sign-in page placeholder.
 * Will be replaced with Clerk's SignIn component.
 */
export function SignInPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper sx={{ p: 4, width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t("auth.signIn")}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mt: 2 }}
          >
            {t("auth.signInPlaceholder")}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export default SignInPage;
