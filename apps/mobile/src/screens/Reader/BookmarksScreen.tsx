/**
 * Read Master Mobile - Bookmarks Screen
 *
 * Displays and manages book bookmarks.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";
import { useBookmarks, useDeleteBookmark } from "../../hooks/useBooks";
import type { ReaderStackParamList } from "../../navigation/ReaderStack";
import type { Bookmark } from "../../services/api";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<
  ReaderStackParamList,
  "Bookmarks"
>;
type BookmarksRouteProp = RouteProp<ReaderStackParamList, "Bookmarks">;

// ============================================================================
// Component
// ============================================================================

export function BookmarksScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookmarksRouteProp>();

  const { bookId } = route.params;
  const { data: bookmarks, isLoading, error } = useBookmarks(bookId);
  const deleteBookmark = useDeleteBookmark();

  const handleBookmarkPress = useCallback(
    (_bookmark: Bookmark) => {
      // Navigate back to reader with bookmark position
      navigation.navigate("ReaderMain", { bookId });
      // In a real implementation, we would also pass the position to navigate to
    },
    [bookId, navigation]
  );

  const handleDeleteBookmark = useCallback(
    (bookmark: Bookmark) => {
      Alert.alert(t("common.delete"), "Delete this bookmark?", [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            deleteBookmark.mutate({ bookId, bookmarkId: bookmark.id });
          },
        },
      ]);
    },
    [bookId, deleteBookmark, t]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const styles = createStyles(theme);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
      </View>
    );
  }

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={() => handleBookmarkPress(item)}
      onLongPress={() => handleDeleteBookmark(item)}
    >
      <View style={styles.bookmarkIcon}>
        <Ionicons name="bookmark" size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.bookmarkContent}>
        <Text style={styles.bookmarkTitle} numberOfLines={1}>
          {item.title ?? `Page ${item.position}`}
        </Text>
        <Text style={styles.bookmarkDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteBookmark(item)}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmark}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="bookmark-outline"
              size={64}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyTitle}>{t("reader.noBookmarks")}</Text>
            <Text style={styles.emptyDescription}>
              Tap the bookmark icon while reading to add bookmarks
            </Text>
          </View>
        }
      />
    </View>
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    listContent: {
      paddingVertical: theme.spacing.sm,
    },
    bookmarkItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    bookmarkIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    bookmarkContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    bookmarkTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: "500",
      color: theme.colors.text,
    },
    bookmarkDate: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    deleteButton: {
      padding: theme.spacing.sm,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: 56 + theme.spacing.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      marginTop: 100,
    },
    emptyTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    emptyDescription: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: theme.spacing.sm,
    },
  });
}

export default BookmarksScreen;
