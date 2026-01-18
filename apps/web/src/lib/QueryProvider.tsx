import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useMemo, useState } from "react";

import {
  createQueryClient,
  queryClient as defaultQueryClient,
} from "./queryClient";

export interface QueryProviderProps {
  children: ReactNode;
  /**
   * Optional custom QueryClient instance
   * If not provided, uses the default client
   */
  client?: ReturnType<typeof createQueryClient>;
  /**
   * Whether to show React Query DevTools
   * Defaults to true in development, false in production
   */
  showDevtools?: boolean;
  /**
   * DevTools initial open state
   * Defaults to false (collapsed)
   */
  devtoolsInitialOpen?: boolean;
  /**
   * DevTools button position
   * Defaults to "bottom-right"
   */
  devtoolsPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/**
 * React Query provider component with integrated DevTools
 *
 * @example
 * ```tsx
 * // Basic usage - uses default client
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 *
 * // With custom client for testing
 * <QueryProvider client={testQueryClient}>
 *   <TestComponent />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({
  children,
  client,
  showDevtools,
  devtoolsInitialOpen = false,
  devtoolsPosition = "bottom-right",
}: QueryProviderProps): React.ReactElement {
  // Use provided client or default
  const queryClient = client ?? defaultQueryClient;

  // Determine if we should show devtools
  const shouldShowDevtools = showDevtools ?? import.meta.env.DEV;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {shouldShowDevtools && (
        <ReactQueryDevtools
          initialIsOpen={devtoolsInitialOpen}
          buttonPosition={devtoolsPosition}
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Hook to create an isolated QueryClient for tests
 * Creates a new client for each test to prevent state leakage
 */
export function useTestQueryClient(): ReturnType<typeof createQueryClient> {
  const [client] = useState(() =>
    createQueryClient({
      defaultOptions: {
        queries: {
          // Disable retries in tests for faster failures
          retry: false,
          // Disable caching in tests
          staleTime: 0,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    })
  );

  return client;
}

/**
 * Test wrapper component that creates an isolated QueryClient
 * Use this in tests to wrap components that use React Query
 *
 * @example
 * ```tsx
 * render(
 *   <TestQueryProvider>
 *     <ComponentThatUsesQueries />
 *   </TestQueryProvider>
 * );
 * ```
 */
export function TestQueryProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const client = useMemo(
    () =>
      createQueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      }),
    []
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
