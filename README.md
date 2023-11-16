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

## Installation

    ```bash
    npm install
    ```

## Usage

### Variables

First, the following environment variables must be set:
you can set them in a `.env` file in the root directory of the project.

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


    ```bash
    npm run start
    ```

## Contributing

We welcome contributions to Colony! Please follow the steps below to get started.

1. Fork this repository
2. Create a new branch for your feature
3. Commit your changes
4. Push your changes to your fork
5. Submit a pull request
6. Woohoo! You're awesome!
