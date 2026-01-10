import { Hono } from "hono";
import { discordManager } from "../integrations/discord/discordGuildManager";
import {
  AddDiscordRolesSchema,
  RemoveDiscordRolesSchema,
  DiscordError,
  DiscordUserNotFoundError,
  DiscordRoleNotFoundError,
  DiscordPermissionError,
  DiscordBotNotReadyError,
  DiscordValidationError,
  DiscordNotImplementedError
} from "../integrations/discord/types";
import { Logger } from "../util/logger";

export const discordRouter = new Hono();

// Helper function to handle Discord API errors
function handleDiscordError(error: unknown, context: string) {
  Logger.log("error", `Discord API error in ${context}`, { error });

  if (error instanceof DiscordUserNotFoundError) {
    return {
      message: error.message,
      error_code: error.discordErrorCode,
      status: 404
    };
  }
  
  if (error instanceof DiscordRoleNotFoundError) {
    return {
      message: error.message,
      error_code: error.discordErrorCode,
      status: 404
    };
  }
  
  if (error instanceof DiscordPermissionError) {
    return {
      message: error.message,
      error_code: error.discordErrorCode,
      status: 403
    };
  }
  
  if (error instanceof DiscordBotNotReadyError) {
    return {
      message: error.message,
      error_code: error.discordErrorCode,
      status: 503
    };
  }
  
  if (error instanceof DiscordValidationError) {
    return {
      message: error.message,
      error_code: error.discordErrorCode,
      status: 422
    };
  }
  
  if (error instanceof DiscordNotImplementedError) {
    return {
      message: error.message,
      error_code: error.discordErrorCode,
      status: 501
    };
  }

  if (error instanceof DiscordError) {
    return {
      message: error.message || "Discord API error occurred",
      error_code: error.discordErrorCode || "discord_api_error",
      status: error.statusCode || 500
    };
  }

  // Check if it's a Discord user not found error from the manager
  if (error instanceof Error && error.message.includes("not found in the Discord server")) {
    return {
      message: error.message,
      error_code: "user_not_found",
      status: 404
    };
  }

  // Check if it's a "Not Implemented" error
  if (error instanceof Error && error.message === "Not Implemented") {
    return {
      message: "This feature is not yet implemented",
      error_code: "not_implemented",
      status: 501
    };
  }

  // For unknown errors
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    message: `Internal server error: ${errorMessage}`,
    error_code: "internal_error",
    status: 500
  };
}

discordRouter.get("/", (c) => {
  return c.text("Discord Integration API");
});

// Middleware to check if Discord bot is ready
discordRouter.use('*', async (c, next) => {
  const isReady: boolean = discordManager.client.isReady();
  if (isReady) {
    return await next();
  } else {
    return c.json({
      message: "Discord bot is not ready - cannot process requests",
      error_code: "bot_not_ready",
      suggestion: "Please wait for the bot to connect and try again"
    }, 503);
  }
});

discordRouter.put("/:username/roles", async (c) => {
  const username: string = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    const body = await c.req.json();
    const parsed = AddDiscordRolesSchema.safeParse(body);
    
    if (!parsed.success) {
      return c.json({
        message: "Invalid request body",
        error_code: "validation_error",
        validation_errors: parsed.error.errors
      }, 422);
    }

    if (parsed.data.roles.length === 0) {
      return c.json({
        message: "At least one role must be specified",
        error_code: "empty_roles_array"
      }, 400);
    }

    await discordManager.addRolesToUser(username, parsed.data.roles, "Label");
    return c.json({
      message: "Roles added successfully",
      username,
      roles_added: parsed.data.roles,
      guild: process.env.GUILD_ID
    });
  } catch (error) {
    const errorResponse = handleDiscordError(error, `adding roles to user ${username}`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

discordRouter.delete("/:username/roles", async (c) => {
  const username: string = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    const body = await c.req.json();
    const parsed = RemoveDiscordRolesSchema.safeParse(body);
    
    if (!parsed.success) {
      return c.json({
        message: "Invalid request body",
        error_code: "validation_error",
        validation_errors: parsed.error.errors
      }, 422);
    }

    if (parsed.data.roles.length === 0) {
      return c.json({
        message: "At least one role must be specified",
        error_code: "empty_roles_array"
      }, 400);
    }

    await discordManager.removeRolesFromUser(username, parsed.data.roles, "Label");
    return c.json({
      message: "Roles removed successfully",
      username,
      roles_removed: parsed.data.roles,
      guild: process.env.GUILD_ID
    });
  } catch (error) {
    const errorResponse = handleDiscordError(error, `removing roles from user ${username}`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

discordRouter.get("/:username/roles", async (c) => {
  const username: string = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    const roles = await discordManager.getUserRoles(username);
    return c.json({
      username,
      roles,
      total_roles: roles.length,
      guild: process.env.GUILD_ID
    });
  } catch (error) {
    const errorResponse = handleDiscordError(error, `fetching roles for user ${username}`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

// Additional route for removing user from server (when implemented)
discordRouter.delete("/:username", async (c) => {
  const username: string = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    await discordManager.removeUserFromServer(username);
    return c.json({
      message: "User removed from server successfully",
      username,
      guild: process.env.GUILD_ID
    });
  } catch (error) {
    const errorResponse = handleDiscordError(error, `removing user ${username} from server`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

// Health check route
discordRouter.get("/health", (c) => {
  const isReady = discordManager.client.isReady();
  const uptime = discordManager.client.uptime;
  
  return c.json({
    status: isReady ? "ready" : "not_ready",
    uptime: uptime ? Math.floor(uptime / 1000) : null,
    guild_id: process.env.GUILD_ID,
    user_tag: discordManager.client.user?.tag || null
  });
});
