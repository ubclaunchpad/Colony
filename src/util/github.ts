//@ts-nocheck

import dotenv from "dotenv";
import { App } from "octokit";
import fs from "fs";
dotenv.config();

import { randomBytes } from 'crypto';
import { promises as promisefs } from 'fs';
import { dbHandler } from "../model/dbHandler.js";
import { marshall } from "@aws-sdk/util-dynamodb";

// TODO: check these before testing
// Uncomment these for local test
const privateKeyPath = process.env.GH_PRIVATE_KEY_PATH;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const webhookURL = "https://accd-128-189-176-180.ngrok-free.app/webhook/";
export const TABLE_NAME = "github_events_test";

// TODO: check these before testing
// Uncomment these for deployment
// const privateKey = process.env.GH_KEY;
// const webhookURL = "https://colony-production.up.railway.app/webhook/";
// export const TABLE_NAME = "github_events";

const appId = process.env.GH_APP_ID;
const LP_GITHUB_APP_CLIENT_ID = process.env.LP_GITHUB_APP_CLIENT_ID;
const LP_REPO_ID = process.env.LP_REPO_ID;
const LP_ORG_NAME = process.env.LP_ORG_NAME;
const GUILD_ID = process.env.GUILD_ID;

// TODO: Edit the list of events for the webhook to listen on here
const EVENTS = ['pull_request', 'issues'];

export class DB_KEY {
  static REPO = (repoName) => `REPO#${repoName}`;
  static CHANNEL = (channelId) => `CHANNEL#${channelId}`;
  static ORG = (orgName) => `ORG#${orgName}`;
  static SERVER = (serverId) => `SERVER#${serverId}`;
}

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

export async function connectToGitHub(repoUrl: string, channelId: string, eventType: string) {
  const octokit = await app.getInstallationOctokit(LP_REPO_ID);
  
  const [owner, repo] = extractOwnerAndRepo(repoUrl);

  // check existing webhook or not, if no, create one
  const error = await findExistingWebhook(LP_ORG_NAME, octokit, webhookURL).then(found => {
    if (found) {
      console.log('Webhook already exists.');
      return null;
    } else {
      console.log('No existing webhook found.');
      // Create a new webhook for the whole orgnization
      const webhookConfig = {
        url: webhookURL,
        contentType: 'json',
        events: EVENTS,
        active: true, // Optional, defaults to true if not specified
      };

      try {
        createOrgWebhook(LP_ORG_NAME, octokit, webhookConfig);
        return null;
      } catch (error) {
        return "Error creating webhook";
      }
    }
  });

  if (error !== null) {
    return error;
  }

  const PK_REPO = DB_KEY.ORG(LP_ORG_NAME);
  const SK_REPO = DB_KEY.REPO(repo);

  const PK_CHANNEL = DB_KEY.SERVER(GUILD_ID);
  const SK_CHANNEL = DB_KEY.CHANNEL(channelId);

  // Get current date
  const currentDate = new Date();
  const dateString = currentDate.toISOString().split('T')[0];

  // Check existing subscriptions in DB
  try {
    const result = await dbHandler.fetchRecord(TABLE_NAME, PK_REPO, SK_REPO);
    if (result == null) {
      console.log("No existing repo record, create new record");
      // No existing repo record, create new record

      // Add in repos partition
      // Prepare the TS object
      const record = {
        subscribers: {
          [channelId]: {
            channelid: channelId,
            dateConnected: dateString,
            events: [eventType],
          }
        }
      };
      
      // Convert to DB record
      const dbRecord = marshall(record);

      try {
        await dbHandler.addRecord(TABLE_NAME, PK_REPO, SK_REPO, dbRecord);
      } catch (error) {
        console.error("Error adding record:", error);
        throw error;
      }

      // Add in channels partition
      try {
        const result = await dbHandler.fetchRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL);
        if (result == null) {
          console.log("No existing channel record, create new record");
          // No existing channel record, create new record
          // Prepare the TS object
          const record = {
            subscribed: {
              [repo]: {
                repoName: repo,
                dateConnected: dateString,
                events: [eventType],
              }
            }
          };
          
          // Convert to DB record
          const dbRecord = marshall(record);

          try {
            await dbHandler.addRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL, dbRecord);
          } catch (error) {
            console.error("Error adding record:", error);
            throw error;
          }
        } else {
          console.log("No repo entry, create new entry in existing channel record");
          // No repo entry, create new entry in existing channel record

          delete result.PK;
          delete result.SK;

          result['subscribed'][repo] = {
            repoName: repo,
            dateConnected: dateString,
            events: [eventType],
          };

          // Convert to DB record
          const dbRecord = marshall(result);

          try {
            await dbHandler.updateRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL, dbRecord);
          } catch (error) {
            console.error("Error updating record:", error);
            throw error;
          }
        }
      } catch (error) {
        console.error("Error fetching record:", error);
        throw error;
      }
    } else if (result["subscribers"][channelId] == null) {
      console.log("No existing channel entry, create new entry in existing record");
      // No existing channel entry, create new entry in existing record

      delete result.PK;
      delete result.SK;

      result['subscribers'][channelId] = {
        channelid: channelId,
        dateConnected: dateString,
        events: [eventType],
      };

      // Convert to DB record
      const dbRecord = marshall(result);

      try {
        await dbHandler.updateRecord(TABLE_NAME, PK_REPO, SK_REPO, dbRecord);
      } catch (error) {
        console.error("Error updating record:", error);
        throw error;
      }

      // Add in channels partition
      try {
        const result = await dbHandler.fetchRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL);
        if (result == null) {
          console.log("No existing channel record, create new record");
          // No existing channel record, create new record
          // Prepare the TS object
          const record = {
            subscribed: {
              [repo]: {
                repoName: repo,
                dateConnected: dateString,
                events: [eventType],
              }
            }
          };
          
          // Convert to DB record
          const dbRecord = marshall(record);

          try {
            await dbHandler.addRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL, dbRecord);
          } catch (error) {
            console.error("Error adding record:", error);
            throw error;
          }
        } else {
          console.log("No repo entry, create new entry in existing channel record");
          // No repo entry, create new entry in existing channel record

          delete result.PK;
          delete result.SK;

          result['subscribed'][repo] = {
            repoName: repo,
            dateConnected: dateString,
            events: [eventType],
          };

          // Convert to DB record
          const dbRecord = marshall(result);

          try {
            await dbHandler.updateRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL, dbRecord);
          } catch (error) {
            console.error("Error updating record:", error);
            throw error;
          }
        }
      } catch (error) {
        console.error("Error fetching record:", error);
        throw error;
      }
    } else if (!result["subscribers"][channelId][events].includes(eventType)) {
      // TODO: Test this case
      // Channel has subscribed to other events, add new event type to exisisting channel record
      console.log("Channel has subscribed to other events, add new event type to exisisting channel record");
      delete result.PK;
      delete result.SK;

      result['subscribers'][channelId][events].push(eventType);

      // Convert to DB record
      const dbRecord = marshall(result);

      try {
        await dbHandler.updateRecord(TABLE_NAME, PK_REPO, SK_REPO, dbRecord);
      } catch (error) {
        console.error("Error updating record:", error);
        throw error;
      }

      // Add in channels partition
      try {
        const result = await dbHandler.fetchRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL);
        
        console.log("Add new event type to existing repo record");
        // Add new event type to existing repo record

        delete result.PK;
        delete result.SK;

        result['subscribed'][repo][events].push(eventType);

        // Convert to DB record
        const dbRecord = marshall(result);

        try {
          await dbHandler.updateRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL, dbRecord);
        } catch (error) {
          console.error("Error updating record:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error fetching record:", error);
        throw error;
      }
    } else {
      // Existing subscription
      console.log("Duplicated subscription found")
      return "1";
    }
  } catch (error) {
    console.error("Error fetching record:", error);
    throw error;
  }

  return "2";
}

// Utility function to extract owner and repo name from URL
function extractOwnerAndRepo(url: string): [string, string] {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub repository URL');
  return [match[1], match[2]];
}

async function findExistingWebhook(org: string, octokit: Octokit, webhookUrlPrefix: string): Promise<boolean> {
  try {
      const response = await octokit.rest.orgs.listWebhooks({
          org,
      });

      // Search through the webhooks to find if any URL starts with the specified prefix
      const found = response.data.some(webhook => webhook.config.url.startsWith(webhookUrlPrefix));

      return found;
  } catch (error) {
      console.error('Failed to list webhooks:', error);
      return false;
  }
}

async function createOrgWebhook(org: string, octokit: Octokit, webhookConfig: { url: string; contentType: string; secret?: string; events: string[]; active?: boolean; }) {
  try {
    const response = await octokit.request('POST /orgs/{org}/hooks', {
      org: org,
      name: 'web',
      active: true,
      events: EVENTS,
      config: {
        url: webhookConfig.url,
        content_type: 'json'
      },
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log('Webhook created successfully');
  } catch (error) {
    console.error('Failed to create webhook:', error);
    throw error;
  }
}

export async function unsubscribeToGitHub(repoUrl: string, channelId: string) {
  const octokit = await app.getInstallationOctokit(LP_REPO_ID);

  const [owner, repo] = extractOwnerAndRepo(repoUrl);

  const PK_REPO = DB_KEY.ORG(LP_ORG_NAME);
  const SK_REPO = DB_KEY.REPO(repo);

  const PK_CHANNEL = DB_KEY.SERVER(GUILD_ID);
  const SK_CHANNEL = DB_KEY.CHANNEL(channelId);

  // Remove from repo partition
  try {
    const result = await dbHandler.fetchRecord(TABLE_NAME, PK_REPO, SK_REPO);
    if (result == null || result["subscribers"][channelId] == null) {
      // No existing subscription, return error
      console.log("Not a subscriber");
      return -1;
    } else {
      // Found subscription, deleting
      delete result.PK;
      delete result.SK;

      delete result['subscribers'][channelId];

      if (Object.keys(result['subscribers']).length == 0) {
        // No more subscribers for this repo, delete repo record
        console.log("No more subscribers for this repo, delete repo record");
        try {
          await dbHandler.deleteRecord(TABLE_NAME, PK_REPO, SK_REPO);
        } catch (error) {
          console.error("Error deleting record:", error);
          throw error;
        }
      } else {
        // Other subscribers exist, update the repo record
        console.log("Other subscribers exist, update the repo record");
        // Convert to DB record
        const dbRecord = marshall(result);

        try {
          await dbHandler.updateRecord(TABLE_NAME, PK_REPO, SK_REPO, dbRecord);
        } catch (error) {
          console.error("Error updating record:", error);
          throw error;
        }
      }

      // Remove from channel partition
      try {
        const result = await dbHandler.fetchRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL);

        delete result.PK;
        delete result.SK;

        delete result['subscribed'][repo];

        if (Object.keys(result['subscribed']).length == 0) {
          // No more repos subscribed for this channel, delete channel record
          console.log("No more repos subscribed for this channel, delete channel record");
          try {
            await dbHandler.deleteRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL);
          } catch (error) {
            console.error("Error deleting record:", error);
            throw error;
          }
        } else {
          // Other subscriptions left, only update the channel record
          console.log("Other subscriptions left, only update the channel record");
          // Convert to DB record
          const dbRecord = marshall(result);

          try {
            await dbHandler.updateRecord(TABLE_NAME, PK_CHANNEL, SK_CHANNEL, dbRecord);
          } catch (error) {
            console.error("Error updating record:", error);
            throw error;
          }
        }
      } catch (error) {
        console.error("Error fetching record:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error fetching record:", error);
    throw error;
  }

  return 1;
}