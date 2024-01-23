import express from 'express';
import { client } from "../util/client.js";
import { EmbedBuilder, TextChannel } from 'discord.js';

const router = express.Router();

router.post('/issue-assigned', async (req, res) => {
    console.log(req.body);
    // TODO: Send message to discord user (https://stackoverflow.com/questions/63160401/how-can-a-discord-bot-create-a-hyperlink-in-a-discord-message-in-an-embed-or-in)
    const issueAssignedEmbed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle(`📍 Issue ${req.body.issue_id} Assigned: ${req.body.issue_title}`)
    .setDescription(`Greetings, ${req.body.discord_username}!\n\nExciting news — you\'ve been handpicked for a special mission, ${req.body.issue_title}, in our cosmic project: ${req.body.project_title}! 🌌\n\nZoom into the action [here](${req.body.issue_url}) and tackle the challenge head-on. Your cosmic expertise is key! ☄️\n\nCheers,\nRocket 🦝\n\n`)
    .setTimestamp()
	.setFooter({ text: `Issue Id: ${req.body.issue_id}` });

    await client.users.send(req.body.discord_id, {embeds: [issueAssignedEmbed]});
    res.send('Hello, World!');
});

router.post("/daily-digest", async (req, res) => {
    // create embedd
    // add info
    // to channel
    // const guild = await client.guilds.fetch(process.env.GUILD_ID);
    // const channels = await guild.channels.fetch();
    // const channel = channels.find(channel => channel.name == "test-aryan");
    // (<TextChannel> channel).send("test");
});

export default router;
