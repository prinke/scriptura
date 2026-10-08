/**
 * Scriptura Discord Bot - Main Entry Point
 * 
 * This bot provides Bible verse retrieval and search functionality through
 * Discord slash commands. It dynamically loads commands from the commands
 * directory and handles all interaction events.
 * 
 * @module index
 */

// Load environment variables before any module that reads them at load time
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	ActivityType,
} = require('discord.js');
const { errorReply } = require('./helpers/ui');
const { connectMongo } = require('./helpers/mongo');
const { getDailyVerseReference } = require('./helpers/daily_verse');
const { handleVoiceStateUpdate } = require('./helpers/voice_session');
const { startDailyVerseScheduler } = require('./helpers/daily_verse_scheduler');

// Initialize Discord client with required intents.
// GuildVoiceStates lets the bot see which voice channel a user is in.
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Collection to store all loaded commands
client.commands = new Collection();

/**
 * Dynamically loads all command modules from the commands directory.
 * Commands must export both 'data' (SlashCommandBuilder) and 'execute' function.
 * 
 * Directory structure: commands/<category>/<command>.js
 */
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.js'));
	
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		
		// Validate command structure before registering
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
			console.log(`[SUCCESS] Loaded command: ${command.data.name}`);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}

/**
 * Event handler for all Discord interactions.
 * Routes slash command interactions to their respective command handlers.
 * Provides error handling and user feedback for command execution failures.
 */
client.on(Events.InteractionCreate, async (interaction) => {
	// Route autocomplete suggestions to the command's autocomplete handler
	if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command?.autocomplete) return;
		try {
			await command.autocomplete(interaction);
		}
		catch (error) {
			console.error(`[ERROR] Autocomplete failed for "${interaction.commandName}":`, error);
		}
		return;
	}

	// Only handle slash command interactions
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	// Validate command exists
	if (!command) {
		console.error(`[ERROR] No command matching "${interaction.commandName}" was found.`);
		return;
	}

	try {
		// Execute the command
		await command.execute(interaction);
	} catch (error) {
		console.error(`[ERROR] Failed to execute command "${interaction.commandName}":`, error);
		
		// Provide user-friendly error feedback
		const errorMessage = errorReply('Something went wrong', {
			description: 'An unexpected error occurred while running this command.',
			hint: 'Please try again in a moment.',
		});

		// Send error response based on interaction state
		const send = interaction.replied || interaction.deferred
			? interaction.followUp(errorMessage)
			: interaction.reply(errorMessage);
		await send.catch((replyError) => {
			console.error('[ERROR] Failed to send error response:', replyError);
		});
	}
});

/**
 * Event handler for voice state changes.
 * Lets audio sessions follow the bot and leave empty channels.
 */
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
	try {
		handleVoiceStateUpdate(oldState, newState);
	}
	catch (error) {
		console.error('[ERROR] Failed to handle voice state update:', error);
	}
});

/**
 * Event handler for bot ready state.
 * Fires once when the bot successfully connects to Discord.
 */
client.once(Events.ClientReady, (readyClient) => {
	console.log(`[SUCCESS] Bot is ready! Logged in as ${readyClient.user.tag}`);
	updateDailyStatus(readyClient);
	scheduleDailyStatusUpdates(readyClient);
	// The scheduler reads from Mongo, so wait for the connection first
	mongoReady.then((connected) => {
		if (connected) startDailyVerseScheduler(readyClient);
	});
});

const mongoReady = connectMongo()
	.then(() => true)
	.catch((error) => {
		console.error('[ERROR] Failed to connect to MongoDB:', error);
		return false;
	});

// Login to Discord using the bot token from environment variables
client.login(process.env.TOKEN);

/**
 * Updates the bot status to the current daily verse reference.
 * 
 * @param {import('discord.js').Client} activeClient - Discord client
 */
function updateDailyStatus(activeClient) {
	try {
		const reference = getDailyVerseReference();
		activeClient.user.setPresence({
			activities: [{ name: `${reference}`, type: ActivityType.Listening }],
			status: 'online',
		});
	} catch (error) {
		console.error('[ERROR] Failed to update daily status:', error);
	}
}

/**
 * Schedules daily status updates at UTC midnight.
 * 
 * @param {import('discord.js').Client} activeClient - Discord client
 */
function scheduleDailyStatusUpdates(activeClient) {
	const now = new Date();
	const nextMidnightUtc = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate() + 1,
		0,
		0,
		0,
		0,
	);

	const delay = nextMidnightUtc - now.getTime();
	setTimeout(() => {
		updateDailyStatus(activeClient);
		setInterval(() => updateDailyStatus(activeClient), 24 * 60 * 60 * 1000);
	}, delay);
}
