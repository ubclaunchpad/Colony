import { App } from "octokit";
import { z } from "zod";

interface ConstructorParams {
  appId: string;
  privateKey: string;
  orgName: string;
  orgAppId: number;
  orgClientId: string;
}

export class OrganizationGithubManager {
  appId: string;
  privateKey: string;
  app: App;
  orgName: string;
  orgAppId: number;
  orgClientId: string;
  teams: { id: number; node_id: string; url: string; name: string, slug: string }[] | null =
    null;

  constructor({
    appId,
    privateKey,
    orgName,
    orgAppId,
    orgClientId,
  }: ConstructorParams) {
    this.appId = appId;
    this.privateKey = privateKey;
    this.orgName = orgName;
    this.orgAppId = orgAppId;
    this.orgClientId = orgClientId;
    this.app = new App({
      appId,
      privateKey,
    });
  }

  public async followOrg() {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    await okto.request("PUT /user/following/{username}", {
      username: this.orgName,
      
      headers: {

        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  }

  public async startOrgRepos(repos: string[]) {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    for (const repo of repos) {
      await okto.request("PUT /user/starred/{owner}/{repo}", {
        owner: this.orgName,
        repo,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    }
  }

  public async watchOrgRepos(repos: string[]) {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    for (const repo of repos) {
      await okto.request("PUT /repos/{owner}/{repo}/subscription", {
        owner: this.orgName,
        repo,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    }
  }

  public async addOrgMember(githubUsername: string) {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    const res = await okto.request("PUT /orgs/{org}/memberships/{username}", {
      org: this.orgName,
      username: githubUsername,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (res.status !== 200) {
      throw new Error("Failed to add user to org");
    }
  }



  public async removeOrgMember(githubUsername: string) {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    await okto.request("DELETE /orgs/{org}/memberships/{username}", {
      org: this.orgName,
      username: githubUsername,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  }

  public async isOrgMember(githubUsername: string) {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    const resp = await okto.request("GET /orgs/{org}/memberships/{username}", {
      org: this.orgName,
      username: githubUsername,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (resp.status !== 200) {
      return false;
    }
    const data = await resp.data;
    return data.state === "active" ? true : false;
  }

  public async reSyncTeams() {
    this.teams = null;
    this.teams = await this.getOrgTeams();
  }

  private async getOrgTeams() {
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    const resp = await okto.request("GET /orgs/{org}/teams", {
      org: this.orgName,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return resp.data;
  }

  public async addTeamMember(teamName: string, githubUsername: string) {
    if (!this.teams) {
      this.teams = await this.getOrgTeams();
    }
    const team = this.teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
    if (!team) {
      throw new Error("Team not found");
    }
    const okto = await this.app.getInstallationOctokit(this.orgAppId);
    await okto.request("PUT /orgs/{org}/teams/{team_slug}/memberships/{username}", {
      team_slug: team.slug,
      username: githubUsername,
      org: this.orgName,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  }

  public async initiateDeviceFlow() {
    const client_id = this.orgClientId;
    const resp = await fetch(
      `https://github.com/login/device/code?client_id=${client_id}&scope=user`,
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
}

const GithubIntegrationSchema = z.object({
  githubUsername: z.string(),
  actions: z.object({
    // followOrganization: z.boolean(),
    // starRepositories: z.array(z.string()),
    // watchRepositories: z.array(z.string()),
    teams: z.array(
      z.object({
        name: z.string(),
        role: z.enum(["maintainer", "member"]),
      })
    ),
  }),
});

type GitHubSetupOptions = z.infer<typeof GithubIntegrationSchema>;

export async function setupGithubUserForOrg({
  manager,
  options,
}: {
  manager: OrganizationGithubManager;
  options: GitHubSetupOptions;
}) {
  await manager.addOrgMember(options.githubUsername);
  //   const actionPromises = [];
  //   actionPromises.push(manager.startOrgRepos(options.actions.starRepositories));
  //   actionPromises.push(manager.watchOrgRepos(options.actions.watchRepositories));
  //   await Promise.all(actionPromises);

  if (options.actions?.teams) {
    if (!manager.teams) {
      await manager.reSyncTeams();
    }

    const teams = options.actions.teams.filter(
      (team) => manager.teams?.find((t) => t.name.toLowerCase() === team.name.toLowerCase())
    );

    if (teams.length !== options.actions.teams.length) {
      throw new Error("Some teams not found");
    }

    try {
      const teamPromises = [];
      for (const team of options.actions.teams) {
        if (team.role === "maintainer") {
          teamPromises.push(
            manager.addTeamMember(team.name, options.githubUsername)
          );
        }
      }
      await Promise.all(teamPromises);
    } catch (e) {
      throw new Error("Failed to setup teams");
    }
  }

  return;
}
