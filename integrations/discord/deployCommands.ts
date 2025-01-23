import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";

const __dirname = new URL(".", import.meta.url).pathname;

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.APP_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [];
let commandsSubdirectories = [];
const commandFilePaths: string[] = [];

const commandsDirectoryPath = path.join(__dirname, "commands");
commandsSubdirectories = fs.readdirSync(commandsDirectoryPath);

if (!TOKEN || !GUILD_ID || !CLIENT_ID) {
  console.warn(
    "Invalid Discord Environment variables - When deploying commands"
  );
  process.exit(1);
}

for (const commandsSubdirectory of commandsSubdirectories) {
  const commandsSubdirectoryPath = path.join(
    __dirname,
    `commands/${commandsSubdirectory}`
  );
  fs.readdirSync(commandsSubdirectoryPath).map((file) =>
    commandFilePaths.push(`${commandsSubdirectoryPath}/${file}`)
  );
}

for (const commandFilePath of commandFilePaths) {
  const command = await import(commandFilePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[WARNING] The command at ${commandFilePath} is missing a required "data" or "execute" property.`
    );
  }
}

const rest = new REST().setToken(TOKEN);
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    const data = (await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    )) as unknown as any[];

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
  }
})();
