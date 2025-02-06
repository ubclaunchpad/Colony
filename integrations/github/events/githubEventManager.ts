import type { Octokit } from "octokit";
import {
  PREntrySchema,
  type GHEventManagerInterface,
  type MessageMap,
  type PREvent,
  type SubscribePayload,
  type UnsubscribePayload,
} from "./types";
import { supabase } from "../../../util/database";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Messages } from "../../discord/messages/messageTemplates";
import { discordManager } from "../../discord/discordGuildManager";
import { Logger } from "../../../util/logger";

export class GithubEventManager implements GHEventManagerInterface {
  octoClient: Octokit;
  liveChannel: RealtimeChannel;

  constructor(octoClient: Octokit) {
    this.octoClient = octoClient;

    this.liveChannel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "lp_integrations",
          table: "pull_requests",
        },
        async (payload) => this.broadcastToListeners(payload)
      )
      .subscribe((status, err) => {
        Logger.log(
          "info",
          `SUPABASE channel subscription status for schema changes in pull_requests: ${status}`
        );
        if (err) {
          Logger.log(
            "warn",
            `Issue with subscribing to Github Events inside the database - channel subscription status: ${status}`,
            err
          );
        }
      });
  }

  async subscribeToEvents(payload: SubscribePayload): Promise<void> {
    try {
      const { dest, events, repository } = payload;
      const { error } = await supabase
        .schema("lp_integrations")
        .from("listeners")
        .upsert({
          channel_id: dest.channelID,
          guild_id: dest.guildId,
          repository: repository,
          is_active: true,
          events: events,
          config: {},
        });

      if (error) {
        Logger.log("warn", "Integration error subscribing to events", {
          error,
        });
      }
    } catch (e) {
      Logger.log("error", "Failed to subscribe to events", { error: e });
    }
  }

  async unsubscribeFromEvents(payload: UnsubscribePayload): Promise<void> {
    try {
      const { dest } = payload;
      const { error } = await supabase
        .schema("lp_integrations")
        .from("listeners")
        .delete()
        .match({ channel_id: dest.channelID, guild_id: dest.guildId });

      if (error) {
        Logger.log("warn", "Integration error unsubscribing from events", {
          error,
        });
      }
    } catch (e) {
      Logger.log("error", "Failed to unsubscribe from events", { error: e });
    }
  }

  async broadcastToListeners(payload: { [key: string]: any }) {
    if (
      payload.schema !== "lp_integrations" ||
      payload.table !== "pull_requests"
    ) {
      Logger.log("warn", "Unsupported broadcast event", {
        schema: payload.schema,
        table: payload.table,
      });
      return;
    }

    const data = payload.new;
    const parsed = PREntrySchema.safeParse(data);
    if (!parsed.success) {
      Logger.log(
        "warn",
        "Data mismatch between table entry change and expected",
        {
          errors: parsed.error,
        }
      );
      return;
    }

    const event = parsed.data;
    const { data: listeners, error } = await supabase
      .schema("lp_integrations")
      .from("listeners")
      .select()
      .eq("repository", event.repository);

    if (error) {
      Logger.log("warn", "Server Error - Could not fetch from Supabase", {
        error,
      });
    }

    if (!listeners || listeners.length == 0) {
      Logger.log("debug", "No listeners found, skipping broadcast");
      return;
    }

    // Before embed creation:
    Logger.log("debug", `Creating message template for PR #${event.id}`, {
      repository: event.repository,
      author: event.author,
      state: event.state,
    });

    const embed = await Messages.PR(event);

    if (embed == null) {
       Logger.log("warn", `Could not create embed for event:`, event);
       return;
    }

    // After embed creation:
    Logger.log("info", `Template created for PR #${event.id}`, {
      hasContent: !!embed.content,
      embedCount: embed.embeds.length,
    });

    const { data: oldMessages } = await supabase
      .schema("lp_integrations")
      .from("messages")
      .select()
      .eq("pr_number", event.id)
      .eq("repository", event.repository);

    const messageMap: MessageMap = (oldMessages ?? []).reduce(
      (acc: MessageMap, msg: any) => {
        if (!acc[msg.guild_id]) acc[msg.guild_id] = {};
        acc[msg.guild_id][msg.channel_id] = { messageId: msg.message_id };
        return acc;
      },
      {}
    );

    for (const listener of listeners || []) {
      try {
        const channel = await discordManager.guild.channels.fetch(
          listener.channel_id
        );
        if (!channel?.isTextBased()) continue;

        const existingMessage =
          messageMap?.[listener.guild_id]?.[listener.channel_id];

        // Inside each listener loop before sending:
        Logger.log("debug", `Sending PR update to channel`, {
          channelId: listener.channel_id,
          guildId: listener.guild_id,
          isUpdate: !!existingMessage,
        });

        if (existingMessage) {
          const message = await channel.messages.fetch(
            existingMessage.messageId
          );
          await message.edit(embed);
        } else {
          try {
          const newMessage = await channel.send(embed);
          await supabase.schema("lp_integrations").from("messages").insert({
            guild_id: listener.guild_id,
            channel_id: listener.channel_id,
            message_id: newMessage.id,
            pr_number: event.id,
            repository: event.repository,
          });
        } catch(e) {
          console.log("Could not send message will skip")
        }
        }
      } catch (error) {
        Logger.log(
          "error",
          `Error processing listener ${listener.channel_id}`,
          { error }
        );
      }
    }
  }

  async processEvent(event: PREvent): Promise<void> {
    try {
      if (event.properties.draft == true) {
        Logger.log("info", "encounter draft PR, not saving it");
        return;
      }

      const { data, error: memberError } = await supabase
        .schema("public")
        .from("members")
        .select("github_username");

      if (memberError) {
        Logger.log("warn", "Integration error fetching members", {
          error: memberError,
        });
        return;
      }

      const usernames = data?.map(
        (d: { github_username: string }) => d.github_username
      );

      if (event.author && !usernames?.includes(event.author)) {
        event.author = null;
      }

      const { error } = await supabase
        .schema("lp_integrations")
        .from("pull_requests")
        .upsert(event);

      if (error) {
        Logger.log("warn", "Integration error upserting PR", { error });
      }
    } catch (e) {
      Logger.log("error", "Failed to process event", { error: e });
    }
  }
}
