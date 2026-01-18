# Frontend Tasks Template - Add to prd.json

Use this template to extend the PRD with frontend tasks. Copy these structures into prd.json following the same pattern.

## Phase 5A: Frontend Foundation (~15 tasks)

```json
{
  "id": "fe-app-001",
  "category": "frontend-foundation",
  "phase": "5a-app-shell",
  "priority": "critical",
  "description": "Set up MUI theme with light/dark modes and high contrast",
  "steps": [
    "Create theme configuration file",
    "Define color palettes for light/dark/high-contrast",
    "Configure typography scale",
    "Set up ThemeProvider in App",
    "Create theme toggle component",
    "Test all three modes work",
    "Verify WCAG AAA contrast ratios (7:1)"
  ],
  "acceptance_criteria": [
    "Three theme modes available",
    "High contrast mode meets WCAG AAA",
    "Theme toggle works correctly",
    "Tests verify contrast ratios"
  ],
  "passes": false
},
{
  "id": "fe-app-002",
  "category": "frontend-foundation",
  "phase": "5a-app-shell",
  "priority": "critical",
  "description": "Configure React Router with all routes and layouts",
  "steps": [
    "Install and configure React Router",
    "Define all routes from spec",
    "Create MainLayout (sidebar, header)",
    "Create ReaderLayout (minimal)",
    "Set up protected routes with Clerk",
    "Add 404 page",
    "Test navigation works"
  ],
  "acceptance_criteria": [
    "All routes from spec are defined",
    "Layouts render correctly",
    "Protected routes require authentication",
    "Navigation works"
  ],
  "passes": false
},
{
  "id": "fe-app-003",
  "category": "frontend-foundation",
  "phase": "5a-app-shell",
  "priority": "critical",
  "description": "Integrate Clerk authentication with sign-in/sign-up UI",
  "steps": [
    "Set up ClerkProvider",
    "Create sign-in page",
    "Create sign-up page",
    "Configure OAuth (Google, Apple)",
    "Test authentication flow",
    "Test protected routes"
  ],
  "acceptance_criteria": [
    "Sign up/in works with email",
    "OAuth works",
    "Protected routes redirect to sign-in",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-app-004",
  "category": "frontend-foundation",
  "phase": "5a-app-shell",
  "priority": "high",
  "description": "Set up React Query with proper configuration",
  "steps": [
    "Configure QueryClient with defaults",
    "Set up QueryClientProvider",
    "Add React Query DevTools (dev only)",
    "Create example query hook",
    "Test query invalidation works"
  ],
  "acceptance_criteria": [
    "React Query is configured",
    "DevTools work in development",
    "Query hooks work correctly"
  ],
  "passes": false
},
{
  "id": "fe-app-005",
  "category": "frontend-foundation",
  "phase": "5a-app-shell",
  "priority": "high",
  "description": "Create Zustand stores for UI and reader state",
  "steps": [
    "Create stores/uiStore.ts (theme, sidebar, language)",
    "Create stores/readerStore.ts (current book, position, settings)",
    "Implement persistence with localStorage",
    "Write tests for store actions",
    "Document store usage"
  ],
  "acceptance_criteria": [
    "Both stores are functional",
    "State persists across sessions",
    "Tests achieve 100% coverage"
  ],
  "passes": false
}
```

## Phase 5B: Library UI (~10 tasks)

```json
{
  "id": "fe-lib-001",
  "category": "frontend-library",
  "phase": "5b-library-ui",
  "priority": "high",
  "description": "Create Library page with grid/list view toggle",
  "steps": [
    "Create LibraryPage component",
    "Implement grid and list view layouts",
    "Add view toggle button",
    "Make responsive",
    "Add empty state",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Both views render correctly",
    "Toggle works",
    "Responsive on mobile/tablet/desktop",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-lib-002",
  "category": "frontend-library",
  "phase": "5b-library-ui",
  "priority": "high",
  "description": "Create BookCard component with progress and actions",
  "steps": [
    "Create BookCard component",
    "Display cover, title, author",
    "Show progress bar",
    "Add status badge",
    "Add quick actions (read, delete)",
    "Style hover/focus states",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Card displays all info",
    "Progress bar shows correctly",
    "Actions work",
    "Accessible with keyboard",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-lib-003",
  "category": "frontend-library",
  "phase": "5b-library-ui",
  "priority": "high",
  "description": "Create AddBookModal with tabs for upload/URL/paste/search",
  "steps": [
    "Create AddBookModal component",
    "Implement tab navigation",
    "Create upload tab with drag-and-drop",
    "Create URL import tab",
    "Create paste text tab",
    "Create search tab (Google Books + Open Library)",
    "Add validation and error handling",
    "Show loading states",
    "Write tests"
  ],
  "acceptance_criteria": [
    "All tabs function correctly",
    "File upload works (all formats)",
    "Search returns results",
    "Error handling works",
    "Tests pass"
  ],
  "passes": false
}
```

## Phase 5C: Reader Interface (~15 tasks)

```json
{
  "id": "fe-reader-001",
  "category": "frontend-reader",
  "phase": "5c-reader-ui",
  "priority": "critical",
  "description": "Integrate epub.js for EPUB rendering",
  "steps": [
    "Install and configure epub.js",
    "Create EpubReader component",
    "Implement page navigation",
    "Handle text selection",
    "Sync reading position",
    "Make responsive",
    "Write tests"
  ],
  "acceptance_criteria": [
    "EPUB files render correctly",
    "Navigation works (prev/next)",
    "Position is tracked",
    "Responsive layout",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-reader-002",
  "category": "frontend-reader",
  "phase": "5c-reader-ui",
  "priority": "critical",
  "description": "Integrate PDF.js for PDF rendering",
  "steps": [
    "Install and configure PDF.js",
    "Create PdfReader component",
    "Implement page navigation",
    "Add zoom controls",
    "Handle text selection",
    "Make responsive",
    "Write tests"
  ],
  "acceptance_criteria": [
    "PDF files render correctly",
    "Navigation and zoom work",
    "Text selection works",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-reader-003",
  "category": "frontend-reader",
  "phase": "5c-reader-ui",
  "priority": "high",
  "description": "Create ReaderSettings panel with typography controls",
  "steps": [
    "Create ReaderSettings component",
    "Add font family selector (including OpenDyslexic)",
    "Add font size slider",
    "Add line height control",
    "Add theme selector (light/dark/sepia/high-contrast)",
    "Apply settings in real-time",
    "Persist settings to store",
    "Write tests"
  ],
  "acceptance_criteria": [
    "All controls work",
    "Settings apply immediately",
    "Settings persist",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-reader-004",
  "category": "frontend-reader",
  "phase": "5c-reader-ui",
  "priority": "high",
  "description": "Implement annotation system (highlights, notes, bookmarks)",
  "steps": [
    "Create AnnotationLayer component",
    "Handle text selection",
    "Show annotation context menu",
    "Implement highlight creation with color picker",
    "Implement note creation",
    "Implement bookmark toggle",
    "Save annotations to API",
    "Display existing annotations",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Can create all annotation types",
    "Annotations save correctly",
    "Existing annotations display",
    "Context menu works",
    "Tests pass"
  ],
  "passes": false
}
```

## Phase 5D: TTS UI (~5 tasks)

```json
{
  "id": "fe-tts-001",
  "category": "frontend-tts",
  "phase": "5d-tts-ui",
  "priority": "high",
  "description": "Create TTS controls in reader toolbar",
  "steps": [
    "Create TTSControls component",
    "Add play/pause/stop buttons",
    "Add speed control (0.5x - 3x)",
    "Add voice selector dropdown",
    "Add volume control",
    "Test with all three tiers",
    "Write tests"
  ],
  "acceptance_criteria": [
    "All controls work",
    "Speed adjustment works",
    "Voice selection works per tier",
    "Tests pass for all tiers"
  ],
  "passes": false
}
```

## Phase 5E: AI Features UI (~8 tasks)

```json
{
  "id": "fe-ai-001",
  "category": "frontend-ai",
  "phase": "5e-ai-ui",
  "priority": "high",
  "description": "Create PreReadingGuideView component",
  "steps": [
    "Create PreReadingGuideView component",
    "Display all guide sections (vocabulary, arguments, context, themes)",
    "Make sections collapsible",
    "Add 'Generate Guide' button",
    "Add 'Regenerate' button",
    "Show loading state with progress",
    "Handle AI disabled state",
    "Write tests"
  ],
  "acceptance_criteria": [
    "All sections display correctly",
    "Generation works with streaming",
    "Loading states work",
    "Tests pass"
  ],
  "passes": false
},
{
  "id": "fe-ai-002",
  "category": "frontend-ai",
  "phase": "5e-ai-ui",
  "priority": "high",
  "description": "Create AI Assistant chat panel with streaming responses",
  "steps": [
    "Create AIAssistantPanel component",
    "Implement chat interface",
    "Handle streaming AI responses",
    "Add quick action buttons",
    "Show message history",
    "Add clear conversation button",
    "Make context-aware (knows current book/position)",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Chat works with streaming",
    "Quick actions work",
    "Context is maintained",
    "Tests pass"
  ],
  "passes": false
}
```

## Phase 5F: SRS Flashcards UI (~8 tasks)

```json
{
  "id": "fe-srs-001",
  "category": "frontend-srs",
  "phase": "5f-srs-ui",
  "priority": "high",
  "description": "Create flashcard review session with flip animation",
  "steps": [
    "Create ReviewSession component",
    "Implement card flip animation",
    "Add rating buttons (1-4)",
    "Show progress bar",
    "Track session stats",
    "Add keyboard shortcuts (1-4, space to flip)",
    "Show celebration on completion",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Flip animation works smoothly",
    "All ratings work",
    "Keyboard shortcuts work",
    "Respects reduced motion preference",
    "Tests pass"
  ],
  "passes": false
}
```

## Phase 5G-5K: Social, Forum, Curriculums, Analytics, Settings

Continue this pattern for remaining frontend features:
- **5G**: Social profiles, follow/unfollow, groups
- **5H**: Forum UI (categories, posts, replies, voting)
- **5I**: Curriculum builder with drag-and-drop
- **5J**: Analytics dashboard with customizable widgets
- **5K**: Settings pages with full accessibility

Each section needs ~8-12 tasks.

## Template for Adding Tasks

```json
{
  "id": "UNIQUE-ID",
  "category": "frontend-[section]",
  "phase": "5[letter]-[phase-name]",
  "priority": "critical|high|medium|low",
  "description": "Clear description of what to build",
  "steps": [
    "Concrete step 1",
    "Concrete step 2",
    "Make responsive",
    "Add accessibility features",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Feature works correctly",
    "Responsive on all screen sizes",
    "Keyboard accessible",
    "Tests achieve good coverage",
    "Meets WCAG 2.2 AAA standards"
  ],
  "passes": false
}
```

## Adding to prd.json

1. Open prd.json
2. Find the closing of the last task (currently `api-cron-001`)
3. Add a comma after the closing `}`
4. Paste your new tasks
5. Close the tasks array with `]` and object with `}`
6. Validate JSON: `cat prd.json | jq`

## Remember

- **One feature per task** - Keep it small
- **Explicit acceptance criteria** - Ralph needs to verify
- **Always include tests** - Non-negotiable
- **Accessibility is required** - Not optional
- **Responsive by default** - Mobile-first

## Estimated Frontend Task Count

- **5A: App Shell** (~15 tasks)
- **5B: Library UI** (~10 tasks)
- **5C: Reader Interface** (~15 tasks)
- **5D: TTS UI** (~5 tasks)
- **5E: AI Features UI** (~8 tasks)
- **5F: SRS UI** (~8 tasks)
- **5G: Social UI** (~10 tasks)
- **5H: Forum UI** (~10 tasks)
- **5I: Curriculum UI** (~8 tasks)
- **5J: Analytics UI** (~8 tasks)
- **5K: Settings UI** (~8 tasks)

**Total Frontend: ~105 tasks**

Plus:
- **Phase 6 (PWA)**: ~10 tasks
- **Phase 7 (Testing)**: ~20 tasks
- **Phase 8 (Deployment)**: ~10 tasks

**Grand Total: ~245 tasks for complete project**

## Quick Add Script

```bash
#!/bin/bash
# quick-add-task.sh - Helper to add a task to prd.json

cat >> prd_new_task.json << 'EOF'
{
  "id": "fe-new-001",
  "category": "frontend-example",
  "phase": "5a-example",
  "priority": "high",
  "description": "Example task description",
  "steps": [
    "Step 1",
    "Step 2",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Works correctly",
    "Tests pass"
  ],
  "passes": false
}
EOF

echo "Edit prd_new_task.json, then manually add to prd.json"
```

Good luck extending the PRD! 🚀
