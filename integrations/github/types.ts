import type { Octokit } from "octokit";
import { z } from "zod";



/// later maybe: getteams, 

export interface ConstructorParams {
  appId: string;
  privateKey: string;
  orgName: string;
  orgAppId: number;
  orgClientId: string;
  octoClient: Octokit
}


export const githubAppSchema = z.object({
    appId: z.string(),
    privateKey: z.string(),
    orgName: z.string(),
    orgAppId: z.number(),
    orgClientId: z.string(),
})




export const AddMemberOptionsSchema = z.object({
  role: z.enum(["maintainer", "member", "admin"]).default("member"),
  teams: z
    .array(
      z.object({
        name: z.string(),
        role: z.enum(["maintainer", "member"]).default("member"),
      })
    )
    .default([]),
});


export const AddMemberToTeamsOptionsSchema = z
      .array(
        z.object({
          name: z.string(),
          role: z.enum(["maintainer", "member"]).default("member"),
        })
    )
    

export interface GithubOrganizationManagerInterface {
  isOrganizaionMember(ghUsername: string): Promise<boolean>;
  inviteToOrganization(ghUsername: string): Promise<void>;
  removeFromOrganization(ghUsername: string): Promise<void>;
  addMemberToTeams(
    ghUsername: string,
    options: z.infer<typeof AddMemberToTeamsOptionsSchema>
  ): Promise<void>;
}




export interface GHAuthManagerInterface {
    initiateDeviceFlow(): Promise<any>;
    
}
