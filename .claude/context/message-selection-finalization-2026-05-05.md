# Date
2026-05-05

# Summary
Tightened `/message` isolation prompts to reduce cross-request drift and changed button selection so the final Discord message collapses to only the original user text plus the chosen Raptor reply.

# Files created/modified
- api/api.js: introduced a dedicated final-output formatter, removed suggestion buttons after selection, and delete suggestion sessions once a choice is made.
- api/api.test.js: added coverage for collapsing a selected suggestion into the final two-block message.
- .claude/context/message-selection-finalization-2026-05-05.md: recorded the behavior change and rationale.

# Decisions made
- Kept Ollama model warm but reinforced statelessness at the prompt layer, since the request payload is already rebuilt per call.
- Finalized selections now clear the interactive state instead of leaving the option list visible, matching the desired single lifecycle per user message.

# Known issues or next steps
- Prompt isolation reduces drift but cannot guarantee perfect behavior from a small local model on highly underspecified user inputs.
- If drift still appears in production, the next step is to tighten or reduce few-shot examples for the linkedinfy path.