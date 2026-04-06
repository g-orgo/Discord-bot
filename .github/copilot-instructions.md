# Raptor Chatbot — Workspace Guidelines

Discord bot using the HTTP interactions model (no WebSocket). Discord POSTs to `/interactions`; Express handles and responds synchronously.

## Build & Run

```bash
yarn start        # node app.js
yarn dev          # nodemon app.js (auto-restart)
yarn register     # register slash commands with Discord (run after changing commands.js)
```

No test suite is configured.

**Local dev:** Discord needs a public HTTPS URL. Use ngrok to tunnel port 3000:
```bash
ngrok http 3000
```
Set the resulting URL as the **Interactions Endpoint URL** in the Discord Developer Portal.

## Architecture

| File | Role |
|---|---|
| `app.js` | Express server — dispatches `PING`, `APPLICATION_COMMAND`, `MESSAGE_COMPONENT` |
| `game.js` | RPS game logic — `RPSChoices` map, `getResult()`, `getShuffledOptions()` |
| `commands.js` | One-shot script to bulk-overwrite global slash commands |
| `utils.js` | `DiscordRequest()`, `InstallGlobalCommands()`, `getRandomEmoji()`, `capitalize()` |

Per-file summaries are in `.claude/context/`.

## Key Conventions

**Components V2 — always use `IS_COMPONENTS_V2` flag with `TEXT_DISPLAY` components.** Never use the legacy top-level `content` field on responses:
```js
// Correct
{ flags: InteractionResponseFlags.IS_COMPONENTS_V2, components: [{ type: MessageComponentTypes.TEXT_DISPLAY, content: '...' }] }
// Wrong
{ content: '...' }
```

**ESM modules.** The project uses `"type": "module"` — use `import`/`export`, not `require`.

**`activeGames` is in-memory.** State is lost on restart. No database — don't introduce persistence without discussion.

**`/challenge` game flow (multi-step):**
1. User runs `/challenge object:<x>` → stored in `activeGames[interactionId]`, Accept button sent
2. Opponent clicks Accept → ephemeral select menu (`select_choice_<gameId>`) sent, original message deleted
3. Opponent selects → `getResult()` called, result posted publicly, game entry deleted

**Adding a new RPS choice:** Update `RPSChoices` in `game.js` symmetrically — add the new key with its `description` and verbs for what it beats, and add it as a losing target in the keys it loses to.

**Required `.env` variables:** `APP_ID`, `PUBLIC_KEY`, `DISCORD_TOKEN`, `PORT` (default 3000).

## Dev Skill (always apply)

Before any code change in this workspace, load and follow the dev skill:
`e:/raptor/raptor-chatbot/.claude/skills/dev/SKILL.md`
