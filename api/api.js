import { editInteractionResponse } from './discord.js';
import { DiscordRequest } from '../utils.js';

const LLM_URL = process.env.LLM_URL || 'http://localhost:8000';

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
 * @returns {Promise<void>}
 */
export async function askAndRespond(message, token) {
  const llmResponse = await askLLM(message);
  await editInteractionResponse(token, `**You:** ${message}\n\n**Raptor:** ${llmResponse}`);
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

    const summary =
      entries.length === 0
        ? 'No non-English messages found in the channel.'
        : `**Non-English messages found:**\n\n${entries.join('\n\n')}`;

    await editInteractionResponse(token, summary);
  } catch (err) {
    console.error('[translateChannelMessages] Error:', err);
    const msg = isMissingAccess(err) ? MISSING_ACCESS_MESSAGE : 'An error occurred while processing channel messages.';
    await editInteractionResponse(token, msg);
  }
}
