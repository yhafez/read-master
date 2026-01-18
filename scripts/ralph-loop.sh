#!/bin/bash
# Ralph Wiggum AFK Loop for Claude Code
# Usage: ./ralph-loop.sh [max_iterations] [timeout_minutes]
# Default: 15 iterations, 30 minutes timeout per iteration

set -e

MAX_ITERATIONS=${1:-15}
TIMEOUT_MINUTES=${2:-30}  # Default 30 minutes per iteration
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))
ITERATION=1

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Ralph Wiggum AFK Mode - Autonomous Loop            ║"
echo "║     Max Iterations: $MAX_ITERATIONS | Timeout: ${TIMEOUT_MINUTES}m per iteration  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Promote discoveries from previous sprint to current sprint
if [ -f docs/prd.json ]; then
  DEFERRED_COUNT=$(grep -c '"defer_to_next_sprint": true' docs/prd.json || echo "0")
  if [ "$DEFERRED_COUNT" -gt 0 ]; then
    echo "🔄 Promoting $DEFERRED_COUNT discovered items to current sprint..."
    # Use sed to change all defer_to_next_sprint: true to false
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' 's/"defer_to_next_sprint": true/"defer_to_next_sprint": false/g' docs/prd.json
    else
      # Linux
      sed -i 's/"defer_to_next_sprint": true/"defer_to_next_sprint": false/g' docs/prd.json
    fi
    echo "✅ Promoted $DEFERRED_COUNT items - now available for Ralph to work on"
    echo ""
  fi
fi

# Create initial progress.txt if it doesn't exist
if [ ! -f progress.txt ]; then
  echo "Initializing progress.txt..."
  cat > progress.txt << 'EOF'
# Ralph Wiggum Progress Tracking
# This file tracks autonomous iteration progress
# Format: [timestamp] Status: Description

EOF
fi

# Function to check if Ralph is complete
check_completion() {
  if [ -f progress.txt ]; then
    if grep -q "<promise>COMPLETE</promise>" progress.txt; then
      return 0
    fi
  fi
  return 1
}

# Function to count completed tasks
count_completed_tasks() {
  if [ -f docs/prd.json ]; then
    grep -c '"passes": true' docs/prd.json || echo "0"
  else
    echo "0"
  fi
}

# Function to run Claude with timeout
run_claude_with_timeout() {
  local timeout=$1
  local prompt=$2

  # Check if gtimeout (GNU coreutils) is available on macOS
  if command -v gtimeout &> /dev/null; then
    gtimeout "$timeout" claude "$prompt" 2>&1
    return $?
  elif command -v timeout &> /dev/null; then
    timeout "$timeout" claude "$prompt" 2>&1
    return $?
  else
    # Fallback: run without timeout but warn user
    echo "⚠️  Warning: timeout command not found. Install with: brew install coreutils"
    echo "⚠️  Running without timeout protection (command may hang)"
    echo "⚠️  You'll need to manually close Claude Code if it gets stuck"
    echo ""
    claude "$prompt"
    return $?
  fi
}

# Main loop
while [ $ITERATION -le $MAX_ITERATIONS ]; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ITERATION $ITERATION of $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  COMPLETED=$(count_completed_tasks)
  echo "📊 Tasks completed so far: $COMPLETED"
  echo ""

  # Create the prompt for this iteration
  PROMPT="Read @docs/RALPH_WIGGUM.md and @docs/prd.json and @progress.txt

Ralph Wiggum - Autonomous Iteration $ITERATION

⏱️  TIMEOUT WARNING: You have ${TIMEOUT_MINUTES} minutes to complete this iteration.
The script will automatically terminate if you don't finish and run /exit within this time.
Plan your work accordingly - focus on completing ONE task with high quality.

Follow the per-iteration workflow:
1. Read context (RALPH_WIGGUM.md, prd.json, progress.txt)
2. Choose highest priority task with defer_to_next_sprint: false AND passes: false
3. Implement that ONE task following all standards in CLAUDE.md
4. While working, add any high-value discoveries to prd.json with defer_to_next_sprint: true
5. Run ALL feedback loops (pnpm typecheck, pnpm lint, pnpm vitest run) - must pass
6. Update progress.txt with this iteration's work and any discoveries
7. Update prd.json to mark task passes: true
8. Commit with clear message referencing PRD ID

If ALL tasks with defer_to_next_sprint: false have passes: true:
  - Emit <promise>COMPLETE</promise> in progress.txt
  - Include summary: tasks completed, discoveries added, recommended next sprint

Work on ONLY ONE task. Quality over speed. Fight entropy.

⚠️ CRITICAL: When you're finished with the iteration, you MUST run /exit in Claude Code to start the next iteration.
If you don't run /exit within ${TIMEOUT_MINUTES} minutes, the iteration will be terminated automatically.

Time management tips:
- Choose a task you can complete within ${TIMEOUT_MINUTES} minutes
- If a task seems too large, break it down or add discoveries for next sprint
- Save complex refactoring for separate iterations
- Always reserve time for tests and commit at the end"

  echo "🤖 Launching Claude Code for iteration $ITERATION (${TIMEOUT_MINUTES}m timeout)..."
  echo ""

  # Run Claude with the prompt and timeout
  run_claude_with_timeout "${TIMEOUT_SECONDS}s" "$PROMPT"
  exit_code=$?

  # Check for timeout (exit code 124)
  if [ $exit_code -eq 124 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ⏱️  TIMEOUT: Iteration $ITERATION exceeded ${TIMEOUT_MINUTES} minutes"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Claude Code did not exit within the timeout period."
    echo ""
    echo "📋 What to do:"
    echo "   1. Check progress.txt to see if work was completed"
    echo "   2. Review git log for any commits made"
    echo "   3. Manually close Claude Code if still running"
    echo "   4. Verify tests pass: pnpm vitest run"
    echo ""
    read -p "Continue to next iteration anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "🛑 Stopping Ralph loop. Review and fix issues before continuing."
      exit 1
    fi
  fi

  echo ""
  echo "✅ Iteration $ITERATION complete"
  echo ""

  # Check if Ralph declared completion
  if check_completion; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🎉 RALPH REPORTS COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Final Status:"
    COMPLETED=$(count_completed_tasks)
    echo "   Tasks completed: $COMPLETED"
    echo "   Iterations used: $ITERATION of $MAX_ITERATIONS"
    echo ""
    echo "📋 Review:"
    echo "   - progress.txt for full iteration log"
    echo "   - docs/prd.json for discoveries (defer_to_next_sprint: true)"
    echo "   - git log for all commits"
    echo ""
    echo "🚀 Recommended: Review discoveries and plan next sprint!"
    exit 0
  fi

  # Ask user if they want to continue
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  read -p "Continue to iteration $((ITERATION + 1))? (y/n/q to quit): " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Qq]$ ]]; then
    echo ""
    echo "🛑 Stopping Ralph loop at user request"
    echo "   Completed $ITERATION iterations"
    echo "   Review progress.txt and docs/prd.json"
    exit 0
  elif [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🛑 Stopping Ralph loop"
    exit 0
  fi

  ITERATION=$((ITERATION + 1))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⏱️  REACHED MAX ITERATIONS ($MAX_ITERATIONS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
COMPLETED=$(count_completed_tasks)
echo "📊 Final Status:"
echo "   Tasks completed: $COMPLETED"
echo "   Iterations used: $MAX_ITERATIONS"
echo ""
echo "📋 Next Steps:"
echo "   1. Review progress.txt for full log"
echo "   2. Check docs/prd.json for discoveries"
echo "   3. Review git log for all commits"
echo "   4. Run tests: pnpm vitest run"
echo "   5. Check coverage improvements"
echo ""
echo "💡 If work incomplete, run script again or continue with more iterations"
echo ""
