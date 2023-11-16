import dotenv from "dotenv";
import {App} from "octokit";
import fs from "fs";
dotenv.config();

const LP_REPO_ID = 43703913;
const LP_ORG_NAME = "ubclaunchpad";
const LP_GH_APP_ID = "Iv1.bfff0a578d157ec8";
// This assigns the values of your environment variables to local variables.
const appId = process.env.GH_APP_ID;
// const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.GH_PRIVATE_KEY_PATH;
// This reads the contents of your private key file.
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
});

const okto =  await app.getInstallationOctokit(LP_REPO_ID);
const RESPONSES = {
    member: '',
    notMember: '',
    error: '',
}

export async function isRepoMember(githubUsername) {
  console.log(`Checking if member for: ${githubUsername}`);
    let resp = await okto.request('GET /orgs/{org}/memberships/{username}', {
          org: LP_ORG_NAME,
          username: githubUsername,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
                    }
        });

        if (resp.status !== 200) {
          return false;
      }

      let data =  resp.data;
      if (data.state === 'active') {
        return true;
    } else {
        return false;
    }
}


export async function initiateDeviceFlow() {
let client_id = LP_GH_APP_ID
 let resp = await fetch(`https://github.com/login/device/code?client_id=${client_id}&scope=user`, {
    method: 'POST',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
      'Accept': 'application/json'
    }
  });

  let data = await resp.json();
  return data;
}


