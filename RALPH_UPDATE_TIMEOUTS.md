# 🎉 Ralph Scripts Updated with Timeout Protection!

## What Changed

Both Ralph scripts now have **automatic timeout protection** to prevent iterations from getting stuck indefinitely.

## Quick Summary

### HITL Mode (`ralph-prd.sh`)

- ⏱️ **15-minute timeout** per iteration
- Claude is informed about the time limit
- Helpful error message if timeout occurs
- Suggests next steps

### AFK Mode (`ralph-prd-afk.sh`)

- ⏱️ **10-minute timeout** per iteration
- Claude is informed about the time limit
- Automatic recovery - continues to next iteration
- Stops after 3 consecutive timeouts (safety)
- Session summary with timeout count

## Why This Matters

### Before (Without Timeouts)

❌ Claude could get stuck for hours on:

- Infinite loops
- Hanging tests
- Deep debugging rabbit holes
- Network requests that never return

❌ You'd waste:

- Entire AFK session
- High API costs
- Hours of development time

### After (With Timeouts)

✅ Automatic protection against stuck iterations
✅ Claude knows to work efficiently within time limit
✅ Graceful recovery and continuation
✅ Clear feedback when issues occur

## Examples

### HITL with Timeout

```bash
$ ./ralph-prd.sh

🤓 Running Ralph (HITL mode) - Watch and intervene as needed
⏱️  Timeout: 15 minutes per iteration
============================================================

[Working on task...]

⏱️  TIMEOUT: Iteration exceeded 15 minutes and was terminated.
This may indicate:
  - Task is too complex (break it into smaller subtasks)
  - Claude is stuck on an issue (check progress.txt for details)
  - Tests or linting are taking too long

Review progress.txt and git status to see what was completed.
```

### AFK with Timeout Tracking

```bash
$ ./ralph-prd-afk.sh 30

🚀 Running Ralph in AFK mode for 30 iterations
⏱️  Timeout: 10 minutes per iteration
==========================================================

==== Iteration 5/30 ====
⏱️  TIMEOUT: Iteration 5 exceeded 10 minutes
   Total timeouts: 1

[Continues to next iteration...]

=============================================
✅ Completed 30 iterations
=============================================

📊 Session Summary:
   - Iterations completed: 30
   - Timeouts encountered: 2
   - Errors encountered: 0
```

## Claude Knows About Timeouts

The prompts now include:

```
⏱️ TIME LIMIT: You have 10 minutes to complete this iteration.
Work efficiently. If approaching timeout, commit what you have and exit cleanly.
```

This encourages Claude to:

- Work efficiently
- Self-monitor progress
- Commit partial work if needed
- Exit gracefully

## Customization

Want different timeouts? Edit the scripts:

```bash
# In ralph-prd.sh
TIMEOUT_MINUTES=15  # Change to 20 for complex tasks

# In ralph-prd-afk.sh
TIMEOUT_MINUTES=10  # Change to 15 for complex tasks
```

## Full Documentation

See **`TIMEOUT_GUIDE.md`** for:

- Detailed explanation
- Troubleshooting guide
- Best practices
- Configuration reference
- Example sessions

## Files Updated

1. ✅ `ralph-prd.sh` - Added 15-min timeout with error handling
2. ✅ `ralph-prd-afk.sh` - Added 10-min timeout with recovery and tracking
3. ✅ `TIMEOUT_GUIDE.md` - Complete documentation (NEW)

## Ready to Use

Your Ralph scripts are now more robust and reliable! 🚀

```bash
# HITL mode with timeout protection
./ralph-prd.sh

# AFK mode with timeout protection and auto-recovery
./ralph-prd-afk.sh 30
```

No more stuck iterations! 🎉
