import { Hono } from "hono";

import { AddMemberToTeamsOptionsSchema } from "../integrations/github/types";
import { GitHubAPIError } from "../integrations/github/errorTypes";
import { githubManager } from "../integrations/github";
import {
  parsePRPayloadForDB,
  PRRawPayloadSchema,
} from "../integrations/github/events/helpers/githubApiParser";

const githubRouter = new Hono();

githubRouter.get("/", (c) => {
  return c.text("Github Integration API");
});

githubRouter.get("/:username/status", async (c) => {
  const username = c.req.param("username");
  try {
    return c.json({
      isMember: await githubManager.isOrganizaionMember(username),
    });
  } catch (e) {
    if (e instanceof GitHubAPIError) {
      return c.text(
        "We are having trouble connecting to Github. Please try again later.",
        500
      );
    } else {
      return c.text("Internal server error", 500);
    }
  }
});

githubRouter.post("/:username/invite", async (c) => {
  const username = c.req.param("username");
  try {
    await githubManager.inviteToOrganization(username);
    return c.text("Invitation sent successfully");
  } catch (e) {
    if (e instanceof GitHubAPIError) {
      return c.text(
        "We are having trouble connecting to Github. Please try again later.",
        500
      );
    } else {
      return c.text("Internal server error", 500);
    }
  }
});

githubRouter.post("/:username/remove", async (c) => {
  const username = c.req.param("username");
  try {
    await githubManager.removeFromOrganization(username);
    return c.text("User removed successfully");
  } catch (e) {
    if (e instanceof GitHubAPIError) {
      return c.text(
        "We are having trouble connecting to Github. Please try again later.",
        500
      );
    } else {
      return c.text("Internal server error", 500);
    }
  }
});

githubRouter.put("/:username/teams", async (c) => {
  const username = c.req.param("username");
  const body = await c.req.json();
  const parseResult = AddMemberToTeamsOptionsSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(parseResult.error.errors, 422);
  }
  try {
    await githubManager.addMemberToTeams(username, parseResult.data);
    return c.text("User added to teams successfully");
  } catch (e) {
    if (e instanceof GitHubAPIError) {
      return c.text(
        "We are having trouble connecting to Github. Please try again later.",
        500
      );
    } else {
      return c.text("Internal server error", 500);
    }
  }
});

githubRouter.get("/connect", async (c) => {
  return c.json({ url: githubManager.initiateDeviceFlow() });
});

githubRouter.post("/events", async (c) => {
  const body = await c.req.json();
  const cleanedBody = PRRawPayloadSchema.safeParse(body);
  if (!cleanedBody.success) {
    console.warn("Invalid PR Payload - Please check the following errors:");
    console.log(cleanedBody.error.errors);
    return c.json(cleanedBody.error.errors, 422);
  }

  const eventData = parsePRPayloadForDB(cleanedBody.data);
  await githubManager.getEventManager().processEvent(eventData);
  return c.json({ message: "Event processed successfully" });
});

export default githubRouter;
