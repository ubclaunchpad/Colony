import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";

const data = new SlashCommandBuilder()
  .setName("connect-orbit-project")
  .setDescription("Connects your discord to orbit for notifications");
      
async function execute(interaction) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('TeamSelect')
    .setPlaceholder('Make a selection!');
  
  const row = new ActionRowBuilder().addComponents(select);
  
  const teams = await fetch("http://localhost:3000/api/teams").then(res => res.json()) as Array<any>;
  teams.forEach(team => {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(team.name)
        .setDescription(team.description || " ")
        .setValue(team.id.toString()),
    );
  });
  await interaction.reply({
    content: "Select your team:",
    components: [row],
  });
}
    
export { data, execute };
  