import { 
  SlashCommandBuilder
} from "discord.js";

import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';

import {
  connectToGitHub
} from "../../util/github.js"

// Define choices for the fixed option list
const optionChoices: APIApplicationCommandOptionChoice<string>[] = [
  { name: 'Pull Requests', value: 'PR' },
  // TODO: Uncomment this only when testing it or after testing it
  // { name: 'Issues', value: 'Issue' },
];

const data = new SlashCommandBuilder()
  .setName("gitconnect")
  .setDescription("Connect to the github repository via link")
  .addStringOption(option =>
    option.setName('link')
        .setDescription('The link to the GitHub repository')
        .setRequired(true))
  // Adding the fixed option list argument
  .addStringOption(option =>
    option.setName('event') // The name of the option
        .setDescription('Choose the type of event you want to subscribe') // Description of the option
        .setRequired(true) // Making this option required
        .addChoices(...optionChoices)
  );

async function execute(interaction) {
  // Get the user inputs from the interaction
  const repoLink = interaction.options.getString('link');
  const eventType = interaction.options.getString('event');

  // Validate the link
  if (!repoLink || !isValidGitHubLink(repoLink)) {
      await interaction.reply({ content: 'Please provide a valid GitHub repository link.', ephemeral: true });
      return;
  }

  const channelId = interaction.channelId;

  // Call the helper to set up the notifications with the github app
  const result = await connectToGitHub(repoLink, channelId, eventType);

  if (result === "1") {
    await interaction.reply({
      content:
        "You have already subscribed to this repository!",
    });
  } else if (result === "Error creating webhook") {
    await interaction.reply({
      content:
        "Error subscribing to the repository (error creating github webhook)!",
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