import chalk from "chalk";
import { createMiddleware } from "hono/factory";

const colors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.blue,
  debug: chalk.gray,
};

type LogData = Object

const log = (
  level: "error" | "warn" | "info" | "debug",
  message: string,
  data: LogData = {}
) => {
  console[level](
    colors[level](
      `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`
    )
  );

  if (Object.keys(data).length) {
    console[level](colors[level](JSON.stringify(data, null, 2)));
  }

  if (level === "error" && Error.captureStackTrace) {
    const err = new Error();
    Error.captureStackTrace(err);
    console.error(colors.error(err.stack));
  }
};

export const Logger = {
  log: log,
};


export const apiLogger = createMiddleware(async (c, next) => {
 log("info", `[${c.req.method}] ${c.req.url} from ${c.req.header("origin") || "direct"}`);
 await next();
});
