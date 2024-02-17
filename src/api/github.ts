import Koa from 'koa';
import Router from "@koa/router";
import { createHmac } from 'crypto';
import { promises as fs } from 'fs';
import { sendToDiscordChannel } from "../app.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

dotenv.config();

const router = new Router();

// TODO: change this
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = path.join(__dirname, process.env.GITHUB_SUB_FILE_PATH);

interface SecretInfo {
    webhookSecret: string;
    channelId: string;
}

router.post("/webhook/:channelId/:owner/:repo", async (ctx) => {
    let webhookSecret = "";
    const channelId = ctx.params.channelId;
    const ownerName = ctx.params.owner;
    const repoName = ctx.params.repo;

    console.log("PR notification receieved!", channelId);

    // Find the corresponding webhook secret
    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        let secretInfos;

        if (fileContents && typeof fileContents === 'string' && fileContents.trim()) {
            // File is not empty, parse the JSON
            secretInfos = JSON.parse(fileContents) as SecretInfo[];
        } else {
            // File is empty, initialize to an empty array
            secretInfos = [];
        }

        const secretInfo = secretInfos.find(info =>
            (info.channelId === channelId && info.ownerName === ownerName && info.repoName === repoName));

        if (secretInfo) {
            webhookSecret = secretInfo.webhookSecret;

            // Verify with the saved webhook secret
            if (!verifySignature(ctx, webhookSecret)) {
                ctx.status = 401;
                ctx.body = 'Invalid signature';
                return;
            }
        } else {
            ctx.status = 404;
            ctx.body = 'Channel ID not found';
            return;
        }
    } catch (error) {
        console.error('Error reading from the file:', error);
        ctx.status = 500;
        ctx.body = 'Internal Server Error';
        return;
    }

    // Process the webhook event
    const event = ctx.request.headers['x-github-event'];
    const payload = ctx.request.body;

    if (event === 'pull_request') {
        // Handle pull request event
        handlePullRequestEvent(payload, channelId);
    }

    ctx.status = 200;
    ctx.body = 'Event received';
    return;
});

function handlePullRequestEvent(payload: any, channelId: string) {
    console.log('Pull Request Created!');

    // Extract necessary information from the pull request event
    const pr = payload.pull_request;
    const prTitle = pr.title;
    const prUrl = pr.html_url;
    const prAction = payload.action; // e.g., 'opened', 'closed', 'reopened'
    const repositoryName = payload.repository.full_name;

    // Create a message to send
    const message = `Pull Request in repository ${repositoryName} has been ${prAction}: ${prTitle}\n${prUrl}`;

    // Send the message to a specific Discord channel
    sendToDiscordChannel(message, channelId);
}

// Function to verify the webhook signature
function verifySignature(ctx: Koa.ParameterizedContext, webhookSecret: string): boolean {
    const signature = ctx.request.headers['x-hub-signature-256'] as string;
    const hmac = createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(ctx.request.body)).digest('hex');
    return signature === digest;
}

export default router;