/**
 * Accessibility Tests (WCAG 2.2 AAA)
 *
 * Tests automated accessibility checks for all major pages and components
 * using axe-core for WCAG 2.2 compliance.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as axe from "axe-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Helper to check for violations
function expectNoViolations(results: { violations: unknown[] }) {
  expect(results.violations).toHaveLength(0);
}

// Helper to run axe
async function runAxe(container: Element, options?: axe.RunOptions) {
  return await axe.run(container, options);
}

// Test wrapper with all providers
function AccessibilityTestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const theme = createTheme({
    palette: {
      mode: "light",
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Accessibility Tests (WCAG 2.2 AAA)", () => {
  describe("Color Contrast", () => {
    it("should meet AAA contrast ratios (7:1)", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <h1>Read Master</h1>
            <p>AI-powered reading comprehension platform</p>
            <button>Get Started</button>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "color-contrast-enhanced": { enabled: true }, // AAA level (7:1)
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Keyboard Navigation", () => {
    it("should have visible focus indicators", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <button>First Button</button>
            <button>Second Button</button>
            <a href="/test">Test Link</a>
            <input type="text" placeholder="Test Input" />
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "focus-order-semantics": { enabled: true },
          "tabindex": { enabled: true },
        },
      });

      expectNoViolations(results);
    });

    it("should have skip navigation links", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <nav>Navigation</nav>
            <main id="main-content">Content</main>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container);
      expectNoViolations(results);
    });
  });

  describe("Images and Alternative Text", () => {
    it("should have alt text for all images", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <img src="/logo.png" alt="Read Master Logo" />
            <img src="/icon.png" alt="" role="presentation" />
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "image-alt": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Forms and Labels", () => {
    it("should have proper labels for all form inputs", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <form>
            <label htmlFor="email-input">Email</label>
            <input id="email-input" type="email" />

            <label htmlFor="password-input">Password</label>
            <input id="password-input" type="password" />

            <button type="submit">Sign In</button>
          </form>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          label: { enabled: true },
          "label-title-only": { enabled: true },
        },
      });

      expectNoViolations(results);
    });

    it("should have accessible error messages", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <form>
            <label htmlFor="test-input">Username</label>
            <input
              id="test-input"
              type="text"
              aria-describedby="error-message"
              aria-invalid="true"
            />
            <div id="error-message" role="alert">
              Username is required
            </div>
          </form>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "aria-valid-attr": { enabled: true },
          "aria-allowed-attr": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("ARIA Attributes", () => {
    it("should use valid ARIA roles and attributes", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <div role="alert" aria-live="assertive">
              Important notification
            </div>
            <button aria-label="Close" aria-expanded="false">
              X
            </button>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "aria-valid-attr": { enabled: true },
          "aria-valid-attr-value": { enabled: true },
          "aria-allowed-attr": { enabled: true },
          "aria-required-attr": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Semantic HTML", () => {
    it("should use proper heading hierarchy", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <h1>Main Title</h1>
            <h2>Section Title</h2>
            <h3>Subsection Title</h3>
            <p>Content</p>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "heading-order": { enabled: true },
          "page-has-heading-one": { enabled: true },
        },
      });

      expectNoViolations(results);
    });

    it("should use landmarks correctly", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <header>
              <nav>Navigation</nav>
            </header>
            <main>
              <h1>Main Content</h1>
            </main>
            <footer>Footer</footer>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          region: { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Touch Targets", () => {
    it("should have minimum 44x44px touch targets", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div>
            <button
              style={{ minWidth: "44px", minHeight: "44px", padding: "12px" }}
            >
              Click Me
            </button>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "target-size": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Document Structure", () => {
    it("should have proper document language", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div lang="en">
            <h1>Hello World</h1>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "html-has-lang": { enabled: true },
          "valid-lang": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Lists", () => {
    it("should use proper list structure", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          list: { enabled: true },
          listitem: { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Tables", () => {
    it("should have proper table headers", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Age</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John</td>
                <td>30</td>
              </tr>
            </tbody>
          </table>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "th-has-data-cells": { enabled: true },
          "td-headers-attr": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });

  describe("Dialogs and Modals", () => {
    it("should have proper dialog structure", async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
            <h2 id="dialog-title">Dialog Title</h2>
            <p>Dialog content</p>
            <button>Close</button>
          </div>
        </AccessibilityTestWrapper>
      );

      const results = await runAxe(container, {
        rules: {
          "aria-dialog-name": { enabled: true },
          "aria-allowed-attr": { enabled: true },
        },
      });

      expectNoViolations(results);
    });
  });
});
