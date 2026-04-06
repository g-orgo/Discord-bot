# app.js

Entry point for the Discord bot. Uses Express to receive HTTP POST interactions from Discord.

## Date: 2026-04-06 (audit run 2)
## Summary: `game.js` was missing from filesystem. Component handlers for `accept_button_*` and `select_choice_*` were calling `getShuffledOptions()` and `getResult()` without importing them — guaranteed ReferenceError crash. Both handlers replaced with a graceful ephemeral "not available" response. `activeGames` removed (dead state).

## Setup
- Loads env via `dotenv`
- Listens on `process.env.PORT` (default 3000)
- All requests to `POST /interactions` are verified with `verifyKeyMiddleware(process.env.PUBLIC_KEY)`

## In-memory state
- ~~`activeGames`~~ — removed. Challenge flow is disabled and `game.js` does not exist.

## Interaction dispatch

### `PING`
Returns `PONG` for Discord's endpoint verification.

### `APPLICATION_COMMAND`

| Command | Behavior |
|---|---|
| `logchannel` | Calls `logChannelMessages()` from `api/discord.js`, replies ephemeral |
| `translatechannel` | Defers immediately (ephemeral), calls `translateChannelMessages()` from `api/api.js` in background |
| `ask` | Defers immediately (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`), calls `askAndRespond()` from `api/api.js` in background |
| `test` | Replies with "hello world" + random emoji using `TEXT_DISPLAY` component |
| *(challenge)* | Handler is **commented out** — command is not registered |

### `MESSAGE_COMPONENT`

| custom_id prefix | Behavior |
|---|---|
| `accept_button_<gameId>` | Returns ephemeral "Este desafio já não está disponível." (game.js removed) |
| `select_choice_<gameId>` | Returns ephemeral "Este desafio já não está disponível." (game.js removed) |

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
- `discord-interactions`: `InteractionType`, `InteractionResponseType`, `InteractionResponseFlags`, `MessageComponentTypes`, `verifyKeyMiddleware`
- `./utils.js`: `getRandomEmoji`
- `./api/api.js`: `askAndRespond`, `translateChannelMessages`
- `./api/discord.js`: `logChannelMessages`
- ~~`./game.js`~~ — file removed; no longer imported
