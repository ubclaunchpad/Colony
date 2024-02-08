import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const GUILD_ID = process.env.GUILD_ID;

const data = new SlashCommandBuilder()
  .setName("event-check-in")
  .setDescription("Checking for a Launch Pad event")
  .addStringOption((option) =>
    option
      .setName("email")
      .setDescription("The email you used to RSVP to the event")
      .setRequired(true),
  );

async function execute(interaction) {
  const guild = await interaction.client.guilds.fetch(GUILD_ID);
  const events: any = Array.from(
    (await guild.scheduledEvents.fetch()).values(),
  );

  if (events.length === 0) {
    await interaction.reply({
      content: "There are no upcoming events",
    });
    return;
  }

  const date = new Date(events[0].scheduledStartTimestamp);
  const formattedDate = date.toLocaleString("en-US", {
    timeZone: "PST",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  const eventSelect = new StringSelectMenuBuilder()
    .setCustomId("event-check-in")
    .setPlaceholder("Select the event you are checking in to");

  const row = new ActionRowBuilder().addComponents(eventSelect);

  events.forEach((event) => {
    eventSelect.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(event.name)
        .setDescription(formattedDate)
        .setValue(
          JSON.stringify({
            eventId: event.id,
            email: interaction.options.getString("email"),
          }),
        ),
    );
  });

  await interaction.reply({
    content: "Select the event you are checking in to:",
    components: [row],
  });
}

export { data, execute };
