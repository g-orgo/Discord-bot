# Date
2026-05-05

# Summary
Changed `/message` to use a staged, single-message interaction flow. The bot now edits the same Discord message through linkedinfy, context gate, translation, and an optional checkpoint before generating extra suggestions.

# Files created/modified
- api/api.js: replaced the one-shot `/chat` call with staged pipeline orchestration, single-message progress updates, and finish/continue checkpoint buttons.
- api/api.test.js: added a workflow test that verifies repeated edits on the same interaction and the step-4 checkpoint buttons.
- README.md: documented the staged `/message` UX and the compute-saving optional stages.

# Decisions made
- Kept the UX in one message only; no follow-up progress messages are sent.
- Added a checkpoint after the primary translation so steps 5 and 6 only run on user demand.
- Reused the existing button/session pattern so optional continuation and final suggestion choice stay consistent with the current Discord interaction model.

# Known issues or next steps
- The staged flow is only implemented for the Discord `/message` path; the web client still uses its own chat endpoints.
- If the product needs explicit retry for the optional steps, add a `retry optional steps` button to the same message state machine.

# Update (linkedinfy-sourced suggestions)

## Summary
Adjusted optional suggestion generation so alternatives now come from the same linkedinfy process using the original user message, instead of a separate suggestions-generation prompt path.

## Files created/modified
- api/api.js: `continuePipelineSuggestions` now calls `/chat/pipeline/linkedinfy`, extracts alternatives, and only uses finalize for context validation/cleanup.

## Decisions made
- Removed dedicated suggestions endpoints from the LLM pipeline. Optional alternatives now come directly from a second linkedinfy pass over the original user message, then are cleaned/deduplicated in the bot.

## Known issues or next steps
- If linkedinfy returns only one wording for highly constrained messages, optional suggestions can still collapse to one result after local cleanup/dedup.