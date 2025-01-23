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

discordRouter.get("/members", async (c) => {
  const m = await discordManager.guild.members.fetch();
  console.log(m);
  return c.text("ss");
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
    return c.text("Roles added");
  } catch (e) {
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
    console.log("added");
    return c.text("Roles added");
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
