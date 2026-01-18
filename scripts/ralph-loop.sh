#!/bin/bash
# Ralph Wiggum AFK Loop for Claude Code
# Usage: ./ralph-loop.sh [max_iterations]
# Default: 15 iterations

set -e

MAX_ITERATIONS=${1:-15}
ITERATION=1

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Ralph Wiggum AFK Mode - Autonomous Loop            ║"
echo "║                 Max Iterations: $MAX_ITERATIONS                        ║"
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

Follow the per-iteration workflow:
1. Read context (RALPH_WIGGUM.md, prd.json, progress.txt)
2. Choose highest priority task with defer_to_next_sprint: false AND passes: false
3. Implement that ONE task following all standards in CLAUDE.md
4. While working, add any high-value discoveries to prd.json with defer_to_next_sprint: true
5. Run ALL feedback loops (pnpm typecheck, pnpm test, pnpm lint) - must pass
6. Update progress.txt with this iteration's work and any discoveries
7. Update prd.json to mark task passes: true
8. Commit with clear message referencing PRD ID

If ALL tasks with defer_to_next_sprint: false have passes: true:
  - Emit <promise>COMPLETE</promise> in progress.txt
  - Include summary: tasks completed, discoveries added, recommended next sprint

Work on ONLY ONE task. Quality over speed. Fight entropy.

When you're finished with the iteration, run /exit in Claude code so that the next iteration can start."

  echo "🤖 Launching Claude Code for iteration $ITERATION..."
  echo ""

  # Run Claude with the prompt
  # The user will need to let Claude finish and close the window manually
  claude "$PROMPT"

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
echo "   4. Run tests: cd apps/web && pnpm vitest run"
echo "   5. Check coverage improvements"
echo ""
echo "💡 If work incomplete, run script again or continue with more iterations"
echo ""
