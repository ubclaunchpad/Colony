import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
  } from "discord.js";
  import { githubManager } from "../../../github";
  import { extractOrgRepo, isValidGitHubLink } from "../../../../util/urlValidator";
  
  
  
  const data = new SlashCommandBuilder()
    .setName("gitdisconnect")
    .setDescription("Which github repository to unlink")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("The link to the GitHub repository")
        .setRequired(true)
    )

  
  async function execute(interaction: ChatInputCommandInteraction) {
    const repoLink = interaction.options.getString("link");
  
    if (!repoLink || !isValidGitHubLink(repoLink)) {
      await interaction.reply({
        content: "Please provide a valid GitHub repository link. and valid event",
        ephemeral: true,
      });
      return;
    }
  
    const channelId = interaction.channelId;
    const guildId = interaction.guildId;
  
    if (!guildId) {
      await interaction.reply({
        content: "Can only subscribe inside Discord servers",
        ephemeral: true,
      });
      return;
    }
  
    try {
      await githubManager.getEventManager().unsubscribeFromEvents({
        repository: extractOrgRepo(repoLink),
        dest: {
          guildId: guildId,
          channelID: channelId,
        },
      });
      await interaction.reply({
        content: `You have unsubscribed from the github repository!`,
      });
    } catch (e) {
      console.warn("Issue in unsubsrcibing to github events - Check Logs");
      await interaction.reply({
        content: "something went wrong - Message server admin if it persists",
      });
    }
  }
  
  
  export { data, execute };
  