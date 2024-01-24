import Koa from "koa";
import Router from 'koa-router';
import {router as eventRouter} from './events.js';

const app = new Koa();
const router = new Router();
const PORT = process.env.PORT || 8080;


router.get('/', async (ctx) => {
  ctx.body = 'Server is running';
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(eventRouter.routes());
app.use(eventRouter.allowedMethods());


app.listen(PORT, () => {
  console.log('Server is running');
});
