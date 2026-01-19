import { AppRouter } from "@/router";
import { ServiceWorkerUpdatePrompt } from "@/pwa";
import { AchievementNotificationManager } from "@/components/common";

export function App(): React.ReactElement {
  return (
    <>
      <AppRouter />
      <ServiceWorkerUpdatePrompt />
      <AchievementNotificationManager />
    </>
  );
}

export default App;
