# Read Master - Coding Standards

## Project Overview

Read Master is an AI-powered reading comprehension platform that dramatically improves reading comprehension and retention through intelligent pre-reading guides, contextual support during reading, adaptive post-reading assessments, and spaced repetition review.

## ⚠️ CRITICAL: Cross-Platform Feature Parity

**ALL features MUST work across ALL platforms: Web, Desktop, and Mobile.**

### Platform Support

Read Master is available on:

- 🌐 **Web**: Browser-based responsive web app (React + Vite)
- 💻 **Desktop**: Electron app (macOS, Windows, Linux)
- 📱 **Mobile**: Native apps (iOS and Android via React Native or similar)

### Feature Parity Requirements

**When implementing ANY feature:**

1. ✅ **Implement for ALL platforms** - Web, Desktop, AND Mobile
   - A feature is NOT complete until it works on all three platforms
   - Test on all platforms before marking task as complete
   - If you implement reader annotations on web, you MUST implement on desktop and mobile too

2. ✅ **Maintain UI/UX consistency** across platforms
   - Same feature set available everywhere
   - Similar user experience with platform-appropriate adaptations
   - Use Material-UI (MUI) components that work responsively across platforms

3. ✅ **Platform-appropriate implementations are OK**
   - Mobile: Touch gestures, swipe navigation, bottom sheets
   - Desktop: Keyboard shortcuts, right-click menus, window management
   - Web: Responsive design that works on all screen sizes (320px-1920px+)
   - **BUT** the core functionality must be identical

4. ✅ **Data synchronization** is automatic
   - Books, reading progress, annotations, flashcards, settings sync in real-time
   - Backend API is platform-agnostic
   - Changes on one device immediately reflect on all other devices

5. ✅ **Offline support** on all platforms
   - PWA for web (service workers, IndexedDB)
   - Local storage for desktop (Electron)
   - Native storage for mobile
   - All platforms support offline reading with automatic sync when back online

### Development Workflow for New Features

```
Step 1: Design feature (consider all platforms)
Step 2: Implement backend API (platform-agnostic)
Step 3: Implement web version (responsive design)
Step 4: Implement desktop version (Electron adaptations)
Step 5: Implement mobile version (React Native/native adaptations)
Step 6: Test on ALL platforms
Step 7: Mark feature as complete ONLY when working everywhere
```

### Examples of Platform-Appropriate Adaptations

✅ **GOOD** (Same feature, different interaction):

- **Web/Desktop**: Click and drag to highlight text
- **Mobile**: Long press and drag to highlight text
- **Result**: All platforms support highlighting, just different gestures

✅ **GOOD** (Same feature, optimized UI):

- **Desktop**: Split-screen notes panel (horizontal)
- **Mobile**: Slide-up notes panel (bottom sheet)
- **Result**: Both platforms can view notes while reading

❌ **BAD** (Feature missing on a platform):

- **Web**: Has AI chat sidebar
- **Mobile**: No AI chat at all
- **Problem**: Feature parity broken, mobile users missing functionality

### When Platform Limitations Exist

If a technical limitation prevents implementing a feature on a specific platform:

1. **Document it prominently** in the code and specifications
2. **Provide an alternative** that achieves the same goal
3. **Escalate to project lead** for approval
4. **Update PRD** to reflect the platform-specific behavior

**Default stance: If we can't implement it everywhere, we need to seriously question if it belongs in the app.**

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Material-UI (MUI)
- **Backend**: Vercel Serverless Functions + TypeScript
- **Database**: Prisma ORM + Vercel Postgres
- **Cache**: Upstash Redis
- **Auth**: Clerk
- **AI**: Vercel AI SDK with Anthropic Claude
- **State**: React Query (server) + Zustand (client)
- **Storage**: Cloudflare R2 (book files, audio files)
- **Text Rendering**: epub.js (EPUB), PDF.js (PDF)
- **i18n**: i18next (internationalization)

## Project Structure

```
read-master/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── reader/     # Reading interface components
│   │   │   │   ├── library/    # Library management
│   │   │   │   ├── srs/        # Flashcard/SRS components
│   │   │   │   ├── social/     # Social features
│   │   │   │   ├── forum/      # Forum components
│   │   │   │   ├── common/     # Shared components (< 200 lines each)
│   │   │   │   └── layout/     # Layout components
│   │   │   ├── pages/          # Route pages (< 300 lines each)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── utils/          # Utility functions
│   │   │   ├── stores/         # Zustand stores
│   │   │   └── locales/        # i18n translation files
│   │   └── public/
│   └── api/                    # Vercel serverless functions
│       └── src/
│           ├── routes/
│           ├── middleware/
│           ├── services/
│           └── utils/
├── packages/
│   ├── database/               # Prisma ORM setup
│   ├── shared/                 # Shared types and Zod schemas
│   ├── ai/                     # Claude prompt templates
│   └── config/                 # ESLint, Prettier, TypeScript configs
├── scripts/
└── docs/
```

## Coding Rules

### TypeScript

1. Always use TypeScript with strict mode enabled
2. Prefer `type` over `interface` unless extending
3. Use `unknown` over `any` - if `any` is necessary, add a comment explaining why
4. All function parameters and return types must be explicitly typed
5. Use `as const` assertions for literal types

### Modularity & Component Architecture

1. **File Size Limits**: Keep files focused and maintainable
   - Pages: Target **< 300 lines**, maximum 500 lines
   - Components: Target **< 200 lines**, maximum 300 lines
   - Utilities: Target **< 150 lines**, maximum 200 lines
   - If a file exceeds these limits, extract components or utilities

2. **Component Extraction**: Break down large components
   - Extract dialog/modal components to separate files
   - Extract repeated UI patterns (filters, lists, cards)
   - Extract view-specific components (ReaderView, LibraryView, etc.)
   - Create component folders for related components (e.g., `components/reader/`)

3. **Utility Extraction**: Keep logic separate
   - Extract filter/sort functions to `utils/` folder
   - Extract validation logic to separate files
   - Extract data transformation functions
   - Export types alongside utility functions

4. **Single Responsibility**: Each file should have one clear purpose
   - Pages orchestrate components and handle routing
   - Components render UI and handle user interaction
   - Hooks manage state and side effects
   - Utils provide pure functions for data manipulation

5. **Co-location**: Group related files together
   - Keep component-specific types in the same file or adjacent `.types.ts`
   - Keep component-specific hooks in a `hooks/` subfolder
   - Keep component-specific utils in a `utils/` subfolder

6. **Prefer Composition Over Large Files**
   - Build complex UIs by composing smaller components
   - Use children props and component composition patterns
   - Extract repeated JSX patterns into reusable components

### ESLint

1. Fix ESLint errors and warnings before committing rather than ignoring them with `// eslint-disable-next-line`.

### Imports

1. Use workspace imports: `@read-master/shared`, `@read-master/database`, `@read-master/ai`
2. Use path aliases: `@/components`, `@/lib`, `@/hooks`
3. Group imports: external, workspace, relative (with blank lines between)
4. Use type-only imports: `import type { User } from '@read-master/shared'`

### API & Validation

1. Use Zod for ALL API request/response validation
2. Define schemas in `packages/shared/src/schemas`
3. Never trust client input - always validate on the server
4. Return consistent error responses with proper HTTP status codes

### Content Moderation (Public Features Only)

For user-generated content that is **publicly visible** (forum posts, reading group discussions, public profiles, curriculum titles/descriptions):

1. **Basic profanity filtering** should be applied
2. **Implementation pattern**:

   ```typescript
   // Zod schema validation
   const Schema = z.object({
     content: z
       .string()
       .min(1)
       .max(5000)
       .refine(
         (val) => !containsProfanity(val),
         "Content contains inappropriate language"
       ),
   });

   // Backend validation
   import { validateFieldsNoProfanity } from "@read-master/shared/utils";
   const check = validateFieldsNoProfanity([
     { value: data.content, name: "Content" },
   ]);
   if (!check.valid) {
     return res.status(400).json({ error: check.errors[0] });
   }
   ```

3. **What needs filtering**:
   - ✅ Forum posts and replies
   - ✅ Reading group names and descriptions
   - ✅ Public profile bios and display names
   - ✅ Curriculum titles and descriptions (public ones)
   - ❌ Private annotations/notes (user's own content)
   - ❌ Book content (copyrighted/imported material)

### Database

1. All queries must handle soft deletes: `WHERE deletedAt IS NULL`
2. Store all dates in UTC
3. Use transactions for multi-table operations
4. Always use parameterized queries (Prisma handles this)
5. **ALWAYS update seed data when modifying schema** (see below)

#### Seed Data Requirements

**CRITICAL: All schema changes MUST include corresponding seed data updates.**

Location: `packages/database/prisma/seed.ts`

**When to update seed data:**

1. **Adding a new model** → Add multiple seed records (at least 3-5 examples)
2. **Adding a required field** → Update ALL existing seed records with the new field
3. **Adding an enum** → Include examples using all enum values
4. **Adding a relationship** → Ensure related records exist in seed data
5. **Modifying constraints** → Verify seed data respects new constraints
6. **Adding indexes or unique constraints** → Ensure seed data doesn't violate them

**What to include in seed data:**

- ✅ **Realistic data**: Use real-world examples, not "test1", "test2"
- ✅ **Edge cases**: Empty strings, nulls (where allowed), min/max values, boundary conditions
- ✅ **Relationships**: Fully populate foreign keys and related records
- ✅ **All tiers**: Include users and data for Free, Pro, and Scholar tiers
- ✅ **All states**: Include records in various states (active, completed, deleted, etc.)
- ✅ **Permissions**: Cover all user roles and permission levels
- ✅ **Timestamps**: Use varied dates (recent, old, future where applicable)
- ✅ **Test coverage**: Ensure data supports all test scenarios

**Example: Adding a new model**

```typescript
// ❌ BAD - Minimal seed data
await prisma.book.create({
  data: { title: "Test Book", userId: user1.id },
});

// ✅ GOOD - Comprehensive seed data
const books = await Promise.all([
  // Book in various states
  prisma.book.create({
    data: {
      title: "1984",
      author: "George Orwell",
      status: "COMPLETED",
      genre: "FICTION",
      pageCount: 328,
      userId: user1.id,
      completedAt: new Date("2024-01-15"),
    },
  }),
  prisma.book.create({
    data: {
      title: "Sapiens",
      author: "Yuval Noah Harari",
      status: "READING",
      genre: "NON_FICTION",
      pageCount: 443,
      currentPage: 127,
      userId: user1.id,
    },
  }),
  prisma.book.create({
    data: {
      title: "The Pragmatic Programmer",
      author: "Hunt & Thomas",
      status: "WANT_TO_READ",
      genre: "TECHNICAL",
      pageCount: 352,
      userId: user2.id,
    },
  }),
]);
```

**Why this matters:**

- 🔧 **Development**: Developers get realistic data immediately after `pnpm db:seed`
- 🧪 **Testing**: Tests run against consistent, realistic data
- 👥 **Onboarding**: New team members see working examples instantly
- 🎭 **Demos**: Preview/staging environments have professional-looking data
- 🐛 **Bug prevention**: Catches constraint violations and edge cases early
- 📊 **Data relationships**: Ensures all foreign keys and relations work correctly

**Enforcement:**

- Run `pnpm db:seed` after every schema change
- Verify seed script runs without errors
- Check that seed data appears correctly in database
- Update seed tests if they exist
- Document any special seed data requirements in code comments

### State Management

1. Use React Query for all server state (books, progress, assessments, etc.)
2. Use Zustand for client-only state (UI state, reading preferences, theme)
3. Never use localStorage for critical data (serverless is stateless)
4. Invalidate queries after mutations

### AI Integration

1. Log all AI usage with tokens and cost in AIUsageLog table
2. Use prompt templates from `packages/ai/src/prompts`
3. Handle rate limits and retry with exponential backoff
4. Always stream responses for better UX
5. Respect user's AI preferences (can disable AI globally or per-book)
6. AI operations to track:
   - Pre-reading guide generation
   - During-reading explanations ("Explain this" feature)
   - Post-reading assessment generation
   - Flashcard generation
   - Assessment grading (short answers, summaries)

### File Storage (Cloudflare R2)

1. Store uploaded books in R2 (PDFs, EPUBs, DOCs)
2. Store generated audio files (TTS downloads) in R2
3. Use signed URLs for secure downloads
4. Implement file size limits (50MB max per upload)
5. Clean up orphaned files (files without database references)
6. Namespace by user: `users/{userId}/books/{bookId}.pdf`

### Reading Interface Considerations

1. **Text Rendering**: Use epub.js for EPUB, PDF.js for PDF
2. **Progress Tracking**: Update reading position frequently but batch writes
3. **Offline Support**: Use Service Workers and IndexedDB for offline reading
4. **Annotations**: Store position as character offset for portability
5. **Performance**: Virtualize long documents to prevent memory issues
6. **Accessibility**: Ensure screen reader compatibility with reading interface

### Spaced Repetition System (SRS)

1. Implement SM-2 algorithm for card scheduling
2. Update card intervals on review (Again, Hard, Good, Easy)
3. Generate daily review queue efficiently
4. Auto-generate cards from reading (vocabulary, concepts, comprehension)
5. Allow manual card creation and editing

### Styling

1. Use MUI components exclusively
2. Use `sx` prop for component-specific styles
3. Use theme tokens for colors, spacing, typography
4. Support multiple themes: Light, Dark, Sepia, High Contrast
5. Support dyslexia-friendly fonts (OpenDyslexic)
6. No inline styles or custom CSS unless absolutely necessary

### Internationalization (i18n)

1. Use i18next for all UI strings
2. Never hardcode user-facing text
3. Support RTL layouts for Arabic
4. Supported languages: English, Arabic, Spanish, Japanese, Chinese (Simplified), Tagalog
5. Format dates/times/numbers according to locale
6. AI responses should be in user's preferred language

### Logging & Errors

1. No `console.log` in committed code - use Winston logger
2. Create audit logs for important actions (book uploads, settings changes)
3. Handle errors gracefully with user-friendly messages
4. Log errors with context (userId, requestId, operation)
5. Track AI usage for cost monitoring and quota enforcement

### Testing

**CRITICAL: All development MUST include tests. Tests validate functionality, not the other way around.**

#### Test-First Development Principles

1. **ALL new features require tests** - No exceptions
   - New utility functions → Write tests first, then implementation
   - New API endpoints → Write tests to validate behavior
   - New components (when testable) → Write tests for critical logic
   - Bug fixes → Write a failing test first, then fix the bug

2. **Tests must validate ACTUAL functionality**
   - ❌ **NEVER** write tests that pass for non-functional code
   - ❌ **NEVER** mock away the actual logic being tested
   - ❌ **NEVER** write tests just to increase coverage numbers
   - ✅ Tests should fail when the feature is broken
   - ✅ Tests should pass only when the feature works correctly
   - ✅ If a test passes but the feature is broken, the test is wrong

3. **Fix features to pass tests, not tests to pass features**
   - When tests fail, fix the implementation (not the test)
   - When behavior changes, update tests to match new requirements
   - Tests are the source of truth for expected behavior

4. **Always run tests before considering work complete**

   ```bash
   # Frontend tests
   cd apps/web && pnpm vitest run

   # Backend tests (when applicable)
   cd apps/api && pnpm test
   ```

   - All tests must pass before committing
   - If tests fail, investigate and fix the root cause
   - Never commit with failing tests or disable tests to make CI pass

#### Testing Standards

1. **Use Vitest** for all frontend tests
2. **Test Coverage Requirements**:
   - **Utility functions**: 100% coverage (all functions must be tested)
   - **API routes**: Test all endpoints with various input scenarios
   - **Stores**: Test state management logic
   - **Critical business logic**: Minimum 80% coverage
   - **Reading algorithms** (SRS, progress tracking, WPM calculation): 100% coverage
   - **Components**: Test critical rendering and interaction logic

3. **Test Quality Over Quantity**
   - Write meaningful assertions that validate actual behavior
   - Test edge cases and error conditions (empty books, invalid formats, etc.)
   - Test integration between related functions
   - Use descriptive test names: `should calculate reading speed correctly`

4. **What to Test**:
   - ✅ All utility functions in `apps/web/src/utils/`
   - ✅ All Zustand stores in `apps/web/src/stores/`
   - ✅ SRS algorithm implementation
   - ✅ Reading progress calculations
   - ✅ Assessment scoring logic
   - ✅ Complex hooks with business logic
   - ✅ API endpoints and validation logic
   - ✅ Data transformation and filtering functions
   - ⚠️ Complex components (when feasible without excessive mocking)

5. **What NOT to Test**:
   - ❌ Third-party library internals (React Query, MUI, epub.js, etc.)
   - ❌ Simple pass-through components with no logic
   - ❌ Type definitions alone (TypeScript handles this)

#### Test File Organization

- Place tests next to source files: `utils/srs.ts` → `utils/srs.test.ts`
- Export types and functions needed for testing
- Use `describe` blocks to group related tests
- Use `beforeEach` to reset state between tests

#### Pre-Commit Checklist

Before committing any code:

1. ✅ All new functions have tests
2. ✅ Run `pnpm vitest run` - all tests pass
3. ✅ Run `pnpm typecheck` - no type errors
4. ✅ Run `pnpm lint` - no linting errors
5. ✅ Manually verify feature works in browser/API
6. ✅ Update `PROGRESS.md` with completed work

### Git & Commits

1. Pre-commit hook runs: lint, format check, typecheck
2. No `console.log` statements allowed in commits
3. Use conventional commits: `feat:`, `fix:`, `chore:`, etc.
4. Keep PRs small and focused

#### CRITICAL: Commit Validation Rules

**NEVER use `--no-verify` to bypass pre-commit hooks unless explicitly instructed by the user.**

When a commit fails due to pre-commit hooks, you MUST:

1. **Fix all errors before attempting to commit again**:
   - ❌ **NEVER** use `git commit --no-verify` to bypass checks
   - ❌ **NEVER** disable or skip pre-commit hooks
   - ❌ **NEVER** commit with failing tests, lint errors, or type errors
   - ✅ Investigate and fix the root cause of each error
   - ✅ Re-run the commit only after all issues are resolved

2. **Error Resolution Priority**:
   - **Type errors**: Fix TypeScript errors in the code (run `pnpm typecheck` to verify)
   - **Lint errors**: Fix ESLint errors (run `pnpm lint` to verify)
   - **Test failures**: Fix failing tests (run `pnpm vitest run` to verify)
   - **Format issues**: Run `pnpm format` to auto-fix formatting

3. **If errors seem unrelated to your changes**:
   - Still fix them before committing
   - If the errors are in files you didn't modify, fix them anyway or notify the user
   - Pre-existing errors in the codebase should be fixed, not bypassed

4. **Only bypass hooks when explicitly told**:
   - The user must explicitly say "use --no-verify" or "skip pre-commit hooks"
   - Document why the bypass was necessary in the commit message
   - This should be extremely rare and only for exceptional circumstances

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `ReaderView.tsx`, `BookCard.tsx`)
- Component Folders: `camelCase/` for feature-specific components (e.g., `components/reader/`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useReadingProgress.ts`)
- Utilities: `camelCase.ts` (e.g., `srsAlgorithm.ts`, `textParser.ts`)
- Types: `camelCase.ts` or co-located in `.types.ts`
- Tests: `*.test.ts` or `*.spec.ts`
- Index files: Always include `index.ts` for clean exports from folders

## Documentation

### Core Documents (Root Directory)

- **[docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md)** - Complete product requirements and feature specifications
- **[PROGRESS.md](PROGRESS.md)** - Comprehensive progress tracking (update as you work)
- **[README.md](README.md)** - Project overview and getting started guide
- **[AGENTS.md](AGENTS.md)** - AI agent configuration
- **This file (CLAUDE.md)** - Coding standards for AI assistants

### Feature Documentation ([docs/](docs/) Directory)

- **[docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md)** - Complete product specification
- **[docs/RALPH_PROMTS.md](docs/RALPH_PROMTS.md)** - Prompts for Ralph (AI agent workflow)

### Before Starting Work

1. Review [PROGRESS.md](PROGRESS.md) for feature status
2. Review [docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md) for feature requirements
3. Check the database schema in SPECIFICATIONS.md for data models
4. Follow coding standards in this file (CLAUDE.md)
5. Understand the tech stack and architecture

### After Completing Work

1. Ensure all tests pass (`pnpm vitest run`)
2. Verify linting and type checking pass
3. Test the feature manually in browser/API
4. Update documentation if you added new features or changed behavior
5. Suggest new work in `PROGRESS.md` including high-impact, high-value features, and test coverage

## Accessibility (WCAG 2.2 AAA Target)

1. Use semantic HTML elements
2. Provide ARIA labels and roles where needed
3. Ensure keyboard navigation works for all features
4. Maintain 7:1 contrast ratio for text (AAA standard)
5. Support screen readers throughout the reading interface
6. Provide dyslexia-friendly font options (OpenDyslexic)
7. Support reduced motion preferences
8. Ensure touch targets are at least 44x44px
9. Provide skip navigation links
10. Test with actual screen readers (NVDA, JAWS, VoiceOver)

## Privacy & Security

1. All user reading data is private by default
2. Encrypt data at rest and in transit
3. Implement GDPR data export and deletion
4. Only store copyrighted content for personal use (fair use)
5. Respect user privacy settings for social features
6. Never share user reading activity without explicit consent
7. Implement proper authentication with Clerk
8. Use signed URLs for R2 file access
9. Rate limit API endpoints to prevent abuse
10. Validate all file uploads (type, size, content)

## Common Patterns

### Reading Progress Updates

```typescript
// Batch updates to avoid excessive writes
const useReadingProgress = () => {
  const debouncedUpdate = useDebouncedCallback(
    async (bookId: string, position: number) => {
      await updateReadingProgress({ bookId, position });
    },
    2000 // Update every 2 seconds
  );

  return { updateProgress: debouncedUpdate };
};
```

### AI Feature with User Preference Check

```typescript
// Always check if AI is enabled before calling
const generatePreReadingGuide = async (bookId: string) => {
  const user = await getCurrentUser();
  const book = await getBook(bookId);

  if (!user.aiEnabled || book.aiDisabled) {
    throw new Error("AI features are disabled");
  }

  // Proceed with AI generation
  const guide = await ai.generateGuide(book);

  // Log usage
  await logAIUsage({
    userId: user.id,
    operation: "pre_reading_guide",
    tokens: guide.usage.totalTokens,
    cost: calculateCost(guide.usage),
  });

  return guide;
};
```

### Proper Error Handling

```typescript
try {
  const result = await someOperation();
  return res.status(200).json({ data: result });
} catch (error) {
  logger.error("Operation failed", {
    userId: req.userId,
    error: error.message,
    stack: error.stack,
  });

  return res.status(500).json({
    error: "Failed to complete operation",
    message: getPublicErrorMessage(error),
  });
}
```

## Development Workflow

1. **Start with specs**: Read the acceptance criteria in SPECIFICATIONS.md
2. **Write tests first**: Define expected behavior with tests
3. **Implement feature**: Write code to pass the tests
4. **Manual testing**: Verify in browser/API
5. **Code review**: Check against these standards
6. **Commit**: Ensure all checks pass
7. **Document**: Update docs if needed

## Performance Considerations

1. **Large Books**: Virtualize text rendering for books >100k words
2. **Images**: Lazy load book covers and user avatars
3. **API Calls**: Cache frequently accessed data in Redis
4. **Offline**: Pre-cache essential data in Service Worker
5. **Bundle Size**: Code-split by route, lazy load heavy dependencies (epub.js, PDF.js)
6. **Database**: Index frequently queried fields (userId, bookId, dueDate for SRS)
7. **R2 Storage**: Use CDN for frequently accessed files

## Common Pitfalls to Avoid

1. ❌ Don't store book content in Postgres (use R2)
2. ❌ Don't generate flashcards for every sentence (be selective)
3. ❌ Don't update reading progress on every scroll event (debounce/throttle)
4. ❌ Don't load entire book into memory (stream/paginate)
5. ❌ Don't ignore user's AI preferences
6. ❌ Don't forget to handle file upload errors gracefully
7. ❌ Don't skip soft delete checks in queries
8. ❌ Don't use relative dates for SRS (always UTC timestamps)
9. ❌ Don't expose internal error details to users
10. ❌ Don't forget to invalidate React Query caches after mutations
