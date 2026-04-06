# commands.js

One-shot script to register (bulk-overwrite) global slash commands with Discord. Run via `yarn register`.

## Date: 2026-04-06
## Summary: Audit update — `CHALLENGE_COMMAND` removed (handler is commented out in app.js); `TEST_COMMAND` restored after formatter accidentally deleted it; `/ask` and `/logchannel` added.

## Commands registered

### `/test`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0, 1]` (guild + user installs)
- `contexts: [0, 1, 2]` (guild, bot DM, private channel)
- No options

### `/logchannel`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0, 1]`
- `contexts: [0, 2]` (guild + private channel)
- No options

### `/ask`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0, 1]`
- `contexts: [0, 1, 2]`
- Required string option `message` — the user's message to the AI

## Note on `/challenge`
The `CHALLENGE_COMMAND` was removed from registration because the slash command handler in `app.js` is commented out. The component handlers (`accept_button_*`, `select_choice_*`) are still active and functional if the game flow is triggered externally.

## Flow
`InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS)` calls the bulk-overwrite endpoint.

## Imports
- `./utils.js`: `InstallGlobalCommands`
