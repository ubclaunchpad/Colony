//@ts-nocheck

import dotenv from "dotenv";
import { App } from "octokit";
import fs from "fs";
dotenv.config();

import { randomBytes } from 'crypto';
import { promises as promisefs } from 'fs';

// const webhookSecret = process.env.WEBHOOK_SECRET;
const appId = process.env.GH_APP_ID;
const privateKeyPath = process.env.GH_PRIVATE_KEY_PATH;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");
// const privateKey = process.env.GH_KEY;

const LP_GITHUB_APP_CLIENT_ID = process.env.LP_GITHUB_APP_CLIENT_ID;
const LP_REPO_ID = process.env.LP_REPO_ID;
const LP_ORG_NAME = process.env.LP_ORG_NAME;

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
});

export async function isRepoMember(githubUsername) {
  // console.log(`Checking if member for: ${githubUsername}`);
  let okto = await app.getInstallationOctokit(LP_REPO_ID);
  let resp = await okto.request("GET /orgs/{org}/memberships/{username}", {
    org: LP_ORG_NAME,
    username: githubUsername,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (resp.status !== 200) {
    // console.log("Not a member");
    return false;
  }

  let data = await resp.data;
  if (data.state === "active") {
    // console.log("Is a member");
    return true;
  } else {
    // console.log("Not a member ---");
    return false;
  }
}

export async function initiateDeviceFlow() {
  let client_id = LP_GITHUB_APP_CLIENT_ID;
  let resp = await fetch(
    `https://github.com/login/device/code?client_id=${client_id}&scope=user`,
    {
      method: "POST",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/json",
      },
    },
  );

  let data = await resp.json();
  return data;
}

export async function connectToGitHub(repoUrl: string, channelId: string) {
  // TODO: Maybe we need to get this id automatically somehow?
  const installationId = "42893145"
  const octokit = await app.getInstallationOctokit(installationId);
  
  const [owner, repo] = extractOwnerAndRepo(repoUrl);

  // Prepare a webhook for that subscription
  const webhookUrl = "https://0ec4-128-189-176-180.ngrok-free.app/webhook/" + channelId;
  const webhookSecret = generateSecretToken();

  // TODO: we might need to save these in database
  saveSecretToFile(webhookSecret, channelId, "/home/jamesjiang/Colony_test/subscription_configs.json");

  // TODO: check if creating multiple times affect anything
  // TODO: what if multiple different repos are set for notification?
  createPullRequestWebhook(octokit, owner, repo, webhookUrl, webhookSecret);
}

// Utility function to extract owner and repo name from URL
function extractOwnerAndRepo(url: string): [string, string] {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub repository URL');
  return [match[1], match[2]];
}

async function createPullRequestWebhook(octokit: Octokit, owner: string, repo: string, webhookUrl: string, webhookSecret: string) {
  try {
      const response = await octokit.rest.repos.createWebhook({
          owner,
          repo,
          config: {
              url: webhookUrl,
              content_type: 'json',
              secret: webhookSecret,
          },
          events: ['pull_request'],
      });

      console.log(`Webhook created: ${response.data.url}`);
  } catch (error) {
      console.error('Error creating webhook:', error);
  }
}

function generateSecretToken(): string {
  return randomBytes(20).toString('hex');
}

interface SecretInfo {
  webhookSecret: string;
  channelId: string;
}

async function saveSecretToFile(secret: string, channel: string, filePath: string): Promise<void> {
  const newObject: SecretInfo = { webhookSecret: secret, channelId: channel };
  try {
    let data: SecretInfo[];
    try {
      // Try to read the existing file
      const fileContents = await promisefs.readFile(filePath, 'utf8');
      data = JSON.parse(fileContents) as SecretInfo[];
    } catch (error) {
      // If the file does not exist or cannot be read, start with an empty array
      data = [];
    }
    // Append the new object
    data.push(newObject);
    // Write the updated array back to the file
    await promisefs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Secret saved to file.');
  } catch (error) {
    console.error('Error saving secret to file:', error);
  }
}