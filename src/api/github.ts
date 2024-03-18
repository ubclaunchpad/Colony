import Router from "@koa/router";
import { sendToDiscordChannel } from "../app.js";
import dotenv from "dotenv";
import { dbHandler } from "../model/dbHandler.js";
import { TABLE_NAME, DB_KEY, unsubscribeToGitHub } from "../util/github.js";
import { EmbedBuilder } from 'discord.js';

dotenv.config();

const router = new Router();

const LP_ORG_NAME = process.env.LP_ORG_NAME;
const GUILD_ID = process.env.GUILD_ID;

// TODO: Add more cases if needed for new message.
// All PR event actions are available here: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request
const KEYACTIONS = ["opened", "closed", "reopened", "assigned", "unassigned"];

router.post("/webhook", async (ctx) => {
    // Process the webhook event
    const event = ctx.request.headers['x-github-event'];
    const payload = ctx.request.body as any;

    if (event === 'pull_request') {
        console.log('PR event receieved!');
        // Fetch all subscribed channels
        const channels = await fetchChannels(payload.repository.name, event);
        // Extract PR messages
        channels.forEach(channelId => extractPRInfo(payload, channelId));
    } else if (event === 'issues') {
        console.log('Issue event receieved!');
        // TODO: fill in this
    }
    return;
});

function extractPRInfo(payload: any, channelId: string) {
    // Extract necessary information from the pull request event
    const pr = payload.pull_request;
    const prTitle = pr.title;
    const prUrl = pr.html_url;
    const prAction = payload.action; // e.g., 'opened', 'closed', 'reopened'
    const repositoryName = payload.repository.full_name;
    const prSender = pr.user.login;
    const prSenderAvatar = pr.user.avatar_url;
    const prSenderUrl = pr.user.url;
    const prHead = pr.head.ref;
    const prBase = pr.base.ref;
    const repoLink = payload.repository.html_url;
    const prAssignee = pr.assignee ? pr.assignees : "None";
    const prBody = pr.body;

    if (!KEYACTIONS.includes(prAction)) {
        return;
    }

    // Create an embed message to send
    const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle(prTitle)
                .setURL(prUrl)
                .setAuthor({ name: prSender, iconURL: prSenderAvatar, url: prSenderUrl })
                .setDescription('Click on the title above to see the pull request')
                .setThumbnail('https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png')
                .addFields(
                    { name: 'Event Type', value: "Pull Request", inline: true },
                    { name: 'Action', value: prAction, inline: true },
                    { name: 'Repository', value: repositoryName },
                    { name: 'Body', value: prBody },
                    { name: 'Assignees', value: prAssignee.map(user => user.login).join(', ') },
                    { name: 'Head Branch', value: prHead, inline: true },
                    { name: 'Base Branch', value: prBase, inline: true },
                )
                .setTimestamp();

    const message = {embeds: [embed]};

    // Send the message to a specific Discord channel
    const result = sendToDiscordChannel(message, channelId);

    if (result === -1) {
        unsubscribeToGitHub(repoLink, channelId);
    }
}

async function fetchChannels(repoName: string, eventType: string) {
    const PK_REPO = DB_KEY.ORG(LP_ORG_NAME);
    const SK_REPO = DB_KEY.REPO(repoName);

    try {
        const record = await dbHandler.fetchRecord(TABLE_NAME, PK_REPO, SK_REPO);
        const channels = Object.keys(record.subscribers)
            .filter(key => record.subscribers[key].events.includes("PR")) // Filter IDs where events include "PR"
            .map(key => record.subscribers[key].channelid);
        return channels;
    } catch (error) {
        if (error === "TypeError: Cannot read properties of null (reading 'subscribers')") {
            return;
        } else {
            console.error("Error fetching record:", error);
            throw error;
        }
    }
}

export default router;