#!/bin/bash
# ralph-prd-afk.sh - Autonomous Ralph for Read Master PRD
# Usage: ./ralph-prd-afk.sh 30  (runs 30 iterations)

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 30  # Run 30 iterations"
  exit 1
fi

ITERATIONS=$1

echo "🚀 Running Ralph in AFK mode for $ITERATIONS iterations"
echo "=========================================================="
echo "⚠️  Make sure you're in a Docker sandbox for safety!"
echo ""

for ((i=1; i<=$ITERATIONS; i++)); do
  echo "==== Iteration $i/$ITERATIONS ===="
  echo "$(date '+%Y-%m-%d %H:%M:%S')"
  
  result=$(docker sandbox run claude -p "@prd.json @progress.txt @CLAUDE.md

<task>
You are working AUTONOMOUSLY on Read Master following prd.json.

QUALITY: Production code. Maintainable. Tested. Fight entropy.

WORKFLOW:
1. Read prd.json - find highest priority task with \"passes\": false
2. Prioritize: critical > high > medium > low, dependencies first
3. Work on ONE task:
   - Follow steps
   - Meet acceptance_criteria  
   - Write tests
   - Quality per CLAUDE.md

4. Feedback loops (MUST PASS):
   - pnpm typecheck
   - pnpm lint
   - pnpm vitest run
   DO NOT commit if any fail.

5. Update prd.json: set \"passes\": true
6. Append to progress.txt: [time] task-id: notes
7. Git commit: 'task-id: description'
8. If all tasks done: <promise>COMPLETE</promise>

ONE TASK ONLY. Small steps. High quality.
</task>
")
  
  echo "$result"
  echo ""
  
  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "🎉 ============================================="
    echo "✅ ALL PRD TASKS COMPLETE!"
    echo "Check progress.txt and git log for details."
    echo "=============================================="
    exit 0
  fi
  
  sleep 5  # Rate limit between iterations
done

echo ""
echo "✅ Completed $ITERATIONS iterations"
echo "Check progress.txt for status"
echo "Run again to continue: ./ralph-prd-afk.sh <iterations>"
