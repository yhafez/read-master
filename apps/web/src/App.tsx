import { AppRouter } from "@/router";
import { ServiceWorkerUpdatePrompt } from "@/pwa";
import { AchievementNotificationManager } from "@/components/common";
import { useRouteAnnouncements } from "@/hooks";

export function App(): React.ReactElement {
  // Announce route changes to screen readers
  useRouteAnnouncements();

  return (
    <>
      <AppRouter />
      <ServiceWorkerUpdatePrompt />
      <AchievementNotificationManager />
    </>
  );
}

export default App;
