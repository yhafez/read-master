/**
 * Read Master Mobile - Reader Settings Screen
 *
 * Settings for customizing the reading experience.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";

import { useTheme, type ThemeMode } from "../../theme/ThemeProvider";
import { useSettingsStore } from "../../stores/settingsStore";

// ============================================================================
// Component
// ============================================================================

export function ReaderSettingsScreen() {
  const { t } = useTranslation();
  const { theme, setThemeMode } = useTheme();
  const settings = useSettingsStore();

  const handleFontSizeChange = useCallback(
    (value: number) => {
      settings.setFontSize(Math.round(value));
    },
    [settings]
  );

  const handleLineSpacingChange = useCallback(
    (value: number) => {
      settings.setLineSpacing(Math.round(value * 10) / 10);
    },
    [settings]
  );

  const handleMarginsChange = useCallback(
    (value: number) => {
      settings.setMargins(Math.round(value));
    },
    [settings]
  );

  const styles = createStyles(theme);

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: "light", label: t("reader.themes.light"), icon: "sunny" },
    { mode: "dark", label: t("reader.themes.dark"), icon: "moon" },
    { mode: "sepia", label: t("reader.themes.sepia"), icon: "book" },
  ];

  const fontOptions = [
    { id: "system", name: "System Default" },
    { id: "georgia", name: "Georgia" },
    { id: "palatino", name: "Palatino" },
    { id: "times", name: "Times New Roman" },
    { id: "opendyslexic", name: "OpenDyslexic" },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Font Size */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("reader.fontSize")}</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>A</Text>
          <Slider
            style={styles.slider}
            minimumValue={12}
            maximumValue={32}
            value={settings.fontSize}
            onValueChange={handleFontSizeChange}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />
          <Text style={[styles.sliderLabel, styles.sliderLabelLarge]}>A</Text>
        </View>
        <Text style={styles.sliderValue}>{settings.fontSize}px</Text>
      </View>

      {/* Font Family */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("reader.fontFamily")}</Text>
        <View style={styles.optionsGrid}>
          {fontOptions.map((font) => (
            <TouchableOpacity
              key={font.id}
              style={[
                styles.fontOption,
                settings.fontFamily === font.id && styles.fontOptionSelected,
              ]}
              onPress={() => settings.setFontFamily(font.id)}
            >
              <Text
                style={[
                  styles.fontOptionText,
                  settings.fontFamily === font.id &&
                    styles.fontOptionTextSelected,
                ]}
              >
                {font.name}
              </Text>
              {settings.fontFamily === font.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Line Spacing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("reader.lineSpacing")}</Text>
        <View style={styles.sliderContainer}>
          <Ionicons
            name="reorder-two"
            size={20}
            color={theme.colors.textSecondary}
          />
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={2.5}
            value={settings.lineSpacing}
            onValueChange={handleLineSpacingChange}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />
          <Ionicons
            name="reorder-four"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>
        <Text style={styles.sliderValue}>
          {settings.lineSpacing.toFixed(1)}x
        </Text>
      </View>

      {/* Margins */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("reader.margins")}</Text>
        <View style={styles.sliderContainer}>
          <Ionicons
            name="contract"
            size={20}
            color={theme.colors.textSecondary}
          />
          <Slider
            style={styles.slider}
            minimumValue={8}
            maximumValue={48}
            value={settings.margins}
            onValueChange={handleMarginsChange}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />
          <Ionicons
            name="expand"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>
        <Text style={styles.sliderValue}>{settings.margins}px</Text>
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("reader.theme")}</Text>
        <View style={styles.themeOptions}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.themeOption,
                theme.mode === option.mode && styles.themeOptionSelected,
              ]}
              onPress={() => setThemeMode(option.mode)}
            >
              <Ionicons
                name={option.icon as "sunny" | "moon" | "book"}
                size={24}
                color={
                  theme.mode === option.mode
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.themeOptionText,
                  theme.mode === option.mode && styles.themeOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewContainer}>
          <Text
            style={[
              styles.previewText,
              {
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineSpacing,
                paddingHorizontal: settings.margins,
              },
            ]}
          >
            The quick brown fox jumps over the lazy dog. This is a preview of
            how your text will appear while reading.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
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
    section: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    sectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: theme.spacing.md,
    },
    sliderContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    slider: {
      flex: 1,
      height: 40,
    },
    sliderLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    sliderLabelLarge: {
      fontSize: theme.fontSize.xl,
    },
    sliderValue: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      textAlign: "center",
      marginTop: theme.spacing.xs,
      fontWeight: "500",
    },
    optionsGrid: {
      gap: theme.spacing.sm,
    },
    fontOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    fontOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + "10",
    },
    fontOptionText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
    },
    fontOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: "500",
    },
    themeOptions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    themeOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    themeOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + "10",
    },
    themeOptionText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    themeOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: "500",
    },
    previewContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
    },
    previewText: {
      color: theme.colors.text,
    },
  });
}

export default ReaderSettingsScreen;
