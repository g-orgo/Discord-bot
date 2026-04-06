import { DiscordRequest } from '../utils.js';
import { InteractionResponseFlags, MessageComponentTypes } from 'discord-interactions';

function isMissingAccess(err) {
  try { return JSON.parse(err.message)?.code === 50001; } catch { return false; }
}

const MISSING_ACCESS_MESSAGE = 'The bot is missing permissions to access this channel. Make sure it has **Read Message History**, **View Channel**, and **Manage Messages**.';

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
 * Deletes all messages in a channel.
 * Uses bulk-delete for messages newer than 14 days (up to 100 at a time).
 * Falls back to individual deletes for older messages.
 * Handles errors internally — never throws.
 * @param {string} channelId
 * @returns {Promise<number>} Total number of messages deleted.
 */
export async function purgeChannel(channelId) {
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
  let total = 0;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await DiscordRequest(`channels/${channelId}/messages?limit=100`, { method: 'GET' });
      const messages = await res.json();
      if (!messages.length) break;

      const now = Date.now();
      const recent = messages.filter(m => now - new Date(m.timestamp).getTime() < FOURTEEN_DAYS).map(m => m.id);
      const old = messages.filter(m => now - new Date(m.timestamp).getTime() >= FOURTEEN_DAYS);

      if (recent.length >= 2) {
        await DiscordRequest(`channels/${channelId}/messages/bulk-delete`, {
          method: 'POST',
          body: { messages: recent },
        });
        total += recent.length;
      } else if (recent.length === 1) {
        await DiscordRequest(`channels/${channelId}/messages/${recent[0]}`, { method: 'DELETE' });
        total += 1;
      }

      for (const msg of old) {
        await DiscordRequest(`channels/${channelId}/messages/${msg.id}`, { method: 'DELETE' });
        total += 1;
      }

      if (messages.length < 100) break;
    }
  } catch (err) {
    if (isMissingAccess(err)) throw err;
    console.error('[purgeChannel] Error:', err);
  }

  return total;
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
