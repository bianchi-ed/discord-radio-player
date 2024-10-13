const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });
client.commands = new Collection();

// Load commands from the commands folder
const loadCommands = (folderPath) => {
    const commandFolders = fs.readdirSync(folderPath);
    for (const folder of commandFolders) {
        const commandsPath = path.join(folderPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
};

// Load events from the events folder
const loadEvents = (folderPath) => {
    const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(folderPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
};

(async () => {
    try {
        loadCommands(path.join(__dirname, 'commands')); // Load commands
        loadEvents(path.join(__dirname, 'events')); // Load events
        await client.login(token); // Login to Discord
        console.log('Bot logged in successfully!');
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
