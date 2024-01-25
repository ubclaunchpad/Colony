import Koa from "koa";
import Router from '@koa/router';
import bodyparser from 'koa-bodyparser'
import Eventrouter from './events.js';

const app = new Koa();
const router = new Router();
const PORT = process.env.PORT || 8080;


router.get('/', async (ctx) => {
  ctx.body = 'Server is running';
});

app.use(bodyparser())
app.use(router.routes()).use(router.allowedMethods());
app.use(Eventrouter.routes()).use(Eventrouter.allowedMethods());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
