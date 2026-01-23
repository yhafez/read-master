/**
 * Read Master Mobile - Flashcards Screen
 *
 * Main flashcards view with review queue.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";

// ============================================================================
// Component
// ============================================================================

export function FlashcardsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Mock data - replace with real hook
  const stats = {
    dueToday: 24,
    newCards: 8,
    reviewedToday: 12,
    streak: 5,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="time-outline"
          label={t("flashcards.dueToday")}
          value={stats.dueToday}
          color={theme.colors.warning}
          theme={theme}
        />
        <StatCard
          icon="add-circle-outline"
          label={t("flashcards.newCards")}
          value={stats.newCards}
          color={theme.colors.info}
          theme={theme}
        />
        <StatCard
          icon="checkmark-circle-outline"
          label={t("flashcards.reviewedToday")}
          value={stats.reviewedToday}
          color={theme.colors.success}
          theme={theme}
        />
        <StatCard
          icon="flame-outline"
          label={t("flashcards.streak")}
          value={`${stats.streak} ${t("flashcards.days")}`}
          color={theme.colors.error}
          theme={theme}
        />
      </View>

      {/* Review Button */}
      <TouchableOpacity style={styles.reviewButton}>
        <Ionicons name="play" size={24} color="#ffffff" />
        <Text style={styles.reviewButtonText}>
          {t("flashcards.startReview")}
        </Text>
      </TouchableOpacity>

      {/* Decks Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("flashcards.yourDecks")}</Text>
        <DeckCard
          title="Sapiens: Key Concepts"
          cardCount={48}
          dueCount={12}
          theme={theme}
        />
        <DeckCard
          title="1984: Vocabulary"
          cardCount={32}
          dueCount={5}
          theme={theme}
        />
        <DeckCard
          title="Reading Comprehension"
          cardCount={120}
          dueCount={7}
          theme={theme}
        />
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
  theme: ReturnType<typeof useTheme>["theme"];
}

function StatCard({ icon, label, value, color, theme }: StatCardProps) {
  return (
    <View
      style={[
        statCardStyles(theme).container,
        { borderLeftColor: color, borderLeftWidth: 3 },
      ]}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={statCardStyles(theme).value}>{value}</Text>
      <Text style={statCardStyles(theme).label}>{label}</Text>
    </View>
  );
}

function statCardStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      minWidth: "45%",
    },
    value: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
    },
    label: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
}

// ============================================================================
// Deck Card Component
// ============================================================================

interface DeckCardProps {
  title: string;
  cardCount: number;
  dueCount: number;
  theme: ReturnType<typeof useTheme>["theme"];
}

function DeckCard({ title, cardCount, dueCount, theme }: DeckCardProps) {
  return (
    <TouchableOpacity style={deckCardStyles(theme).container}>
      <View style={deckCardStyles(theme).info}>
        <Text style={deckCardStyles(theme).title}>{title}</Text>
        <Text style={deckCardStyles(theme).count}>
          {cardCount} cards • {dueCount} due
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function deckCardStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.text,
    },
    count: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
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
      padding: theme.spacing.md,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    reviewButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    reviewButtonText: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: "#ffffff",
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
  });
}
