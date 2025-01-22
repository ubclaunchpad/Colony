import type { Octokit } from "octokit";
import type {
  GHEventManagerInterface,
  PREvent,
  SubscribePayload,
  UnsubscribePayload,
} from "./types";
import { supabase } from "../../../util/database";

export class GithubEventManager implements GHEventManagerInterface {
  octoClient: Octokit;

  constructor(octoClient: Octokit) {
    this.octoClient = octoClient;
  }

  async subscribeToEvents(payload: SubscribePayload): Promise<void> {
    try {
      const { dest, events, repository} = payload;
      const { error } = await supabase.schema("lp_integrations").from("listeners").insert({
        channel_id: dest.channelID,
        guild_id: dest.guildId,
        repository: repository,
        is_active: true,
        events: events,
        config: {}, // TODO: Support config
      });

      if (error) {
        console.warn("Integration error subscribing to events - Check the logs for more information");
        console.error(error);
      }
    }
    catch (e) {
      console.error(e);
    }
  }

  async unsubscribeFromEvents(payload: UnsubscribePayload): Promise<void> {
    try {
      const { dest, events } = payload;
      const { error } = await supabase
        .schema("lp_integrations")
        .from("listeners")
        .delete()
        .match({ channel_id: dest.channelID });
      
        // TODO: Support partial unsubscription - match on events as well
      if (error) {
        console.warn("Integration error unsubscribing from events - Check the logs for more information");
        console.error(error);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async processEvent(event: PREvent): Promise<void> {
    try {
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
