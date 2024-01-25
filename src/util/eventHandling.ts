export async function guildScheduledEventCreate(guildScheduledEvent) {
  console.log("guildScheduledEventCreate");
  console.log(guildScheduledEvent);
  const body = {
    eventId: guildScheduledEvent.id,
    serverId: guildScheduledEvent.guildId,
    eventStartTime: guildScheduledEvent.scheduledStartTimestamp,
    eventEndTime: guildScheduledEvent.scheduledEndTimestamp,
    name: guildScheduledEvent.name,
    categoryOrChannelId: guildScheduledEvent.channelId,
  };
  try {
    // await fetch(
    //   `https:localhost:3000/guilds/${guildScheduledEvent.guildId}/events/${guildScheduledEvent.id}`,
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify(body),
    //   },
    // );
  } catch (e) {
    console.error(e);
  }
}

export async function guildScheduledEventUpdate(
  newGuildScheduledEvent,
  server,
) {
  console.log("guildScheduledEventUpdate");
  console.log(newGuildScheduledEvent);
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
    };
    try {
      // await fetch(
      //   `https:localhost:3000/guilds/${newGuildScheduledEvent.guildId}/events/${newGuildScheduledEvent.id}`,
      //   {
      //     method: "PATCH",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify(body),
      //   },
      // );
    } catch (e) {
      console.error(e);
    }
  } else if (
    newGuildScheduledEvent.status === 3 ||
    newGuildScheduledEvent.status === 4
  ) {
    try {
      // await removeRoleFromMember(server);
      // fetch(
      //   `https:localhost:3000/guilds/${newGuildScheduledEvent.guildId}/events/${newGuildScheduledEvent.id}`,
      //   { method: "DELETE" },
      // );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function guildScheduledEventDelete(guildScheduledEvent, server) {
  console.log("guildScheduledEventDelete");
  console.log(guildScheduledEvent);
  try {
    // await removeRoleFromMember(server);
    // fetch(
    //   `https:localhost:3000/guilds/${guildScheduledEvent.guildId}/events/${guildScheduledEvent.id}`,
    //   { method: "DELETE" },
    // );
  } catch (e) {
    console.error(e);
  }
}

async function removeRoleFromMember(server) {
  const role = server.roles["attendee"];
  await server.guild.members.fetch();
  await server.guild.roles.cache.get(role.id).members.forEach((member) => {
    member.roles.remove(role);
  });
}
