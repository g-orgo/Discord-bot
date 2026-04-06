# utils.js

Shared utility functions used across the bot.

## Exports

### `DiscordRequest(endpoint, options) → Promise<Response>`
Wrapper around `fetch` for the Discord REST API v10.
- Base URL: `https://discord.com/api/v10/`
- Sets `Authorization: Bot <DISCORD_TOKEN>`, `Content-Type: application/json`
- Auto-stringifies `options.body`
- Throws on non-OK responses (parses and re-throws JSON error body)

### `InstallGlobalCommands(appId, commands) → Promise<void>`
Bulk-overwrites global slash commands via `PUT applications/<appId>/commands`.
Used by `commands.js`.

### `getRandomEmoji() → string`
Returns a random emoji from a hardcoded list of 14 emojis.

### `capitalize(str) → string`
Uppercases the first character of a string.

## Imports
- `dotenv/config` (side-effect: loads `.env`)
