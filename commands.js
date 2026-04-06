import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LOG_CHANNEL_COMMAND = {
    name: "logchannel",
    description: "Fetches and logs recent channel messages to the console",
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const ASK_COMMAND = {
    name: "ask",
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

const ALL_COMMANDS = [
    TEST_COMMAND,
    LOG_CHANNEL_COMMAND,
    ASK_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
