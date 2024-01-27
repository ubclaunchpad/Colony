//@ts-nocheck
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ALL_RESPONSES, createResponse } from "./util/responses.js";
import { DbHandler, userGithubMap } from "./model/dbHandler.js";
import { isRepoMember } from "./util/github.js";

import express from 'express';
import bodyParser from 'body-parser';
import { createHmac } from 'crypto';
import { promises as promisefs } from 'fs';

dotenv.config();
const __dirname = new URL(".", import.meta.url).pathname;
const TOKEN = process.env.DISCORD_TOKEN;
const LP_GITHUB_APP_CLIENT_ID = process.env.LP_GITHUB_APP_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ---------------------------Webhook Client---------------------------
const app = express();
const port = 3000;
let webhookSecret = "";
let channelId = "";

interface SecretInfo {
  webhookSecret: string;
  channelId: string;
}

const filePath = '/home/jamesjiang/Colony_test/subscription_configs.json';

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Webhook endpoint
app.post('/webhook/:channelId', (req, res) => {
  // Get the channelId from the URL
  channelId = req.params.channelId;

  console.log("PR notification receieved!", channelId)

  // Find the corresponding webhook secret
  try {
    const fileContents = promisefs.readFile(filePath, 'utf8');
    let secretInfos;

    if (fileContents && typeof fileContents === 'string' && fileContents.trim()) {
      // File is not empty, parse the JSON
      secretInfos = JSON.parse(fileContents) as SecretInfo[];
    } else {
      // File is empty, initialize to an empty array
      secretInfos = [];
    }

    const secretInfo = secretInfos.find(info => info.channelId === channelId);

    if (secretInfo) {
      webhookSecret = secretInfo.webhookSecret;

      // Verify with the saved webhook secret
      if (!verifySignature(req)) {
        return res.status(401).send('Invalid signature');
      }
    } else {
      res.status(404).send('Channel ID not found');
    }
  } catch (error) {
    console.error('Error reading from the file:', error);
    res.status(500).send('Internal Server Error');
  }

  // Process the webhook event
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'pull_request') {
      // Handle pull request event
      handlePullRequestEvent(payload);
  }

  res.status(200).send('Event received');
});

function handlePullRequestEvent(payload: any) {
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
  sendToDiscordChannel(message);
}

app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

// Function to verify the webhook signature
function verifySignature(req: express.Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  const hmac = createHmac('sha256', webhookSecret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  return signature === digest;
}

// ---------------------------Discord Bot Client---------------------------
// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

class DiscordServer {
  guild;
  roles;

  constructor() {
    this.client = client;
  }

  async init() {
    await this.client.login(TOKEN);
    console.log("Discord client logged in");
  }

  async getparams() {
    const guild = await this.client.guilds.fetch(GUILD_ID);
    const roles = await guild.roles.fetch();

    this.guild = guild;
    this.roles = {};
    for (const [id, role] of roles) {
      this.roles[role.name.toLowerCase()] = role;
    }
  }
}

let server;
const TABLE_NAME = "rocket";
const dbHandler = new DbHandler();

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // console.log("Interaction received");
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("verify_button_")) {
      // console.log("Verify button pressed");

      const githubResponse = userGithubMap[interaction.user.id];

      if (!githubResponse) {
        await interaction.update({
          content: createResponse(ALL_RESPONSES.connectionIssue, [
            interaction.user.id,
          ]),
          components: [],
        });
        return;
      }

      let device_code = userGithubMap[interaction.user.id].device_code;
      let grant_type = "urn:ietf:params:oauth:grant-type:device_code";
      let resp = await fetch(
        `https://github.com/login/oauth/access_token?client_id=${LP_GITHUB_APP_CLIENT_ID}&device_code=${device_code}&grant_type=${grant_type}`,
        {
          method: "POST",
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            Accept: "application/json",
          },
        },
      );

      let data = await resp.json();

      let access_token = data.access_token;

      if (!access_token) {
        await interaction.update({
          content: createResponse(ALL_RESPONSES.connectionIssue, [
            interaction.user.id,
          ]),
          components: [],
        });
        return;
      }

      let resp2 = await fetch(`https://api.github.com/user`, {
        method: "GET",
        headers: {
          Authorization: `token ${access_token}`,
          Accept: "application/json",
        },
      });
      let data2 = await resp2.json();
      let st = await isRepoMember(data2.login);

      if (!st) {
        await interaction.update({
          content: createResponse(ALL_RESPONSES.checkMeNotMember, []),
          components: [],
        });
      }

      await dbHandler.setRecord(TABLE_NAME, interaction.user.id, {
        PK: {
          S: interaction.user.id,
        },
        SK: {
          S: interaction.user.id,
        },
        integrations: {
          M: {
            github: {
              M: {
                username: {
                  S: data2.login,
                },
                id: {
                  N: String(data2.id),
                },
                date: {
                  S: new Date().toISOString(),
                },
              },
            },
          },
        },
      });

      // get the guild
      const member = await server.guild.members.fetch(interaction.user.id);
      await member.roles.add(server.roles["member"].id);
      await interaction.update({
        content: createResponse(ALL_RESPONSES.checkMeSuccess, [
          interaction.user.id,
        ]),
        components: [],
      });
    }
  } else if (interaction.isCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  }
});

client.on(Events.MessageCreate, (message) => {
  // console.log("Message received");
  if (!message.content.startsWith("!") || message.author.bot) return;
  // console.log(message);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await client.users.send(member.user.id, {
      content: createResponse(ALL_RESPONSES.welcomeMessage, [member.user.id]),
    });
  } catch (error) {
    console.log("Failed to send DM:", error);
  }
});

function sendToDiscordChannel(message: string) {
  // Assuming 'client' is your Discord.js client
  const channel = client.channels.cache.get(channelId) as Discord.TextChannel;

  if (channel) {
      channel.send(message).catch(console.error);
  } else {
      console.error(`Channel with ID ${CHANNEL_ID} not found`);
  }
}

// Log in to Discord with your client's token
server = new DiscordServer();
await server.init();
await server.getparams();
