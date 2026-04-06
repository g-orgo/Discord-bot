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
    description: "Busca e loga as mensagens recentes do canal no console",
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
};

const ASK_COMMAND = {
    name: "ask",
    description: "Faz uma pergunta para a IA",
    options: [
        {
            type: 3,
            name: "message",
            description: "Sua mensagem para a IA",
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
