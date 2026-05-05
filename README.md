# Raptor Chatbot — Discord Bot

Discord bot built on the HTTP interactions model. Receives slash commands from Discord, forwards AI requests to the LLM server, and replies using Discord's Components v2.

## Stack

Node.js · ESM · Express · discord-interactions · dotenv

## Slash commands

| Command | Description |
|---------|-------------|
| `/message <message>` | Runs a staged rewrite pipeline in one continuously updated message, with an optional stop after the primary translation |
| `/translatechannel` | Translate non-English messages in the channel to English |
| `/clearchannel` | [DEBUG] Delete all messages in the current channel |

## Local development setup

Discord requires a public HTTPS URL to receive interactions. Use **ngrok** to expose the local server:

```bash
ngrok http 3000
```

Copy the generated HTTPS URL and set it as the **Interactions Endpoint URL** in the [Discord Developer Portal](https://discord.com/developers/applications).

### Environment variables

Create a `.env` file at the project root:

```env
APP_ID=        # Discord application ID
PUBLIC_KEY=    # Discord public key (used to verify requests)
DISCORD_TOKEN= # Bot token
PORT=3000      # HTTP port (default: 3000)
```

## Commands

```bash
yarn install    # Install dependencies
yarn start      # Run the bot (node app.js)
yarn dev        # Run with auto-restart (nodemon)
yarn register   # Register slash commands with Discord (run once, or after any command change)
```

## Architecture

The bot uses Discord's **HTTP interactions model** — Discord POSTs every interaction to `/interactions` rather than the bot maintaining a persistent WebSocket connection.

**Request flow (`app.js`):**
1. `verifyKeyMiddleware` authenticates every request using `PUBLIC_KEY`
2. Dispatch on `InteractionType`:
   - `PING` → responds with PONG (Discord handshake)
   - `APPLICATION_COMMAND` → `handlers/commandHandler.js`
   - `MESSAGE_COMPONENT` → `handlers/componentHandler.js`

**Components v2:** All responses use the `IS_COMPONENTS_V2` flag with `TEXT_DISPLAY` components.

**`/message` staged UX:** The bot edits a single deferred interaction message through these stages instead of sending multiple follow-ups:
1. LinkedIn-style rewrite (`linkedinfy`)
2. Context gate to preserve the original intent
3. Translation of the primary message
4. Checkpoint: the user can stop here or continue
5. Alternative suggestion generation
6. Context gate + translation for the additional suggestions

This reduces unnecessary LLM work because steps 5 and 6 only run when the user explicitly asks for extra options.

**`commands.js`:** Run once to bulk-register global slash commands via Discord's REST API. Re-run whenever commands are added or changed.

## Related services

- [`raptor-chatbot-llm`](https://github.com/g-orgo/Discord-bot-LLM) — LLM server that handles `/message` responses
- [`raptor-chatbot-server`](https://github.com/g-orgo/Discord-bot-web-server) — Auth & history server
- [`raptor-chatbot-web`](https://github.com/g-orgo/Discord-bot-web) — Web frontend
