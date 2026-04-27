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
| `commands.js` | One-shot script to bulk-overwrite global slash commands |
| `utils.js` | `DiscordRequest()`, `InstallGlobalCommands()`, `getRandomEmoji()` |
| `api/api.js` | LLM client — `askLLM()`, `askAndRespond()` |
| `api/discord.js` | Discord API helpers — `logChannelMessages()`, `editInteractionResponse()` |

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

**`res.send` must be called inside each try/catch branch.** Discord interactions expire quickly — if `res.send` is placed after a try/catch block and the request throws, the interaction times out with no response. Always call `res.send` (or `return res.send`) in both the `try` and the `catch` branches independently:
```js
// Correct
try {
  const result = await someAsyncCall();
  return res.send({ ... result ... });
} catch (err) {
  return res.send({ ... fallback ... });
}
// Wrong
try {
  result = await someAsyncCall();
} catch (err) {
  result = fallback;
}
return res.send({ ... result ... }); // interaction may have already expired
```

**`/message` LLM flow:**
1. User runs `/message message:<text>` → bot POSTs `{ message }` to `LLM_URL/chat` (raptor-llm)
2. raptor-llm forwards the message to Ollama and returns `{ model, response }`
3. Bot replies with the user's message and the AI response formatted as TEXT_DISPLAY

**Required `.env` variables:** `APP_ID`, `PUBLIC_KEY`, `DISCORD_TOKEN`, `PORT` (default 3000), `LLM_URL` (default `http://localhost:8000`).

## Dev Skill (always apply)

Before any code change in this workspace, load and follow the dev skill:
`e:/raptor/raptor-chatbot/.claude/skills/dev/SKILL.md`
