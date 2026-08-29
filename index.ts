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
      "X-Colony-Secret",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposeHeaders: ["*"],
    credentials: true,
    maxAge: 86400,
  })
);

app.use(apiLogger);

// Shared-secret auth: all /colony/* routes require the secret header
// (set by the website's server-side proxy routes). OPTIONS requests are
// allowed through so CORS preflights from the browser still succeed.
app.use("/colony/*", async (c, next) => {
  const sharedSecret = process.env.COLONY_SHARED_SECRET;

  if (c.req.method === "OPTIONS") {
    return await next();
  }

  if (!sharedSecret) {
    Logger.log(
      "error",
      "COLONY_SHARED_SECRET is not set - rejecting all /colony/* requests"
    );
    return c.json({ message: "Service unavailable" }, 503);
  }

  const provided = c.req.header("X-Colony-Secret");
  if (provided !== sharedSecret) {
    Logger.log("warn", "Unauthorized request - missing or invalid secret", {
      path: c.req.path,
    });
    return c.json({ message: "Unauthorized" }, 401);
  }
  return await next();
});

app
  .route("/colony/github", githubRouter)
  .route("/colony/discord", discordRouter);

app.get("/", (c) => {
  return c.text("Colony Engine API active");
});

Logger.log("info", "API is running");

export default app;
