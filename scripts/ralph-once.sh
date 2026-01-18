#!/bin/bash
# Ralph Wiggum HITL Mode - Single Iteration
# Usage: ./ralph-once.sh [timeout_minutes]
# Default: 30 minutes timeout

set -e

TIMEOUT_MINUTES=${1:-30}  # Default 30 minutes
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    Ralph Wiggum HITL Mode - Single Iteration              ║"
echo "║    (Human-In-The-Loop for learning and supervision)       ║"
echo "║    Timeout: ${TIMEOUT_MINUTES} minutes per iteration                   ║"
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

# Check if this is the first iteration
if [ ! -f progress.txt ]; then
  echo "📝 First iteration detected - initializing progress.txt"
  ITERATION_NUM=1
else
  ITERATION_NUM=$(grep -c "^\[20" progress.txt || echo "0")
  ITERATION_NUM=$((ITERATION_NUM + 1))
  echo "📝 Continuing from iteration $ITERATION_NUM"
fi

# Count completed tasks
if [ -f docs/prd.json ]; then
  COMPLETED=$(grep -c '"passes": true' docs/prd.json || echo "0")
  echo "📊 Tasks completed so far: $COMPLETED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting Ralph Iteration $ITERATION_NUM (HITL Mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create the prompt
PROMPT="Read @docs/RALPH_WIGGUM.md and @docs/prd.json"

if [ -f progress.txt ]; then
  PROMPT="$PROMPT and @progress.txt"
fi

PROMPT="$PROMPT

Ralph Wiggum - HITL Iteration $ITERATION_NUM

⏱️  TIMEOUT WARNING: You have ${TIMEOUT_MINUTES} minutes to complete this iteration.
The script will automatically terminate if you don't finish and run /exit within this time.
Plan your work accordingly - focus on completing ONE task with high quality.

Follow the per-iteration workflow:

1. Read Context
   - Understand what's already done (progress.txt)
   - See what needs doing (prd.json tasks with defer_to_next_sprint: false, passes: false)

2. Choose Task Strategically
   - Pick highest priority/risk task that fits within ${TIMEOUT_MINUTES} minutes
   - Explain your reasoning for the choice
   - Consider task complexity vs available time

3. Implement ONE Task
   - Follow all standards in CLAUDE.md
   - Keep changes small and focused
   - Write production-grade code

4. Discovery Mode (While Working)
   - Spot high-value opportunities (performance, UX, monetization, bugs, etc.)
   - Add discoveries to prd.json with defer_to_next_sprint: true
   - Include rationale, priority, risk, acceptance criteria

5. Run Feedback Loops (Non-Negotiable)
   - pnpm typecheck (must pass)
   - pnpm lint (must pass)
   - pnpm vitest run (must pass)
   - Do NOT commit if any fail

6. Update Tracking
   - Append to progress.txt (timestamp, task, files, tests, decisions, discoveries)
   - Mark task passes: true in prd.json
   - Document any blockers or decisions

7. Commit Cleanly
   - Clear message with PRD ID reference
   - Example: \"infra-001: set up pnpm monorepo with workspaces\"

Quality over speed. Fight entropy. Leave codebase better than you found it.

⚠️ CRITICAL: When you're finished with the iteration, run /exit in Claude Code to allow script to continue.
If you don't run /exit within ${TIMEOUT_MINUTES} minutes, the iteration will be terminated automatically.

Time management tips:
- Choose a task you can complete within ${TIMEOUT_MINUTES} minutes
- If a task seems too large, break it down or add discoveries for next sprint
- Save complex refactoring for separate iterations
- Always reserve time for tests and commit at the end

If ALL current sprint tasks complete, emit <promise>COMPLETE</promise> with summary."

echo "🤖 Launching Claude Code..."
echo ""
echo "💡 Tips:"
echo "   - Watch what Ralph does and learn the patterns"
echo "   - Ask questions if something seems off"
echo "   - Review code before it commits"
echo "   - Check progress.txt after completion"
echo "   - Don't forget to run /exit when finished!"
echo ""
echo "Press Enter to launch Claude..."
read -r

# Launch Claude with timeout
if command -v gtimeout &> /dev/null; then
  gtimeout "${TIMEOUT_SECONDS}s" claude "$PROMPT" || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
      echo ""
      echo "⏱️  TIMEOUT: Claude Code did not exit within ${TIMEOUT_MINUTES} minutes"
      echo "💡 Remember to run /exit in Claude Code when iteration is complete"
      exit 1
    fi
  }
elif command -v timeout &> /dev/null; then
  timeout "${TIMEOUT_SECONDS}s" claude "$PROMPT" || {
    exit_code=$?
    if [ $exit_code -eq 124 ]; then
      echo ""
      echo "⏱️  TIMEOUT: Claude Code did not exit within ${TIMEOUT_MINUTES} minutes"
      echo "💡 Remember to run /exit in Claude Code when iteration is complete"
      exit 1
    fi
  }
else
  echo "⚠️  Warning: timeout command not found. Install with: brew install coreutils"
  echo "⚠️  Running without timeout protection - you'll need to manually close Claude Code"
  echo ""
  claude "$PROMPT"
fi

echo ""
echo "✅ Iteration $ITERATION_NUM complete"
echo ""
echo "📋 Next Steps:"
echo "   1. Review progress.txt - what did Ralph do?"
echo "   2. Check docs/prd.json - any discoveries added?"
echo "   3. Review git log - is the commit clean?"
echo "   4. Run tests yourself: pnpm vitest run"
echo ""
echo "🔄 To continue: ./scripts/ralph-once.sh (run another HITL iteration)"
echo "🚀 To go AFK: ./scripts/ralph-loop.sh 15 (run 15 autonomous iterations)"
echo ""
