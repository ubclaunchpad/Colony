import { Hono } from "hono";
import { cors } from "hono/cors";
import githubRouter from "./routes/githubRouter";
import { discordRouter } from "./routes/discordRouter";
import "./integrations/discord/listener.js";

const app = new Hono();

const allowedOrigins: string[] = [];

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
  allowedOrigins.push("http://localhost:8000");
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://127.0.0.1:8000");
}

app.use(
  "/colony/*",
  cors({
    origin: allowedOrigins,
    exposeHeaders: ["*"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app
  .route("/colony/github", githubRouter)
  .route("/colony/discord", discordRouter);

app.get("/", (c) => {
  return c.text("Colony Engine API active");
});

console.info("API is running");

export default app;
