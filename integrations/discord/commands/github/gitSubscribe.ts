import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type APIApplicationCommandOptionChoice,
} from "discord.js";
import { githubManager } from "../../../github";
import { SubscribeGHEventDiscordSchema } from "../../../github/events/types";
import { extractOrgRepo, isValidGitHubLink } from "../../../../util/urlValidator";

const optionChoices: APIApplicationCommandOptionChoice<string>[] = [
  { name: "Pull Requests", value: "pull_request" },
];

const data = new SlashCommandBuilder()
  .setName("gitconnect")
  .setDescription("Connect to the github repository via link")
  .addStringOption((option) =>
    option
      .setName("link")
      .setDescription("The link to the GitHub repository")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("event") // The name of the option
      .setDescription("Choose the type of event you want to subscribe") // Description of the option
      .setRequired(true) // Making this option required
      .addChoices(...optionChoices)
  );

async function execute(interaction: ChatInputCommandInteraction) {
  const repoLink = interaction.options.getString("link");
  const eventType = interaction.options.getString("event");

  if (!repoLink || !isValidGitHubLink(repoLink) || !eventType) {
    await interaction.reply({
      content: "Please provide a valid GitHub repository link. and valid event",
      ephemeral: true,
    });
    return;
  }

  const parsedEvents = SubscribeGHEventDiscordSchema.pick({events: true}).safeParse({events: [eventType]});
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: "Can only subscribe inside Discord servers",
      ephemeral: true,
    });
    return;
  }

  if (!parsedEvents.data?.events) {
    await interaction.reply({
      content: "Please provide a valid event",
      ephemeral: true,
    });
    return;
  }

  try {
    await githubManager.getEventManager().subscribeToEvents({
      repository: extractOrgRepo(repoLink),
      dest: {
        guildId: guildId,
        channelID: channelId,
      },
      events: parsedEvents.data.events,
      options: {},
    });
    await interaction.reply({
      content: `You have subscribed to the github repository!`,
    });
  } catch (e) {
    console.warn("Issue in subsrcibing to github events - Check Logs");
    await interaction.reply({
      content: "something went wrong - Message server admin if it persists",
    });
  }
}


export { data, execute };
