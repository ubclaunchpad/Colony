import { Hono } from "hono";
import { cors } from "hono/cors";
import githubRouter from "./routes/githubRouter";
import { discordRouter } from "./routes/discordRouter";
import "./integrations/discord/listener.js";

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
  allowedOrigins.push("http://localhost:8000");
  allowedOrigins.push("http://127.0.0.1:8000");
}

app.use(
  "*",
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

console.log("API is running");

export default app;
