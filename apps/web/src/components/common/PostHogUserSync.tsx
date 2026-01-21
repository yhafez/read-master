/**
 * PostHog User Sync Component
 *
 * Automatically syncs user data with PostHog when user logs in/out
 */

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { identifyUser, resetUser, setUserProperties } from "@/lib/analytics";
import { logger } from "@/lib/logger";

export function PostHogUserSync(): null {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Identify user in PostHog
      const userId = user.id;
      const email = user.primaryEmailAddress?.emailAddress;
      const tier = (user.publicMetadata?.tier as string) || "FREE";

      const properties: Record<string, string> = {
        tier: tier as "FREE" | "PRO" | "SCHOLAR",
      };

      if (email) {
        properties.email = email;
      }

      identifyUser(userId, properties);

      logger.debug("User identified in PostHog", { userId, tier });
    } else if (!isSignedIn) {
      // User logged out, reset PostHog
      resetUser();
      logger.debug("User reset in PostHog");
    }
  }, [isSignedIn, user]);

  // Update user properties when they change
  useEffect(() => {
    if (isSignedIn && user) {
      const tier = (user.publicMetadata?.tier as string) || "FREE";

      setUserProperties({
        tier: tier as "FREE" | "PRO" | "SCHOLAR",
      });
    }
  }, [isSignedIn, user?.publicMetadata?.tier]);

  // This component doesn't render anything
  return null;
}
