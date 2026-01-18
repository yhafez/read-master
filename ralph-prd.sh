#!/bin/bash
# ralph-prd.sh - Human-in-the-loop Ralph for Read Master PRD
# Usage: ./ralph-prd.sh

set -e

echo "🤓 Running Ralph (HITL mode) - Watch and intervene as needed"
echo "============================================================"

claude -p "@prd.json @progress.txt @CLAUDE.md

<task>
You are working on the Read Master application following the comprehensive PRD in prd.json.

QUALITY STANDARD:
Production code. Must be maintainable, testable, and follow best practices. 
This codebase will outlive you - fight entropy, leave it better than you found it.

YOUR WORKFLOW:
1. Read prd.json to see all available tasks
2. Read progress.txt to see what's been completed
3. Choose ONE task to work on based on:
   - Priority: critical > high > medium > low
   - Dependencies: infrastructure before features, API before UI
   - Risk: architectural decisions and integrations first
   - Your judgment on what's most important right now

4. Work on ONLY that ONE task:
   - Follow the task's steps array
   - Meet all acceptance_criteria
   - Write tests for new functionality
   - Ensure code quality matches CLAUDE.md standards

5. Run ALL feedback loops before committing:
   - pnpm typecheck (must pass with NO errors)
   - pnpm lint (must pass with NO errors)
   - pnpm vitest run (all tests must pass)
   DO NOT COMMIT if any feedback loop fails. Fix issues first.

6. Update prd.json:
   - Set the task's \"passes\" field to true
   - Save the file

7. Update progress.txt:
   - Append a concise progress note:
     [TIMESTAMP] task-id: Brief description
     - Key decisions made and why
     - Files changed
     - Any blockers or notes for next iteration
   - Be concise. Sacrifice grammar for brevity.

8. Make a git commit:
   - Message format: 'task-id: description'
   - Commit only the work for this ONE task
   - DO NOT use --no-verify

9. Check completion:
   - If ALL tasks in prd.json have \"passes\": true
   - Output: <promise>COMPLETE</promise>
   - Otherwise, just report completion of this task

REMEMBER:
- Small steps, high quality
- Tests must validate actual functionality
- One task per iteration
- Run feedback loops before every commit
</task>
"

echo ""
echo "✅ Ralph iteration complete. Review the changes and run again when ready."
