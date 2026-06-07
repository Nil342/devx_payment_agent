import { loadLocalEnv } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";
import { startAutopilotAgent } from "./agents/autopilot-agent";

loadLocalEnv();

const rawPort = process.env["PORT"];

if (!rawPort && process.env.VERCEL !== "1") {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = rawPort ? Number(rawPort) : 0;

if (process.env.VERCEL !== "1" && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env.VERCEL !== "1") {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startAutopilotAgent();
  });
}

export default app;
