# Colony

A new bot, once again, for the UBC Launch Pad team. This time our focus is to use easily maintainable code and to make the bot as modular as possible. This will allow us to easily add new features and maintain the bot for a long time.

TO make this happen we are using existing libraries like [discord.js](https://discord.js.org/#/) and the code is written primariliy in JS. We hope to minimize the learning curve for new members and make it easy for them to contribute to the bot.

## About

A Discord bot that helps manage the UBC Launch Pad community on Discord.

## Features

- [x] Welcome new members
- [x] Assign roles based on GitHub membership status to the Launch Pad GitHub organization

### Planned Features

- [ ] store user GitHub usernames in a database
- [ ] sync GitHub usernames with Discord usernames

## Setup
### Steps

1. If you have windows then you must use WSL for Colony, No buts!
2. The following environment variables must be set:
    ```
    APP_ID=<> # Discord app ID
    DISCORD_TOKEN=<> # Discord bot token
    GUILD_ID=<> # Discord server ID
    PUBLIC_KEY=<> # Discord public key
    GITHUB_TOKEN=<> # GitHub app access token
    GH_APP_ID=<> # GitHub App ID
    GH_PRIVATE_KEY_PATH=gkey.pem
    LP_REPO_ID=<> # UBC Launch Pad GitHub repository ID
    LP_ORG_NAME=<> # UBC Launch Pad GitHub organization name
    LP_GITHUB_APP_CLIENT_ID=<> # UBC Launch Pad GitHub App client ID
    ```
you can set them in a `.env` file in the root directory of the project. Note that the values of
the environment variables depend on whether you are using your own personal bot/discord server/github app for testing or whether
you are using the official Launchpad bot/discord server/github app.
3. If you are using your own discord bot for personal testing then make sure you add them to the Launchpad discord server with the
appropriate scopes and permissions before proceeding (make sure your bot atleast has the `bot` and `applications.commands` scopes, and if you dont know what general permissions the bot needs then give it `Administrator` permissions after approval by both your team lead and the Launchpad's discord moderator(s))
4. Run `npm install` to install dependencies
5. Run `npm run build` to compile Typescript files to Javascript
6. Run `npm run register` to make commands in `src/commands` usable on the bot you reference in your environment variables file
7. Run `npm run start` to start your bot

### Resources (Use these resources for general guidance rather than following them as strict guides)
- Setting up WSL (https://learn.microsoft.com/en-us/windows/wsl/install)
- Developing in WSL using VSCode (https://code.visualstudio.com/docs/remote/wsl-tutorial)
- Setting up a discord bot (https://discord.com/developers/docs/getting-started)
- Registering a github app (https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)

## Contributing

We welcome contributions to Colony! Please follow the steps below to get started.

1. Fork this repository
2. Create a new branch for your feature
3. Commit your changes
4. Push your changes to your fork
5. Submit a pull request
6. Woohoo! You're awesome!
