# Timeout Fix - Ralph Scripts

**Date:** 2026-01-18
**Issue:** Timeout was causing entire script to exit instead of just killing Claude process
**Status:** ✅ Fixed

## 🐛 Problem

When the timeout period was reached, the entire Ralph script would exit instead of:

1. Killing just the Claude Code process
2. Continuing to the next iteration

This defeated the purpose of the timeout mechanism in AFK/loop modes.

## ✅ Solution

Updated the timeout handling in all Ralph scripts:

### `scripts/ralph-loop.sh` ✅

**Before:** Prompted user whether to continue after timeout (blocking autonomous operation)
**After:** Automatically continues to next iteration when timeout occurs

```bash
# Old behavior
if [ $exit_code -eq 124 ]; then
  echo "TIMEOUT..."
  read -p "Continue to next iteration anyway? (y/n): " -n 1 -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1  # EXIT ENTIRE SCRIPT
  fi
fi

# New behavior
if [ $exit_code -eq 124 ]; then
  echo "⏱️  TIMEOUT: Iteration $ITERATION exceeded ${TIMEOUT_MINUTES} minutes"
  echo "💡 Claude Code process terminated. Moving to next iteration..."
  # CONTINUES TO NEXT ITERATION AUTOMATICALLY
fi
```

### `scripts/ralph.sh` ✅

**Before:** Exited entire script on timeout
**After:** Continues to next iteration when timeout occurs

```bash
# Old behavior
if [ $exit_code -eq 124 ]; then
  echo "Iteration $i timed out"
  exit 1  # EXIT ENTIRE SCRIPT
fi

# New behavior
if [ $exit_code -eq 124 ]; then
  echo "⏱️  Iteration $i timed out after ${TIMEOUT_MINUTES} minutes"
  echo "   Claude Code process terminated. Continuing to next iteration..."
  # CONTINUES TO NEXT ITERATION
fi
```

### `scripts/ralph-once.sh` ⚠️

**Status:** No change needed (correct behavior)
**Behavior:** Exits after timeout (correct for single-iteration mode)

For HITL/single-iteration mode, exiting after timeout is the correct behavior since the user is watching and can decide what to do next.

## 🎯 How It Works Now

### Timeout Command

The scripts use `gtimeout` (macOS via brew) or `timeout` (Linux) to enforce time limits:

```bash
run_claude_with_timeout() {
  local timeout_duration=$1
  local prompt=$2

  if command -v gtimeout &> /dev/null; then
    gtimeout "$timeout_duration" claude "$prompt"
    return $?
  elif command -v timeout &> /dev/null; then
    timeout "$timeout_duration" claude "$prompt"
    return $?
  fi
}
```

### Exit Code 124

When `timeout`/`gtimeout` kills a process, it returns exit code 124. The scripts detect this and handle it appropriately:

- **ralph-loop.sh**: Log timeout, continue to next iteration
- **ralph.sh**: Log timeout, continue to next iteration
- **ralph-once.sh**: Log timeout, exit script (single iteration mode)

## ✅ Expected Behavior Now

### AFK/Loop Mode (`ralph-loop.sh`, `ralph.sh`)

```bash
./scripts/ralph-loop.sh 10 30  # 10 iterations, 30 min timeout

Iteration 1: ✅ Complete (20 minutes)
Iteration 2: ⏱️ TIMEOUT (30 minutes) - CONTINUES
Iteration 3: ✅ Complete (25 minutes)
Iteration 4: ⏱️ TIMEOUT (30 minutes) - CONTINUES
...continues until MAX_ITERATIONS reached
```

### HITL Mode (`ralph-once.sh`)

```bash
./scripts/ralph-once.sh 30  # 30 min timeout

Iteration 1: ⏱️ TIMEOUT (30 minutes) - EXITS
# User can review, then run again if needed
```

## 🔧 Timeout Configuration

Default timeouts:

- **ralph-once.sh**: 30 minutes (longer for supervised work)
- **ralph-loop.sh**: 30 minutes
- **ralph.sh**: 30 minutes

Change timeout per invocation:

```bash
# Custom timeout (45 minutes)
./scripts/ralph-loop.sh 20 45

# Custom timeout (60 minutes)
./scripts/ralph-once.sh 60
```

## 💡 Why This Matters

### Before Fix (Bad)

- Timeout → entire script exits
- AFK mode stops after first timeout
- Can't run unattended overnight
- Defeats purpose of autonomous development

### After Fix (Good)

- Timeout → just kills Claude Code process
- Next iteration starts automatically
- Can run unattended for hours/overnight
- True autonomous development
- Script tracks timeouts and continues

## 🎛️ Monitoring Timeouts

The scripts log timeouts in the output:

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⏱️  TIMEOUT: Iteration 5 exceeded 30 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Claude Code process terminated. Moving to next iteration...
```

Check `progress.txt` to see if work was completed before timeout.

## 🚀 Usage After Fix

### Autonomous Development (Recommended)

```bash
# Run 20 iterations with 30 min timeout each
# If an iteration times out, it just moves to the next one
./scripts/ralph-loop.sh 20 30

# Or fully automated (no prompts between iterations)
./scripts/ralph.sh 20 30
```

### Supervised Development

```bash
# Run one iteration with 30 min timeout
# If timeout occurs, script exits so you can review
./scripts/ralph-once.sh 30
```

## 📊 Impact

**Before:**

- Timeout → Script exits
- Manual restart required
- Can't run unattended
- Wasted timeout = wasted time

**After:**

- Timeout → Next iteration starts
- No manual intervention needed
- Can run overnight
- Timeout = quick recovery, continue work

## ✅ Verification

All scripts tested with valid bash syntax:

```bash
bash -n scripts/ralph-loop.sh  ✅
bash -n scripts/ralph.sh        ✅
bash -n scripts/ralph-once.sh   ✅
```

## 🎉 Result

Ralph can now truly run autonomously! If Claude gets stuck and times out, the process is killed and the next iteration starts automatically. Perfect for overnight/AFK development sessions.

---

**Related Files:**

- `scripts/ralph-loop.sh` - AFK autonomous loop (with prompts between iterations)
- `scripts/ralph.sh` - Fully automated loop (no prompts)
- `scripts/ralph-once.sh` - HITL single iteration mode
- `TIMEOUT_GUIDE.md` - General timeout documentation
- `RALPH_UPDATE_TIMEOUTS.md` - Original timeout implementation notes
