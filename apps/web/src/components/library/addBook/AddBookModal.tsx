/**
 * AddBookModal component with tabs for different book import methods
 */

import { useState, useCallback, type SyntheticEvent } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Link as LinkIcon,
  ContentPaste as PasteIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import { UploadTab } from "./UploadTab";
import { UrlTab } from "./UrlTab";
import { PasteTab } from "./PasteTab";
import { SearchTab } from "./SearchTab";
import { type AddBookTab, type AddBookFormData } from "./types";

/**
 * Props for AddBookModal component
 */
export interface AddBookModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when a book is successfully added */
  onBookAdded?: ((bookId: string) => void) | undefined;
}

/**
 * Tab icon mapping
 */
const TAB_ICONS: Record<AddBookTab, React.ReactElement> = {
  upload: <UploadIcon />,
  url: <LinkIcon />,
  paste: <PasteIcon />,
  search: <SearchIcon />,
};

/**
 * Modal for adding books via upload, URL, paste, or search
 */
export function AddBookModal({
  open,
  onClose,
  onBookAdded,
}: AddBookModalProps): React.ReactElement {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AddBookTab>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle tab change
  const handleTabChange = useCallback(
    (_event: SyntheticEvent, newValue: AddBookTab) => {
      setActiveTab(newValue);
      setError(null);
    },
    []
  );

  // Handle form submission for all tabs
  const handleSubmit = useCallback(
    async (data: AddBookFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        let response: Response;

        if (data.file) {
          // Upload file
          const formData = new FormData();
          formData.append("file", data.file);
          formData.append("title", data.title);
          formData.append("author", data.author);

          response = await fetch("/api/books/upload", {
            method: "POST",
            body: formData,
          });
        } else if (data.url) {
          // Import from URL
          response = await fetch("/api/books/import-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: data.url,
              title: data.title,
              author: data.author,
            }),
          });
        } else if (data.content) {
          // Paste text
          response = await fetch("/api/books/paste", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: data.content,
              title: data.title,
              author: data.author,
            }),
          });
        } else if (data.externalId && data.source) {
          // Add from library search
          response = await fetch("/api/books/add-from-library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              externalId: data.externalId,
              source: data.source,
            }),
          });
        } else {
          throw new Error(t("library.addBook.errors.invalidData"));
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || t("library.addBook.errors.addFailed")
          );
        }

        const result = await response.json();

        setSuccessMessage(t("library.addBook.success"));
        setIsLoading(false);

        // Call onBookAdded callback
        if (onBookAdded && result.id) {
          onBookAdded(result.id);
        }

        // Close modal after short delay to show success
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 1500);
      } catch (err) {
        setIsLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : t("library.addBook.errors.addFailed")
        );
      }
    },
    [onBookAdded, onClose, t]
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
      // Reset state after modal closes
      setTimeout(() => {
        setActiveTab("upload");
        setError(null);
        setSuccessMessage(null);
      }, 300);
    }
  }, [isLoading, onClose]);

  // Handle snackbar close
  const handleSnackbarClose = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="add-book-modal-title"
      >
        {/* Header */}
        <DialogTitle
          id="add-book-modal-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 0,
          }}
        >
          {t("library.addBook.title")}
          <IconButton
            onClick={handleClose}
            disabled={isLoading}
            aria-label={t("common.close")}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label={t("library.addBook.tabsLabel")}
          >
            <Tab
              id="upload-tab"
              aria-controls="upload-panel"
              icon={TAB_ICONS.upload}
              iconPosition="start"
              label={t("library.addBook.tabs.upload")}
              value="upload"
              disabled={isLoading}
            />
            <Tab
              id="url-tab"
              aria-controls="url-panel"
              icon={TAB_ICONS.url}
              iconPosition="start"
              label={t("library.addBook.tabs.url")}
              value="url"
              disabled={isLoading}
            />
            <Tab
              id="paste-tab"
              aria-controls="paste-panel"
              icon={TAB_ICONS.paste}
              iconPosition="start"
              label={t("library.addBook.tabs.paste")}
              value="paste"
              disabled={isLoading}
            />
            <Tab
              id="search-tab"
              aria-controls="search-panel"
              icon={TAB_ICONS.search}
              iconPosition="start"
              label={t("library.addBook.tabs.search")}
              value="search"
              disabled={isLoading}
            />
          </Tabs>
        </Box>

        {/* Content */}
        <DialogContent sx={{ pt: 2 }}>
          {/* Global Error */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Tab Panels */}
          <UploadTab
            isActive={activeTab === "upload"}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
          <UrlTab
            isActive={activeTab === "url"}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
          <PasteTab
            isActive={activeTab === "paste"}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
          <SearchTab
            isActive={activeTab === "search"}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default AddBookModal;
