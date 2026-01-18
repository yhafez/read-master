import { Box, CircularProgress, Typography } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuthState } from "@/auth";
import { ROUTES } from "./routes";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

/**
 * ProtectedRoute wrapper that checks authentication status.
 * If not authenticated, redirects to sign-in page.
 * Shows loading state while auth is being checked.
 */
export function ProtectedRoute({
  children,
}: ProtectedRouteProps): React.ReactElement {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuthState();
  const location = useLocation();

  // Show loading while auth state is being determined
  if (!isLoaded) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress aria-label={t("common.loading")} />
        <Typography variant="body2" color="text.secondary">
          {t("common.loading")}
        </Typography>
      </Box>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    // Save the attempted URL for redirecting after login
    return <Navigate to={ROUTES.SIGN_IN} state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}

export default ProtectedRoute;
