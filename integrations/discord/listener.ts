import { Collection, Events } from "discord.js";
import fs from "fs";
import path from "path";
import { discordManager } from "./discordGuildManager.js";
import type { ClientWithCommands } from "./types.js";
import { callAI } from "../../util/ai.js";

const __dirname = new URL(".", import.meta.url).pathname;
const client = discordManager.client;

client.commands = new Collection();
const commandsDirectoryPath = path.join(__dirname, "commands");
const commandsSubdirectories = fs.readdirSync(commandsDirectoryPath);
const commandFilePaths: string[] = [];

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
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${commandFilePath} is missing a required "data" or "execute" property.`,
    );
  }
}

client.on(Events.InteractionCreate, async interaction => {
  console.log("s")
  if (!interaction.isChatInputCommand()) return;

  const command = (interaction.client as ClientWithCommands).commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  const isRoastRequest = message.content.toLowerCase().includes("roast") && 
                        message.content.toLowerCase().includes("rocket");
  
  if (isRoastRequest && message.reference) {
    const originalMessage = await message.fetchReference();
    const roastPrompt = `${process.env.ROCKET_ROAST}${originalMessage.content}`;
    
    const rep = (await callAI(roastPrompt)).choices[0].message.content;
    if (rep) 
      await message.reply(rep);
    return;
  }
  
  if (message.content.toLowerCase().includes("rocket")) {
    const messages = await message.channel.messages.fetch({ limit: 20 });
    const contextHistory = Array.from(messages.values())
      .reverse()
      .map(msg => `${msg.author.username}: ${msg.content}`)
      .join('\n');
      
    const rep = (await callAI(
      `Here's the recent conversation. It is likely they are talking about you when they say he or raccoon. be offended. \n${contextHistory}\n\nSomeone mentioned you in: ${message.content}`
    )).choices[0].message.content;
    
    if (rep) 
      await message.reply(rep);
  }
});


