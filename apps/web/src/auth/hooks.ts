import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useClerk,
} from "@clerk/clerk-react";

// Re-export Clerk hooks directly for convenience
export { useClerkAuth as useAuth, useClerkUser as useUser, useClerk };

/**
 * Check if Clerk is configured and available.
 * Returns false if VITE_CLERK_PUBLISHABLE_KEY is not set.
 */
export function isClerkConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
}

/**
 * Hook that provides the current authentication state.
 * Returns a simplified auth state object.
 */
export function useAuthState(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  isClerkConfigured: boolean;
} {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();

  // If Clerk is not configured, return mock loaded state for development
  if (!isClerkConfigured()) {
    return {
      isLoaded: true,
      isSignedIn: true, // Allow access in development without Clerk
      userId: "dev-user-id",
      isClerkConfigured: false,
    };
  }

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    isClerkConfigured: true,
  };
}
