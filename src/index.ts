// Entry point: Runs all apis and servers
import { EventAPI } from "./api/index.js"; // Import the EventAPI from api/index.ts
import { DiscordBotServer } from "./app.js"; // Import the DiscordServer from app.ts

const servers: { startServer: () => void; id: string }[] = [
  EventAPI,
  DiscordBotServer,
];

async function main() {
  for (const server of servers) {
    try {
      server.startServer();
    } catch (error) {
      console.error(`fatal error for server ${server.id}:`, error);
    }
  }
}

main().catch(console.error);
