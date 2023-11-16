// Require the necessary discord.js classes
import { Client, Collection, Events, GatewayIntentBits, Guild } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ALL_RESPONSES, createResponse } from './util/responses.js';
import { userGithubMap } from './model/record.js';
import { isRepoMember } from './util/github.js';
dotenv.config();
const __dirname = new URL('.', import.meta.url).pathname;
const TOKEN = process.env.DISCORD_TOKEN;
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMembers] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = await import(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}


// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	console.log('Interaction received');
	// console.log(interaction);

	if (interaction.isButton()) {
		if (interaction.customId.startsWith('verify_button_')) {
			// console.log(userGithubMap)
			const githubResponse = userGithubMap[interaction.user.id];
			if (!githubResponse) {
				await interaction.update({
					content: createResponse(ALL_RESPONSES.connectionIssue, [interaction.user.username]),
					components: []
				});
				return;
			}

			let client_id = "Iv1.bfff0a578d157ec8";
      		let device_code = userGithubMap[interaction.user.id].device_code;
      		let grant_type = 'urn:ietf:params:oauth:grant-type:device_code';
     		 let resp = await fetch(`https://github.com/login/oauth/access_token?client_id=${client_id}&device_code=${device_code}&grant_type=${grant_type}`, {
        		method: 'POST',
        		headers: {
          		'X-GitHub-Api-Version': '2022-11-28',
          		'Accept': 'application/json'
        		}
    		});


      		let data = await resp.json();
			
      		let access_token = data.access_token;

			  if (!access_token) {
				await interaction.update({
					content: createResponse(ALL_RESPONSES.connectionIssue, [interaction.user.id]),
					components: []
				});
				return;
			}
			

			  let resp2 = await fetch(`https://api.github.com/user`, {
				method: 'GET',
				headers: {
				  'Authorization': `token ${access_token}`,
				  'Accept': 'application/json'
				}
			  });
			  let data2 = await resp2.json();
			//   console.log(data2);
		
			  let st = await isRepoMember(data2.login);
			//   console.log(st);
			if (st) {
				await interaction.update({
					content: createResponse(ALL_RESPONSES.checkMeSuccess, [interaction.user.id]),
					components: []
				});
			} else {
				await interaction.update({
					content: createResponse(ALL_RESPONSES.checkMeNotMember, []),
					components: []
				});
			}
		}
	} else if (interaction.isCommand()) {

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}
});

client.on(Events.MessageCreate, message => {
	console.log('Message received');
	if (!message.content.startsWith('!') || message.author.bot) return;
	// console.log(message);
});

client.on(Events.GuildMemberAdd, async member => {

	try {
		await client.users.send(member.user.id, {
			content: createResponse(ALL_RESPONSES.welcomeMessage, [member.user.id])
		});
	
	} catch (error) {
		console.log('Failed to send DM:', error);
	}
});



// Log in to Discord with your client's token
client.login(TOKEN);