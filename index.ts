import { Hono } from "hono";
import { cors } from "hono/cors";
import githubRouter from "./routes/githubRouter";
import { discordRouter } from "./routes/discordRouter";

const app = new Hono()
.route("/colony/github", githubRouter)
.route("/colony/discord", discordRouter);

const allowedOrigins = [];

if (process.env.NODE_ENV === "production") {
  if (!process.env.ALLOWED_PROD_ORIGIN) {
    throw new Error("ALLOWED_PROD_ORIGIN not set in production environment");
  }
  allowedOrigins.push(process.env.ALLOWED_PROD_ORIGIN);
} else {
  if (!process.env.ALLOWED_DEV_ORIGIN) {
    throw new Error("ALLOWED_DEV_ORIGIN not set in development environment");
  }
  allowedOrigins.push(process.env.ALLOWED_DEV_ORIGIN);
}

app.use(
  "/colony/*",
  cors({
    origin: allowedOrigins,
    allowHeaders: ["Origin", "Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

app.get("/", (c) => {
  return c.text("Colony Engine API active");
});


export default app;
