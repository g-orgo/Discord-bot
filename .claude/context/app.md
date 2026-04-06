# app.js

Entry point for the Discord bot. Uses Express to receive HTTP POST interactions from Discord.

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
| `test` | Replies with "hello world" + random emoji using `TEXT_DISPLAY` component |
| `challenge` | Stores game in `activeGames[id]`, replies with challenger text + **Accept** button (`accept_button_<id>`) |

### `MESSAGE_COMPONENT`

| custom_id prefix | Behavior |
|---|---|
| `accept_button_<gameId>` | Sends ephemeral select menu (`select_choice_<gameId>`), deletes original challenge message |
| `select_choice_<gameId>` | Calls `getResult()`, posts result publicly, patches ephemeral message with "Nice choice", removes game from `activeGames` |

## Flags / Components
All responses use `IS_COMPONENTS_V2` flag. Messages use `TEXT_DISPLAY` components instead of legacy `content` field. Ephemeral responses combine `EPHEMERAL | IS_COMPONENTS_V2`.

## Imports
- `discord-interactions`: `InteractionType`, `InteractionResponseType`, `InteractionResponseFlags`, `MessageComponentTypes`, `ButtonStyleTypes`, `verifyKeyMiddleware`
- `./utils.js`: `getRandomEmoji`, `DiscordRequest`
- `./game.js`: `getShuffledOptions`, `getResult`
