import dotenv from "dotenv";
import { App } from "octokit";
import fs from "fs";
dotenv.config();

// const webhookSecret = process.env.WEBHOOK_SECRET;
const appId = process.env.GH_APP_ID;
// const privateKeyPath = process.env.GH_PRIVATE_KEY_PATH;
// const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const privateKey = process.env.GH_KEY;

const LP_GITHUB_APP_CLIENT_ID = process.env.LP_GITHUB_APP_CLIENT_ID;
const LP_REPO_ID = process.env.LP_REPO_ID;
const LP_ORG_NAME = process.env.LP_ORG_NAME;

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
});

export async function isRepoMember(githubUsername) {
  // console.log(`Checking if member for: ${githubUsername}`);
  let okto = await app.getInstallationOctokit(LP_REPO_ID);
  let resp = await okto.request("GET /orgs/{org}/memberships/{username}", {
    org: LP_ORG_NAME,
    username: githubUsername,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (resp.status !== 200) {
    // console.log("Not a member");
    return false;
  }

  let data = await resp.data;
  if (data.state === "active") {
    // console.log("Is a member");
    return true;
  } else {
    // console.log("Not a member ---");
    return false;
  }
}

export async function initiateDeviceFlow() {
  let client_id = LP_GITHUB_APP_CLIENT_ID;
  let resp = await fetch(
    `https://github.com/login/device/code?client_id=${client_id}&scope=user`,
    {
      method: "POST",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/json",
      },
    },
  );

  let data = await resp.json();
  return data;
}
