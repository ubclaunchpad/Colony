import {
  ChatInputCommandInteraction,
  CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { callAI } from "../../../../util/ai";

const data = new SlashCommandBuilder()
  .setName("chat")
  .setDescription("Replies with custom text")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("The message to send")
      .setRequired(true)
  );

async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const message = interaction.options.getString("message", true);

  setTimeout(() => {}, 3000);

  const rep = (await callAI(message)).choices[0].message.content;

  await interaction.editReply({
    content: rep,
    // files: ["assets/starbeam.gif"],
  });
}

export { data, execute };
