#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# Promote all discoveries from previous sprint by setting defer_to_next_sprint to false
echo "🔄 Promoting discoveries from previous sprint..."
sed -i '' 's/"defer_to_next_sprint": true/"defer_to_next_sprint": false/g' docs/prd.json
echo "✅ All discoveries promoted to current sprint"
echo ""

for ((i=1; i<=$1; i++)); do
  echo "Iteration $i"
  echo "--------------------------------"

  # Create the prompt for this iteration
  PROMPT="Read @docs/RALPH_WIGGUM.md and @docs/prd.json and @progress.txt

Ralph Wiggum - Autonomous Iteration $i

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

  result=$(claude -p "$PROMPT" --output-format text 2>&1) || true

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "All tasks complete after $i iterations."
    exit 0
  fi

  echo ""
  echo "--- End of iteration $i ---"
  echo ""
done

echo "Reached max iterations ($1)"
exit 1