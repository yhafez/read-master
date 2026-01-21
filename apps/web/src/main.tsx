import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/i18n";
import "./styles/focus-visible.css";

import { App } from "./App";
import { QueryProvider } from "./lib";
import { ErrorBoundary, initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/analytics";
import { AppThemeProvider } from "./theme";

// Initialize Sentry before React renders
initSentry();

// Initialize PostHog analytics
initPostHog();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: "1rem", color: "#666" }}>
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred"}
          </p>
          <button
            onClick={resetError}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}
      showDialog={false}
    >
      <QueryProvider>
        <AppThemeProvider>
          <App />
        </AppThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>
);
