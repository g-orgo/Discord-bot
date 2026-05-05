/**
 * Handles MESSAGE_COMPONENT interactions.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';
import { resolveSuggestionSelectionAndSave } from '../api/api.js';

export async function handleComponent(req, res) {
  const customId = req.body?.data?.custom_id;
  const discordUsername = req.body?.member?.user?.username ?? req.body?.user?.username ?? null;
  const selection = await resolveSuggestionSelectionAndSave(customId, discordUsername);

  if (!selection) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.IS_COMPONENTS_V2 | InteractionResponseFlags.EPHEMERAL,
        components: [{
          type: MessageComponentTypes.TEXT_DISPLAY,
          content: 'This suggestion has expired. Please run /message again.',
        }],
      },
    });
  }

  return res.send({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: {
      flags: InteractionResponseFlags.IS_COMPONENTS_V2,
      components: [
        { type: MessageComponentTypes.TEXT_DISPLAY, content: selection.content },
        ...selection.components,
      ],
    },
  });
}
