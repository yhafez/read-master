/**
 * Read Master Mobile - Settings Screen
 *
 * App settings and user preferences.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth, useUser } from "@clerk/clerk-expo";

import { useTheme, type ThemeMode } from "../../theme/ThemeProvider";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthStore } from "../../stores/authStore";

// ============================================================================
// Component
// ============================================================================

export function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, setThemeMode } = useTheme();
  const { signOut } = useAuth();
  const { user } = useUser();

  const {
    notificationSettings,
    setNotificationSettings,
    aiEnabled,
    setAiEnabled,
    autoDownload,
    setAutoDownload,
  } = useSettingsStore();

  const {
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
    biometricType,
  } = useAuthStore();

  const styles = createStyles(theme);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      await enableBiometric();
    } else {
      await disableBiometric();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.profile")}</Text>
        <TouchableOpacity style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons
              name="person"
              size={32}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName ||
                user?.emailAddresses[0]?.emailAddress ||
                "User"}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.emailAddresses[0]?.emailAddress}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.appearance")}</Text>
        <View style={styles.optionGroup}>
          <SettingRow
            icon="sunny-outline"
            label={t("settings.theme")}
            value={theme.mode}
            onPress={() => {}}
            theme={theme}
          />
          <View style={styles.themeOptions}>
            {(["system", "light", "dark", "sepia"] as ThemeMode[]).map(
              (mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOption,
                    theme.mode === mode && styles.themeOptionActive,
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      theme.mode === mode && styles.themeOptionTextActive,
                    ]}
                  >
                    {t(`settings.themes.${mode}`)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </View>

      {/* Security Section */}
      {isBiometricAvailable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.security")}</Text>
          <View style={styles.optionGroup}>
            <SettingRowSwitch
              icon="finger-print-outline"
              label={biometricType || t("settings.biometric")}
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              theme={theme}
            />
          </View>
        </View>
      )}

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>
        <View style={styles.optionGroup}>
          <SettingRowSwitch
            icon="albums-outline"
            label={t("settings.flashcardReminders")}
            value={notificationSettings.flashcardReminders}
            onValueChange={(v) =>
              setNotificationSettings({ flashcardReminders: v })
            }
            theme={theme}
          />
          <SettingRowSwitch
            icon="flame-outline"
            label={t("settings.streakReminders")}
            value={notificationSettings.streakReminders}
            onValueChange={(v) =>
              setNotificationSettings({ streakReminders: v })
            }
            theme={theme}
          />
          <SettingRowSwitch
            icon="people-outline"
            label={t("settings.bookClubUpdates")}
            value={notificationSettings.bookClubUpdates}
            onValueChange={(v) =>
              setNotificationSettings({ bookClubUpdates: v })
            }
            theme={theme}
          />
        </View>
      </View>

      {/* AI Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.ai")}</Text>
        <View style={styles.optionGroup}>
          <SettingRowSwitch
            icon="bulb-outline"
            label={t("settings.aiFeatures")}
            value={aiEnabled}
            onValueChange={setAiEnabled}
            theme={theme}
          />
        </View>
      </View>

      {/* Storage Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.storage")}</Text>
        <View style={styles.optionGroup}>
          <SettingRowSwitch
            icon="cloud-download-outline"
            label={t("settings.autoDownload")}
            value={autoDownload}
            onValueChange={setAutoDownload}
            theme={theme}
          />
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.account")}</Text>
        <View style={styles.optionGroup}>
          <SettingRow
            icon="card-outline"
            label={t("settings.subscription")}
            value="Free"
            onPress={() => {}}
            theme={theme}
          />
          <SettingRow
            icon="download-outline"
            label={t("settings.exportData")}
            onPress={() => {}}
            theme={theme}
          />
          <SettingRow
            icon="trash-outline"
            label={t("settings.deleteAccount")}
            onPress={() => {}}
            theme={theme}
            danger
          />
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
        <Text style={styles.signOutText}>{t("settings.signOut")}</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Read Master v1.0.0</Text>
    </ScrollView>
  );
}

// ============================================================================
// Setting Row Components
// ============================================================================

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  danger?: boolean;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  theme,
  danger,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={settingRowStyles(theme).container}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={22}
        color={danger ? theme.colors.error : theme.colors.textSecondary}
      />
      <Text
        style={[
          settingRowStyles(theme).label,
          danger && { color: theme.colors.error },
        ]}
      >
        {label}
      </Text>
      {value && <Text style={settingRowStyles(theme).value}>{value}</Text>}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

interface SettingRowSwitchProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function SettingRowSwitch({
  icon,
  label,
  value,
  onValueChange,
  theme,
}: SettingRowSwitchProps) {
  return (
    <View style={settingRowStyles(theme).container}>
      <Ionicons name={icon} size={22} color={theme.colors.textSecondary} />
      <Text style={settingRowStyles(theme).label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primaryLight,
        }}
        thumbColor={value ? theme.colors.primary : theme.colors.surface}
      />
    </View>
  );
}

function settingRowStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    label: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
    },
    value: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
  });
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingBottom: theme.spacing.xl,
    },
    section: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.md,
    },
    optionGroup: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    profileAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.text,
    },
    profileEmail: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    themeOptions: {
      flexDirection: "row",
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    themeOption: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    themeOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}15`,
    },
    themeOptionText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    themeOptionTextActive: {
      color: theme.colors.primary,
      fontWeight: "600",
    },
    signOutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.xl,
      marginHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    signOutText: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.error,
    },
    version: {
      textAlign: "center",
      marginTop: theme.spacing.lg,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textMuted,
    },
  });
}
