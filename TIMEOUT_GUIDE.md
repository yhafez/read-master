# Ralph Timeout Feature - Guide

## Overview

Both Ralph scripts now include **automatic timeout protection** to prevent iterations from getting stuck indefinitely.

## Timeout Settings

### HITL Mode (`ralph-prd.sh`)

- **Timeout**: 15 minutes per iteration
- **Behavior**: Terminates if iteration exceeds time limit
- **Use case**: Longer timeout since human is watching and tasks may be more complex

### AFK Mode (`ralph-prd-afk.sh`)

- **Timeout**: 10 minutes per iteration
- **Behavior**: Terminates iteration and continues to next one
- **Safety**: Stops after 3 consecutive timeouts
- **Use case**: Shorter timeout for autonomous operation

## How It Works

### 1. Claude Is Informed

The prompt explicitly tells Claude about the time limit:

```
⏱️ TIME LIMIT: You have 10 minutes to complete this iteration.
Work efficiently. If approaching timeout, commit what you have and exit cleanly.
```

This encourages Claude to:

- Work efficiently
- Monitor its own progress
- Commit partial work if running long
- Exit gracefully before timeout

### 2. Script Enforces Timeout

Using bash `timeout` command:

```bash
timeout 10m claude -p "..."
```

If Claude doesn't exit within 10 minutes, it's forcefully terminated with exit code 124.

### 3. Graceful Handling

**HITL Mode:**

```bash
./ralph-prd.sh

# If timeout occurs:
⏱️  TIMEOUT: Iteration exceeded 15 minutes and was terminated.
This may indicate:
  - Task is too complex (break it into smaller subtasks)
  - Claude is stuck on an issue (check progress.txt for details)
  - Tests or linting are taking too long

Review progress.txt and git status to see what was completed.
```

**AFK Mode:**

```bash
./ralph-prd-afk.sh 30

# If timeout occurs:
⏱️  TIMEOUT: Iteration 5 exceeded 10 minutes
   Total timeouts: 1

# After 3 consecutive timeouts:
❌ Too many timeouts (3 in a row). Stopping AFK Ralph.
   This suggests tasks are too complex or something is stuck.
   Review progress.txt and consider:
   - Breaking tasks into smaller pieces
   - Running HITL mode to investigate
   - Increasing timeout if tasks are legitimately complex
```

## Why Timeouts Are Important

### Without Timeouts

❌ Claude could get stuck on:

- Infinite loops in code
- Hanging test suites
- Large file operations
- Network requests that never return
- Deep rabbit holes in exploration

❌ You wouldn't know until:

- Hours later when you check
- Your entire AFK session is wasted
- High API costs from stuck session

### With Timeouts

✅ Protection against:

- Stuck iterations
- Runaway processes
- Infinite debugging loops

✅ Automatic recovery:

- Terminates stuck iteration
- Continues to next task
- Tracks timeout patterns

✅ Actionable feedback:

- Know which task caused timeout
- Review progress.txt for details
- Adjust PRD or task complexity

## Customizing Timeouts

### For More Complex Tasks

If you have legitimately complex tasks (e.g., large database migrations, extensive test suites):

**HITL Mode:**

```bash
# Edit ralph-prd.sh
TIMEOUT_MINUTES=20  # Increase from 15 to 20
```

**AFK Mode:**

```bash
# Edit ralph-prd-afk.sh
TIMEOUT_MINUTES=15  # Increase from 10 to 15
```

### For Faster Iteration

If your tasks are simple and you want faster feedback:

```bash
# Edit scripts
TIMEOUT_MINUTES=5  # Decrease to 5 minutes
```

## Monitoring Timeouts

### After Each Session

**Check timeout count:**

```bash
# AFK mode shows summary
📊 Session Summary:
   - Iterations completed: 30
   - Timeouts encountered: 2
   - Errors encountered: 0
```

**Review progress.txt:**

```bash
tail -20 progress.txt
# Look for incomplete tasks or notes about timeouts
```

**Check git status:**

```bash
git status
# See if there's uncommitted work from timeout
```

### Patterns to Watch For

🚩 **3+ timeouts in a session**

- Tasks may be too large
- Break them into smaller subtasks in prd.json

🚩 **Same task timing out repeatedly**

- Task is too complex
- Split into 2-3 smaller tasks
- Or increase timeout for that specific run

🚩 **Timeouts during test runs**

- Test suite may be too slow
- Review test performance
- Consider parallelization

## Best Practices

### 1. Size Tasks Appropriately

```json
❌ Bad:
{
  "description": "Implement entire authentication system",
  "steps": ["Do everything"]
}

✅ Good:
{
  "description": "Set up Clerk authentication middleware",
  "steps": [
    "Create src/middleware/auth.ts",
    "Implement token verification",
    "Write tests"
  ]
}
```

### 2. Monitor First Few Iterations

When starting AFK Ralph:

```bash
# Start with fewer iterations
./ralph-prd-afk.sh 5

# Check for timeouts
# Adjust if needed
./ralph-prd-afk.sh 25
```

### 3. Use HITL for Complex Tasks

```bash
# For architectural decisions, use HITL with longer timeout
./ralph-prd.sh  # 15 minute timeout, you can watch

# For standard implementation, use AFK
./ralph-prd-afk.sh 20  # 10 minute timeout, autonomous
```

### 4. Check Progress.txt Between Sessions

```bash
# Before continuing
tail -50 progress.txt

# Look for:
# - Incomplete tasks
# - Timeout indicators
# - Repeated issues
```

## Troubleshooting

### "Too many timeouts" Error

**Cause:** 3 consecutive timeouts in AFK mode

**Solutions:**

1. **Break down tasks:**

   ```bash
   # Review last attempted task
   git log -1
   tail -10 progress.txt

   # Split into smaller tasks in prd.json
   ```

2. **Increase timeout:**

   ```bash
   # Edit ralph-prd-afk.sh
   TIMEOUT_MINUTES=15  # Up from 10
   ```

3. **Switch to HITL:**
   ```bash
   # Watch what's happening
   ./ralph-prd.sh
   ```

### Task Timing Out Consistently

**Investigate:**

```bash
# What task is timing out?
tail -20 progress.txt

# What's in the task?
cat prd.json | jq '.tasks[] | select(.id == "task-id")'

# Is there uncommitted work?
git status
git diff
```

**Fix:**

1. Split task into 2-3 smaller tasks
2. Or increase timeout temporarily
3. Or investigate if tests/builds are slow

### Partial Work After Timeout

**Recovery:**

```bash
# Check what was completed
git status
git diff

# If work is good, commit manually
git add .
git commit -m "task-id: completed partial work before timeout"

# Update prd.json manually if task is done
# Then continue
./ralph-prd.sh
```

## Exit Codes

| Code  | Meaning | Action                 |
| ----- | ------- | ---------------------- |
| 0     | Success | Continue normally      |
| 124   | Timeout | Review task complexity |
| Other | Error   | Check error message    |

## Configuration Reference

### HITL Script (`ralph-prd.sh`)

```bash
TIMEOUT_MINUTES=15    # Time limit per iteration
# Exit code 124 = timeout occurred
```

### AFK Script (`ralph-prd-afk.sh`)

```bash
TIMEOUT_MINUTES=10    # Time limit per iteration
TIMEOUT_COUNT=0       # Tracks consecutive timeouts
ERROR_COUNT=0         # Tracks consecutive errors
# Stops after 3 consecutive timeouts or errors
```

## Example Session with Timeouts

```bash
$ ./ralph-prd-afk.sh 10

🚀 Running Ralph in AFK mode for 10 iterations
⏱️  Timeout: 10 minutes per iteration
==========================================================

==== Iteration 1/10 ====
2026-01-18 14:30:00
[Working on infra-001...]
✅ Task completed

==== Iteration 2/10 ====
2026-01-18 14:38:00
[Working on infra-002...]
⏱️  TIMEOUT: Iteration 2 exceeded 10 minutes
   Total timeouts: 1

==== Iteration 3/10 ====
2026-01-18 14:49:00
[Working on infra-003...]
✅ Task completed

==== Iteration 4/10 ====
2026-01-18 14:56:00
[Working on db-001...]
✅ Task completed

...

=============================================
✅ Completed 10 iterations
=============================================

📊 Session Summary:
   - Iterations completed: 10
   - Timeouts encountered: 1
   - Errors encountered: 0

📝 Next Steps:
   - Review progress.txt for details
   - Check git log for commits: git log --oneline -10
   - Continue with more iterations: ./ralph-prd-afk.sh <iterations>
```

## Summary

✅ **Timeouts prevent stuck iterations**
✅ **Claude is informed about time limits**
✅ **Automatic recovery in AFK mode**
✅ **Configurable per your needs**
✅ **Actionable feedback when timeouts occur**

This makes Ralph much more reliable for autonomous development! 🚀
