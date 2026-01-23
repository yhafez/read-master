/**
 * Read Master Mobile - Annotations Screen
 *
 * Displays and manages book annotations and highlights.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";
import {
  useAnnotations,
  useUpdateAnnotation,
  useDeleteAnnotation,
} from "../../hooks/useBooks";
import type { ReaderStackParamList } from "../../navigation/ReaderStack";
import type { Annotation } from "../../services/api";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<
  ReaderStackParamList,
  "Annotations"
>;
type AnnotationsRouteProp = RouteProp<ReaderStackParamList, "Annotations">;

// ============================================================================
// Component
// ============================================================================

export function AnnotationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AnnotationsRouteProp>();

  const { bookId } = route.params;
  const { data: annotations, isLoading, error } = useAnnotations(bookId);
  const updateAnnotation = useUpdateAnnotation();
  const deleteAnnotation = useDeleteAnnotation();

  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(
    null
  );
  const [editedNote, setEditedNote] = useState("");

  const handleAnnotationPress = useCallback(
    (_annotation: Annotation) => {
      // Navigate back to reader with annotation position
      navigation.navigate("ReaderMain", { bookId });
      // In a real implementation, we would also pass the position to navigate to
    },
    [bookId, navigation]
  );

  const handleEditAnnotation = useCallback((annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setEditedNote(annotation.note ?? "");
  }, []);

  const handleSaveNote = useCallback(() => {
    if (editingAnnotation) {
      updateAnnotation.mutate({
        bookId,
        annotationId: editingAnnotation.id,
        data: { note: editedNote },
      });
      setEditingAnnotation(null);
    }
  }, [bookId, editingAnnotation, editedNote, updateAnnotation]);

  const handleDeleteAnnotation = useCallback(
    (annotation: Annotation) => {
      Alert.alert(t("common.delete"), "Delete this annotation?", [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            deleteAnnotation.mutate({ bookId, annotationId: annotation.id });
          },
        },
      ]);
    },
    [bookId, deleteAnnotation, t]
  );

  const getHighlightColor = (color: string) => {
    const colors: Record<string, string> = {
      yellow: "#FFEB3B",
      green: "#4CAF50",
      blue: "#2196F3",
      pink: "#E91E63",
      purple: "#9C27B0",
    };
    return colors[color] ?? "#FFEB3B";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
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

  const renderAnnotation = ({ item }: { item: Annotation }) => (
    <TouchableOpacity
      style={styles.annotationItem}
      onPress={() => handleAnnotationPress(item)}
    >
      {/* Highlight indicator */}
      <View
        style={[
          styles.highlightIndicator,
          { backgroundColor: getHighlightColor(item.color) },
        ]}
      />

      <View style={styles.annotationContent}>
        {/* Highlighted text */}
        <View
          style={[
            styles.highlightedTextContainer,
            { backgroundColor: getHighlightColor(item.color) + "40" },
          ]}
        >
          <Text style={styles.highlightedText} numberOfLines={3}>
            "{item.text}"
          </Text>
        </View>

        {/* Note */}
        {item.note ? (
          <View style={styles.noteContainer}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.noteText} numberOfLines={2}>
              {item.note}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => handleEditAnnotation(item)}
          >
            <Ionicons
              name="add-circle-outline"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.addNoteText}>{t("reader.addNote")}</Text>
          </TouchableOpacity>
        )}

        {/* Date */}
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditAnnotation(item)}
        >
          <Ionicons
            name="pencil-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteAnnotation(item)}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={annotations}
        keyExtractor={(item) => item.id}
        renderItem={renderAnnotation}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyTitle}>{t("reader.noAnnotations")}</Text>
            <Text style={styles.emptyDescription}>
              Long press on text while reading to highlight
            </Text>
          </View>
        }
      />

      {/* Edit Note Modal */}
      <Modal
        visible={editingAnnotation !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingAnnotation(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingAnnotation(null)}>
              <Text style={styles.modalCancel}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t("reader.addNote")}</Text>
            <TouchableOpacity onPress={handleSaveNote}>
              <Text style={styles.modalSave}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>

          {editingAnnotation && (
            <View style={styles.modalContent}>
              <View
                style={[
                  styles.modalHighlight,
                  {
                    backgroundColor:
                      getHighlightColor(editingAnnotation.color) + "40",
                  },
                ]}
              >
                <Text style={styles.modalHighlightText}>
                  "{editingAnnotation.text}"
                </Text>
              </View>

              <TextInput
                style={styles.noteInput}
                placeholder="Add a note..."
                placeholderTextColor={theme.colors.textMuted}
                value={editedNote}
                onChangeText={setEditedNote}
                multiline
                autoFocus
              />
            </View>
          )}
        </View>
      </Modal>
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
    annotationItem: {
      flexDirection: "row",
      padding: theme.spacing.md,
    },
    highlightIndicator: {
      width: 4,
      borderRadius: 2,
      marginRight: theme.spacing.md,
    },
    annotationContent: {
      flex: 1,
    },
    highlightedTextContainer: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },
    highlightedText: {
      fontSize: theme.fontSize.md,
      fontStyle: "italic",
      color: theme.colors.text,
    },
    noteContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: theme.spacing.sm,
      gap: 6,
    },
    noteText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    addNoteButton: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.sm,
      gap: 4,
    },
    addNoteText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
    },
    dateText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    actions: {
      marginLeft: theme.spacing.sm,
    },
    actionButton: {
      padding: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: theme.spacing.md,
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
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    modalTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.text,
    },
    modalCancel: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    modalSave: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    modalContent: {
      padding: theme.spacing.md,
    },
    modalHighlight: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    modalHighlightText: {
      fontSize: theme.fontSize.md,
      fontStyle: "italic",
      color: theme.colors.text,
    },
    noteInput: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      minHeight: 120,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      textAlignVertical: "top",
    },
  });
}

export default AnnotationsScreen;
