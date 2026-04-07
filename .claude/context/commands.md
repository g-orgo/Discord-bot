# commands.js

One-shot script to register (bulk-overwrite) global slash commands with Discord. Run via `yarn register`.

## Date: 2026-04-07
## Summary: `/logchannel` removed from registered commands (it was listed in context but never in commands.js). Active commands: `/ask`, `/translatechannel`, `/clearchannel`.

## Commands registered

### `/ask`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0, 1]` (guild + user installs)
- `contexts: [0, 1, 2]` (guild, bot DM, private channel)
- Required string option `message` — the user's message to the AI

### `/translatechannel`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0]`
- `contexts: [0]` (guild only)
- No options

### `/clearchannel`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0]`
- `contexts: [0]` (guild only)
- No options

## Flow
`InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS)` calls the bulk-overwrite endpoint.

## Imports
- `./utils.js`: `InstallGlobalCommands`
