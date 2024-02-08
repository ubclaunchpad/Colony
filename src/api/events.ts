// EVENTS API
import Router from "@koa/router";
import { dbHandler } from "../model/dbHandler.js";
import {
  AttendeeInfo,
  AttendeeQuery,
  IAttendee,
  IEvent,
} from "../util/eventTypes.js";
import { marshall } from "@aws-sdk/util-dynamodb";

const router = new Router();

const TABLE_NAME = "event-tracker";
// const DEFAULT_EVENT_STATUS = "OPEN";
const DEFAULT_ATTENDEE_STATUS = "GOING";

class DB_KEY {
  static GUILD = (guildId) => `GUILD#${guildId}`;
  static EVENT = (eventId) => `EVENT#${eventId}`;
  static ATTENDEE = (email) => `ATTENDEE#${email}`;
}

// GET /events/{id}
router.get("/guilds/:gid/events/:id", async (ctx) => {
  const guildId = ctx.params.gid;
  const eventId = ctx.params.id;

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  try {
    const result = await dbHandler.fetchRecord(TABLE_NAME, PK, SK);
    ctx.body = result;
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

// GET /events
router.get("/guilds/:gid/events", async (ctx) => {
  const guildId = ctx.params.gid;

  const PK = DB_KEY.GUILD(guildId);

  try {
    const result = await dbHandler.fetchRecordsByPK(TABLE_NAME, PK);
    ctx.body = result;
  } catch (error) {
    console.error("Error getting records:", error);
    throw error;
  }
});

// POST /events
router.post("/guilds/:gid/events", async (ctx) => {
  const event = ctx.request.body as IEvent;
  const guildId = ctx.params.gid;
  const eventId = event.eventId;

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  const item = eventRecordParser(PK, SK, event);

  try {
    const result = await dbHandler.addRecord(TABLE_NAME, PK, SK, item);
    ctx.body = result;
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

// PATCH /events/{id}
router.patch("/guilds/:gid/events/:id", async (ctx) => {
  const guildId = ctx.params.gid;
  const eventId = ctx.params.id;
  const event = ctx.request.body as IEvent;

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  const item = eventRecordParser(PK, SK, event);

  try {
    const result = await dbHandler.addRecord(TABLE_NAME, PK, SK, item);
    ctx.body = result;
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

// DELETE /events/{id}
router.delete("/guilds/:gid/events/:id/", async (ctx) => {
  const guildId = ctx.params.gid;
  const eventId = ctx.params.id;

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  try {
    const result = await dbHandler.deleteRecord(TABLE_NAME, PK, SK);
    ctx.body = "Deleted";
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
});

// GET /events/{id}/attendees
router.get("/guilds/:gid/events/:id/attendees", async (ctx) => {
  const eventId = ctx.params.id;
  const PK = DB_KEY.EVENT(eventId);

  try {
    const result = await dbHandler.fetchRecordsByPK(TABLE_NAME, PK);
    ctx.body = result;
  } catch (error) {
    console.error("Error getting records:", error);
    throw error;
  }
});

// POST /events/{id}/attendees
router.post("/guilds/:gid/events/:id/attendees", async (ctx) => {
  const eventId = ctx.params.id;
  const guildId = ctx.params.gid;
  const attendees = ctx.request.body as { attendees: AttendeeInfo[] };

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  const event = (await dbHandler.fetchRecord(TABLE_NAME, PK, SK)) as IEvent;
  const items = attendeeRecordsParser(attendees.attendees, event);

  try {
    const result = await dbHandler.bulkAddRecords(TABLE_NAME, items);
    ctx.body = result;
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

// POST /events/{id}/attendees/query
router.post("/guilds/:gid/events/:id/attendees/query", async (ctx) => {
  const eventId = ctx.params.id;
  const attendees = ctx.request.body as { attendees: { email: string }[] };

  const PK = DB_KEY.EVENT(eventId);
  let results: IAttendee[] = [];

  try {
    for (const attendee of attendees.attendees) {
      const SK = DB_KEY.ATTENDEE(attendee.email);
      const result = (await dbHandler.fetchRecord(
        TABLE_NAME,
        PK,
        SK,
      )) as IAttendee;
      results.push(result);
    }
    ctx.body = results;
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

// DELETE /events/{id}/attendees
router.post("/guilds/:gid/events/:id/attendees/delete", async (ctx) => {
  const eventId = ctx.params.id;
  const attendees = ctx.request.body as AttendeeQuery;

  const PK = DB_KEY.EVENT(eventId);

  try {
    attendees.attendees.forEach(async (attendee) => {
      const SK = DB_KEY.ATTENDEE(attendee.email);
      await dbHandler.deleteRecord(TABLE_NAME, PK, SK);
    });
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
});

// PATCH /events/{id}/attendees/
router.patch("/guilds/:gid/events/:id/attendees", async (ctx) => {
  const eventId = ctx.params.id;
  const guildId = ctx.params.gid;
  const attendees = ctx.request.body as {
    attendees: Partial<IAttendee & { email: string }>[];
  };

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  const event = (await dbHandler.fetchRecord(TABLE_NAME, PK, SK)) as IEvent;
  const items = attendeeRecordsParser(attendees.attendees, event);

  try {
    const result = await dbHandler.bulkUpdateRecords(TABLE_NAME, items);
    ctx.body = result;
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

// POST /events/{id}/archive
router.post('/guilds/:gid"/events/:id/archive', async (ctx) => {
  const guildId = ctx.params.gid;
  const eventId = ctx.params.id;

  const PK = DB_KEY.GUILD(guildId);
  const SK = DB_KEY.EVENT(eventId);

  const item = marshall({
    PK: PK,
    SK: SK,
    status: "COMPLETED",
  });

  try {
    await dbHandler.updateRecord(TABLE_NAME, PK, SK, item);
  } catch (error) {
    console.error("Error setting record:", error);
    throw error;
  }
});

const eventRecordParser = (PK, SK, event) => {
  const item = marshall({
    PK: PK,
    SK: SK,
    ...event,
  });

  return item;
};

function attendeeRecordsParser(
  attendeeInfo: AttendeeInfo[] | any[],
  event: IEvent,
) {
  return attendeeInfo.map((attendee) =>
    marshall({
      PK: DB_KEY.EVENT(event.eventId),
      SK: DB_KEY.ATTENDEE(attendee.email),
      attendeeStatus: DEFAULT_ATTENDEE_STATUS,
      ...attendee,
      eventId: event.eventId,
      serverId: event.serverId,
    }),
  );
}

export default router;
