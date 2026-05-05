# Context: raptor-chatbot — /message command & LLM integration

**Date:** 2026-05-04

## Summary
The `/message` command uses a deferred-interaction flow and consumes only `{ model, response }` from the LLM `/chat` endpoint. When the response contains multiple alternatives, the bot presents up to three choices as buttons so the user can select the preferred final text.

## Files created/modified
- `api/api.js` — normalizes chat payload as response-only and handles alternative extraction + button sessions
- `api/api.test.js` — validates response-only chat payload behavior
- `handlers/componentHandler.js` — applies button selections to update the original interaction message
- `../raptor-chatbot-llm/routes/chat.py` — returns only `model` and `response`
- `../raptor-chatbot-llm/schemas.py` — response model no longer includes extra metadata

## Deferred flow
1. Discord sends `/message` interaction.
2. `app.js` immediately responds with `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`.
3. `askAndRespond()` runs in background.
4. The LLM returns `{ model, response }`, and the bot patches the original message.
5. If multiple alternatives are detected, buttons are rendered so users can switch the selected option.

## Decisions made
- Removed score/suggestion metadata from the chat API contract across all services.
- Kept suggestion buttons in Discord as a UX convenience based on generated text alternatives.
- Stored Discord history as plain user/bot text pairs.

## Known issues or next steps
- Alternative extraction is heuristic and may need tuning if the LLM output format changes.
