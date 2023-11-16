export const ALL_RESPONSES = {
        welcomeMessage: {
            content: `Welcome aboard, <@{{username}}>! Survived the cosmic journey, I see. Or are you a native of StarPort? 🚀 \n\nAfter that wild sandstorm, I'm still sifting through space dust in the habitat. I'm Rocket - part administrator, part intergalactic guide here. With my trusty raccoon crew and humans like you, we keep the Launch Pad humming.\n\nCurious about your cosmic credentials? Type \`/checkme\` and I'll dig up your star chart. Meanwhile, I've got solar panels to shine. Catch you in the orbit!`,
            variables: ['username']
        },
        checkMe: {
            content: `📡 Scanning the galaxy for your records 📡... Aligning with Github's orbital data... Hang tight! Please enter this verification code in <{{link}}> to confirm your identity:\n\`\`\`{{code}}\`\`\`\n`,
            variables: ['link', 'code']
        },
        checkMeSuccess: {
            content: `Wait a minute... Scanning... Oh, stars above! How did I not recognize you, @{{username}}? You're one of our Launch Pad crew 👩‍🚀!\nMy apologies for the oversight - even a sophisticated raccoon like me gets starstruck sometimes. Welcome back to the heart of our mission control.\n\nFeel free to navigate through the familiar galaxies of our channels. And hey, maybe share some of your cosmic wisdom with the newcomers. \nGreat to have you back on board! Oh and feel free to message @Sparky#1898. Sparky is my new prodigy.`,
            variables: ['username']
        },
        checkMeNotMember: {
            content:   `Hmm, seems like you're not on the Launch Pad crew list yet. No worries! You can still explore the public sectors of our habitat.`,
            variables: []
        },
        connectionIssue: {
            content:   `Ah, we have a bit of a space anomaly here, <@{{username}}>. You're all geared up for the journey, but it seems there's a glitch in my connection to the GitHub cosmos. I can't quite access your star charts for full verification. Fear not, though! Let's troubleshoot this together. Could you try again and make sure you provide me access to your Github profile? \n\n\n...In the meantime, you're welcome to explore the uncharted territories of our server. I'll keep working on my end to clear up this cosmic fog. Keep me updated, and we'll sort this out in a flash!`,
            variables: ['username']
        }
};



export const createResponse = (response, variables) => {
    let content = response.content;
    let placeHolderVariables = response.variables;
    variables.forEach((variable, index) => {
        content = content.replace(`{{${placeHolderVariables[index]}}}`, variables[index]);
    });
    return content;
}


// Simple method that returns a random emoji from list
export function getRandomEmoji() {
    const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
    return emojiList[Math.floor(Math.random() * emojiList.length)];
  }
  
  export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }