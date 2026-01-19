#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations> [timeout_minutes]"
  echo "  iterations: Number of iterations to run"
  echo "  timeout_minutes: Optional timeout per iteration (default: 30)"
  exit 1
fi

# Configuration
MAX_ITERATIONS=$1
TIMEOUT_MINUTES=${2:-30}  # Default 30 minutes per iteration
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Ralph Wiggum - Automated Loop                      ║"
echo "║  Max Iterations: $MAX_ITERATIONS | Timeout: ${TIMEOUT_MINUTES}m per iteration   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Promote all discoveries from previous sprint by setting defer_to_next_sprint to false
echo "🔄 Promoting discoveries from previous sprint..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' 's/"defer_to_next_sprint": true/"defer_to_next_sprint": false/g' docs/prd.json
else
  # Linux
  sed -i 's/"defer_to_next_sprint": true/"defer_to_next_sprint": false/g' docs/prd.json
fi
echo "✅ All discoveries promoted to current sprint"
echo ""

# Function to run command with timeout
run_with_timeout() {
  local timeout=$1
  local prompt=$2

  # Check if gtimeout (GNU coreutils) is available on macOS
  if command -v gtimeout &> /dev/null; then
    gtimeout "$timeout" claude -p "$prompt" --output-format text 2>&1 || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        echo "⏱️  TIMEOUT: Claude Code did not exit within ${TIMEOUT_MINUTES} minutes"
        echo "💡 Tip: Make sure Ralph runs /exit at the end of each iteration"
        return 124
      fi
      return $exit_code
    }
  elif command -v timeout &> /dev/null; then
    timeout "$timeout" claude -p "$prompt" --output-format text 2>&1 || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        echo "⏱️  TIMEOUT: Claude Code did not exit within ${TIMEOUT_MINUTES} minutes"
        echo "💡 Tip: Make sure Ralph runs /exit at the end of each iteration"
        return 124
      fi
      return $exit_code
    }
  else
    # Fallback: run in background with manual timeout check
    echo "⚠️  Warning: timeout command not found. Install with: brew install coreutils"
    echo "⚠️  Running without timeout protection (command may hang)"
    claude -p "$prompt" --output-format text 2>&1 || true
  fi
}

for ((i=1; i<=$MAX_ITERATIONS; i++)); do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ITERATION $i of $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Create the prompt for this iteration
  PROMPT="Read @docs/RALPH_WIGGUM.md and @docs/prd.json and @progress.txt

Ralph Wiggum - Autonomous Iteration $i

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

  echo "🤖 Starting iteration $i with ${TIMEOUT_MINUTES}m timeout..."
  echo ""

  result=$(run_with_timeout "${TIMEOUT_SECONDS}s" "$PROMPT")
  exit_code=$?

  echo "$result"

  # Check for timeout
  if [ $exit_code -eq 124 ]; then
    echo ""
    echo "⏱️  Iteration $i timed out after ${TIMEOUT_MINUTES} minutes"
    echo "   Claude Code process terminated. Continuing to next iteration..."
    echo ""
  fi

  # Check for completion
  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🎉 ALL TASKS COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   All tasks complete after $i iterations."
    echo ""
    exit 0
  fi

  echo ""
  echo "✅ Iteration $i complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⏱️  REACHED MAX ITERATIONS ($MAX_ITERATIONS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Review progress.txt and docs/prd.json"
echo "   If work is incomplete, run script again"
echo ""
exit 1
