/**
 * Forum Create/Edit Page
 *
 * Provides form for creating and editing forum posts with:
 * - Title and content fields with validation
 * - Category selector (required)
 * - Rich text editor with markdown preview
 * - Character count and limits
 * - Form state persistence (draft saving)
 * - Edit mode for existing posts
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon,
  FormatListBulleted as ListIcon,
  Link as LinkIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ROUTES, routeHelpers } from "@/router/routes";
import {
  validateForumPostForm,
  hasFormErrors,
  getCharacterCount,
  insertMarkdownFormat,
  renderMarkdownPreview,
  TITLE_MAX_LENGTH,
  CONTENT_MAX_LENGTH,
  type FormData,
  type FormErrors,
  type TranslateFn,
} from "./forumFormUtils";

// =============================================================================
// TYPES
// =============================================================================

interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  minTierToPost: "FREE" | "PRO" | "SCHOLAR";
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  categoryId: string;
}

// Mock categories (will be fetched from API)
const MOCK_CATEGORIES: ForumCategory[] = [
  {
    id: "c1",
    slug: "general-discussion",
    name: "General Discussion",
    description: "General reading and book discussions",
    minTierToPost: "FREE",
  },
  {
    id: "c2",
    slug: "book-recommendations",
    name: "Book Recommendations",
    description: "Share and discover new books",
    minTierToPost: "FREE",
  },
  {
    id: "c3",
    slug: "study-tips",
    name: "Study Tips",
    description: "Reading strategies and learning techniques",
    minTierToPost: "FREE",
  },
  {
    id: "c4",
    slug: "technical-support",
    name: "Technical Support",
    description: "Help with the platform",
    minTierToPost: "FREE",
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
}

function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled = false,
}: ToolbarButtonProps): React.ReactElement {
  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ForumCreatePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const preselectedCategoryId = searchParams.get("category");

  const isEditMode = Boolean(postId);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
    categoryId: preselectedCategoryId ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // UI state
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Loading states (for edit mode)
  const [isLoadingPost, setIsLoadingPost] = useState(isEditMode);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<ForumCategory[]>([]);

  // Textarea ref for formatting toolbar
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(
    null
  );

  // Load categories
  useEffect(() => {
    // TODO: Replace with actual API call
    const loadCategories = () => {
      setCategories(MOCK_CATEGORIES);
      setIsLoadingCategories(false);
    };

    // Simulate API delay
    const timer = setTimeout(loadCategories, 300);
    return () => clearTimeout(timer);
  }, []);

  // Load existing post for edit mode
  useEffect(() => {
    if (!isEditMode || !postId) {
      setIsLoadingPost(false);
      return;
    }

    // TODO: Replace with actual API call
    const loadPost = () => {
      // Mock post data for edit mode
      const mockPost: ForumPost = {
        id: postId,
        title: "Example Post Title",
        content:
          "This is the content of the post that would be loaded from the API.",
        categoryId: "c1",
      };

      setFormData({
        title: mockPost.title,
        content: mockPost.content,
        categoryId: mockPost.categoryId,
      });
      setIsLoadingPost(false);
    };

    // Simulate API delay
    const timer = setTimeout(loadPost, 500);
    return () => clearTimeout(timer);
  }, [isEditMode, postId]);

  // Character counts
  const titleCount = useMemo(
    () => getCharacterCount(formData.title, TITLE_MAX_LENGTH),
    [formData.title]
  );
  const contentCount = useMemo(
    () => getCharacterCount(formData.content, CONTENT_MAX_LENGTH),
    [formData.content]
  );

  // Rendered preview
  const previewHtml = useMemo(
    () => renderMarkdownPreview(formData.content),
    [formData.content]
  );

  // Form handlers
  const handleFieldChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setSubmitError(null);

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: keyof FormData) => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate on blur
      const fieldErrors = validateForumPostForm(formData, t as TranslateFn);
      if (fieldErrors[field]) {
        setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
      }
    },
    [formData, t]
  );

  const handleCategoryChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      handleFieldChange("categoryId", e.target.value);
    },
    [handleFieldChange]
  );

  // Formatting toolbar handlers
  const insertFormat = useCallback(
    (prefix: string, suffix: string = prefix) => {
      if (!textareaRef) return;

      const { selectionStart, selectionEnd } = textareaRef;
      const result = insertMarkdownFormat(
        formData.content,
        selectionStart,
        selectionEnd,
        prefix,
        suffix
      );

      handleFieldChange("content", result.newText);

      // Restore focus and cursor position
      requestAnimationFrame(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(result.newCursorPos, result.newCursorPos);
      });
    },
    [textareaRef, formData.content, handleFieldChange]
  );

  const handleBold = useCallback(() => insertFormat("**"), [insertFormat]);
  const handleItalic = useCallback(() => insertFormat("*"), [insertFormat]);
  const handleCode = useCallback(() => insertFormat("`"), [insertFormat]);
  const handleQuote = useCallback(
    () => insertFormat("\n> ", "\n"),
    [insertFormat]
  );
  const handleList = useCallback(
    () => insertFormat("\n- ", "\n"),
    [insertFormat]
  );
  const handleLink = useCallback(
    () => insertFormat("[", "](url)"),
    [insertFormat]
  );

  // Submit handler
  const handleSubmit = useCallback(async () => {
    // Validate all fields
    const validationErrors = validateForumPostForm(formData, t as TranslateFn);
    setErrors(validationErrors);
    setTouched({ title: true, content: true, categoryId: true });

    if (hasFormErrors(validationErrors)) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Replace with actual API call
      // const response = isEditMode
      //   ? await api.updatePost(postId, formData)
      //   : await api.createPost(formData);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to the new/updated post
      const newPostId = isEditMode ? postId : "new-post-id";
      navigate(routeHelpers.forumPost(newPostId!), { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : t("forum.form.errors.general")
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, t, isEditMode, postId, navigate]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (isDirty) {
      // TODO: Show confirmation dialog
      // For now, just navigate back
    }
    navigate(-1);
  }, [navigate, isDirty]);

  const handleCancel = useCallback(() => {
    navigate(ROUTES.FORUM);
  }, [navigate]);

  // Loading state
  if (isLoadingPost || isLoadingCategories) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={handleBack} aria-label={t("common.back")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? t("forum.form.editTitle") : t("forum.form.createTitle")}
        </Typography>
      </Stack>

      {/* Error Alert */}
      {submitError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <IconButton
              size="small"
              onClick={() => setSubmitError(null)}
              aria-label={t("common.close")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {submitError}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Category Selector */}
        <FormControl
          fullWidth
          error={Boolean(touched.categoryId && errors.categoryId)}
        >
          <InputLabel id="category-select-label">
            {t("forum.form.category")} *
          </InputLabel>
          <Select
            labelId="category-select-label"
            value={formData.categoryId}
            onChange={handleCategoryChange}
            onBlur={() => handleBlur("categoryId")}
            label={`${t("forum.form.category")} *`}
            disabled={isSubmitting}
          >
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                <Box>
                  <Typography>{category.name}</Typography>
                  {category.description && (
                    <Typography variant="caption" color="text.secondary">
                      {category.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
          {touched.categoryId && errors.categoryId && (
            <FormHelperText>{errors.categoryId}</FormHelperText>
          )}
        </FormControl>

        {/* Title Field */}
        <TextField
          label={`${t("forum.form.title")} *`}
          value={formData.title}
          onChange={(e) => handleFieldChange("title", e.target.value)}
          onBlur={() => handleBlur("title")}
          error={Boolean(touched.title && errors.title)}
          helperText={
            touched.title && errors.title ? (
              errors.title
            ) : (
              <Box
                component="span"
                sx={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>{t("forum.form.titleHelp")}</span>
                <span
                  style={{
                    color: titleCount.isOver ? "error" : "inherit",
                  }}
                >
                  {titleCount.display}
                </span>
              </Box>
            )
          }
          fullWidth
          disabled={isSubmitting}
          inputProps={{ maxLength: TITLE_MAX_LENGTH + 50 }}
        />

        {/* Content Editor Card */}
        <Card variant="outlined">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              value="edit"
              label={t("forum.form.tabs.write")}
              icon={<EditIcon fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              value="preview"
              label={t("forum.form.tabs.preview")}
              icon={<PreviewIcon fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>

          <CardContent>
            {activeTab === "edit" ? (
              <Stack spacing={1}>
                {/* Formatting Toolbar */}
                <Paper variant="outlined" sx={{ p: 0.5 }}>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    <ToolbarButton
                      icon={<BoldIcon fontSize="small" />}
                      tooltip={t("forum.form.toolbar.bold")}
                      onClick={handleBold}
                      disabled={isSubmitting}
                    />
                    <ToolbarButton
                      icon={<ItalicIcon fontSize="small" />}
                      tooltip={t("forum.form.toolbar.italic")}
                      onClick={handleItalic}
                      disabled={isSubmitting}
                    />
                    <ToolbarButton
                      icon={<CodeIcon fontSize="small" />}
                      tooltip={t("forum.form.toolbar.code")}
                      onClick={handleCode}
                      disabled={isSubmitting}
                    />
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <ToolbarButton
                      icon={<QuoteIcon fontSize="small" />}
                      tooltip={t("forum.form.toolbar.quote")}
                      onClick={handleQuote}
                      disabled={isSubmitting}
                    />
                    <ToolbarButton
                      icon={<ListIcon fontSize="small" />}
                      tooltip={t("forum.form.toolbar.list")}
                      onClick={handleList}
                      disabled={isSubmitting}
                    />
                    <ToolbarButton
                      icon={<LinkIcon fontSize="small" />}
                      tooltip={t("forum.form.toolbar.link")}
                      onClick={handleLink}
                      disabled={isSubmitting}
                    />
                  </Stack>
                </Paper>

                {/* Content Textarea */}
                <TextField
                  inputRef={setTextareaRef}
                  placeholder={t("forum.form.contentPlaceholder")}
                  value={formData.content}
                  onChange={(e) => handleFieldChange("content", e.target.value)}
                  onBlur={() => handleBlur("content")}
                  error={Boolean(touched.content && errors.content)}
                  helperText={
                    touched.content && errors.content ? (
                      errors.content
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{t("forum.form.markdownSupported")}</span>
                        <span
                          style={{
                            color: contentCount.isOver ? "error" : "inherit",
                          }}
                        >
                          {contentCount.display}
                        </span>
                      </Box>
                    )
                  }
                  multiline
                  minRows={12}
                  maxRows={30}
                  fullWidth
                  disabled={isSubmitting}
                />
              </Stack>
            ) : (
              <Box>
                {formData.content.trim() ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      minHeight: 300,
                      "& pre": {
                        backgroundColor: "action.hover",
                        p: 1,
                        borderRadius: 1,
                        overflow: "auto",
                      },
                      "& code": {
                        backgroundColor: "action.hover",
                        px: 0.5,
                        borderRadius: 0.5,
                        fontFamily: "monospace",
                      },
                      "& blockquote": {
                        borderLeft: 4,
                        borderColor: "divider",
                        pl: 2,
                        ml: 0,
                        color: "text.secondary",
                        fontStyle: "italic",
                      },
                      "& a": {
                        color: "primary.main",
                      },
                      "& li": {
                        marginLeft: 2,
                      },
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <Box
                    sx={{
                      minHeight: 300,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography color="text.secondary">
                      {t("forum.form.previewEmpty")}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Formatting Help */}
        <Box sx={{ px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t("forum.form.formattingHelp")}:{" "}
            <Chip
              label="**bold**"
              size="small"
              variant="outlined"
              sx={{ mr: 0.5 }}
            />
            <Chip
              label="*italic*"
              size="small"
              variant="outlined"
              sx={{ mr: 0.5 }}
            />
            <Chip
              label="`code`"
              size="small"
              variant="outlined"
              sx={{ mr: 0.5 }}
            />
            <Chip label="[link](url)" size="small" variant="outlined" />
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack
          direction="row"
          spacing={2}
          justifyContent="flex-end"
          sx={{ pt: 2 }}
        >
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || !isDirty}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : isEditMode ? (
                <SaveIcon />
              ) : (
                <SendIcon />
              )
            }
          >
            {isSubmitting
              ? t("common.saving")
              : isEditMode
                ? t("common.save")
                : t("forum.form.submit")}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default ForumCreatePage;
