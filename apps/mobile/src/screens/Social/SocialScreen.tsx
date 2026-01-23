/**
 * Read Master Mobile - Social Screen
 *
 * Social features including feed, leaderboards, and profiles.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";

// ============================================================================
// Types
// ============================================================================

type TabKey = "feed" | "leaderboard" | "clubs";

// ============================================================================
// Component
// ============================================================================

export function SocialScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const styles = createStyles(theme);

  const tabs: {
    key: TabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "feed", label: t("social.tabs.feed"), icon: "newspaper-outline" },
    {
      key: "leaderboard",
      label: t("social.tabs.leaderboard"),
      icon: "trophy-outline",
    },
    { key: "clubs", label: t("social.tabs.clubs"), icon: "people-outline" },
  ];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={
                activeTab === tab.key
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === "feed" && <FeedContent theme={theme} />}
        {activeTab === "leaderboard" && <LeaderboardContent theme={theme} />}
        {activeTab === "clubs" && <ClubsContent theme={theme} />}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Feed Content
// ============================================================================

function FeedContent({
  theme,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const feedStyles = feedContentStyles(theme);

  return (
    <View style={feedStyles.container}>
      <ActivityCard
        username="Sarah J."
        action="finished reading"
        book="Atomic Habits"
        time="2h ago"
        avatar={null}
        theme={theme}
      />
      <ActivityCard
        username="Mike R."
        action="started reading"
        book="The Psychology of Money"
        time="5h ago"
        avatar={null}
        theme={theme}
      />
      <ActivityCard
        username="Emma L."
        action="added 48 flashcards from"
        book="Sapiens"
        time="1d ago"
        avatar={null}
        theme={theme}
      />
    </View>
  );
}

interface ActivityCardProps {
  username: string;
  action: string;
  book: string;
  time: string;
  avatar: string | null;
  theme: ReturnType<typeof useTheme>["theme"];
}

function ActivityCard({
  username,
  action,
  book,
  time,
  theme,
}: ActivityCardProps) {
  return (
    <View style={activityCardStyles(theme).container}>
      <View style={activityCardStyles(theme).avatar}>
        <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
      </View>
      <View style={activityCardStyles(theme).content}>
        <Text style={activityCardStyles(theme).text}>
          <Text style={activityCardStyles(theme).username}>{username}</Text>{" "}
          {action} <Text style={activityCardStyles(theme).book}>{book}</Text>
        </Text>
        <Text style={activityCardStyles(theme).time}>{time}</Text>
      </View>
    </View>
  );
}

function activityCardStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.sm,
    },
    content: {
      flex: 1,
    },
    text: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      lineHeight: 22,
    },
    username: {
      fontWeight: "600",
    },
    book: {
      fontWeight: "600",
      color: theme.colors.primary,
    },
    time: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
  });
}

function feedContentStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      padding: theme.spacing.md,
    },
  });
}

// ============================================================================
// Leaderboard Content
// ============================================================================

function LeaderboardContent({
  theme,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const styles = leaderboardStyles(theme);

  const leaders = [
    { rank: 1, name: "BookWorm42", books: 127, pages: 42500 },
    { rank: 2, name: "Sarah J.", books: 98, pages: 35200 },
    { rank: 3, name: "ReaderX", books: 85, pages: 31800 },
    { rank: 4, name: "LitFan99", books: 72, pages: 28400 },
    { rank: 5, name: "Mike R.", books: 68, pages: 25100 },
  ];

  return (
    <View style={styles.container}>
      {leaders.map((leader) => (
        <View key={leader.rank} style={styles.leaderRow}>
          <Text style={[styles.rank, leader.rank <= 3 && styles.topRank]}>
            #{leader.rank}
          </Text>
          <View style={styles.leaderInfo}>
            <Text style={styles.leaderName}>{leader.name}</Text>
            <Text style={styles.leaderStats}>
              {leader.books} books • {leader.pages.toLocaleString()} pages
            </Text>
          </View>
          {leader.rank <= 3 && (
            <Ionicons
              name="trophy"
              size={24}
              color={
                leader.rank === 1
                  ? "#FFD700"
                  : leader.rank === 2
                    ? "#C0C0C0"
                    : "#CD7F32"
              }
            />
          )}
        </View>
      ))}
    </View>
  );
}

function leaderboardStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      padding: theme.spacing.md,
    },
    leaderRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    rank: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      width: 40,
    },
    topRank: {
      color: theme.colors.primary,
    },
    leaderInfo: {
      flex: 1,
    },
    leaderName: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.text,
    },
    leaderStats: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
}

// ============================================================================
// Clubs Content
// ============================================================================

function ClubsContent({
  theme,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const styles = clubsStyles(theme);

  const clubs = [
    { name: "Science Fiction Enthusiasts", members: 234, currentBook: "Dune" },
    {
      name: "Non-Fiction Readers",
      members: 156,
      currentBook: "Thinking, Fast and Slow",
    },
    {
      name: "Classic Literature Club",
      members: 89,
      currentBook: "Pride and Prejudice",
    },
  ];

  return (
    <View style={styles.container}>
      {clubs.map((club, index) => (
        <TouchableOpacity key={index} style={styles.clubCard}>
          <View style={styles.clubInfo}>
            <Text style={styles.clubName}>{club.name}</Text>
            <Text style={styles.clubMembers}>{club.members} members</Text>
            <Text style={styles.clubBook}>
              Currently reading: {club.currentBook}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function clubsStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      padding: theme.spacing.md,
    },
    clubCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    clubInfo: {
      flex: 1,
    },
    clubName: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.text,
    },
    clubMembers: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    clubBook: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      marginTop: 4,
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
    tabsContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },
    content: {
      flex: 1,
    },
  });
}
