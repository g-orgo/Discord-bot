# commands.js

One-shot script to register (bulk-overwrite) global slash commands with Discord. Run via `yarn register`.

## Commands registered

### `/test`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0, 1]` (guild + user installs)
- `contexts: [0, 1, 2]` (guild, bot DM, private channel)
- No options

### `/challenge`
- `type: 1` (CHAT_INPUT)
- `integration_types: [0, 1]`
- `contexts: [0, 2]` (guild + private channel, not bot DM)
- Required string option `object` with choices generated from `getRPSChoices()`

## Flow
`createCommandChoices()` maps `getRPSChoices()` into `{ name: Capitalized, value: lowercase }` pairs for the Discord choices array.

`InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS)` calls the bulk-overwrite endpoint.

## Imports
- `./game.js`: `getRPSChoices`
- `./utils.js`: `capitalize`, `InstallGlobalCommands`
