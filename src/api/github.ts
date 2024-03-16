import Router from "@koa/router";
import { sendToDiscordChannel } from "../app.js";
import dotenv from "dotenv";
import { dbHandler } from "../model/dbHandler.js";
import { TABLE_NAME, DB_KEY, unsubscribeToGitHub } from "../util/github.js";

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
    const prHead = pr.head.ref;
    const prBase = pr.base.ref;
    const repoLink = payload.repository.html_url;

    if (!KEYACTIONS.includes(prAction)) {
        return;
    }

    // TODO: Need to change the format of the message based on specific types of action, such as assigned
    // Create a message to send
    const message = `Pull Request in repository ${repositoryName} has been ${prAction} by ${prSender}.\n
                    Title: ${prTitle}\n
                    From ${prHead} into ${prBase}.\n
                    ${prUrl}`;

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
        console.error("Error fetching record:", error);
        throw error;
    }
}

export default router;