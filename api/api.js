import { editInteractionResponse } from './discord.js';

const LLM_URL = process.env.LLM_URL || 'http://localhost:8000';

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
