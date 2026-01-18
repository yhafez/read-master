# Ralph Wiggum - Autonomous Development Workflow

A structured workflow for autonomous AI-driven development iterations.

## Overview

Ralph Wiggum is an autonomous development workflow that enables consistent, high-quality code delivery through structured iterations. Each iteration follows a strict workflow ensuring code quality, test coverage, and documentation.

## Per-Iteration Workflow

1. **Read Context**
   - Read `docs/RALPH_WIGGUM.md` (this file)
   - Read `docs/prd.json` (task registry)
   - Read `progress.txt` (development log)

2. **Choose Task**
   - Find highest priority task where:
     - `defer_to_next_sprint: false`
     - `passes: false`
   - Priority is determined by `priority` field (1 = highest)

3. **Implement Task**
   - Follow all standards in `CLAUDE.md`
   - Write tests first when applicable
   - Keep changes focused and minimal

4. **Discover & Document**
   - While working, note high-value discoveries
   - Discoveries can include:
     - Performance improvements
     - UX improvements
     - Bug fixes
     - Code cleanup
     - Documentation improvements
     - Test coverage improvements
     - Security improvements
     - Monetization opportunities
     - New features
     - New APIs
     - New libraries
     - New tools
     - New patterns
     - New best practices
     - New documentation
     - New tests
     - New code
     - More
   - Add discoveries to `prd.json` with `defer_to_next_sprint: true`

5. **Run Feedback Loops**
   - `pnpm typecheck` - must pass
   - `pnpm lint` - must pass
   - `pnpm test` - must pass

6. **Update Progress**
   - Add iteration entry to `progress.txt`
   - Note discoveries and blockers

7. **Mark Complete**
   - Update `prd.json`: set `passes: true` for completed task

8. **Commit**
   - Use conventional commit format
   - Reference PRD ID in message

## Sprint Completion

When ALL tasks with `defer_to_next_sprint: false` have `passes: true`:

- Emit `<promise>COMPLETE</promise>` in `progress.txt`
- Include summary:
  - Tasks completed count
  - Discoveries added count
  - Recommended next sprint priorities

## prd.json Structure

```json
{
  "sprint": 1,
  "tasks": [
    {
      "id": "infra-001",
      "title": "Task title",
      "description": "Detailed description",
      "priority": 1,
      "category": "infrastructure|database|api|frontend|testing",
      "defer_to_next_sprint": false,
      "passes": false,
      "dependencies": [],
      "acceptance_criteria": []
    }
  ],
  "discoveries": []
}
```

## Principles

1. **One Task Per Iteration** - Focus on quality over quantity
2. **Fight Entropy** - Leave codebase better than you found it
3. **Test Everything** - Tests validate functionality, not the other way around
4. **Document Discoveries** - Future iterations benefit from today's learnings
5. **Never Skip Feedback Loops** - All checks must pass before commit

## Exit Command

When finished with an iteration, run `/exit` in Claude Code to allow the next iteration to start.
