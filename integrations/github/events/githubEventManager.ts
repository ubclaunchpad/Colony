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
      .subscribe();
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
          config: {}, // TODO: Support config
        });

      if (error) {
        console.warn(
          "Integration error subscribing to events - Check the logs for more information"
        );
        console.error(error);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async unsubscribeFromEvents(payload: UnsubscribePayload): Promise<void> {
    try {
      const { dest } = payload;
      const { error } = await supabase
        .schema("lp_integrations")
        .from("listeners")
        .delete()
        .match({ channel_id: dest.channelID, guild_id: dest.guildId});
      // TODO: Support partial unsubscription - match on events as well
      if (error) {
        console.warn(
          "Integration error unsubscribing from events - Check the logs for more information"
        );
        console.error(error);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async broadcastToListeners(payload: { [key: string]: any }) {
    if (
      payload.schema !== "lp_integrations" ||
      payload.table !== "pull_requests"
    ) {
      console.warn(
        `Unsupported broadcast event: schema ${payload.schema}, table: ${payload.table}`
      );
      return;
    }

    const data = payload.new;
    const parsed = PREntrySchema.safeParse(data);
    if (!parsed.success) {
      console.warn("Data mismatch between table entry change and expected");
      return;
    }

    const event = parsed.data;
    const { data: listeners, error } = await supabase
      .schema("lp_integrations")
      .from("listeners")
      .select()
      .eq("repository", event.repository);

    if (error) {
      console.warn("Server Error - Could not fetch from Supabase");
      console.error(error);
    }

    if (!listeners || listeners.length == 0) {
      console.log("no listeners will skip");
      return;
    }

    const embed = await Messages.PR(event);

    const { data: oldMessages } = await supabase
      .schema("lp_integrations")
      .from("messages")
      .select()
      .eq("pr_number", event.id)
      .eq("repository", event.repository);
    const messageMap: MessageMap = (oldMessages ?? []).reduce(
      (acc: MessageMap, msg) => {
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

        if (existingMessage) {
          // Update existing message
          const message = await channel.messages.fetch(
            existingMessage.messageId
          );
          await message.edit(embed);
        } else {
          // Send new message
          const newMessage = await channel.send(embed);
          await supabase.schema("lp_integrations").from("messages").insert({
            guild_id: listener.guild_id,
            channel_id: listener.channel_id,
            message_id: newMessage.id,
            pr_number: event.id,
            repository: event.repository,
          });
        }
      } catch (error) {
        console.error(
          `Error processing listener ${listener.channel_id}:`,
          error
        );
      }
    }
  }

  async processEvent(event: PREvent): Promise<void> {
    try {
      const { data, error: memberError } = await supabase
        .schema("public")
        .from("members")
        .select("github_username");

      if (memberError) {
        console.warn("Integration error - Check the logs for more information");
        console.error(memberError);
        return;
      }

      const usernames = data?.map((d) => d.github_username);

      if (!usernames?.includes(event.author)) {
        event.author = null;
      }

      const { error } = await supabase
        .schema("lp_integrations")
        .from("pull_requests")
        .upsert(event);
      if (error) {
        console.warn("Integration error - Check the logs for more information");
        console.error(error);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
