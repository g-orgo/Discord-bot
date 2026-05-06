import { editInteractionResponse } from './discord.js';
import { DiscordRequest } from '../utils.js';
import { ButtonStyleTypes, MessageComponentTypes } from 'discord-interactions';

const LLM_URL = process.env.LLM_URL || 'http://localhost:8000';
const LLM_MODEL = process.env.LLM_MODEL || null;
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';
const DISCORD_BOT_SECRET = process.env.DISCORD_BOT_SECRET;

function isMissingAccess(err) {
  try { return JSON.parse(err.message)?.code === 50001; } catch { return false; }
}

const MISSING_ACCESS_MESSAGE = 'The bot is missing permissions to access this channel. Make sure it has **Read Message History** and **View Channel**.';

const FALLBACK_RESPONSE = 'An error occurred while processing your message. Please try again.';
const MAX_MESSAGE_SUGGESTIONS = 3;
const SUGGESTION_SESSION_TTL_MS = 30 * 60 * 1000;
const PIPELINE_SESSION_TTL_MS = 30 * 60 * 1000;
const suggestionSessions = new Map();
const pipelineSessions = new Map();

function normalizeChatPayload(payload) {
  const response = typeof payload?.response === 'string' && payload.response.trim()
    ? payload.response
    : FALLBACK_RESPONSE;

  return {
    response,
  };
}

function cleanSuggestion(text) {
  const normalized = text
    .replace(/^[-*\d\.)\s]+/, '')
    // Drop common model headings like: "Option 1: ..."
    .replace(/^option\s*\d+\s*:\s*/i, '')
    .replace(/\s*\[selected\]\s*$/i, '')
    .replace(/^"|"$/g, '')
    .trim();

  // If heading and message came together, keep only the actual message body.
  if (normalized.includes('\n')) {
    const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const [first, ...rest] = lines;
      if (/^(focused on|emphasizing|tone|approach|style|version|alternative)\b/i.test(first)) {
        return rest.join(' ').trim();
      }
    }
  }

  return normalized;
}

function isMetaSuggestion(text) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized.length < 12) {
    return true;
  }

  const blockedStarts = [
    'option ',
    "here's",
    'here is',
    'possible response',
    'this response',
    'suggestions',
    'note:',
    'explanation:',
    'rewritten message',
  ];

  if (blockedStarts.some(prefix => normalized.startsWith(prefix))) {
    return true;
  }

  const blockedContains = [
    'here\'s a possible response',
    'stays true to the original message',
    'focused on the',
    'emphasizing the',
    'alternative version',
    'maintains the original message',
    'suitable for a business',
    'choose with buttons',
    'rephrasing',
  ];

  if (blockedContains.some(fragment => normalized.includes(fragment))) {
    return true;
  }

  return false;
}

function sanitizeSuggestionCandidates(values) {
  return values
    .map(value => cleanSuggestion(value))
    .filter(value => !isMetaSuggestion(value));
}

function dedupeSuggestions(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
    if (result.length === MAX_MESSAGE_SUGGESTIONS) {
      break;
    }
  }
  return result;
}

function extractResponseSuggestions(response) {
  const normalized = typeof response === 'string' ? response.replace(/\r/g, '').trim() : '';
  if (!normalized) {
    return [FALLBACK_RESPONSE];
  }

  const quoted = Array.from(normalized.matchAll(/"([^"\n]{4,})"/g)).map(match => cleanSuggestion(match[1]));
  const quotedClean = dedupeSuggestions(sanitizeSuggestionCandidates(quoted));
  if (quotedClean.length >= 2) {
    return quotedClean;
  }

  const orSplit = normalized
    .split(/\n\s*or\s*\n/i)
    .map(part => cleanSuggestion(part));
  const orSplitClean = dedupeSuggestions(sanitizeSuggestionCandidates(orSplit));
  if (orSplitClean.length >= 2) {
    return orSplitClean;
  }

  const lineSplit = normalized
    .split(/\n+/)
    .map(part => cleanSuggestion(part));
  const lineSplitClean = dedupeSuggestions(sanitizeSuggestionCandidates(lineSplit));
  if (lineSplitClean.length >= 2) {
    return lineSplitClean;
  }

  const cleanedSingle = cleanSuggestion(normalized);
  if (!isMetaSuggestion(cleanedSingle)) {
    return [cleanedSingle || FALLBACK_RESPONSE];
  }

  return [FALLBACK_RESPONSE];
}

function extractLinkedinfySuggestions(response) {
  const normalized = typeof response === 'string' ? response.replace(/\r/g, '').trim() : '';
  if (!normalized) {
    return [];
  }

  const orSplit = normalized
    .split(/\n\s*or\s*\n/i)
    .map(part => cleanSuggestion(part));

  return dedupeSuggestions(sanitizeSuggestionCandidates(orSplit));
}

function truncateLabel(text, max = 80) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 3)}...`;
}

function buildSuggestionButtons(sessionId, suggestions) {
  return [{
    type: MessageComponentTypes.ACTION_ROW,
    components: suggestions.map((suggestion, index) => ({
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.SECONDARY,
      custom_id: `message_suggestion:${sessionId}:${index}`,
      label: truncateLabel(suggestion),
    })),
  }];
}

function buildPipelineDecisionButtons(sessionId) {
  return [{
    type: MessageComponentTypes.ACTION_ROW,
    components: [
      {
        type: MessageComponentTypes.BUTTON,
        style: ButtonStyleTypes.PRIMARY,
        custom_id: `message_pipeline:${sessionId}:finish`,
        label: 'Use this message',
      },
      {
        type: MessageComponentTypes.BUTTON,
        style: ButtonStyleTypes.SECONDARY,
        custom_id: `message_pipeline:${sessionId}:continue`,
        label: 'Generate options',
      },
    ],
  }];
}

function formatAlternatives(suggestions, selectedSuggestion) {
  const lines = suggestions.map((suggestion, index) => {
    const marker = suggestion === selectedSuggestion ? ' [selected]' : '';
    return `${index + 1}. ${suggestion}${marker}`;
  });
  return lines.join('\n');
}

function formatFinalMessageOutput(userMessage, selectedSuggestion) {
  return `**You:** ${userMessage}\n\n**Raptor:** ${selectedSuggestion}`;
}

function formatMessageOutput(userMessage, selectedSuggestion, suggestions) {
  if (suggestions.length <= 1) {
    return formatFinalMessageOutput(userMessage, selectedSuggestion);
  }

  return [
    `**You:** ${userMessage}`,
    '',
    `**Raptor:** ${selectedSuggestion}`,
    '',
    '**Suggestions (choose with buttons):**',
    formatAlternatives(suggestions, selectedSuggestion),
  ].join('\n');
}

function buildProgressBar(current, total) {
  const filled = Math.floor((current / total) * 10);
  const empty = 10 - filled;
  const bar = '▓'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round((current / total) * 100);
  return `${bar} ${percent}%`;
}

function formatPipelineProgress(userMessage, status, stepNum, totalSteps, primaryMessage = null, detail = null) {
  const lines = [
    `**You:** ${userMessage}`,
    '',
    `**Progress:** ${buildProgressBar(stepNum, totalSteps)}`,
    `**Raptor:** ${status}`,
  ];

  if (detail) {
    lines.push('', detail);
  }

  if (primaryMessage) {
    lines.push('', '**Current primary draft:**', primaryMessage);
  }

  return lines.join('\n');
}

function formatPipelineCheckpoint(userMessage, primaryMessage) {
  return [
    `**You:** ${userMessage}`,
    '',
    `**Progress:** ${buildProgressBar(3, 6)}`,
    '**Raptor:** Primary draft ready. Choose whether to stop here or generate alternatives.',
    '',
    '**Primary message:**',
    primaryMessage,
  ].join('\n');
}

function formatPipelineFallback(userMessage, primaryMessage) {
  return [
    formatMessageOutput(userMessage, primaryMessage, [primaryMessage]),
    '',
    `**Progress:** ${buildProgressBar(4, 6)} (optional steps could not complete)`,
  ].join('\n');
}

function createSuggestionSessionWithMeta(userMessage, suggestions, discordUsername = null) {
  const sessionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  suggestionSessions.set(sessionId, {
    userMessage,
    suggestions,
    discordUsername,
    lastSavedSuggestion: null,
    expiresAt: Date.now() + SUGGESTION_SESSION_TTL_MS,
  });
  return sessionId;
}

function createPipelineSession({ userMessage, primaryMessage, token, discordUsername = null }) {
  const sessionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  pipelineSessions.set(sessionId, {
    userMessage,
    primaryMessage,
    token,
    discordUsername,
    expiresAt: Date.now() + PIPELINE_SESSION_TTL_MS,
  });
  return sessionId;
}

function getSuggestionSession(sessionId) {
  const session = suggestionSessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    suggestionSessions.delete(sessionId);
    return null;
  }

  return session;
}

function getPipelineSession(sessionId) {
  const session = pipelineSessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    pipelineSessions.delete(sessionId);
    return null;
  }

  return session;
}

function addModelToPayload(payload) {
  return LLM_MODEL ? { ...payload, model: LLM_MODEL } : payload;
}

async function postLLM(path, payload, headers = {}) {
  const response = await fetch(`${LLM_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(addModelToPayload(payload)),
  });

  if (!response.ok) {
    throw new Error(`LLM returned ${response.status}`);
  }

  return response.json();
}

async function requestPipelineText(path, payload, headers = {}) {
  const json = await postLLM(path, payload, headers);
  return normalizeChatPayload(json).response;
}

async function translateSuggestions(suggestions) {
  return Promise.all(
    suggestions.map(async suggestion => requestPipelineText('/chat/pipeline/translate', {
      message: suggestion,
    })),
  );
}

async function continuePipelineSuggestions(sessionId, discordUsername = null) {
  const session = getPipelineSession(sessionId);
  if (!session) {
    return;
  }

  const usernameToSave = discordUsername || session.discordUsername;

  try {
    await editInteractionResponse(
      session.token,
      formatPipelineProgress(
        session.userMessage,
        'Generating alternatives from your original linkedinfy context...',
        4,
        6,
        session.primaryMessage,
      ),
    );

    const linkedinfyResponse = await requestPipelineText('/chat/pipeline/linkedinfy', {
      message: session.userMessage,
    });
    const rawSuggestions = extractLinkedinfySuggestions(linkedinfyResponse);
    const suggestionsToFinalize = rawSuggestions.length > 0
      ? rawSuggestions
      : [linkedinfyResponse];

    await editInteractionResponse(
      session.token,
      formatPipelineProgress(
        session.userMessage,
        'Validating alternatives...',
        5,
        6,
        session.primaryMessage,
        `Generated ${suggestionsToFinalize.length} option${suggestionsToFinalize.length === 1 ? '' : 's'} for your choice.`,
      ),
    );

    const finalizedSuggestions = dedupeSuggestions(
      sanitizeSuggestionCandidates(suggestionsToFinalize),
    );

    await editInteractionResponse(
      session.token,
      formatPipelineProgress(
        session.userMessage,
        'Translating alternatives... ',
        6,
        6,
        session.primaryMessage,
        `Preparing ${finalizedSuggestions.length} option${finalizedSuggestions.length === 1 ? '' : 's'} in the final output language.`,
      ),
    );

    const translatedSuggestions = dedupeSuggestions(
      sanitizeSuggestionCandidates(await translateSuggestions(finalizedSuggestions)),
    );

    const suggestions = dedupeSuggestions(
      sanitizeSuggestionCandidates([session.primaryMessage, ...translatedSuggestions]),
    );
    const selectedSuggestion = suggestions[0] || session.primaryMessage || FALLBACK_RESPONSE;

    if (suggestions.length <= 1) {
      await editInteractionResponse(session.token, formatMessageOutput(session.userMessage, selectedSuggestion, suggestions));
      if (usernameToSave) {
        await saveDiscordHistory(usernameToSave, session.userMessage, selectedSuggestion);
      }
      return;
    }

    const suggestionSessionId = createSuggestionSessionWithMeta(session.userMessage, suggestions, usernameToSave);
    await editInteractionResponse(
      session.token,
      formatMessageOutput(session.userMessage, selectedSuggestion, suggestions),
      buildSuggestionButtons(suggestionSessionId, suggestions),
    );
  } catch (err) {
    console.error('[continuePipelineSuggestions] Error:', err);
    const primaryMessage = session.primaryMessage || FALLBACK_RESPONSE;
    await editInteractionResponse(session.token, formatPipelineFallback(session.userMessage, primaryMessage));
    if (usernameToSave) {
      await saveDiscordHistory(usernameToSave, session.userMessage, primaryMessage);
    }
  } finally {
    pipelineSessions.delete(sessionId);
  }
}

async function resolvePipelineSelection(customId, discordUsername = null) {
  if (typeof customId !== 'string') {
    return null;
  }

  const match = customId.match(/^message_pipeline:([a-z0-9]+):(finish|continue)$/i);
  if (!match) {
    return null;
  }

  const [, sessionId, action] = match;
  const session = getPipelineSession(sessionId);
  if (!session) {
    return null;
  }

  const usernameToSave = discordUsername || session.discordUsername;

  if (action === 'finish') {
    pipelineSessions.delete(sessionId);
    if (usernameToSave) {
      await saveDiscordHistory(usernameToSave, session.userMessage, session.primaryMessage);
    }
    return {
      content: formatFinalMessageOutput(session.userMessage, session.primaryMessage),
      components: [],
    };
  }

  void continuePipelineSuggestions(sessionId, usernameToSave);
  return {
    content: formatPipelineProgress(
      session.userMessage,
      'Generating alternative approaches...',
      4,
      6,
      session.primaryMessage,
    ),
    components: [],
  };
}

export function resolveSuggestionSelection(customId) {
  if (typeof customId !== 'string') {
    return null;
  }

  const match = customId.match(/^message_suggestion:([a-z0-9]+):(\d)$/i);
  if (!match) {
    return null;
  }

  const [, sessionId, indexRaw] = match;
  const session = getSuggestionSession(sessionId);
  if (!session) {
    return null;
  }

  const index = Number.parseInt(indexRaw, 10);
  const selectedSuggestion = session.suggestions[index];
  if (!selectedSuggestion) {
    return null;
  }

  return {
    sessionId,
    selectedSuggestion,
    session,
    content: formatFinalMessageOutput(session.userMessage, selectedSuggestion),
    components: [],
  };
}

export async function resolveSuggestionSelectionAndSave(customId, discordUsername = null) {
  const pipelineSelection = await resolvePipelineSelection(customId, discordUsername);
  if (pipelineSelection) {
    return pipelineSelection;
  }

  const selection = resolveSuggestionSelection(customId);
  if (!selection) {
    return null;
  }

  const session = selection.session;
  const usernameToSave = discordUsername || session.discordUsername;

  if (usernameToSave && selection.selectedSuggestion !== session.lastSavedSuggestion) {
    await saveDiscordHistory(
      usernameToSave,
      session.userMessage,
      selection.selectedSuggestion,
    );
    session.lastSavedSuggestion = selection.selectedSuggestion;
  }

  suggestionSessions.delete(selection.sessionId);

  return {
    content: selection.content,
    components: selection.components,
  };
}

/**
 * Sends a message to raptor-llm's /chat endpoint.
 * Handles errors internally — never throws.
 * @param {string} message
 * @param {Object} headers - Optional headers to pass to LLM (e.g., for personalization)
 * @returns {Promise<{response: string}>} Chat payload.
 */
export async function askLLM(message, headers = {}) {
  try {
    const response = await fetch(`${LLM_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ message, ...(LLM_MODEL ? { model: LLM_MODEL } : {}) }),
    });

    if (!response.ok) throw new Error(`LLM returned ${response.status}`);

    const json = await response.json();
    return normalizeChatPayload(json);
  } catch (err) {
    console.error('[askLLM] Error calling raptor-llm:', err);
    return normalizeChatPayload({ response: FALLBACK_RESPONSE });
  }
}

/**
 * Calls the LLM and edits the deferred Discord interaction with the result.
 * Fire-and-forget — does not block the interaction response.
 * @param {string} message - The user's message.
 * @param {string} token - The Discord interaction token.
 * @param {string|null} discordUsername - Discord username of the sender (for history linking & personalization).
 * @returns {Promise<void>}
 */
export async function askAndRespond(message, token, discordUsername = null) {
  try {
    await editInteractionResponse(
      token,
      formatPipelineProgress(
        message,
        'Rewriting your message for maximum clarity and impact...',
        1,
        6,
      ),
    );

    const linkedMessage = await requestPipelineText('/chat/pipeline/linkedinfy', { message });

    await editInteractionResponse(
      token,
      formatPipelineProgress(
        message,
        'Validating that your intent was preserved...',
        2,
        6,
        linkedMessage,
      ),
    );

    const contextGatedMessage = await requestPipelineText('/chat/pipeline/context-gate', {
      original_message: message,
      candidate_message: linkedMessage,
    });

    await editInteractionResponse(
      token,
      formatPipelineProgress(
        message,
        'Translating the final version...',
        3,
        6,
        contextGatedMessage,
      ),
    );

    const primaryMessage = await requestPipelineText('/chat/pipeline/translate', {
      message: contextGatedMessage,
    });

    const sessionId = createPipelineSession({
      userMessage: message,
      primaryMessage,
      token,
      discordUsername,
    });

    await editInteractionResponse(
      token,
      formatPipelineCheckpoint(message, primaryMessage),
      buildPipelineDecisionButtons(sessionId),
    );
  } catch (err) {
    console.error('[askAndRespond] Error during staged pipeline:', err);
    await editInteractionResponse(token, formatMessageOutput(message, FALLBACK_RESPONSE, [FALLBACK_RESPONSE]));
  }
}

/**
 * Saves a Discord chat exchange to the auth server, linked by discordUsername.
 * Fire-and-forget — errors are logged but never thrown.
 * @param {string} discordUsername
 * @param {string} userMessage
 * @param {string} botResponse
 * @returns {Promise<void>}
 */
async function saveDiscordHistory(discordUsername, userMessage, botResponse) {
  if (!DISCORD_BOT_SECRET) {
    console.warn('[saveDiscordHistory] DISCORD_BOT_SECRET is not set. Skipping history sync.');
    return;
  }

  console.log(`[saveDiscordHistory] Saving history for Discord user: ${discordUsername}`);
  try {
    const res = await fetch(`${AUTH_URL}/discord/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': DISCORD_BOT_SECRET,
      },
      body: JSON.stringify({ discordUsername, userMessage, botResponse }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[saveDiscordHistory] Server responded ${res.status}: ${body}`);
    } else {
      console.log(`[saveDiscordHistory] History saved (status ${res.status})`);
    }
  } catch (err) {
    console.error('[saveDiscordHistory] Failed to save history:', err.message);
  }
}

/**
 * Detects whether a message is in English. If not, returns its English translation.
 * Uses the /generate endpoint (no system prompt) for a raw detection + translation task.
 * Handles errors internally — returns null on any failure (message is skipped).
 * @param {string} text
 * @returns {Promise<string|null>} Translation string, or null if already English / on error.
 */
export async function detectAndTranslate(text) {
  try {
    const response = await fetch(`${LLM_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) throw new Error(`LLM returned ${response.status}`);

    const json = await response.json();
    const result = json.response.trim();

    if (result.toUpperCase() === 'ENGLISH') return null;
    return result;
  } catch (err) {
    console.error('[detectAndTranslate] Error:', err);
    return null;
  }
}

/**
 * Fetches up to 50 messages from the channel, translates any non-English ones,
 * replies to each with the English translation, and deletes the original.
 * Edits the deferred interaction with a summary when complete.
 * Fire-and-forget — does not block the interaction response.
 * @param {string} channelId
 * @param {string} token - The Discord interaction token.
 * @returns {Promise<void>}
 */
export async function translateChannelMessages(channelId, token) {
  try {
    const res = await DiscordRequest(`channels/${channelId}/messages?limit=50`, { method: 'GET' });
    const messages = await res.json();

    const entries = [];

    for (const msg of messages) {
      if (msg.author.bot || !msg.content?.trim()) continue;

      const translation = await detectAndTranslate(msg.content);
      if (!translation) continue;

      const unix = Math.floor(new Date(msg.timestamp).getTime() / 1000);
      entries.push(`-# **@${msg.author.username}** · <t:${unix}:f> (<t:${unix}:R>)\n> ${msg.content}\n→ *${translation}*`);
    }

    const LIMIT = 4000;
    const header = '**Non-English messages found:**';

    if (entries.length === 0) {
      await editInteractionResponse(token, 'No non-English messages found in the channel.');
      return;
    }

    // Build chunks that fit within the 4000-char TEXT_DISPLAY limit
    const chunks = [];
    let current = header;
    for (const entry of entries) {
      const line = `\n\n${entry}`;
      if (current.length + line.length > LIMIT) {
        chunks.push(current);
        current = entry;
      } else {
        current += line;
      }
    }
    chunks.push(current);

    await editInteractionResponse(token, chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
      await sendInteractionFollowup(token, chunks[i]);
    }
  } catch (err) {
    console.error('[translateChannelMessages] Error:', err);
    const msg = isMissingAccess(err) ? MISSING_ACCESS_MESSAGE : 'An error occurred while processing channel messages.';
    await editInteractionResponse(token, msg);
  }
}
