import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/i18n";

import { App } from "./App";
import { QueryProvider } from "./lib";
import { AppThemeProvider } from "./theme";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </QueryProvider>
  </StrictMode>
);
