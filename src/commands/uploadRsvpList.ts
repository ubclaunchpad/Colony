import { SlashCommandBuilder } from "discord.js";
import { parseCsv } from "../util/parseCsv.js";
import dotenv from "dotenv";
dotenv.config();

const GUILD_ID = process.env.GUILD_ID;

const data = new SlashCommandBuilder()
    .setName("upload-rsvp-list")
    .setDescription("Uploads a csv file of RSVPs")
    .addStringOption(option =>
		option.setName('event')
			.setDescription('The discord event to upload the RSVPs to')
			.setRequired(true))
    .addAttachmentOption((option)=> option
        .setRequired(true)
        .setName("csv")
        .setDescription("The csv file to upload"));

async function execute(interaction) {
    const guild = await interaction.client.guilds.fetch(GUILD_ID);
    const events = await guild.scheduledEvents.fetch();
    const event: any = Array.from(events.filter((event) => event.name === interaction.options.getString("event")).values())[0];
    const csv = interaction.options.getAttachment("csv");

    if (!event) {
        await interaction.reply({
            content: "Event not found",
        });
        return;
    }

    if(csv.contentType.split(";")[0] !== "text/csv") {
        await interaction.reply({
            content: "File must be a csv",
        });
        return;
    }

    const response = await fetch(csv.url);
    const text = await response.text();
    const parsedData = parseCsv(text);
    
    // try {
    //     fetch(`https:localhost:3000/guilds/${event.guildId}/events/${event.id}/attendees/`, {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify(parsedData),
    //     })
    // } catch(e) {
    //     await interaction.reply({
    //         content: "Error adding RSVPs",
    //     });
    //     return;
    // }

    await interaction.reply({
        content: "Test",
    });
}

export { data, execute };
