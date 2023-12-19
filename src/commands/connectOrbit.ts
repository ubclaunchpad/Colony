import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  ModalBuilder,
  ModalActionRowComponentBuilder
} from "discord.js";

const data = new SlashCommandBuilder()
  .setName("connect-orbit")
  .setDescription("Connects your discord to orbit for notifications");

const modal = new ModalBuilder()
  .setCustomId('connectOrbitModal')
  .setTitle('Settings for connecting to Orbit');

// Add components to modal
const emailInput = new TextInputBuilder()
  .setCustomId('emailInput')
  .setLabel("What's email linked to Orbit")
  .setStyle(TextInputStyle.Short);

// An action row only holds one text input,
// so you need one action row per text input.
const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(emailInput);

// Add inputs to the modal
modal.addComponents(firstActionRow);

async function execute(interaction) {
  // Show the modal to the user
  await interaction.showModal(modal);
}

export { data, execute };
