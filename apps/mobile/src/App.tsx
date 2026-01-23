/**
 * Read Master Mobile - App Entry Point
 *
 * Main application component that sets up providers and navigation.
 */

import React, { useEffect, useState } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { I18nextProvider } from "react-i18next";

import { RootNavigator } from "./navigation/RootNavigator";
import { ThemeProvider } from "./theme/ThemeProvider";
import i18n from "./utils/i18n";
import { useAuthStore } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";

// ============================================================================
// Configuration
// ============================================================================

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Clerk publishable key (from environment)
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ============================================================================
// Secure Token Cache for Clerk
// ============================================================================

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (_err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (_err) {
      return;
    }
  },
};

// ============================================================================
// App Component
// ============================================================================

export default function App() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    async function prepare() {
      try {
        // Load persisted settings
        await loadSettings();

        // Initialize auth state
        await initializeAuth();

        // Register for push notifications
        await registerForPushNotifications();
      } catch (_e) {
        // Initialization error - silently continue
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, [initializeAuth, loadSettings]);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable"
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          tokenCache={tokenCache}
        >
          <ClerkLoaded>
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={i18n}>
                <ThemeProvider>
                  <StatusBar
                    barStyle={
                      colorScheme === "dark" ? "light-content" : "dark-content"
                    }
                  />
                  <RootNavigator />
                </ThemeProvider>
              </I18nextProvider>
            </QueryClientProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ============================================================================
// Helpers
// ============================================================================

async function registerForPushNotifications() {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return;
    }

    // Get push token
    const _token = await Notifications.getExpoPushTokenAsync({
      projectId: "your-project-id",
    });

    // TODO: Send token to backend for storage
  } catch (_error) {
    // Push notification registration failed - silently continue
  }
}
