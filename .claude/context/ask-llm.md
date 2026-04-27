# Context: raptor-chatbot — /message command & LLM integration

**Date:** 2026-04-27

## Summary
The `/message` command sends the user's message to raptor-llm's `POST /chat` endpoint via a deferred interaction pattern to avoid Discord's 3-second timeout. Logic is split across `api/api.js` and `api/discord.js`.

## Files
- `commands.js` — `MESSAGE_COMMAND` (name: `message`, option: `message` string, required)
- `app.js` — handler for `message`; immediately defers with `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`, then fires `askAndRespond()` in background
- `api/api.js` — `askLLM(message)`: POSTs to `LLM_URL/chat`, returns response string (or fallback on error); `askAndRespond(message, token)`: calls LLM then edits the deferred interaction
- `api/discord.js` — `editInteractionResponse(token, content)`: PATCHes `webhooks/.../messages/@original` with the final content

## Deferred flow
1. Discord sends `/message` interaction
2. `app.js` immediately responds with `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` — Discord shows “Bot is thinking...”
3. `askAndRespond()` runs in background (no timeout pressure)
4. LLM responds — `editInteractionResponse()` patches the original message with the result

## Decisions
- `LLM_URL` read from `process.env.LLM_URL`, default `http://localhost:8000` — defined in `api/api.js`
- All error handling is inside `api/` modules — `app.js` has zero try/catch
- Response format: `**You:** <message>\n\n**Raptor:** <llm_response>`
