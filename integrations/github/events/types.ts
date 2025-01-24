import { z } from "zod";

export const SUPPORTED_EVENTS = [
  "pull_request",
//   "issues",
//   "issue_comment",
//   "push",
] as const;

export const SubscribeGHEventDiscordSchema = z.object({
  events: z.array(z.enum(SUPPORTED_EVENTS)),
  repository: z.string(),
  dest: z.object({
    guildId: z.string(),
    channelID: z.string(),
  }),
  options: z.object({}),
});

export const UnsubscribeGHEventDiscordSchema = z.object({
  repository: z.string(),
  dest: z.object({
    guildId: z.string(),
    channelID: z.string(),
  }),
});

export const PREntrySchema = z.object({
  id: z.number(),
  repository: z.string(),
  pr_number: z.number().nullable(),
  state: z.string(),
  title: z.string().nullable(),
  additions: z.number(),
  deletions: z.number(),
  is_merged: z.boolean(),
  author: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  properties: z.object({
    head_ref: z.string(),
    head_sha: z.string(),
    base_ref: z.string(),
    base_sha: z.string(),
    body: z.string().nullable(),
    mergeable: z.boolean().nullable(),
    commits: z.number(),
    changed_files: z.number(),
    requested_reviewers: z.array(z.string()),
    requested_teams: z.array(z.string()),
    assignees: z.array(z.string()),
    labels: z.array(z.string()),
    comments_url: z.string(),
    draft: z.boolean(),
    url: z.string(),
  }),
});

export type SubscribePayload = z.infer<typeof SubscribeGHEventDiscordSchema>;
export type UnsubscribePayload = z.infer<
  typeof UnsubscribeGHEventDiscordSchema
>;
export type PREvent = z.infer<typeof PREntrySchema>;

export interface GHEventManagerInterface {
  subscribeToEvents(payload: SubscribePayload): Promise<void>;
  unsubscribeFromEvents(payload: UnsubscribePayload): Promise<void>;
  processEvent(event: PREvent): Promise<void>;
}


export interface MessageMap {
  [guildId: string]: {
    [channelId: string]: {
      messageId: string;
    };
  };
}