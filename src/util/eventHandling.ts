import dotenv from "dotenv";
dotenv.config();
const guildScheduledEventStatus = ["OPEN", "CLOSED", "COMPLETED", "CANCELLED"];

const API_URL = process.env.API_URL;

export async function guildScheduledEventCreate(guildScheduledEvent) {
  // TODO: clean up
  const body = {
    eventId: guildScheduledEvent.id,
    serverId: guildScheduledEvent.guildId,
    eventStartTime: guildScheduledEvent.scheduledStartTimestamp,
    eventEndTime: guildScheduledEvent.scheduledEndTimestamp,
    name: guildScheduledEvent.name,
    categoryOrChannelId: guildScheduledEvent.channelId,
    eventInfo: {
      eventStartTime: guildScheduledEvent.scheduledStartTimestamp,
      eventEndTime: guildScheduledEvent.scheduledEndTimestamp,
      checkinStartDate: guildScheduledEvent.scheduledStartTimestamp,
      checkinEndDate: guildScheduledEvent.scheduledEndTimestamp,
      status: guildScheduledEventStatus[guildScheduledEvent.status - 1],
      description: guildScheduledEvent.description,
    },
  };

  // console.log(`${API_URL}/guilds/${guildScheduledEvent.guildId}/events/${guildScheduledEvent.id}`);

  try {
    await fetch(
      `${API_URL}/guilds/${guildScheduledEvent.guildId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  } catch (e) {
    console.error(e);
  }
}

export async function guildScheduledEventUpdate(
  newGuildScheduledEvent,
  server,
) {
  if (
    newGuildScheduledEvent.status === 1 ||
    newGuildScheduledEvent.status === 2
  ) {
    const body = {
      eventId: newGuildScheduledEvent.id,
      serverId: newGuildScheduledEvent.guildId,
      eventStartTime: newGuildScheduledEvent.scheduledStartTimestamp,
      eventEndTime: newGuildScheduledEvent.scheduledEndTimestamp,
      name: newGuildScheduledEvent.name,
      categoryOrChannelId: newGuildScheduledEvent.channelId,
      eventInfo: {
        eventStartTime: newGuildScheduledEvent.scheduledStartTimestamp,
        eventEndTime: newGuildScheduledEvent.scheduledEndTimestamp,
        checkinStartDate: newGuildScheduledEvent.scheduledStartTimestamp,
        checkinEndDate: newGuildScheduledEvent.scheduledEndTimestamp,
        status: guildScheduledEventStatus[newGuildScheduledEvent.status - 1],
        description: newGuildScheduledEvent.description,
      },
    };
    try {
      await fetch(
        `${API_URL}/guilds/${newGuildScheduledEvent.guildId}/events/${newGuildScheduledEvent.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
    } catch (e) {
      console.error(e);
    }
  } else if (
    newGuildScheduledEvent.status === 3 ||
    newGuildScheduledEvent.status === 4
  ) {
    try {
      await removeRoleFromMember(server);
      fetch(
        `${API_URL}/guilds/${newGuildScheduledEvent.guildId}/events/${newGuildScheduledEvent.id}`,
        { method: "DELETE" },
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function guildScheduledEventDelete(guildScheduledEvent, server) {
  try {
    await removeRoleFromMember(server);
    fetch(
      `${API_URL}/guilds/${guildScheduledEvent.guildId}/events/${guildScheduledEvent.id}`,
      { method: "DELETE" },
    );
  } catch (e) {
    console.error(e);
  }
}

async function removeRoleFromMember(server) {
  const role = server.roles["event attendee"];
  await server.guild.members.fetch();
  await server.guild.roles.cache.get(role.id).members.forEach((member) => {
    member.roles.remove(role);
  });
}
