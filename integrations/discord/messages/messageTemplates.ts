import { userMention } from "discord.js";
import removeMarkdown from "markdown-to-text";
import { supabase } from "../../../util/database";
import type { PREvent } from "../../github/events/types";
import { discordManager } from "../discordGuildManager";
// import { callAI } from "../../../util/ai";
import { Logger } from "../../../util/logger";

function formatReviewers(reviewers: string[], userMap: Record<string, string>) {
  if (!reviewers.length) return "No reviewers";
  return reviewers
    .map((r) => (userMap?.[r] ? userMention(userMap[r]) : ""))
    .join(", ");
}

function getFullString(obj: any): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      return value;
    },
    2
  );
}

async function formatMessage(event: PREvent) {
  try {
    Logger.log("debug", "Starting PR message formatting", {
      pr: event.pr_number,
      repo: event.repository,
    });

    if (!event.properties?.url || !event.title) {
      Logger.log("warn", "Missing required PR properties", {
        url: !!event.properties?.url,
        title: !!event.title,
      });
      return null;
    }

    const statusColor =
      event.state === "open" ? 0x2ea043 : event.is_merged ? 0x6f42c1 : 0xcf222e;

    const { data, error } = await supabase
      .schema("public")
      .from("members")
      .select()
      .in("github_username", event.properties.requested_reviewers || []);

    if (error) {
      Logger.log("warn", "Failed to fetch reviewers from DB", { error });
    }

    // Map Discord members
    let members;
    try {
      members = await discordManager.guild.members.fetch();
    } catch (e) {
      Logger.log("error", "Failed to fetch Discord members", { error: e });
      members = new Map();
    }
    const memberMap = new Map(
      Array.from(members.values()).map((m) => [m.user.username, m])
    );

    const map = data?.reduce((acc: Record<string, string>, d) => {
      const member = memberMap.get(d.discord_id);
      if (member) acc[d.github_username] = member.id;
      return acc;
    }, {});

    // Logger.log("debug", "Calling AI for PR summary");
    // let aiMessage = "No summary available";
    // try {
    //   const prompt = `PR ${getFullString(event)}`;
    //   const aiResponse = await callAI(prompt, {
    //     additional: [
    //       {
    //         role: "system",
    //         content: process.env.ROCKET_PR_SYSTEM || "",
    //       },
    //     ],
    //   });
    //   aiMessage = aiResponse.choices[0].message.content || aiMessage;
    // } catch (e) {
    //   Logger.log("warn", "AI summary generation failed", { error: e });
    // }

    // Create embed with fallbacks for optional fields
    return {
      content: "",
      embeds: [
        {
          title: `[${event.repository}] ${event.title}`,
          url: event.properties.url,
          description: `**Pull Request #${event.pr_number}\n${
            event.properties.draft ? "🚧 Draft" : ""
          } ${event.is_merged ? "🔄 Merged" : ""}**`,
          color: statusColor,
          fields: [
            {
              name: "Stats",
              value: `+${event.additions || 0} -${event.deletions || 0} (${
                event.properties.changed_files || 0
              } files)`,
              inline: true,
            },
            {
              name: "Branch",
              value: `${event.properties.base_ref || "unknown"} ← ${
                event.properties.head_ref || "unknown"
              }`,
              inline: true,
            },
            {
              name: "Reviewers",
              value: formatReviewers(
                event.properties.requested_reviewers || [],
                map || {}
              ),
              inline: false,
            },
            {
              name: "Labels",
              value: event.properties.labels?.join(", ") || "No labels",
              inline: false,
            },
            {
              name: "Description",
              value: removeMarkdown(
                event.properties.body?.slice(0, 600) || "No description"
              ),
              inline: false,
            },
          ],
          author: {
            name: `${event.author || "Unknown"} ${formatReviewers(
              [event.author || ""],
              map || {}
            )}`,
            icon_url: event.author
              ? `https://github.com/${event.author}.png`
              : undefined,
          },
          footer: {
            text: `Created at ${new Date(event.created_at).toLocaleString()}`,
          },
        },
      ],
    };
  } catch (e) {
    Logger.log("error", "Failed to format PR message", { error: e });
    return null;
  }
}

export const Messages = {
  PR: formatMessage,
};
