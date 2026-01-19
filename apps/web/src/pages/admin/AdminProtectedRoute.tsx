/**
 * AdminProtectedRoute Component
 *
 * Wraps admin routes to check for admin role.
 * Redirects non-admin users to the dashboard with an error message.
 */

import { Navigate, useLocation } from "react-router-dom";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-react";

import { useAuthState, isClerkConfigured } from "@/auth";
import { ROUTES } from "@/router/routes";

type AdminProtectedRouteProps = {
  children: React.ReactNode;
};

/**
 * Check if user has admin role.
 * In development without Clerk, defaults to true for testing.
 * In production, checks Clerk public metadata for role.
 */
function useIsAdmin(): { isLoading: boolean; isAdmin: boolean } {
  const { isLoaded, isSignedIn } = useAuthState();
  const { user, isLoaded: userLoaded } = useUser();

  // Development mode without Clerk - allow access
  if (!isClerkConfigured()) {
    return { isLoading: false, isAdmin: true };
  }

  // Still loading
  if (!isLoaded || !userLoaded) {
    return { isLoading: true, isAdmin: false };
  }

  // Not signed in
  if (!isSignedIn || !user) {
    return { isLoading: false, isAdmin: false };
  }

  // Check public metadata for admin role
  const role = user.publicMetadata?.role as string | undefined;
  return { isLoading: false, isAdmin: role === "ADMIN" };
}

export function AdminProtectedRoute({
  children,
}: AdminProtectedRouteProps): React.ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const { isLoading, isAdmin } = useIsAdmin();
  const { isSignedIn } = useAuthState();

  // Show loading while checking admin status
  if (isLoading) {
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
          {t("admin.checkingAccess", "Checking access...")}
        </Typography>
      </Box>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Navigate to={ROUTES.SIGN_IN} state={{ from: location }} replace />;
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="body1" fontWeight={600}>
            {t("admin.accessDenied", "Access Denied")}
          </Typography>
          <Typography variant="body2">
            {t(
              "admin.adminOnly",
              "This page is only accessible to administrators."
            )}
          </Typography>
        </Alert>
        <Typography
          variant="body2"
          color="text.secondary"
          component="a"
          href={ROUTES.DASHBOARD}
          sx={{
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {t("admin.returnToDashboard", "Return to Dashboard")}
        </Typography>
      </Box>
    );
  }

  // Render admin content
  return <>{children}</>;
}

export default AdminProtectedRoute;
