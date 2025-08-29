import type { ClientWithCommands, DiscordGuildManagerInterface } from "./types";

import type { GuildMember } from "discord.js";
import { Client, Events, GatewayIntentBits, Guild, Partials } from "discord.js";
import { Logger } from "../../util/logger";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !GUILD_ID) {
  Logger.log("warn", `Invalid Discord Environment variables`);
  Logger.log("error", "Missing at least one of <GUILD_ID> or <DISCORD_TOKEN>")
  process.exit(1);
}

export class DiscordGuildManager implements DiscordGuildManagerInterface {
  client: ClientWithCommands;
  guild: Guild;
  token: string;
  guildID: string;

  constructor(client: Client, guildID: string, token: string, guild: Guild) {
    this.client = client as ClientWithCommands;
    this.guildID = guildID;
    this.token = token;
    this.guild = guild;
  }

  static async setUpManager(client: Client, guildID: string, token: string) {
    await client.login(token);
    const guild = await client.guilds.fetch(guildID);
    return guild;
  }

  async resumeBot() {
    Logger.log("warn", `Resuming Discord Bot >>>>>`);
    await client.login(this.token);
    const guild = await client.guilds.fetch(this.guildID);
    Logger.log("warn", `Resumed Discord Bot <<<<<`);
    return guild;
  }

  async stopDiscordManager() {
    Logger.log("warn", `Stopping Discord Bot >>>>>`);
    await client.destroy();
    Logger.log("warn", `Stopped Discord Bot  <<<<<`);
  }

  async addRolesToUser(
    discordUsername: string,
    roles: string[],
    type: "ID" | "Label"
  ): Promise<void> {
    const memberQuery = await this.guild.members.fetch({
      query: discordUsername,
      limit: 1,
    });
    if (!memberQuery || memberQuery.size === 0) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    const member = memberQuery.values().next().value;
    if (!member) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    const serverRoles = Array.from((await this.guild.roles.fetch()).values());
    const promises: Promise<GuildMember>[] = [];

    serverRoles
      .filter((s) => roles.includes(s.name))
      .forEach((role) => {
        const p = member.roles.add(role.id);
        promises.push(p);
      });

    await Promise.all(promises);
  }

  async removeRolesFromUser(
    discordUsername: string,
    roles: string[],
    type: "ID" | "Label"
  ): Promise<void> {
    const memberQuery = await this.guild.members.fetch({
      query: discordUsername,
      limit: 1,
    });
    if (!memberQuery || memberQuery.size === 0) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    const member = memberQuery.values().next().value;
    if (!member) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    const serverRoles = Array.from((await this.guild.roles.fetch()).values());
    const promises: Promise<GuildMember>[] = [];

    serverRoles
      .filter((s) => roles.includes(s.name))
      .map((role) => {
        const p = member.roles.remove(role.id);
      });

    await Promise.all(promises);
  }

  async getUserRoles(discordUsername: any): Promise<string[]> {
    const memberQuery = await this.guild.members.fetch({
      query: discordUsername,
      limit: 1,
    });
    if (!memberQuery || memberQuery.size === 0) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    const member = memberQuery.values().next().value;
    if (!member) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }

    return Array.from(member.roles.cache.values()).map((r) => r.name);
  }

  async removeUserFromServer(discordUsername: string): Promise<void> {
    const memberQuery = await this.guild.members.fetch({
      query: discordUsername,
      limit: 1,
    });
    
    if (!memberQuery || memberQuery.size === 0) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    
    const member = memberQuery.values().next().value;
    if (!member) {
      throw new Error(
        `User ${discordUsername} not found in the Discord server`
      );
    }
    
    // Check if bot can kick this member (hierarchy check)
    const botMember = await this.guild.members.fetch(this.client.user!.id);
    const botHighestRole = botMember.roles.highest;
    const memberHighestRole = member.roles.highest;
    
    if (memberHighestRole.position >= botHighestRole.position) {
      throw new Error(
        `Cannot remove user ${discordUsername} - their role hierarchy is equal to or higher than the bot's`
      );
    }
    
    // Check if the member is the server owner
    if (member.id === this.guild.ownerId) {
      throw new Error(
        `Cannot remove the server owner ${discordUsername}`
      );
    }
    
    // Kick the member from the server
    await member.kick(`Removed via Colony API`);
    console.log(`User ${discordUsername} has been removed from the server`);
  }

  async removeRoleFromAllMembers(
    roleName: string,
    deleteRole: boolean = false
  ): Promise<{ membersAffected: number; roleDeleted: boolean }> {
    // Get bot's highest role for hierarchy checking
    const botMember = await this.guild.members.fetch(this.client.user!.id);
    const botHighestRole = botMember.roles.highest;
    
    // Find the role by name
    const serverRoles = await this.guild.roles.fetch();
    const targetRole = serverRoles.find(role => role.name === roleName);
    
    if (!targetRole) {
      throw new Error(`Role "${roleName}" not found in the server`);
    }
    
    // Check if bot can manage this role
    if (targetRole.position >= botHighestRole.position) {
      throw new Error(`Cannot manage role "${roleName}" - bot's role hierarchy is insufficient`);
    }
    
    // Get all members with this role
    const membersWithRole = targetRole.members;
    console.log(`Found ${membersWithRole.size} members with role "${roleName}"`);
    
    // Remove the role from all members
    const removePromises = membersWithRole.map(member => 
      member.roles.remove(targetRole.id)
    );
    
    await Promise.all(removePromises);
    
    let roleDeleted = false;
    if (deleteRole) {
      await targetRole.delete();
      roleDeleted = true;
      console.log(`Role "${roleName}" deleted from server`);
    }
    
    return {
      membersAffected: membersWithRole.size,
      roleDeleted
    };
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  Logger.log("info", `Discord Bot connected! Logged in as ${c.user.tag}`);
});

const guild = await DiscordGuildManager.setUpManager(
  client,
  GUILD_ID,
  DISCORD_TOKEN
);
export const discordManager = new DiscordGuildManager(
  client,
  GUILD_ID,
  DISCORD_TOKEN,
  guild
);
