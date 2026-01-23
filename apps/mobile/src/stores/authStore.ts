/**
 * Read Master Mobile - Auth Store
 *
 * Manages authentication state using Zustand.
 */

import { create } from "zustand";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  tier: "FREE" | "PRO" | "SCHOLAR";
}

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  biometricType: string | null;

  // Actions
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkBiometricAvailability: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: true,
  isBiometricEnabled: false,
  isBiometricAvailable: false,
  biometricType: null,

  // Initialize auth state
  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check biometric availability
      await get().checkBiometricAvailability();

      // Check if biometric is enabled
      const biometricEnabled =
        await SecureStore.getItemAsync("biometric_enabled");
      set({ isBiometricEnabled: biometricEnabled === "true" });
    } catch (_error) {
      // Error handled silently("Error initializing auth:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Set current user
  setUser: (user) => {
    set({ user });
  },

  // Check biometric availability
  checkBiometricAvailability: async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        set({ isBiometricAvailable: false, biometricType: null });
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        set({ isBiometricAvailable: false, biometricType: null });
        return;
      }

      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometricType: string | null = null;

      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        biometricType = "Face ID";
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        biometricType = "Touch ID / Fingerprint";
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = "Iris";
      }

      set({ isBiometricAvailable: true, biometricType });
    } catch (_error) {
      // Error handled silently("Error checking biometric availability:", error);
      set({ isBiometricAvailable: false, biometricType: null });
    }
  },

  // Enable biometric authentication
  enableBiometric: async () => {
    try {
      const { isBiometricAvailable } = get();
      if (!isBiometricAvailable) {
        return false;
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric authentication",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync("biometric_enabled", "true");
        set({ isBiometricEnabled: true });
        return true;
      }

      return false;
    } catch (_error) {
      // Error handled silently("Error enabling biometric:", error);
      return false;
    }
  },

  // Disable biometric authentication
  disableBiometric: async () => {
    try {
      await SecureStore.deleteItemAsync("biometric_enabled");
      set({ isBiometricEnabled: false });
    } catch (_error) {
      // Error handled silently("Error disabling biometric:", error);
    }
  },

  // Authenticate with biometric
  authenticateWithBiometric: async () => {
    try {
      const { isBiometricEnabled, isBiometricAvailable } = get();
      if (!isBiometricEnabled || !isBiometricAvailable) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to continue",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (_error) {
      // Error handled silently("Error authenticating with biometric:", error);
      return false;
    }
  },

  // Logout
  logout: async () => {
    try {
      set({ user: null });
    } catch (_error) {
      // Error handled silently("Error logging out:", error);
    }
  },
}));
