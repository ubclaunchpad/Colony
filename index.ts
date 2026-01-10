import { Hono } from "hono";
import { cors } from "hono/cors";
import githubRouter from "./routes/githubRouter";
import { discordRouter } from "./routes/discordRouter";
import "./integrations/discord/listener.js";
import { apiLogger, Logger } from "./util/logger.js";

const app = new Hono({ strict: false });

// Apply CORS globally to all routes
app.use(
  "*",
  cors({
    origin: ["https://ubclaunchpad.com", "http://localhost:3000", "http://localhost:8000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowHeaders: [
      "Origin",
      "Content-Type", 
      "Accept",
      "Authorization",
      "X-Requested-With",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposeHeaders: ["*"],
    credentials: true,
    maxAge: 86400,
  })
);

app.use(apiLogger);

app
  .route("/colony/github", githubRouter)
  .route("/colony/discord", discordRouter);

app.get("/", (c) => {
  return c.text("Colony Engine API active");
});

Logger.log("info", "API is running");

export default app;
