import { App, Octokit } from "octokit";
import { z } from "zod";
import type {
  AddMemberToTeamsOptionsSchema,
  ConstructorParams,
  GHAuthManagerInterface,
  GithubOrganizationManagerInterface,
} from "./types";
import { GitHubAPIError } from "./errorTypes";
import type { GHEventManagerInterface } from "./events/types";
import { GithubEventManager } from "./events/githubEventManager";

export class GithubOrganizationManager
  implements GHAuthManagerInterface, GithubOrganizationManagerInterface
{
  appId: string;
  privateKey: string;
  app: App;
  orgName: string;
  orgAppId: number;
  orgClientId: string;
  octoClient: Octokit;
  teams:
    | { id: number; node_id: string; url: string; name: string; slug: string }[]
    | null = null;
  defaultHeaders: Record<string, string>;
  githubEventManager: GHEventManagerInterface;

  constructor({
    appId,
    privateKey,
    orgName,
    orgAppId,
    orgClientId,
    octoClient,
  }: ConstructorParams) {
    this.appId = appId;
    this.privateKey = privateKey;
    this.orgName = orgName;
    this.orgAppId = orgAppId;
    this.orgClientId = orgClientId;
    this.octoClient = octoClient;
    this.app = new App({
      appId,
      privateKey,
      installationId: orgAppId,
    });
    this.githubEventManager = new GithubEventManager(octoClient);
    this.defaultHeaders = {
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  public getEventManager() {
    return this.githubEventManager;
  }




  public async initiateDeviceFlow() {
    const resp = await fetch(
      `https://github.com/login/device/code?client_id=${this.orgClientId}&scope=user`,
      {
        method: "POST",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          Accept: "application/json",
        },
      }
    );

    const data = await resp.json();
    return data;
  }

  public async isOrganizaionMember(ghUsername: string) {
    try {
      const resp = await this.octoClient.request(
        "GET /orgs/{org}/memberships/{username}",
        {
          org: this.orgName,
          username: ghUsername,
          headers: this.defaultHeaders,
        }
      );

      if (resp.status !== 200) {
        return false;
      }
      const data = resp.data;
      return data.state === "active" ? true : false;
    } catch (e) {
      throw new GitHubAPIError((e as Error).message);
    }
  }

  public async inviteToOrganization(ghUsername: string) {
    try {
      await this.octoClient.request("PUT /orgs/{org}/memberships/{username}", {
        org: this.orgName,
        username: ghUsername,
        headers: this.defaultHeaders,
      });
    } catch (e) {
      throw new GitHubAPIError((e as Error).message);
    }
  }

  public async removeFromOrganization(ghUsername: string) {
    try {
      await this.octoClient.request(
        "DELETE /orgs/{org}/memberships/{username}",
        {
          org: this.orgName,
          username: ghUsername,
          headers: this.defaultHeaders,
        }
      );
    } catch (e) {
      throw new GitHubAPIError((e as Error).message);
    }
  }

  public async addMemberToTeams(
    ghUsername: string,
    options: z.infer<typeof AddMemberToTeamsOptionsSchema>
  ) {
    if (!options.length) {
      return;
    }
    // TODO: check if user is already a member of the team
    // TODO: check if all teams exist

    try {
      for (const team of options) {
        const res = await this.octoClient.request(
          "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}",
          {
            org: this.orgName,
            team_slug: team.name,
            role: team.role,
            username: ghUsername,
            headers: this.defaultHeaders,
          }
        );

        if (res.status !== 200) {
          return;
        }
      }
      return;
    } catch (e) {
      throw new GitHubAPIError((e as Error).message);
    }
  }
}

// type GitHubSetupOptions = z.infer<typeof GithubIntegrationSchema>;

// export async function setupGithubUserForOrg({
//   manager,
//   options,
// }: {
//   manager: OrganizationGithubManager;
//   options: GitHubSetupOptions;
// }) {
//   await manager.addOrgMember(options.githubUsername);
//   //   const actionPromises = [];
//   //   actionPromises.push(manager.startOrgRepos(options.actions.starRepositories));
//   //   actionPromises.push(manager.watchOrgRepos(options.actions.watchRepositories));
//   //   await Promise.all(actionPromises);

//   if (options.actions?.teams) {
//     if (!manager.teams) {
//       await manager.reSyncTeams();
//     }

//     // console.log(manager.teams);

//     const teams = options.actions.teams.filter(
//       (team) => manager.teams?.find((t) => t.name.toLowerCase() === team.name.toLowerCase())
//     );

//     if (teams.length !== options.actions.teams.length) {
//       throw new Error("Some teams not found");
//     }

//     try {
//       const teamPromises = [];
//       for (const team of options.actions.teams) {
//         if (team.role === "maintainer") {
//           teamPromises.push(
//             manager.addTeamMember(team.name, options.githubUsername)
//           );
//         }
//       }
//       await Promise.all(teamPromises);
//     } catch (e) {
//       throw new Error("Failed to setup teams");
//     }
//   }

//   return;
// }

// public async followOrg() {
//   const okto = await this.app.getInstallationOctokit(this.orgAppId);
//   await okto.request("PUT /user/following/{username}", {
//     username: this.orgName,

//     headers: {
//       "X-GitHub-Api-Version": "2022-11-28",
//     },
//   });
// }

// public async watchOrgRepos(repos: string[]) {
//   const okto = await this.app.getInstallationOctokit(this.orgAppId);
//   for (const repo of repos) {
//     await okto.request("PUT /repos/{owner}/{repo}/subscription", {
//       owner: this.orgName,
//       repo,
//       headers: {
//         "X-GitHub-Api-Version": "2022-11-28",
//       },
//     });
//   }
// }

// public async startOrgRepos(repos: string[]) {
//   const okto = await this.app.getInstallationOctokit(this.orgAppId);
//   for (const repo of repos) {
//     await okto.request("PUT /user/starred/{owner}/{repo}", {
//       owner: this.orgName,
//       repo,
//       headers: {
//         "X-GitHub-Api-Version": "2022-11-28",
//       },
//     });
//   }
// }
