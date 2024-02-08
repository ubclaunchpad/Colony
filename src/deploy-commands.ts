//@ts-nocheck

import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
const __dirname = new URL(".", import.meta.url).pathname;
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APP_ID;
const GUILD_ID = process.env.GUILD_ID;

const userArgs = process.argv.slice(2);
const commands = [];
let commandsSubdirectories = [];
const commandFilePaths = [];

if (userArgs.length === 0) {
  // If user does not specify which command subdirectories to get commands from, then grab all of the command files
  const commandsDirectoryPath = path.join(__dirname, "commands");
  commandsSubdirectories = fs.readdirSync(commandsDirectoryPath);
} else {
  commandsSubdirectories = userArgs;
}

// Get the paths of all command files
for (const commandsSubdirectory of commandsSubdirectories) {
  const commandsSubdirectoryPath = path.join(
    __dirname,
    `commands/${commandsSubdirectory}`,
  );
  fs.readdirSync(commandsSubdirectoryPath).map((file) =>
    commandFilePaths.push(`${commandsSubdirectoryPath}/${file}`),
  );
}

for (const commandFilePath of commandFilePaths) {
  const command = await import(commandFilePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[WARNING] The command at ${commandFilePath} is missing a required "data" or "execute" property.`,
    );
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(TOKEN);
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      // Routes.applicationCommand(CLIENT_ID),
      // Routes.applicationCommands(CLIENT_ID),
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    const data1 = await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });

    const data2 = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
