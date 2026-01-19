# Read Master - AI-Powered Reading Platform Specification

## Project Overview

### App Name

Read Master

### Purpose

An AI-powered reading platform that dramatically improves reading comprehension and retention through intelligent pre-reading guides, contextual support during reading, adaptive post-reading assessments, and spaced repetition review. The platform serves as a smart reading companion that learns and adapts to each user's comprehension level across all their reading.

### Target Users

- Leisurely readers who want to get more from their reading
- Students at all levels (high school, university, graduate)
- Lifelong learners and autodidacts
- Non-native speakers improving language comprehension
- Professionals reading technical or academic material
- Book clubs and reading groups
- Educators creating reading curriculums

### Unique Value Proposition

Unlike static reading apps, Read Master uses AI to create a personalized, adaptive learning experience. It generates contextual guides tailored to each text, tracks comprehension across all reading, and uses proven pedagogical methods (Bloom's Taxonomy, SRS) to ensure lasting retention. All AI features can be disabled for users who prefer traditional reading.

### Cross-Platform Parity

**CRITICAL REQUIREMENT: All platforms must have feature parity.**

Read Master is built as a cross-platform application available on:

- **Web** (browser-based, responsive)
- **Desktop** (Electron app for macOS, Windows, Linux)
- **Mobile** (iOS and Android native apps)

**Feature Parity Mandate:**

- ✅ **Every feature** implemented must work across ALL platforms (web, desktop, mobile)
- ✅ **UI/UX consistency** - Similar user experience across all platforms with platform-specific optimizations
- ✅ **Data synchronization** - Real-time sync of books, progress, annotations, flashcards, and settings across all devices
- ✅ **Offline support** - All platforms support offline reading with sync when back online
- ✅ **No platform-exclusive features** - If a feature works on one platform, it must work on all platforms
- ✅ **Platform-appropriate adaptations** - While features are identical, implementations may differ (e.g., touch gestures on mobile, keyboard shortcuts on desktop)

**Implementation Guidelines:**

1. When developing any feature, implement it for web, desktop, AND mobile simultaneously
2. Use responsive design principles so web version works on all screen sizes
3. Leverage React Native or similar for mobile to maximize code sharing
4. Test on all platforms before considering a feature complete
5. Document any platform-specific behavior or limitations
6. If a technical limitation prevents feature parity, escalate immediately and document workaround

**Why Cross-Platform Parity Matters:**

- Users expect consistent experience across devices
- Reading should be seamless whether on phone, tablet, laptop, or desktop
- No user should feel they're missing features based on their device choice
- Builds trust and increases engagement across all platforms

---

## Core Features

### Must-Have Features (MVP)

#### 1. Content Import & Library Management

**Description:** Users can import reading content from multiple sources and organize their personal library.

**User Story:** As a reader, I want to easily add books and articles from various sources so that I can read everything in one place with AI-powered comprehension support.

**Acceptance Criteria:**

- [ ] Upload support for: PDF, EPUB, DOC/DOCX, plain text files
- [ ] Import from URL (articles, web pages)
- [ ] Paste text directly
- [ ] Built-in library integration:
  - [ ] Google Books API (search and add public domain/preview books)
  - [ ] Open Library API (access to millions of free books)
- [ ] Store content in user's personal library
- [ ] Library organization:
  - [ ] Folders/collections (nestable)
  - [ ] Tags (user-created, color-coded)
  - [ ] Custom shelves (books can be on multiple shelves)
  - [ ] Reading lists (ordered, shareable)
  - [ ] Status filters: Want to Read, Reading, Completed, Abandoned
- [ ] Advanced search and filtering:
  - [ ] **Full-text search** across title, author, and content
  - [ ] **Filter by status** (Want to Read, Reading, Completed, Abandoned)
  - [ ] **Filter by genre/category** (Fiction, Non-fiction, Academic, Technical, etc.)
  - [ ] **Filter by tags** (user-created tags, multiple select)
  - [ ] **Filter by reading progress** (Not started, 1-25%, 26-50%, 51-75%, 76-99%, Completed)
  - [ ] **Filter by date** (date added, date started, date completed)
  - [ ] **Filter by file type** (EPUB, PDF, DOC/DOCX, Text, URL)
  - [ ] **Filter by source** (Uploaded, Google Books, Open Library, URL, Pasted)
  - [ ] **Combine filters** (multiple filters work together)
  - [ ] **Sort options**:
    - [ ] Title (A-Z, Z-A)
    - [ ] Author (A-Z, Z-A)
    - [ ] Date added (newest first, oldest first)
    - [ ] Last read (most recent first)
    - [ ] Reading progress (most complete first, least complete first)
    - [ ] Rating (if user has rated books)
  - [ ] **Bulk actions**:
    - [ ] Multi-select books with checkboxes
    - [ ] Bulk add to collection
    - [ ] Bulk add to shelf
    - [ ] Bulk change status
    - [ ] Bulk add tags
    - [ ] Bulk delete (with confirmation)
  - [ ] **Search within book** (when reading):
    - [ ] Full-text search within current book
    - [ ] Navigate to search results
    - [ ] Highlight search term in text
  - [ ] **Save search queries** (favorite filters for quick access)
- [ ] Reading progress sync across devices
- [ ] Offline storage for downloaded content
- [ ] File storage on Cloudflare R2

**Content Handling:**

- Store uploaded content for personal use only
- URL imports: extract and store text for personal use
- Respect copyright: only provide access to public domain or user-owned content
- Clear user data on account deletion

---

#### 2. AI-Generated Pre-Reading Guides

**Description:** Before reading, AI generates comprehensive guides to prepare users for the text, adapted to the genre and content type.

**User Story:** As a reader, I want to understand the context and key concepts before I start reading so that I can comprehend and retain more from the text.

**Acceptance Criteria:**

- [ ] Generate pre-reading guide on demand (button click)
- [ ] Guide components (adaptive based on text type):
  - [ ] **Vocabulary Preview:** Key terms, definitions, pronunciation
  - [ ] **Key Arguments/Thesis:** Main points the text will make
  - [ ] **Chapter/Section Summaries:** Brief overview of each part
  - [ ] **Historical Context:** Time period, relevant events, cultural background
  - [ ] **Author Context:** Who they are, why they wrote this, their perspective
  - [ ] **Intellectual Context:** What arguments/authors this text responds to
  - [ ] **Related Works:** Other texts in conversation with this one
  - [ ] **Key Themes:** What to watch for while reading
  - [ ] **Reading Objectives:** Learning goals for the text
- [ ] Adapt guide depth based on:
  - [ ] Text genre (fiction, academic, news, technical)
  - [ ] Text length
  - [ ] User's reading level
  - [ ] User's prior knowledge (from past reading/assessments)
- [ ] Regenerate guide with different focus
- [ ] Save guide for offline access
- [ ] AI features can be disabled globally or per-text
- [ ] Log AI usage for cost tracking

---

#### 3. Reading Interface

**Description:** A best-in-class reading experience with comprehensive features, fully configurable to user preferences.

**User Story:** As a reader, I want a comfortable, feature-rich reading interface so that I can focus on reading while having tools available when I need them.

**Core Reading Features:**

- [ ] Clean, distraction-free reading view
- [ ] Adjustable typography:
  - [ ] Font family (including dyslexia-friendly options like OpenDyslexic)
  - [ ] Font size
  - [ ] Line height
  - [ ] Letter spacing
  - [ ] Margins/padding
- [ ] Themes:
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] Sepia
  - [ ] High contrast (WCAG AAA)
  - [ ] Custom themes
- [ ] Progress tracking:
  - [ ] Current position indicator
  - [ ] Percentage complete
  - [ ] Estimated time remaining
  - [ ] Reading speed calculation

**Annotation Features:**

- [ ] Highlighting (multiple colors)
- [ ] Inline notes/annotations
- [ ] Bookmarks
- [ ] Split-screen notes panel
- [ ] Export annotations (Markdown, PDF)

**Reference Features:**

- [ ] Dictionary lookup (tap word)
- [ ] Translation (configurable target language)
- [ ] Wikipedia quick lookup
- [ ] "Explain this" AI feature (contextual explanation)

**Advanced Features:**

- [ ] Speed reading mode (RSVP - Rapid Serial Visual Presentation)
- [ ] Focus mode (hide UI, dim surroundings)
- [ ] Bionic reading option (bold first letters)
- [ ] Column width control
- [ ] Two-page spread view (desktop)

**Configurable Interface:**

- [ ] Show/hide any feature via settings
- [ ] Customizable toolbar
- [ ] Keyboard shortcuts
- [ ] Gesture controls (mobile)
- [ ] Remember settings per user

**Offline Support:**

- [ ] Download books for offline reading
- [ ] Sync progress when back online
- [ ] Offline annotations (sync later)

---

#### 4. AI Reading Assistance (During Reading)

**Description:** Contextual AI help while reading, available on-demand without interrupting flow.

**User Story:** As a reader, I want to get help understanding difficult passages without leaving the reading interface so that I can maintain my reading momentum.

**Acceptance Criteria:**

- [ ] Tap/select word or passage for AI context
- [ ] "Explain this" button - plain language explanation
- [ ] "Why is this important?" - significance in context
- [ ] "Connect to earlier" - link to previous concepts
- [ ] Ask custom questions about selected text
- [ ] AI chat sidebar for deeper discussion
- [ ] Comprehension check-ins:
  - [ ] Optional prompts at chapter/section breaks
  - [ ] Quick questions to verify understanding
  - [ ] Frequency configurable (never, sometimes, always)
- [ ] All AI features can be disabled
- [ ] Responses consider user's reading level and history

---

#### 5. Text-to-Speech (TTS)

**Description:** High-quality text-to-speech with multiple voice options and sync with manual reading.

**User Story:** As a reader, I want to listen to my books with natural-sounding voices so that I can read while commuting, exercising, or resting my eyes.

**Acceptance Criteria:**

- [ ] **Free Tier:** Browser Web Speech API (basic quality)
- [ ] **Pro Tier:** OpenAI TTS (natural quality)
- [ ] **Scholar Tier:** ElevenLabs (premium quality)
- [ ] Multiple voice options per tier
- [ ] Adjustable playback speed (0.5x - 3x)
- [ ] Highlight words as spoken
- [ ] Sync reading position with TTS position
- [ ] Play/pause/skip controls
- [ ] Sleep timer
- [ ] Background playback (mobile)
- [ ] Download as audio file (Pro/Scholar, limits apply):
  - [ ] Pro: 5 books/month
  - [ ] Scholar: Unlimited
  - [ ] Formats: MP3, M4A
- [ ] Chapter/section navigation while playing

---

#### 6. Post-Reading Assessments

**Description:** AI-generated comprehension assessments grounded in pedagogical research.

**User Story:** As a reader, I want to test my understanding after reading so that I can identify gaps and reinforce what I learned.

**Assessment Framework (Bloom's Taxonomy):**

- [ ] **Remember:** Recall facts and basic concepts
- [ ] **Understand:** Explain ideas, summarize
- [ ] **Apply:** Use information in new situations
- [ ] **Analyze:** Draw connections, identify patterns
- [ ] **Evaluate:** Justify decisions, critique arguments
- [ ] **Create:** Produce new work based on reading

**Question Types:**

- [ ] Multiple choice (4 options)
- [ ] Short answer (AI-graded with feedback)
- [ ] Passage identification ("Where did the author say X?")
- [ ] Theme identification
- [ ] Character/argument analysis
- [ ] Summary writing (AI-graded)

**Adaptive Difficulty:**

- [ ] Start at estimated user level
- [ ] Increase difficulty on correct answers
- [ ] Decrease on incorrect
- [ ] Track mastery per Bloom's level
- [ ] Personalize based on past performance

**Feedback:**

- [ ] Immediate feedback on answers
- [ ] Explanations for correct answers
- [ ] Links back to relevant passages
- [ ] Overall comprehension score
- [ ] Breakdown by skill area

**Lexile/Reading Level Integration:**

- [ ] Estimate text difficulty
- [ ] Track user's reading level over time
- [ ] Recommend appropriately challenging texts

---

#### 7. Spaced Repetition System (SRS)

**Description:** Gamified flashcard system using spaced repetition to ensure long-term retention.

**User Story:** As a reader, I want to review key concepts at optimal intervals so that I remember what I've read long after finishing a book.

**Card Types (Auto-generated from reading):**

- [ ] Vocabulary cards (word, definition, context sentence)
- [ ] Key concept cards (concept, explanation, source)
- [ ] Comprehension cards (question, answer, passage reference)
- [ ] Quote cards (quote, significance, source)

**SRS Algorithm:**

- [ ] Based on SM-2 algorithm (proven effective)
- [ ] Intervals increase with correct recalls
- [ ] Intervals decrease with incorrect recalls
- [ ] "Again", "Hard", "Good", "Easy" buttons
- [ ] Daily review queue
- [ ] Configurable daily card limit

**Gamification:**

- [ ] XP for completing reviews
- [ ] Streak tracking (daily reviews)
- [ ] Levels and progression
- [ ] Achievements/badges:
  - [ ] "First Review"
  - [ ] "7-Day Streak"
  - [ ] "100 Cards Mastered"
  - [ ] "Speed Reader"
  - [ ] etc.
- [ ] Leaderboards (opt-in, friends or global)
- [ ] Daily/weekly challenges
- [ ] Visual progress indicators

**Management:**

- [ ] Browse all cards
- [ ] Edit/delete cards
- [ ] Create manual cards
- [ ] Tag cards
- [ ] Filter by book, status, difficulty
- [ ] Suspend/unsuspend cards

---

#### 8. Reading Analytics Dashboard

**Description:** Comprehensive, customizable analytics showing reading progress and comprehension trends.

**User Story:** As a reader, I want to see my reading statistics and progress so that I can understand my habits and improvement over time.

**Metrics:**

- [ ] Books/articles completed
- [ ] Pages/words read (daily, weekly, monthly, all-time)
- [ ] Reading time (with breakdown by day/week)
- [ ] Average reading speed (WPM)
- [ ] Reading streaks
- [ ] Genres/categories read
- [ ] Vocabulary learned
- [ ] SRS statistics:
  - [ ] Cards due/reviewed/mastered
  - [ ] Retention rate
  - [ ] Streak length
- [ ] Comprehension scores over time
- [ ] Bloom's Taxonomy skill breakdown
- [ ] Reading level progression

**Customization:**

- [ ] Drag-and-drop dashboard layout
- [ ] Show/hide individual widgets
- [ ] Date range filters
- [ ] Export data (CSV, JSON)

**Visualizations:**

- [ ] Reading calendar heatmap
- [ ] Progress charts
- [ ] Skill radar chart
- [ ] Goal progress bars

---

#### 9. AI Personality & Preferences

**Description:** Customizable AI tutor personality and behavior settings.

**User Story:** As a reader, I want to customize how the AI interacts with me so that it feels supportive and matches my learning style.

**Personality Options:**

- [ ] Encouraging Tutor (default) - supportive, celebratory
- [ ] Neutral Assistant - factual, minimal personality
- [ ] Socratic Guide - asks questions, promotes thinking
- [ ] Custom tone (user-defined prompt addition)

**AI Behavior Settings:**

- [ ] Verbosity level (concise to detailed)
- [ ] Language complexity (match my level, challenge me, simplify)
- [ ] Proactive suggestions (on/off)
- [ ] Comprehension check frequency
- [ ] Disable all AI features (global toggle)
- [ ] Disable AI per-book

---

#### 10. Curriculum Builder

**Description:** Create and share structured reading curriculums/reading lists.

**User Story:** As an educator or avid reader, I want to create themed reading lists with structure so that I can guide others through a topic systematically.

**Acceptance Criteria:**

- [ ] Create curriculum with:
  - [ ] Title, description, cover image
  - [ ] Target audience / difficulty level
  - [ ] Estimated completion time
  - [ ] Ordered list of texts
  - [ ] Notes/instructions per text
  - [ ] Learning objectives
- [ ] Add texts from:
  - [ ] Personal library
  - [ ] Built-in library search (Google Books, Open Library)
  - [ ] URL
- [ ] Visibility: Private, Unlisted (link), Public
- [ ] Share link to curriculum
- [ ] Browse public curriculums:
  - [ ] Categories/topics
  - [ ] Search
  - [ ] Sort by popularity, recent, rating
- [ ] Follow/save curriculums
- [ ] Track progress through curriculum
- [ ] Curriculum marketplace (future: paid curriculums)

---

#### 11. Social Features

**Description:** Community features for discussing readings and connecting with other readers.

**User Story:** As a reader, I want to connect with others reading the same books so that I can discuss ideas and stay motivated.

**Profiles:**

- [ ] User profiles (public/private toggle)
- [ ] Display: username, avatar, bio, reading stats (opt-in)
- [ ] Currently reading
- [ ] Reading history (opt-in)
- [ ] Shared highlights/notes (opt-in)
- [ ] Curriculums created
- [ ] Badges/achievements

**Reading Groups:**

- [ ] Create reading groups (book clubs)
- [ ] Invite members
- [ ] Shared reading progress
- [ ] Group discussion threads per book/chapter
- [ ] Group challenges
- [ ] Group leaderboards
- [ ] Public vs. private groups

**Social Interactions:**

- [ ] Follow other users
- [ ] Activity feed (friends' reading activity)
- [ ] Like/comment on shared highlights
- [ ] Share progress to social media
- [ ] Reading recommendations from friends

**Privacy:**

- [ ] All social features opt-in
- [ ] Reading activity private by default
- [ ] Granular privacy controls
- [ ] Block/mute users

---

#### 12. Community Forum

**Description:** Discussion forum for the Read Master community.

**User Story:** As a user, I want a place to discuss books, get help, suggest features, and connect with other readers outside of reading groups.

**Forum Categories:**

- [ ] **Book Discussions** - organized by genre/topic
- [ ] **Reading Strategies** - tips and techniques
- [ ] **Feature Requests** - suggest and vote on new features
- [ ] **Bug Reports** - report issues
- [ ] **Help & Support** - ask questions
- [ ] **Curriculum Sharing** - discuss and share curriculums
- [ ] **Introductions** - new member welcomes
- [ ] **Off-Topic** - general discussion

**Forum Features:**

- [ ] Create threads
- [ ] Reply with rich text formatting
- [ ] Upvote/downvote posts
- [ ] Mark best answer
- [ ] Subscribe to threads
- [ ] Notifications
- [ ] Search forum
- [ ] User reputation system
- [ ] Pin important threads (moderators)

**Moderation:**

- [ ] Report posts
- [ ] Moderator roles
- [ ] Profanity filter
- [ ] Content moderation for publicly visible text
- [ ] Spam detection
- [ ] User bans/timeouts

---

#### 13. Internationalization (i18n)

**Description:** Multi-language support for the application interface and content.

**User Story:** As a non-English speaker, I want to use the app in my native language so that I can navigate easily and focus on reading.

**Supported Languages (Launch):**

- [ ] English (default)
- [ ] Arabic (RTL support)
- [ ] Spanish
- [ ] Japanese
- [ ] Chinese (Simplified)
- [ ] Tagalog

**Implementation:**

- [ ] All UI strings externalized
- [ ] Language switcher in settings
- [ ] RTL layout support
- [ ] Date/time localization
- [ ] Number formatting
- [ ] AI responses in user's language preference
- [ ] Translation feature works across all supported languages

---

#### 14. User Authentication & Accounts

**Description:** Secure user accounts with OAuth and profile management.

**User Story:** As a user, I want secure access to my account and reading data across all my devices.

**Acceptance Criteria:**

- [ ] Clerk authentication
- [ ] Sign up / Sign in (email, Google, Apple)
- [ ] Password reset
- [ ] Email verification
- [ ] Profile management
- [ ] Connected accounts (Google for Books API)
- [ ] Session management
- [ ] Two-factor authentication (optional)
- [ ] Account deletion with full data removal
- [ ] Data export (GDPR)

---

#### 15. Settings & Preferences

**Description:** Comprehensive settings for customizing the app experience.

**Categories:**

- [ ] **Account:** Profile, password, connected accounts, data export, delete account
- [ ] **Reading:** Default font, theme, speed reading settings, TTS preferences
- [ ] **AI:** Personality, verbosity, disable AI, comprehension check frequency
- [ ] **Notifications:** Email preferences, push notifications, reminders
- [ ] **Privacy:** Profile visibility, activity sharing, data usage opt-in
- [ ] **Accessibility:** Screen reader, high contrast, reduced motion, font options
- [ ] **Language:** Interface language, translation target language
- [ ] **Subscription:** Current plan, billing, upgrade

---

### Nice-to-Have Features (Post-MVP)

- Integration with Kindle, Google Play Books, Apple Books
- News API integration for article imports
- arXiv API integration for academic papers
- Browser extension for one-click article save
- Native mobile apps (React Native)
- Native desktop apps (Electron or Tauri)
- Collaborative annotation
- AI-generated audiobook narration (full books)
- PDF annotation tools (highlights on original PDF)
- OCR for scanned book images
- Reading goal setting (books per year, pages per day)
- Curriculum marketplace (paid curriculums with revenue share)
- API for developers
- LMS integrations (Canvas, Blackboard)
- Institutional admin dashboard
- White-label options

---

## Technical Specifications

### Platform/Technology Stack

**Frontend:**

- React 18 + TypeScript
- Vite (build tool)
- Material-UI (MUI) for components
- Zustand (client state)
- React Query (server state)
- React Hook Form
- i18next (internationalization)
- epub.js (EPUB rendering)
- PDF.js (PDF rendering)
- Service Workers (offline support)
- IndexedDB (local storage)

**Backend:**

- Vercel Serverless Functions
- TypeScript
- Zod (validation)
- Winston (logging)
- Compression middleware

**Database & Cache:**

- Prisma ORM
- Vercel Postgres (Neon)
- Upstash Redis

**Database Development Practices:**

⚠️ **CRITICAL: Seed Data Must Be Updated with Schema Changes**

- **All new models** must have corresponding seed data in `packages/database/prisma/seed.ts`
- **All model modifications** that add required fields must update existing seed data
- **Seed data requirements:**
  - Provide realistic, representative sample data
  - Include edge cases and various data states
  - Cover all relationships and foreign keys
  - Include data for all subscription tiers (Free, Pro, Scholar)
  - Include data for all user types and permissions
  - Ensure data supports all test scenarios
- **When to update seeds:**
  - Adding a new model → Add multiple seed records
  - Adding a required field → Update all existing seed records
  - Adding an enum → Include examples of all enum values
  - Adding a relationship → Ensure related records exist
  - Modifying constraints → Ensure seed data respects constraints
- **Why this matters:**
  - Development databases have realistic test data
  - Tests can run against consistent seed data
  - New developers can quickly set up working environments
  - Demo/preview environments have good sample data
  - Catches constraint and validation issues early

**File Storage:**

- Cloudflare R2 (books, audio files)

**Authentication:**

- Clerk

**AI:**

- Vercel AI SDK
- Anthropic Claude API

**Text-to-Speech:**

- Web Speech API (free tier)
- OpenAI TTS API (Pro tier)
- ElevenLabs API (Scholar tier)

**External APIs:**

- Google Books API
- Open Library API

**Development:**

- pnpm workspaces (monorepo)
- Vitest (testing)
- ESLint + Prettier
- Husky (git hooks)
- TypeScript strict mode

**Deployment:**

- Vercel (frontend + API)
- Vercel Cron Jobs
- Cloudflare R2

### Monorepo Structure

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
│   │   │   │   └── common/     # Shared components
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── locales/        # i18n translation files
│   │   │   └── styles/
│   │   └── public/
│   └── api/                    # Vercel serverless
│       └── src/
│           ├── routes/
│           ├── middleware/
│           ├── services/
│           └── utils/
├── packages/
│   ├── database/               # Prisma
│   ├── shared/                 # Types, schemas, utils
│   ├── ai/                     # AI prompts
│   └── config/                 # Shared configs
├── scripts/
├── .env.example
├── vercel.json
└── package.json
```

### Data Models (Prisma Schema)

```prisma
// User & Auth
model User {
  id                String    @id @default(uuid())
  clerkId           String    @unique
  email             String
  username          String    @unique
  displayName       String?
  avatar            String?
  bio               String?
  language          String    @default("en")
  timezone          String    @default("UTC")
  readingLevel      Float?    // Estimated Lexile score
  preferences       Json      // All user preferences
  isPublic          Boolean   @default(false)
  aiEnabled         Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  // Relations
  books             Book[]
  readingProgress   ReadingProgress[]
  annotations       Annotation[]
  flashcards        Flashcard[]
  assessments       Assessment[]
  curriculums       Curriculum[]
  readingGroups     ReadingGroupMember[]
  forumPosts        ForumPost[]
  followers         Follow[] @relation("following")
  following         Follow[] @relation("followers")
}

// Content
model Book {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])

  title             String
  author            String?
  description       String?
  coverImage        String?
  source            BookSource
  sourceId          String?   // External API ID
  sourceUrl         String?
  filePath          String?   // R2 path
  fileType          FileType
  language          String    @default("en")
  wordCount         Int?
  estimatedReadTime Int?      // minutes
  lexileScore       Float?
  genre             String?
  tags              String[]

  status            ReadingStatus @default(WANT_TO_READ)
  isPublic          Boolean   @default(false)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  // Relations
  chapters          Chapter[]
  readingProgress   ReadingProgress[]
  annotations       Annotation[]
  preReadingGuide   PreReadingGuide?
  assessments       Assessment[]
  flashcards        Flashcard[]
  curriculumItems   CurriculumItem[]
}

enum BookSource {
  UPLOAD
  URL
  PASTE
  GOOGLE_BOOKS
  OPEN_LIBRARY
}

enum FileType {
  PDF
  EPUB
  DOC
  DOCX
  TXT
  HTML
}

enum ReadingStatus {
  WANT_TO_READ
  READING
  COMPLETED
  ABANDONED
}

model Chapter {
  id                String    @id @default(uuid())
  bookId            String
  book              Book      @relation(fields: [bookId], references: [id])

  title             String?
  orderIndex        Int
  startPosition     Int       // Character offset
  endPosition       Int
  wordCount         Int?

  createdAt         DateTime  @default(now())
}

// Reading Progress
model ReadingProgress {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  bookId            String
  book              Book      @relation(fields: [bookId], references: [id])

  currentPosition   Int       @default(0)
  percentage        Float     @default(0)
  totalReadTime     Int       @default(0) // seconds
  lastReadAt        DateTime  @default(now())
  startedAt         DateTime  @default(now())
  completedAt       DateTime?

  @@unique([userId, bookId])
}

// Annotations
model Annotation {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  bookId            String
  book              Book      @relation(fields: [bookId], references: [id])

  type              AnnotationType
  startOffset       Int
  endOffset         Int
  selectedText      String?
  note              String?
  color             String?   // For highlights
  isPublic          Boolean   @default(false)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
}

enum AnnotationType {
  HIGHLIGHT
  NOTE
  BOOKMARK
}

// AI-Generated Content
model PreReadingGuide {
  id                String    @id @default(uuid())
  bookId            String    @unique
  book              Book      @relation(fields: [bookId], references: [id])

  vocabulary        Json      // Array of {word, definition, pronunciation}
  keyArguments      Json      // Main thesis/arguments
  chapterSummaries  Json      // Per-chapter summaries
  historicalContext String?   @db.Text
  authorContext     String?   @db.Text
  intellectualContext String? @db.Text
  relatedWorks      Json?     // Array of related texts
  keyThemes         String[]
  readingObjectives String[]

  generatedAt       DateTime  @default(now())
  version           Int       @default(1)
}

// Assessments
model Assessment {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  bookId            String
  book              Book      @relation(fields: [bookId], references: [id])

  type              AssessmentType
  questions         Json      // Array of questions
  answers           Json      // User's answers
  score             Float?
  bloomsBreakdown   Json?     // Score per Bloom's level
  feedback          String?   @db.Text

  startedAt         DateTime  @default(now())
  completedAt       DateTime?
}

enum AssessmentType {
  POST_READING
  CHAPTER_CHECK
  QUICK_CHECK
}

// SRS Flashcards
model Flashcard {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  bookId            String?
  book              Book?     @relation(fields: [bookId], references: [id])

  type              FlashcardType
  front             String    @db.Text
  back              String    @db.Text
  context           String?   // Source passage
  tags              String[]

  // SRS fields (SM-2)
  easeFactor        Float     @default(2.5)
  interval          Int       @default(0)    // days
  repetitions       Int       @default(0)
  dueDate           DateTime  @default(now())
  lastReviewedAt    DateTime?

  status            FlashcardStatus @default(NEW)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
}

enum FlashcardType {
  VOCABULARY
  CONCEPT
  COMPREHENSION
  QUOTE
  CUSTOM
}

enum FlashcardStatus {
  NEW
  LEARNING
  REVIEW
  SUSPENDED
}

model FlashcardReview {
  id                String    @id @default(uuid())
  flashcardId       String
  flashcard         Flashcard @relation(fields: [flashcardId], references: [id])
  userId            String

  rating            Int       // 1=Again, 2=Hard, 3=Good, 4=Easy
  responseTime      Int       // milliseconds

  reviewedAt        DateTime  @default(now())
}

// Gamification
model UserStats {
  id                String    @id @default(uuid())
  userId            String    @unique

  totalXP           Int       @default(0)
  level             Int       @default(1)
  currentStreak     Int       @default(0)
  longestStreak     Int       @default(0)
  lastActiveDate    DateTime?

  booksCompleted    Int       @default(0)
  totalWordsRead    Int       @default(0)
  totalReadTime     Int       @default(0) // seconds
  cardsReviewed     Int       @default(0)
  cardsMastered     Int       @default(0)

  updatedAt         DateTime  @updatedAt
}

model Achievement {
  id                String    @id @default(uuid())
  code              String    @unique
  name              String
  description       String
  icon              String
  xpReward          Int
  criteria          Json      // Conditions to unlock
}

model UserAchievement {
  id                String    @id @default(uuid())
  userId            String
  achievementId     String
  achievement       Achievement @relation(fields: [achievementId], references: [id])

  unlockedAt        DateTime  @default(now())

  @@unique([userId, achievementId])
}

// Curriculums
model Curriculum {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])

  title             String
  description       String?   @db.Text
  coverImage        String?
  targetAudience    String?
  difficulty        String?
  estimatedTime     String?
  learningObjectives String[]

  visibility        Visibility @default(PRIVATE)
  followCount       Int       @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  items             CurriculumItem[]
  followers         CurriculumFollow[]
}

enum Visibility {
  PRIVATE
  UNLISTED
  PUBLIC
}

model CurriculumItem {
  id                String    @id @default(uuid())
  curriculumId      String
  curriculum        Curriculum @relation(fields: [curriculumId], references: [id])
  bookId            String?
  book              Book?     @relation(fields: [bookId], references: [id])

  orderIndex        Int
  title             String    // Can be book title or custom
  externalUrl       String?   // For books not in system
  notes             String?   @db.Text

  createdAt         DateTime  @default(now())
}

model CurriculumFollow {
  id                String    @id @default(uuid())
  userId            String
  curriculumId      String
  curriculum        Curriculum @relation(fields: [curriculumId], references: [id])

  currentItemIndex  Int       @default(0)
  followedAt        DateTime  @default(now())

  @@unique([userId, curriculumId])
}

// Social
model Follow {
  id                String    @id @default(uuid())
  followerId        String
  follower          User      @relation("followers", fields: [followerId], references: [id])
  followingId       String
  following         User      @relation("following", fields: [followingId], references: [id])

  createdAt         DateTime  @default(now())

  @@unique([followerId, followingId])
}

model ReadingGroup {
  id                String    @id @default(uuid())
  name              String
  description       String?
  coverImage        String?
  isPublic          Boolean   @default(false)
  createdById       String

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  members           ReadingGroupMember[]
  discussions       GroupDiscussion[]
}

model ReadingGroupMember {
  id                String    @id @default(uuid())
  groupId           String
  group             ReadingGroup @relation(fields: [groupId], references: [id])
  userId            String
  user              User      @relation(fields: [userId], references: [id])

  role              GroupRole @default(MEMBER)
  joinedAt          DateTime  @default(now())

  @@unique([groupId, userId])
}

enum GroupRole {
  OWNER
  ADMIN
  MEMBER
}

model GroupDiscussion {
  id                String    @id @default(uuid())
  groupId           String
  group             ReadingGroup @relation(fields: [groupId], references: [id])
  userId            String

  title             String
  content           String    @db.Text
  bookId            String?
  chapterId         String?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  replies           DiscussionReply[]
}

model DiscussionReply {
  id                String    @id @default(uuid())
  discussionId      String
  discussion        GroupDiscussion @relation(fields: [discussionId], references: [id])
  userId            String
  parentReplyId     String?

  content           String    @db.Text

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
}

// Forum
model ForumCategory {
  id                String    @id @default(uuid())
  name              String
  slug              String    @unique
  description       String?
  orderIndex        Int
  icon              String?

  posts             ForumPost[]
}

model ForumPost {
  id                String    @id @default(uuid())
  categoryId        String
  category          ForumCategory @relation(fields: [categoryId], references: [id])
  userId            String
  user              User      @relation(fields: [userId], references: [id])

  title             String
  content           String    @db.Text
  isPinned          Boolean   @default(false)
  isLocked          Boolean   @default(false)
  viewCount         Int       @default(0)
  upvotes           Int       @default(0)
  downvotes         Int       @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  replies           ForumReply[]
  votes             ForumVote[]
}

model ForumReply {
  id                String    @id @default(uuid())
  postId            String
  post              ForumPost @relation(fields: [postId], references: [id])
  userId            String
  parentReplyId     String?

  content           String    @db.Text
  isBestAnswer      Boolean   @default(false)
  upvotes           Int       @default(0)
  downvotes         Int       @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  votes             ForumVote[]
}

model ForumVote {
  id                String    @id @default(uuid())
  userId            String
  postId            String?
  post              ForumPost? @relation(fields: [postId], references: [id])
  replyId           String?
  reply             ForumReply? @relation(fields: [replyId], references: [id])

  value             Int       // 1 or -1

  createdAt         DateTime  @default(now())

  @@unique([userId, postId])
  @@unique([userId, replyId])
}

// AI Usage & Cost Tracking
model AIUsageLog {
  id                String    @id @default(uuid())
  userId            String
  operation         String    // pre_reading_guide, assessment, explanation, etc.
  model             String
  inputTokens       Int
  outputTokens      Int
  cost              Decimal   @db.Decimal(10, 6)
  duration          Int       // ms
  success           Boolean
  errorMessage      String?

  createdAt         DateTime  @default(now())
}

// Audit Log
model AuditLog {
  id                String    @id @default(uuid())
  userId            String
  entityType        String
  entityId          String
  action            String
  changes           Json

  timestamp         DateTime  @default(now())

  @@index([userId])
  @@index([entityType, entityId])
}
```

### External APIs

**Google Books API:**

- Search books by title, author, ISBN
- Get book metadata (title, author, description, cover)
- Access public domain full text
- Endpoints: `volumes.list`, `volumes.get`

**Open Library API:**

- Search and retrieve book data
- Access to full texts (public domain)
- Endpoints: `/search.json`, `/works/{id}.json`, `/isbn/{isbn}.json`

### Cron Jobs (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/srs-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/streak-check",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cleanup-expired",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

---

## Monetization Model

### Free Tier

- 3 books in library
- Basic pre/post reading guides (shorter)
- 5 AI interactions/day
- Basic TTS (Web Speech API)
- SRS: 50 active flashcards max
- Basic analytics
- Join reading groups (can't create)
- Forum access
- Ads shown

### Pro Tier ($9.99/month or $79.99/year)

- Unlimited library
- Full AI guides (comprehensive)
- 100 AI interactions/day
- Premium TTS (OpenAI)
- TTS downloads: 5 books/month
- Unlimited flashcards
- Full analytics dashboard
- Create reading groups & curriculums
- No ads
- Priority support

### Scholar Tier ($19.99/month or $149.99/year)

- Everything in Pro
- Unlimited AI interactions
- Best TTS (ElevenLabs)
- Unlimited TTS downloads
- API access
- Early access to features
- Academic citation exports
- Bulk import tools
- White-label curriculum sharing

### Additional Revenue

- **Institutional Licenses:** Schools, universities, libraries (custom pricing)
- **AI Credits:** Pay-as-you-go for free users ($5 = 100 credits)
- **Curriculum Marketplace:** (Future) Creators sell premium curriculums (70/30 split)

---

## Accessibility (WCAG 2.2 AAA)

### Requirements

- [ ] Screen reader full support (ARIA labels, roles)
- [ ] Keyboard navigation for all features
- [ ] Focus indicators clearly visible
- [ ] Skip navigation links
- [ ] High contrast mode
- [ ] Minimum contrast ratio 7:1 (AAA)
- [ ] Dyslexia-friendly fonts (OpenDyslexic)
- [ ] Adjustable text spacing
- [ ] No content with flashing >3 times/second
- [ ] Captions for any video content
- [ ] Reduced motion option
- [ ] Target touch size minimum 44x44px
- [ ] Error identification and suggestions
- [ ] Consistent navigation
- [ ] Multiple ways to find content
- [ ] Visible focus order
- [ ] Timeouts adjustable/extendable
- [ ] Reading level indicators

---

## Admin Analytics Dashboard

**Purpose:** Provide product owner with comprehensive insights into business health, user behavior, and feature adoption.

**Access:** Admin-only (SUPER_ADMIN and ADMIN roles)

**User Story:** As a product owner, I want to see key business metrics, user engagement, and feature adoption in real-time so that I can make data-driven decisions about product direction and identify issues early.

### Core Analytics Features

#### Business Metrics

**Revenue Analytics:**

- [ ] Monthly Recurring Revenue (MRR)
- [ ] Annual Recurring Revenue (ARR)
- [ ] Revenue by subscription tier (Free, Pro, Scholar)
- [ ] Revenue trends over time (daily, weekly, monthly)
- [ ] New revenue vs. churned revenue
- [ ] Average Revenue Per User (ARPU)
- [ ] Lifetime Value (LTV) per user
- [ ] Churn rate and churn reasons
- [ ] Conversion rate (Free → Pro → Scholar)

**User Metrics:**

- [ ] Total users (all-time)
- [ ] Active users (last 30 days)
- [ ] New signups over time
- [ ] User distribution by subscription tier
- [ ] User growth rate (daily, weekly, monthly)
- [ ] User retention cohorts
- [ ] Geographic distribution
- [ ] Inactive/at-risk users

#### Product Metrics

**Engagement Analytics:**

- [ ] Daily Active Users (DAU)
- [ ] Weekly Active Users (WAU)
- [ ] Monthly Active Users (MAU)
- [ ] DAU/MAU ratio (stickiness)
- [ ] Average session duration
- [ ] Sessions per user per day
- [ ] Books read per user
- [ ] Reading completion rates
- [ ] Average reading time per day
- [ ] Return rate (% users who come back)

**Feature Adoption:**

- [ ] AI features usage percentage
  - [ ] Pre-reading guide generation
  - [ ] "Explain this" feature
  - [ ] AI chat
  - [ ] Comprehension checks
  - [ ] AI assessments
  - [ ] AI flashcard generation
- [ ] SRS flashcard adoption rate
- [ ] Flashcard review completion rate
- [ ] Annotation usage (highlights, notes, bookmarks)
- [ ] TTS usage by tier
- [ ] Social features engagement
  - [ ] Profile views
  - [ ] Follows
  - [ ] Shared highlights
- [ ] Forum activity
  - [ ] Posts created
  - [ ] Replies posted
  - [ ] Active discussions
- [ ] Reading groups participation
- [ ] Curriculum usage

**Content Analytics:**

- [ ] Most popular books
- [ ] Most popular genres
- [ ] Most popular authors
- [ ] Average book length read
- [ ] Upload vs. external library ratio
- [ ] Content types distribution (EPUB, PDF, DOC, text)
- [ ] Public domain vs. owned content
- [ ] Books completed vs. abandoned

#### Technical Metrics

**Performance:**

- [ ] API response times by endpoint
- [ ] Error rates by endpoint
- [ ] Slow queries (> 1s)
- [ ] Database connection pool usage
- [ ] Redis cache hit rate
- [ ] Uptime percentage

**AI Cost Tracking:**

- [ ] Total AI spend (30 days)
- [ ] AI cost per active user
- [ ] AI tokens used by feature
- [ ] AI cost trends over time
- [ ] Cost per AI interaction
- [ ] AI efficiency metrics

**Infrastructure:**

- [ ] Vercel function invocations
- [ ] Edge requests
- [ ] Bandwidth usage
- [ ] Storage usage (R2)
- [ ] Database size
- [ ] Redis memory usage

### Dashboard Views

#### 1. Overview Dashboard

**Layout:** Grid of metric cards + key charts

**Metrics Displayed:**

- Total users (with % change)
- Active users (30d)
- MRR (with trend)
- AI costs (30d)
- Books read (30d)
- Conversion rate

**Charts:**

- Users over time (line chart)
- Revenue over time (line chart)
- Feature adoption (bar chart)

**Update Frequency:** Real-time (60-second auto-refresh)

#### 2. Users Dashboard

**Features:**

- [ ] User list with search/filter
- [ ] User growth chart
- [ ] Cohort retention table
- [ ] Users by tier (pie chart)
- [ ] Geographic heatmap
- [ ] User details on click

#### 3. Revenue Dashboard

**Features:**

- [ ] Revenue trends (line chart)
- [ ] Revenue by tier (stacked area)
- [ ] Churn analysis
- [ ] Conversion funnel
- [ ] LTV by cohort
- [ ] Revenue forecasting

#### 4. Engagement Dashboard

**Features:**

- [ ] DAU/WAU/MAU trends
- [ ] Session duration distribution
- [ ] Reading time heatmap (by day/hour)
- [ ] Feature usage table
- [ ] Content popularity
- [ ] User journey funnel

#### 5. AI Costs Dashboard

**Features:**

- [ ] Total costs and trends
- [ ] Cost breakdown by feature (pie)
- [ ] Cost per user trends
- [ ] Tokens used by feature
- [ ] Cost efficiency metrics
- [ ] Alerts for unusual spikes

#### 6. Technical Dashboard

**Features:**

- [ ] API performance metrics
- [ ] Error rate charts
- [ ] Slow query log
- [ ] Infrastructure usage
- [ ] Uptime monitoring
- [ ] Alert configuration

### Data Collection & Storage

**Time-Series Data:**

Create `DailyAnalytics` model for storing daily snapshots:

```prisma
model DailyAnalytics {
  id              String   @id @default(cuid())
  date            DateTime @db.Date @unique

  // User metrics
  totalUsers      Int
  activeUsers     Int
  newSignups      Int
  churned         Int
  freeUsers       Int
  proUsers        Int
  scholarUsers    Int

  // Revenue metrics
  mrr             Decimal  @db.Decimal(10, 2)
  arr             Decimal  @db.Decimal(10, 2)
  newRevenue      Decimal  @db.Decimal(10, 2)
  churnedRevenue  Decimal  @db.Decimal(10, 2)

  // Engagement metrics
  dau             Int
  wau             Int
  mau             Int
  booksRead       Int
  sessionsTotal   Int
  avgSessionMin   Float
  totalReadTimeMin Float

  // Feature usage
  aiInteractions  Int
  flashcardReviews Int
  annotationsCreated Int
  ttsUsage        Int

  // AI costs
  aiCost          Decimal  @db.Decimal(10, 4)
  aiTokens        BigInt
  aiCostPerUser   Decimal  @db.Decimal(10, 4)

  createdAt       DateTime @default(now())

  @@index([date])
}
```

**Cron Job:** Daily at midnight UTC

- Calculate all metrics for previous day
- Store in `DailyAnalytics` table
- Send email summary to admins

**Real-Time Queries:**

- Calculate current day metrics on-demand
- Cache for 5 minutes
- Aggregate from live tables

### Security & Access Control

**Role-Based Access:**

- [ ] Add `UserRole` enum (USER, MODERATOR, ADMIN, SUPER_ADMIN)
- [ ] Add `role` field to User model
- [ ] `requireAdmin` middleware for all admin endpoints
- [ ] Audit logging for all admin actions

**Access Restrictions:**

- Only ADMIN and SUPER_ADMIN can access dashboard
- MODERATOR can see limited stats (content moderation)
- All access attempts logged with timestamp and user

**Data Privacy:**

- Aggregate views only (no PII exposed)
- User-specific data requires additional permission
- Export functionality includes data anonymization
- Compliance with GDPR for EU users

### Analytics API Endpoints

**Admin-Only Endpoints:**

```
GET  /api/admin/analytics/overview
GET  /api/admin/analytics/users
GET  /api/admin/analytics/revenue
GET  /api/admin/analytics/engagement
GET  /api/admin/analytics/features
GET  /api/admin/analytics/ai-costs
GET  /api/admin/analytics/content
GET  /api/admin/analytics/technical
GET  /api/admin/analytics/export

GET  /api/admin/users (user management)
PUT  /api/admin/users/:id/role
PUT  /api/admin/users/:id/tier
DELETE /api/admin/users/:id

POST /api/admin/settings (system configuration)
```

**Response Caching:** 5 minutes
**Rate Limiting:** Strict (10 requests/minute per admin)

### Export Functionality

**Formats:**

- [ ] CSV (for spreadsheet analysis)
- [ ] JSON (for programmatic access)
- [ ] PDF (for reports/presentations)

**Options:**

- Date range selection
- Metric selection (choose which metrics to include)
- Email delivery for large exports

**Use Cases:**

- Monthly board reports
- Investor updates
- Team performance reviews
- Trend analysis in spreadsheets

### Alerting & Notifications

**Email Alerts:**

- [ ] Daily summary (optional, configurable)
- [ ] Unusual AI cost spikes (>50% increase)
- [ ] Churn rate increase (>10% week-over-week)
- [ ] Error rate spikes (>5% of requests)
- [ ] Low conversion rate alerts
- [ ] System downtime alerts

**Alert Configuration:**

- Customizable thresholds
- Multiple recipients
- Alert frequency (immediate, daily digest, weekly)

### Acceptance Criteria

- [ ] All business metrics display correctly
- [ ] Charts render properly and are interactive
- [ ] Data updates in real-time or near real-time
- [ ] Only admins can access dashboard
- [ ] All admin actions are audit logged
- [ ] Mobile responsive (usable on tablet)
- [ ] Export functionality works for all formats
- [ ] Cron job calculates daily metrics correctly
- [ ] Performance is acceptable (dashboard loads in < 3s)
- [ ] No PII exposed in aggregate views

### Future Enhancements

- [ ] Predictive analytics (churn prediction, LTV forecasting)
- [ ] A/B testing framework and results
- [ ] User segmentation and persona analysis
- [ ] Automated insights and anomaly detection
- [ ] Integration with third-party analytics (Google Analytics, Mixpanel)
- [ ] Custom dashboard builder
- [ ] Real-time alerts dashboard
- [ ] Comparison views (this month vs. last month)

---

## Privacy & Legal

### GDPR Compliance

- [ ] Privacy policy
- [ ] Cookie consent banner
- [ ] Data processing transparency
- [ ] Right to access (data export)
- [ ] Right to deletion
- [ ] Right to rectification
- [ ] Data portability (JSON/CSV export)
- [ ] Consent management
- [ ] Data breach notification plan

### Data Handling

- [ ] All data collection opt-in
- [ ] Reading activity private by default
- [ ] Clear data retention policies
- [ ] Encrypted data at rest
- [ ] Encrypted data in transit (HTTPS)
- [ ] User data isolated (multi-tenancy)
- [ ] No selling of user data
- [ ] AI training data opt-in only

### Copyright

- [ ] Only store content for personal use
- [ ] Public domain books via APIs
- [ ] User-owned content uploads
- [ ] DMCA takedown process
- [ ] Terms of service
- [ ] Clear content ownership terms

### Content Moderation

- [ ] Profanity filter for public content
- [ ] Report system for inappropriate content
- [ ] Moderator tools
- [ ] Appeal process
- [ ] Community guidelines

---

## Success Criteria

### The app is successful if:

1. Users show measurable comprehension improvement (pre/post assessment scores)
2. SRS retention rate >80% after 30 days
3. Daily active users return for SRS reviews (DAU/MAU >0.4)
4. Average reading session >15 minutes
5. Users complete >50% of started books (vs. industry ~10%)
6. NPS score >50
7. <2% churn rate monthly (Pro/Scholar)
8. Accessibility audit passes WCAG 2.2 AAA

### Definition of Done (MVP)

- [ ] All must-have features implemented
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Offline reading functional
- [ ] i18n: All 6 languages translated
- [ ] WCAG 2.2 AAA compliant
- [ ] GDPR compliant
- [ ] Performance: <3s initial load, <1s navigation
- [ ] Test coverage >70%
- [ ] Security audit passed
- [ ] Beta tested with 50+ users

---

## Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# AI
ANTHROPIC_API_KEY=

# TTS
OPENAI_API_KEY=
ELEVENLABS_API_KEY=

# File Storage
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=

# External APIs
GOOGLE_BOOKS_API_KEY=

# Optional
SENTRY_DSN=
NODE_ENV=development
```

---

## Development Notes

### Ralph Wiggum Compatibility

This spec is designed for iterative AI development:

- Clear acceptance criteria with checkboxes
- Phased feature breakdown
- Testable success criteria
- Well-defined data models
- Explicit validation rules

### Recommended Build Order

1. Project infrastructure & database
2. Authentication (Clerk)
3. Book upload/import & library
4. Basic reading interface
5. Offline support (Service Workers)
6. Pre-reading guide generation
7. During-reading AI features
8. TTS integration
9. Post-reading assessments
10. SRS system
11. Gamification
12. Social features
13. Forum
14. Curriculums
15. Analytics dashboard
16. i18n
17. Accessibility audit
18. Performance optimization

---

## Resolved Decisions

1. **TTS downloads DRM-protected?** No - use download limits instead (simpler, better UX)
2. **Maximum file size for uploads:** 50MB
3. **Deleted user data retention:** 30 days before permanent deletion
4. **Forum karma thresholds:**
   - 0 karma: Can post, reply, upvote
   - 10 karma: Can downvote
   - 50 karma: Can flag content for review
   - 100 karma: Trusted user badge
   - 500 karma: Can nominate for best answer
5. **Achievement criteria:** See below

---

## Achievement Definitions

### Reading Achievements

| Code         | Name            | Description                 | Criteria                      | XP   |
| ------------ | --------------- | --------------------------- | ----------------------------- | ---- |
| first_book   | First Chapter   | Complete your first book    | booksCompleted >= 1           | 100  |
| bookworm     | Bookworm        | Complete 10 books           | booksCompleted >= 10          | 500  |
| bibliophile  | Bibliophile     | Complete 50 books           | booksCompleted >= 50          | 2000 |
| scholar      | Scholar         | Complete 100 books          | booksCompleted >= 100         | 5000 |
| speed_reader | Speed Reader    | Read 500 WPM average        | avgReadingSpeed >= 500        | 300  |
| marathon     | Marathon Reader | Read for 5 hours in one day | dailyReadTime >= 18000        | 250  |
| night_owl    | Night Owl       | Read past midnight          | readingSession after midnight | 50   |
| early_bird   | Early Bird      | Read before 6 AM            | readingSession before 6am     | 50   |

### Streak Achievements

| Code       | Name        | Description            | Criteria             | XP    |
| ---------- | ----------- | ---------------------- | -------------------- | ----- |
| streak_7   | On Fire     | 7-day reading streak   | currentStreak >= 7   | 100   |
| streak_30  | Dedicated   | 30-day reading streak  | currentStreak >= 30  | 500   |
| streak_100 | Unstoppable | 100-day reading streak | currentStreak >= 100 | 2000  |
| streak_365 | Legendary   | 365-day reading streak | currentStreak >= 365 | 10000 |

### SRS Achievements

| Code         | Name             | Description                                  | Criteria                                     | XP   |
| ------------ | ---------------- | -------------------------------------------- | -------------------------------------------- | ---- |
| first_review | Memory Spark     | Complete first SRS review                    | cardsReviewed >= 1                           | 25   |
| cards_100    | Card Collector   | Review 100 cards                             | cardsReviewed >= 100                         | 200  |
| cards_1000   | Memory Master    | Review 1000 cards                            | cardsReviewed >= 1000                        | 1000 |
| mastered_50  | Getting Sharp    | Master 50 cards                              | cardsMastered >= 50                          | 300  |
| mastered_500 | Steel Trap       | Master 500 cards                             | cardsMastered >= 500                         | 1500 |
| retention_90 | Excellent Recall | 90%+ retention rate                          | retentionRate >= 0.9                         | 500  |
| perfect_day  | Perfect Day      | 100% correct in a review session (10+ cards) | sessionAccuracy == 1.0 && sessionCards >= 10 | 150  |

### Social Achievements

| Code               | Name               | Description                  | Criteria                      | XP   |
| ------------------ | ------------------ | ---------------------------- | ----------------------------- | ---- |
| first_highlight    | Highlighter        | Create first highlight       | highlightsCreated >= 1        | 25   |
| annotator          | Annotator          | Create 100 annotations       | annotationsCreated >= 100     | 300  |
| social_butterfly   | Social Butterfly   | Gain 10 followers            | followersCount >= 10          | 200  |
| influencer         | Influencer         | Gain 100 followers           | followersCount >= 100         | 1000 |
| group_founder      | Group Founder      | Create a reading group       | groupsCreated >= 1            | 150  |
| curriculum_creator | Curriculum Creator | Create a public curriculum   | publicCurriculumsCreated >= 1 | 200  |
| helpful            | Helpful            | Get 10 best answers in forum | bestAnswers >= 10             | 500  |

### Comprehension Achievements

| Code             | Name         | Description                      | Criteria                  | XP   |
| ---------------- | ------------ | -------------------------------- | ------------------------- | ---- |
| first_assessment | Pop Quiz     | Complete first assessment        | assessmentsCompleted >= 1 | 50   |
| ace              | Ace          | Score 100% on an assessment      | assessmentScore == 1.0    | 200  |
| consistent       | Consistent   | Score 80%+ on 10 assessments     | assessments80Plus >= 10   | 400  |
| blooms_master    | Deep Thinker | Score 90%+ on all Bloom's levels | allBloomsLevels >= 0.9    | 1000 |

### Level Thresholds

| Level | XP Required     | Title            |
| ----- | --------------- | ---------------- |
| 1     | 0               | Novice Reader    |
| 2     | 100             | Apprentice       |
| 3     | 300             | Page Turner      |
| 4     | 600             | Bookworm         |
| 5     | 1000            | Avid Reader      |
| 6     | 1500            | Literature Lover |
| 7     | 2500            | Scholar          |
| 8     | 4000            | Bibliophile      |
| 9     | 6000            | Sage             |
| 10    | 10000           | Master Reader    |
| 11+   | +5000 per level | Grand Master     |
