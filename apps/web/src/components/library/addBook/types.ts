/**
 * Type definitions for AddBookModal components
 */

/**
 * Available tabs in the add book modal
 */
export type AddBookTab = "upload" | "url" | "paste" | "search";

/**
 * Supported file formats for upload
 */
export type SupportedFileFormat =
  | "epub"
  | "pdf"
  | "doc"
  | "docx"
  | "txt"
  | "html";

/**
 * Maximum file size in bytes (50MB)
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Maximum file size in MB for display
 */
export const MAX_FILE_SIZE_MB = 50;

/**
 * Allowed MIME types for file upload
 */
export const ALLOWED_MIME_TYPES: Record<SupportedFileFormat, string[]> = {
  epub: ["application/epub+zip"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  txt: ["text/plain"],
  html: ["text/html"],
};

/**
 * All allowed MIME types as a flat array
 */
export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

/**
 * File extensions by format
 */
export const FILE_EXTENSIONS: Record<SupportedFileFormat, string> = {
  epub: ".epub",
  pdf: ".pdf",
  doc: ".doc",
  docx: ".docx",
  txt: ".txt",
  html: ".html",
};

/**
 * All allowed file extensions as a string for accept attribute
 */
export const ALLOWED_FILE_EXTENSIONS = Object.values(FILE_EXTENSIONS).join(",");

/**
 * Book source for library results
 */
export type BookSearchSource = "google_books" | "open_library";

/**
 * Search result from external libraries
 */
export interface BookSearchResult {
  externalId: string;
  source: BookSearchSource;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  isbn?: string;
  isPublicDomain?: boolean;
}

/**
 * Upload tab state
 */
export interface UploadTabState {
  file: File | null;
  title: string;
  author: string;
  isDragging: boolean;
  error: string | null;
}

/**
 * URL import tab state
 */
export interface UrlTabState {
  url: string;
  title: string;
  author: string;
  error: string | null;
}

/**
 * Paste text tab state
 */
export interface PasteTabState {
  content: string;
  title: string;
  author: string;
  error: string | null;
}

/**
 * Search tab state
 */
export interface SearchTabState {
  query: string;
  results: BookSearchResult[];
  selectedBook: BookSearchResult | null;
  isSearching: boolean;
  error: string | null;
}

/**
 * Add book form data for API
 */
export interface AddBookFormData {
  title: string;
  author: string;
  file?: File;
  url?: string;
  content?: string;
  externalId?: string;
  source?: BookSearchSource;
}

/**
 * Props for individual tab components
 */
export interface TabPanelProps {
  /** Whether this tab is currently active */
  isActive: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Callback when book is ready to be submitted */
  onSubmit: (data: AddBookFormData) => void;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Tab configuration
 */
export interface TabConfig {
  id: AddBookTab;
  labelKey: string;
  icon: string;
}

/**
 * Tab configurations
 */
export const TAB_CONFIGS: TabConfig[] = [
  { id: "upload", labelKey: "library.addBook.tabs.upload", icon: "upload" },
  { id: "url", labelKey: "library.addBook.tabs.url", icon: "link" },
  {
    id: "paste",
    labelKey: "library.addBook.tabs.paste",
    icon: "content_paste",
  },
  { id: "search", labelKey: "library.addBook.tabs.search", icon: "search" },
];

/**
 * Validates a file for upload
 */
export function validateFile(file: File): ValidationError | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      field: "file",
      message: `File size exceeds maximum of ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  // Check file type
  const isValidType = ALL_ALLOWED_MIME_TYPES.includes(file.type);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isValidExtension = Object.values(FILE_EXTENSIONS).includes(
    `.${extension}`
  );

  if (!isValidType && !isValidExtension) {
    return {
      field: "file",
      message:
        "Unsupported file format. Please upload EPUB, PDF, DOC, DOCX, TXT, or HTML files.",
    };
  }

  return null;
}

/**
 * Validates a URL for import
 */
export function validateUrl(url: string): ValidationError | null {
  if (!url.trim()) {
    return { field: "url", message: "URL is required" };
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { field: "url", message: "URL must use HTTP or HTTPS protocol" };
    }
  } catch {
    return { field: "url", message: "Please enter a valid URL" };
  }

  return null;
}

/**
 * Validates pasted text content
 */
export function validatePastedContent(content: string): ValidationError | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return { field: "content", message: "Content is required" };
  }

  // Minimum content length (at least 50 characters)
  if (trimmed.length < 50) {
    return {
      field: "content",
      message: "Content must be at least 50 characters",
    };
  }

  return null;
}

/**
 * Validates title field
 */
export function validateTitle(title: string): ValidationError | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return { field: "title", message: "Title is required" };
  }

  if (trimmed.length > 200) {
    return {
      field: "title",
      message: "Title must be less than 200 characters",
    };
  }

  return null;
}

/**
 * Gets format from file extension
 */
export function getFormatFromFile(file: File): SupportedFileFormat | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const format = Object.entries(FILE_EXTENSIONS).find(
    ([, ext]) => ext === `.${extension}`
  );
  return format ? (format[0] as SupportedFileFormat) : null;
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Default initial state for upload tab
 */
export const INITIAL_UPLOAD_STATE: UploadTabState = {
  file: null,
  title: "",
  author: "",
  isDragging: false,
  error: null,
};

/**
 * Default initial state for URL tab
 */
export const INITIAL_URL_STATE: UrlTabState = {
  url: "",
  title: "",
  author: "",
  error: null,
};

/**
 * Default initial state for paste tab
 */
export const INITIAL_PASTE_STATE: PasteTabState = {
  content: "",
  title: "",
  author: "",
  error: null,
};

/**
 * Default initial state for search tab
 */
export const INITIAL_SEARCH_STATE: SearchTabState = {
  query: "",
  results: [],
  selectedBook: null,
  isSearching: false,
  error: null,
};
