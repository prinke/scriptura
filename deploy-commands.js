/**
 * Discord Bot Command Deployment Script
 * 
 * This script registers all slash commands with Discord's API.
 * It scans the commands directory and pushes command definitions to Discord.
 * 
 * Usage: node deploy-commands.js
 * 
 * Required environment variables:
 * - TOKEN: Discord bot token
 * - CLIENT_ID: Discord application/client ID
 *
 * Optional environment variables:
 * - GUILD_ID: If set, guild-specific commands for this guild will be cleared
 *             after the global deployment to avoid stale single-guild commands.
 * 
 * @module deploy-commands
 */

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];

/**
 * Scan and load all command definitions from the commands directory
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
		
		// Validate command structure and add to deployment list
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
			console.log(`[SUCCESS] Loaded command for deployment: ${command.data.name}`);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}

// Initialize REST client with bot token
const rest = new REST().setToken(process.env.TOKEN);

/**
 * Deploy commands to Discord API
 * This replaces all existing global commands with the current set
 */
(async () => {
	try {
		console.log(
			`[INFO] Started refreshing ${commands.length} application (/) commands.`,
		);

		// Register commands globally (available in all guilds)
		const data = await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID),
			{ body: commands },
		);

		console.log(
			`[SUCCESS] Successfully reloaded ${data.length} application (/) commands.`,
		);

		if (process.env.GUILD_ID) {
			const cleared = await rest.put(
				Routes.applicationGuildCommands(
					process.env.CLIENT_ID,
					process.env.GUILD_ID,
				),
				{ body: [] },
			);

			console.log(
				`[INFO] Cleared ${cleared.length} guild-specific commands for guild ${process.env.GUILD_ID}.`,
			);
		}
	} catch (error) {
		console.error('[ERROR] Failed to deploy commands:', error);
		process.exitCode = 1;
	}
})();
