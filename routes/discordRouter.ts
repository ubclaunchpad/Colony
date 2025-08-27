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
