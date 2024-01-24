// EVENTS API
import Router from 'koa-router';
const router = new Router();

// GET /events/{id}
router.get('/guilds/:gid/events/:id', async (ctx) => {
  ctx.body = 'Todo: get event by id';
});

// GET /events
router.get('/guilds/:gid/events', async (ctx) => {
  ctx.body = 'Todo: get all events';
});

// POST /events
router.post('/guilds/:gid/events', async (ctx) => {
  ctx.body = 'Todo: create event';
});

// PATCH /events/{id}
router.patch('/guilds/:gid/events/:id', async (ctx) => {
  ctx.body = 'Todo: update event';
});

// DELETE /events/{id}
router.delete('/guilds/:gid/events/:id/', async (ctx) => {
  ctx.body = 'Todo: delete event';
});

// GET /events/{id}/attendees
router.get('/guilds/:gid/events/:id/attendees', async (ctx) => {
  ctx.body = 'Todo: get attendees for event';
});

// POST /events/{id}/attendees
router.post('/guilds/:gid/events/:id/attendees', async (ctx) => {
  ctx.body = 'Todo: create attendee for event';
});

// DELETE /events/{id}/attendees
router.delete('/guilds/:gid/events/:id/attendees', async (ctx) => {
  ctx.body = 'Todo: delete attendee for event';
});

// POST /events/{id}/attendees/checkin
router.post('/guilds/:gid/events/:id/attendees/status', async (ctx) => {
  ctx.body = 'Todo: get attendee status for event';
});

// POST /events/{id}/archive
router.post('/guilds/:gid"/events/:id/archive', async (ctx) => {
  ctx.body = 'Todo: archive event';
});

export {router };




