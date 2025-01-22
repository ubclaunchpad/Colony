import type { DiscordGuildManagerInterface } from "./types";

import type { GuildMember, Role } from "discord.js";
import {
  Client,
  Events,
  GatewayIntentBits,
  Guild,
} from "discord.js";


const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !GUILD_ID) {
    console.warn(
        "Invalid Discord Environment variables"
      );
    process.exit(1);
}


export class DiscordGuildManager implements DiscordGuildManagerInterface {
    client: Client;
    guild: Guild;
    token: string;
    guildID: string;

    constructor(client: Client, guildID: string, token: string, guild: Guild) {
        this.client = client;
        this.guildID = guildID;
        this.token = token;
        this.guild = guild;
    }

    static async setUpManager(client: Client, guildID: string, token: string) {
        await client.login(token);
        const guild = await client.guilds.fetch(guildID);
        return guild
    }

    async addRolesToUser(discordUsername: string, roles: string[], type: "ID" | "Label"): Promise<void> {
        const memberQuery = await this.guild.members.fetch({"query": discordUsername, limit: 1});
        if (!memberQuery || memberQuery.size === 0) {
            throw new Error(`User ${discordUsername} not found in the Discord server`);
        }
        const member = memberQuery.values().next().value;
        if (!member) {
            throw new Error(`User ${discordUsername} not found in the Discord server`);
        }
        const serverRoles = Array.from((await this.guild.roles.fetch()).values()); 
        const promises: Promise<GuildMember>[] = [];

        serverRoles.filter((s) => roles.includes(s.name)).map(role => {
           const p = member.roles.add(role.id);
        })

        await Promise.all(promises);
    }

    async removeRolesFromUser(discordUsername: string, roles: string[], type: "ID" | "Label"): Promise<void> {
        const memberQuery = await this.guild.members.fetch({"query": discordUsername, limit: 1});
        if (!memberQuery || memberQuery.size === 0) {
            throw new Error(`User ${discordUsername} not found in the Discord server`);
        }
        const member = memberQuery.values().next().value;
        if (!member) {
            throw new Error(`User ${discordUsername} not found in the Discord server`);
        }
        const serverRoles = Array.from((await this.guild.roles.fetch()).values()); 
        const promises: Promise<GuildMember>[] = [];

        serverRoles.filter((s) => roles.includes(s.name)).map(role => {
           const p = member.roles.remove(role.id);
        })

        await Promise.all(promises);
    }

    async getUserRoles(discordUsername: any): Promise<string[]> {
        const memberQuery = await this.guild.members.fetch({"query": discordUsername, limit: 1});
        if (!memberQuery || memberQuery.size === 0) {
            throw new Error(`User ${discordUsername} not found in the Discord server`);
        }
        const member = memberQuery.values().next().value;
        if (!member) {
            throw new Error(`User ${discordUsername} not found in the Discord server`);
        }

        return Array.from(member.roles.cache.values()).map(r => r.name);
    }

    async removeUserFromServer(discordUsername: string): Promise<void> {
        throw new Error("Not Implemented");
    }
}


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


client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });


const guild = await DiscordGuildManager.setUpManager(client, GUILD_ID, DISCORD_TOKEN);
export const discordManager = new DiscordGuildManager(client, GUILD_ID, DISCORD_TOKEN, guild);

