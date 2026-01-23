/**
 * Read Master Mobile - BookCard Component
 *
 * Displays a book with cover image, title, author, and progress.
 */

import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/ThemeProvider";

// ============================================================================
// Types
// ============================================================================

export interface Book {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  progress: number;
  status: "WANT_TO_READ" | "READING" | "COMPLETED";
}

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with 16px padding on sides and 16px gap
const COVER_HEIGHT = CARD_WIDTH * 1.5; // 2:3 aspect ratio

// ============================================================================
// Component
// ============================================================================

export function BookCard({ book, onPress }: BookCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getStatusIcon = () => {
    switch (book.status) {
      case "READING":
        return "book";
      case "COMPLETED":
        return "checkmark-circle";
      case "WANT_TO_READ":
        return "bookmark";
      default:
        return "book-outline";
    }
  };

  const getStatusColor = () => {
    switch (book.status) {
      case "READING":
        return theme.colors.primary;
      case "COMPLETED":
        return theme.colors.success;
      case "WANT_TO_READ":
        return theme.colors.warning;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {book.coverUrl ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <Ionicons name="book" size={48} color={theme.colors.textMuted} />
          </View>
        )}

        {/* Progress Overlay */}
        {book.status === "READING" && book.progress > 0 && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(book.progress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(book.progress)}%
            </Text>
          </View>
        )}

        {/* Status Badge */}
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
        >
          <Ionicons name={getStatusIcon()} size={12} color="#ffffff" />
        </View>
      </View>

      {/* Book Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        {book.author && (
          <Text style={styles.author} numberOfLines={1}>
            {book.author}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      width: CARD_WIDTH,
      marginBottom: theme.spacing.md,
    },
    coverContainer: {
      width: "100%",
      height: COVER_HEIGHT,
      borderRadius: theme.borderRadius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cover: {
      width: "100%",
      height: "100%",
    },
    placeholderCover: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surfaceVariant,
    },
    progressOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.sm,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    progressBarBackground: {
      height: 4,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 2,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: theme.fontSize.xs,
      color: "#ffffff",
      marginTop: 4,
      textAlign: "center",
      fontWeight: "600",
    },
    statusBadge: {
      position: "absolute",
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    infoContainer: {
      paddingTop: theme.spacing.sm,
    },
    title: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text,
      lineHeight: theme.fontSize.sm * 1.3,
    },
    author: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
}

export default BookCard;
