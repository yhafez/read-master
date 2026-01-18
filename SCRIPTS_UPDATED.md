# ✅ Ralph Scripts Updated!

All scripts in the `scripts/` directory have been updated to match the improved pattern from `executive-assistant-ai`.

## 📁 Updated Files

### 1. **`scripts/ralph-once.sh`** - HITL Single Iteration

**Features:**

- ⏱️ Configurable timeout (default: 30 minutes)
- ✨ Better visual formatting with box drawing characters
- 🔄 Automatic promotion of discoveries from previous sprint
- 📊 Iteration counter and task completion tracking
- 💡 Helpful tips and instructions
- ✅ Supports both `gtimeout` (macOS) and `timeout` (Linux)
- 🎯 Clear prompt structure referencing `docs/RALPH_WIGGUM.md` and `CLAUDE.md`
- 📝 Discovery mode instructions (add with `defer_to_next_sprint: true`)

**Usage:**

```bash
./scripts/ralph-once.sh           # 30 minute timeout (default)
./scripts/ralph-once.sh 45        # 45 minute timeout
```

### 2. **`scripts/ralph-loop.sh`** - AFK Autonomous Loop

**Features:**

- ⏱️ Configurable timeout per iteration (default: 30 minutes)
- 🔁 Configurable max iterations (default: 15)
- 🔄 Auto-promotion of discoveries at start
- 📊 Task completion tracking between iterations
- 🎯 Interactive prompts to continue between iterations
- ✅ Timeout handling with user decision to continue or stop
- 🎉 Completion detection with `<promise>COMPLETE</promise>`
- 📋 Detailed final status summary
- 💡 Helpful instructions at each step

**Usage:**

```bash
./scripts/ralph-loop.sh           # 15 iterations, 30 min timeout
./scripts/ralph-loop.sh 30        # 30 iterations, 30 min timeout
./scripts/ralph-loop.sh 30 45     # 30 iterations, 45 min timeout
```

### 3. **`scripts/ralph.sh`** - Fully Automated (No Prompts)

**Features:**

- ⏱️ Configurable timeout per iteration (default: 30 minutes)
- 🚀 Runs completely autonomously without user prompts
- 🔄 Auto-promotion of all discoveries at start
- 📊 Completion detection
- ⚡ Best for running in background or overnight
- 📝 Uses `-p` flag for prompts (non-interactive)

**Usage:**

```bash
./scripts/ralph.sh 20             # 20 iterations, 30 min timeout
./scripts/ralph.sh 50 45          # 50 iterations, 45 min timeout
```

### 4. **`scripts/setup.sh`** - Project Setup (NEW!)

**Features:**

- ✅ Checks prerequisites (Node.js >= 20, pnpm)
- 🔍 Checks for timeout command (gtimeout/timeout)
- 📝 Creates .env.local from .env.example
- 📦 Installs dependencies with pnpm
- 🪝 Sets up Husky pre-commit hooks
- 🔧 Makes Ralph scripts executable
- 💡 Shows helpful next steps

**Usage:**

```bash
./scripts/setup.sh
```

## 🎯 Key Improvements

### 1. Discovery Mode Support

All scripts now support the **discovery mode** workflow:

- While working on a task, Ralph can add high-value discoveries to `prd.json`
- Discoveries are marked with `defer_to_next_sprint: true`
- At the start of each run, discoveries are promoted to `defer_to_next_sprint: false`
- This allows Ralph to note improvements without derailing current work

**Example Discovery in prd.json:**

```json
{
  "id": "discovered-001",
  "category": "performance",
  "phase": "optimization",
  "priority": "medium",
  "description": "Add memoization to expensive dashboard calculations",
  "defer_to_next_sprint": true, // Gets promoted to false next run
  "rationale": "Noticed dashboard re-renders causing lag",
  "steps": ["Profile render times", "Add useMemo hooks", "Verify improvement"],
  "acceptance_criteria": ["Dashboard renders in < 100ms"],
  "passes": false
}
```

### 2. Better Timeout Handling

- ⏱️ Claude is explicitly told about the timeout in the prompt
- 🔧 Supports both `gtimeout` (macOS with GNU coreutils) and `timeout` (Linux)
- 💡 Clear instructions to run `/exit` in Claude Code
- 📋 Helpful recovery instructions on timeout

### 3. Improved Prompts

All prompts now:

- Reference `@docs/RALPH_WIGGUM.md` for workflow documentation
- Reference `@docs/prd.json` for tasks
- Reference `@progress.txt` for history
- Mention `CLAUDE.md` for coding standards
- Include time management tips
- Emphasize running `/exit` to avoid timeout

### 4. Better Visual Feedback

- 📊 Shows iteration count and tasks completed
- 🎨 Box drawing characters for better readability
- ✅ Clear success/error indicators
- 📋 Helpful next steps after each run

### 5. Discovery Promotion

At the start of each run:

```bash
🔄 Promoting 3 discovered items to current sprint...
✅ Promoted 3 items - now available for Ralph to work on
```

This automatically changes:

```json
"defer_to_next_sprint": true  →  "defer_to_next_sprint": false
```

## 📚 Documentation Files Referenced

The scripts expect these files to exist:

- `docs/RALPH_WIGGUM.md` - Workflow and methodology documentation
- `docs/prd.json` - Task list with PRD items
- `progress.txt` - Iteration history (auto-created if missing)
- `CLAUDE.md` - Coding standards (optional, but referenced)

## 🚀 Quick Start

### First Time Setup

```bash
# Run setup script
./scripts/setup.sh

# This will:
# - Check Node.js and pnpm
# - Install dependencies
# - Setup Husky
# - Make scripts executable
```

### Run Your First HITL Iteration

```bash
# Watch Ralph work, learn the patterns
./scripts/ralph-once.sh

# Ralph will:
# 1. Read your PRD and progress
# 2. Choose a task
# 3. Implement it
# 4. Run tests
# 5. Commit
# 6. Update tracking
```

### Go AFK for Multiple Iterations

```bash
# Run 15 iterations autonomously
./scripts/ralph-loop.sh 15

# Or run 30 iterations with 45 min timeout each
./scripts/ralph-loop.sh 30 45
```

### Fully Automated (No Prompts)

```bash
# Best for running overnight or in background
./scripts/ralph.sh 50 30
```

## 🔧 Timeout Configuration

### Default Timeouts

- **HITL Mode**: 30 minutes (conservative for learning)
- **AFK Mode**: 30 minutes (safe for autonomous work)
- **Automated**: 30 minutes (configurable)

### Custom Timeouts

```bash
# Longer timeout for complex tasks
./scripts/ralph-once.sh 45         # 45 minutes

# Shorter timeout for simple tasks
./scripts/ralph-loop.sh 20 15      # 15 minutes per iteration

# Very long timeout for migrations/setup
./scripts/ralph.sh 10 60           # 60 minutes per iteration
```

### No Timeout Command?

If `gtimeout` or `timeout` is not available:

```bash
# Install GNU coreutils on macOS
brew install coreutils

# Scripts will warn but still work without timeout protection
⚠️  Warning: timeout command not found. Install with: brew install coreutils
⚠️  Running without timeout protection - you'll need to manually close Claude Code
```

## 📊 Discovery Workflow

### How It Works

1. **Ralph discovers an opportunity while working:**

   ```
   [Working on task db-001]
   "I noticed the User table doesn't have an index on email"
   [Adds discovery to prd.json with defer_to_next_sprint: true]
   [Continues with current task]
   ```

2. **Discoveries accumulate in prd.json:**

   ```json
   {
     "id": "discovered-001",
     "description": "Add index on User.email",
     "defer_to_next_sprint": true,
     "passes": false
   }
   ```

3. **Next run auto-promotes discoveries:**

   ```bash
   🔄 Promoting 3 discovered items to current sprint...
   ✅ Promoted 3 items - now available for Ralph to work on
   ```

4. **Ralph can now work on discoveries:**
   ```json
   {
     "id": "discovered-001",
     "description": "Add index on User.email",
     "defer_to_next_sprint": false, // ← Promoted!
     "passes": false // ← Ready to work on
   }
   ```

## 🎯 Comparison to Old Scripts

| Feature               | Old Scripts | New Scripts               |
| --------------------- | ----------- | ------------------------- |
| Timeout support       | ❌ No       | ✅ Yes (30min default)    |
| Discovery mode        | ❌ No       | ✅ Yes                    |
| Visual formatting     | Basic       | ✅ Box drawing, emojis    |
| Iteration tracking    | Manual      | ✅ Automatic              |
| Progress between runs | ❌ No       | ✅ Yes (asks to continue) |
| Auto-promotion        | ❌ No       | ✅ Yes (at start)         |
| /exit reminders       | ❌ No       | ✅ Yes (prominent)        |
| Time management tips  | ❌ No       | ✅ Yes (in prompt)        |
| Setup script          | ❌ No       | ✅ Yes (new)              |
| Multi-OS support      | ❌ No       | ✅ Yes (macOS/Linux)      |

## 💡 Pro Tips

### 1. Start with HITL

```bash
# Learn how Ralph works first
./scripts/ralph-once.sh

# Then go autonomous
./scripts/ralph-loop.sh 15
```

### 2. Use Discovery Mode

Let Ralph note improvements without derailing work:

- Ralph adds `defer_to_next_sprint: true`
- You review discoveries later
- Next run auto-promotes them

### 3. Adjust Timeouts Based on Tasks

```bash
# Infrastructure setup (slow)
./scripts/ralph-once.sh 45

# Standard features (medium)
./scripts/ralph-loop.sh 20 30

# Quick fixes (fast)
./scripts/ralph.sh 10 15
```

### 4. Monitor Progress

```bash
# Check what's completed
grep -c '"passes": true' docs/prd.json

# Check discoveries added
grep -c '"defer_to_next_sprint": true' docs/prd.json

# Review recent work
tail -50 progress.txt
```

### 5. Recovery from Timeout

If Ralph times out:

1. Check `progress.txt` - was work completed?
2. Review `git log` - any commits?
3. Run tests manually: `pnpm vitest run`
4. Commit manually if needed
5. Continue with next iteration

## 🎉 All Set!

Your Ralph scripts are now aligned with the proven pattern from `executive-assistant-ai`. They include:

- ✅ Robust timeout protection
- ✅ Discovery mode workflow
- ✅ Better visual feedback
- ✅ Cross-platform support
- ✅ Improved prompts and instructions
- ✅ Setup script for easy onboarding

Ready to let Ralph build Read Master autonomously! 🚀📚
