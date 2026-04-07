# app.js

Entry point for the Discord bot. Uses Express to receive HTTP POST interactions from Discord.

## Date: 2026-04-07
## Summary: `/challenge` command and all RPS game logic fully removed. `game.js` never existed in the filesystem. `componentHandler.js` simplified to empty stub. MESSAGE_COMPONENT dispatch removed from `app.js`. `activeGames` state removed.

## Setup
- Loads env via `dotenv`
- Listens on `process.env.PORT` (default 3000)
- All requests to `POST /interactions` are verified with `verifyKeyMiddleware(process.env.PUBLIC_KEY)`

## In-memory state
None.

## Interaction dispatch

### `PING`
Returns `PONG` for Discord's endpoint verification.

### `APPLICATION_COMMAND`

| Command | Behavior |
|---|---|
| `clearchannel` | Defers immediately (ephemeral), calls `purgeChannel()` from `api/discord.js` in background |
| `translatechannel` | Defers immediately, calls `translateChannelMessages()` from `api/api.js` in background |
| `ask` | Defers immediately (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`), calls `askAndRespond()` from `api/api.js` in background |

## Flags / Components
All responses use `IS_COMPONENTS_V2` flag. Messages use `TEXT_DISPLAY` components instead of legacy `content` field. Ephemeral responses combine `EPHEMERAL | IS_COMPONENTS_V2`.

## Response timing — res.send inside try/catch
Discord interaction tokens expire in ~3 seconds. **`res.send` must be called inside each branch of try/catch**, never after. If placed outside and the async call throws, the interaction expires with no response to the user. Both `try` and `catch` blocks must independently call `res.send`.

## Environment variables
- `PUBLIC_KEY` — Discord public key for request verification
- `APP_ID` — Discord application ID
- `DISCORD_TOKEN` — Bot token (used in DiscordRequest)
- `PORT` — Server port (default 3000)
- `LLM_URL` — raptor-llm base URL (default `http://localhost:8000`)

## Imports
- `discord-interactions`: `InteractionType`, `InteractionResponseType`, `verifyKeyMiddleware`
- `dotenv/config` (side-effect)
- `express`
- `./handlers/commandHandler.js`: `handleCommand`
