import { ActionRowBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { initiateDeviceFlow, isRepoMember } from '../util/github.js';
import { createResponse, ALL_RESPONSES } from '../util/responses.js';
import { userGithubMap } from '../model/dbHandler.js';


const data = new SlashCommandBuilder()
    .setName('checkme')
    .setDescription('Check your cosmic credentials with Github');

async function execute(interaction) {
    // console.log(interaction);
    const { user } = interaction;
    let ret = await initiateDeviceFlow();
    userGithubMap[user.id] = ret;
    const GITHUB_VERIFY_URL = "https://github.com/login/device";

    const confirm = new ButtonBuilder()
			.setCustomId(`verify_button_${interaction.id}`)
			.setLabel('I followed the instructions')
			.setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(confirm)

    await interaction.reply({
        content: createResponse(ALL_RESPONSES.checkMe, [GITHUB_VERIFY_URL, ret.user_code, ]),
        components: [row]
    })
}

export  {
    data,
    execute
};