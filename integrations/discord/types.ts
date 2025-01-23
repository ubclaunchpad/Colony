import type { Client, Collection } from "discord.js";
import {z} from "zod";

export interface DiscordGuildManagerInterface {
    addRolesToUser(discordUsername: string, roles: string[], type: 'ID' | 'Label'): Promise<void>;
    removeRolesFromUser(discordUsername: string, roles: string[], type: 'ID' | 'Label'): Promise<void>;
    removeUserFromServer(discordUsername: string): Promise<void>;
    getUserRoles(discordUsername: string): Promise<string[]>;

}



export const AddDiscordRolesSchema = z.object({
    roles: z.array(z.string())
});


export interface ClientWithCommands extends Client {
    commands: Collection<string, any>
  }

export const RemoveDiscordRolesSchema = AddDiscordRolesSchema;