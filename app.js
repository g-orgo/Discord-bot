import {
    InteractionResponseType,
    InteractionType,
    verifyKeyMiddleware,
} from "discord-interactions";
import "dotenv/config";
import express from "express";
import { handleCommand } from "./handlers/commandHandler.js";
import { handleComponent } from "./handlers/componentHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.post(
    "/interactions",
    verifyKeyMiddleware(process.env.PUBLIC_KEY),
    async function (req, res) {
        const { type } = req.body;

        const sender = req.body.member?.user ?? req.body.user;
        if (sender) {
            const userTag = sender.discriminator ? `${sender.username}#${sender.discriminator}` : sender.username;
            console.log(
                `[interaction] sender: ${userTag} (id: ${sender.id})`,
            );
        }

        if (type === InteractionType.PING) {
            return res.send({ type: InteractionResponseType.PONG });
        }

        if (type === InteractionType.APPLICATION_COMMAND) {
            return handleCommand(req, res);
        }

        if (type === InteractionType.MESSAGE_COMPONENT) {
            return handleComponent(req, res);
        }

        console.error("unknown interaction type", type);
        return res.status(400).json({ error: "unknown interaction type" });
    },
);

app.listen(PORT, () => {
    console.log("Listening on port", PORT);
});
