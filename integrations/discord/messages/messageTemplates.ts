import { userMention } from "discord.js";
import removeMarkdown from "markdown-to-text";
import { supabase } from "../../../util/database";
import type { PREvent } from "../../github/events/types";
import { discordManager } from "../discordGuildManager";
import { callAI } from "../../../util/ai";

async function formatMessage(event: PREvent) {
  const statusColor =
    event.state === "open" ? 0x2ea043 : event.is_merged ? 0x6f42c1 : 0xcf222e;

  const { data } = await supabase
    .schema("public")
    .from("members")
    .select()
    .in("github_username", event.properties.requested_reviewers);

  const members = await discordManager.guild.members.fetch();

  const map = data?.reduce((acc: Record<string, string>, d) => {
    const member = members.find((m) => m.user.username === d.discord_id);
    console.log(d);
    if (member) {
      acc[d.github_username] = member.id;
    }
    return acc;
  }, {});

  const formatReviewers = (
    reviewers: string[],
    userMap: Record<string, string>
  ) => {
    if (!reviewers.length) return "No reviewers";
    return reviewers
      .map((r) => (userMap?.[r] ? userMention(userMap[r]) : ""))
      .join(", ");
  };

  const getFullString = (obj: any): string => {
    return JSON.stringify(obj, (key, value) => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      return value;
    }, 2);
  };

  const prompt = `PR ${getFullString(event)}`
  const message = (await callAI(prompt, {
    additional: [
      {
        role: "system", 
        content: process.env.ROCKET_PR_SYSTEM?? "",
      }
    ]
  })).choices[0].message.content || "No summary available";


  return {
    content: message,
    embeds: [
      {
        title: `[${event.repository}] ${event.title}`,
        url: event.properties.url,
        description: `
          **Pull Request #${event.pr_number}\n${
          event.properties.draft ? "🚧 Draft" : ""
        } ${event.is_merged ? "🔄 Merged" : ""}**`,
        color: statusColor,
        fields: [
          {
            name: "Stats",
            value: `+${event.additions} -${event.deletions} (${event.properties.changed_files} files)`,
            inline: true,
          },
          {
            name: "Branch",
            value: `${event.properties.base_ref} ← ${event.properties.head_ref}`,
            inline: true,
          },
          {
            name: "Reviewers",
            value: formatReviewers(
              event.properties.requested_reviewers,
              map || {}
            ),
            inline: false,
          },
          {
            name: "Labels",
            value: `${event.properties.labels.join(", ")}`,
            inline: false,
          },
          {
            name: "Description",
            value: `${removeMarkdown(
              event.properties.body?.slice(0, 600) ?? ""
            )}`,
            inline: false,
          },
        ],
        author: {
          name: `${event.author} ${formatReviewers([event.author?? ""], map || {})}`,
          icon_url: `https://github.com/${event.author}.png`,
        },
        footer: {
          text: `Created at ${new Date(event.created_at).toLocaleString()}`,
        },
      },
    ],
  };
}


export const Messages = {
   PR: formatMessage

}