# Context: raptor-chatbot — /ask command & LLM integration

**Date:** 2026-04-06

## Summary
Added `/ask` slash command that sends the user's message to raptor-llm's `POST /chat` endpoint and replies with the AI response.

## Files modified
- `commands.js` — added `ASK_COMMAND` (name: `ask`, option: `message` string, required)
- `app.js` — added handler for the `ask` command; calls `LLM_URL/chat` via native `fetch`, handles errors gracefully

## Decisions
- Uses native `fetch` (Node 18+) — no extra dependency needed
- `LLM_URL` read from `process.env.LLM_URL`, defaults to `http://localhost:8000`
- On LLM error, returns a user-friendly message instead of crashing
- Response is formatted as `**Você:** <message>\n\n**IA:** <response>` inside a TEXT_DISPLAY component

## Next steps
- Run `yarn register` to publish the new `/ask` command to Discord
- Add `LLM_URL` to `.env`
