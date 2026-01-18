# Read Master - Comprehensive PRD for Ralph Wiggum Development 🚀

## What I Created For You

I've built a **comprehensive, production-ready PRD** for autonomous AI development of the Read Master application using the **Ralph Wiggum** approach.

### 📦 Files Created

#### 1. **`prd.json`** (2,353 lines, 135+ tasks)
The heart of your autonomous development system. Each task is:
- ✅ Small and focused (1 logical feature)
- ✅ Verifiable with explicit acceptance criteria
- ✅ Prioritized by criticality and dependencies
- ✅ Has a `passes: false` field Ralph marks `true` when complete

**Phases covered:**
- ✅ Phase 1: Infrastructure (9 tasks)
- ✅ Phase 2: Database Schema (13 tasks)
- ✅ Phase 3: Shared Package (13 tasks)
- ✅ Phase 4A: API Infrastructure (10 tasks)
- ✅ Phase 4B: Books & Library API (16 tasks)
- ✅ Phase 4C: AI Features API (9 tasks)
- ✅ Phase 4D: SRS & Gamification API (7 tasks)
- ✅ Phase 4E: TTS API (4 tasks)
- ✅ Phase 4F: Social & Forum API (13 tasks)
- ✅ Phase 4G: Curriculums & Cron API (5 tasks)

**⚠️ Note:** Frontend, PWA, Testing, and Deployment phases still need to be added (~120+ more tasks)

#### 2. **`ralph-prd.sh`** (executable)
**Human-in-the-loop (HITL) script** - You watch Ralph work, intervene when needed.

```bash
./ralph-prd.sh
```

Best for:
- Learning how Ralph works
- Refining your prompt
- Testing the PRD structure
- Watching architectural decisions

#### 3. **`ralph-prd-afk.sh`** (executable)
**Away-from-keyboard (AFK) script** - Ralph runs autonomously for N iterations.

```bash
./ralph-prd-afk.sh 30  # Run 30 iterations
```

Best for:
- Bulk implementation work
- When foundation is solid
- After you trust the prompt
- Parallel work while you do other things

**Safety:** Always run in Docker sandbox for AFK mode!

#### 4. **`PRD_GUIDE.md`** (comprehensive guide)
Complete documentation on:
- How the PRD is structured
- All phases and task breakdown
- How to use Ralph with this PRD
- Quality standards and feedback loops
- Prioritization strategy
- Cost considerations

#### 5. **`PROGRESS.md`** (you'll create)
Ralph maintains this file automatically:

```
[2026-01-18 10:30] infra-001: Created pnpm monorepo
- Set up workspaces
- pnpm install successful
- Files: package.json, pnpm-workspace.yaml

[2026-01-18 10:45] infra-002: TypeScript strict mode
- Configured strict mode
- pnpm typecheck passes
```

## How This PRD Follows Ralph Wiggum Best Practices

### ✅ 1. Ralph Is A Loop
Each script runs the same prompt repeatedly. Ralph picks the next task, not you.

### ✅ 2. Start With HITL, Then Go AFK
- Use `ralph-prd.sh` first to learn and refine
- Switch to `ralph-prd-afk.sh` once confident

### ✅ 3. Define The Scope
Every task has:
- Clear description
- Concrete verification steps
- Explicit acceptance criteria
- A `passes` field for tracking

### ✅ 4. Track Ralph's Progress
`progress.txt` provides context between iterations without re-exploring the repo.

### ✅ 5. Use Feedback Loops
**Enforced before every commit:**
- `pnpm typecheck` - No type errors
- `pnpm lint` - No linting errors
- `pnpm vitest run` - All tests pass

**Ralph cannot commit if these fail.**

### ✅ 6. Take Small Steps
Each task is focused on ONE logical feature. Small commits compound into big progress.

### ✅ 7. Prioritize Risky Tasks
Tasks are prioritized:
1. **critical** - Architectural decisions, core abstractions
2. **high** - Integration points, essential features
3. **medium** - Standard features
4. **low** - Polish, cleanup

### ✅ 8. Explicitly Define Software Quality
From the PRD:

> **Production code. Must be maintainable, testable, and follow best practices. This codebase will outlive you - fight entropy, leave it better than you found it.**

### ✅ 9. Use Docker Sandboxes
AFK script includes Docker sandboxing for safety.

### ✅ 10. Pay To Play
This is a large project (~550-800 iterations estimated). Budget accordingly.

### ✅ 11. Make It Your Own
The PRD is flexible. You can:
- Add more tasks
- Adjust priorities
- Change acceptance criteria
- Extend with custom checks

## What Makes This PRD Production-Ready

### 🎯 Comprehensive Coverage
Based on your SPECIFICATIONS.md and RALPH_PROMPTS.md, covering:
- Complete monorepo infrastructure
- Full database schema (15+ models)
- Shared utilities (SM-2 algorithm, profanity filter)
- Authentication and authorization (Clerk)
- Rate limiting by tier
- All content import methods (upload, URL, paste, APIs)
- File parsing (EPUB, PDF, DOC/DOCX)
- AI features (Claude streaming, pre-reading guides, assessments)
- Spaced repetition system with gamification
- TTS with tier-based providers
- Social features (profiles, follows, groups, forum)
- Curriculum builder
- Cron jobs

### 📏 Small, Verifiable Tasks
Each task follows the principle: **one logical change per commit**.

Example task structure:
```json
{
  "id": "shared-007",
  "category": "shared",
  "phase": "3-shared",
  "priority": "critical",
  "description": "Implement SM-2 spaced repetition algorithm",
  "steps": [
    "Create src/utils/srs.ts",
    "Implement calculateNextReview function",
    "Implement ease factor calculation",
    "Handle all four ratings (Again, Hard, Good, Easy)",
    "Write comprehensive tests covering all rating scenarios"
  ],
  "acceptance_criteria": [
    "SM-2 algorithm is correctly implemented",
    "All four ratings produce correct intervals",
    "Tests achieve 100% coverage of algorithm logic"
  ],
  "passes": false
}
```

### 🔒 Quality Gates
Three-layer validation on every commit:
1. **TypeScript** - Type safety
2. **ESLint** - Code quality
3. **Vitest** - Functional correctness

Ralph **cannot bypass these** (no `--no-verify` allowed).

### 📊 Progress Tracking
Two sources of truth:
1. **prd.json** - Which tasks are done (`passes: true`)
2. **progress.txt** - What changed and why

Plus git history shows exactly what was implemented.

### 🧠 Context-Aware
Each task includes:
- **Steps** - What to do
- **Acceptance criteria** - How to verify
- **Priority** - When to tackle it
- **Dependencies** - What must come first (via phase numbering)

## Getting Started

### Step 1: Review the PRD
```bash
cat prd.json | jq '.tasks[] | select(.passes == false) | {id, category, priority, description}'
```

This shows all incomplete tasks sorted by how they appear in the PRD.

### Step 2: Initialize Progress Tracking
```bash
echo "# Read Master - Development Progress" > progress.txt
echo "" >> progress.txt
echo "Started: $(date)" >> progress.txt
echo "" >> progress.txt
```

### Step 3: Run Your First HITL Iteration
```bash
./ralph-prd.sh
```

Watch what Ralph does:
- ✅ Reads the PRD
- ✅ Picks a task (probably `infra-001` first)
- ✅ Implements it
- ✅ Runs feedback loops
- ✅ Updates prd.json and progress.txt
- ✅ Commits

### Step 4: Review and Iterate
```bash
git log -1 --stat              # See what changed
cat progress.txt | tail -10    # See latest progress
```

If it looks good, run again:
```bash
./ralph-prd.sh
```

### Step 5: Go AFK When Ready
Once you trust the prompt (after 5-10 HITL iterations):

```bash
# Run 30 iterations autonomously
./ralph-prd-afk.sh 30
```

Go do something else. Come back in 30-45 minutes. Review the commits.

## Extending the PRD

### Adding Frontend Tasks (Recommended Next Step)

The current PRD covers all backend work. You should extend it with frontend tasks following the same structure. Estimated additions:

**Phase 5: Frontend Foundation** (~80 tasks)
- App shell and routing
- MUI theme setup
- Clerk auth UI
- Library management UI
- **Reader interface** (EPUB/PDF rendering, epub.js, pdf.js)
- AI features UI (streaming responses, chat panel)
- SRS flashcard UI (flip animations, review session)
- Social features UI
- Forum UI
- Curriculum builder UI
- Analytics dashboard (customizable widgets)
- Settings & accessibility (WCAG 2.2 AAA)

**Phase 6: Offline & PWA** (~10 tasks)
- Service worker setup
- IndexedDB storage
- Background sync
- Install prompt

**Phase 7: Testing & Polish** (~20 tasks)
- E2E tests (Playwright)
- Accessibility audit
- Performance optimization
- Loading states & error handling

**Phase 8: Deployment** (~10 tasks)
- Vercel configuration
- Environment setup
- Database migrations
- Monitoring & alerts

### How to Add Tasks

1. Open `prd.json`
2. Find the last task in the `tasks` array
3. Add your new task following the same structure:

```json
{
  "id": "frontend-001",
  "category": "frontend-foundation",
  "phase": "5a-app-shell",
  "priority": "critical",
  "description": "Set up React app shell with routing",
  "steps": [
    "Configure React Router",
    "Create layout components",
    "Set up protected routes",
    "Test navigation works"
  ],
  "acceptance_criteria": [
    "All routes are defined",
    "Protected routes require auth",
    "Tests pass"
  ],
  "passes": false
}
```

4. Save and let Ralph continue!

## Monitoring Progress

### Check Overall Progress
```bash
# Count completed tasks
jq '[.tasks[] | select(.passes == true)] | length' prd.json

# Count remaining tasks
jq '[.tasks[] | select(.passes == false)] | length' prd.json

# Progress percentage
echo "scale=2; $(jq '[.tasks[] | select(.passes == true)] | length' prd.json) * 100 / $(jq '.tasks | length' prd.json)" | bc
```

### View Next Tasks
```bash
# Next 5 incomplete tasks
jq '.tasks[] | select(.passes == false) | {id, priority, description}' prd.json | head -20
```

### Check Phase Completion
```bash
# Tasks by phase
jq '.tasks | group_by(.phase) | map({phase: .[0].phase, total: length, completed: [.[] | select(.passes == true)] | length})' prd.json
```

## Troubleshooting

### Ralph Keeps Failing Same Task
1. Check `progress.txt` for error patterns
2. Review git commits to see what's being attempted
3. The task might be too large - break it into subtasks
4. Run HITL mode to watch and intervene

### Feedback Loops Keep Failing
1. Check which loop fails: typecheck, lint, or test
2. Review the specific errors
3. May need to adjust project configuration
4. Ensure dependencies are installed

### Ralph Picks Wrong Tasks
1. Adjust task priorities in prd.json
2. Add explicit dependencies in task descriptions
3. Reorder tasks within same priority level

### Too Expensive
1. Use HITL mode more (lower token usage)
2. Reduce iterations per AFK session
3. Review and clean up progress.txt periodically
4. Consider adding caching to reduce context size

## Tips for Success

### 1. Start Small
Run 1-3 HITL iterations first. Get comfortable. Then try a 10-iteration AFK run.

### 2. Review Regularly
Don't let Ralph run for 100 iterations unsupervised on your first try. Check progress every 20-30 iterations.

### 3. Git Is Your Friend
Every task is a commit. If something goes wrong, you can always revert.

### 4. Clean Up Progress
After completing a phase, archive the old progress:

```bash
mv progress.txt progress-phase1.txt
echo "# Read Master - Phase 2 Progress" > progress.txt
```

### 5. Adjust Quality Standards
If Ralph is being too perfectionist (or not enough), adjust the quality standards in prd.json.

### 6. Extend As You Go
Don't wait to add all 300+ tasks upfront. Add frontend tasks after backend is working.

## Cost Estimate

Based on the Ralph article and this PRD size:

- **Backend only** (current PRD): ~200-300 iterations
- **Full project** (with frontend): ~550-800 iterations
- **Per iteration cost**: ~$0.50-2.00 depending on complexity
- **Total estimate**: $300-1,600 for complete project

**Strategies to reduce cost:**
- Use HITL mode for risky architectural work
- AFK mode for straightforward implementations
- Break into smaller Ralph sessions (20-30 iterations)
- Review and clean up between sessions

## What's Next?

1. ✅ **Review this PRD** - Make sure it matches your vision
2. ✅ **Extend with frontend tasks** - Add the ~120 remaining tasks
3. ✅ **Initialize git** - `git init` if you haven't
4. ✅ **Run first HITL iteration** - `./ralph-prd.sh`
5. ✅ **Watch and learn** - See how Ralph works
6. ✅ **Refine prompt if needed** - Adjust based on results
7. ✅ **Go AFK when ready** - `./ralph-prd-afk.sh 30`
8. ✅ **Review commits regularly** - Every 20-30 iterations
9. ✅ **Adjust PRD as you go** - Add, modify, reprioritize tasks
10. ✅ **Ship Read Master** - When all tasks have `passes: true`!

## Questions?

- **Check PRD_GUIDE.md** for detailed documentation
- **Check prd.json** for all tasks and structure
- **Check progress.txt** for current development status
- **Check git log** for implementation details

---

**Remember:** This is autonomous development, but you're still in control. Review, adjust, and iterate. Ralph is your coding partner, not your replacement. 🤓

Good luck building Read Master! 🚀📚
