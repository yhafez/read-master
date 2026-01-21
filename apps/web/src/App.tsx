import { AppRouter } from "@/router";
import { ServiceWorkerUpdatePrompt } from "@/pwa";
import { AchievementNotificationManager } from "@/components/common";
import { OfflineIndicator } from "@/components/pwa";
import { useRouteAnnouncements } from "@/hooks";

export function App(): React.ReactElement {
  // Announce route changes to screen readers
  useRouteAnnouncements();

  return (
    <>
      <AppRouter />
      <ServiceWorkerUpdatePrompt />
      <AchievementNotificationManager />
      <OfflineIndicator />
    </>
  );
}

export default App;
