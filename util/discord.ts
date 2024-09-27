import type { Role } from "npm:discord.js";
import {
  Client,
  Events,
  GatewayIntentBits,
  Guild,
} from "npm:discord.js";

const TOKEN = Deno.env.get("DISCORD_TOKEN")!;
const GUILD_ID = Deno.env.get("GUILD_ID")!;



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


export class DiscordServer {
  roles: { [key: string]: Role } = {};
  client: Client;
  guild: Guild | null = null;

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
    for (const [, role] of roles) {
      this.roles[role.name.toLowerCase()] = role;
    }
  }

  async addRoleToUser(username: string, roleName: string) {

    if (!Object.keys(this.roles).includes(roleName.toLowerCase())) {
        throw new Error(`Role ${roleName} not found in the server`);
    }

    const collectionRes = await this.guild!.members.fetch({ query: username, limit: 1 });
    console.log(collectionRes);
    if (!collectionRes || collectionRes.size === 0) {
      throw new Error(`User ${username} not found in the server`);
    }

    const member = collectionRes.values().next().value;
    await member.roles.add(this.roles[roleName.toLowerCase()].id);

  }

  async addRolesToUser(username: string, roleNames: string[]) {
     // make sure all roles exist
    roleNames.forEach(roleName => {
      if (!Object.keys(this.roles).includes(roleName.toLowerCase())) {
        throw new Error(`Role ${roleName} not found in the server`);
      }});
      
    await Promise.all(roleNames.map(role => this.addRoleToUser(username, role)));
  }

  async start() {
    await this.client.login(TOKEN);
    await this.getparams();
  }
}



const discordServer = new DiscordServer();
discordServer.start();
export { discordServer };


