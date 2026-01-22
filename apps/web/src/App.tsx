import { AppRouter } from "@/router";
import { ServiceWorkerUpdatePrompt } from "@/pwa";
import {
  AchievementNotificationManager,
  SentryUserSync,
  PostHogUserSync,
  SkipNavigation,
  SkipLinks,
} from "@/components/common";
import { OfflineIndicator, InstallPrompt } from "@/components/pwa";
import { useRouteAnnouncements } from "@/hooks";

export function App(): React.ReactElement {
  // Announce route changes to screen readers
  useRouteAnnouncements();

  return (
    <>
      <SkipLinks />
      <SkipNavigation />
      <SentryUserSync />
      <PostHogUserSync />
      <AppRouter />
      <ServiceWorkerUpdatePrompt />
      <AchievementNotificationManager />
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}

export default App;
