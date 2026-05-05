# Context: /message suggestions via buttons

**Date:** 2026-05-04

## Summary
Replaced plain Discord `/message` output with selectable suggestions via message buttons when multiple alternatives are detected. The bot parses up to 3 response options from the LLM output, displays them in the message, and lets users switch the selected option by clicking a button.

## Files created/modified

### Modified
- `api/api.js`
  - Added suggestion extraction from LLM response text (quotes, `or` split, multi-line fallback).
  - Added in-memory suggestion session store with TTL and custom-id resolver for component clicks.
  - Updated `askAndRespond()` to render suggestion list + buttons when multiple options exist.
  - History save now stores selected suggestion (default: first option).
- `api/discord.js`
  - Extended `editInteractionResponse()` to support extra components (buttons) while preserving `TEXT_DISPLAY` in Components V2.
- `handlers/componentHandler.js`
  - Implemented `MESSAGE_COMPONENT` handling for suggestion selection.
  - Valid selection updates the original message (`UPDATE_MESSAGE`).
  - Invalid/expired selection returns ephemeral fallback text.
- `app.js`
  - Re-enabled dispatch for `InteractionType.MESSAGE_COMPONENT` to `handleComponent()`.

### Created
- `handlers/componentHandler.test.js`
  - Added tests for valid button update and invalid/expired button behavior.

## Decisions made
- Kept suggestion sessions in memory (30-minute TTL) to avoid persistence complexity.
- Used button `custom_id` format `message_suggestion:<sessionId>:<index>` for deterministic lookup.
- Preserved Components V2 contract by always returning `TEXT_DISPLAY` and adding action-row buttons only when options exist.
- Kept the implementation focused on Discord UX without introducing extra persistence layers.

## Known issues or next steps
- If the LLM returns only one option, no buttons are shown (single final output only).
- Suggestion extraction is heuristic; if output formatting changes significantly, parser tuning may be needed.
- Current flow does not persist the user-selected option back into history after a button click; it stores the initial selected option (first suggestion) at send time.
