import Koa from "koa";
import Router from '@koa/router';
import bodyparser from 'koa-bodyparser'
import Eventrouter from './events.js';
import dotenv from 'dotenv';

dotenv.config();

const app = new Koa();
const router = new Router();
const PORT = process.env.EVENT_API_PORT || 3000;

console.log('event api port:', PORT);


router.get('/', async (ctx) => {
  ctx.body = 'Server is running';
});

app.use(bodyparser())
app.use(router.routes()).use(router.allowedMethods());
app.use(Eventrouter.routes()).use(Eventrouter.allowedMethods());

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}


export const EventAPI = {
  startServer: startServer,
  id: 'event-api'
}