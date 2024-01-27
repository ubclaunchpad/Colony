//@ts-nocheck
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ALL_RESPONSES, createResponse } from "./util/responses.js";
import { DbHandler, userGithubMap } from "./model/dbHandler.js";
import { isRepoMember } from "./util/github.js";
import {
  guildScheduledEventCreate,
  guildScheduledEventUpdate,
  guildScheduledEventDelete,
} from "./util/eventHandling.js";

dotenv.config();
const __dirname = new URL(".", import.meta.url).pathname;
const TOKEN = process.env.DISCORD_TOKEN;
const LP_GITHUB_APP_CLIENT_ID = process.env.LP_GITHUB_APP_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const API_URL = process.env.API_URL;

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
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
  } else if (interaction.isAnySelectMenu()) {
    if (interaction.customId === "event-check-in") {
      const { eventId, email, name } = JSON.parse(interaction.values);

      const res = await fetch(
        `${API_URL}/guilds/${GUILD_ID}/events/${eventId}/attendees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ attendees: [{ email }] }),
        },
      ).then((res) => res.json());

      if (res.length === 0) {
        await interaction.update({
          content: `You are not RSVPed to this event`,
          components: [],
        });
        return;
      }

      const member = await server.guild.members.fetch(interaction.user.id);
      await member.roles.add(server.roles["event attendee"].id);

      await interaction.update({
        content: `Thanks for checking in for the event!`,
        components: [],
        files: ["assets/rocket-landing.gif"],
      });
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

client.on(Events.GuildScheduledEventCreate, guildScheduledEventCreate);

client.on(
  Events.GuildScheduledEventUpdate,
  async (_, newGuildScheduledEvent) => {
    await guildScheduledEventUpdate(newGuildScheduledEvent, server);
  },
);

client.on(Events.GuildScheduledEventDelete, async (guildScheduledEvent) => {
  await guildScheduledEventDelete(guildScheduledEvent, server);
});

// Log in to Discord with your client's token
server = new DiscordServer();
await server.init();
await server.getparams();
