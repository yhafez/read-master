# Read Master - PRD Guide for Ralph Wiggum

## Overview

This comprehensive PRD contains **135+ tasks** broken down into small, verifiable steps for autonomous AI development using the Ralph Wiggum approach.

## PRD Structure

The `prd.json` file contains:

```json
{
  "project": { ... },           // Project metadata and quality standards
  "feedback_loops": { ... },    // Required checks before commits
  "tasks": [ ... ]              // 135+ structured tasks
}
```

## Task Structure

Each task follows this format:

```json
{
  "id": "unique-id",
  "category": "infrastructure|database|shared|api-*|frontend-*|pwa|testing|deployment",
  "phase": "1-infrastructure|2-database|3-shared|4a-api-infra|...",
  "priority": "critical|high|medium|low",
  "description": "Clear description of what needs to be done",
  "steps": [
    "Concrete verification step 1",
    "Concrete verification step 2",
    "Write tests"
  ],
  "acceptance_criteria": [
    "Specific testable criterion 1",
    "Specific testable criterion 2"
  ],
  "passes": false  // Ralph marks true when complete
}
```

## Phases Breakdown

### ✅ Phase 1: Infrastructure (9 tasks - ~20-30 iterations)
- Monorepo setup with pnpm workspaces
- TypeScript strict mode configuration
- ESLint + Prettier + Husky pre-commit hooks
- React + Vite app setup
- Vercel serverless API setup
- i18n configuration (6 languages)
- Environment configuration

### ✅ Phase 2: Database (13 tasks - ~15-25 iterations)
- Complete Prisma schema (15+ models)
- All enums and relations
- Indexes and constraints
- Migrations
- Seed script with sample data

### ✅ Phase 3: Shared Package (13 tasks - ~15-20 iterations)
- TypeScript types and re-exports
- Zod validation schemas for all operations
- **SM-2 spaced repetition algorithm** (critical)
- **Profanity filter utilities** (critical for moderation)
- Date/timezone utilities
- Bloom's taxonomy helpers
- Reading level (Lexile) utilities
- Tier limits and achievement constants

### ✅ Phase 4A: API Infrastructure (10 tasks - ~15-20 iterations)
- Clerk authentication middleware
- Error handling with consistent responses
- Zod validation middleware
- **Tier-based rate limiting** (free: 5 AI/day, pro: 100, scholar: unlimited)
- Winston logging with context
- Prisma database service
- Redis cache service
- Health check endpoint

### ✅ Phase 4B: Books & Library API (16 tasks - ~20-30 iterations)
- Cloudflare R2 storage service
- Book parsing: EPUB (epub.js), PDF (pdf-parse), DOC/DOCX (mammoth)
- Google Books API integration
- Open Library API integration
- File upload endpoint (max 50MB)
- Import from URL
- Paste text to book
- Library search across both APIs
- Book CRUD with filtering
- Content streaming with range requests

### ✅ Phase 4C: AI Features API (9 tasks - ~25-35 iterations)
- Vercel AI SDK setup with Anthropic Claude
- **Streaming AI responses**
- Token tracking and cost calculation
- Pre-reading guide generation (vocabulary, key arguments, context, themes)
- "Explain this" contextual explanations
- "Ask a question" chat interface
- Comprehension check-ins
- Post-reading assessment generation (Bloom's Taxonomy)
- AI grading with feedback
- Auto-generate flashcards

### ✅ Phase 4D: SRS & Gamification API (7 tasks - ~20-30 iterations)
- Flashcard CRUD
- Due cards query (ordered by priority)
- **Review with SM-2 algorithm** (all 4 ratings)
- XP and achievement system
- Stats tracking (streak, level, books completed)
- Leaderboard (opt-in, global/friends)

### ✅ Phase 4E: TTS API (4 tasks - ~15-20 iterations)
- Tier-based TTS:
  - Free: Web Speech API config
  - Pro: OpenAI TTS streaming
  - Scholar: ElevenLabs premium
- Voice selection per tier
- Full book audio download (quota limits)
- Download management

### ✅ Phase 4F: Social & Forum API (13 tasks - ~25-35 iterations)
- User profiles (public/private)
- Follow/unfollow system
- Activity feed
- Reading groups (create/join/discussions)
- Forum (categories, posts, replies, voting)
- Nested replies support
- Best answer marking
- Content moderation and reporting

### ✅ Phase 4G: Curriculums & Cron API (5 tasks - ~15-20 iterations)
- Curriculum CRUD (Pro/Scholar only)
- Browse/search public curriculums
- Curriculum items with ordering
- Follow/progress tracking
- Cron jobs (SRS reminders, streak check, cleanup)

## Current State

**✅ COMPLETE: Backend API (135+ tasks defined)**

**⚠️ TODO: Frontend UI tasks need to be added**

The PRD currently covers all backend work. Frontend tasks should be added for:
- Phase 5: Frontend Foundation (~80+ tasks)
  - App shell, routing, MUI theme
  - Clerk auth integration
  - Library UI
  - **Reader interface** (EPUB/PDF rendering)
  - AI features UI
  - SRS flashcard UI
  - Social features UI
  - Forum UI
  - Curriculum builder UI
  - Analytics dashboard
  - Settings & accessibility
- Phase 6: Offline & PWA (~10 tasks)
- Phase 7: Testing & Polish (~20 tasks)
- Phase 8: Deployment (~10 tasks)

## Using This PRD with Ralph

### Running HITL Ralph (Human-in-the-Loop)

For learning and prompt refinement:

```bash
#!/bin/bash
# ralph-once.sh

claude -p "@prd.json @progress.txt
1. Read the prd.json file to understand available tasks
2. Decide which task to work on next based on:
   - Priority (critical > high > medium > low)
   - Dependencies (infrastructure before features)
   - Your judgment on what's most important now
3. Work on ONLY ONE task per iteration
4. Run ALL feedback loops before committing:
   - pnpm typecheck (must pass)
   - pnpm lint (must pass)
   - pnpm vitest run (must pass)
5. Update the task's passes field to true in prd.json
6. Append progress to progress.txt:
   - Task ID and description
   - Key decisions made
   - Files changed
   - Any blockers or notes
7. Make a git commit of that feature
8. If ALL tasks have passes: true, output <promise>COMPLETE</promise>
"
```

### Running AFK Ralph (Away From Keyboard)

For autonomous development:

```bash
#!/bin/bash
# afk-ralph.sh
# Usage: ./afk-ralph.sh 30  # Run 30 iterations

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  echo "==== Iteration $i/$1 ===="
  
  result=$(docker sandbox run claude -p "@prd.json @progress.txt
  1. Read prd.json and find the highest priority incomplete task (passes: false)
  2. Prioritize by: critical > high > medium > low
  3. Consider dependencies (can't build UI without API)
  4. Work on ONE task only
  5. Run feedback loops: pnpm typecheck, pnpm lint, pnpm vitest run
  6. Mark task as passes: true in prd.json
  7. Append to progress.txt with concise notes
  8. Git commit with message: '<task-id>: <description>'
  9. If all tasks done, output <promise>COMPLETE</promise>
  ")
  
  echo "$result"
  
  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "✅ All PRD tasks complete!"
    exit 0
  fi
  
  sleep 5  # Rate limit between iterations
done

echo "⚠️ Completed $1 iterations. Check progress.txt for status."
```

## Quality Standards

From the PRD:

> **Production code. Must be maintainable, testable, and follow best practices. This codebase will outlive you - fight entropy, leave it better than you found it.**

### Feedback Loops (Enforced)

Before ANY commit, Ralph must run:

1. **TypeScript**: `pnpm typecheck` - No errors allowed
2. **Lint**: `pnpm lint` - No errors allowed  
3. **Tests**: `pnpm vitest run` - All tests must pass

**❌ NEVER use `--no-verify` to bypass pre-commit hooks** unless explicitly told by user.

### Testing Requirements

- **Utility functions**: 100% coverage (all functions tested)
- **API routes**: Test all endpoints with various scenarios
- **Critical business logic**: Minimum 80% coverage
- **Tests validate actual functionality** - not just passing for the sake of passing

## Task Prioritization

Ralph should prioritize in this order:

1. **Architectural decisions** (database schema, API structure)
2. **Integration points** (API ↔ Database, Frontend ↔ API)
3. **Unknown unknowns** (parsing libraries, AI SDK, file uploads)
4. **Standard features** (CRUD operations)
5. **Polish** (UI tweaks, edge cases)

This follows **Tip #7: Prioritize Risky Tasks** - fail fast on hard problems.

## Step Size

Following **Tip #6: Take Small Steps**:

- Keep changes small and focused
- One logical change per commit
- If a task feels too large, break into subtasks
- Run feedback loops after each change
- Quality over speed

## Progress Tracking

Ralph maintains `progress.txt` with:

```
[2026-01-18 10:30] infra-001: Created pnpm monorepo
- Set up workspaces in pnpm-workspace.yaml
- Configured root package.json
- pnpm install successful
- Files: package.json, pnpm-workspace.yaml, .npmrc

[2026-01-18 10:45] infra-002: TypeScript strict mode setup
- Created tsconfig.json with strict: true
- Created packages/config/tsconfig for shared config
- All packages inherit strict config
- pnpm typecheck passes
- Files: tsconfig.json, packages/config/tsconfig/*
```

## Completion Criteria

The project is complete when:

- ✅ All PRD items have `passes: true`
- ✅ All tests pass (`pnpm vitest run`)
- ✅ TypeScript has no errors (`pnpm typecheck`)
- ✅ Linting passes (`pnpm lint`)
- ✅ Accessibility audit passes WCAG 2.2 AAA
- ✅ Application runs successfully (`pnpm dev`)
- ✅ Can build for production (`pnpm build`)

## Next Steps

1. **Extend PRD**: Add frontend, PWA, testing, and deployment tasks (estimated 120+ more tasks)
2. **Review with team**: Ensure all requirements from SPECIFICATIONS.md are covered
3. **Start HITL Ralph**: Run single iterations to refine prompt and verify approach
4. **Go AFK Ralph**: Once confident, run autonomous loops (30-50 iterations at a time)
5. **Review commits**: After each Ralph session, review the commits and approve/adjust

## Cost Considerations

From **Tip #10: Pay To Play**:

- HITL Ralph: More manual, lower token usage, better for learning
- AFK Ralph: Higher token usage, but massive time savings
- Typical AFK session: 30-50 iterations over 30-45 minutes
- Consider Anthropic 5x Max plan (~£90/month) for serious use

## Safety

From **Tip #9: Use Docker Sandboxes**:

For AFK Ralph, always use Docker sandboxing:

```bash
docker sandbox run claude
```

This prevents Ralph from accessing:
- Your home directory
- SSH keys
- System files outside the project

## Resources

- **Ralph Wiggum Article**: [11 Tips for Running AI Coding CLIs in a Loop](reference)
- **SPECIFICATIONS.md**: Full product requirements
- **RALPH_PROMTS.md**: Original phase-based prompts
- **CLAUDE.md**: Project coding standards

## Contact

This PRD was generated for autonomous AI development. For questions or issues:
- Check `progress.txt` for current status
- Review git commits for completed work
- Consult SPECIFICATIONS.md for requirements clarification
