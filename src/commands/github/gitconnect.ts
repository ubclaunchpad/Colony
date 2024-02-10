import { 
  SlashCommandBuilder
} from "discord.js";

import {
  connectToGitHub
} from "../../util/github.js"

const data = new SlashCommandBuilder()
  .setName("gitconnect")
  .setDescription("Connect to the github repository via link")
  .addStringOption(option =>
    option.setName('repolink')
        .setDescription('The link to the GitHub repository')
        .setRequired(true));

async function execute(interaction) {
  // Get the repository link from the interaction
  const repoLink = interaction.options.getString('repolink');

  // Validate the link
  if (!repoLink || !isValidGitHubLink(repoLink)) {
      await interaction.reply({ content: 'Please provide a valid GitHub repository link.', ephemeral: true });
      return;
  }

  const channelId = interaction.channelId;

  // Call the helper to set up the notifications with the github app
  const result = await connectToGitHub(repoLink, channelId);

  if (result === -1) {
    await interaction.reply({
      content:
        "You have already subscribed to this repository!",
    });
  } else {
    await interaction.reply({
      content:
        "You have subscribed to the github repository!",
    });
  }
}

// Function to validate the GitHub repository link
function isValidGitHubLink(link: string): boolean {
  const githubUrl = 'https://github.com/';
  return (link.startsWith(githubUrl) && link.length > githubUrl.length);
}

export { data, execute };