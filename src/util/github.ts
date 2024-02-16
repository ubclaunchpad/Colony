//@ts-nocheck

import dotenv from "dotenv";
import { App } from "octokit";
import fs from "fs";
import path from "path";
dotenv.config();
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { randomBytes } from 'crypto';
import { promises as promisefs } from 'fs';

// const webhookSecret = process.env.WEBHOOK_SECRET;
const appId = process.env.GH_APP_ID;
// const privateKeyPath = process.env.GH_PRIVATE_KEY_PATH;
// const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const privateKey = process.env.GH_KEY;

const LP_GITHUB_APP_CLIENT_ID = process.env.LP_GITHUB_APP_CLIENT_ID;
const LP_REPO_ID = process.env.LP_REPO_ID;
const LP_ORG_NAME = process.env.LP_ORG_NAME;

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
});

// TODO: change this
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = path.join(__dirname, process.env.GITHUB_SUB_FILE_PATH);

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
  // TODO: double check this before testing
  // const installationId = "46623201"
  // const octokit = await app.getInstallationOctokit(installationId);
  const octokit = await app.getInstallationOctokit(LP_REPO_ID);
  
  const [owner, repo] = extractOwnerAndRepo(repoUrl);

  // Check existing subscriptions in json file
  try {
    const fPath = path.resolve(__dirname, filePath);
    const fileContents = await promisefs.readFile(filePath, 'utf8');
    let secretInfos;

    if (fileContents && typeof fileContents === 'string' && fileContents.trim()) {
      // File is not empty, parse the JSON
      secretInfos = JSON.parse(fileContents) as SecretInfo[];
    } else {
      // File is empty, initialize to an empty array
      secretInfos = [];
    }

    const secretInfo = secretInfos.find(info => (info.channelId === channelId && info.ownerName === owner && info.repoName === repo));

    if (secretInfo) {
      console.log("Duplicated subscription found")
      return -1;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await promisefs.writeFile(filePath, '', 'utf8');

    } else {
      console.error('Error reading from the file:', error);
    }
  }

  // Prepare a webhook for that subscription
  const webhookUrl = "https://colony-production.up.railway.app/webhook/" + channelId + "/" + owner + "/" + repo;
  const webhookSecret = generateSecretToken();

  // TODO: we might need to save these in database
  saveSecretToFile(webhookSecret, channelId, owner, repo, filePath);

  await createPullRequestWebhook(octokit, owner, repo, webhookUrl, webhookSecret);

  return 1;
}

// Utility function to extract owner and repo name from URL
function extractOwnerAndRepo(url: string): [string, string] {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  // TODO: check if client can receive notification
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
  ownerName: string;
  repoName: string;
}

async function saveSecretToFile(secret: string, channel: string, owner: string, repo: string, filePath: string): Promise<void> {
  const newObject: SecretInfo = { webhookSecret: secret, channelId: channel, ownerName: owner, repoName: repo };
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