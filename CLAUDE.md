# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn start          # Run the bot (node app.js)
yarn dev            # Run with nodemon (auto-restart on file changes)
yarn register       # Register slash commands with Discord (node commands.js)
```

No test suite is configured.

## Local development setup

Discord requires a public HTTPS URL to deliver interactions. Use ngrok to tunnel port 3000:

```bash
ngrok http 3000
```

Set the resulting HTTPS URL as the **Interactions Endpoint URL** in the Discord Developer Portal. Required `.env` variables:

```
APP_ID=
PUBLIC_KEY=
DISCORD_TOKEN=
PORT=3000
```

## Contexts

Contexts are stored inside `.claude/context` and should be generated after any structural change.

## Architecture

The bot uses Discord's HTTP interactions model — Discord POSTs to `/interactions` rather than the bot maintaining a WebSocket connection.

**Request flow in `app.js`:**
1. `verifyKeyMiddleware` authenticates every incoming request using `PUBLIC_KEY`
2. Dispatch on `InteractionType`: `PING` → pong, `APPLICATION_COMMAND` → command handlers, `MESSAGE_COMPONENT` → component handlers

**`/challenge` game flow (multi-step):**
1. User runs `/challenge object:<choice>` → bot stores game in `activeGames[interactionId]` and sends a message with an **Accept** button
2. Opponent clicks Accept → bot sends an ephemeral select menu (`select_choice_<gameId>`) and deletes the original message
3. Opponent selects their object → bot calls `getResult()`, posts the result publicly, and patches the ephemeral message; game entry is deleted from `activeGames`

`activeGames` is an in-memory object — state is lost on restart.

**Components v2:** All responses use `IS_COMPONENTS_V2` flag with `TEXT_DISPLAY` components instead of the legacy `content` field.

**`game.js`:** Contains the `RPSChoices` map (rock, paper, scissors, cowboy, virus, computer, wumpus) which defines win/lose verbs. Adding a new choice requires updating this map symmetrically.

**`commands.js`:** Run once to bulk-overwrite global slash commands via Discord's API. Re-run whenever commands change.
