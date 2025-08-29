import { Hono } from "hono";
import { discordManager } from "../integrations/discord/discordGuildManager";
import {
  AddDiscordRolesSchema,
  RemoveDiscordRolesSchema,
} from "../integrations/discord/types";

export const discordRouter = new Hono();

discordRouter.get("/", (c) => {
  return c.text("Discord Integration API");
});


discordRouter.use('*', async (c, next) => {
  const isReady: boolean = discordManager.client.isReady();
  if (isReady) {
    return await next();
  } else {
    return c.text("Discord bot is not ready - cannot process requests", 503);
  }
});



discordRouter.put("/:username/roles", async (c) => {
  const username: string = c.req.param("username");
  const body = await c.req.json();
  const parsed = AddDiscordRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(parsed.error.errors, 422);
  }
  try {
    await discordManager.addRolesToUser(username, parsed.data.roles, "Label");
    return c.text("Roles added successfully");
  } catch (e) {
    console.log(e);
    return c.text("Internal server error", 500);
  }
});

discordRouter.delete("/:username/roles", async (c) => {
  const username: string = c.req.param("username");
  const body = await c.req.json();
  const parsed = RemoveDiscordRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(parsed.error.errors, 422);
  }
  try {
    await discordManager.removeRolesFromUser(
      username,
      parsed.data.roles,
      "Label"
    );
    return c.text("Roles Removed");
  } catch (e) {
    return c.text("Internal server error", 500);
  }
});

discordRouter.get("/:username/roles", async (c) => {
  const username: string = c.req.param("username");
  try {
    const roles = await discordManager.getUserRoles(username);
    return c.json(roles);
  } catch (e) {
    console.log(e);
    return c.text("Internal server error", 500);
  }
});

// Remove a role from all members in the server (and optionally delete the role)
discordRouter.delete("/roles/:roleName", async (c) => {
  const roleName: string = c.req.param("roleName");
  const deleteRole = c.req.query("delete") === "true"; // Optional query parameter
  
  try {
    const result = await discordManager.removeRoleFromAllMembers(roleName, deleteRole);
    
    return c.json({
      success: true,
      message: `Role "${roleName}" removed from ${result.membersAffected} member(s)`,
      membersAffected: result.membersAffected,
      roleDeleted: result.roleDeleted
    });
  } catch (e: any) {
    console.log(e);
    return c.json({
      success: false,
      error: e.message || "Internal server error"
    }, 500);
  }
});

// Remove a user from the server (kick)
discordRouter.delete("/:username", async (c) => {
  const username: string = c.req.param("username");
  
  try {
    await discordManager.removeUserFromServer(username);
    
    return c.json({
      success: true,
      message: `User "${username}" has been removed from the server`
    });
  } catch (e: any) {
    console.log(e);
    return c.json({
      success: false,
      error: e.message || "Internal server error"
    }, 500);
  }
});
