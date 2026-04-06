# Context: raptor-chatbot — /translatechannel command

**Date:** 2026-04-06

## Summary
New `/translatechannel` slash command that scans the last 50 messages in a channel, detects non-English ones via the LLM, replies to each with an English translation, and deletes the original message.

## Files created/modified
- `commands.js` — added `TRANSLATE_CHANNEL_COMMAND` and registered it in `ALL_COMMANDS`
- `app.js` — added handler for `translatechannel`; defers immediately (ephemeral); calls `translateChannelMessages()` fire-and-forget; added `translateChannelMessages` to import from `api/api.js`
- `api/api.js` — added `DiscordRequest` import from `../utils.js`; added `detectAndTranslate(text)`; added `translateChannelMessages(channelId, token)`

## Architecture

### `detectAndTranslate(text)`
- Calls `POST /generate` on raptor-llm (no system prompt — raw detection + translation)
- Prompt instructs LLM: reply `ENGLISH` if message is already in English, otherwise return only the translation
- Returns `null` if already English or on any error (message is skipped)

### `translateChannelMessages(channelId, token)`
- Fetches last 50 messages via `GET channels/{channelId}/messages?limit=50`
- Skips bot messages and messages with no text content
- For each non-English message: posts a reply with `content: "**Translation:** <text>"` and `message_reference: { message_id }`, then deletes the original via `DELETE channels/{channelId}/messages/{messageId}`
- Edits deferred interaction with a count summary on completion
- All errors caught internally — never throws

### Command handler in `app.js`
- Responds with `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` + `EPHEMERAL` immediately
- Calls `translateChannelMessages(channelId, token)` fire-and-forget (same pattern as `/ask`)

## Decisions
- Used `POST /generate` instead of `POST /chat` to avoid the rewriting system prompt — we need straight translation, not tone adjustment
- Reply message uses plain `content` field (not Components V2) because it is a regular channel message, not an interaction response
- Command contexts: `[0, 2]` (guild + private channel) — same as `/logchannel`; excludes bot DMs since channel scanning doesn't apply there
- Deferred response is ephemeral so only the command invoker sees the progress/summary

## Known issues / next steps
- Bot must have `MANAGE_MESSAGES` permission to delete messages from other users in a guild
- No concurrency limit — if the channel has many non-English messages, multiple sequential LLM calls will run; very large channels may take a while
- `yarn register` must be run after this change to register the new slash command with Discord
