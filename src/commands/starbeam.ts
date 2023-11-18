import { SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
  .setName("starbeam")
  .setDescription("Replies with Pong!");

async function execute(interaction) {
  await interaction.reply({
    content:
      "🌟 Starbeam Synced! Your signal just navigated the digital cosmos and interfaced seamlessly with our systems. This is Rocket, confirming a stellar connection with zero latency. 🌟",
    files: ["assets/starbeam.gif"],
  });
}

export { data, execute };
