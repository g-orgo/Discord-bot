import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

const MESSAGE_COMMAND = {
    name: "message",
    description: "Ask the AI a question",
    options: [
        {
            type: 3,
            name: "message",
            description: "Your message to the AI",
            required: true,
        },
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
};

const TRANSLATE_CHANNEL_COMMAND = {
    name: "translatechannel",
    description:
        "Translate non-English messages in the channel to English in a single message",
    type: 1,
    integration_types: [0],
    contexts: [0],
};

const CLEAR_CHANNEL_COMMAND = {
    name: "clearchannel",
    description: "[DEBUG] Deletes all messages in the current channel",
    type: 1,
    integration_types: [0],
    contexts: [0],
};

const ALL_COMMANDS = [
    MESSAGE_COMMAND,
    TRANSLATE_CHANNEL_COMMAND,
    CLEAR_CHANNEL_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
