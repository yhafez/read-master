import { AppRouter } from "@/router";
import { ServiceWorkerUpdatePrompt } from "@/pwa";

export function App(): React.ReactElement {
  return (
    <>
      <AppRouter />
      <ServiceWorkerUpdatePrompt />
    </>
  );
}

export default App;
