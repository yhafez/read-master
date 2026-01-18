# Read Master - Ralph Wiggum Build Prompts

Optimized prompt sequence for autonomous development with your custom Ralph loop script.

---

## Pre-Setup: Project Initialization

Before running Ralph loops, manually create your project folder and initialize:

```bash
mkdir read-master
cd read-master
git init
```

Create `AGENTS.md` in project root with project context (Ralph will update this with learnings).

---

## Phase 1: Infrastructure Setup

### Prompt 1A - Project Scaffolding

```
<task>
Create a pnpm monorepo for Read Master, an AI-powered reading comprehension platform.

PROJECT STRUCTURE:
read-master/
├── apps/
│   ├── web/              # React + Vite + TypeScript
│   └── api/              # Vercel serverless functions
├── packages/
│   ├── database/         # Prisma ORM
│   ├── shared/           # Types, Zod schemas, utils
│   ├── ai/               # AI prompt templates
│   └── config/           # Shared ESLint, Prettier, TS configs
├── scripts/
├── .env.example
├── vercel.json
├── pnpm-workspace.yaml
└── package.json

TECH STACK:
Frontend: React 18, Vite, TypeScript, MUI, Zustand, React Query, React Hook Form, i18next, epub.js, pdf.js
Backend: Vercel Serverless, TypeScript, Zod, Winston
Database: Prisma, Vercel Postgres (Neon), Upstash Redis
Auth: Clerk
AI: Vercel AI SDK, Anthropic Claude
Storage: Cloudflare R2
TTS: Web Speech API, OpenAI TTS, ElevenLabs

REQUIREMENTS:
1. Create all package.json files with dependencies
2. Set up pnpm workspaces
3. Configure TypeScript strict mode
4. Set up ESLint + Prettier
5. Configure Husky pre-commit hooks
6. Create vercel.json with cron jobs
7. Create comprehensive .env.example
8. Set up i18next with locales for: en, ar, es, ja, zh, tl
9. Run pnpm install
10. Verify build works

ACCEPTANCE CRITERIA:
- pnpm install succeeds
- pnpm dev starts both apps
- pnpm lint passes
- pnpm build succeeds
- TypeScript has no errors
</task>

<completion_promise>PHASE1A_DONE</completion_promise>
```

---

## Phase 2: Database Schema

### Prompt 2A - Prisma Schema

```
<task>
Create the complete Prisma schema for Read Master in packages/database/prisma/schema.prisma.

MODELS REQUIRED:

USER & AUTH:
- User (id, clerkId, email, username, displayName, avatar, bio, language, timezone, readingLevel, preferences JSON, isPublic, aiEnabled, timestamps, softDelete)

CONTENT:
- Book (id, userId, title, author, description, coverImage, source enum, sourceId, sourceUrl, filePath, fileType enum, language, wordCount, estimatedReadTime, lexileScore, genre, tags[], status enum, isPublic, timestamps, softDelete)
- Chapter (id, bookId, title, orderIndex, startPosition, endPosition, wordCount)

READING:
- ReadingProgress (id, userId, bookId, currentPosition, percentage, totalReadTime, lastReadAt, startedAt, completedAt) - unique on userId+bookId
- Annotation (id, userId, bookId, type enum, startOffset, endOffset, selectedText, note, color, isPublic, timestamps, softDelete)

AI CONTENT:
- PreReadingGuide (id, bookId unique, vocabulary JSON, keyArguments JSON, chapterSummaries JSON, historicalContext, authorContext, intellectualContext, relatedWorks JSON, keyThemes[], readingObjectives[], generatedAt, version)

ASSESSMENTS:
- Assessment (id, userId, bookId, type enum, questions JSON, answers JSON, score, bloomsBreakdown JSON, feedback, startedAt, completedAt)

SRS:
- Flashcard (id, userId, bookId, type enum, front, back, context, tags[], easeFactor, interval, repetitions, dueDate, lastReviewedAt, status enum, timestamps, softDelete)
- FlashcardReview (id, flashcardId, userId, rating 1-4, responseTime, reviewedAt)

GAMIFICATION:
- UserStats (id, userId unique, totalXP, level, currentStreak, longestStreak, lastActiveDate, booksCompleted, totalWordsRead, totalReadTime, cardsReviewed, cardsMastered)
- Achievement (id, code unique, name, description, icon, xpReward, criteria JSON)
- UserAchievement (id, userId, achievementId, unlockedAt) - unique on userId+achievementId

CURRICULUMS:
- Curriculum (id, userId, title, description, coverImage, targetAudience, difficulty, estimatedTime, learningObjectives[], visibility enum, followCount, timestamps, softDelete)
- CurriculumItem (id, curriculumId, bookId?, orderIndex, title, externalUrl, notes)
- CurriculumFollow (id, userId, curriculumId, currentItemIndex, followedAt) - unique

SOCIAL:
- Follow (id, followerId, followingId, createdAt) - unique
- ReadingGroup (id, name, description, coverImage, isPublic, createdById, timestamps, softDelete)
- ReadingGroupMember (id, groupId, userId, role enum, joinedAt) - unique
- GroupDiscussion (id, groupId, userId, title, content, bookId?, chapterId?, timestamps, softDelete)
- DiscussionReply (id, discussionId, userId, parentReplyId?, content, timestamps, softDelete)

FORUM:
- ForumCategory (id, name, slug unique, description, orderIndex, icon)
- ForumPost (id, categoryId, userId, title, content, isPinned, isLocked, viewCount, upvotes, downvotes, timestamps, softDelete)
- ForumReply (id, postId, userId, parentReplyId?, content, isBestAnswer, upvotes, downvotes, timestamps, softDelete)
- ForumVote (id, userId, postId?, replyId?, value, createdAt) - unique constraints

SYSTEM:
- AIUsageLog (id, userId, operation, model, inputTokens, outputTokens, cost decimal, duration, success, errorMessage, createdAt)
- AuditLog (id, userId, entityType, entityId, action, changes JSON, timestamp)

REQUIREMENTS:
1. Use proper enums for all type fields
2. Add @@index on all foreign keys and frequently queried fields
3. Add @@unique constraints where specified
4. Configure for PostgreSQL
5. All timestamps in UTC
6. Soft deletes via deletedAt
7. Create seed script with sample data
8. Run prisma generate
9. Create migration
10. Run seed

ACCEPTANCE CRITERIA:
- prisma generate succeeds
- prisma migrate dev succeeds
- prisma db seed populates test data
- prisma studio shows all tables
</task>

<completion_promise>PHASE2A_DONE</completion_promise>
```

---

## Phase 3: Shared Package

### Prompt 3A - Types & Schemas

```
<task>
Create shared TypeScript types and Zod validation schemas in packages/shared.

STRUCTURE:
packages/shared/src/
├── types/
│   ├── index.ts          # Re-export Prisma types
│   ├── api.ts            # API request/response types
│   └── reader.ts         # Reader-specific types
├── schemas/
│   ├── books.ts          # Book CRUD schemas
│   ├── annotations.ts    # Annotation schemas
│   ├── flashcards.ts     # SRS schemas
│   ├── assessments.ts    # Assessment schemas
│   ├── curriculums.ts    # Curriculum schemas
│   ├── social.ts         # Social feature schemas
│   ├── forum.ts          # Forum schemas
│   └── users.ts          # User preference schemas
├── utils/
│   ├── dates.ts          # Timezone handling, formatting
│   ├── srs.ts            # SM-2 algorithm implementation
│   ├── blooms.ts         # Bloom's taxonomy helpers
│   ├── lexile.ts         # Reading level utilities
│   └── moderation.ts     # Profanity filter
├── constants/
│   ├── achievements.ts   # Achievement definitions
│   ├── languages.ts      # Supported languages
│   └── limits.ts         # Tier limits
└── index.ts

VALIDATION RULES:
Books:
- title: 1-500 chars required
- author: 1-200 chars optional
- description: max 5000 chars
- fileType: PDF, EPUB, DOC, DOCX, TXT, HTML

Annotations:
- note: max 5000 chars
- color: valid hex color

Flashcards:
- front: 1-1000 chars required
- back: 1-5000 chars required
- rating: 1-4 integer

Forum:
- title: 3-200 chars required
- content: 10-50000 chars required

SRS ALGORITHM (SM-2):
Implement the SuperMemo SM-2 algorithm:
- easeFactor minimum 1.3
- interval calculation based on rating
- repetition tracking

REQUIREMENTS:
1. Export all Prisma types
2. Create Zod schemas for all API operations
3. Implement SM-2 algorithm correctly
4. Create profanity filter utility
5. Implement timezone conversion helpers
6. Define tier limits (free: 3 books, 5 AI/day, 50 cards)
7. All exports properly typed
8. Works in both web and api apps

ACCEPTANCE CRITERIA:
- Import from @read-master/shared works in both apps
- All schemas validate correctly
- SM-2 algorithm passes test cases
- TypeScript compiles with no errors
</task>

<completion_promise>PHASE3A_DONE</completion_promise>
```

---

## Phase 4: Backend API

### Prompt 4A - API Infrastructure

```
<task>
Set up backend API infrastructure in apps/api.

STRUCTURE:
apps/api/
├── api/                      # Vercel functions
│   ├── health.ts
│   ├── books/
│   ├── reading/
│   ├── annotations/
│   ├── ai/
│   ├── flashcards/
│   ├── assessments/
│   ├── curriculums/
│   ├── social/
│   ├── forum/
│   └── cron/
└── src/
    ├── middleware/
    │   ├── auth.ts           # Clerk auth
    │   ├── error.ts          # Error handling
    │   ├── validation.ts     # Zod wrapper
    │   ├── rateLimit.ts      # Tier-based limits
    │   └── logger.ts         # Winston
    ├── services/
    │   ├── ai.ts             # Claude integration
    │   ├── tts.ts            # TTS providers
    │   ├── storage.ts        # Cloudflare R2
    │   ├── redis.ts          # Upstash
    │   ├── db.ts             # Prisma client
    │   ├── books.ts          # Book parsing
    │   ├── googleBooks.ts    # Google Books API
    │   ├── openLibrary.ts    # Open Library API
    │   └── moderation.ts     # Content moderation
    └── utils/
        ├── response.ts       # Standard responses
        ├── errors.ts         # Custom errors
        └── pagination.ts     # Pagination helpers

REQUIREMENTS:
1. Clerk authentication middleware
2. Rate limiting by tier (free: 5 AI/day, pro: 100, scholar: unlimited)
3. Error handling with proper status codes
4. Winston logging
5. Zod validation middleware
6. Redis caching helpers
7. R2 upload/download helpers
8. Health check endpoint
9. CORS configuration

ACCEPTANCE CRITERIA:
- Health endpoint returns 200
- Auth middleware rejects unauthenticated requests
- Rate limiter tracks usage correctly
- Errors return consistent JSON format
- Logging works
</task>

<completion_promise>PHASE4A_DONE</completion_promise>
```

### Prompt 4B - Book & Library APIs

```
<task>
Implement Book and Library API endpoints.

ENDPOINTS:

POST /api/books/upload
- Accept file upload (PDF, EPUB, DOC, DOCX, TXT)
- Parse and extract text content
- Upload file to R2
- Create Book record
- Enforce tier limits (free: 3 books)

POST /api/books/import-url
- Accept URL
- Fetch and parse content
- Store for personal use

POST /api/books/paste
- Accept raw text
- Create book from pasted content

GET /api/books/search
- Search Google Books API
- Search Open Library API
- Return combined results

POST /api/books/add-from-library
- Add book from Google Books/Open Library
- Fetch metadata and content if available

GET /api/books
- List user's books
- Filter by status, tags, genre
- Pagination
- Sort options

GET /api/books/:id
- Get book with chapters
- Include reading progress

PUT /api/books/:id
- Update book metadata
- Update status, tags

DELETE /api/books/:id
- Soft delete

GET /api/books/:id/content
- Stream book content
- Support range requests for large files

SERVICES:
- epub.js parsing for EPUB
- pdf-parse for PDF
- mammoth for DOC/DOCX
- Cloudflare R2 for storage

ACCEPTANCE CRITERIA:
- File upload works for all formats
- URL import extracts text correctly
- Google Books search returns results
- Open Library search returns results
- Library CRUD works
- Tier limits enforced
- Files stored in R2
</task>

<completion_promise>PHASE4B_DONE</completion_promise>
```

### Prompt 4C - AI Features API

```
<task>
Implement AI-powered feature endpoints.

ENDPOINTS:

POST /api/ai/pre-reading-guide
- Generate comprehensive pre-reading guide
- Include: vocabulary, key arguments, chapter summaries, context, themes, objectives
- Adapt based on genre and user level
- Store in PreReadingGuide table
- Stream response
- Log usage and cost

POST /api/ai/explain
- Explain selected text in context
- Consider user's reading level
- Stream response

POST /api/ai/ask
- Answer question about selected text
- Maintain context of book
- Stream response

POST /api/ai/comprehension-check
- Generate quick comprehension question
- Based on recently read content

POST /api/ai/assessment
- Generate post-reading assessment
- Multiple choice and short answer
- Bloom's Taxonomy coverage
- Adaptive difficulty

POST /api/ai/grade-answer
- Grade short answer response
- Provide feedback
- Update user comprehension data

POST /api/ai/generate-flashcards
- Auto-generate flashcards from text
- Types: vocabulary, concepts, comprehension
- Avoid duplicates

PROMPTS (packages/ai/prompts/v1/):
- preReadingGuide.ts
- explain.ts
- comprehensionCheck.ts
- assessment.ts
- gradeAnswer.ts
- generateFlashcards.ts

REQUIREMENTS:
1. Use Vercel AI SDK with streaming
2. All responses stream to client
3. Track token usage and cost
4. Respect tier rate limits
5. Cache where appropriate
6. Prompts consider user's reading level and history
7. Support disabling AI (check user.aiEnabled)

ACCEPTANCE CRITERIA:
- Pre-reading guide generates correctly
- Explanations are contextual
- Assessments cover all Bloom's levels
- Flashcard generation creates valid cards
- Usage logged with costs
- Rate limits work
- AI can be disabled per user
</task>

<completion_promise>PHASE4C_DONE</completion_promise>
```

### Prompt 4D - SRS & Gamification APIs

```
<task>
Implement SRS (Spaced Repetition) and Gamification endpoints.

SRS ENDPOINTS:

GET /api/flashcards
- List user's flashcards
- Filter by book, status, tags
- Pagination

GET /api/flashcards/due
- Get cards due for review
- Ordered by priority
- Respect daily limit setting

POST /api/flashcards
- Create manual flashcard

PUT /api/flashcards/:id
- Update flashcard

DELETE /api/flashcards/:id
- Soft delete (suspend)

POST /api/flashcards/:id/review
- Submit review (rating 1-4)
- Apply SM-2 algorithm
- Update easeFactor, interval, dueDate
- Create FlashcardReview record
- Award XP

GET /api/flashcards/stats
- Review statistics
- Retention rate
- Cards by status

GAMIFICATION ENDPOINTS:

GET /api/stats
- Get user's stats (XP, level, streaks, etc.)

GET /api/achievements
- List all achievements
- Include user's unlocked status

POST /api/stats/check-achievements
- Check and award new achievements
- Called after significant actions

GET /api/leaderboard
- Global or friends leaderboard
- Filter by timeframe (weekly, monthly, all-time)

SM-2 IMPLEMENTATION:
Rating 1 (Again): interval = 1, repetitions = 0
Rating 2 (Hard): interval *= 1.2
Rating 3 (Good): interval *= easeFactor
Rating 4 (Easy): interval *= easeFactor * 1.3

easeFactor = max(1.3, easeFactor + (0.1 - (5-rating) * (0.08 + (5-rating) * 0.02)))

XP REWARDS:
- Complete review: 10 XP
- Perfect review (Easy): 15 XP
- Finish book: 100 XP
- Complete assessment: 50 XP
- Daily streak: 20 XP bonus

ACCEPTANCE CRITERIA:
- SM-2 algorithm calculates correctly
- Due cards returned in correct order
- XP awarded properly
- Achievements unlock correctly
- Leaderboard shows correct rankings
- Stats update in real-time
</task>

<completion_promise>PHASE4D_DONE</completion_promise>
```

### Prompt 4E - TTS API

```
<task>
Implement Text-to-Speech endpoints.

ENDPOINTS:

POST /api/tts/speak
- Convert text to speech
- Tier-based provider:
  - Free: Return config for Web Speech API (client-side)
  - Pro: OpenAI TTS API
  - Scholar: ElevenLabs API
- Stream audio response
- Track usage

GET /api/tts/voices
- List available voices by tier
- Free: Browser default
- Pro: OpenAI voices (alloy, echo, fable, onyx, nova, shimmer)
- Scholar: ElevenLabs premium voices

POST /api/tts/download
- Generate full book audio
- Pro: 5 downloads/month limit
- Scholar: Unlimited
- Store in R2
- Return download URL
- Formats: MP3, M4A

GET /api/tts/downloads
- List user's generated audiobooks
- Download status (processing, ready, expired)

DELETE /api/tts/downloads/:id
- Delete generated audiobook

IMPLEMENTATION:
1. OpenAI TTS: Use openai.audio.speech.create()
2. ElevenLabs: Use elevenlabs.generate()
3. Track download quota per billing period
4. Background job for full book generation
5. Chunk long texts appropriately

ACCEPTANCE CRITERIA:
- Free tier returns Web Speech API config
- Pro tier streams OpenAI audio
- Scholar tier streams ElevenLabs audio
- Download limits enforced correctly
- Full book downloads work
- Audio files stored in R2
</task>

<completion_promise>PHASE4E_DONE</completion_promise>
```

### Prompt 4F - Social & Forum APIs

```
<task>
Implement Social Features and Forum endpoints.

SOCIAL ENDPOINTS:

GET /api/users/:username
- Public profile (if isPublic)
- Stats, achievements, reading activity (if shared)

POST /api/users/:id/follow
- Follow user

DELETE /api/users/:id/follow
- Unfollow user

GET /api/users/:id/followers
- List followers

GET /api/users/:id/following
- List following

GET /api/feed
- Activity feed from followed users
- Reading completions, achievements, shared highlights

READING GROUPS:

POST /api/groups
- Create reading group
- Pro/Scholar only

GET /api/groups
- List groups (public + user's private)
- Search, filter

GET /api/groups/:id
- Group details with members

POST /api/groups/:id/join
- Join public group or accept invite

DELETE /api/groups/:id/leave
- Leave group

POST /api/groups/:id/discussions
- Create discussion thread

GET /api/groups/:id/discussions
- List discussions

POST /api/discussions/:id/replies
- Reply to discussion

FORUM ENDPOINTS:

GET /api/forum/categories
- List forum categories

GET /api/forum/posts
- List posts, filter by category
- Sort: recent, popular, unanswered
- Pagination

POST /api/forum/posts
- Create new post
- Apply profanity filter

GET /api/forum/posts/:id
- Get post with replies

POST /api/forum/posts/:id/replies
- Reply to post
- Support nested replies

POST /api/forum/posts/:id/vote
- Upvote or downvote

POST /api/forum/replies/:id/vote
- Vote on reply

PUT /api/forum/replies/:id/best-answer
- Mark as best answer (OP only)

POST /api/forum/report
- Report post or reply

MODERATION:
1. Profanity filter on all public text
2. Report system with queue
3. Moderator endpoints for review
4. Auto-flag suspicious content

ACCEPTANCE CRITERIA:
- Follow/unfollow works
- Activity feed shows relevant content
- Groups CRUD works
- Discussions work with nested replies
- Forum CRUD works
- Voting updates counts correctly
- Profanity filter catches bad words
- Report system functional
- Privacy settings respected
</task>

<completion_promise>PHASE4F_DONE</completion_promise>
```

### Prompt 4G - Curriculum APIs

```
<task>
Implement Curriculum endpoints.

ENDPOINTS:

POST /api/curriculums
- Create curriculum
- Pro/Scholar only

GET /api/curriculums
- List user's curriculums

GET /api/curriculums/browse
- Browse public curriculums
- Filter by category, difficulty
- Sort by popularity, recent, rating
- Search

GET /api/curriculums/:id
- Get curriculum with items
- Include follow status

PUT /api/curriculums/:id
- Update curriculum

DELETE /api/curriculums/:id
- Soft delete

POST /api/curriculums/:id/items
- Add item to curriculum
- Reorder items

PUT /api/curriculums/:id/items/:itemId
- Update item

DELETE /api/curriculums/:id/items/:itemId
- Remove item

POST /api/curriculums/:id/follow
- Follow curriculum
- Copy reading list structure

DELETE /api/curriculums/:id/follow
- Unfollow

PUT /api/curriculums/:id/progress
- Update progress through curriculum

SHARING:
- Private: Only creator sees
- Unlisted: Anyone with link
- Public: Browsable by all

CURRICULUM STRUCTURE:
- Title, description, cover
- Target audience
- Difficulty level
- Estimated time
- Learning objectives
- Ordered list of items (books/links)
- Notes per item

ACCEPTANCE CRITERIA:
- CRUD operations work
- Item ordering works correctly
- Visibility settings work
- Follow/unfollow works
- Progress tracking works
- Browse/search returns relevant results
- Share links work for unlisted
</task>

<completion_promise>PHASE4G_DONE</completion_promise>
```

---

## Phase 5: Frontend Foundation

### Prompt 5A - App Shell & Routing

```
<task>
Set up React app shell, routing, and core infrastructure in apps/web.

SETUP:

1. Vite configuration:
   - Path aliases (@/ -> src/)
   - Environment variables
   - PWA plugin for offline support
   - Service worker registration

2. MUI Theme:
   - Light and dark mode
   - High contrast mode (WCAG AAA - 7:1 ratio)
   - Custom color palette
   - Typography scale
   - Component overrides

3. Clerk Authentication:
   - ClerkProvider wrapper
   - Protected routes
   - Sign in/up pages
   - OAuth (Google, Apple)

4. React Query:
   - QueryClient with defaults
   - Devtools in dev

5. Zustand Stores:
   - uiStore: theme, sidebar, language
   - readerStore: current book, position, settings
   - srsStore: due cards, session stats

6. i18next Setup:
   - Languages: en, ar, es, ja, zh, tl
   - RTL support for Arabic
   - Language detection
   - Namespace separation

7. React Router:
   Routes:
   - / -> Dashboard
   - /library -> Library
   - /read/:bookId -> Reader
   - /flashcards -> SRS Review
   - /curriculums -> Curriculums
   - /curriculum/:id -> Curriculum Detail
   - /groups -> Reading Groups
   - /group/:id -> Group Detail
   - /forum -> Forum
   - /forum/:category -> Category
   - /forum/post/:id -> Post Detail
   - /profile/:username -> Profile
   - /settings -> Settings
   - /analytics -> Analytics Dashboard

8. Layout Components:
   - MainLayout (sidebar nav, header)
   - ReaderLayout (minimal, for reading)
   - Responsive (desktop sidebar, mobile bottom nav)

9. Accessibility:
   - Skip to main content link
   - Focus management
   - ARIA landmarks
   - Keyboard navigation

10. Offline Support:
    - Service worker setup
    - IndexedDB wrapper
    - Offline indicator component

ACCEPTANCE CRITERIA:
- App loads without errors
- Routing works
- Auth flow works (sign up, sign in, sign out)
- Theme toggle works
- Language switching works
- RTL works for Arabic
- Keyboard navigation works
- Skip link works
</task>

<completion_promise>PHASE5A_DONE</completion_promise>
```

### Prompt 5B - Library & Book Management UI

```
<task>
Implement Library UI for managing books.

COMPONENTS:

LibraryPage:
- Grid/list view toggle
- Filter sidebar: status, genre, tags
- Search bar
- Sort dropdown (recent, title, author, progress)
- Add book button (opens modal)
- Book cards with cover, title, author, progress

BookCard:
- Cover image (placeholder if none)
- Title, author
- Progress bar
- Status badge
- Quick actions (read, delete)
- Hover/focus state

AddBookModal:
- Tabs: Upload, URL, Paste, Search
- Upload tab: drag-and-drop zone, file picker
- URL tab: URL input, preview
- Paste tab: textarea
- Search tab: search input, results from Google Books + Open Library
- Processing indicator
- Error handling

BookDetailModal:
- Full metadata
- Edit form
- Chapters list
- Reading stats
- AI guide status
- Delete confirmation

LibraryFilters:
- Status chips (Want to Read, Reading, Completed, Abandoned)
- Genre/category dropdown
- Tags multiselect
- Clear filters button

FEATURES:
- Infinite scroll or pagination
- Optimistic updates
- Skeleton loading states
- Empty state with CTA
- Keyboard shortcuts
- Drag to reorder (reading list)

ACCESSIBILITY:
- Semantic HTML (article, nav, aside)
- ARIA labels on interactive elements
- Focus trapping in modals
- Announce loading/success/error

ACCEPTANCE CRITERIA:
- Library displays books correctly
- All filter/sort options work
- File upload works (all formats)
- URL import works
- Paste text works
- Search returns results
- Add to library works
- Edit book works
- Delete book works
- Responsive layout
- Keyboard accessible
- Screen reader friendly
</task>

<completion_promise>PHASE5B_DONE</completion_promise>
```

### Prompt 5C - Reading Interface

```
<task>
Implement the core reading interface.

COMPONENTS:

ReaderPage:
- Full reading view
- Configurable toolbar
- Progress indicator
- Chapter navigation

ReaderToolbar:
- Back to library
- Book title
- Chapter dropdown
- Settings button
- TTS controls
- AI assistant toggle
- Table of contents
- Bookmark button
- Search in book

ReaderContent:
- epub.js for EPUB rendering
- pdf.js for PDF rendering
- Custom renderer for TXT/HTML
- Pagination or scroll mode
- Font/theme application
- Highlighting support
- Touch/swipe navigation

ReaderSettings:
- Font family (including OpenDyslexic)
- Font size slider
- Line height
- Letter spacing
- Margins
- Theme: Light, Dark, Sepia, High Contrast
- Custom theme creator
- Column width
- Speed reading toggle (RSVP)
- Bionic reading toggle

AnnotationLayer:
- Text selection handling
- Highlight creation (color picker)
- Note creation
- Bookmark toggle
- Context menu on selection

SplitPaneNotes:
- Toggle split view
- Notes panel alongside reading
- Sync scroll option
- Create/edit notes
- View annotations for current page

ReaderProgress:
- Current page/chapter
- Percentage complete
- Time remaining estimate
- Reading speed (WPM)

ChapterNav:
- Previous/next buttons
- Chapter list drawer
- Jump to chapter

FEATURES:
- Remember reading position
- Sync progress to server
- Offline reading (IndexedDB cache)
- Keyboard shortcuts (arrow keys, space)
- Dictionary lookup (double-tap word)
- Translation (select + translate)
- "Explain this" (select + AI)
- Focus mode (hide all UI)
- Night reading (reduce blue light)

ACCESSIBILITY:
- Screen reader compatible
- Keyboard navigation throughout
- High contrast mode
- Adjustable everything
- Reduced motion option
- Focus indicators

ACCEPTANCE CRITERIA:
- EPUB rendering works correctly
- PDF rendering works correctly
- TXT/HTML rendering works
- All settings apply correctly
- Highlighting works
- Notes work
- Bookmarks work
- Progress saves and syncs
- Offline reading works
- Dictionary lookup works
- Translation works
- TTS integrates correctly
- Fully keyboard accessible
- Works on mobile
</task>

<completion_promise>PHASE5C_DONE</completion_promise>
```

### Prompt 5D - Text-to-Speech UI

```
<task>
Implement Text-to-Speech UI components.

COMPONENTS:

TTSControls (in reader toolbar):
- Play/pause button
- Stop button
- Speed control (0.5x - 3x)
- Voice selector dropdown
- Volume control
- Skip back 15s / forward 15s
- Progress indicator

TTSHighlighter:
- Highlight current word/sentence being spoken
- Auto-scroll to follow
- Click word to jump

TTSSettingsModal:
- Voice selection (tier-based options)
- Default speed
- Highlight style
- Auto-play on page turn

AudioDownloadModal:
- Format selection (MP3, M4A)
- Quality selection
- Download button
- Progress indicator for generation
- Download limit display (Pro: X/5 remaining)

IMPLEMENTATION:

Free Tier (Web Speech API):
- Use browser's SpeechSynthesis
- Get available voices
- Handle voice change
- Word boundary events for highlighting

Pro Tier (OpenAI TTS):
- Stream audio from API
- Handle chunking for long text
- Buffer management

Scholar Tier (ElevenLabs):
- Premium voice selection
- Stream from API
- Higher quality audio

Background Audio:
- Continue playing when app backgrounded (mobile)
- Media session API integration
- Lock screen controls

Sync with Reading:
- Update reading position as TTS progresses
- Pause TTS when user scrolls manually
- Resume from current position

ACCEPTANCE CRITERIA:
- Web Speech API works (free tier)
- OpenAI TTS streams correctly (pro)
- ElevenLabs works (scholar)
- Word highlighting syncs with speech
- Speed adjustment works
- Voice selection works
- Background playback works (mobile)
- Position syncs with manual reading
- Download generation works
- Download limits enforced
</task>

<completion_promise>PHASE5D_DONE</completion_promise>
```

### Prompt 5E - AI Features UI

```
<task>
Implement AI-powered feature UI components.

COMPONENTS:

PreReadingGuideView:
- Display before starting book
- Collapsible sections:
  - Vocabulary preview (word cards)
  - Key arguments summary
  - Chapter overview
  - Historical context
  - Author context
  - Intellectual context
  - Related works
  - Key themes (tags)
  - Reading objectives (checklist)
- "Generate Guide" button
- "Regenerate" button
- Loading state with progress
- Disable AI toggle

AIAssistantPanel:
- Slide-in panel in reader
- Chat interface
- Context-aware (knows current book/position)
- Quick actions:
  - "Explain this"
  - "Why is this important?"
  - "Connect to earlier"
  - "Ask a question"
- Message history
- Clear conversation

SelectionPopover:
- Appears on text selection
- Quick actions: Highlight, Note, Explain, Translate, Define
- Smooth animation

ComprehensionCheckModal:
- Appears at chapter breaks (if enabled)
- Quick question about recent content
- Multiple choice
- Immediate feedback
- Skip option
- Frequency setting

AssessmentPage:
- Start assessment button
- Question display (one at a time)
- Multiple choice UI
- Short answer textarea
- Progress indicator
- Submit and get results
- Results view:
  - Overall score
  - Bloom's taxonomy breakdown
  - Per-question feedback
  - Links to relevant passages
  - Generate flashcards from missed items

AIDisabledState:
- Message when AI disabled
- Link to enable in settings
- Alternative suggestions

STREAMING:
- All AI responses stream in
- Typing indicator
- Cancel button during generation
- Handle errors gracefully

ACCESSIBILITY:
- AI responses announced to screen readers
- Keyboard navigation in chat
- Focus management in modals

ACCEPTANCE CRITERIA:
- Pre-reading guide generates and displays
- All sections render correctly
- AI chat works with streaming
- Selection popover appears correctly
- Explain/translate work
- Comprehension checks appear at right times
- Assessment flow works end-to-end
- Results display correctly
- AI can be disabled
- All components accessible
</task>

<completion_promise>PHASE5E_DONE</completion_promise>
```

### Prompt 5F - SRS Flashcards UI

```
<task>
Implement Spaced Repetition System UI.

COMPONENTS:

FlashcardsPage:
- Dashboard view:
  - Due today count
  - New cards count
  - Review streak
  - Daily progress chart
- "Start Review" button
- Browse cards section
- Create card button

ReviewSession:
- Card display (front)
- Flip animation to reveal back
- Rating buttons: Again (1), Hard (2), Good (3), Easy (4)
- Progress bar (cards remaining)
- Session stats (correct, time)
- Keyboard shortcuts (1-4, space to flip)
- End session option
- Session complete celebration

FlashcardDisplay:
- Front content
- Back content
- Context (source passage)
- Book reference
- Tags
- Flip animation

CardBrowser:
- Grid/list view
- Filter: book, status, tags, type
- Search cards
- Sort: due date, created, alphabetical
- Bulk actions: suspend, delete, tag

CardEditor:
- Create/edit card form
- Front (rich text)
- Back (rich text)
- Context (optional)
- Tags multiselect
- Card type selector
- Preview mode

ReviewStats:
- Retention rate chart
- Cards reviewed over time
- Streak calendar
- Forecast (upcoming due)
- Time spent reviewing

GAMIFICATION ELEMENTS:
- XP animation on correct answer
- Streak fire animation
- Level up celebration
- Achievement toast notifications
- Daily goal progress

SRS ALGORITHM UI:
- Show next review date after rating
- Explain rating impact (tooltip)
- Undo last rating (within session)

ACCESSIBILITY:
- Full keyboard control
- Screen reader announces card content
- Flip animation respects reduced motion
- Clear focus indicators

ACCEPTANCE CRITERIA:
- Due cards load correctly
- Flip animation works smoothly
- Ratings update card correctly (SM-2)
- Next review dates calculate correctly
- Session completes and shows stats
- Browse/search/filter works
- Create/edit cards works
- Gamification animations work
- Streak tracking works
- Fully keyboard accessible
</task>

<completion_promise>PHASE5F_DONE</completion_promise>
```

### Prompt 5G - Social Features UI

```
<task>
Implement Social Features UI.

COMPONENTS:

ProfilePage:
- Avatar, display name, username
- Bio
- Public/private indicator
- Stats: books read, streak, XP, level
- Achievements showcase
- Currently reading
- Recent activity (if public)
- Follow/unfollow button
- Edit profile (own profile)

EditProfileModal:
- Avatar upload
- Display name
- Bio
- Privacy toggles:
  - Profile public
  - Share reading activity
  - Show on leaderboards
- Connected accounts

FollowersModal:
- List of followers/following
- Follow/unfollow buttons
- Search

ActivityFeed:
- Timeline of followed users' activity
- Activity types: started reading, finished, achievement, shared highlight
- Like/comment actions
- Infinite scroll

ReadingGroupsPage:
- My groups list
- Discover public groups
- Create group button (Pro/Scholar)

GroupDetailPage:
- Group info, members
- Current book
- Group progress
- Discussions list
- Leaderboard
- Leave/join button
- Invite link (for private)

GroupDiscussion:
- Thread view
- Nested replies
- Rich text editor
- Book/chapter reference
- Subscribe to thread

CreateGroupModal:
- Name, description
- Cover image
- Public/private toggle
- Invite members

LeaderboardPage:
- Tabs: Friends, Global
- Timeframe: Week, Month, All-time
- Metrics: XP, Books, Streak
- Current user highlight
- Opt-in notice

ACCESSIBILITY:
- Semantic list markup
- ARIA labels for actions
- Keyboard navigation
- Screen reader friendly activity descriptions

ACCEPTANCE CRITERIA:
- Profiles display correctly (public/private)
- Follow/unfollow works
- Activity feed loads and updates
- Groups CRUD works
- Discussions with nested replies work
- Forum posts and voting work
- Leaderboard displays correctly
- Privacy settings respected throughout
- All components keyboard accessible
</task>

<completion_promise>PHASE5G_DONE</completion_promise>
```

### Prompt 5H - Forum UI

```
<task>
Implement Community Forum UI.

COMPONENTS:

ForumPage:
- Category sidebar/tabs
- Post list (recent/popular/unanswered)
- Search bar
- Create post button
- Pinned posts section

CategoryView:
- Category header with description
- Post list for category
- Sort/filter options

PostList:
- Post cards showing:
  - Title
  - Author avatar + name
  - Preview text
  - Category tag
  - Vote count
  - Reply count
  - Time ago
- Infinite scroll

PostDetailPage:
- Post content (rich text)
- Vote buttons
- Author info
- Reply count
- Replies list (nested)
- Reply editor
- Best answer highlight
- Report button

ReplyThread:
- Nested reply display
- Collapse/expand threads
- Vote buttons per reply
- Reply to reply button
- Mark as best answer (OP only)

CreatePostModal:
- Category selector
- Title input
- Rich text editor (markdown support)
- Preview tab
- Submit button

ReplyEditor:
- Rich text with markdown
- @ mentions
- Preview
- Cancel/Submit

ReportModal:
- Reason selector
- Additional details textarea
- Submit report

ModeratorTools (for mods):
- Post queue
- Reported content list
- Pin/unpin posts
- Lock threads
- Delete/restore posts
- User warnings

MODERATION:
- Profanity filter on submit
- Flag suspicious content
- Report system
- Moderator review queue

ACCEPTANCE CRITERIA:
- All forum CRUD works
- Nested replies display correctly
- Voting updates counts
- Best answer marking works
- Search works
- Categories filter correctly
- Profanity filter catches bad words
- Report system works
- Moderator tools functional
- Fully accessible
</task>

<completion_promise>PHASE5H_DONE</completion_promise>
```

### Prompt 5I - Curriculum UI

```
<task>
Implement Curriculum Builder and Browser UI.

COMPONENTS:

CurriculumsPage:
- My Curriculums tab
- Browse tab
- Create button (Pro/Scholar)

MyCurriculums:
- List of user's curriculums
- Status indicators (private/public)
- Edit/delete actions
- Follow count

BrowseCurriculums:
- Search bar
- Category filter
- Difficulty filter
- Sort: Popular, Recent, Rating
- Curriculum cards grid
- Infinite scroll

CurriculumCard:
- Cover image
- Title
- Creator
- Description preview
- Book count
- Estimated time
- Difficulty badge
- Follow count
- Follow button

CurriculumDetailPage:
- Header with cover, title, creator
- Description
- Learning objectives
- Book list with order numbers
- Progress tracker (if following)
- Follow/unfollow button
- Share button (copy link)
- Edit button (if owner)

CurriculumItemList:
- Ordered list of books
- Book cover thumbnails
- Notes per book
- "Add to Library" button
- Progress checkmarks

CreateCurriculumModal:
- Cover image upload
- Title, description
- Target audience
- Difficulty selector
- Learning objectives (add/remove)
- Visibility toggle

EditCurriculumPage:
- All creation fields
- Drag-and-drop item reordering
- Add item button:
  - From library
  - Search books
  - External URL
- Item notes editor
- Remove item
- Save/cancel

CurriculumProgress:
- Progress bar
- Current book indicator
- Mark complete buttons
- Time spent

ShareModal:
- Copy link button
- Visibility reminder
- Social share buttons

ACCEPTANCE CRITERIA:
- Create curriculum works
- Edit with drag-and-drop reorder works
- Add items from multiple sources
- Browse and search work
- Following tracks progress
- Share links work
- Visibility settings work
- Responsive layout
- Accessible
</task>

<completion_promise>PHASE5I_DONE</completion_promise>
```

### Prompt 5J - Analytics Dashboard UI

```
<task>
Implement customizable Analytics Dashboard.

COMPONENTS:

AnalyticsPage:
- Customizable grid layout
- Date range selector
- Widget library
- Edit mode toggle
- Reset to default

WidgetLibrary (drag to add):
- Reading stats
- Streak calendar
- Time chart
- Books completed
- SRS stats
- Comprehension scores
- Bloom's breakdown
- Reading speed
- Goals progress
- Vocabulary learned

DraggableWidget:
- Widget content
- Drag handle
- Resize handles
- Remove button (edit mode)
- Settings button

ReadingStatsWidget:
- Books completed
- Words read
- Time spent
- Current streak

StreakCalendarWidget:
- GitHub-style heatmap
- Day tooltips with stats
- Legend

TimeChartWidget:
- Line/bar chart
- Daily/weekly/monthly toggle
- Reading time over period

BooksCompletedWidget:
- Book covers grid
- Completion dates
- View all link

SRSStatsWidget:
- Cards due
- Cards reviewed today
- Retention rate
- Mastered count

ComprehensionWidget:
- Average score trend
- Per-book scores
- Improvement indicator

BloomsWidget:
- Radar chart of 6 levels
- Strengths/weaknesses

ReadingSpeedWidget:
- Current WPM
- Trend over time
- Comparison to average

VocabularyWidget:
- Words learned count
- Recent words list
- Mastery breakdown

CUSTOMIZATION:
- Drag widgets to reorder
- Resize widgets
- Show/hide widgets
- Save layout to preferences
- Reset to default option

DATA EXPORT:
- Export button
- Format selector (CSV, JSON)
- Date range for export

CHARTS:
- Use Recharts library
- Responsive sizing
- Accessible colors
- Tooltips

ACCEPTANCE CRITERIA:
- All widgets display data correctly
- Drag-and-drop reorder works
- Widget resize works
- Show/hide widgets works
- Layout saves to preferences
- Date range filtering works
- Data export works
- Charts render correctly
- Responsive layout
- Accessible (chart alternatives)
</task>

<completion_promise>PHASE5J_DONE</completion_promise>
```

### Prompt 5K - Settings & Accessibility

```
<task>
Implement Settings pages with full accessibility support.

COMPONENTS:

SettingsPage:
- Settings navigation sidebar
- Section content area

AccountSettings:
- Profile info (name, username, bio)
- Avatar upload
- Email (from Clerk)
- Password change (Clerk)
- Connected accounts
- Two-factor auth toggle
- Delete account (confirmation required)

ReadingSettings:
- Default font family
- Default font size
- Default theme
- Default line height
- Speed reading preferences
- TTS default voice
- TTS default speed
- Comprehension check frequency

AISettings:
- Enable/disable AI globally
- AI personality selector
- Verbosity level slider
- Language complexity preference
- Proactive suggestions toggle

NotificationSettings:
- Email notifications toggles:
  - Daily digest
  - Weekly summary
  - SRS reminders
  - Group activity
  - Forum replies
- Push notifications toggles
- Quiet hours

PrivacySettings:
- Profile visibility toggle
- Activity sharing toggle
- Leaderboard opt-in
- Data usage for AI improvement (opt-in)
- Data export button
- Download all my data

AccessibilitySettings:
- High contrast mode toggle
- Reduced motion toggle
- Screen reader optimizations
- Font options:
  - Dyslexia-friendly (OpenDyslexic)
  - Large text mode
- Focus indicator style
- Keyboard shortcut help

LanguageSettings:
- Interface language selector
- Translation target language
- RTL preview (for Arabic)

SubscriptionSettings:
- Current plan display
- Usage stats (AI calls, storage, downloads)
- Upgrade/downgrade buttons
- Billing history
- Cancel subscription

ACCESSIBILITY IMPLEMENTATION:
- All form inputs labeled
- Error messages linked to inputs
- Focus management on section change
- Keyboard navigation
- Screen reader announcements
- Skip links
- Consistent heading hierarchy

WCAG 2.2 AAA CHECKLIST:
- 7:1 contrast ratio (high contrast mode)
- Text resizable to 200%
- No loss of content at 400% zoom
- Target size 44x44px minimum
- Focus visible at all times
- No keyboard traps
- Error identification
- Labels or instructions for input
- Consistent identification
- Status messages announced

ACCEPTANCE CRITERIA:
- All settings save correctly
- Settings sync across devices
- Accessibility options work
- High contrast mode works
- Reduced motion works
- Screen reader fully compatible
- Keyboard navigation complete
- Data export works
- Delete account works
- All WCAG 2.2 AAA criteria met
</task>

<completion_promise>PHASE5K_DONE</completion_promise>
```

---

## Phase 6: Offline Support & PWA

### Prompt 6A - Offline Functionality

```
<task>
Implement offline support and PWA features.

SERVICE WORKER:
1. Cache static assets (JS, CSS, images)
2. Cache API responses (library, flashcards)
3. Background sync for:
   - Reading progress
   - Flashcard reviews
   - Annotations
4. Offline page fallback

INDEXEDDB STORAGE:
- Downloaded books (full content)
- Reading progress (pending sync)
- Flashcard reviews (pending sync)
- Annotations (pending sync)
- User preferences

OFFLINE FEATURES:
- Read downloaded books
- View library (cached)
- Review flashcards (cached, sync later)
- Create annotations (sync later)
- View reading progress

SYNC STRATEGY:
1. Queue offline actions in IndexedDB
2. When online, sync in background
3. Handle conflicts (server wins, notify user)
4. Show sync status indicator

PWA MANIFEST:
- App name and icons
- Theme colors
- Display: standalone
- Orientation: any
- Start URL

INSTALL PROMPT:
- Custom install banner
- "Add to Home Screen" prompt
- Install success message

OFFLINE INDICATOR:
- Show when offline
- Show pending sync count
- Manual sync button

COMPONENTS:
- OfflineIndicator
- SyncStatusBadge
- DownloadBookButton
- OfflineLibrary
- InstallPrompt

ACCEPTANCE CRITERIA:
- Books downloadable for offline
- Offline reading works
- Progress syncs when back online
- Flashcard reviews work offline
- Annotations work offline
- PWA installable
- Offline indicator shows correctly
- Background sync works
- No data loss on reconnect
</task>

<completion_promise>PHASE6A_DONE</completion_promise>
```

---

## Phase 7: Testing & Polish

### Prompt 7A - Testing

```
<task>
Add comprehensive tests to the codebase.

TESTING FRAMEWORK: Vitest

UNIT TESTS (packages/shared):
- SM-2 algorithm calculations
- Date/timezone utilities
- Validation schemas (Zod)
- Profanity filter
- Bloom's taxonomy helpers

API TESTS (apps/api):
- All endpoints with mocked DB
- Authentication middleware
- Rate limiting
- Validation errors
- Error handling

COMPONENT TESTS (apps/web):
- Reader components
- Library components
- Flashcard components
- Form components
- Accessibility tests

INTEGRATION TESTS:
- Book upload flow
- Reading progress sync
- Flashcard review flow
- Assessment flow
- Authentication flow

E2E TESTS (Playwright):
- Sign up / sign in
- Add book to library
- Read book
- Create flashcard
- Review flashcards
- Change settings

ACCESSIBILITY TESTS:
- axe-core integration
- Keyboard navigation
- Screen reader compatibility
- Color contrast

TEST COVERAGE TARGETS:
- Shared package: 90%
- API: 80%
- Web components: 70%
- Overall: 75%

ACCEPTANCE CRITERIA:
- All test suites pass
- Coverage meets targets
- CI runs tests on PR
- No accessibility violations
- E2E tests pass
</task>

<completion_promise>PHASE7A_DONE</completion_promise>
```

### Prompt 7B - Performance & Polish

```
<task>
Optimize performance and polish the application.

PERFORMANCE:
1. Code splitting by route
2. Lazy load heavy components (reader, charts)
3. Image optimization (WebP, lazy load)
4. Bundle size analysis and reduction
5. API response caching
6. Database query optimization (indexes)
7. Redis caching for frequent queries

LOADING STATES:
- Skeleton loaders for all data
- Progressive loading for large content
- Optimistic updates where possible

ERROR HANDLING:
- Global error boundary
- Friendly error messages
- Retry mechanisms
- Error logging (console in dev, service in prod)

ANIMATIONS:
- Page transitions
- Modal animations
- Card flip (flashcards)
- Progress celebrations
- Respect reduced motion preference

POLISH:
- Empty states with helpful CTAs
- Loading states everywhere
- Success/error toasts
- Confirmation dialogs for destructive actions
- Keyboard shortcuts help modal
- Onboarding tour for new users

SEO:
- Meta tags
- Open Graph tags
- Structured data
- Sitemap

MONITORING:
- Error tracking setup
- Performance monitoring
- Usage analytics (privacy-respecting)

ACCEPTANCE CRITERIA:
- Lighthouse score > 90 (all categories)
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- No layout shifts
- Bundle size < 500KB initial
- All animations smooth (60fps)
- Reduced motion respected
- Error tracking working
</task>

<completion_promise>PHASE7B_DONE</completion_promise>
```

---

## Phase 8: Deployment

### Prompt 8A - Production Setup

```
<task>
Prepare for production deployment.

ENVIRONMENT:
1. Set up Vercel project
2. Configure environment variables
3. Set up Vercel Postgres
4. Set up Upstash Redis
5. Set up Cloudflare R2
6. Configure custom domain

ENVIRONMENT VARIABLES:
- All from .env.example
- Production API keys
- Production URLs

DATABASE:
1. Run production migrations
2. Seed forum categories
3. Seed achievements
4. Verify indexes

SECURITY:
- HTTPS only
- Secure headers (helmet)
- Rate limiting enabled
- Input sanitization verified
- SQL injection prevented (Prisma)
- XSS prevented (React)

CI/CD:
- GitHub Actions workflow
- Run tests on PR
- Type checking
- Lint checking
- Deploy preview on PR
- Deploy production on merge to main

MONITORING:
- Set up error tracking (Sentry or similar)
- Set up uptime monitoring
- Set up performance monitoring
- Alert on errors

BACKUP:
- Database backup schedule
- R2 backup strategy

DOCUMENTATION:
- API documentation
- Deployment guide
- Environment setup guide
- Contributing guide

ACCEPTANCE CRITERIA:
- App deploys successfully
- All features work in production
- HTTPS working
- Custom domain configured
- Monitoring active
- CI/CD pipeline working
- Documentation complete
</task>

<completion_promise>PHASE8A_DONE</completion_promise>
```

---

## Summary: Build Order

Run these prompts sequentially with your Ralph loop script:

| Phase | Prompt | Description              | Est. Iterations |
| ----- | ------ | ------------------------ | --------------- |
| 1     | 1A     | Project scaffolding      | 20-30           |
| 2     | 2A     | Database schema          | 15-25           |
| 3     | 3A     | Shared types & utils     | 15-20           |
| 4     | 4A     | API infrastructure       | 15-20           |
| 4     | 4B     | Books & Library API      | 20-30           |
| 4     | 4C     | AI Features API          | 25-35           |
| 4     | 4D     | SRS & Gamification API   | 20-30           |
| 4     | 4E     | TTS API                  | 15-20           |
| 4     | 4F     | Social & Forum API       | 25-35           |
| 4     | 4G     | Curriculum API           | 15-20           |
| 5     | 5A     | App shell & routing      | 20-30           |
| 5     | 5B     | Library UI               | 25-35           |
| 5     | 5C     | Reading interface        | 40-60           |
| 5     | 5D     | TTS UI                   | 20-30           |
| 5     | 5E     | AI Features UI           | 30-40           |
| 5     | 5F     | SRS Flashcards UI        | 25-35           |
| 5     | 5G     | Social Features UI       | 25-35           |
| 5     | 5H     | Forum UI                 | 25-35           |
| 5     | 5I     | Curriculum UI            | 20-30           |
| 5     | 5J     | Analytics Dashboard      | 25-35           |
| 5     | 5K     | Settings & Accessibility | 20-30           |
| 6     | 6A     | Offline & PWA            | 25-35           |
| 7     | 7A     | Testing                  | 30-40           |
| 7     | 7B     | Performance & Polish     | 20-30           |
| 8     | 8A     | Production deployment    | 15-20           |

**Total estimated iterations: 550-800**

## Tips for Running Ralph

1. **Start each phase fresh** - Clear context between major phases
2. **Verify before continuing** - Test each phase works before moving on
3. **Save checkpoints** - Commit after each successful phase
4. **Tune prompts** - If Ralph fails repeatedly, add more specific guardrails
5. **Monitor costs** - Track API usage, especially for longer phases

Good luck building Read Master! 🚀📚
