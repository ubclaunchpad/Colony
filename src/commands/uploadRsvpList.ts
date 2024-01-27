import { SlashCommandBuilder } from "discord.js";
import { parseCsv } from "../util/parseCsv.js";
import dotenv from "dotenv";
dotenv.config();

const GUILD_ID = process.env.GUILD_ID;
const API_URL = process.env.API_URL;

const data = new SlashCommandBuilder()
  .setName("upload-rsvp-list")
  .setDescription("Uploads a csv file of RSVPs")
  .addStringOption((option) =>
    option
      .setName("event")
      .setDescription("The discord event to upload the RSVPs to")
      .setRequired(true),
  )
  .addAttachmentOption((option) =>
    option
      .setRequired(true)
      .setName("csv")
      .setDescription("The csv file to upload"),
  );

async function execute(interaction) {
  const user = await interaction.client.users.fetch(interaction.user.id);
  if (!user.roles.cache.has("Event Moderator")) {
    await interaction.reply({
      content:
        "You do not have Event Moderator role to use this command, add it if you are able to before running this command again",
    });
    return;
  }

  const guild = await interaction.client.guilds.fetch(GUILD_ID);
  const events = await guild.scheduledEvents.fetch();
  const event: any = Array.from(
    events
      .filter((event) => event.name === interaction.options.getString("event"))
      .values(),
  )[0];
  const csv = interaction.options.getAttachment("csv");

  if (!event) {
    await interaction.reply({
      content: "Event not found",
    });
    return;
  }

  if (csv.contentType.split(";")[0] !== "text/csv") {
    await interaction.reply({
      content: "File must be a csv",
    });
    return;
  }

  const response = await fetch(csv.url);
  const text = await response.text();
  const parsedData = parseCsv(text);
  // console.log(parsedData);
  const body = { attendees: [] };
  parsedData.forEach((row) => {
    body.attendees.push({
      email: row.email || "",
      name: row.name || row.email,
      attendeeStatus: row.attendeeStatus || "GOING"
    });
  });

  console.log(`${API_URL}/guilds/${event.guildId}/events/${event.id}/attendees/`);
  try {
    const res = await fetch(
      `${API_URL}/guilds/${event.guildId}/events/${event.id}/attendees/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  } catch (e) {
    await interaction.reply({
      content: "Error adding RSVPs",
    });
    return;
  }

  await interaction.reply({
    content: "RSVPs added",
  });
}

export { data, execute };
