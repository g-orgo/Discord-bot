import { editInteractionResponse, sendInteractionFollowup } from './discord.js';
import { DiscordRequest } from '../utils.js';

const LLM_URL = process.env.LLM_URL || 'http://localhost:8000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';
const DISCORD_BOT_SECRET = process.env.DISCORD_BOT_SECRET;

function isMissingAccess(err) {
  try { return JSON.parse(err.message)?.code === 50001; } catch { return false; }
}

const MISSING_ACCESS_MESSAGE = 'The bot is missing permissions to access this channel. Make sure it has **Read Message History** and **View Channel**.';

const FALLBACK_RESPONSE = 'An error occurred while processing your message. Please try again.';

/**
 * Sends a message to raptor-llm's /chat endpoint.
 * Handles errors internally — never throws.
 * @param {string} message
 * @returns {Promise<string>} The AI response text, or a fallback message on error.
 */
export async function askLLM(message) {
  try {
    const response = await fetch(`${LLM_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) throw new Error(`LLM returned ${response.status}`);

    const json = await response.json();
    return json.response;
  } catch (err) {
    console.error('[askLLM] Error calling raptor-llm:', err);
    return FALLBACK_RESPONSE;
  }
}

/**
 * Calls the LLM and edits the deferred Discord interaction with the result.
 * Fire-and-forget — does not block the interaction response.
 * @param {string} message - The user's message.
 * @param {string} token - The Discord interaction token.
 * @param {string|null} discordUsername - Discord username of the sender (for history linking).
 * @returns {Promise<void>}
 */
export async function askAndRespond(message, token, discordUsername = null) {
  const llmResponse = await askLLM(message);
  await editInteractionResponse(token, `**You:** ${message}\n\n**Raptor:** ${llmResponse}`);
  if (discordUsername) {
    saveDiscordHistory(discordUsername, message, llmResponse);
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
  const prompt =
    'You are a translation tool. Follow these rules exactly:\n' +
    '1. If the message is written entirely in English, respond with the single word: ENGLISH\n' +
    '2. If the message contains any non-English text, translate the entire message to English. Output only the translated text — no language names, no explanations, no labels.\n\n' +
    `Message: ${text}`;

  try {
    const response = await fetch(`${LLM_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
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
