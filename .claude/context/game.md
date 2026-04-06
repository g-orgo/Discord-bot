# game.js

Game logic for the rock-paper-scissors variant.

## Exports

### `getResult(p1, p2) → string`
Determines winner between two players. Each player is `{ id: userId, objectName: string }`.
- Looks up `RPSChoices[p1.objectName][p2.objectName]` for a win verb
- If not found, tries the reverse for p2 winning
- If neither, it's a tie
- Returns a formatted mention string via `formatResult()`

### `getRPSChoices() → string[]`
Returns the list of valid choice keys from `RPSChoices`.

### `getShuffledOptions() → SelectOption[]`
Returns shuffled select menu options formatted for Discord's string select component:
`{ label: Capitalized, value: lowercase, description: string }`

## RPSChoices map
7 choices: `rock`, `cowboy`, `scissors`, `virus`, `computer`, `wumpus`, `paper`

Each key maps to an object with:
- `description` — shown in select menu
- Other keys → win verb (e.g. `rock.scissors = 'crushes'` means rock crushes scissors)

**Adding a new choice:** Add a new key with `description` + verbs for everything it beats; also add it as a target in the choices it loses to.

## Imports
- `./utils.js`: `capitalize`
