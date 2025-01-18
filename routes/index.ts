import { Hono } from "hono";
import { GithubOrganizationManager } from "../integrations/github/githubManager";
import {
  AddMemberToTeamsOptionsSchema,
  githubAppSchema,
} from "../integrations/github/types";
import { App } from "octokit";
import { GitHubAPIError } from "../integrations/github/errorTypes";

const privateKey = process.env.GH_KEY!;
const appId = process.env.GH_APP_ID!;
const orgClientId = process.env.GH_CLIENT_ID!;
const orgAppId = process.env.GH_ORG_APP_ID!;
const orgName = process.env.GH_ORG_NAME!;

const githubAppConfig = {
  appId: appId,
  privateKey: privateKey,
  orgName: orgName,
  orgAppId: parseInt(orgAppId),
  orgClientId: orgClientId,
};

const githubSchemaChecker = githubAppSchema.safeParse(githubAppConfig);
if (!githubSchemaChecker.success) {
  console.warn(
    "Invalid Github App Config - Please check the following errors:"
  );
  console.error(githubSchemaChecker.error.errors);
  process.exit(1);
}

const app = new App({
  appId,
  privateKey,
  installationId: orgAppId,
});

const octoClient = await app.getInstallationOctokit(
  githubSchemaChecker.data.orgAppId
);
const githubManager = new GithubOrganizationManager({
  ...githubSchemaChecker.data,
  octoClient,
});

const githubRouter = new Hono();

githubRouter.get("/", (c) => {
  return c.text("Github Integration API");
});

githubRouter.get("/:username/status", async (c) => {
  const username = c.req.param("username");
  try {
    return c.json({ isMember: await githubManager.isOrganizaionMember(username) });
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


export default githubRouter;



