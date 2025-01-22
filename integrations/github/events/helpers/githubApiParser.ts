import { z } from "zod";
import type { PREntrySchema } from "../types";

export const PRRawPayloadSchema = z.object({
  action: z.string(),
  number: z.number(),
  pull_request: z.object({
    title: z.string(),
    body: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    state: z.string(),
    merged: z.boolean(),
    merged_at: z.string().nullable(),
    mergeable: z.boolean().nullable(),
    commits: z.number(),
    additions: z.number(),
    deletions: z.number(),
    changed_files: z.number(),
    url: z.string(),
    user: z.object({
      login: z.string(),
    }),
    requested_reviewers: z.array(
      z.object({
        login: z.string(),
      })
    ),
    requested_teams: z.array(
      z.object({
        name: z.string(),
      })
    ),
    id: z.number(),
    assignees: z.array(
      z.object({
        login: z.string(),
        url: z.string(),
      })
    ),
    labels: z.array(
      z.object({
        name: z.string(),
      })
    ),
    comments_url: z.string(),
    draft: z.boolean(),

    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    base: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
  }),
  repository: z.object({
    name: z.string(),
    full_name: z.string(),
    html_url: z.string(),
    private: z.boolean(),
    git_url: z.string(),
  }),
  changes: z.any(),
});

export function parsePRPayloadForDB(
  payload: z.infer<typeof PRRawPayloadSchema>
): z.infer<typeof PREntrySchema> {
  return {
    id: payload.number,
    repository: payload.repository.full_name,
    pr_number: payload.number,
    state: payload.pull_request.state,
    title: payload.pull_request.title,
    additions: payload.pull_request.additions,
    deletions: payload.pull_request.deletions,
    is_merged: payload.pull_request.merged,
    author: payload.pull_request.user.login,
    created_at: payload.pull_request.created_at,
    updated_at: payload.pull_request.updated_at,
    properties: {
      head_ref: payload.pull_request.head.ref,
      head_sha: payload.pull_request.head.sha,
      base_ref: payload.pull_request.base.ref,
      base_sha: payload.pull_request.base.sha,
      mergeable: payload.pull_request.mergeable,
      commits: payload.pull_request.commits,
      changed_files: payload.pull_request.changed_files,
      requested_reviewers: payload.pull_request.requested_reviewers.map(
        (reviewer) => reviewer.login
      ),
      requested_teams: payload.pull_request.requested_teams.map(
        (team) => team.name
      ),
      assignees: payload.pull_request.assignees.map(
        (assignee) => assignee.login
      ),
      labels: payload.pull_request.labels.map((label) => label.name),
      comments_url: payload.pull_request.comments_url,
      draft: payload.pull_request.draft,
      url: payload.pull_request.url,
    },
  };
}
