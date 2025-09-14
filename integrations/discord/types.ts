import type { Client, Collection } from "discord.js";
import { z } from "zod";

export interface DiscordGuildManagerInterface {
  addRolesToUser(
    discordUsername: string,
    roles: string[],
    type: "ID" | "Label"
  ): Promise<void>;
  removeRolesFromUser(
    discordUsername: string,
    roles: string[],
    type: "ID" | "Label"
  ): Promise<void>;
  getUserRoles(discordUsername: string): Promise<string[]>;
  removeUserFromServer(discordUsername: string): Promise<void>;
}

export const AddDiscordRolesSchema = z.object({
  roles: z.array(z.string()),
});

export interface ClientWithCommands extends Client {
  commands: Collection<string, any>;
}

export const RemoveDiscordRolesSchema = AddDiscordRolesSchema;

// Discord Error Types
export class DiscordError extends Error {
  public statusCode?: number;
  public discordErrorCode?: string;
  
  constructor(message: string, statusCode?: number, discordErrorCode?: string) {
    super(message);
    this.name = 'DiscordError';
    this.statusCode = statusCode;
    this.discordErrorCode = discordErrorCode;
  }
}

export class DiscordUserNotFoundError extends DiscordError {
  constructor(username: string, guildName?: string) {
    const guildInfo = guildName ? ` in server "${guildName}"` : " in the Discord server";
    super(`Discord user '${username}' not found${guildInfo}`, 404, 'user_not_found');
    this.name = 'DiscordUserNotFoundError';
  }
}

export class DiscordRoleNotFoundError extends DiscordError {
  constructor(roleName: string) {
    super(`Discord role '${roleName}' not found`, 404, 'role_not_found');
    this.name = 'DiscordRoleNotFoundError';
  }
}

export class DiscordPermissionError extends DiscordError {
  constructor(action: string) {
    super(`Insufficient permissions to ${action}`, 403, 'insufficient_permissions');
    this.name = 'DiscordPermissionError';
  }
}

export class DiscordBotNotReadyError extends DiscordError {
  constructor() {
    super('Discord bot is not ready to process requests', 503, 'bot_not_ready');
    this.name = 'DiscordBotNotReadyError';
  }
}

export class DiscordValidationError extends DiscordError {
  constructor(message: string) {
    super(message, 422, 'validation_error');
    this.name = 'DiscordValidationError';
  }
}

export class DiscordNotImplementedError extends DiscordError {
  constructor(feature: string) {
    super(`Feature '${feature}' is not yet implemented`, 501, 'not_implemented');
    this.name = 'DiscordNotImplementedError';
  }
}
