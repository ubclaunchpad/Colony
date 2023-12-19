import { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
  
const data = new SlashCommandBuilder()
    .setName("disconnect-orbit-project")
    .setDescription("Connects your discord to orbit for notifications");
    
async function execute(interaction) {
    const select = new StringSelectMenuBuilder()
        .setCustomId('RemoveProject')
        .setPlaceholder('Make a selection!');

    const row = new ActionRowBuilder().addComponents(select);

    const projects = await fetch(`http://localhost:3000/api/discord/channels?channelId=${interaction.channel.id}`).then(res => res.json()) as Array<any>;
    projects.forEach(project => {
        select.addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel(project.project_name)
            .setValue(JSON.stringify({rowId: project.id.toString(), title: project.project_name})),
        );
    });
    await interaction.reply({
        content: "Remove Project:",
        components: [row],
    });
}
    
export { data, execute };
    