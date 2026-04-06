import {
    InteractionResponseFlags,
    InteractionResponseType,
    InteractionType,
    MessageComponentTypes,
    verifyKeyMiddleware,
} from "discord-interactions";
import "dotenv/config";
import express from "express";
import { getRandomEmoji } from "./utils.js";
import { askAndRespond } from "./api/api.js";
import { logChannelMessages } from "./api/discord.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
    "/interactions",
    verifyKeyMiddleware(process.env.PUBLIC_KEY),
    async function (req, res) {
        // Interaction type and data
        const { type, id, data } = req.body;

        // Log who sent this interaction (member for guilds, user for DMs/GDMs)
        const sender = req.body.member?.user ?? req.body.user;
        if (sender) {
            console.log(
                `[interaction] sender: ${sender.username}#${sender.discriminator} (id: ${sender.id})`,
            );
        }

        /**
         * Handle verification requests
         */
        if (type === InteractionType.PING) {
            return res.send({ type: InteractionResponseType.PONG });
        }

        /**
         * Handle slash command requests
         * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
         */
        if (type === InteractionType.APPLICATION_COMMAND) {
            const { name } = data;

            // "logchannel" command
            if (name === "logchannel") {
                await logChannelMessages(req.body.channel_id);
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags:
                            InteractionResponseFlags.IS_COMPONENTS_V2 |
                            InteractionResponseFlags.EPHEMERAL,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content:
                                    "Recent channel messages have been logged to the console.",
                            },
                        ],
                    },
                });
            }

            // "ask" command — defers immediately, calls LLM in background
            if (name === "ask") {
                const message = data.options[0].value;
                askAndRespond(message, req.body.token);
                return res.send({
                    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { flags: InteractionResponseFlags.IS_COMPONENTS_V2 },
                });
            }

            // "test" command
            if (name === "test") {
                // Send a message into the channel where command was triggered from
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                // Fetches a random emoji to send from a helper function
                                content: `hello world ${getRandomEmoji()}`,
                            },
                        ],
                    },
                });
            }

            console.error(`unknown command: ${name}`);
            return res.status(400).json({ error: "unknown command" });
        }

        /**
         * Handle requests from interactive components
         * See https://discord.com/developers/docs/components/using-message-components#using-message-components-with-interactions
         */
        if (type === InteractionType.MESSAGE_COMPONENT) {
            // custom_id set in payload when sending message component
            const componentId = data.custom_id;

            if (
                componentId.startsWith("accept_button_") ||
                componentId.startsWith("select_choice_")
            ) {
                // Challenge flow is disabled — game.js was removed. Return graceful error.
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags:
                            InteractionResponseFlags.EPHEMERAL |
                            InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: "This challenge is no longer available.",
                            },
                        ],
                    },
                });
            }

            return;
        }

        console.error("unknown interaction type", type);
        return res.status(400).json({ error: "unknown interaction type" });
    },
);

app.listen(PORT, () => {
    console.log("Listening on port", PORT);
});
