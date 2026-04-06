import { DiscordRequest } from '../utils.js';
import { InteractionResponseFlags, MessageComponentTypes } from 'discord-interactions';

/**
 * Fetches and logs the last 50 messages from a Discord channel.
 * Handles errors internally — never throws.
 * @param {string} channelId
 * @returns {Promise<void>}
 */
export async function logChannelMessages(channelId) {
  try {
    const res = await DiscordRequest(`channels/${channelId}/messages?limit=50`, { method: 'GET' });
    const messages = await res.json();
    console.log(`[logchannel] Last ${messages.length} messages from channel ${channelId}:`);
    for (const msg of messages) {
      console.log(
        `  [${new Date(msg.timestamp).toISOString()}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`,
      );
    }
  } catch (err) {
    console.error('[logchannel] Error fetching messages:', err);
  }
}

/**
 * Edits the original deferred interaction response via webhook.
 * Handles errors internally — never throws.
 * @param {string} token - The interaction token.
 * @param {string} content - The final message content.
 * @returns {Promise<void>}
 */
export async function editInteractionResponse(token, content) {
  try {
    await DiscordRequest(`webhooks/${process.env.APP_ID}/${token}/messages/@original`, {
      method: 'PATCH',
      body: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [{ type: MessageComponentTypes.TEXT_DISPLAY, content }],
      },
    });
  } catch (err) {
    console.error('[editInteractionResponse] Error editing response:', err);
  }
}
