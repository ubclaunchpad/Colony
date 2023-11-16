import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
    .setName('user')
    .setDescription('Provides information about the user.');

async function execute(interaction) {
    await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
}

export  {
    data,
    execute
};