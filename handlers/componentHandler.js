import {
  InteractionResponseFlags,
  InteractionResponseType,
  MessageComponentTypes,
} from 'discord-interactions';

/**
 * Handles MESSAGE_COMPONENT interactions.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleComponent(req, res) {
  const { data } = req.body;
  const componentId = data.custom_id;

  if (
    componentId.startsWith('accept_button_') ||
    componentId.startsWith('select_choice_')
  ) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
        components: [
          {
            type: MessageComponentTypes.TEXT_DISPLAY,
            content: 'This challenge is no longer available.',
          },
        ],
      },
    });
  }

  return;
}
