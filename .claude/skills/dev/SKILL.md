---
name: dev
description: "Use when: implementing features, adding commands, modifying bot logic, editing any source file, integrating new functionality, fixing bugs, or making any code change in raptor-chatbot. Always load this skill before writing or modifying code in this project."
applyTo: "**"
---

# Dev workflow - Implement/integrate functionalities

This is a single-project Discord bot (`raptor-chatbot`). Follow the steps below for any implementation task.

## 1. Read copilot instructions (required before any code change)

- `e:/raptor/raptor-chatbot/.github/copilot-instructions.md`

## 2. Read existing context files

Read the `.md` files from `.claude/context/` that are relevant to the task:

- `e:/raptor/raptor-chatbot/.claude/context/app.md` — Express server / interaction dispatch
- `e:/raptor/raptor-chatbot/.claude/context/game.md` — RPS game logic
- `e:/raptor/raptor-chatbot/.claude/context/commands.md` — slash command registration
- `e:/raptor/raptor-chatbot/.claude/context/utils.md` — shared utilities

Read all files that touch the area being changed.

## 3. Perform the task

Execute the user's request following the patterns and conventions defined in the copilot instructions and existing context. Key conventions to respect:

- **ESM modules** — use `import`/`export`, never `require`.
- **Components V2** — always use `IS_COMPONENTS_V2` flag with `TEXT_DISPLAY` components; never use top-level `content`.
- **`activeGames`** is in-memory only — do not introduce persistence without discussion.
- No test suite is configured — skip test creation unless the user explicitly requests it.

## 4. Save context after completion

After completing the task, update or create the relevant context `.md` file(s) in:

- `e:/raptor/raptor-chatbot/.claude/context/<file>.md`

The context file must include:
- **Date:** today's date (YYYY-MM-DD)
- **Summary:** brief description of what was done and why
- **Files created/modified:** list of all files touched with a short description of each change
- **Decisions made:** any architectural or implementation decisions, including alternatives considered
- **Known issues or next steps:** if any

---

$ARGUMENTS
