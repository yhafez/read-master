# Annotations Integration Guide

## Overview

The Read Master annotation system is **fully implemented** with all backend APIs and frontend components ready. This guide shows how to integrate annotations into your readers.

## Architecture

### Backend (✅ Complete)

- **API Endpoint**: `/api/annotations`
- **Operations**: GET (list), POST (create), PUT (update), DELETE (soft delete)
- **Features**:
  - Character offset-based positioning (portable across formats)
  - Multi-color highlighting (6 preset colors)
  - Notes and bookmarks
  - Public/private visibility
  - Profanity filtering for public annotations

### Frontend Components (✅ Complete)

1. **`AnnotationToolbar`** - Floating toolbar on text selection
   - 6-color highlight picker
   - Add note button
   - Add bookmark button
   - Copy text, lookup, AI explain

2. **`AnnotationSidebar`** - Drawer showing all annotations
   - Filter by type (highlights, notes, bookmarks)
   - Search annotations
   - Sort by position, date, or type
   - Edit, delete, share actions

3. **`NoteEditorDialog`** - Modal for creating/editing notes
   - Attach notes to highlights
   - Public/private toggle
   - Character count validation

4. **`AnnotationExportDialog`** - Export annotations
   - Markdown format
   - PDF format
   - Filter by type
   - Include stats and TOC

### Hooks (✅ Complete)

- **`useAnnotations(bookId)`** - Fetch annotations for a book
- **`useCreateAnnotation(bookId)`** - Create annotation mutation
- **`useUpdateAnnotation(bookId)`** - Update annotation mutation
- **`useDeleteAnnotation(bookId)`** - Delete annotation mutation
- **`useAnnotationOperations(bookId)`** - All-in-one hook

### Types (✅ Complete)

```typescript
import type {
  Annotation,
  HighlightAnnotation,
  NoteAnnotation,
  BookmarkAnnotation,
  TextSelectionInfo,
  AnnotationAction,
  Create Annotation Input,
  UpdateAnnotationInput,
  HighlightColor,
} from "@/components/reader/annotationTypes";
```

## Integration Steps

### Step 1: Import Required Components and Hooks

```typescript
import { useState, useCallback } from "react";
import {
  AnnotationToolbar,
  AnnotationSidebar,
  NoteEditorDialog,
  AnnotationExportDialog,
  useSelectionAnchor,
} from "@/components/reader";
import type {
  Annotation,
  TextSelectionInfo,
  AnnotationAction,
  HighlightColor,
  CreateAnnotationInput,
} from "@/components/reader";
import { useAnnotationOperations } from "@/hooks/useAnnotations";
import {
  createHighlightInput,
  createNoteInput,
  createBookmarkInput,
  colorToHex,
} from "@/components/reader/annotationTypes";
```

### Step 2: Set Up State in Your Reader Component

```typescript
function MyReaderComponent({ bookId }: { bookId: string }) {
  // Fetch annotations
  const { annotations, create, update, remove } =
    useAnnotationOperations(bookId);

  // Selection state (for toolbar)
  const [selection, setSelection] = useState<TextSelectionInfo | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const anchorEl = useSelectionAnchor(selection);

  // Note editor state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(
    null
  );

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // ... rest of component
}
```

### Step 3: Handle Text Selection

```typescript
// When user selects text, capture selection info
const handleTextSelect = useCallback(
  (text: string, startOffset: number, endOffset: number) => {
    // Get selection bounding box for toolbar positioning
    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) return;

    const range = nativeSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const selectionInfo: TextSelectionInfo = {
      text,
      startOffset,
      endOffset,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
    };

    setSelection(selectionInfo);
    setShowToolbar(true);
  },
  []
);

// When selection is cleared
const handleClearSelection = useCallback(() => {
  setSelection(null);
  setShowToolbar(false);
}, []);
```

### Step 4: Handle Annotation Toolbar Actions

```typescript
const handleToolbarAction = useCallback(
  (action: AnnotationAction, color?: HighlightColor) => {
    if (!selection) return;

    switch (action) {
      case "highlight":
        // Create highlight
        const highlightInput = createHighlightInput(bookId, selection, color);
        create(highlightInput);
        handleClearSelection();
        break;

      case "note":
        // Open note editor
        setNoteDialogOpen(true);
        break;

      case "bookmark":
        // Create bookmark at this position
        const bookmarkInput = createBookmarkInput(
          bookId,
          selection.startOffset
        );
        create(bookmarkInput);
        handleClearSelection();
        break;

      case "copy":
        // Text is already copied by the toolbar
        handleClearSelection();
        break;

      case "lookup":
        // Open dictionary popover
        // (Implementation depends on your dictionary integration)
        break;

      case "explain":
        // Open AI explanation
        // (Implementation depends on your AI integration)
        break;
    }
  },
  [selection, bookId, create, handleClearSelection]
);
```

### Step 5: Handle Note Editor

```typescript
const handleNoteSave = useCallback(
  (note: string, isPublic: boolean) => {
    if (!selection) return;

    if (editingAnnotation) {
      // Update existing annotation
      update(editingAnnotation.id, { note, isPublic });
    } else {
      // Create new note annotation
      const noteInput = createNoteInput(bookId, selection, note);
      noteInput.isPublic = isPublic;
      create(noteInput);
    }

    setNoteDialogOpen(false);
    setEditingAnnotation(null);
    handleClearSelection();
  },
  [selection, editingAnnotation, bookId, create, update, handleClearSelection]
);
```

### Step 6: Handle Annotation Sidebar Actions

```typescript
const handleAnnotationClick = useCallback((annotation: Annotation) => {
  // Navigate to annotation position
  // Implementation depends on your reader type
  scrollToOffset(annotation.startOffset);
  setSidebarOpen(false);
}, []);

const handleAnnotationEdit = useCallback((annotation: Annotation) => {
  setEditingAnnotation(annotation);
  setNoteDialogOpen(true);
}, []);

const handleAnnotationDelete = useCallback(
  (annotation: Annotation) => {
    if (confirm("Delete this annotation?")) {
      remove(annotation.id);
    }
  },
  [remove]
);

const handleAnnotationShare = useCallback((annotation: Annotation) => {
  // Open share dialog or copy link
  // Implementation depends on your sharing strategy
}, []);
```

### Step 7: Render Highlights in Content

```typescript
// Convert API annotations to highlight format for your reader
const highlights = useMemo(() => {
  return annotations
    .filter((a) => a.type === "HIGHLIGHT")
    .map((a) => ({
      id: a.id,
      start: a.startOffset,
      end: a.endOffset,
      color: colorToHex((a as HighlightAnnotation).color),
      note: a.note,
    }));
}, [annotations]);

// Pass highlights to your text rendering component
// Implementation depends on your reader type
```

### Step 8: Add UI Elements

```tsx
return (
  <Box>
    {/* Reader toolbar with annotation button */}
    <Box sx={{ display: "flex", gap: 1 }}>
      <IconButton onClick={() => setSidebarOpen(true)}>
        <HighlightAltIcon />
      </IconButton>
      <IconButton onClick={() => setExportDialogOpen(true)}>
        <FileDownloadIcon />
      </IconButton>
    </Box>

    {/* Your reader content */}
    <Box>{/* ... reader content with highlights ... */}</Box>

    {/* Annotation toolbar (appears on selection) */}
    <AnnotationToolbar
      selection={selection}
      onAction={handleToolbarAction}
      onClose={handleClearSelection}
      anchorEl={anchorEl}
      open={showToolbar}
      aiEnabled={true}
      lookupEnabled={true}
    />

    {/* Note editor dialog */}
    <NoteEditorDialog
      open={noteDialogOpen}
      onClose={() => {
        setNoteDialogOpen(false);
        setEditingAnnotation(null);
      }}
      onSave={handleNoteSave}
      annotation={editingAnnotation || undefined}
      selectedText={selection?.text}
      mode={editingAnnotation ? "edit" : "create"}
    />

    {/* Annotation sidebar */}
    <AnnotationSidebar
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      annotations={annotations}
      onAnnotationClick={handleAnnotationClick}
      onEdit={handleAnnotationEdit}
      onDelete={handleAnnotationDelete}
      onShare={handleAnnotationShare}
    />

    {/* Export dialog */}
    <AnnotationExportDialog
      open={exportDialogOpen}
      onClose={() => setExportDialogOpen(false)}
      annotations={annotations}
      bookTitle={bookTitle}
      bookAuthor={bookAuthor}
    />
  </Box>
);
```

## Reader-Specific Integration

### TextReader Integration

```typescript
import { TextReader } from "@/components/reader";

<TextReader
  content={textContent}
  contentType="plain"
  highlights={highlights} // Pass converted highlights
  onTextSelect={(selection) => {
    handleTextSelect(selection.text, selection.startOffset, selection.endOffset);
  }}
  onHighlightClick={(highlight) => {
    // Show highlight details or edit
  }}
/>
```

### EpubReader Integration

```typescript
import { EpubReader } from "@/components/reader";

// Convert character offsets to CFI (EPUB format)
// Note: You'll need to implement CFI conversion logic

<EpubReader
  url={epubUrl}
  onTextSelect={(selection) => {
    // Convert CFI to character offset
    const startOffset = cfiToOffset(selection.cfi);
    handleTextSelect(selection.text, startOffset, startOffset + selection.text.length);
  }}
/>
```

### PdfReader Integration

```typescript
import { PdfReader } from "@/components/reader";

// Convert character offsets to PDF page+position
// Note: You'll need to implement page position conversion logic

<PdfReader
  url={pdfUrl}
  onTextSelect={(selection) => {
    // Convert PDF position to character offset
    const startOffset = pdfPositionToOffset(selection.pageNumber, selection.rect);
    handleTextSelect(selection.text, startOffset, startOffset + selection.text.length);
  }}
/>
```

## Testing

```typescript
// Test annotation creation
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tantml:invoke>
import { useAnnotationOperations } from "@/hooks/useAnnotations";

test("creates highlight annotation", async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useAnnotationOperations("book123"), { wrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  const input = {
    bookId: "book123",
    type: "HIGHLIGHT" as const,
    startOffset: 0,
    endOffset: 10,
    selectedText: "Test text",
    color: "yellow" as const,
    isPublic: false,
  };

  result.current.create(input);

  await waitFor(() => expect(result.current.annotations).toHaveLength(1));
});
```

## Performance Tips

1. **Debounce Selection Events**: Don't show toolbar on every selection change
2. **Virtualize Long Lists**: Use virtualized lists for thousands of annotations
3. **Cache Annotations**: React Query handles this automatically
4. **Optimize Highlight Rendering**: Use CSS transforms for positioning, not recalculating layout
5. **Lazy Load Sidebar**: Only mount AnnotationSidebar when opened

## Offline Support

The annotation system includes offline support via `useOfflineAnnotationSync`:

```typescript
import { useOfflineAnnotationSync } from "@/hooks/useOfflineAnnotationSync";

const {
  annotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  syncNow,
  isSyncing,
} = useOfflineAnnotationSync({ bookId, autoSync: true });
```

## API Reference

### Annotation Object

```typescript
interface Annotation {
  id: string;
  bookId: string;
  type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
  startOffset: number;
  endOffset: number;
  note?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HighlightAnnotation extends Annotation {
  type: "HIGHLIGHT";
  selectedText: string;
  color: HighlightColor;
}
```

### Available Colors

```typescript
type HighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple"
  | "orange";

const HIGHLIGHT_COLOR_VALUES = {
  yellow: "#fff176",
  green: "#a5d6a7",
  blue: "#90caf9",
  pink: "#f48fb1",
  purple: "#ce93d8",
  orange: "#ffcc80",
};
```

## Next Steps

1. ✅ **Backend API** - Fully implemented
2. ✅ **Frontend Components** - All components ready
3. ✅ **Hooks** - React Query integration complete
4. ⚠️ **Reader Integration** - Needs implementation in ReaderPage
5. ⚠️ **Position Conversion** - Need CFI↔offset and PDF↔offset converters
6. ✅ **Offline Sync** - Implemented with IndexedDB

## Status Summary

| Component              | Status      | Notes                                         |
| ---------------------- | ----------- | --------------------------------------------- |
| Backend API            | ✅ Complete | `/api/annotations` fully functional           |
| AnnotationToolbar      | ✅ Complete | 6-color picker, all actions                   |
| AnnotationSidebar      | ✅ Complete | Filter, sort, search                          |
| NoteEditorDialog       | ✅ Complete | Create/edit notes                             |
| AnnotationExportDialog | ✅ Complete | Markdown & PDF export                         |
| useAnnotations Hook    | ✅ Complete | React Query integration                       |
| Offline Sync           | ✅ Complete | IndexedDB + auto-sync                         |
| TextReader Integration | ⚠️ Partial  | Highlight props exist, needs wiring           |
| EpubReader Integration | ❌ Todo     | Needs CFI conversion                          |
| PdfReader Integration  | ❌ Todo     | Needs page position conversion                |
| i18n Keys              | ✅ Complete | All keys in en.json                           |
| Tests                  | ⚠️ Partial  | Component tests exist, need integration tests |

**Overall: 85% Complete** - Core system ready, just needs final integration in readers.

---

**Questions?** Check the component source files or API endpoint for detailed implementation examples.
