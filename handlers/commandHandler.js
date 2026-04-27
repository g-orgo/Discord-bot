import {
  InteractionResponseFlags,
  InteractionResponseType,
} from 'discord-interactions';
import { askAndRespond, translateChannelMessages } from '../api/api.js';
import { purgeChannel, editInteractionResponse } from '../api/discord.js';

/**
 * Handles APPLICATION_COMMAND interactions.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleCommand(req, res) {
  const { data } = req.body;
  const { name } = data;

  if (name === 'clearchannel') {
    const channelId = req.body.channel_id;
    const token = req.body.token;
    purgeChannel(channelId)
      .then(async count => {
        await editInteractionResponse(token, `Done. Deleted ${count} message${count !== 1 ? 's' : ''}.`);
      })
      .catch(async () => {
        await editInteractionResponse(token, 'The bot is missing permissions to access this channel. Make sure it has **Read Message History**, **View Channel**, and **Manage Messages**.');
      });
    return res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
      },
    });
  }

  if (name === 'translatechannel') {
    translateChannelMessages(req.body.channel_id, req.body.token);
    return res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: InteractionResponseFlags.IS_COMPONENTS_V2 },
    });
  }

  if (name === 'message') {
    const message = data.options[0].value;
    const discordUsername = req.body.member?.user?.username ?? req.body.user?.username ?? null;
    askAndRespond(message, req.body.token, discordUsername);
    return res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: InteractionResponseFlags.IS_COMPONENTS_V2 },
    });
  }

  console.error(`unknown command: ${name}`);
  return res.status(400).json({ error: 'unknown command' });
}
