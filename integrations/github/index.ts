import { App } from "octokit";
import { GithubOrganizationManager } from "./githubManager";
import { githubAppSchema } from "./types";

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
export const githubManager = new GithubOrganizationManager({
  ...githubSchemaChecker.data,
  octoClient,
});
