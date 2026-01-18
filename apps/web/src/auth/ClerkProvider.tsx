import { ClerkProvider as ClerkBaseProvider } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/router/routes";

// Get the Clerk publishable key from environment variables
// For Vite apps, use VITE_ prefix for client-side env vars
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

type ClerkProviderProps = {
  children: ReactNode;
};

/**
 * Application-specific Clerk provider that wraps ClerkBaseProvider
 * with navigation and route configuration.
 */
export function ClerkProvider({
  children,
}: ClerkProviderProps): React.ReactElement {
  const navigate = useNavigate();

  // If no publishable key is configured, render children without auth
  // This allows development to continue without Clerk credentials
  // In production, you should always configure the publishable key
  if (!CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return (
    <ClerkBaseProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl={ROUTES.SIGN_IN}
      signUpUrl={ROUTES.SIGN_UP}
      afterSignInUrl={ROUTES.DASHBOARD}
      afterSignUpUrl={ROUTES.DASHBOARD}
      signInFallbackRedirectUrl={ROUTES.DASHBOARD}
      signUpFallbackRedirectUrl={ROUTES.DASHBOARD}
    >
      {children}
    </ClerkBaseProvider>
  );
}

export default ClerkProvider;
