import { Outlet } from "react-router-dom";

import { ClerkProvider } from "@/auth";

/**
 * Root layout component that wraps all routes with common providers.
 * This is used at the top level of the router to provide:
 * - ClerkProvider for authentication
 *
 * This layout is necessary because ClerkProvider needs access to
 * react-router-dom's navigate function, which is only available
 * inside the router context.
 */
export function RootLayout(): React.ReactElement {
  return (
    <ClerkProvider>
      <Outlet />
    </ClerkProvider>
  );
}

export default RootLayout;
