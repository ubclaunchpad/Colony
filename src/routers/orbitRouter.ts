import express from 'express';
import { client } from "../util/client.js";
import { TextChannel } from 'discord.js';

const router = express.Router();

router.post('/issue-assigned', async (req, res) => {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    const channel = channels.find(channel => channel.name == "test-aryan");
    (<TextChannel> channel).send("test");
    // console.log(req.body);
    // TODO: Send message to discord user (https://stackoverflow.com/questions/63160401/how-can-a-discord-bot-create-a-hyperlink-in-a-discord-message-in-an-embed-or-in)
    // use issue title and link to issue
    // await client.users.send(req.body.discord_id, {
    //     content: "test",
    // });
    res.send('Hello, World!');
});

export default router;
