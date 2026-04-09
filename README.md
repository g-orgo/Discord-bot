# Raptor Chatbot — Discord Bot

Discord bot built on the HTTP interactions model. Receives slash commands from Discord, forwards AI requests to the LLM server, and replies using Discord's Components v2.

## Stack

Node.js · ESM · Express · discord-interactions · dotenv

## Slash commands

| Command | Description |
|---------|-------------|
| `/ask <message>` | Ask the AI a question (proxied to `raptor-chatbot-llm`) |
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

**`commands.js`:** Run once to bulk-register global slash commands via Discord's REST API. Re-run whenever commands are added or changed.

## Related services

- [`raptor-chatbot-llm`](https://github.com/g-orgo/Discord-bot-LLM) — LLM server that handles `/ask` responses
- [`raptor-chatbot-server`](https://github.com/g-orgo/Discord-bot-web-server) — Auth & history server
- [`raptor-chatbot-web`](https://github.com/g-orgo/Discord-bot-web) — Web frontend
