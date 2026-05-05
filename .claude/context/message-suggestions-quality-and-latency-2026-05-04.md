# Context: /message suggestion quality + latency

**Date:** 2026-05-04

## Summary
Improved Discord `/message` output quality by filtering meta/explanatory lines from suggestion candidates and reducing generation overhead in the chat path.

## Files modified
- `api/api.js`
  - Added meta-suggestion filtering (`isMetaSuggestion`) to remove lines like "Here is a rewritten message" and explanation text.
  - Added cleanup for trailing `[selected]` markers from parsed candidates.
  - Simplified chat payload handling to response-only processing.

## Decisions made
- Keep suggestion extraction heuristic-based in bot for now, but reject known non-user-facing patterns.
- Keep Discord suggestion buttons as a post-processing UX layer over generated text.

## Known issues or next steps
- If LLM format changes again, heuristics may need adjustment.
- A future robust path is a dedicated structured options endpoint from LLM (JSON options) to eliminate parsing heuristics entirely.

---

## Update (same date)

### Summary
Added stricter bot-side sanitization to block residual meta phrasing in suggestions (for example, prefaces like "Here's a possible response...") that leaked into Discord button options.

### Files modified
- `api/api.js`
  - Expanded `blockedStarts` and `blockedContains` in `isMetaSuggestion` to reject more meta text patterns.

### Decisions made
- Keep defensive filtering in the bot even after prompt tuning, because model drift can reintroduce meta lines.

### Known issues or next steps
- Final semantic fidelity is now primarily enforced in the LLM route context gate; if quality drifts, prefer tightening that stage first.
