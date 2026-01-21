import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";

import { clearSentryUser, setSentryUser } from "@/lib/sentry";

/**
 * Syncs Clerk user state with Sentry for error tracking
 * This component doesn't render anything, it just handles side effects
 */
export function SentryUserSync(): null {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Set Sentry user context
      setSentryUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username ?? undefined,
        // @ts-expect-error - publicMetadata may contain tier from backend
        tier: user.publicMetadata?.tier,
      });
    } else {
      // Clear Sentry user on logout
      clearSentryUser();
    }
  }, [isSignedIn, user]);

  return null;
}
