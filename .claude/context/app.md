# app.js

Entry point for the Discord bot. Uses Express to receive HTTP POST interactions from Discord.

## Date: 2026-04-06
## Summary: Audit update — added /ask and /logchannel to dispatch table; challenge handler remains commented out (component handlers still active).

## Setup
- Loads env via `dotenv`
- Listens on `process.env.PORT` (default 3000)
- All requests to `POST /interactions` are verified with `verifyKeyMiddleware(process.env.PUBLIC_KEY)`

## In-memory state
- `activeGames` — keyed by interaction ID; stores `{ id: userId, objectName }` for pending challenge games

## Interaction dispatch

### `PING`
Returns `PONG` for Discord's endpoint verification.

### `APPLICATION_COMMAND`

| Command | Behavior |
|---|---|
| `logchannel` | Fetches last 50 messages from the channel via Discord API, logs them to console, replies ephemeral |
| `ask` | POSTs `{ message }` to `LLM_URL/chat`, replies with user message + AI response as `TEXT_DISPLAY` |
| `test` | Replies with "hello world" + random emoji using `TEXT_DISPLAY` component |
| *(challenge)* | Handler is **commented out** — command is not registered |

### `MESSAGE_COMPONENT`

| custom_id prefix | Behavior |
|---|---|
| `accept_button_<gameId>` | Sends ephemeral select menu (`select_choice_<gameId>`), deletes original challenge message |
| `select_choice_<gameId>` | Calls `getResult()`, posts result publicly, patches ephemeral message with "Nice choice", removes game from `activeGames` |

## Flags / Components
All responses use `IS_COMPONENTS_V2` flag. Messages use `TEXT_DISPLAY` components instead of legacy `content` field. Ephemeral responses combine `EPHEMERAL | IS_COMPONENTS_V2`.

## Environment variables
- `PUBLIC_KEY` — Discord public key for request verification
- `APP_ID` — Discord application ID
- `DISCORD_TOKEN` — Bot token (used in DiscordRequest)
- `PORT` — Server port (default 3000)
- `LLM_URL` — raptor-llm base URL (default `http://localhost:8000`)

## Imports
- `discord-interactions`: `InteractionType`, `InteractionResponseType`, `InteractionResponseFlags`, `MessageComponentTypes`, `ButtonStyleTypes`, `verifyKeyMiddleware`
- `./utils.js`: `getRandomEmoji`, `DiscordRequest`
- `./game.js`: `getShuffledOptions`, `getResult`
